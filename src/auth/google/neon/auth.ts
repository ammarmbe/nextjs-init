import db from "./db";
import {
  encodeBase32LowerCaseNoPadding,
  encodeHexLowerCase,
} from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";
import { cookies } from "next/headers";
import { cache } from "react";
import { Google } from "arctic";

type TSession = {
  id: string;
  user_id: string;
  expires_at: string;
  refresh_token: string;
};

type TUser = {
  id: string;
  google_id: string;
  name: string;
  email: string;
  image: string;
};

export type SessionValidationResult =
  | { session: TSession; user: TUser }
  | { session: null; user: null };

export const google = new Google(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URL
);

export function generateSessionToken(): string {
  const bytes = new Uint8Array(20);

  crypto.getRandomValues(bytes);

  return encodeBase32LowerCaseNoPadding(bytes);
}

export async function createSession(
  token: string,
  userId: string,
  refreshToken: string
): Promise<TSession> {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));

  const session: TSession = {
    id: sessionId,
    userId,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    refreshToken,
  };

  await db`INSERT INTO sessions (id, user_id, expires_at, refresh_token) VALUES (${sessionId}, ${userId}, ${session.expiresAt}, ${refreshToken})`;

  return session;
}

export async function validateSessionToken(
  token: string
): Promise<SessionValidationResult> {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));

  const [
    result,
  ] = db`SELECT sessions.id AS session_id, sessions.user_id AS user_id, sessions.expires_at AS expires_at, sessions.refresh_token AS refresh_token, users.* FROM sessions JOIN users ON sessions.user_id = users.id WHERE sessions.id = ${sessionId}`;

  if (result === null) {
    return { session: null, user: null };
  }

  const { session_id, user_id, expires_at, refresh_token, ...user } = result;

  if (Date.now() >= expires_at.getTime()) {
    await db`DELETE FROM sessions WHERE id = ${sessionId}`;

    return { session: null, user: null };
  }

  if (Date.now() >= expires_at.getTime() - 1000 * 60 * 60 * 24 * 15) {
    await db`UPDATE sessions SET expires_at = ${new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 30
    )} WHERE id = ${sessionId}`;
  }

  return {
    session: {
      id: session_id,
      userId: user_id,
      expiresAt: expires_at,
      refreshToken: refresh_token,
    },
    user,
  };
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await db`DELETE FROM sessions WHERE id = ${sessionId}`;
}

export async function setSessionTokenCookie(
  token: string,
  expiresAt: Date
): Promise<void> {
  (await cookies()).set("session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function deleteSessionTokenCookie(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set("access_token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });

  cookieStore.set("refresh_token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });

  cookieStore.set("session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
}

export const getSession = cache(async (): Promise<SessionValidationResult> => {
  const token = (await cookies()).get("session")?.value ?? null;

  if (token === null) {
    return { session: null, user: null };
  }

  return await validateSessionToken(token);
});
