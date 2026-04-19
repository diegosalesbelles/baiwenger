import { SessionOptions } from "iron-session";

export interface SessionData {
  user?: {
    id: number;
    token: string;
    name: string;
  };
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: "baiwenger_session",
  cookieOptions: {
    // 7 days
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  },
};
