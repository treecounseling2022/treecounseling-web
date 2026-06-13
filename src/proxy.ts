import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isLoginPage = request.nextUrl.pathname === "/admin/login";

  // If Supabase is not configured, allow login page and block all other admin routes
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (isAdminRoute && !isLoginPage) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
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
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    if (isLoginPage && user) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  } catch {
    // Auth check failed — allow login page, block other admin routes
    if (isAdminRoute && !isLoginPage) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return proxyResponse;
}

export const config = {
  matcher: ["/admin/:path*"],
};
