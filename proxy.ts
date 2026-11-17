import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Role } from "@/types/Auth";
import { jwtVerify } from "jose";

const secretKey = new TextEncoder().encode(process.env.JWT_SECRET);

// -----------------------------------------------------
// Route configurations
// -----------------------------------------------------
const ROUTE_ROLES: { prefix: string; allowedRoles: Role[] }[] = [
  { prefix: "/user-management", allowedRoles: ["owner"] },
  { prefix: "/analytics", allowedRoles: ["manager", "owner"] },
  { prefix: "/inventory", allowedRoles: ["manager", "owner"] },
  { prefix: "/scheduling", allowedRoles: ["staff", "manager", "owner"] },
];

const matchesPath = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(base + "/");

// -----------------------------------------------------
// CORS
// -----------------------------------------------------
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

function corsHeaders(origin: string): Record<string, string> {
  if (!origin || !allowedOrigins.includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-CSRF-Token",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

// -----------------------------------------------------
// CSRF (origin check + signed double-submit cookie)
// -----------------------------------------------------
const CSRF_SECRET = process.env.CSRF_SECRET ?? "";
const CSRF_COOKIE = "csrf_token";
const CSRF_HEADER = "x-csrf-token";
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
// Server-to-server callers that verify their own signatures
const CSRF_EXEMPT_PREFIXES = ["/api/webhooks"];

const enc = new TextEncoder();

async function sign(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(CSRF_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(value));
  return Buffer.from(sig).toString("base64url");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function createCsrfToken(): Promise<string> {
  const random = Buffer.from(
    crypto.getRandomValues(new Uint8Array(32)),
  ).toString("base64url");
  return `${random}.${await sign(random)}`;
}

async function isValidCsrfToken(token: string): Promise<boolean> {
  const [random, sig] = token.split(".");
  if (!random || !sig) return false;
  return timingSafeEqual(sig, await sign(random));
}

function isTrustedOrigin(request: NextRequest): boolean {
  const sameOrigin = request.nextUrl.origin;
  const origin = request.headers.get("origin");
  if (origin) return origin === sameOrigin || allowedOrigins.includes(origin);

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const o = new URL(referer).origin;
      return o === sameOrigin || allowedOrigins.includes(o);
    } catch {
      return false;
    }
  }
  // No Origin/Referer and no Sec-Fetch-Site: not a browser, so not a CSRF vector
  return request.headers.get("sec-fetch-site") == null;
}

async function passesCsrf(request: NextRequest): Promise<boolean> {
  if (!isTrustedOrigin(request)) return false;
  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value;
  const headerToken = request.headers.get(CSRF_HEADER);
  return (
    !!cookieToken &&
    !!headerToken &&
    timingSafeEqual(cookieToken, headerToken) &&
    (await isValidCsrfToken(cookieToken))
  );
}

// -----------------------------------------------------
// Proxy
// -----------------------------------------------------
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const cors = isApi ? corsHeaders(request.headers.get("origin") ?? "") : {};

  // Every response (next, redirect, error) goes through here
  const finalize = async (response: NextResponse) => {
    for (const [k, v] of Object.entries(cors)) response.headers.set(k, v);

    const existing = request.cookies.get(CSRF_COOKIE)?.value;
    if (!existing || !(await isValidCsrfToken(existing))) {
      response.cookies.set(CSRF_COOKIE, await createCsrfToken(), {
        httpOnly: false, // client JS must read it
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
    }
    return response;
  };

  // Unauthenticated: JSON 401 for APIs, redirect for pages
  const deny = (): Promise<NextResponse> => {
    if (isApi) {
      return finalize(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return finalize(NextResponse.redirect(loginUrl));
  };

  // 1. Preflight: no credentials, so it skips everything else
  if (isApi && request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: cors });
  }

  // 2. CSRF on state-changing API requests
  if (
    isApi &&
    UNSAFE_METHODS.has(request.method) &&
    !CSRF_EXEMPT_PREFIXES.some((p) => matchesPath(pathname, p))
  ) {
    if (!(await passesCsrf(request))) {
      return finalize(
        NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 }),
      );
    }
  }

  // 3. JWT authentication and RBAC
  const token = request.cookies.get("auth_token")?.value;

  const isPublicPath =
    pathname === "/login" ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    matchesPath(pathname, "/api/auth");

  const isGuestAllowedPath =
    matchesPath(pathname, "/order") ||
    matchesPath(pathname, "/api/floor-plans") ||
    matchesPath(pathname, "/api/orders");

  if (isPublicPath) {
    if (pathname === "/login" && token) {
      try {
        await jwtVerify(token, secretKey);
        return finalize(NextResponse.redirect(new URL("/", request.url)));
      } catch {
        // Invalid token, stay on login
      }
    }
    return finalize(NextResponse.next());
  }

  if (!token) {
    if (isGuestAllowedPath) return finalize(NextResponse.next());
    return deny();
  }

  try {
    const { payload } = await jwtVerify(token, secretKey);
    const userRole = payload.role as Role;

    if (isGuestAllowedPath) return finalize(NextResponse.next());

    const matchingRoute = ROUTE_ROLES.find((r) =>
      matchesPath(pathname, r.prefix),
    );
    if (matchingRoute && !matchingRoute.allowedRoles.includes(userRole)) {
      return finalize(NextResponse.redirect(new URL("/login", request.url)));
    }

    return finalize(NextResponse.next());
  } catch {
    // Bad/expired token: guests still get through, just clear the cookie
    const response = isGuestAllowedPath
      ? NextResponse.next()
      : isApi
        ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        : NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("auth_token");
    return finalize(response);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|gif|ico)$).*)",
  ],
};
