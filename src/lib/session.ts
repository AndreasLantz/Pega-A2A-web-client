import { cookies } from "next/headers";
import { getIronSession, SessionOptions } from "iron-session";
import { config } from "./config";

export interface UserInfo {
  sub: string;
  name?: string;
  email?: string;
  preferredUsername?: string;
}

export interface AppSession {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  userInfo?: UserInfo;
  pkceVerifier?: string;
  oauthState?: string;
}

function sessionOptions(): SessionOptions {
  return {
    password: config.session.secret(),
    cookieName: config.session.cookieName(),
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
  };
}

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<AppSession>(cookieStore, sessionOptions());
}

export function isAuthenticated(s: AppSession): boolean {
  return Boolean(s.accessToken && s.expiresAt && s.expiresAt > Date.now());
}
