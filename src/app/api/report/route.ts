import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST - user submits a report about a car (wrong info, suggestion, experience)
export async function POST(request: NextRequest) {
  try {
    const { carId, carName, type, text } = await request.json();

    if (!carId || !text?.trim()) {
      return NextResponse.json({ error: "carId and text required" }, { status: 400 });
    }

    // Store as a notification for admins to review
    await prisma.notification.create({
      data: {
        type: "user_report",
        title: `گزارش کاربر: ${carName || "خودرو"}`,
        message: `[${type === "wrong_info" ? "اطلاعات غلط" : type === "suggestion" ? "پیشنهاد" : "تجربه"}] ${text.slice(0, 500)}`,
        data: JSON.stringify({ carId, carName, reportType: type, text }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[report] Error:", error);
    return NextResponse.json({ error: "خطا در ارسال" }, { status: 500 });
  }
}
