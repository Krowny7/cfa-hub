// Les flashcards marquées du joueur (migration_flashcard_flags.sql), avec la
// carte et son paquet, par jointure directe : la RLS de flashcard_flags ne
// rend que ses marques, celle des flashcards (cards_select) que les cartes
// des paquets qu'il peut lire (les paquets officiels sont publics). Lues par
// Moi › Marquées (la plus récente en tête) et par la révision des marquées
// (/flashcards/marquees, dans l'ordre du programme). Table absente
// (migration pas encore collée) : available = false, les marques restent sur
// l'appareil (lib/marques) ; autre échec de lecture (réseau, base
// injoignable) : erreur = true, les marques sont en base mais pas lues cette
// fois. Côté serveur uniquement.
import type { SupabaseClient } from "@supabase/supabase-js";
import { CFA_SUBJECTS, subjectOfTitle } from "@/components/ContentDetailHeader";
import { lieuCarte, numeroPaquet, themePaquet } from "@/lib/flashcards/paquets";
import type { SourceMarqueCarte } from "@/lib/marques";

export type CarteMarquee = {
  cardId: string;
  flaggedAt: string;
  source: SourceMarqueCarte | null;
  front: string;
  back: string;
  position: number | null;
  setId: string;
  /** la matière, d'après le titre du paquet (« Fixed Income — Flashcards 2/4 (…) ») ; null hors programme */
  matiereCle: string | null;
  matiereNom: string | null;
  /** le thème du paquet (« Duration & convexity ») et son numéro (2 pour « Flashcards 2/4 ») */
  theme: string;
  numero: number | null;
  /** l'étiquette de la carte : « Fixed Income · Duration & convexity » */
  lieu: string;
};

export type CartesMarquees = {
  /** faux : la table manque (migration pas encore collée), les marques sont gardées sur l'appareil */
  available: boolean;
  /** la lecture a échoué alors que la table existe : rien à montrer cette fois, sans parler de l'appareil */
  erreur?: boolean;
  items: CarteMarquee[];
};

const SOURCES = new Set<SourceMarqueCarte>(["paquet", "matiere", "marquees", "liste"]);
/** Au-delà, la liste et la boucle deviennent trop lourdes : les plus récentes seulement. */
const MAX_MARQUES = 600;

type Paquet = { id: string; title: string | null };
type Carte = { id: string; front: string; back: string; position: number | null; set_id: string; flashcard_sets: Paquet | Paquet[] | null };
type Ligne = { card_id: string; source: string | null; created_at: string; flashcards: Carte | Carte[] | null };
const un = <T>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? (x[0] ?? null) : (x ?? null));
// la table n'existe pas encore (PostgREST : PGRST205 ; Postgres : 42P01) ; même test que lib/marques, côté client
const tableAbsente = (code?: string) => code === "PGRST205" || code === "42P01";
const ECHEC: CartesMarquees = { available: true, erreur: true, items: [] };

export async function lireCartesMarquees(supabase: SupabaseClient): Promise<CartesMarquees> {
  try {
    const { data, error } = await supabase
      .from("flashcard_flags")
      .select("card_id, source, created_at, flashcards(id, front, back, position, set_id, flashcard_sets(id, title))")
      .order("created_at", { ascending: false })
      .limit(MAX_MARQUES);
    // table absente (migration pas encore collée) : les marques gardées sur l'appareil ; autre échec : à relire plus tard
    if (error) return tableAbsente(error.code) ? { available: false, items: [] } : ECHEC;
    const items: CarteMarquee[] = [];
    for (const l of (data ?? []) as unknown as Ligne[]) {
      const c = un(l.flashcards);
      // carte illisible (paquet devenu privé) : rien à montrer
      if (!c) continue;
      const titre = un(c.flashcard_sets)?.title ?? null;
      const matiere = subjectOfTitle(titre);
      const theme = themePaquet(titre);
      items.push({
        cardId: c.id,
        flaggedAt: l.created_at,
        source: l.source && SOURCES.has(l.source as SourceMarqueCarte) ? (l.source as SourceMarqueCarte) : null,
        front: c.front,
        back: c.back,
        position: c.position,
        setId: c.set_id,
        matiereCle: matiere?.key ?? null,
        matiereNom: matiere?.name ?? null,
        theme,
        numero: numeroPaquet(titre),
        lieu: lieuCarte(matiere?.name, theme),
      });
    }
    return { available: true, items };
  } catch {
    return ECHEC;
  }
}

/**
 * Le nombre de flashcards marquées que la révision montrera (null : table
 * absente ou injoignable) : la même jointure que la lecture (une carte
 * devenue illisible ne compte pas), plafonné comme elle.
 */
export async function compterCartesMarquees(supabase: SupabaseClient): Promise<number | null> {
  try {
    const { count, error } = await supabase.from("flashcard_flags").select("card_id, flashcards!inner(id)", { count: "exact", head: true });
    return error ? null : Math.min(count ?? 0, MAX_MARQUES);
  } catch {
    return null;
  }
}

const RANG_MATIERE = new Map(CFA_SUBJECTS.map((s, i) => [s.key, i]));
const rangMatiere = (c: CarteMarquee) => (c.matiereCle ? (RANG_MATIERE.get(c.matiereCle) ?? 99) : 99);

/** L'ordre du programme : matière, puis paquet (Set 1/4, 2/4…), puis position dans le paquet. */
export function ordreProgramme(items: readonly CarteMarquee[]): CarteMarquee[] {
  return [...items].sort(
    (a, b) =>
      rangMatiere(a) - rangMatiere(b) ||
      (a.numero ?? 99) - (b.numero ?? 99) ||
      a.theme.localeCompare(b.theme, "fr") ||
      a.setId.localeCompare(b.setId) ||
      (a.position ?? 0) - (b.position ?? 0)
  );
}
