import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession, isAuthenticated } from "@/lib/session";
import { isConfigured } from "@/lib/config";
import { getLocale } from "@/lib/i18n";
import McpClient from "./McpClient";

export default async function McpPage() {
  if (!isConfigured()) redirect("/settings");
  const session = await getSession();
  if (!isAuthenticated(session)) redirect("/login");
  const locale = getLocale((await cookies()).get("aiapp.locale")?.value);
  return (
    <McpClient
      userName={
        session.userInfo?.name ?? session.userInfo?.preferredUsername ?? null
      }
      locale={locale}
    />
  );
}
