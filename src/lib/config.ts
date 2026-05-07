import { existsSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

const CONFIG_FILE = join(process.cwd(), ".aiapp-config.json");

export interface AppConfigData {
  pegaBaseUrl?: string;
  pegaAppAlias?: string;
  pegaClientId?: string;
  pegaClientSecret?: string;
  pegaRedirectUri?: string;
  pegaScopes?: string;
  sessionSecret?: string;
}

const ENV_MAP: Record<keyof AppConfigData, string> = {
  pegaBaseUrl: "PEGA_BASE_URL",
  pegaAppAlias: "PEGA_APP_ALIAS",
  pegaClientId: "PEGA_CLIENT_ID",
  pegaClientSecret: "PEGA_CLIENT_SECRET",
  pegaRedirectUri: "PEGA_REDIRECT_URI",
  pegaScopes: "PEGA_SCOPES",
  sessionSecret: "SESSION_SECRET",
};

/**
 * Pega endpoint paths appended to PEGA_BASE_URL. Base URL should be the Pega
 * context root, e.g. https://your-host/prweb.
 */
const PEGA_PATHS = {
  authorize: "/PRRestService/oauth2/v1/authorize",
  token: "/PRRestService/oauth2/v1/token",
  agentsList: "/api/application/v2/ai-agents",
};

function joinBase(base: string, path: string): string {
  return base.replace(/\/+$/, "") + path;
}

function readFile(): AppConfigData {
  if (!existsSync(CONFIG_FILE)) return {};
  try {
    const raw = readFileSync(CONFIG_FILE, "utf8");
    return JSON.parse(raw) as AppConfigData;
  } catch {
    return {};
  }
}

function writeFile(data: AppConfigData): void {
  writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2), "utf8");
  try {
    chmodSync(CONFIG_FILE, 0o600);
  } catch {
    /* best-effort */
  }
}

function get(key: keyof AppConfigData): string | undefined {
  const file = readFile()[key];
  if (file && file.trim()) return file.trim();
  const env = process.env[ENV_MAP[key]];
  return env && env.trim() ? env.trim() : undefined;
}

function required(key: keyof AppConfigData): string {
  const v = get(key);
  if (!v) {
    throw new Error(
      `Missing required config: ${ENV_MAP[key]}. Set it on /settings or via environment variable.`,
    );
  }
  return v;
}

export const config = {
  pega: {
    baseUrl: () => required("pegaBaseUrl"),
    appAlias: () => get("pegaAppAlias"),
    authorizeUrl: () => joinBase(required("pegaBaseUrl"), PEGA_PATHS.authorize),
    tokenUrl: () => joinBase(required("pegaBaseUrl"), PEGA_PATHS.token),
    agentsListUrl: () => joinBase(required("pegaBaseUrl"), PEGA_PATHS.agentsList),
    mcpUrl: (handle: string) => {
      const alias = get("pegaAppAlias");
      if (!alias) {
        throw new Error(
          "Pega application alias is not configured. Set it on /settings to use MCP.",
        );
      }
      const cleanHandle = handle.replace(/^\/+/, "");
      return `${joinBase(required("pegaBaseUrl"), `/app/${encodeURIComponent(alias)}/api/service/v1/mcp/`)}${cleanHandle}`;
    },
    clientId: () => required("pegaClientId"),
    clientSecret: () => get("pegaClientSecret"),
    redirectUri: () => required("pegaRedirectUri"),
    scopes: () => get("pegaScopes") ?? "",
  },
  session: {
    secret: () => {
      const existing = get("sessionSecret");
      if (existing && existing.length >= 32) return existing;
      const generated = randomBytes(48).toString("base64url");
      const file = readFile();
      file.sessionSecret = generated;
      writeFile(file);
      return generated;
    },
    cookieName: () => process.env["SESSION_COOKIE_NAME"] ?? "aiapp-session",
  },
};

export type ConfigKey = keyof AppConfigData;

export const REQUIRED_KEYS: ConfigKey[] = [
  "pegaBaseUrl",
  "pegaClientId",
  "pegaRedirectUri",
];

export const SECRET_KEYS = new Set<ConfigKey>(["pegaClientSecret", "sessionSecret"]);

export interface ConfigStatus {
  values: Partial<Record<ConfigKey, string>>; // secrets masked
  source: Partial<Record<ConfigKey, "file" | "env" | null>>;
  missing: ConfigKey[];
  configured: boolean;
}

export function getConfigStatus(): ConfigStatus {
  const file = readFile();
  const values: ConfigStatus["values"] = {};
  const source: ConfigStatus["source"] = {};
  const missing: ConfigKey[] = [];

  (Object.keys(ENV_MAP) as ConfigKey[]).forEach((key) => {
    const fromFile = file[key]?.trim();
    const fromEnv = process.env[ENV_MAP[key]]?.trim();
    const effective = fromFile || fromEnv;

    if (fromFile) source[key] = "file";
    else if (fromEnv) source[key] = "env";
    else source[key] = null;

    if (effective) {
      values[key] = SECRET_KEYS.has(key) ? "••••••••" : effective;
    } else {
      values[key] = "";
    }
  });

  for (const key of REQUIRED_KEYS) {
    if (!values[key]) missing.push(key);
  }

  return { values, source, missing, configured: missing.length === 0 };
}

/**
 * Persist config updates to the file. Empty/undefined values clear the file entry,
 * which lets the env var (if any) take over again.
 */
export function setConfigValues(updates: Partial<Record<ConfigKey, string>>): void {
  const file = readFile();
  for (const [k, v] of Object.entries(updates) as [ConfigKey, string | undefined][]) {
    if (v === undefined || v.trim() === "") {
      delete file[k];
    } else {
      file[k] = v.trim();
    }
  }
  writeFile(file);
}

export function isConfigured(): boolean {
  return getConfigStatus().configured;
}
