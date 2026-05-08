"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Locale } from "@/lib/i18n";
import { getT } from "@/lib/i18n";
import { Sidebar } from "@/components/Sidebar";

const STORAGE_KEY = "aiapp.mcp.recent";

const COMMON_METHODS = [
  "tools/list",
  "tools/call",
  "prompts/list",
  "prompts/get",
  "resources/list",
  "resources/read",
  "initialize",
];

interface RecentCall {
  id: string;
  serverHandle: string;
  method: string;
  params: string;
}

interface CallResult {
  request: { jsonrpc: string; id: string | number; method: string; params: unknown };
  response: unknown;
  httpStatus: number;
  elapsedMs: number;
  resolvedUrl?: string;
}

interface McpEnv {
  appAlias: string | null;
  baseUrl: string | null;
}

function loadRecent(): RecentCall[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecentCall[]) : [];
  } catch {
    return [];
  }
}

function saveRecent(items: RecentCall[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 30)));
  } catch {
    /* ignore */
  }
}

type T = ReturnType<typeof getT>;

export default function McpClient({
  userName,
  locale,
}: {
  userName: string | null;
  locale: Locale;
}) {
  const t = getT(locale);
  const [serverHandle, setServerHandle] = useState("");
  const [method, setMethod] = useState("tools/list");
  const [params, setParams] = useState("{}");
  const [paramsError, setParamsError] = useState<string | null>(null);
  const [calling, setCalling] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  const [result, setResult] = useState<CallResult | null>(null);
  const [recent, setRecent] = useState<RecentCall[]>([]);
  const [env, setEnv] = useState<McpEnv | null>(null);

  useEffect(() => {
    setRecent(loadRecent());
    void (async () => {
      try {
        const res = await fetch("/api/mcp/call");
        if (res.ok) setEnv((await res.json()) as McpEnv);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const parsedParams = useMemo(() => {
    if (!params.trim()) return { ok: true as const, value: {} as unknown };
    try {
      return { ok: true as const, value: JSON.parse(params) as unknown };
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : "Invalid JSON",
      };
    }
  }, [params]);

  useEffect(() => {
    setParamsError(parsedParams.ok ? null : parsedParams.error);
  }, [parsedParams]);

  async function callServer() {
    if (!serverHandle.trim() || !method.trim() || calling) return;
    if (!parsedParams.ok) {
      setParamsError(parsedParams.error);
      return;
    }
    setCallError(null);
    setResult(null);
    setCalling(true);

    try {
      const res = await fetch("/api/mcp/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverHandle: serverHandle.trim(),
          method: method.trim(),
          params: parsedParams.value,
        }),
      });
      const data = (await res.json()) as Partial<CallResult> & {
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        throw new Error(data.message ?? data.error ?? `HTTP ${res.status}`);
      }
      setResult(data as CallResult);

      const entry: RecentCall = {
        id: crypto.randomUUID(),
        serverHandle: serverHandle.trim(),
        method: method.trim(),
        params,
      };
      const next = [
        entry,
        ...recent.filter(
          (r) =>
            !(
              r.serverHandle === entry.serverHandle &&
              r.method === entry.method &&
              r.params === entry.params
            ),
        ),
      ];
      setRecent(next);
      saveRecent(next);
    } catch (e) {
      setCallError(e instanceof Error ? e.message : "Call failed");
    } finally {
      setCalling(false);
    }
  }

  function loadFromRecent(r: RecentCall) {
    setServerHandle(r.serverHandle);
    setMethod(r.method);
    setParams(r.params);
    setResult(null);
    setCallError(null);
  }

  function deleteRecent(id: string) {
    const next = recent.filter((r) => r.id !== id);
    setRecent(next);
    saveRecent(next);
  }

  const isCommon = COMMON_METHODS.includes(method);

  return (
    <div className="flex flex-1 h-screen overflow-hidden">
      <Sidebar current="mcp" userName={userName} locale={locale}>
        <div className="p-3 border-b border-black/10 dark:border-white/10">
          <button
            onClick={() => {
              setServerHandle("");
              setMethod("tools/list");
              setParams("{}");
              setResult(null);
              setCallError(null);
            }}
            className="w-full rounded-lg bg-black text-white dark:bg-white dark:text-black px-3 py-2 text-sm font-medium hover:opacity-90"
          >
            {t.mcp.newCall}
          </button>
        </div>

        <div className="thin-scroll flex-1 overflow-y-auto">
          {recent.length === 0 ? (
            <div className="p-4 text-sm text-neutral-500">
              {t.mcp.noCallsYet}
            </div>
          ) : (
            <ul className="p-2 space-y-1">
              {recent.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => loadFromRecent(r)}
                    className="group w-full text-left rounded-lg px-3 py-2 text-sm transition flex items-start gap-2 hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-mono text-xs truncate"
                        title={r.serverHandle}
                      >
                        {r.serverHandle}
                      </div>
                      <div className="text-xs text-neutral-500 truncate">
                        {r.method}
                      </div>
                    </div>
                    <span
                      role="button"
                      aria-label={t.mcp.remove}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRecent(r.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 px-1"
                    >
                      ×
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Sidebar>

      <main className="flex-1 flex flex-col min-w-0 thin-scroll overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-6 py-8 space-y-6">
          <header>
            <h1 className="text-2xl font-semibold tracking-tight">
              {t.mcp.title}
            </h1>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              {t.mcp.description}
            </p>
          </header>

          {env && !env.appAlias && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
              {t.mcp.setAppAlias.pre}{" "}
              <strong>{t.mcp.setAppAlias.bold}</strong>{" "}
              {t.mcp.setAppAlias.mid}{" "}
              <a href="/settings" className="underline font-medium">
                {t.mcp.setAppAlias.settings}
              </a>{" "}
              {t.mcp.setAppAlias.post}
            </div>
          )}

          <div className="space-y-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 p-5">
            <div>
              <label className="text-sm font-medium">{t.mcp.serverHandle}</label>
              <input
                value={serverHandle}
                onChange={(e) => setServerHandle(e.target.value)}
                placeholder="Rule-Service-MCP!FirstMcpServerTest"
                className="mt-1 w-full rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-950 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
              />
              <p className="mt-1 text-xs text-neutral-500">
                {t.mcp.serverHandleHint}
              </p>
              {env?.baseUrl && env?.appAlias && (
                <div className="mt-1.5 text-xs text-neutral-500 truncate">
                  {t.mcp.resolvesTo}{" "}
                  <span className="font-mono break-all select-all">
                    {`${env.baseUrl.replace(/\/+$/, "")}/app/${env.appAlias}/api/service/v1/mcp/`}
                    <span className="text-neutral-700 dark:text-neutral-300">
                      {serverHandle.trim() || "<handle>"}
                    </span>
                  </span>
                </div>
              )}
            </div>

            <div className="grid sm:grid-cols-[1fr_auto] gap-3">
              <div>
                <label className="text-sm font-medium">{t.mcp.method}</label>
                <div className="mt-1 flex gap-2">
                  <select
                    value={isCommon ? method : "__custom__"}
                    onChange={(e) => {
                      if (e.target.value === "__custom__") setMethod("");
                      else setMethod(e.target.value);
                    }}
                    className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-950 px-2 py-2 text-sm"
                  >
                    {COMMON_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                    <option value="__custom__">{t.mcp.custom}</option>
                  </select>
                  <input
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="flex-1 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-950 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                    placeholder="tools/list"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">{t.mcp.params}</label>
              <textarea
                value={params}
                onChange={(e) => setParams(e.target.value)}
                rows={5}
                spellCheck={false}
                className="thin-scroll mt-1 w-full rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-950 px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
              />
              {paramsError && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {paramsError}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => void callServer()}
                disabled={
                  calling ||
                  !serverHandle.trim() ||
                  !method.trim() ||
                  !!paramsError ||
                  !env?.appAlias
                }
                className="rounded-lg bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-sm font-medium disabled:opacity-40 hover:opacity-90"
              >
                {calling ? t.mcp.calling : t.mcp.call}
              </button>
              {callError && (
                <span className="text-sm text-red-600 dark:text-red-400">
                  {callError}
                </span>
              )}
            </div>
          </div>

          {result && <ResponseView result={result} t={t} />}
        </div>
      </main>
    </div>
  );
}

function ResponseView({ result, t }: { result: CallResult; t: T }) {
  const { response, httpStatus, elapsedMs } = result;
  const statusOk = httpStatus >= 200 && httpStatus < 300;
  const rpcError =
    typeof response === "object" &&
    response !== null &&
    "error" in (response as Record<string, unknown>);
  const rpcResult =
    typeof response === "object" &&
    response !== null &&
    "result" in (response as Record<string, unknown>)
      ? (response as { result: unknown }).result
      : undefined;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
        <h2 className="text-lg font-semibold">{t.mcp.response}</h2>
        <span
          className={`text-xs rounded-full px-2 py-0.5 ${
            statusOk
              ? "bg-green-500/15 text-green-700 dark:text-green-400"
              : "bg-red-500/15 text-red-700 dark:text-red-400"
          }`}
        >
          HTTP {httpStatus}
        </span>
        <span className="text-xs text-neutral-500">{elapsedMs} ms</span>
      </div>

      {rpcError ? (
        <RpcErrorView error={(response as { error: unknown }).error} />
      ) : isToolsListResult(rpcResult) ? (
        <ToolsList tools={rpcResult.tools} t={t} />
      ) : (
        <JsonView value={response} />
      )}
    </section>
  );
}

function RpcErrorView({ error }: { error: unknown }) {
  const e = error as { code?: number; message?: string; data?: unknown };
  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm">
      <div className="font-medium text-red-700 dark:text-red-300">
        JSON-RPC error{e.code !== undefined ? ` ${e.code}` : ""}
        {e.message ? `: ${e.message}` : ""}
      </div>
      {e.data !== undefined && (
        <div className="mt-2">
          <JsonView value={e.data} />
        </div>
      )}
    </div>
  );
}

interface ToolDef {
  name: string;
  title?: string;
  description?: string;
  inputSchema?: {
    type?: string;
    properties?: Record<string, { description?: string; type?: string }>;
    required?: string[];
  };
  _meta?: Record<string, unknown>;
}

function isToolsListResult(value: unknown): value is { tools: ToolDef[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { tools?: unknown }).tools)
  );
}

function ToolsList({ tools, t }: { tools: ToolDef[]; t: T }) {
  return (
    <div className="space-y-3">
      <div className="text-xs uppercase tracking-wide text-neutral-500">
        {t.mcp.tools(tools.length)}
      </div>
      <ul className="space-y-3">
        {tools.map((tool) => (
          <ToolCard key={tool.name} tool={tool} t={t} />
        ))}
      </ul>
    </div>
  );
}

function ToolCard({ tool, t }: { tool: ToolDef; t: T }) {
  const props = tool.inputSchema?.properties ?? {};
  const required = new Set(tool.inputSchema?.required ?? []);
  const propEntries = Object.entries(props);

  return (
    <li className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 p-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <div className="font-medium">{tool.title ?? tool.name}</div>
          <div className="text-xs font-mono text-neutral-500">{tool.name}</div>
        </div>
      </div>

      {tool.description && (
        <div className="mt-3 text-sm text-neutral-700 dark:text-neutral-300 [&_p]:my-1.5 [&_h1]:text-sm [&_h1]:font-semibold [&_h1]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-3 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1.5 [&_code]:rounded [&_code]:bg-black/10 [&_code]:dark:bg-white/15 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em] [&_code]:font-mono [&_pre]:my-2 [&_pre]:rounded-lg [&_pre]:bg-neutral-900 [&_pre]:dark:bg-black/60 [&_pre]:text-neutral-100 [&_pre]:p-3 [&_pre]:overflow-x-auto [&_pre]:text-xs">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{tool.description}</ReactMarkdown>
        </div>
      )}

      {propEntries.length > 0 ? (
        <div className="mt-4">
          <div className="text-xs uppercase tracking-wide text-neutral-500 mb-1.5">
            {t.mcp.inputs}
          </div>
          <ul className="space-y-1.5">
            {propEntries.map(([name, def]) => (
              <li key={name} className="text-sm flex items-baseline gap-2 flex-wrap">
                <code className="rounded bg-black/5 dark:bg-white/10 px-1.5 py-0.5 text-xs font-mono">
                  {name}
                </code>
                {def.type && (
                  <span className="text-xs text-neutral-500">{def.type}</span>
                )}
                {required.has(name) ? (
                  <span className="text-xs text-amber-600 dark:text-amber-400">
                    {t.mcp.required}
                  </span>
                ) : (
                  <span className="text-xs text-neutral-400">
                    {t.mcp.optional}
                  </span>
                )}
                {def.description && (
                  <span className="text-xs text-neutral-600 dark:text-neutral-400 basis-full pl-1">
                    {def.description}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-3 text-xs text-neutral-500">{t.mcp.noInputs}</div>
      )}

      {tool._meta ? (
        <details className="mt-3">
          <summary className="text-xs text-neutral-500 cursor-pointer hover:text-black dark:hover:text-white">
            {t.mcp.meta}
          </summary>
          <div className="mt-2">
            <JsonView value={tool._meta} />
          </div>
        </details>
      ) : null}
    </li>
  );
}

function JsonView({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (value === null) return <span className="text-neutral-500">null</span>;
  if (typeof value === "string")
    return (
      <span className="text-green-700 dark:text-green-400">
        {JSON.stringify(value)}
      </span>
    );
  if (typeof value === "number")
    return (
      <span className="text-blue-700 dark:text-blue-400">{value}</span>
    );
  if (typeof value === "boolean")
    return (
      <span className="text-purple-700 dark:text-purple-400">
        {String(value)}
      </span>
    );
  if (Array.isArray(value)) {
    if (value.length === 0) return <span>[]</span>;
    return (
      <details open={depth < 1} className="my-0.5">
        <summary className="cursor-pointer text-neutral-500 hover:text-black dark:hover:text-white">
          [{value.length}]
        </summary>
        <ul className="ml-4 border-l border-black/10 dark:border-white/10 pl-3 space-y-0.5">
          {value.map((v, i) => (
            <li key={i} className="text-xs font-mono">
              <span className="text-neutral-500">{i}: </span>
              <JsonView value={v} depth={depth + 1} />
            </li>
          ))}
        </ul>
      </details>
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return <span>{"{}"}</span>;
    return (
      <details open={depth < 1} className="my-0.5">
        <summary className="cursor-pointer text-neutral-500 hover:text-black dark:hover:text-white">
          {"{"}
          {entries.length} {entries.length === 1 ? "key" : "keys"}
          {"}"}
        </summary>
        <ul className="ml-4 border-l border-black/10 dark:border-white/10 pl-3 space-y-0.5">
          {entries.map(([k, v]) => (
            <li key={k} className="text-xs font-mono">
              <span className="text-neutral-700 dark:text-neutral-300">
                {k}:{" "}
              </span>
              <JsonView value={v} depth={depth + 1} />
            </li>
          ))}
        </ul>
      </details>
    );
  }
  return <span>{String(value)}</span>;
}
