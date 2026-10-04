import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { lireKlipy } from "@/lib/profil/gifs";

// La banque de GIF de l'éditeur du profil : un relais vers KLIPY.
// - La clé (KLIPY_API_KEY) reste sur le serveur.
// - Réservé aux joueurs connectés (le quota de la clé est partagé).
// - Réponses gardées en cache (tendances 1 h, recherches 1 jour) : une
//   même recherche ne coûte qu'un appel, quel que soit le nombre de joueurs.
// GET /api/gifs?q=bravo&page=2 ; sans q : les tendances.

const BASE = "https://api.klipy.com/api/v1";

export async function GET(req: NextRequest) {
  const cle = process.env.KLIPY_API_KEY;
  if (!cle) return NextResponse.json({ erreur: "La banque de GIF n'est pas encore branchée." }, { status: 503 });

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ erreur: "Connecte-toi pour chercher un GIF." }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").replace(/\s+/g, " ").trim().slice(0, 60).toLowerCase();
  const page = Math.max(1, Math.min(20, Math.floor(Number(sp.get("page")) || 1)));
  const params = new URLSearchParams({ page: String(page), per_page: "24", locale: "fr_FR", rating: "pg-13" });
  if (q) params.set("q", q);
  const url = `${BASE}/${encodeURIComponent(cle)}/gifs/${q ? "search" : "trending"}?${params}`;

  try {
    const r = await fetch(url, { next: { revalidate: q ? 86400 : 3600 } });
    if (!r.ok) {
      const quota = r.status === 429;
      return NextResponse.json({ erreur: quota ? "Trop de recherches pour l'instant : réessaie dans quelques minutes." : "La banque de GIF ne répond pas. Réessaie dans un instant." }, { status: quota ? 429 : 502 });
    }
    return NextResponse.json(lireKlipy(await r.json()), { headers: { "Cache-Control": "private, max-age=300" } });
  } catch {
    return NextResponse.json({ erreur: "La banque de GIF ne répond pas. Réessaie dans un instant." }, { status: 502 });
  }
}
