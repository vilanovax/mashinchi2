import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

const USER_TYPE_LABELS: Record<string, string> = {
  typeEconomic: "اقتصادی",
  typeFamily: "خانوادگی",
  typeSport: "اسپرت",
  typePrestige: "پرستیژمحور",
  typeSafe: "کم‌ریسک",
  typeSpecial: "خاص‌پسند",
  typeOffroad: "آفرودی",
  typeCity: "شهری",
  typeTravel: "سفرمحور",
  typeInvestment: "سرمایه‌ای",
};

export async function GET() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("mashinchi_session")?.value;

  if (!sessionId) {
    return NextResponse.json({ hasProfile: false });
  }

  const user = await prisma.user.findUnique({
    where: { sessionId },
    include: {
      tasteProfile: true,
      interactions: true,
    },
  });

  if (!user) {
    return NextResponse.json({ hasProfile: false });
  }

  const totalInteractions = user.interactions.filter(
    (i) => i.action === "like" || i.action === "skip"
  ).length;
  const totalLikes = user.interactions.filter((i) => i.action === "like").length;
  const totalFavorites = user.interactions.filter((i) => i.action === "favorite").length;

  // Detect user types
  let userTypes: string[] = [];
  if (user.tasteProfile) {
    const typeScores = Object.keys(USER_TYPE_LABELS).map((key) => ({
      key,
      label: USER_TYPE_LABELS[key],
      score: (user.tasteProfile as unknown as Record<string, number>)[key] || 0,
    }));
    typeScores.sort((a, b) => b.score - a.score);
    userTypes = typeScores.filter((t) => t.score > 0).slice(0, 3).map((t) => t.label);
  }

  return NextResponse.json({
    hasProfile: true,
    budget: user.budget?.toString() || null,
    totalInteractions,
    totalLikes,
    totalFavorites,
    userTypes,
    hasTasteProfile: !!user.tasteProfile,
  });
}
