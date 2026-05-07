import { redirect } from "next/navigation";
import { getSession, isAuthenticated } from "@/lib/session";
import { isConfigured } from "@/lib/config";
import McpClient from "./McpClient";

export default async function McpPage() {
  if (!isConfigured()) redirect("/settings");
  const session = await getSession();
  if (!isAuthenticated(session)) redirect("/login");
  return (
    <McpClient
      userName={session.userInfo?.name ?? session.userInfo?.preferredUsername ?? null}
    />
  );
}
