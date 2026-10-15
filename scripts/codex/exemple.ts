// Données d'exemple du Codex pour les aperçus (app/preview-da/codex, sans
// appel à Supabase) et pour scripts/codex/test-ecran.ts : on fait tourner le
// vrai moteur sur un historique inventé. Scénarios :
//   neuf   : compte du jour même, rien de fait, presque rien de dévoilé
//   milieu : quelques semaines de travail, plusieurs actes avancés
//   fin    : proche du jour J, beaucoup de choses faites
import { contenuDuProgramme } from "@/lib/codex/catalogue";
import {
  LECTURE_VIDE, evaluer, indexerLecture, planifier, recommander, tirerContrats,
  type Demande, type Entree, type LectureSql, type LigneProgression, type ResultatCompteur,
} from "@/lib/codex/moteur";
import { construireVue, type VueCodex } from "@/lib/codex/vue";

export type Scenario = "neuf" | "milieu" | "fin";

const contenu = contenuDuProgramme();
const JOUR = "2026-10-16";
const NOW = new Date("2026-10-16T14:00:00+02:00");

function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function exempleCodex(sc: Scenario, opts: { devoile?: string[] | "tout" } = {}): VueCodex {
  const fin = sc === "fin";
  const neuf = sc === "neuf";
  const e: Entree = {
    contenu, now: NOW, jour: JOUR, jourJ: neuf ? null : fin ? "2026-11-20" : "2027-02-20", objectif: neuf ? null : { total: 6000, depuis: "2026-09-01" }, visiteVue: !neuf,
    progression: [], contrats: [], premier: false, dernierCalcul: new Date("2026-10-15T10:00:00Z"), lecture: LECTURE_VIDE,
    pointsFaibles: [{ notion: "Duration", score: 31 }, { notion: "Hypothesis testing", score: 40 }],
  };
  const maitrise = Object.fromEntries(contenu.map((m, i) => [m.key, { pct: neuf ? 0 : fin ? 58 + ((i * 7) % 28) : 28 + ((i * 11) % 45), questions: neuf ? 0 : fin ? 220 : 40 + i * 12, debut: neuf ? null : 30 + (i % 4) * 8 }]));
  const lecture0: LectureSql = {
    compteurs: {}, speciaux: {},
    mesures: {
      xp_total: neuf ? 0 : fin ? 9200 : 3100, maitrise, ratures_ouvertes: { total: neuf ? 0 : 14, matieres: {} }, serie: neuf ? 0 : 4, meilleure_serie: neuf ? 0 : 9, elo: neuf ? null : 1180,
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
  return construireVue(e, r, reco, { devoile: { devoile: opts.devoile ?? (neuf ? [] : "tout"), jours: [JOUR], nouveaux: [], change: false } });
}
