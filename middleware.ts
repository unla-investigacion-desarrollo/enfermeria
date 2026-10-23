import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { getHomeForUser } from "@/lib/auth/navigation";

const { auth } = NextAuth(authConfig);

export default auth((request) => {
  const { nextUrl, auth: session } = request;
  const path = nextUrl.pathname;
  const isLoginPage = path === "/login";
  const isChangePasswordPage = path === "/cambiar-password";

  if (!session?.user) {
    if (isLoginPage) return NextResponse.next();
    const loginUrl = new URL("/login", nextUrl);
    if (path !== "/") loginUrl.searchParams.set("desde", path);
    return NextResponse.redirect(loginUrl);
  }

  const home = getHomeForUser(session.user.role, session.user.mustChangePassword);

  if (session.user.mustChangePassword) {
    if (isChangePasswordPage) return NextResponse.next();
    return NextResponse.redirect(new URL("/cambiar-password", nextUrl));
  }

  if (isChangePasswordPage || isLoginPage || path === "/") {
    return NextResponse.redirect(new URL(home, nextUrl));
  }

  if (path.startsWith("/admin") && session.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/inicio", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|uploads|.*\\..*).*)"],
};
