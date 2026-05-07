import { NextResponse } from "next/server";
import { getSession, isAuthenticated } from "@/lib/session";
import { getValidAccessToken } from "@/lib/pega-oauth";
import { config } from "@/lib/config";

interface PegaAgentEntry {
  name: string;
  agentClass?: string;
  agentCardURL: string;
  label: string;
  description?: string;
  agentScope?: string;
}

export async function GET() {
  const session = await getSession();
  if (!isAuthenticated(session)) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
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

  const url = config.pega.agentsListUrl();
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `Failed to fetch agents: HTTP ${res.status}`, detail: text },
      { status: 502 },
    );
  }

  const raw = (await res.json()) as PegaAgentEntry[];
  const agents = raw.map((a) => ({
    label: a.label,
    name: a.name,
    description: a.description ?? "",
    agentCardURL: a.agentCardURL,
    agentUrl: a.agentCardURL.replace(/\/?\.well-known\/agent(-card)?\.json$/i, ""),
  }));
  return NextResponse.json({ agents });
}
