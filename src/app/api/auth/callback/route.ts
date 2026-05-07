import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { applyTokens, exchangeCodeForTokens } from "@/lib/pega-oauth";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  const session = await getSession();

  if (error) {
    session.pkceVerifier = undefined;
    session.oauthState = undefined;
    await session.save();
    return errorRedirect(req, error, errorDescription ?? undefined);
  }

  if (!code || !state) {
    return errorRedirect(req, "invalid_request", "Missing code or state");
  }

  if (!session.oauthState || session.oauthState !== state) {
    return errorRedirect(req, "state_mismatch", "OAuth state did not match");
  }
  if (!session.pkceVerifier) {
    return errorRedirect(req, "missing_verifier", "Missing PKCE verifier in session");
  }

  try {
    const tokens = await exchangeCodeForTokens(code, session.pkceVerifier);
    session.pkceVerifier = undefined;
    session.oauthState = undefined;
    applyTokens(session, tokens);
    await session.save();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return errorRedirect(req, "exchange_failed", msg);
  }

  return NextResponse.redirect(new URL("/chat", req.url));
}

function errorRedirect(req: NextRequest, code: string, description?: string) {
  const u = new URL("/login", req.url);
  u.searchParams.set("error", code);
  if (description) u.searchParams.set("error_description", description);
  return NextResponse.redirect(u);
}
