import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";

const TYPE_LABELS: Record<string, string> = {
  typeEconomic: "اقتصادی", typeFamily: "خانوادگی", typeSport: "اسپرت",
  typePrestige: "پرستیژ", typeSafe: "کم‌ریسک", typeSpecial: "خاص‌پسند",
  typeOffroad: "آفرود", typeCity: "شهری", typeTravel: "سفر", typeInvestment: "سرمایه",
};

export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) return unauthorizedResponse();

  const users = await prisma.user.findMany({
    include: {
      tasteProfile: true,
      interactions: { select: { action: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const serialized = users.map((u) => {
    const likes = u.interactions.filter((i) => i.action === "like").length;
    const skips = u.interactions.filter((i) => i.action === "skip").length;
    const favorites = u.interactions.filter((i) => i.action === "favorite").length;

    let userTypes: string[] = [];
    if (u.tasteProfile) {
      const typeScores = Object.keys(TYPE_LABELS).map((key) => ({
        label: TYPE_LABELS[key],
        score: (u.tasteProfile as unknown as Record<string, number>)[key] || 0,
      }));
      userTypes = typeScores.sort((a, b) => b.score - a.score).filter((t) => t.score > 0).slice(0, 3).map((t) => t.label);
    }

    return {
      id: u.id,
      sessionId: u.sessionId.slice(0, 8) + "...",
      budget: u.budget?.toString() || null,
      totalInteractions: u.interactions.length,
      likes, skips, favorites, userTypes,
      hasTasteProfile: !!u.tasteProfile,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    };
  });

  return NextResponse.json(serialized);
}
