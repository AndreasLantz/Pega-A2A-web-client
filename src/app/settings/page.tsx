import { cookies } from "next/headers";
import { getLocale } from "@/lib/i18n";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const locale = getLocale((await cookies()).get("aiapp.locale")?.value);
  return <SettingsClient locale={locale} />;
}
