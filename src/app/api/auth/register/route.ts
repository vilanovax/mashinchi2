import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionId, hashPassword, COOKIE_NAME, COOKIE_OPTIONS } from "@/lib/session";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  const { phone, password } = await request.json();

  if (!phone || !password) {
    return NextResponse.json({ error: "شماره موبایل و رمزعبور الزامی است" }, { status: 400 });
  }

  // Validate phone: Iranian mobile format
  const cleanPhone = phone.replace(/\s|-/g, "");
  if (!/^09\d{9}$/.test(cleanPhone)) {
    return NextResponse.json({ error: "شماره موبایل معتبر نیست" }, { status: 400 });
  }

  // Validate password: exactly 6 digits
  if (!/^\d{6}$/.test(password)) {
    return NextResponse.json({ error: "رمزعبور باید ۶ رقم باشد" }, { status: 400 });
  }

  // Check if phone already registered
  const existing = await prisma.user.findUnique({ where: { phone: cleanPhone } });
  if (existing) {
    return NextResponse.json({ error: "این شماره قبلاً ثبت شده. وارد شوید" }, { status: 409 });
  }

  const sessionId = await getSessionId();
  const passwordHashed = hashPassword(password);

  let user;

  if (sessionId) {
    // Try to find anonymous user with this session and upgrade it
    const anonUser = await prisma.user.findUnique({ where: { sessionId } });
    if (anonUser && !anonUser.phone) {
      user = await prisma.user.update({
        where: { id: anonUser.id },
        data: { phone: cleanPhone, passwordHash: passwordHashed },
      });

      return NextResponse.json({
        success: true,
        user: { phone: user.phone },
      });
    }
  }

  // Create new user with auth
  const newSessionId = randomUUID();
  user = await prisma.user.create({
    data: {
      sessionId: newSessionId,
      phone: cleanPhone,
      passwordHash: passwordHashed,
    },
  });

  // If there was an anonymous session, merge its data
  if (sessionId) {
    const anonUser = await prisma.user.findUnique({ where: { sessionId } });
    if (anonUser && anonUser.id !== user.id) {
      await mergeUserData(anonUser.id, user.id);
    }
  }

  const response = NextResponse.json({
    success: true,
    user: { phone: user.phone },
  });

  response.cookies.set(COOKIE_NAME, newSessionId, COOKIE_OPTIONS);
  return response;
}

async function mergeUserData(fromUserId: string, toUserId: string) {
  // Move interactions
  await prisma.userInteraction.updateMany({
    where: { userId: fromUserId },
    data: { userId: toUserId },
  });

  // Move taste profile
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

  // Move budget if target doesn't have one
  const fromUser = await prisma.user.findUnique({ where: { id: fromUserId } });
  const toUser = await prisma.user.findUnique({ where: { id: toUserId } });
  if (fromUser?.budget && !toUser?.budget) {
    await prisma.user.update({
      where: { id: toUserId },
      data: { budget: fromUser.budget },
    });
  }

  // Delete anonymous user
  await prisma.user.delete({ where: { id: fromUserId } });
}
