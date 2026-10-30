import type { SupabaseClient } from "@supabase/supabase-js";
import { CFA_SUBJECTS, groupBySubject, subjectFromParam } from "@/components/ContentDetailHeader";
import { numeroPaquet, themePaquet } from "@/lib/flashcards/paquets";
import { cartesMaitrisees, type MaitriseCompte, type MatierePartie } from "@/lib/flashcards/partie";
import { cleMatiere, cleSet, lireLigne, type LigneProgression } from "@/lib/flashcards/progression";
import { lireProgressions } from "@/lib/flashcards/progression-serveur";
import { MATIERES_PARTIE } from "@/lib/voice-partie";

// Ce que la page de la partie de cartes (app/flashcards/partie) lit en base :
// les 10 matières avec leurs paquets officiels et les identifiants de leurs
// cartes (pas leur texte : il vient avec la donne, des seules cartes tirées,
// app/api/flashcards/partie), et ce que le compte sait de la maîtrise du
// joueur. Côté serveur uniquement ; les assemblages sont purs (testés).

type Dossier = { name: string | null } | null;
type PaquetLigne = { id: string; title: string; visibility: string | null; library_folders?: Dossier | Dossier[] };
const nomDossier = (f: PaquetLigne["library_folders"]) => (Array.isArray(f) ? f[0] : f)?.name ?? null;

/** Les paquets officiels et leurs cartes (ids, dans l'ordre) → les 10 matières du programme (vides = « bientôt »). */
export function matieresDepuis(paquets: readonly PaquetLigne[], cartes: readonly { id: string; set_id: string; position: number | null }[]): MatierePartie[] {
  const parPaquet = new Map<string, string[]>();
  for (const c of [...cartes].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))) parPaquet.set(c.set_id, [...(parPaquet.get(c.set_id) ?? []), c.id]);
  const groupes = groupBySubject(paquets.map((p) => ({ id: p.id, title: p.title, folder: nomDossier(p.library_folders), visibility: p.visibility })));
  return CFA_SUBJECTS.map((sujet) => {
    const lignes = (groupes.find((g) => g.key === sujet.key)?.rows ?? []).filter((r) => r.kind === "set");
    const voix = MATIERES_PARTIE[sujet.key];
    return {
      cle: sujet.key,
      nom: voix?.nom ?? sujet.short,
      abrege: voix?.abrege ?? sujet.short.slice(0, 4).toUpperCase(),
      paquets: lignes.map((r, i) => ({ id: r.id, matiere: sujet.key, numero: numeroPaquet(r.title) ?? r.order ?? i + 1, theme: themePaquet(r.title), cartes: parPaquet.get(r.id) ?? [] })),
    };
  });
}

/** Lit les paquets officiels publiés et leurs cartes (client admin : les paquets officiels sont publics). */
export async function lireMatieresPartie(admin: SupabaseClient): Promise<MatierePartie[]> {
  const { data: sets } = await admin
    .from("flashcard_sets")
    .select("id,title,visibility,library_folders(name)")
    .eq("is_official", true)
    .eq("official_published", true)
    .limit(200);
  const paquets = (sets ?? []) as unknown as PaquetLigne[];
  // seuls les paquets du programme (« Flashcards n/4 ») ont des cartes à tirer
  const ids = matieresDepuis(paquets, []).flatMap((m) => m.paquets.map((p) => p.id));
  if (!ids.length) return matieresDepuis(paquets, []);
  const { data: cartes } = await admin.from("flashcards").select("id,set_id,position").in("set_id", ids).order("position", { ascending: true }).limit(2000);
  return matieresDepuis(paquets, (cartes ?? []) as { id: string; set_id: string; position: number | null }[]);
}

/**
 * Les boucles du compte → les cartes maîtrisées de chaque boucle, par clé
 * (« set:<id> », « matiere:<clé> »), avec leur version. Une boucle pas encore
 * écrite n'a pas d'entrée. Pur : `lignes` est ce que lireProgressions a rendu.
 */
export function maitriseCompteDepuis(lignes: ReadonlyMap<string, LigneProgression>, matieres: readonly MatierePartie[]): Record<string, MaitriseCompte> {
  const out: Record<string, MaitriseCompte> = {};
  const lire = (cle: string, ids: readonly string[]) => {
    const c = lireLigne(lignes.get(cle), ids);
    if (c) out[cle] = { maj: c.etat.maj ?? c.maj, ids: cartesMaitrisees(c.etat) };
  };
  for (const m of matieres) {
    const toutes = m.paquets.flatMap((p) => p.cartes);
    if (!toutes.length) continue;
    lire(cleMatiere(m.cle), toutes);
    for (const p of m.paquets) if (p.cartes.length) lire(cleSet(p.id), p.cartes);
  }
  return out;
}

/**
 * Ce que le compte sait de la maîtrise du joueur sur ces matières : `actif`
 * faux si la table n'existe pas encore ou si la base ne répond pas (la
 * maîtrise se lit alors sur l'appareil seulement).
 */
export async function lireMaitriseCompte(supabase: SupabaseClient, userId: string, matieres: readonly MatierePartie[]): Promise<{ compte: Record<string, MaitriseCompte>; actif: boolean }> {
  const cles = matieres.flatMap((m) => (m.paquets.some((p) => p.cartes.length) ? [cleMatiere(m.cle), ...m.paquets.filter((p) => p.cartes.length).map((p) => cleSet(p.id))] : []));
  const lignes = await lireProgressions(supabase, userId, cles);
  return lignes ? { compte: maitriseCompteDepuis(lignes, matieres), actif: true } : { compte: {}, actif: false };
}

/** Les matières demandées par l'adresse (?matiere=fsa, ou ?subject= de la liste des flashcards) : leurs clés du programme, sans doublon. */
export function matieresDemandees(...brut: (string | string[] | null | undefined)[]): string[] {
  const cles = brut
    .flatMap((x) => (Array.isArray(x) ? x : (x ?? "").split(",")))
    .map((x) => subjectFromParam(x.trim())?.key)
    .filter((k): k is string => !!k);
  return [...new Set(cles)];
}
