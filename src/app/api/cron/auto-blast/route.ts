import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { executeFollowUpBlast } from "@/lib/blaster";

/**
 * Core Auto-Blast Runner Function
 * Scans all active campaigns with autoBlast: true,
 * evaluates leads crossing the inactivity threshold,
 * and dispatches follow-up blasts with drip rate and tag safety.
 */
export async function runAutoBlastSweep() {
  const now = new Date();

  // 1. Fetch all active campaigns with autoBlast enabled
  const autoCampaigns = await prisma.followUpCampaign.findMany({
    where: {
      autoBlast: true,
      isActive: true,
    },
    include: {
      page: true,
    },
  });

  if (autoCampaigns.length === 0) {
    return {
      timestamp: now.toISOString(),
      campaignsChecked: 0,
      totalEligibleFound: 0,
      totalDelivered: 0,
      message: "No active auto-blast campaigns configured.",
      results: [],
    };
  }

  const results: any[] = [];
  let totalEligibleFound = 0;
  let totalDelivered = 0;

  for (const campaign of autoCampaigns) {
    const threshold = campaign.inactiveHoursThreshold;
    const maxFollowUps = campaign.maxFollowUps ?? 1;
    const cooldownHours = campaign.cooldownHours ?? 3.0;

    // Build lead query for this campaign: Target leads that haven't reached max follow-ups
    // Strict Business Portfolio Isolation: Target leads strictly within the campaign's dedicated business portfolio
    let targetPageIds: string[] = [];
    if (campaign.pageId) {
      targetPageIds = [campaign.pageId];
    } else {
      const bizPages = await prisma.facebookPage.findMany({
        where: { businessName: campaign.businessName || "SieLab Retail Group" },
        select: { pageId: true },
      });
      targetPageIds = bizPages.map((p) => p.pageId);
    }

    const whereLead: any = {
      status: { in: ["AWAITING_CUSTOMER", "FOLLOWED_UP"] },
      followUpCount: { lt: maxFollowUps },
      pageId: { in: targetPageIds },
    };

    const candidateLeads = await prisma.leadConversation.findMany({
      where: whereLead,
      include: { page: true },
    });

    // Filter leads crossing the inactivity threshold or cooldown, respecting safety guards
    const eligibleLeads = candidateLeads.filter((lead) => {
      // Must not exceed max follow ups
      if (lead.followUpCount >= maxFollowUps) return false;
      if (lead.status === "REPLIED" || lead.status === "CONVERTED" || lead.status === "CLOSED") return false;

      const custTime = new Date(lead.lastCustomerMessageAt).getTime();
      const hoursSinceCust = (now.getTime() - custTime) / (1000 * 60 * 60);

      // Tag Safety Guard: Exclude leads past 24h if enabled
      if (campaign.excludePast24h && hoursSinceCust > 24.0) {
        return false;
      }

      // Meta 7-day hard cutoff
      if (hoursSinceCust > 168.0) {
        return false;
      }

      if (lead.followUpCount === 0) {
        // Step 1: Initial inactivity check (since sales rep response)
        const agentTime = new Date(lead.lastAgentMessageAt).getTime();
        const hoursInactive = (now.getTime() - agentTime) / (1000 * 60 * 60);
        return hoursInactive >= threshold;
      } else {
        // Step 2+: Cooldown check since previous follow-up message (e.g. 3.0h)
        if (!lead.lastFollowedUpAt) return false;
        const lastBlastTime = new Date(lead.lastFollowedUpAt).getTime();
        const hoursSinceLastFollowUp = (now.getTime() - lastBlastTime) / (1000 * 60 * 60);
        return hoursSinceLastFollowUp >= cooldownHours;
      }
    });

    totalEligibleFound += eligibleLeads.length;

    if (eligibleLeads.length > 0) {
      const leadIds = eligibleLeads.map((l) => l.id);

      // Execute blast with campaign's specific drip rate and image/template
      const blastReport = await executeFollowUpBlast({
        campaignId: campaign.id,
        leadIds,
        customThresholdHours: threshold,
        excludePast24h: campaign.excludePast24h,
        dripMinSeconds: campaign.dripMinSeconds,
        dripMaxSeconds: campaign.dripMaxSeconds,
        maxFollowUps,
        cooldownHours,
        messageTag: campaign.messageTag || "HUMAN_AGENT",
      });

      totalDelivered += blastReport.successful;

      // Update campaign lastRunAt
      await prisma.followUpCampaign.update({
        where: { id: campaign.id },
        data: { lastRunAt: new Date() },
      });

      results.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        thresholdHours: threshold,
        eligibleCount: eligibleLeads.length,
        delivered: blastReport.successful,
        failed: blastReport.failed,
        dripPacing: blastReport.dripPacing,
        dispatchedCustomers: blastReport.details.map((d) => ({
          name: d.customerName,
          page: d.pageName,
          success: d.success,
          dripDelay: d.dripDelayApplied,
        })),
      });
    } else {
      results.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        thresholdHours: threshold,
        eligibleCount: 0,
        delivered: 0,
        message: "No new leads reached inactivity threshold.",
      });
    }
  }

  return {
    timestamp: new Date().toISOString(),
    campaignsChecked: autoCampaigns.length,
    totalEligibleFound,
    totalDelivered,
    results,
  };
}

/**
 * GET Handler - Called by cron triggers, background timers, or health monitors
 */
export async function GET(req: NextRequest) {
  try {
    // Vercel Cron automatically sends Authorization: Bearer <CRON_SECRET>
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = req.headers.get("authorization");
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { success: false, error: "Unauthorized: Invalid CRON_SECRET" },
          { status: 401 }
        );
      }
    }

    const sweepReport = await runAutoBlastSweep();
    return NextResponse.json({
      success: true,
      data: sweepReport,
    });
  } catch (err: any) {
    console.error("Auto-blast cron error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

/**
 * POST Handler - Called by manual trigger or webhook test
 */
export async function POST(req: NextRequest) {
  try {
    const sweepReport = await runAutoBlastSweep();
    return NextResponse.json({
      success: true,
      message: `Auto-blast sweep completed: ${sweepReport.totalDelivered} message(s) delivered.`,
      data: sweepReport,
    });
  } catch (err: any) {
    console.error("Auto-blast cron error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
