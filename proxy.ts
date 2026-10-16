import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Paths open without a staff session: the customer page and the auth flow.
const PUBLIC = [/^\/login$/, /^\/auth\//, /^\/s\//];

// Per-request script policy: only scripts carrying this response's nonce (and what they load) run.
// Next.js reads the nonce from the request's CSP header and stamps it on its own scripts.
function contentSecurityPolicy(nonce: string) {
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const dev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'", // style="" attributes (motion, server-rendered initial states); not scripts
    `img-src 'self' blob: data: ${supabase}`,
    `media-src 'self' blob: ${supabase}`,
    `connect-src 'self' ${supabase} ${supabase.replace(/^https/, "wss")}`,
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = contentSecurityPolicy(nonce);
  const next = () => {
    const headers = new Headers(request.headers); // includes any refreshed session cookies
    headers.set("x-nonce", nonce);
    headers.set("Content-Security-Policy", csp);
    return NextResponse.next({ request: { headers } });
  };

  let response = next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = next();
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // Verifies the session JWT locally (ES256 signing keys, cached JWKS) instead of a round trip
  // to Supabase Auth, and refreshes the session cookie when it is about to expire.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  const path = request.nextUrl.pathname;
  if (!user && !PUBLIC.some((re) => re.test(path))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
