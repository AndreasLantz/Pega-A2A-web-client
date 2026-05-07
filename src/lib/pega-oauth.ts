import { createHash, randomBytes } from "node:crypto";
import { config } from "./config";
import type { AppSession, UserInfo } from "./session";

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  id_token?: string;
  scope?: string;
}

function base64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function generatePkce() {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function generateState(): string {
  return base64url(randomBytes(16));
}

export function buildAuthorizeUrl(params: {
  state: string;
  codeChallenge: string;
}): string {
  const u = new URL(config.pega.authorizeUrl());
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", config.pega.clientId());
  u.searchParams.set("redirect_uri", config.pega.redirectUri());
  u.searchParams.set("code_challenge", params.codeChallenge);
  u.searchParams.set("code_challenge_method", "S256");
  u.searchParams.set("state", params.state);
  const scopes = config.pega.scopes();
  if (scopes) u.searchParams.set("scope", scopes);
  return u.toString();
}

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.pega.redirectUri(),
    client_id: config.pega.clientId(),
    code_verifier: codeVerifier,
  });
  const secret = config.pega.clientSecret();
  if (secret) body.set("client_secret", secret);

  const res = await fetch(config.pega.tokenUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Token exchange failed: HTTP ${res.status} ${text}`);
  }
  return (await res.json()) as TokenResponse;
}

export async function refreshTokens(refreshToken: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config.pega.clientId(),
  });
  const secret = config.pega.clientSecret();
  if (secret) body.set("client_secret", secret);

  const res = await fetch(config.pega.tokenUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Token refresh failed: HTTP ${res.status} ${text}`);
  }
  return (await res.json()) as TokenResponse;
}

export function decodeIdToken(idToken: string): UserInfo | undefined {
  try {
    const [, payload] = idToken.split(".");
    if (!payload) return undefined;
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const json = JSON.parse(
      Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
    ) as Record<string, unknown>;
    const sub = typeof json.sub === "string" ? json.sub : undefined;
    if (!sub) return undefined;
    return {
      sub,
      name: typeof json.name === "string" ? json.name : undefined,
      email: typeof json.email === "string" ? json.email : undefined,
      preferredUsername:
        typeof json.preferred_username === "string" ? json.preferred_username : undefined,
    };
  } catch {
    return undefined;
  }
}

export function applyTokens(session: AppSession, tokens: TokenResponse): void {
  session.accessToken = tokens.access_token;
  if (tokens.refresh_token) session.refreshToken = tokens.refresh_token;
  const expiresIn = tokens.expires_in ?? 3600;
  session.expiresAt = Date.now() + expiresIn * 1000;
  if (tokens.id_token) {
    const info = decodeIdToken(tokens.id_token);
    if (info) session.userInfo = info;
  }
}

/**
 * Returns a valid access token for the current session, refreshing if expired.
 * Throws if no session or refresh fails.
 */
export async function getValidAccessToken(session: AppSession): Promise<string> {
  if (!session.accessToken || !session.expiresAt) {
    throw new Error("Not authenticated");
  }
  if (session.expiresAt > Date.now() + 30_000) {
    return session.accessToken;
  }
  if (!session.refreshToken) {
    throw new Error("Access token expired and no refresh token available");
  }
  const tokens = await refreshTokens(session.refreshToken);
  applyTokens(session, tokens);
  return session.accessToken!;
}
