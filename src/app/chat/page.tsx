import { redirect } from "next/navigation";
import { getSession, isAuthenticated } from "@/lib/session";
import ChatClient from "./ChatClient";

export default async function ChatPage() {
  const session = await getSession();
  if (!isAuthenticated(session)) redirect("/login");
  return <ChatClient userName={session.userInfo?.name ?? session.userInfo?.preferredUsername ?? null} />;
}
