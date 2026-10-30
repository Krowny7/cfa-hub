import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { idsDeRequete, type CarteRecue } from "@/lib/flashcards/partie-api";
import { cleSet } from "@/lib/flashcards/progression";
import { lireProgressions } from "@/lib/flashcards/progression-serveur";

// La donne de la partie de cartes (/flashcards/partie) : GET ?ids=<cartes
// tirées, séparées par des virgules> rend leur texte (recto, verso, paquet)
// et les boucles de leurs paquets sur le compte (flashcard_progress), de quoi
// y écrire « Maîtrisée » / « Pas encore » sans rien écraser. Lu avec le
// client du joueur : la RLS des cartes ne lui montre que celles qu'il peut
// lire (les paquets officiels sont publics). `lignes` null : table pas encore
// créée ou base injoignable, la maîtrise reste sur l'appareil. Sans cache.

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
  const ids = idsDeRequete(req.nextUrl.searchParams.get("ids"));
  if (!ids) return new NextResponse(null, { status: 400 });

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new NextResponse(null, { status: 401, headers: SANS_CACHE });

  const { data, error } = await supabase.from("flashcards").select("id,front,back,set_id").in("id", ids).limit(ids.length);
  if (error) return new NextResponse(null, { status: 503, headers: SANS_CACHE });
  const cartes: CarteRecue[] = ((data ?? []) as { id: string; front: string; back: string; set_id: string }[]).map((c) => ({
    id: c.id,
    setId: c.set_id,
    front: c.front,
    back: c.back,
  }));

  // les boucles des paquets touchés, une seule requête (null : pas de synchronisation)
  const paquets = [...new Set(cartes.map((c) => c.setId))];
  const lu = paquets.length ? await lireProgressions(supabase, auth.user.id, paquets.map(cleSet)) : new Map();
  return NextResponse.json({ cartes, lignes: lu ? Object.fromEntries(lu) : null }, { headers: SANS_CACHE });
}
