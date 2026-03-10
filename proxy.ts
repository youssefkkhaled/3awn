import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "admin_session";

export async function proxy(request: NextRequest) {
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isLoginRoute = request.nextUrl.pathname.startsWith("/admin/login");
  const hasAdminSession = request.cookies.has(SESSION_COOKIE_NAME);

  if (isAdminRoute && !isLoginRoute && !hasAdminSession) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next({
    request,
  });
}

export const config = {
  matcher: ["/admin/:path*"],
};
