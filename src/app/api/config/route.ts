import { NextRequest, NextResponse } from "next/server";
import {
  ConfigKey,
  REQUIRED_KEYS,
  SECRET_KEYS,
  getConfigStatus,
  setConfigValues,
} from "@/lib/config";

const ALLOWED_KEYS: ConfigKey[] = [
  "pegaBaseUrl",
  "pegaAppAlias",
  "pegaClientId",
  "pegaClientSecret",
  "pegaRedirectUri",
  "pegaScopes",
];

export async function GET() {
  return NextResponse.json(getConfigStatus());
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: Partial<Record<ConfigKey, string>> = {};
  for (const key of ALLOWED_KEYS) {
    if (!(key in body)) continue;
    const v = body[key];
    if (v === null) {
      updates[key] = "";
      continue;
    }
    if (typeof v !== "string") {
      return NextResponse.json(
        { error: `Field ${key} must be a string or null` },
        { status: 400 },
      );
    }
    if (SECRET_KEYS.has(key) && v === "••••••••") continue;
    updates[key] = v;
  }

  setConfigValues(updates);

  const status = getConfigStatus();
  return NextResponse.json({
    ...status,
    requiredKeys: REQUIRED_KEYS,
  });
}
