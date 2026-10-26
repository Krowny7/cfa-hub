import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TEMPS_MAX_ENVOI, tempsIndisponible } from "@/lib/temps-site";

// Le temps actif sur le site, envoyé quand l'onglet se cache ou se ferme
// (components/temps/CompteurTemps : navigator.sendBeacon ou fetch keepalive,
// qui survivent à la fermeture de la page ; un appel du client Supabase n'y
// survit pas). POST { secondes } (JSON, corps text/plain accepté : la
// balise) : les mêmes bornes que l'envoi de chaque minute (ajouter_temps
// borne au temps réellement écoulé). 204 : compté ; 503 : la migration
// manque (le compteur se tait un moment).

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

export async function POST(req: NextRequest) {
  if (autreOrigine(req)) return new NextResponse(null, { status: 403 });

  const brut = await req.text().catch(() => "");
  if (!brut || brut.length > 200) return new NextResponse(null, { status: 400 });
  let secondes: number;
  try {
    secondes = Math.floor(Number((JSON.parse(brut) as { secondes?: unknown })?.secondes));
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (!Number.isFinite(secondes) || secondes < 1) return new NextResponse(null, { status: 400 });

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return new NextResponse(null, { status: 401 });
  const { error } = await supabase.rpc("ajouter_temps", { p_secondes: Math.min(secondes, TEMPS_MAX_ENVOI) });
  if (error) return new NextResponse(null, { status: tempsIndisponible(error) ? 503 : 500 });
  return new NextResponse(null, { status: 204 });
}
