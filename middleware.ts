import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { CLE_PRESENTATION, presentationVue } from "@/lib/presentation";

// Paths that must stay reachable even with an incomplete profile — the
// onboarding page itself (or we'd redirect-loop), auth/login flows, and API
// routes (a redirect response to a fetch() call isn't something callers
// expect, so those are left to their own auth checks instead).
const ONBOARDING_EXEMPT = ["/onboarding", "/login", "/auth", "/api"];

// Pages réservées aux joueurs connectés (chacune redirige aussi vers /login
// côté serveur). La redirection se fait ici, avant tout HTML : faite par la
// page, elle arrive pendant le streaming (app/loading.tsx) et devient un
// rechargement côté navigateur, qui relançait l'intro une seconde fois.
// « /fiches » seule : les fiches elles-mêmes restent lisibles sans compte.
const PRIVATE = [
  "/calculs", "/classement", "/courses", "/dashboard", "/defi", "/duel", "/eclair", "/entrainement", "/exam",
  "/flashcards", "/mock-exams", "/moi", "/official-exams", "/onboarding", "/people",
  "/practice", "/qcm", "/reviser", "/scratch", "/session",
];
const isPrivate = (pathname: string) => pathname === "/fiches" || PRIVATE.some((p) => pathname === p || pathname.startsWith(`${p}/`));

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
    // Seul le pseudo est exigé : la photo est facultative, le sceau
    // d'initiales en tient lieu (premier trait, app/onboarding).
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();

    const incomplete = !profile?.username;
    // Un compte déjà configuré qui n'a pas vu la présentation de cette
    // version y repasse une fois, ses réponses déjà remplies (lib/presentation).
    const aPresenter = !incomplete && !presentationVue(user.user_metadata, request.cookies.get(CLE_PRESENTATION)?.value);
    if (incomplete || aPresenter) {
      const onboardingUrl = new URL("/onboarding", request.url);
      onboardingUrl.searchParams.set("next", pathname + request.nextUrl.search);
      return redirectTo(onboardingUrl);
    }
  }

  // L'entrée du site : l'accueil ou la connexion, sans passer par une page
  if (pathname === "/") return redirectTo(new URL(user ? "/dashboard" : "/login", request.url));
  if (!user && isPrivate(pathname)) return redirectTo(new URL("/login", request.url));

  return response;

  /** Redirection qui garde les cookies de session rafraîchis plus haut. */
  function redirectTo(to: URL) {
    const r = NextResponse.redirect(to);
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  }
}

export const config = {
  // intro/ : le film de l'intro et ses masques — statiques, publics, lus
  // par morceaux dès le chargement : ni aller-retour d'authentification à
  // chaque morceau (la vidéo calait), ni redirection
  matcher: ["/((?!_next/static|_next/image|favicon.ico|intro/|splash/|.*\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|woff2?)$).*)"]
};
