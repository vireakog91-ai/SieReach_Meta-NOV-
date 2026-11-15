import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export interface HouseItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  pageIds: string[]; // ["ALL"] or specific pageId list
  businessNames?: string[];
  color?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export const DEFAULT_HOUSES: HouseItem[] = [
  {
    id: "house_all_command",
    name: "Central Command House",
    description: "Master aggregation across all connected business storefronts and customer inquiries.",
    icon: "🏰",
    pageIds: ["ALL"],
    businessNames: ["SieLab Retail Group", "Moew Hospitality"],
    color: "indigo",
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "house_sielab_retail",
    name: "SieLab Retail House",
    description: "Fashion, Streetwear, Electronics, Beauty, and Home Decor flagship stores.",
    icon: "🛍️",
    pageIds: ["fb_page_01", "fb_page_02", "fb_page_03", "fb_page_04"],
    businessNames: ["SieLab Retail Group"],
    color: "blue",
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "house_moew_fnb",
    name: "Moew Hospitality House",
    description: "Specialty Cafe & Lounge, table reservations, bakery orders & customer inquiries.",
    icon: "☕",
    pageIds: ["fb_page_05"],
    businessNames: ["Moew Hospitality"],
    color: "amber",
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

const SETTING_KEY = "COMCENT_HOUSES_DATA";

async function loadHouses(): Promise<HouseItem[]> {
  try {
    const record = await prisma.systemSetting.findUnique({
      where: { key: SETTING_KEY },
    });
    if (record?.value) {
      const parsed = JSON.parse(record.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Could not query DB for houses, falling back to defaults:", err);
  }
  return DEFAULT_HOUSES;
}

async function saveHouses(houses: HouseItem[]): Promise<void> {
  try {
    await prisma.systemSetting.upsert({
      where: { key: SETTING_KEY },
      create: {
        key: SETTING_KEY,
        value: JSON.stringify(houses),
        description: "COMCENT Communication Center Houses Configuration",
      },
      update: {
        value: JSON.stringify(houses),
      },
    });
  } catch (err) {
    console.error("Failed to persist houses to database:", err);
  }
}

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdminAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const houses = await loadHouses();
    return NextResponse.json({
      success: true,
      houses,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdminAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json();
    const currentHouses = await loadHouses();

    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { success: false, error: "House name is required" },
        { status: 400 }
      );
    }

    const newHouse: HouseItem = {
      id: body.id || `house_${Date.now()}`,
      name: body.name.trim(),
      description: body.description?.trim() || "Custom Centralized Communication House",
      icon: body.icon || "🏠",
      pageIds: Array.isArray(body.pageIds) && body.pageIds.length > 0 ? body.pageIds : ["ALL"],
      businessNames: Array.isArray(body.businessNames) ? body.businessNames : [],
      color: body.color || "indigo",
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const existingIdx = currentHouses.findIndex((h) => h.id === newHouse.id);
    let updated: HouseItem[];
    if (existingIdx >= 0) {
      updated = [...currentHouses];
      updated[existingIdx] = newHouse;
    } else {
      updated = [newHouse, ...currentHouses];
    }

    await saveHouses(updated);

    return NextResponse.json({
      success: true,
      house: newHouse,
      houses: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const unauthorized = await requireAdminAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(req.url);
    const houseId = searchParams.get("id");

    if (!houseId) {
      return NextResponse.json(
        { success: false, error: "House id is required" },
        { status: 400 }
      );
    }

    const currentHouses = await loadHouses();
    const updated = currentHouses.filter((h) => h.id !== houseId);
    await saveHouses(updated);

    return NextResponse.json({
      success: true,
      houses: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
