import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const isAdminApiRoute = request.nextUrl.pathname.startsWith("/api/admin");
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin") || isAdminApiRoute;
  const isLoginPage = request.nextUrl.pathname === "/admin/login";

  const blockUnauthorized = () =>
    isAdminApiRoute
      ? NextResponse.json({ error: "未授權" }, { status: 401 })
      : NextResponse.redirect(new URL("/admin/login", request.url));

  // If Supabase is not configured, allow login page and block all other admin routes
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (isAdminRoute && !isLoginPage) {
      return blockUnauthorized();
    }
    return NextResponse.next({ request });
  }

  let proxyResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          proxyResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            proxyResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (isAdminRoute && !isLoginPage && !user) {
      return blockUnauthorized();
    }

    if (isLoginPage && user) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  } catch {
    // Auth check failed — allow login page, block other admin routes
    if (isAdminRoute && !isLoginPage) {
      return blockUnauthorized();
    }
  }

  return proxyResponse;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
