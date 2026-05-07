import { NextResponse } from "next/server";
import { getSession, isAuthenticated } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!isAuthenticated(session)) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({
    authenticated: true,
    user: session.userInfo ?? null,
    expiresAt: session.expiresAt ?? null,
  });
}
