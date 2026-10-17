// Données d'exemple du Codex pour les aperçus (app/preview-da/codex, sans
// appel à Supabase) et pour scripts/codex/test-ecran.ts : on fait tourner le
// vrai moteur sur un historique inventé. Scénarios :
//   neuf   : compte du jour même, rien de fait, presque rien de dévoilé
//   milieu : quelques semaines de travail, plusieurs actes avancés
//   fin    : proche du jour J, beaucoup de choses faites
// `seance` : la séance du jour d'exemple, à l'étape voulue (proposée, en
// cours, tenue avec ce qu'elle a fait avancer, close). `jourJ` : un autre jour
// J (le calendrier, V3 §7 : veillée, malle, jour J, lendemain) ; `malle` : les
// cases cochées de la malle.
import { contenuDuProgramme } from "@/lib/codex/catalogue";
import { maitriseDuCodex } from "@/lib/codex/cap";
import {
  LECTURE_VIDE, budgetDuJour, contexteDestination, evaluer, indexerLecture, joursAvantExamen, planifier, recommander, tirerContrats,
  type Demande, type Entree, type LectureSql, type LigneProgression, type Resultat, type ResultatCompteur,
} from "@/lib/codex/moteur";
import { CFA_L1 } from "@/lib/codex/programmes/cfa-l1";
import { composerSeance, instantaneSeance, revoirCodexDe, type EtapeSeance, type VueSeance } from "@/lib/codex/seance";
import { construireVue, type VueCodex } from "@/lib/codex/vue";
import { CAPACITES_VIDE } from "@/lib/codex/reglage";
import type { Budget } from "@/lib/codex/types";

export type Scenario = "neuf" | "milieu" | "fin";

const contenu = contenuDuProgramme();
const JOUR = "2026-10-16";
const NOW = new Date("2026-10-16T14:00:00+02:00");

function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

/**
 * `budget`, `ecartees` : le réglage du jour (« J'ai 30 min », « Une autre idée ? ») ;
 * `unique` : la maîtrise unique et la file « À revoir » lues (codex_mesures_v3 et le SQL du couloir B collés).
 */
export function exempleCodex(sc: Scenario, opts: { devoile?: string[] | "tout"; budget?: Budget; ecartees?: string[]; unique?: boolean; seance?: EtapeSeance; jourJ?: string | null; malle?: string[] } = {}): VueCodex {
  const fin = sc === "fin";
  const neuf = sc === "neuf";
  const e: Entree = {
    contenu, now: NOW, jour: JOUR, jourJ: opts.jourJ !== undefined ? opts.jourJ : neuf ? null : fin ? "2026-11-20" : "2027-02-20", objectif: neuf ? null : { total: 6000, depuis: "2026-09-01" }, visiteVue: !neuf,
    progression: [], contrats: [], premier: false, dernierCalcul: new Date("2026-10-15T10:00:00Z"), lecture: LECTURE_VIDE,
    pointsFaibles: [{ notion: "Duration", score: 31 }, { notion: "Hypothesis testing", score: 40 }],
    budget: opts.budget ?? null, ecartees: opts.ecartees ?? [], malleCoches: opts.malle?.length ?? 0,
    // le fil rouge : « à venir » au milieu (la base ne sait pas encore l'écrire), tamponnable à la fin
    ...(fin ? { capacites: { ...CAPACITES_VIDE, fil: true } } : {}),
  };
  const maitrise = Object.fromEntries(contenu.map((m, i) => [m.key, { pct: neuf ? 0 : fin ? 58 + ((i * 7) % 28) : 28 + ((i * 11) % 45), questions: neuf ? 0 : fin ? 220 : 40 + i * 12, debut: neuf ? null : 30 + (i % 4) * 8 }]));
  // la maîtrise unique : la fenêtre de 60 réponses, provisoire de 10 à 39, la dernière réponse il y a 0 à 14 jours
  const unique = opts.unique && !neuf
    ? {
        maitrise_unique: Object.fromEntries(contenu.map((m, i) => {
          const n = Math.min(60, fin ? 60 : 8 + i * 6);
          const statut = n >= 40 ? ("mesuree" as const) : n >= 10 ? ("provisoire" as const) : ("non_mesuree" as const);
          return [m.key, { pct: statut === "non_mesuree" ? null : maitrise[m.key].pct + 4, questions: n, total: n * 3, debut: null, statut, derniere: `2026-10-${String(16 - ((i * 5) % 15)).padStart(2, "0")}T09:00:00Z`, ancienne: maitrise[m.key].pct }];
        })),
        revoir: { aujourdhui: fin ? 18 : 12, demain: fin ? 22 : 9, ratures: 7, rappels: fin ? 11 : 5 },
      }
    : {};
  const lecture0: LectureSql = {
    compteurs: {}, speciaux: {},
    mesures: {
      ...unique,
      xp_total: neuf ? 0 : fin ? 9200 : 3100, maitrise, ratures_ouvertes: { total: neuf ? 0 : 14, matieres: {} }, serie: neuf ? 0 : 4, meilleure_serie: neuf ? 0 : 9, elo: neuf ? null : 1180,
      jours_encre_total: neuf ? 0 : fin ? 64 : 21, maitres_total: fin ? 1 : 0, programmes_menes: 0,
      trophees: neuf ? [] : fin ? [{ source: "ciblee", palier: 3, n: 3 }, { source: "ciblee", palier: 4, n: 1 }] : [{ source: "ciblee", palier: 2, n: 2 }],
      inscrit_le: neuf ? "2026-10-16T13:20:00+02:00" : "2026-08-12T09:00:00+02:00", jours: neuf ? [] : Array.from({ length: fin ? 40 : 18 }, (_, i) => ({ jour: `2026-09-${String((i % 28) + 1).padStart(2, "0")}`, n: 12 + (i % 5) })),
    },
  };
  const reponse = (d: Demande): number => {
    if (neuf) return 0;
    const h = hash(d.id) % 100;
    if (d.evenement === "question_repondue") return fin ? 400 : d.filtre && Object.keys(d.filtre).length ? 40 + (h % 30) : 330;
    if (d.fenetre === "jour") return d.seuil > 1 ? Math.floor(d.seuil * 0.4) : 0;
    if (fin) return h < 78 ? d.seuil : Math.max(0, Math.floor(d.seuil * 0.55));
    return h < 38 ? d.seuil : h < 70 ? Math.max(1, Math.floor(d.seuil * ((h % 7) / 10 + 0.15))) : 0;
  };
  const demandes0 = planifier({ ...e, lecture: lecture0 });
  const brut = (lecture: LectureSql, demandes: Demande[]): LectureSql => ({
    ...lecture,
    compteurs: Object.fromEntries(demandes.map((d): [string, ResultatCompteur] => [d.id, { n: reponse(d), atteint: reponse(d) >= d.seuil ? "2026-09-20T10:00:00+00:00" : null }])),
  });
  let lecture = brut(lecture0, demandes0);
  e.contrats = neuf ? [] : tirerContrats({ ...e, lecture }, "exemple");
  e.progression = [];
  const demandes = planifier({ ...e, lecture });
  lecture = brut(lecture0, demandes);
  e.lecture = lecture;
  const compteurs = indexerLecture(demandes, lecture);
  let r = evaluer(e, compteurs);
  // quelques lignes « à fêter » pour voir la fanfare
  if (!neuf) {
    const faites = r.etats.filter((s) => s.fait && s.quete.famille !== "contrat").slice(0, 2);
    e.progression = faites.map((s): LigneProgression => ({ quete_id: s.quete.id, periode: s.periode, etat: "recompensee", progression: 1, cible: 1, ouverte_le: NOW.toISOString(), terminee_le: NOW.toISOString(), recompensee_le: NOW.toISOString(), retro: false, xp: s.quete.recompense.xp, cosmetique: null, titre: null, vu: false }));
  }
  if (e.progression.length) r = evaluer(e, compteurs);
  const reco = recommander(e, r);
  const vue = construireVue(e, r, reco, { devoile: { devoile: opts.devoile ?? (neuf ? [] : "tout"), jours: [JOUR], nouveaux: [], change: false }, malle: opts.malle });
  return opts.seance ? { ...vue, seance: seanceExemple(e, r, vue, opts.seance) } : vue;
}

/** La séance du jour d'exemple, composée comme le serveur la compose (lib/codex/serveur.ts), à l'étape voulue. */
function seanceExemple(e: Entree, r: Resultat, vue: VueCodex, etape: EtapeSeance): VueSeance | null {
  const dest = contexteDestination(e, r);
  const budget = budgetDuJour(e);
  const s = composerSeance({
    jour: JOUR, phase: r.phase, joursAvant: joursAvantExamen(JOUR, e.jourJ), budget,
    maitrise: maitriseDuCodex(contenu, e.lecture.mesures), revoir: revoirCodexDe(e.lecture.mesures) ?? { aujourdhui: 14, demain: 9, ratures: 9, rappels: 5, complet: true },
    cinqFait: false, trenteFait: false, trenteDispo: true, questionsTotal: (e.lecture.mesures.jours ?? []).reduce((n, j) => n + j.n, 0) || 2400,
    notionsNonVues: contenu.map((m) => ({ matiere: m.key, n: dest.notionsNonVues[m.key] ?? 0, total: m.notions })),
    contrats: vue.contrats, def: CFA_L1, ecartes: [], dest,
  });
  if (!s.blocs.length) return null;
  const lanceeLe = etape === "proposee" ? null : new Date(NOW.getTime() - 50 * 60_000).toISOString();
  const faits = etape === "proposee" ? [] : etape === "enCours" ? [s.blocs[0].genre] : s.blocs.map((b) => b.genre);
  // « avant » : un peu moins qu'aujourd'hui, pour que la séance ait fait avancer quelque chose
  const ici = instantaneSeance(vue);
  const avant = lanceeLe
    ? {
        maitrise: Object.fromEntries(Object.entries(ici.maitrise).map(([k, v], i) => [k, i < 2 ? Math.max(0, v - 4 + i) : v])),
        revoir: ici.revoir === null ? null : ici.revoir + 7,
        quetes: Object.fromEntries(Object.entries(ici.quetes).map(([k, v]) => [k, Math.max(0, Math.round((v - 0.3) * 100) / 100)])),
      }
    : null;
  const finieLe = etape === "close" ? NOW.toISOString() : null;
  return { ...s, faits, lancee: !!lanceeLe, lanceeLe, finie: etape === "tenue" || etape === "close", finieLe, gardee: true, avant };
}
