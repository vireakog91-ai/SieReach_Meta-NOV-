import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_TEMPLATES = [
  {
    title: "⚡ Flash Sale & Limited Promotion",
    category: "Promotion",
    content: `🔥 EXCLUSIVE FLASH SALE ALERT! 🔥\n\nHey everyone! For the next 48 hours only, {{page_name}} is offering {an incredible|a massive|an exclusive} discount across our top-rated collections!\n\n✨ Use Code: FLASH{{day}}\n🎁 {Free delivery|Complimentary gift} on orders above $50\n⏳ Available while stock lasts!\n\n👉 Send us a direct message or drop a comment below to claim your voucher now!\n\n#SpecialOffer #Sale #ExclusiveDeal #{{page_name}}`,
    mediaType: "image",
    mediaUrls: JSON.stringify(["https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&q=80"]),
    tags: JSON.stringify(["Sale", "Promo", "Discount"]),
    isPinned: true,
    enableFirstComment: true,
    firstComment: "👉 Claim your 20% off voucher directly here: https://sielab.shop/flash-deal?page={{page_name}} \n(Comment 'PM' below to receive instant assistance via Messenger!)",
    callToActionType: "MESSAGE_PAGE",
    callToActionUrl: "",
    enableCommentToDm: true,
    commentToDmKeyword: "PM",
    commentToDmReply: "Hi {{name}}! We just sent you a private message with your exclusive voucher code 🎁 Check your Messenger inbox!",
    commentToDmMiniBlast: "Hello {{name}}! Thank you for commenting on {{page_name}}. Here is your exclusive 20% OFF flash voucher: FLASHVIP20. Tap here to redeem: https://sielab.shop/deals",
  },
  {
    title: "🌟 Featured Product Showcase",
    category: "Product",
    content: `✨ Spotlight of the Week at {{page_name}} ✨\n\nDiscover the difference with our newest highlight:\n\n💎 Premium craftsmanship\n💎 Tested for durability & style\n💎 100% Satisfaction guarantee\n\n{Loved by thousands of happy customers|Our best-selling favorite this season|Handcrafted for modern elegance}.\n\n💬 Tap 'Send Message' right now for full pricing and instant order assistance!\n\n#FeaturedProduct #Trending #BestSeller #QualityFirst`,
    mediaType: "image",
    mediaUrls: JSON.stringify(["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200&q=80"]),
    tags: JSON.stringify(["Product", "Showcase", "Trending"]),
    isPinned: true,
    enableFirstComment: true,
    firstComment: "📦 Free shipping & 30-day money-back guarantee apply. See complete catalog: https://sielab.shop",
    callToActionType: "SHOP_NOW",
    callToActionUrl: "https://sielab.shop/collections",
    enableCommentToDm: false,
    commentToDmKeyword: "ALL",
    commentToDmReply: "",
    commentToDmMiniBlast: "",
  },
  {
    title: "📢 Official Business Announcement",
    category: "Announcement",
    content: `📢 OFFICIAL ANNOUNCEMENT from {{page_name}}\n\nWe are excited to share {important news|a major milestone|an exciting update} with our valued community!\n\nStarting this week:\n✅ Extended customer support hours\n✅ Faster dispatch & order tracking\n✅ Brand new perks for returning members\n\nThank you for trusting {{business_name}}! Drop your thoughts or questions below—our team is standing by.\n\n#Announcement #CommunityFirst #Update #{{page_name}}`,
    mediaType: "none",
    mediaUrls: JSON.stringify([]),
    tags: JSON.stringify(["Announcement", "News", "Update"]),
    isPinned: false,
    enableFirstComment: false,
    firstComment: "",
    callToActionType: "NONE",
    callToActionUrl: "",
    enableCommentToDm: false,
    commentToDmKeyword: "ALL",
    commentToDmReply: "",
    commentToDmMiniBlast: "",
  },
  {
    title: "💡 Pro Tip & Industry Advice",
    category: "Tips",
    content: `💡 Quick Tip of the Day from {{page_name}} 💡\n\nDid you know? {Small consistent habits yield the biggest results!|Investing in quality always pays for itself in the long run!}\n\nHere are 3 quick rules we swear by:\n1️⃣ Prioritize essentials that save time.\n2️⃣ Check reviews and verified feedback.\n3️⃣ Don't hesitate to ask experts before deciding.\n\nSave this post for later 📌 and share with a friend who needs to see this!\n\n#LifeHacks #ProTips #KnowledgeIsPower #DailyTips`,
    mediaType: "none",
    mediaUrls: JSON.stringify([]),
    tags: JSON.stringify(["Tips", "Education", "Value"]),
    isPinned: false,
    enableFirstComment: false,
    firstComment: "",
    callToActionType: "NONE",
    callToActionUrl: "",
    enableCommentToDm: false,
    commentToDmKeyword: "ALL",
    commentToDmReply: "",
    commentToDmMiniBlast: "",
  },
  {
    title: "🎉 Weekend Community Engagement",
    category: "Engagement",
    content: `🎉 Happy Weekend from {{page_name}}! 🎉\n\nQuick question for our community today:\nWhich one is your go-to weekend mood?\n\n🅰️ Cozy at home catching up on favorites\n🅱️ Out and about exploring new spots\n\nVote in the comments below! 👇 We'll pick one random comment for a special weekend treat! 🎁\n\n#WeekendVibes #CommunityPoll #QuestionOfTheDay`,
    mediaType: "image",
    mediaUrls: JSON.stringify(["https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1200&q=80"]),
    tags: JSON.stringify(["Engagement", "Poll", "Weekend"]),
    isPinned: false,
    enableFirstComment: true,
    firstComment: "🎉 Winner will be announced on Monday story! Comment your vote above to enter!",
    callToActionType: "NONE",
    callToActionUrl: "",
    enableCommentToDm: true,
    commentToDmKeyword: "ALL",
    commentToDmReply: "Thanks for participating {{name}}! You've been entered into our weekend giveaway draw! 🍀",
    commentToDmMiniBlast: "Hey {{name}}! Thanks for hanging out with {{page_name}} this weekend. As a thank you for participating, here is a secret $5 gift card code: WEEKEND5",
  },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessName = searchParams.get("businessName");

    let whereClause: any = {};
    if (businessName && businessName !== "ALL") {
      whereClause.businessName = businessName;
    }

    let templates = await prisma.cdcPostTemplate.findMany({
      where: whereClause,
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    });

    // Auto-seed default templates if table is empty
    if (templates.length === 0) {
      const activeBusiness = (businessName && businessName !== "ALL") ? businessName : "SieLab Retail Group";
      for (const tpl of DEFAULT_TEMPLATES) {
        await prisma.cdcPostTemplate.create({
          data: {
            ...tpl,
            businessName: activeBusiness,
          },
        });
      }

      templates = await prisma.cdcPostTemplate.findMany({
        where: whereClause,
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      });
    }

    return NextResponse.json({ success: true, templates });
  } catch (error: any) {
    console.error("Error fetching CDC templates:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load CDC templates" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      category = "General",
      content,
      mediaType = "none",
      mediaUrls = [],
      tags = [],
      isPinned = false,
      businessName = "SieLab Retail Group",
      enableFirstComment = false,
      firstComment = "",
      callToActionType = "NONE",
      callToActionTitle = "Direct Messenger Inquiry",
      callToActionUrl = "",
      enableCommentToDm = false,
      commentToDmKeyword = "ALL",
      commentToDmReply = "",
      commentToDmMiniBlast = "",
    } = body;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: "Title and content are required." },
        { status: 400 }
      );
    }

    const template = await prisma.cdcPostTemplate.create({
      data: {
        title,
        category,
        content,
        mediaType,
        mediaUrls: Array.isArray(mediaUrls) ? JSON.stringify(mediaUrls) : mediaUrls || "[]",
        tags: Array.isArray(tags) ? JSON.stringify(tags) : tags || "[]",
        isPinned: Boolean(isPinned),
        businessName,
        enableFirstComment: Boolean(enableFirstComment),
        firstComment: firstComment || null,
        callToActionType: callToActionType || "NONE",
        callToActionTitle: callToActionTitle || "Direct Messenger Inquiry",
        callToActionUrl: callToActionUrl || null,
        enableCommentToDm: Boolean(enableCommentToDm),
        commentToDmKeyword: commentToDmKeyword || "ALL",
        commentToDmReply: commentToDmReply || null,
        commentToDmMiniBlast: commentToDmMiniBlast || null,
      },
    });

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    console.error("Error creating CDC template:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save template" },
      { status: 500 }
    );
  }
}
