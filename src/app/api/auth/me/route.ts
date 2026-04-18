import { NextResponse } from "next/server";
import { getUser } from "@/lib/session";

export async function GET() {
  const user = await getUser();

  if (!user || !user.phone) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    user: { phone: user.phone },
  });
}
