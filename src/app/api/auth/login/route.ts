import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionId, hashPassword, COOKIE_NAME, COOKIE_OPTIONS } from "@/lib/session";

export async function POST(request: NextRequest) {
  const { phone, password } = await request.json();

  if (!phone || !password) {
    return NextResponse.json({ error: "شماره موبایل و رمزعبور الزامی است" }, { status: 400 });
  }

  const cleanPhone = phone.replace(/\s|-/g, "");
  const passwordHashed = hashPassword(password);

  const user = await prisma.user.findUnique({ where: { phone: cleanPhone } });

  if (!user || user.passwordHash !== passwordHashed) {
    return NextResponse.json({ error: "شماره یا رمزعبور اشتباه است" }, { status: 401 });
  }

  // Check if current anonymous session has data to merge
  const currentSessionId = await getSessionId();
  if (currentSessionId && currentSessionId !== user.sessionId) {
    const anonUser = await prisma.user.findUnique({ where: { sessionId: currentSessionId } });
    if (anonUser && !anonUser.phone && anonUser.id !== user.id) {
      await mergeUserData(anonUser.id, user.id);
    }
  }

  const response = NextResponse.json({
    success: true,
    user: { phone: user.phone },
  });

  response.cookies.set(COOKIE_NAME, user.sessionId, COOKIE_OPTIONS);
  return response;
}

async function mergeUserData(fromUserId: string, toUserId: string) {
  await prisma.userInteraction.updateMany({
    where: { userId: fromUserId },
    data: { userId: toUserId },
  });

  const fromProfile = await prisma.userTasteProfile.findUnique({ where: { userId: fromUserId } });
  const toProfile = await prisma.userTasteProfile.findUnique({ where: { userId: toUserId } });

  if (fromProfile && !toProfile) {
    await prisma.userTasteProfile.update({
      where: { userId: fromUserId },
      data: { userId: toUserId },
    });
  } else if (fromProfile && toProfile) {
    await prisma.userTasteProfile.delete({ where: { userId: fromUserId } });
  }

  const fromUser = await prisma.user.findUnique({ where: { id: fromUserId } });
  const toUser = await prisma.user.findUnique({ where: { id: toUserId } });
  if (fromUser?.budget && !toUser?.budget) {
    await prisma.user.update({
      where: { id: toUserId },
      data: { budget: fromUser.budget },
    });
  }

  await prisma.user.delete({ where: { id: fromUserId } });
}
