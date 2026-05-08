"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { AgentCard } from "@/lib/a2a";
import type { Locale } from "@/lib/i18n";
import { getT } from "@/lib/i18n";
import { Sidebar } from "@/components/Sidebar";

interface Agent {
  label: string;
  name: string;
  description: string;
  agentUrl: string;
  agentCardURL: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "agent";
  text: string;
  state?: string;
}

interface Conversation {
  id: string;
  agentUrl: string;
  agentCardURL?: string;
  agentLabel: string;
  title?: string;
  contextId?: string;
  messages: ChatMessage[];
  startedAt: string;
}

function defaultTitle(c: Conversation): string {
  return c.title?.trim() || c.agentLabel;
}

function deriveAutoTitle(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= 50) return trimmed;
  return trimmed.slice(0, 47).trimEnd() + "…";
}

const STORAGE_KEY = "aiapp.conversations";

function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Conversation[];
  } catch {
    return [];
  }
}

function saveConversations(items: Conversation[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* quota — ignore */
  }
}

export default function ChatClient({
  userName,
  locale,
}: {
  userName: string | null;
  locale: Locale;
}) {
  const t = getT(locale);
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [agentsError, setAgentsError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [agentCards, setAgentCards] = useState<Record<string, AgentCard>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchAgentCard = useCallback(
    async (agentCardURL: string) => {
      if (agentCards[agentCardURL]) return;
      try {
        const res = await fetch(
          `/api/agent-card?url=${encodeURIComponent(agentCardURL)}`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as { card: AgentCard };
        setAgentCards((prev) => ({ ...prev, [agentCardURL]: data.card }));
      } catch {
        /* silent — starter prompts are best-effort */
      }
    },
    [agentCards],
  );

  useEffect(() => {
    setConversations(loadConversations());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/agents");
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as { agents: Agent[] };
        if (!cancelled) setAgents(data.agents);
      } catch (e) {
        if (!cancelled)
          setAgentsError(e instanceof Error ? e.message : "unknown");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [activeId, conversations]);

  const active = conversations.find((c) => c.id === activeId) ?? null;

  useEffect(() => {
    if (active?.agentCardURL && !active.messages.length) {
      void fetchAgentCard(active.agentCardURL);
    }
  }, [active?.id, active?.agentCardURL, active?.messages.length, fetchAgentCard]);

  function persist(next: Conversation[]) {
    setConversations(next);
    saveConversations(next);
  }

  function startConversation(agent: Agent, prefill?: string) {
    const conv: Conversation = {
      id: crypto.randomUUID(),
      agentUrl: agent.agentUrl,
      agentCardURL: agent.agentCardURL,
      agentLabel: agent.label,
      messages: [],
      startedAt: new Date().toISOString(),
    };
    persist([conv, ...conversations]);
    setActiveId(conv.id);
    setShowAgentPicker(false);
    if (prefill) setInput(prefill);
    void fetchAgentCard(agent.agentCardURL);
  }

  function deleteConversation(id: string) {
    const next = conversations.filter((c) => c.id !== id);
    persist(next);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
  }

  function renameConversation(id: string, title: string) {
    const trimmed = title.trim();
    persist(
      conversations.map((c) =>
        c.id === id ? { ...c, title: trimmed || undefined } : c,
      ),
    );
  }

  function cancelSend() {
    abortRef.current?.abort();
  }

  async function send() {
    if (!active || !input.trim() || sending) return;
    setSendError(null);
    const text = input.trim();
    setInput("");

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text,
    };
    const optimistic = conversations.map((c) =>
      c.id === active.id ? { ...c, messages: [...c.messages, userMsg] } : c,
    );
    persist(optimistic);
    setSending(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentUrl: active.agentUrl,
          message: text,
          contextId: active.contextId,
        }),
        signal: controller.signal,
      });
      const data = (await res.json()) as {
        texts?: string[];
        contextId?: string;
        state?: string;
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        throw new Error(data.message ?? data.error ?? `HTTP ${res.status}`);
      }
      const replyText = (data.texts ?? []).join("\n\n");
      const agentMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "agent",
        text: replyText || t.chat.noResponse,
        state: data.state,
      };
      persist(
        optimistic.map((c) =>
          c.id === active.id
            ? {
                ...c,
                contextId: data.contextId ?? c.contextId,
                messages: [...c.messages, agentMsg],
                title: c.title ?? deriveAutoTitle(text),
              }
            : c,
        ),
      );
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setSendError(t.chat.cancelled);
      } else {
        setSendError(
          e instanceof Error ? e.message : t.chat.failedToSend,
        );
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setSending(false);
    }
  }

  return (
    <div className="flex flex-1 h-screen overflow-hidden">
      <Sidebar current="chat" userName={userName} locale={locale}>
        <div className="p-3 border-b border-black/10 dark:border-white/10">
          <button
            onClick={() => setShowAgentPicker(true)}
            className="w-full rounded-lg bg-black text-white dark:bg-white dark:text-black px-3 py-2 text-sm font-medium hover:opacity-90"
          >
            {t.chat.newChat}
          </button>
        </div>

        <div className="thin-scroll flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-sm text-neutral-500">
              {t.chat.noConversations}
            </div>
          ) : (
            <ul className="p-2 space-y-1">
              {conversations.map((c) => {
                const preview =
                  c.messages.find((m) => m.role === "user")?.text.slice(0, 60) ??
                  t.chat.empty;
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => setActiveId(c.id)}
                      className={`group w-full text-left rounded-lg px-3 py-2 text-sm transition flex items-start gap-2 ${
                        c.id === activeId
                          ? "bg-black/5 dark:bg-white/10"
                          : "hover:bg-black/5 dark:hover:bg-white/5"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {defaultTitle(c)}
                        </div>
                        <div className="text-xs text-neutral-500 truncate">
                          {c.title ? `${c.agentLabel} · ${preview}` : preview}
                        </div>
                      </div>
                      <span
                        role="button"
                        aria-label={t.chat.deleteConversation}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(c.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 px-1"
                      >
                        ×
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Sidebar>

      <main className="flex-1 flex flex-col min-w-0">
        {showAgentPicker || !active ? (
          <AgentPickerView
            agents={agents}
            error={agentsError}
            onStart={startConversation}
            onCancel={active ? () => setShowAgentPicker(false) : undefined}
            t={t}
          />
        ) : (
          <>
            <header className="border-b border-black/10 dark:border-white/10 px-4 py-3">
              <EditableTitle
                value={defaultTitle(active)}
                onSave={(title) => renameConversation(active.id, title)}
                clickToRename={t.chat.clickToRename}
              />
              <div className="mt-0.5 text-xs text-neutral-500 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span>{active.agentLabel}</span>
                {active.contextId && (
                  <span className="flex items-baseline gap-1">
                    <span className="opacity-60">{t.chat.context}</span>
                    <span className="font-mono break-all select-all">
                      {active.contextId}
                    </span>
                  </span>
                )}
              </div>
            </header>

            <div
              ref={scrollRef}
              className="thin-scroll flex-1 overflow-y-auto px-4 py-6"
            >
              <div className="mx-auto max-w-3xl space-y-4">
                {active.messages.length === 0 && (
                  <EmptyChat
                    agentLabel={active.agentLabel}
                    card={
                      active.agentCardURL
                        ? agentCards[active.agentCardURL]
                        : undefined
                    }
                    onPick={(prompt) => setInput(prompt)}
                    t={t}
                  />
                )}
                {active.messages.map((m) => (
                  <MessageBubble key={m.id} message={m} t={t} />
                ))}
                {sending && <TypingIndicator />}
                {sendError && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                    {sendError}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-black/10 dark:border-white/10 p-4">
              <div className="mx-auto max-w-3xl">
                <Composer
                  value={input}
                  onChange={setInput}
                  onSubmit={() => void send()}
                  onCancel={cancelSend}
                  sending={sending}
                  t={t}
                />
                <div className="mt-1.5 text-xs text-neutral-500 px-1">
                  {t.chat.enterToSend}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function EditableTitle({
  value,
  onSave,
  clickToRename,
}: {
  value: string;
  onSave: (next: string) => void;
  clickToRename: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function commit() {
    setEditing(false);
    if (draft.trim() !== value.trim()) onSave(draft);
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        title={clickToRename}
        className="font-medium truncate text-left hover:underline decoration-dotted underline-offset-4"
      >
        {value}
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
      }}
      className="font-medium bg-transparent border-b border-black/30 dark:border-white/30 focus:outline-none focus:border-black dark:focus:border-white px-0.5 min-w-0 w-full max-w-md"
    />
  );
}

type T = ReturnType<typeof getT>;

function MessageBubble({ message, t }: { message: ChatMessage; t: T }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser
            ? "bg-black text-white dark:bg-white dark:text-black whitespace-pre-wrap"
            : "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
        }`}
      >
        {isUser ? message.text : <AgentMarkdown text={message.text} />}
        {message.state && message.state !== "completed" && (
          <div className="mt-1 text-xs opacity-60">
            {t.chat.stateLabel(message.state)}
          </div>
        )}
      </div>
    </div>
  );
}

function AgentMarkdown({ text }: { text: string }) {
  return (
    <div className="agent-md text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...props }) => (
            <a
              {...props}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline break-words"
            >
              {children}
            </a>
          ),
          p: ({ children }) => (
            <p className="my-1.5 first:mt-0 last:mb-0">{children}</p>
          ),
          h1: ({ children }) => (
            <h1 className="text-base font-semibold mt-3 first:mt-0 mb-1">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-semibold mt-3 first:mt-0 mb-1">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold mt-2 first:mt-0 mb-1">
              {children}
            </h3>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 my-1.5 space-y-0.5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 my-1.5 space-y-0.5">{children}</ol>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-neutral-300 dark:border-neutral-600 pl-3 italic my-2 text-neutral-700 dark:text-neutral-300">
              {children}
            </blockquote>
          ),
          code: ({ className, children, ...props }) => {
            const isBlock = /language-/.test(className ?? "");
            if (isBlock) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className="rounded bg-black/10 dark:bg-white/15 px-1 py-0.5 text-[0.85em] font-mono">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="my-2 rounded-lg bg-neutral-900 dark:bg-black/60 text-neutral-100 p-3 overflow-x-auto text-xs leading-relaxed">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto">
              <table className="border-collapse text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-black/20 dark:border-white/20 px-2 py-1 font-semibold text-left">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-black/20 dark:border-white/20 px-2 py-1 align-top">
              {children}
            </td>
          ),
          hr: () => (
            <hr className="my-3 border-black/10 dark:border-white/10" />
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl bg-neutral-100 dark:bg-neutral-800 px-4 py-3 flex items-center gap-1">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="size-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500 animate-bounce"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function Composer({
  value,
  onChange,
  onSubmit,
  onCancel,
  sending,
  t,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  sending: boolean;
  t: T;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 192) + "px";
  }, [value]);

  return (
    <div className="flex items-end gap-2">
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder={t.chat.placeholder}
        rows={1}
        disabled={sending}
        className="thin-scroll flex-1 resize-none rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 px-3 py-2 text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 disabled:opacity-60 max-h-48 overflow-y-auto"
      />
      {sending ? (
        <button
          onClick={onCancel}
          className="rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-medium hover:opacity-90 shrink-0"
        >
          {t.chat.cancel}
        </button>
      ) : (
        <button
          onClick={onSubmit}
          disabled={!value.trim()}
          className="rounded-lg bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-sm font-medium disabled:opacity-40 shrink-0"
        >
          {t.chat.send}
        </button>
      )}
    </div>
  );
}

function EmptyChat({
  agentLabel,
  card,
  onPick,
  t,
}: {
  agentLabel: string;
  card?: AgentCard;
  onPick: (prompt: string) => void;
  t: T;
}) {
  const examples = useMemo(() => {
    if (!card?.skills) return [] as string[];
    const all = card.skills.flatMap((s) => s.examples ?? []);
    return Array.from(new Set(all)).slice(0, 6);
  }, [card]);

  return (
    <div className="text-center py-12">
      <p className="text-sm text-neutral-500">
        {t.chat.sendMessageTo(agentLabel)}
      </p>
      {examples.length > 0 && (
        <div className="mt-5">
          <div className="text-xs uppercase tracking-wide text-neutral-400 mb-2">
            {t.chat.tryOne}
          </div>
          <ul className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
            {examples.map((ex, i) => (
              <li key={i}>
                <button
                  onClick={() => onPick(ex)}
                  className="text-left text-xs rounded-md border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 px-2 py-1"
                >
                  {ex}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function AgentPickerView({
  agents,
  error,
  onStart,
  onCancel,
  t,
}: {
  agents: Agent[] | null;
  error: string | null;
  onStart: (a: Agent, prefill?: string) => void;
  onCancel?: () => void;
  t: T;
}) {
  const [selected, setSelected] = useState<Agent | null>(null);

  if (selected) {
    return (
      <AgentDetail
        agent={selected}
        onBack={() => setSelected(null)}
        onStart={(prefill) => onStart(selected, prefill)}
        t={t}
      />
    );
  }

  return (
    <div className="thin-scroll flex-1 overflow-y-auto px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{t.chat.pickAgent}</h2>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-sm text-neutral-500 hover:text-black dark:hover:text-white"
            >
              {t.chat.cancel}
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300 mb-4">
            {t.chat.failedToLoadAgents(error)}
          </div>
        )}

        {agents === null && !error && (
          <div className="text-sm text-neutral-500">{t.chat.loadingAgents}</div>
        )}

        {agents && agents.length === 0 && (
          <div className="text-sm text-neutral-500">{t.chat.noAgents}</div>
        )}

        <ul className="grid gap-2">
          {agents?.map((a) => (
            <li key={a.agentCardURL}>
              <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 hover:bg-black/5 dark:hover:bg-white/5 transition px-4 py-3 flex items-start gap-3">
                <button
                  onClick={() => setSelected(a)}
                  className="flex-1 text-left min-w-0"
                >
                  <div className="font-medium truncate">{a.label}</div>
                  {a.description && (
                    <div className="text-sm text-neutral-500 mt-0.5 line-clamp-2">
                      {a.description}
                    </div>
                  )}
                </button>
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={() => setSelected(a)}
                    className="text-xs text-neutral-500 hover:text-black dark:hover:text-white px-2 py-1"
                  >
                    {t.chat.details}
                  </button>
                  <button
                    onClick={() => onStart(a)}
                    className="text-xs rounded-md bg-black text-white dark:bg-white dark:text-black px-2 py-1 hover:opacity-90"
                  >
                    {t.chat.start}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function AgentDetail({
  agent,
  onBack,
  onStart,
  t,
}: {
  agent: Agent;
  onBack: () => void;
  onStart: (prefill?: string) => void;
  t: T;
}) {
  const [card, setCard] = useState<AgentCard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCard(null);
    setError(null);
    (async () => {
      try {
        const url = `/api/agent-card?url=${encodeURIComponent(agent.agentCardURL)}`;
        const res = await fetch(url);
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as { card: AgentCard };
        if (!cancelled) setCard(data.card);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "unknown");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agent.agentCardURL]);

  return (
    <div className="thin-scroll flex-1 overflow-y-auto px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="text-sm text-neutral-500 hover:text-black dark:hover:text-white"
          >
            {t.chat.back}
          </button>
          <button
            onClick={() => onStart()}
            className="rounded-lg bg-black text-white dark:bg-white dark:text-black px-3 py-1.5 text-sm font-medium hover:opacity-90"
          >
            {t.chat.startChat}
          </button>
        </div>

        <h2 className="text-2xl font-semibold tracking-tight">{agent.label}</h2>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {t.chat.failedToLoadAgentCard(error)}
          </div>
        )}

        {!card && !error && (
          <div className="mt-4 text-sm text-neutral-500">
            {t.chat.loadingAgentCard}
          </div>
        )}

        {card && (
          <div className="mt-4 space-y-6">
            {card.description && (
              <p className="text-neutral-700 dark:text-neutral-300">
                {card.description}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              {card.version && (
                <Meta label={t.chat.version} value={card.version} />
              )}
              {card.capabilities?.streaming !== undefined && (
                <Meta
                  label={t.chat.streaming}
                  value={
                    card.capabilities.streaming ? t.chat.yes : t.chat.no
                  }
                />
              )}
              {card.capabilities?.pushNotifications !== undefined && (
                <Meta
                  label={t.chat.pushNotifications}
                  value={
                    card.capabilities.pushNotifications
                      ? t.chat.yes
                      : t.chat.no
                  }
                />
              )}
              {card.defaultInputModes?.length ? (
                <Meta
                  label={t.chat.inputModes}
                  value={card.defaultInputModes.join(", ")}
                />
              ) : null}
              {card.defaultOutputModes?.length ? (
                <Meta
                  label={t.chat.outputModes}
                  value={card.defaultOutputModes.join(", ")}
                />
              ) : null}
            </div>

            {card.documentationUrl && (
              <div>
                <a
                  href={card.documentationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {t.chat.viewDocumentation}
                </a>
              </div>
            )}

            {card.skills?.length ? (
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 mb-2">
                  {t.chat.skills}
                </h3>
                <ul className="space-y-3">
                  {card.skills.map((s) => (
                    <li
                      key={s.id}
                      className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 p-4"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{s.name}</span>
                        {s.tags?.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-neutral-600 dark:text-neutral-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      {s.description && (
                        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                          {s.description}
                        </p>
                      )}
                      {s.examples?.length ? (
                        <div className="mt-3">
                          <div className="text-xs uppercase tracking-wide text-neutral-500 mb-1">
                            {t.chat.tryOne}
                          </div>
                          <ul className="flex flex-wrap gap-2">
                            {s.examples.map((ex, i) => (
                              <li key={i}>
                                <button
                                  onClick={() => onStart(ex)}
                                  className="text-left text-xs rounded-md border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 px-2 py-1"
                                >
                                  {ex}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 px-3 py-2">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}
