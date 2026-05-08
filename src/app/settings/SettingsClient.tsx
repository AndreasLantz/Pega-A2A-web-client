"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { getT } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

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

const FIELDS: { key: ConfigKey; required?: boolean; secret?: boolean }[] = [
  { key: "pegaBaseUrl", required: true },
  { key: "pegaAppAlias" },
  { key: "pegaClientId", required: true },
  { key: "pegaClientSecret", secret: true },
  { key: "pegaRedirectUri", required: true },
  { key: "pegaScopes" },
];

export default function SettingsClient({ locale }: { locale: Locale }) {
  const t = getT(locale);
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
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
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
          <h1 className="text-2xl font-semibold tracking-tight">
            {t.settings.title}
          </h1>
          <div className="flex items-center gap-4">
            <LanguageSwitcher locale={locale} />
            <Link
              href="/"
              className="text-sm text-neutral-500 hover:text-black dark:hover:text-white"
            >
              {t.settings.back}
            </Link>
          </div>
        </div>

        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
          {t.settings.descriptionPre}{" "}
          <code className="rounded bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 text-xs">
            .aiapp-config.json
          </code>{" "}
          {t.settings.descriptionPost}
        </p>

        {loadError && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300 mb-4">
            {t.settings.failedToLoad(loadError)}
          </div>
        )}

        {status && status.missing.length > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200 mb-4">
            {t.settings.requiredFieldsMissing(status.missing.join(", "))}
          </div>
        )}

        {status && (
          <div className="space-y-4">
            {FIELDS.map((f) => {
              const fieldT = t.settings.fields[f.key];
              const source = status.source[f.key];
              const original = status.values[f.key] ?? "";
              const value = draft[f.key] ?? "";
              const isMaskedSecret = f.secret && value === "••••••••";

              return (
                <div key={f.key}>
                  <label className="flex items-baseline justify-between mb-1">
                    <span className="text-sm font-medium">
                      {fieldT.label}
                      {f.required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </span>
                    {source && (
                      <span className="text-xs text-neutral-500">
                        {t.settings.fromSource(source)}
                      </span>
                    )}
                  </label>
                  <input
                    type={f.secret && !isMaskedSecret ? "password" : "text"}
                    value={value}
                    placeholder={fieldT.placeholder}
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
                  {fieldT.hint && (
                    <p className="mt-1 text-xs text-neutral-500">
                      {fieldT.hint}
                    </p>
                  )}
                  {f.secret &&
                    original === "••••••••" &&
                    value === "••••••••" && (
                      <p className="mt-1 text-xs text-neutral-500">
                        {t.settings.secretSet}
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
                {saving ? t.settings.saving : t.settings.save}
              </button>
              {savedAt && (
                <span className="text-sm text-green-600 dark:text-green-400">
                  {t.settings.saved}
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
                  {t.settings.signIn}
                </Link>
              )}
              {authed && (
                <Link
                  href="/chat"
                  className="ml-auto text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {t.settings.backToChat}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
