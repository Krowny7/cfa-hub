import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TAILLE_MAX } from "@/lib/flashcards/progression";
import { cleValide, ecrireProgression, lireProgressions } from "@/lib/flashcards/progression-serveur";

// La boucle des flashcards sur le compte, hors du routeur de Next :
// - POST { cle, etat } (JSON, corps text/plain accepté : sendBeacon) : le
//   dernier envoi quand la page se ferme, passe en arrière-plan ou suit un
//   lien (navigator.sendBeacon / fetch keepalive : une action serveur n'y
//   survit pas, et une navigation l'abandonne). Même écriture que
//   app/flashcards/actions.ts.
// - GET ?cle=… : la ligne du joueur, relue quand la révision revient au
//   premier plan (onglet resté ouvert pendant qu'on avançait ailleurs) ;
//   sans cache.

const SANS_CACHE = { "cache-control": "no-store" };

const hote = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
};

/** Même origine seulement (le cookie de session ne suffit pas). */
function autreOrigine(req: NextRequest): boolean {
  const origine = req.headers.get("origin");
  return !!origine && hote(origine) !== (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host);
}

export async function GET(req: NextRequest) {
  if (autreOrigine(req)) return new NextResponse(null, { status: 403 });
  const cle = req.nextUrl.searchParams.get("cle");
  if (!cleValide(cle)) return new NextResponse(null, { status: 400 });
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return new NextResponse(null, { status: 401, headers: SANS_CACHE });
  const lu = await lireProgressions(supabase, data.user.id, [cle]);
  // table absente ou base injoignable : rien à dire, la révision continue
  if (!lu) return new NextResponse(null, { status: 503, headers: SANS_CACHE });
  return NextResponse.json({ ligne: lu.get(cle) ?? null }, { headers: SANS_CACHE });
}

export async function POST(req: NextRequest) {
  if (autreOrigine(req)) return new NextResponse(null, { status: 403 });

  const brut = await req.text().catch(() => "");
  if (!brut || brut.length > TAILLE_MAX + 2_000) return new NextResponse(null, { status: 400 });
  let corps: { cle?: unknown; etat?: unknown };
  try {
    corps = JSON.parse(brut);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return new NextResponse(null, { status: 401 });
  const r = await ecrireProgression(supabase, data.user.id, corps?.cle, corps?.etat);
  if (r.ok) return new NextResponse(null, { status: 204 });
  const statut = r.raison === "refus" ? 400 : r.raison === "absente" ? 404 : r.raison === "conflit" ? 409 : 500;
  return NextResponse.json(r, { status: statut });
}
