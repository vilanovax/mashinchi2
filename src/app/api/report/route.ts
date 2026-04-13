import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST - user submits a report about a car
export async function POST(request: NextRequest) {
  try {
    const { carId, carName, type, text } = await request.json();

    if (!carId || !text?.trim()) {
      return NextResponse.json({ error: "carId and text required" }, { status: 400 });
    }

    const typeLabel = type === "wrong_info" ? "اطلاعات غلط" : type === "suggestion" ? "پیشنهاد" : "تجربه کاربر";

    await prisma.notification.create({
      data: {
        type: "user_report",
        title: `گزارش: ${carName || "خودرو"} (${typeLabel})`,
        message: text.slice(0, 500),
        entityId: carId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[report] Error:", error);
    return NextResponse.json({ error: "خطا در ارسال" }, { status: 500 });
  }
}
