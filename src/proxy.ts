import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "./lib/auth-cookie";

// Optimistic check only: sends visitors without a session cookie to the login page.
// The real check (is the session valid?) happens in requireUser() on every page and action.
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPublic = pathname === "/login" || pathname.startsWith("/api/");
  if (isPublic || request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const url = new URL("/login", request.url);
  if (pathname !== "/") url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
