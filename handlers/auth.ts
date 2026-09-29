// handlers/auth.ts
import { argon2id, argon2Verify } from "hash-wasm";
import { decodeIdToken, generateCodeVerifier, generateState, Google } from "arctic";
import { deleteCookie, getCookies, setCookie } from "@std/http/cookie";
import { prisma } from "./db.ts";

const SESSION_COOKIE = "session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days, fixed expiry, no sliding renewal
const OAUTH_STATE_COOKIE = "oauth_state";
const OAUTH_VERIFIER_COOKIE = "oauth_verifier";
const OAUTH_MAX_AGE_SECONDS = 60 * 10; // 10 minutes, just long enough for the Google redirect round-trip

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isSecure(url: URL): boolean {
  return url.protocol === "https:";
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return await argon2id({
    password,
    salt,
    parallelism: 1,
    iterations: 2,
    memorySize: 19456,
    hashLength: 32,
    outputType: "encoded",
  });
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await argon2Verify({ password, hash });
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return bytes.toBase64({ alphabet: "base64url", omitPadding: true });
}

async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomToken();
  const id = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  await prisma.session.create({ data: { id, userId, expiresAt } });
  return { token, expiresAt };
}

function setSessionCookie(headers: Headers, url: URL, token: string, expiresAt: Date) {
  setCookie(headers, {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: isSecure(url),
    sameSite: "Lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getSessionUser(req: Request) {
  const token = getCookies(req.headers)[SESSION_COOKIE];
  if (!token) return null;

  const id = await sha256Hex(token);
  const session = await prisma.session.findUnique({ where: { id }, include: { user: true } });
  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id } }).catch(() => {});
    return null;
  }

  return session.user;
}

function googleClient(url: URL): Google {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  const redirectUri = Deno.env.get("GOOGLE_REDIRECT_URI");
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuth no está configurado (faltan variables de entorno)");
  }
  return new Google(clientId, clientSecret, redirectUri);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function handleAuthRequest(req: Request, url: URL): Promise<Response> {
  // POST /api/auth/register
  if (url.pathname === "/api/auth/register" && req.method === "POST") {
    try {
      const { email, password, displayName } = await req.json();

      if (typeof email !== "string" || !email.includes("@")) {
        return json({ success: false, error: "Email inválido" }, 400);
      }
      if (typeof password !== "string" || password.length < 8) {
        return json({ success: false, error: "La contraseña debe tener al menos 8 caracteres" }, 400);
      }

      const normalizedEmail = normalizeEmail(email);
      const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existing) {
        return json({ success: false, error: "Ese email ya está registrado" }, 409);
      }

      const passwordHash = await hashPassword(password);
      const user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          displayName: typeof displayName === "string" ? displayName : null,
        },
      });

      const { token, expiresAt } = await createSession(user.id);
      const headers = new Headers({ "Content-Type": "application/json" });
      setSessionCookie(headers, url, token, expiresAt);

      return new Response(JSON.stringify({ success: true, email: user.email }), { status: 200, headers });
    } catch (err) {
      console.error(err);
      return json({ success: false, error: (err as Error).message }, 500);
    }
  }

  // POST /api/auth/login
  if (url.pathname === "/api/auth/login" && req.method === "POST") {
    try {
      const { email, password } = await req.json();
      if (typeof email !== "string" || typeof password !== "string") {
        return json({ success: false, error: "Credenciales inválidas" }, 400);
      }

      const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
      if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
        return json({ success: false, error: "Credenciales inválidas" }, 401);
      }

      const { token, expiresAt } = await createSession(user.id);
      const headers = new Headers({ "Content-Type": "application/json" });
      setSessionCookie(headers, url, token, expiresAt);

      return new Response(JSON.stringify({ success: true, email: user.email }), { status: 200, headers });
    } catch (err) {
      console.error(err);
      return json({ success: false, error: (err as Error).message }, 500);
    }
  }

  // POST /api/auth/logout
  if (url.pathname === "/api/auth/logout" && req.method === "POST") {
    const token = getCookies(req.headers)[SESSION_COOKIE];
    if (token) {
      const id = await sha256Hex(token);
      await prisma.session.delete({ where: { id } }).catch(() => {});
    }
    const headers = new Headers({ "Content-Type": "application/json" });
    deleteCookie(headers, SESSION_COOKIE, { path: "/" });
    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
  }

  // GET /api/auth/me
  if (url.pathname === "/api/auth/me" && req.method === "GET") {
    const user = await getSessionUser(req);
    if (!user) return json({}, 401);
    return json({ email: user.email, displayName: user.displayName });
  }

  // GET /api/auth/google — redirect to Google's consent screen
  if (url.pathname === "/api/auth/google" && req.method === "GET") {
    try {
      const google = googleClient(url);
      const state = generateState();
      const codeVerifier = generateCodeVerifier();
      const authUrl = google.createAuthorizationURL(state, codeVerifier, ["openid", "email", "profile"]);

      const headers = new Headers({ Location: authUrl.toString() });
      setCookie(headers, {
        name: OAUTH_STATE_COOKIE,
        value: state,
        httpOnly: true,
        secure: isSecure(url),
        sameSite: "Lax",
        path: "/",
        maxAge: OAUTH_MAX_AGE_SECONDS,
      });
      setCookie(headers, {
        name: OAUTH_VERIFIER_COOKIE,
        value: codeVerifier,
        httpOnly: true,
        secure: isSecure(url),
        sameSite: "Lax",
        path: "/",
        maxAge: OAUTH_MAX_AGE_SECONDS,
      });

      return new Response(null, { status: 302, headers });
    } catch (err) {
      console.error(err);
      return json({ success: false, error: (err as Error).message }, 500);
    }
  }

  // GET /api/auth/google/callback
  if (url.pathname === "/api/auth/google/callback" && req.method === "GET") {
    const cookies = getCookies(req.headers);
    const clearOauthCookies = (headers: Headers) => {
      deleteCookie(headers, OAUTH_STATE_COOKIE, { path: "/" });
      deleteCookie(headers, OAUTH_VERIFIER_COOKIE, { path: "/" });
    };

    try {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const savedState = cookies[OAUTH_STATE_COOKIE];
      const codeVerifier = cookies[OAUTH_VERIFIER_COOKIE];

      if (!code || !state || !savedState || !codeVerifier || state !== savedState) {
        const headers = new Headers();
        clearOauthCookies(headers);
        return new Response("Solicitud de autenticación inválida o expirada", { status: 400, headers });
      }

      const google = googleClient(url);
      const tokens = await google.validateAuthorizationCode(code, codeVerifier);
      const claims = decodeIdToken(tokens.idToken()) as {
        sub: string;
        email?: string;
        email_verified?: boolean;
        name?: string;
      };

      let user = await prisma.user.findUnique({ where: { googleId: claims.sub } });

      if (!user && claims.email) {
        const normalizedEmail = normalizeEmail(claims.email);
        const existingByEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (existingByEmail && claims.email_verified) {
          user = await prisma.user.update({
            where: { id: existingByEmail.id },
            data: { googleId: claims.sub },
          });
        }
      }

      if (!user) {
        if (!claims.email) {
          const headers = new Headers();
          clearOauthCookies(headers);
          return new Response("Google no proporcionó un email", { status: 400, headers });
        }
        user = await prisma.user.create({
          data: {
            email: normalizeEmail(claims.email),
            googleId: claims.sub,
            displayName: claims.name ?? null,
          },
        });
      }

      const { token, expiresAt } = await createSession(user.id);
      const headers = new Headers({ Location: "/mi-espacio" });
      clearOauthCookies(headers);
      setSessionCookie(headers, url, token, expiresAt);

      return new Response(null, { status: 302, headers });
    } catch (err) {
      console.error(err);
      const headers = new Headers();
      clearOauthCookies(headers);
      return new Response("Error de autenticación: " + (err as Error).message, { status: 500, headers });
    }
  }

  return json({ error: "Endpoint de autenticación no encontrado" }, 404);
}
