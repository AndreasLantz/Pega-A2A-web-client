"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { LOCALE_COOKIE } from "@/lib/i18n";

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const router = useRouter();

  function change(l: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
  }

  return (
    <select
      value={locale}
      onChange={(e) => change(e.target.value as Locale)}
      aria-label="Language"
      className="text-xs bg-transparent text-neutral-500 border-0 focus:outline-none cursor-pointer hover:text-black dark:hover:text-white"
    >
      <option value="en">EN</option>
      <option value="es">ES</option>
      <option value="ko">KO</option>
    </select>
  );
}
