import { NextRequest, NextResponse } from "next/server";
import { getSession, isAuthenticated } from "@/lib/session";
import { getValidAccessToken } from "@/lib/pega-oauth";
import { AgentCardSchema } from "@/lib/a2a";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!isAuthenticated(session)) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(req.url).searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  let token: string;
  try {
    token = await getValidAccessToken(session);
    await session.save();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "auth_error" },
      { status: 401 },
    );
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `Failed to fetch agent card: HTTP ${res.status}`, detail: text },
      { status: 502 },
    );
  }

  const raw = await res.json();
  const parsed = AgentCardSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid agent card", issues: parsed.error.issues },
      { status: 502 },
    );
  }
  return NextResponse.json({ card: parsed.data });
}
