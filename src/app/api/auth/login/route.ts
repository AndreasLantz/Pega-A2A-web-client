import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  buildAuthorizeUrl,
  generatePkce,
  generateState,
} from "@/lib/pega-oauth";

export async function GET() {
  const session = await getSession();
  const { verifier, challenge } = generatePkce();
  const state = generateState();

  session.pkceVerifier = verifier;
  session.oauthState = state;
  await session.save();

  const url = buildAuthorizeUrl({ state, codeChallenge: challenge });
  return NextResponse.redirect(url);
}
