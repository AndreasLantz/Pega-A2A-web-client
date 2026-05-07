import { redirect } from "next/navigation";
import { getSession, isAuthenticated } from "@/lib/session";
import { isConfigured } from "@/lib/config";

export default async function Home() {
  if (!isConfigured()) redirect("/settings");
  const session = await getSession();
  if (isAuthenticated(session)) redirect("/chat");
  redirect("/login");
}
