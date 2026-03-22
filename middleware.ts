import { auth } from "@/auth";
import { NextResponse } from "next/server";

// ================================================
// MIDDLEWARE — protects all /dashboard routes
// ------------------------------------------------
// Unauthenticated users are redirected to /login.
// The widget and API routes are public.
// ================================================

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn   = !!req.auth;

  // Protect dashboard
  if (pathname.startsWith("/dashboard") && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Redirect logged-in users away from login page
  if (pathname === "/login" && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};