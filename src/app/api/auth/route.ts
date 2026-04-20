import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  // Authenticate against Biwenger — same call your n8n workflow makes
  let biwengerRes: Response;
  try {
    biwengerRes = await fetch("https://biwenger.as.com/api/v2/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return NextResponse.json({ error: "Could not reach Biwenger" }, { status: 502 });
  }

  if (!biwengerRes.ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const biwengerData = await biwengerRes.json();

  // Log the response shape so we can debug token extraction
  console.log("Biwenger login response keys:", JSON.stringify(Object.keys(biwengerData)));
  console.log("Biwenger login response:", JSON.stringify(biwengerData).slice(0, 500));

  // Biwenger returns a token and basic user info
  const token: string = biwengerData?.token ?? biwengerData?.data?.token;
  const userId: number = biwengerData?.id ?? biwengerData?.data?.id ?? biwengerData?.data?.user?.id ?? 5132475;
  const name: string = biwengerData?.name ?? biwengerData?.data?.user?.name ?? biwengerData?.data?.name ?? email;

  if (!token) {
    console.log("No token found in response:", JSON.stringify(biwengerData).slice(0, 300));
    return NextResponse.json({ error: "Authentication failed", debug: biwengerData }, { status: 401 });
  }

  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  session.user = { id: userId, token, name };
  await session.save();

  return NextResponse.json({ ok: true, name });
}