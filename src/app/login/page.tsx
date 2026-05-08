import { cookies } from "next/headers";
import Link from "next/link";
import { isConfigured } from "@/lib/config";
import { getLocale, getT } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

type SearchParams = Promise<{ error?: string; error_description?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error, error_description } = await searchParams;
  const configured = isConfigured();
  const locale = getLocale((await cookies()).get("aiapp.locale")?.value);
  const t = getT(locale);

  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 p-8 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {t.login.title}
            </h1>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              {t.login.subtitle}
            </p>
          </div>
          <LanguageSwitcher locale={locale} />
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
            <div className="font-medium">
              {t.login.signInFailed} {error}
            </div>
            {error_description && (
              <div className="mt-1 opacity-80">{error_description}</div>
            )}
          </div>
        )}

        {!configured && (
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
            {t.login.notConfiguredPre}{" "}
            <Link href="/settings" className="underline font-medium">
              {t.login.notConfiguredLink}
            </Link>{" "}
            {t.login.notConfiguredPost}
          </div>
        )}

        <a
          href="/api/auth/login"
          aria-disabled={!configured}
          className={`mt-6 inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition ${
            configured
              ? "bg-black text-white dark:bg-white dark:text-black hover:opacity-90"
              : "bg-neutral-200 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-600 pointer-events-none"
          }`}
        >
          {t.login.signInButton}
        </a>

        <div className="mt-4 text-center">
          <Link
            href="/settings"
            className="text-xs text-neutral-500 hover:text-black dark:hover:text-white"
          >
            {t.login.settingsLink}
          </Link>
        </div>
      </div>
    </main>
  );
}
