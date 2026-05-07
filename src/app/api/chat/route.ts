import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, isAuthenticated } from "@/lib/session";
import { getValidAccessToken } from "@/lib/pega-oauth";
import { A2AClient, A2AError, isTask } from "@/lib/a2a";

const Body = z.object({
  agentUrl: z.string().url(),
  message: z.string().min(1),
  contextId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!isAuthenticated(session)) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: "Invalid request body", detail: String(e) },
      { status: 400 },
    );
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

  const client = new A2AClient({
    agentUrl: parsed.agentUrl,
    sendMethod: "message/send",
    oauth: { type: "bearer", token },
    polling: { intervalMs: 1500, maxAttempts: 40, backoff: "exponential" },
  });

  try {
    const result = await client.sendMessage(parsed.message, {
      ...(parsed.contextId ? { contextId: parsed.contextId } : {}),
    });
    const texts = client.extractText(result);
    const newContextId = result.contextId ?? parsed.contextId;
    let state: string | undefined;
    if (isTask(result)) state = result.status.state;
    return NextResponse.json({ texts, contextId: newContextId, state });
  } catch (e) {
    if (e instanceof A2AError) {
      return NextResponse.json(
        { error: e.name, message: e.message },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: "internal_error", message: String(e) },
      { status: 500 },
    );
  }
}
