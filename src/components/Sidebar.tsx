"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { Locale } from "@/lib/i18n";
import { getT } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

type Section = "chat" | "mcp";

export function Sidebar({
  current,
  userName,
  locale,
  children,
}: {
  current: Section;
  userName: string | null;
  locale: Locale;
  children: ReactNode;
}) {
  const t = getT(locale);

  const TABS: { id: Section; href: string; label: string; icon: ReactNode }[] =
    [
      { id: "chat", href: "/chat", label: t.sidebar.tabs.chat, icon: <ChatIcon /> },
      { id: "mcp", href: "/mcp", label: t.sidebar.tabs.mcp, icon: <PlugIcon /> },
    ];

  return (
    <aside className="w-72 shrink-0 border-r border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-neutral-950 flex flex-col">
      <nav className="p-2 border-b border-black/10 dark:border-white/10 flex gap-1">
        {TABS.map((tab) => {
          const active = tab.id === current;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition ${
                active
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              {tab.icon}
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1 min-h-0 flex flex-col">{children}</div>

      <div className="p-3 border-t border-black/10 dark:border-white/10 text-sm space-y-2">
        <div className="flex items-center justify-between min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="size-2 shrink-0 rounded-full bg-green-500"
              aria-label="Signed in"
            />
            <span className="truncate text-neutral-600 dark:text-neutral-400">
              {userName ?? t.sidebar.signedIn}
            </span>
          </div>
          <LanguageSwitcher locale={locale} />
        </div>
        <div className="flex items-center justify-between">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 text-neutral-500 hover:text-black dark:hover:text-white"
          >
            <GearIcon />
            {t.sidebar.settings}
          </Link>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="text-neutral-500 hover:text-black dark:hover:text-white"
            >
              {t.sidebar.signOut}
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

function ChatIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden="true"
    >
      <path d="M7.5 8.25h9M7.5 12h6M3.75 19.5l3.5-2.5h11A2.25 2.25 0 0 0 20.5 14.75v-8.5A2.25 2.25 0 0 0 18.25 4H5.75A2.25 2.25 0 0 0 3.5 6.25v13.25Z" />
    </svg>
  );
}

function PlugIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden="true"
    >
      <path d="M9 4v4M15 4v4M7 8h10v4a5 5 0 0 1-10 0V8ZM12 17v3" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden="true"
    >
      <path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.214 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a6.759 6.759 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
