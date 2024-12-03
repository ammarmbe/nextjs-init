import {
  createSession,
  generateSessionToken,
  setSessionTokenCookie,
  google,
} from "@/utils/auth";
import { cookies } from "next/headers";
import db from "@/utils/db";
import { decodeIdToken, type OAuth2Tokens } from "arctic";

export async function GET(request: Request): Promise<Response> {
  const cookieStore = await cookies();

  const url = new URL(request.url);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const storedState = cookieStore.get("spotify_oauth_state")?.value ?? null;
  const codeVerifier = cookieStore.get("google_code_verifier")?.value ?? null;

  if (
    code === null ||
    state === null ||
    storedState === null ||
    codeVerifier === null
  ) {
    return new Response(null, {
      status: 400,
    });
  }

  if (state !== storedState) {
    return new Response(null, {
      status: 400,
    });
  }

  let tokens: OAuth2Tokens;

  try {
    tokens = await google.validateAuthorizationCode(code, codeVerifier);
  } catch (e) {
    // Invalid code or client credentials
    return new Response(null, {
      status: 400,
    });
  }

  const claims = decodeIdToken(tokens.idToken());
  const googleUserId = claims.sub;
  const name = claims.name;

  const [user] =
    await db`SELECT * FROM users WHERE google_id = ${googleUserId}`;

  if (user !== null) {
    const sessionToken = generateSessionToken();
    const session = await createSession(sessionToken, user.id);

    await setSessionTokenCookie(sessionToken, session.expiresAt);

    return new Response(null, {
      status: 302,
      headers: {
        Location: "/",
      },
    });
  }

  await db`INSERT INTO users (google_id, name) VALUES (${googleUserId}, ${name})`;

  const sessionToken = generateSessionToken();
  const session = await createSession(sessionToken, user.id);

  await setSessionTokenCookie(sessionToken, session.expiresAt);

  return new Response(null, {
    status: 302,
    headers: {
      Location: "/",
    },
  });
}
