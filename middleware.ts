// middleware.ts
// This file runs before EVERY page request.
// It checks if the user is logged in and protects private pages.

import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Start building the response — we'll modify it if needed
  let response = NextResponse.next({ request });

  // Create a Supabase client that works in middleware
  // This is slightly different from our other clients because
  // middleware has its own way of reading and writing cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Update cookies on both the request and response
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Check if the user has a valid session
  // getUser() is safer than getSession() — it verifies the token with Supabase
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // List of pages that require login
  const protectedRoutes = [
    "/dashboard",
    "/profile",
    "/clubs/register",
    "/dashboard/events",
    "/dashboard/members",
    "/dashboard/streams",
    "/dashboard/club-events",
    "/events/submit",
    "/dashboard/event-organisers",
  ];

  // Check if the current page is a protected route
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route),
  );

  // If the page is protected and user is NOT logged in → redirect to login
  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If user IS logged in and tries to visit /login or /signup →
  // redirect them to dashboard (they're already logged in!)
  if (
    user &&
    (request.nextUrl.pathname === "/login" ||
      request.nextUrl.pathname === "/signup")
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

// Tell Next.js which routes this middleware should run on
// We exclude static files and images — no need to check auth for those
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
