import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "./session";
import { redirect } from "next/navigation";

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

// Use in server components/pages that require auth
export async function requireAuth() {
  const session = await getSession();
  if (!session.user) {
    redirect("/login");
  }
  return session.user;
}
