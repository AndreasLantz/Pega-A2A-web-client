import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, isAuthenticated } from "@/lib/session";
import { getValidAccessToken } from "@/lib/pega-oauth";
import { config } from "@/lib/config";

const Body = z.object({
  serverHandle: z.string().min(1),
  method: z.string().min(1),
  params: z.unknown().optional(),
  id: z.union([z.string(), z.number()]).optional(),
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

  let resolvedUrl: string;
  try {
    resolvedUrl = config.pega.mcpUrl(parsed.serverHandle.trim());
  } catch (e) {
    return NextResponse.json(
      { error: "config_error", message: e instanceof Error ? e.message : String(e) },
      { status: 400 },
    );
  }

  const rpcId = parsed.id ?? Date.now();
  const body = {
    jsonrpc: "2.0",
    id: rpcId,
    method: parsed.method,
    params: parsed.params ?? {},
  };

  const startedAt = Date.now();

  let sessionId: string | null = null;
  let userResult: McpResult;

  try {
    if (parsed.method === "initialize") {
      userResult = await mcpRequest(resolvedUrl, token, body, null);
      sessionId = userResult.sessionId;
    } else {
      // Spec: initialize → notifications/initialized → real method, all sharing one session.
      const init = await mcpRequest(
        resolvedUrl,
        token,
        {
          jsonrpc: "2.0",
          id: `init-${rpcId}`,
          method: "initialize",
          params: {
            protocolVersion: "2025-03-26",
            capabilities: {},
            clientInfo: { name: "AIApp", version: "0.1.0" },
          },
        },
        null,
      );
      sessionId = init.sessionId;
      if (!sessionId) {
        return NextResponse.json(
          {
            error: "no_session",
            message:
              "Server did not return an Mcp-Session-Id header on initialize. The endpoint may not implement Streamable HTTP transport.",
            initResponse: init.parsed,
          },
          { status: 502 },
        );
      }
      // initialized notification — no response body expected.
      await mcpRequest(
        resolvedUrl,
        token,
        { jsonrpc: "2.0", method: "notifications/initialized", params: {} },
        sessionId,
      );
      userResult = await mcpRequest(resolvedUrl, token, body, sessionId);
    }
  } catch (e) {
    return NextResponse.json(
      {
        error: "mcp_handshake_failed",
        message: e instanceof Error ? e.message : String(e),
      },
      { status: 502 },
    );
  }

  const elapsedMs = Date.now() - startedAt;

  return NextResponse.json({
    request: body,
    response: userResult.parsed,
    httpStatus: userResult.status,
    elapsedMs,
    resolvedUrl,
    contentType: userResult.contentType,
    sessionId,
  });
}

interface McpResult {
  status: number;
  contentType: string;
  parsed: unknown;
  sessionId: string | null;
}

async function mcpRequest(
  url: string,
  token: string,
  body: unknown,
  sessionId: string | null,
): Promise<McpResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    Authorization: `Bearer ${token}`,
  };
  if (sessionId) headers["Mcp-Session-Id"] = sessionId;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const contentType = res.headers.get("content-type") ?? "";
  const newSession = res.headers.get("mcp-session-id") ?? sessionId;
  const text = await res.text();

  let parsed: unknown = null;
  if (text.trim()) {
    parsed = parseMcpBody(contentType, text);
  }

  // Surface non-2xx so the orchestrator can short-circuit before sending follow-ups.
  if (!res.ok && parsed && isJsonRpcError(parsed)) {
    const e = (parsed as { error: { code?: number; message?: string } }).error;
    throw new Error(
      `JSON-RPC error ${e.code ?? "?"}: ${e.message ?? "unknown"}`,
    );
  }
  if (!res.ok && (!parsed || !isJsonRpcError(parsed))) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  return { status: res.status, contentType, parsed, sessionId: newSession };
}

function isJsonRpcError(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in (value as Record<string, unknown>)
  );
}

/**
 * Parse an MCP Streamable HTTP response. Servers may return either:
 *  - application/json — a single JSON-RPC response object
 *  - text/event-stream — one or more SSE events, each with a JSON-RPC payload in `data:`
 */
function parseMcpBody(contentType: string, body: string): unknown {
  if (contentType.includes("text/event-stream")) {
    const events = parseSseEvents(body);
    if (events.length === 0) {
      throw new Error("SSE response contained no events");
    }
    // Return the last data event (typically the JSON-RPC response).
    return events[events.length - 1];
  }
  // Default: JSON
  return JSON.parse(body);
}

function parseSseEvents(body: string): unknown[] {
  const events: unknown[] = [];
  // Split on double newline (event boundary).
  const blocks = body.split(/\r?\n\r?\n/);
  for (const block of blocks) {
    const dataLines: string[] = [];
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).replace(/^ /, ""));
      }
    }
    if (dataLines.length === 0) continue;
    const joined = dataLines.join("\n");
    try {
      events.push(JSON.parse(joined));
    } catch {
      events.push(joined);
    }
  }
  return events;
}

export async function GET() {
  return NextResponse.json({
    appAlias: config.pega.appAlias() ?? null,
    baseUrl: (() => {
      try {
        return config.pega.baseUrl();
      } catch {
        return null;
      }
    })(),
  });
}
