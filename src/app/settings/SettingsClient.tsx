"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ConfigKey =
  | "pegaBaseUrl"
  | "pegaAppAlias"
  | "pegaClientId"
  | "pegaClientSecret"
  | "pegaRedirectUri"
  | "pegaScopes";

interface ConfigStatus {
  values: Partial<Record<ConfigKey, string>>;
  source: Partial<Record<ConfigKey, "file" | "env" | null>>;
  missing: ConfigKey[];
  configured: boolean;
}

interface Field {
  key: ConfigKey;
  label: string;
  hint?: string;
  placeholder?: string;
  required?: boolean;
  secret?: boolean;
}

const FIELDS: Field[] = [
  {
    key: "pegaBaseUrl",
    label: "Pega base URL",
    hint: "The Pega context root. We append /PRRestService/oauth2/v1/{authorize,token} and /api/agent2agent/v1/agents to it.",
    placeholder: "https://your-pega-host/prweb",
    required: true,
  },
  {
    key: "pegaAppAlias",
    label: "Pega application alias",
    hint: "Used for MCP URLs (the path segment after /app/, e.g. \"register-test\"). Required to use the MCP feature.",
    placeholder: "register-test",
  },
  {
    key: "pegaClientId",
    label: "Client ID",
    placeholder: "your-oauth-client-id",
    required: true,
  },
  {
    key: "pegaClientSecret",
    label: "Client secret",
    hint: "Only required for confidential OAuth clients. Public clients use PKCE only.",
    placeholder: "leave blank for public clients",
    secret: true,
  },
  {
    key: "pegaRedirectUri",
    label: "Redirect URI",
    hint: "Must match exactly what's registered in Pega.",
    placeholder: "http://localhost:3000/api/auth/callback",
    required: true,
  },
  {
    key: "pegaScopes",
    label: "Scopes",
    hint: "Space-separated. Leave blank if none required.",
    placeholder: "openid profile",
  },
];

export default function SettingsClient() {
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Record<ConfigKey, string>>>({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    void load();
    void checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch("/api/auth/me");
      setAuthed(res.ok);
    } catch {
      setAuthed(false);
    }
  }

  async function load() {
    setLoadError(null);
    try {
      const res = await fetch("/api/config");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as ConfigStatus;
      setStatus(data);
      setDraft(data.values);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "unknown");
    }
  }

  async function save() {
    if (!status) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload: Record<string, string | null> = {};
      for (const f of FIELDS) {
        const original = status.values[f.key] ?? "";
        const next = (draft[f.key] ?? "").trim();
        if (next === original) continue;
        payload[f.key] = next === "" ? null : next;
      }
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const updated = (await res.json()) as ConfigStatus;
      setStatus(updated);
      setDraft(updated.values);
      setSavedAt(Date.now());
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex-1 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <Link
            href="/"
            className="text-sm text-neutral-500 hover:text-black dark:hover:text-white"
          >
            ← Back
          </Link>
        </div>

        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
          Connect this app to your Pega instance. Values are saved to{" "}
          <code className="rounded bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 text-xs">
            .aiapp-config.json
          </code>{" "}
          in the project root and override any values set via environment variables.
        </p>

        {loadError && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300 mb-4">
            Failed to load config: {loadError}
          </div>
        )}

        {status && status.missing.length > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200 mb-4">
            Required fields not yet set: {status.missing.join(", ")}
          </div>
        )}

        {status && (
          <div className="space-y-4">
            {FIELDS.map((f) => {
              const source = status.source[f.key];
              const original = status.values[f.key] ?? "";
              const value = draft[f.key] ?? "";
              const isMaskedSecret = f.secret && value === "••••••••";

              return (
                <div key={f.key}>
                  <label className="flex items-baseline justify-between mb-1">
                    <span className="text-sm font-medium">
                      {f.label}
                      {f.required && <span className="text-red-500 ml-1">*</span>}
                    </span>
                    {source && (
                      <span className="text-xs text-neutral-500">
                        from {source}
                      </span>
                    )}
                  </label>
                  <input
                    type={f.secret && !isMaskedSecret ? "password" : "text"}
                    value={value}
                    placeholder={f.placeholder}
                    onChange={(e) =>
                      setDraft({ ...draft, [f.key]: e.target.value })
                    }
                    onFocus={(e) => {
                      if (isMaskedSecret) {
                        setDraft({ ...draft, [f.key]: "" });
                        e.target.value = "";
                      }
                    }}
                    className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                  />
                  {f.hint && (
                    <p className="mt-1 text-xs text-neutral-500">{f.hint}</p>
                  )}
                  {f.secret && original === "••••••••" && value === "••••••••" && (
                    <p className="mt-1 text-xs text-neutral-500">
                      A value is set. Click the field to replace it; clear it to remove.
                    </p>
                  )}
                </div>
              );
            })}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => void save()}
                disabled={saving}
                className="rounded-lg bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-40"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              {savedAt && (
                <span className="text-sm text-green-600 dark:text-green-400">
                  Saved.
                </span>
              )}
              {saveError && (
                <span className="text-sm text-red-600 dark:text-red-400">
                  {saveError}
                </span>
              )}
              {status.configured && authed === false && (
                <Link
                  href="/api/auth/login"
                  className="ml-auto text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Sign in →
                </Link>
              )}
              {authed && (
                <Link
                  href="/chat"
                  className="ml-auto text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Back to chat →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
