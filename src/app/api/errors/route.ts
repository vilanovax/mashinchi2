import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST - client error report
export async function POST(request: NextRequest) {
  try {
    const { message, digest, url, userAgent } = await request.json();
    if (!message) return NextResponse.json({ ok: true });

    // Rate limit: only log if message is non-trivial
    if (message.length < 5) return NextResponse.json({ ok: true });

    await prisma.notification.create({
      data: {
        type: "client_error",
        title: `خطای کلاینت: ${message.slice(0, 60)}`,
        message: `URL: ${url || "?"}\n${userAgent ? `UA: ${userAgent.slice(0, 120)}\n` : ""}${digest ? `Digest: ${digest}\n` : ""}Message: ${message.slice(0, 400)}`,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
