import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession, isAuthenticated } from "@/lib/session";
import { getLocale } from "@/lib/i18n";
import ChatClient from "./ChatClient";

export default async function ChatPage() {
  const session = await getSession();
  if (!isAuthenticated(session)) redirect("/login");
  const locale = getLocale((await cookies()).get("aiapp.locale")?.value);
  return (
    <ChatClient
      userName={
        session.userInfo?.name ?? session.userInfo?.preferredUsername ?? null
      }
      locale={locale}
    />
  );
}
