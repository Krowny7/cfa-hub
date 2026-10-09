// « Tes points faibles » (Moi › Stats, S'entraîner) : les notions d'un joueur
// et leurs mesures, puis le classement (lib/points-faibles.ts). Étape 1 : une
// notion est un thème, construit à partir de deux lectures :
// - ses réponses rangées par matière et thème (lib/answer-stats, déjà chargé
//   par la page), pour la réussite récente ;
// - ses ratures comptées par thème (ratures_par_theme,
//   migration_points_faibles.sql). Fonction absente : la réussite récente
//   seule, sans « Mettre au propre ce thème ».
// - les QCM de la banque, par matière et repère R (lireBanqueQcm).
// Une page de fiche et sa réserve (« Réserve — … Page N ») font un seul
// thème ; un QCM recréé garde son thème (même repère R) et mène au QCM
// courant, même si le joueur n'a répondu qu'à l'ancien ; une page de fiche
// recréée mène toujours à sa page. Les mocks officiels et les regroupements
// sans détail restent au niveau de la matière, comme les thèmes qui ne
// mènent plus nulle part (anciennes numérotations, sans QCM ni page dans la
// banque) : rien à y refaire.
// À l'étape 2, seule la fonction `cleDe` et le libellé changent : la notion
// devient le Learning Module.
// Côté serveur seulement : importe le catalogue des calculs (avec réponses).
import type { SupabaseClient } from "@supabase/supabase-js";
import { SOURCE_LABELS, placeSet, type AnswerSource, type AnswerStats, type ThemeKind } from "@/lib/answer-stats";
import { SUBJECTS } from "@/components/reviser/catalog";
import { calcSubject, calcType } from "@/lib/calc";
import type { CalcTopic } from "@/lib/calc/types";
import { pointsFaibles, recentDe, type Lien, type Notion, type PointsFaiblesData, type SeanceDatee } from "@/lib/points-faibles";
import { POINTS_FAIBLES } from "@/lib/voice-points-faibles";

/** Une ligne de ratures_par_theme. */
export type RaturesTheme = {
  setId: string | null;
  setTitle: string | null;
  folderName: string | null;
  enCours: number;
  vives: number;
  anciennes: number;
  rayees7j: number;
  derniere: string | null;
};

/** disponible : false tant que migration_points_faibles.sql manque (ni ratures par thème, ni reprise ciblée). */
export type RaturesParTheme = { disponible: boolean; lignes: RaturesTheme[] };

export const SANS_RATURES_PAR_THEME: RaturesParTheme = { disponible: false, lignes: [] };

type Brut = { set_id: string | null; set_title: string | null; folder_name: string | null; en_cours: number; vives: number; anciennes: number; rayees_7j: number; derniere: string | null };

/** Les QCM de la banque par notion (« qcm:fixed_income:R59–R61 » → ses sets) : un QCM recréé sous un autre id se retrouve par son repère. */
export type BanqueQcm = Map<string, string[]>;

type SetBanque = { id: string; title: string | null; library_folders: { name: string | null } | { name: string | null }[] | null };

/** Les QCM des dossiers « (Système) ». Toute erreur : une banque vide (les thèmes gardent alors les sets du joueur). */
export async function lireBanqueQcm(reader: SupabaseClient): Promise<BanqueQcm> {
  const banque: BanqueQcm = new Map();
  try {
    const { data, error } = await reader.from("quiz_sets").select("id,title,library_folders(name)").like("title", "% — QCM (%");
    if (error || !Array.isArray(data)) return banque;
    for (const s of data as unknown as SetBanque[]) {
      const dossier = (Array.isArray(s.library_folders) ? s.library_folders[0]?.name : s.library_folders?.name) ?? null;
      if (!dossier?.endsWith(" (Système)")) continue;
      const place = placeSet(s.id, s.title, dossier);
      const cle = place.kind === "qcm" ? cleDe(place.subject, place.kind, place.tag, s.id, null) : null;
      if (cle) banque.set(cle, [...(banque.get(cle) ?? []), s.id]);
    }
  } catch {
    banque.clear();
  }
  return banque;
}

/** Les ratures du joueur connecté, par thème. Toute erreur (fonction absente comprise) : indisponible, sans bruit. */
export async function lireRaturesParTheme(supabase: SupabaseClient): Promise<RaturesParTheme> {
  try {
    const { data, error } = await supabase.rpc("ratures_par_theme");
    if (error || !Array.isArray(data)) return SANS_RATURES_PAR_THEME;
    return {
      disponible: true,
      lignes: (data as Brut[]).map((l) => ({
        setId: l.set_id,
        setTitle: l.set_title,
        folderName: l.folder_name,
        enCours: Number(l.en_cours) || 0,
        vives: Number(l.vives) || 0,
        anciennes: Number(l.anciennes) || 0,
        rayees7j: Number(l.rayees_7j) || 0,
        derniere: l.derniere,
      })),
    };
  } catch {
    return SANS_RATURES_PAR_THEME;
  }
}

const MATIERES = new Map(SUBJECTS.map((s) => [s.key, s]));
const page = (tag: string | null) => {
  const m = /^p\. ([0-9]+)$/.exec(tag ?? "");
  return m ? Number(m[1]) : null;
};

/**
 * La clé de la notion d'un thème (null : hors notion). Page de fiche :
 * matière et page ; QCM : matière et repère R ; calcul : matière et type ;
 * autre set : le set.
 */
function cleDe(matiere: string, kind: ThemeKind, tag: string | null, setId: string | null, calcKey: string | null): string | null {
  if (!MATIERES.has(matiere) || kind === "mock") return null;
  if (kind === "calc") return calcKey ? `calc:${matiere}:${calcKey}` : null;
  if (kind === "fiche" && page(tag) !== null) return `fiche:${matiere}:${page(tag)}`;
  if (kind === "qcm" && tag) return `qcm:${matiere}:${tag}`;
  return setId ? `set:${setId}` : null;
}

type Acc = {
  cle: string;
  libelle: string;
  matiere: string;
  repere: string | null;
  kind: ThemeKind;
  calcKey: string | null;
  sets: Set<string>;
  seances: Map<string, SeanceDatee>;
  sources: Map<AnswerSource, number>;
  enCours: number;
  vives: number;
  anciennes: number;
  rayees7j: number;
  aRepasser: number;
  derniere: string | null;
};

const plusTard = (a: string | null, b: string | null) => (!a ? b : !b ? a : a > b ? a : b);

function liensDe(a: Acc): Lien[] {
  const sujet = MATIERES.get(a.matiere);
  if (a.kind === "calc" && a.calcKey) {
    const s = calcSubject(a.matiere as CalcTopic);
    return s ? [{ nature: "calcul", href: `/calculs/${s.slug}/${a.calcKey}`, libelle: POINTS_FAIBLES.lienCalcul }] : [];
  }
  const p = page(a.repere);
  if (a.kind === "fiche" && p !== null && sujet?.fiche) return [{ nature: "fiche", href: `/fiches/${sujet.fiche}?page=${p}`, libelle: POINTS_FAIBLES.lienFiche(p) }];
  const set = [...a.sets][0];
  return set ? [{ nature: "qcm", href: `/qcm/${set}`, libelle: POINTS_FAIBLES.lienQcm }] : [];
}

/** Les notions d'un joueur (étape 1 : ses thèmes) et leur classement. */
export function construirePointsFaibles(stats: AnswerStats, ratures: RaturesParTheme, banque: BanqueQcm, now: number): PointsFaiblesData {
  const acc = new Map<string, Acc>();
  const ouvrir = (cle: string, init: Omit<Acc, "cle" | "sets" | "seances" | "sources" | "enCours" | "vives" | "anciennes" | "rayees7j" | "aRepasser" | "derniere">) => {
    let a = acc.get(cle);
    if (!a) {
      a = { cle, ...init, sets: new Set(), seances: new Map(), sources: new Map(), enCours: 0, vives: 0, anciennes: 0, rayees7j: 0, aRepasser: 0, derniere: null };
      acc.set(cle, a);
    }
    return a;
  };

  // 1. les réponses, thème par thème
  for (const s of stats.subjects) {
    if (s.pseudo) continue;
    for (const th of s.themes) {
      const kind = th.kind ?? "autre";
      const setId = th.key.startsWith("set:") ? th.key.slice(4) : null;
      const calcKey = th.key.startsWith("calc:") ? th.key.slice(5) : null;
      if (!setId && !calcKey) continue;
      const cle = cleDe(s.key, kind, th.tag, setId, calcKey);
      if (!cle) continue;
      const a = ouvrir(cle, { libelle: th.label, matiere: s.key, repere: th.tag, kind, calcKey });
      // un set supprimé depuis garde ses réponses, pas son lien
      if (setId && !th.retired) a.sets.add(setId);
      for (const p of th.passages) {
        // un même passage peut toucher deux sets d'une notion (page et réserve) : on additionne
        const v = a.seances.get(p.id) ?? { n: 0, ok: 0, at: p.at };
        v.n += p.n;
        v.ok += p.ok;
        a.seances.set(p.id, v);
        a.derniere = plusTard(a.derniere, p.at || null);
      }
      for (const [src, t] of Object.entries(th.by) as [AnswerSource, [number, number]][]) a.sources.set(src, (a.sources.get(src) ?? 0) + t[0]);
    }
  }

  // 2. les ratures, thème par thème (set courant, sinon titre gardé)
  for (const r of ratures.lignes) {
    const place = placeSet(r.setId ?? "", r.setTitle, r.folderName);
    const cle = cleDe(place.subject, place.kind, place.tag, r.setId, null);
    if (!cle) continue;
    const a = ouvrir(cle, { libelle: place.label, matiere: place.subject, repere: place.tag, kind: place.kind, calcKey: null });
    a.enCours += r.enCours;
    a.vives += r.vives;
    a.anciennes += r.anciennes;
    a.rayees7j += r.rayees7j;
    if (r.setId) {
      a.sets.add(r.setId);
      a.aRepasser += r.enCours;
    }
    a.derniere = plusTard(a.derniere, r.derniere);
  }

  // 3. un QCM recréé (nouvel id) : le set courant de même matière et même repère
  for (const a of acc.values()) for (const id of banque.get(a.cle) ?? []) a.sets.add(id);

  // un thème qui ne mène plus nulle part (ni QCM, ni page de fiche, ni calcul) reste au niveau de la matière
  const notions: Notion[] = [...acc.values()].flatMap((a) => {
    const liens = liensDe(a);
    if (!liens.length) return [];
    const recent = recentDe([...a.seances.values()], now);
    const calcul = a.kind === "calc";
    const nomCalcul = calcul && a.calcKey ? calcType(a.matiere as CalcTopic, a.calcKey)?.name : null;
    return [{
      cle: a.cle,
      libelle: nomCalcul ? POINTS_FAIBLES.calcul(nomCalcul) : a.libelle,
      matiere: a.matiere,
      matiereNom: MATIERES.get(a.matiere)?.name ?? a.matiere,
      repere: a.repere,
      calcul,
      liens,
      sets: [...a.sets].sort(),
      sources: [...a.sources.entries()].filter(([, n]) => n > 0).sort((x, y) => y[1] - x[1]).map(([src, n]) => ({ libelle: SOURCE_LABELS[src], n })),
      mesures: { n: recent.n, ok: recent.ok, enCours: a.enCours, vives: a.vives, anciennes: a.anciennes, rayees7j: a.rayees7j, aRepasser: a.aRepasser, derniere: a.derniere },
    }];
  });

  // rayées cette semaine : tout le carnet (mocks et thèmes retirés compris), le même compte que Moi › Erreurs
  const rayeesSemaine = ratures.lignes.reduce((s, r) => s + r.rayees7j, 0);
  return { ...pointsFaibles(notions, ratures.disponible), propre: ratures.disponible, rayeesSemaine };
}
