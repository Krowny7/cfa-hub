import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type SetAllCookies } from "@supabase/ssr";

// Paths that must stay reachable even with an incomplete profile — the
// onboarding page itself (or we'd redirect-loop), auth/login flows, and API
// routes (a redirect response to a fetch() call isn't something callers
// expect, so those are left to their own auth checks instead).
const ONBOARDING_EXEMPT = ["/onboarding", "/login", "/auth", "/api"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers }
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: request.headers } });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  // Refresh session if needed (also validates cookies)
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;

  const pathname = request.nextUrl.pathname;
  const exempt = ONBOARDING_EXEMPT.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (user && !exempt) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username,avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    const incomplete = !profile?.username || !profile?.avatar_url;
    if (incomplete) {
      const onboardingUrl = new URL("/onboarding", request.url);
      onboardingUrl.searchParams.set("next", pathname + request.nextUrl.search);
      return NextResponse.redirect(onboardingUrl);
    }
  }

  return response;
}

export const config = {
  // splash/: the intro film's data files — static, public, and fetched
  // before anything else, so no auth round-trip and never a redirect
  matcher: ["/((?!_next/static|_next/image|favicon.ico|splash/|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
