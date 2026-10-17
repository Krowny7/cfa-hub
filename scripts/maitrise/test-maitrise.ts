// Tests légers de la maîtrise unique côté site (lib/maitrise.ts, lib/mastery.ts ;
// migration_v3_profil.sql §4), sans base ni réseau :
//   npx tsx --tsconfig tsconfig.json scripts/maitrise/test-maitrise.ts
// Vérifie : les zones, les statuts aux frontières 9/10/39/40, preparationDe,
// couvertureDe, fuites, gainPreparation ; la lecture de maitrise_joueur
// (matières complétées, bornes, réponse illisible) ; le repli sur l'ancienne
// mesure (sans clé de service, fonction absente, erreur) ; programMastery lit
// `ancienne` seule ; 5 profils fictifs : le rang (rankFor) identique avant et
// après la bascule, avec la section comme sans elle ; une seule exécution de
// maitrise_joueur par requête (TopBar puis page) et par joueur pendant 60 s ;
// l'affichage (« ≈ 52 % », l'infobulle, les rangées de matières) ; les sceaux
// de matière (mesurée seulement, palier gardé jamais repris).
// Le client admin est un vrai client supabase-js dont fetch est remplacé :
// toute requête autre que maitrise_joueur sur l'adresse factice échoue.
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MAITRISE,
  couvertureDe,
  fuites,
  gainPreparation,
  infobulleMaitrise,
  libellePct,
  lireAncienne,
  lireMaitrise,
  maitriseAncienne,
  maitriseDepuis,
  preparationDe,
  statutDe,
  zoneDe,
  ancienneRegle,
  type LigneAncienne,
} from "@/lib/maitrise";
import { getMaitrise, getTopicMastery, getTopicMasteryAncienne, programMastery, type TopicMastery } from "@/lib/mastery";
import { rankFor } from "@/lib/ranks";
import { TOPICS } from "@/lib/practiceTopics";
import { subjectRail } from "@/components/reviser/rail";
import { defSceau, etatSceau, type BaseSceaux } from "@/lib/profil/sceaux";
import { STATS_VIDES, type ProfilStats } from "@/lib/profil/catalogue";

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const J = JSON.stringify;
const NB = String.fromCharCode(160);

// ── le faux réseau : seule maitrise_joueur répond, joueur par joueur ─────
const ADRESSE = "http://banc.invalid";
process.env.NEXT_PUBLIC_SUPABASE_URL = ADRESSE;
process.env.SUPABASE_SERVICE_ROLE_KEY = "cle-du-banc";
const REPONSES = new Map<string, unknown>();
let appels = 0;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (!url.startsWith(`${ADRESSE}/rest/v1/rpc/maitrise_joueur`)) throw new Error(`réseau interdit dans ce test : ${url}`);
  appels++;
  const corps = JSON.parse(String(init?.body ?? "{}")) as { p_user?: string };
  const data = REPONSES.get(corps.p_user ?? "");
  const json = (x: unknown, status: number) => new Response(JSON.stringify(x), { status, headers: { "content-type": "application/json" } });
  return data === undefined ? json({ code: "PGRST202", message: "Could not find the function public.maitrise_joueur(p_user) in the schema cache" }, 404) : json(data, 200);
}) as typeof fetch;

/** Un faux client de session : practice_session_results seulement (l'ancienne mesure). */
function session(rows: LigneAncienne[]) {
  let lectures = 0;
  const client = {
    from(table: string) {
      if (table !== "practice_session_results") throw new Error(`table inattendue : ${table}`);
      lectures++;
      const chaine = { select: () => chaine, eq: () => chaine, order: () => chaine, limit: async () => ({ data: rows, error: null }), range: async (de: number, a: number) => ({ data: rows.slice(de, a + 1), error: null }) };
      return chaine;
    },
  };
  return { client: client as unknown as SupabaseClient, lectures: () => lectures };
}

/** Un faux client admin : rpc maitrise_joueur rend `reponse` (ou lance). */
function adminFactice(reponse: { data: unknown; error: unknown } | "lance") {
  let rpc = 0;
  const client = {
    async rpc(nom: string) {
      rpc++;
      if (nom !== "maitrise_joueur") throw new Error(`rpc inattendue : ${nom}`);
      if (reponse === "lance") throw new Error("réseau coupé");
      return reponse;
    },
  };
  return { client: client as unknown as SupabaseClient, rpc: () => rpc };
}

// ── zones, statuts ───────────────────────────────────────────────────────
check("zoneDe : null, 49 basse, 50 et 69 moyenne, 70 haute", J([zoneDe(null), zoneDe(49), zoneDe(50), zoneDe(69), zoneDe(70)]) === J([null, "basse", "moyenne", "moyenne", "haute"]));
check("statutDe : 9 non mesurée, 10 et 39 provisoire, 40 mesurée", J([statutDe(9), statutDe(10), statutDe(39), statutDe(40)]) === J(["non_mesuree", "provisoire", "provisoire", "mesuree"]));
check("constantes identiques au SQL (60, 10, 40, 2, 0,5, 24 h, 40)", MAITRISE.FENETRE === 60 && MAITRISE.SEUIL_PROVISOIRE === 10 && MAITRISE.SEUIL_MESURE === 40 && MAITRISE.POIDS_PREMIERE === 2 && MAITRISE.POIDS_RAPPROCHEE === 0.5 && MAITRISE.RAPPROCHEE_H === 24 && MAITRISE.DEBUT === 40);

// ── maitriseDepuis ───────────────────────────────────────────────────────
const brut = {
  v: 1,
  matieres: {
    fsa: { pct: 40, n: 60, total: 130, statut: "mesuree", derniere: "2026-10-15T08:00:00Z", debut: 31, ancienne: 44 },
    equity: { pct: "50", n: "45", total: 45, statut: "mesuree", derniere: null, debut: 48, ancienne: null },
    ethics: { pct: 80, n: 40, total: 40, statut: "mesuree", derniere: null, debut: 80, ancienne: 75 },
    quant: { pct: 52, n: 23, total: 23, statut: "provisoire", derniere: null, debut: null, ancienne: null },
    economics: { pct: 90, n: 9, total: 9, statut: "non_mesuree", derniere: null, debut: null, ancienne: 140 },
    inconnue: { pct: 99, n: 60 },
  },
};
const m = maitriseDepuis(brut)!;
const par = (cle: string) => m.matieres.find((x) => x.cle === cle)!;
check("maitriseDepuis : les 10 matières du programme, dans l'ordre officiel (matière inconnue écartée)", J(m.matieres.map((x) => x.cle)) === J(TOPICS.map((t) => t.key)) && m.source === "unique");
check("maitriseDepuis : une matière absente est « non mesurée » (pct null, n 0)", par("portfolio").statut === "non_mesuree" && par("portfolio").pct === null && par("portfolio").n === 0 && par("portfolio").ancienne === null);
check("maitriseDepuis : nombres lus aussi en texte (equity 50 %, 45 réponses : mesurée)", par("equity").pct === 50 && par("equity").statut === "mesuree" && par("equity").zone === "moyenne");
check("maitriseDepuis : provisoire (quant, 23 réponses), noms et poids du programme", par("quant").statut === "provisoire" && par("quant").court === "Quant" && par("quant").poids === 7.5 && par("fsa").court === "FSA");
check("maitriseDepuis : sous 10 réponses, pas de pct même rendu ; ancienne bornée à 100", par("economics").pct === null && par("economics").statut === "non_mesuree" && par("economics").ancienne === 100);
check("maitriseDepuis : derniere, debut, ancienne et total gardés", par("fsa").derniere === "2026-10-15T08:00:00Z" && par("fsa").debut === 31 && par("fsa").ancienne === 44 && par("fsa").total === 130);
check("maitriseDepuis : réponse illisible → null (le lecteur se replie)", [null, undefined, [], "x", {}, { matieres: [] }, { matieres: null }].every((x) => maitriseDepuis(x) === null));

// ── préparation, couverture, fuites ─────────────────────────────────────
// Σ poids = 102,5 ; fsa 40, equity 50, ethics 80, quant 52 (provisoire), le reste à 0
check("preparationDe : Σ poids × (pct ?? 0) / Σ poids, arrondi (2 915 / 102,5 = 28)", m.preparation === 28 && preparationDe(m.matieres) === 28, String(m.preparation));
check("preparationDe : liste vide → 0", preparationDe([]) === 0);
check("couverture : part du poids mesurée (fsa, equity, ethics : 42,5 / 102,5 = 41 %)", m.couverture === 41 && couvertureDe(m.matieres) === 41, String(m.couverture));
const f = fuites(m.matieres);
check("fuites : les 3 plus grosses, au dixième (Fixed Income −8,5, Portfolio −6,8, Alternatives −5,8)",
  J(f) === J([{ cle: "fixed_income", court: "Fixed Income", points: 8.5 }, { cle: "portfolio", court: "Portfolio", points: 6.8 }, { cle: "alternatives", court: "Alternatives", points: 5.8 }]), J(f));
check("fuites : une matière au-dessus du repère ne fuit pas (ethics à 80 %)", !fuites(m.matieres, 10).some((x) => x.cle === "ethics") && fuites(m.matieres, 10).length === 9);
check("gainPreparation : (poids / Σ poids) × max(0, seuil − pct), au dixième", gainPreparation(par("fsa"), 70, m.matieres) === 3.7 && gainPreparation(par("ethics"), 90, m.matieres) === 1.7 && gainPreparation(par("ethics"), 70, m.matieres) === 0);

const main = async () => {
  // ── l'ancienne règle et le repli ─────────────────────────────────────────
  const lignes: LigneAncienne[] = [
    { topics: ["fsa"], score: 29, total: 40 },
    { topics: ["fsa", "equity"], score: 30, total: 30 },
    { topics: ["equity"], score: 2, total: 4 },
    { topics: ["quant"], score: 5, total: 5 },
    { topics: ["ethics"], score: 29, total: 38 },
    { topics: ["ethics"], score: 1, total: 1 },
  ];
  const anc = ancienneRegle(lignes);
  const a = (cle: string) => anc.find((x) => x.cle === cle)!;
  check("ancienneRegle : mono-thème, 5 questions au moins, Math.round (29/40 → 73)", a("fsa").pct === 73 && a("fsa").questions === 40 && a("equity").pct === null && a("equity").questions === 4 && a("quant").pct === 100 && a("ethics").pct === 77 && a("ethics").questions === 39, J(anc));
  const repli = maitriseAncienne(anc);
  const r = (cle: string) => repli.matieres.find((x) => x.cle === cle)!;
  check("repli : 4 questions non mesurée, 5 et 39 provisoire, 40 mesurée ; ancienne = pct", r("equity").statut === "non_mesuree" && r("quant").statut === "provisoire" && r("ethics").statut === "provisoire" && r("fsa").statut === "mesuree" && r("fsa").ancienne === 73 && repli.source === "ancienne");

  const s1 = session(lignes);
  const ad1 = adminFactice({ data: brut, error: null });
  const lu1 = await lireMaitrise(ad1.client, s1.client, "u");
  check("lireMaitrise : maitrise_joueur lue par le client admin, la session n'est pas lue", lu1.source === "unique" && ad1.rpc() === 1 && s1.lectures() === 0);
  const s2 = session(lignes);
  const lu2 = await lireMaitrise(adminFactice({ data: null, error: { code: "PGRST202", message: "Could not find the function" } }).client, s2.client, "u");
  check("lireMaitrise : fonction absente → l'ancienne mesure, lue par la session", lu2.source === "ancienne" && s2.lectures() === 1 && lu2.matieres.find((x) => x.cle === "fsa")?.pct === 73);
  const lu3 = await lireMaitrise(null, session(lignes).client, "u");
  const lu4 = await lireMaitrise(adminFactice("lance").client, session(lignes).client, "u");
  const lu5 = await lireMaitrise(adminFactice({ data: { v: 1 }, error: null }).client, session(lignes).client, "u");
  check("lireMaitrise : sans clé de service, erreur ou réponse illisible → l'ancienne mesure, sans lancer", [lu3, lu4, lu5].every((x) => x.source === "ancienne"));
  // plus de 500 séances : toutes comptent (comme maitrise_joueur et le classement), lues par pages
  const beaucoup: LigneAncienne[] = [
    ...Array.from({ length: 600 }, () => ({ topics: ["fsa"], score: 5, total: 10 })),
    ...Array.from({ length: 1900 }, () => ({ topics: ["fsa"], score: 10, total: 10 })),
  ];
  const s6 = session(beaucoup);
  const lu6 = await lireAncienne(s6.client, "u");
  check("lireAncienne : 2 500 séances, toutes lues (3 pages) : FSA (3 000 + 19 000) / 25 000 = 88 %", lu6.find((x) => x.cle === "fsa")?.pct === 88 && lu6.find((x) => x.cle === "fsa")?.questions === 25000 && s6.lectures() === 3, J(lu6.find((x) => x.cle === "fsa")));

  // ── programMastery : l'ancienne seule ────────────────────────────────────
  const tm = (pct: number | null, ancienne: number | null | undefined): TopicMastery => ({ key: "k", label: "k", pct, answered: 60, ...(ancienne !== undefined ? { ancienne } : {}) });
  check("programMastery : lit ancienne, jamais pct (100 et 0 unique, 50 et null ancienne → 25)", programMastery([tm(100, 50), tm(0, null)]) === 25);
  check("programMastery : une liste lue à l'ancienne (sans le champ, classement) se lit sur pct", programMastery([tm(60, undefined), tm(80, undefined)]) === 70);

  // ── 5 profils : le rang ne bouge pas ─────────────────────────────────────
  /** la réponse que donnerait maitrise_joueur : ancienne = l'ancienne règle (vérifiée au banc), pct très différent */
  function reponseSql(rows: LigneAncienne[], decalage: number) {
    const matieres: Record<string, unknown> = {};
    for (const x of ancienneRegle(rows)) {
      const pct = Math.max(0, Math.min(100, (x.pct ?? 50) + decalage));
      matieres[x.cle] = { pct, n: 60, total: 200, statut: "mesuree", derniere: null, debut: 40, ancienne: x.pct };
    }
    return { v: 1, matieres };
  }
  const tout = (score: number, total: number) => TOPICS.map((t): LigneAncienne => ({ topics: [t.key], score, total }));
  const profils: { nom: string; elo: number; place: number | null; rows: LigneAncienne[]; decalage: number }[] = [
    { nom: "Diamant tenu de justesse (60 %)", elo: 1600, place: 40, rows: tout(60, 100), decalage: -30 },
    { nom: "Diamant verrouillé (59 %), unique à 89 %", elo: 1620, place: 35, rows: tout(59, 100), decalage: +30 },
    { nom: "ELO de Maître, 5 matières seulement (48 %)", elo: 1760, place: 12, rows: tout(95, 100).slice(0, 5), decalage: -40 },
    { nom: "Top 10 par la place, verrouillé (89 %)", elo: 1900, place: 3, rows: [...tout(89, 100), { topics: ["fsa", "equity"], score: 0, total: 50 }], decalage: +11 },
    { nom: "Or, sans verrou, aucune séance ciblée", elo: 1300, place: null, rows: [], decalage: 0 },
  ];
  for (const [i, p] of profils.entries()) {
    const uid = `profil-${i}`;
    const avant = rankFor(p.elo, programMastery(await getTopicMasteryAncienne(session(p.rows).client, uid)), p.place);
    REPONSES.set(uid, reponseSql(p.rows, p.decalage));
    const topics = await getTopicMastery(session(p.rows).client, uid);
    const apres = rankFor(p.elo, programMastery(topics), p.place);
    const sansSection = rankFor(p.elo, programMastery(await getTopicMastery(session(p.rows).client, `${uid}-repli`)), p.place);
    const differe = topics.some((t) => t.pct !== (t.ancienne ?? null));
    check(`rang inchangé : ${p.nom} (${avant.tier.name}${avant.division ? " " + avant.division : ""})`, apres.tierIndex === avant.tierIndex && apres.division === avant.division && sansSection.tierIndex === avant.tierIndex && (p.rows.length === 0 || differe), J({ avant: avant.tierIndex, apres: apres.tierIndex, sansSection: sansSection.tierIndex }));
  }

  // ── une seule exécution de maitrise_joueur par page et par joueur ───────
  REPONSES.set("page", brut);
  const avantPage = appels;
  const [barre, page, complete] = await Promise.all([getTopicMastery(session([]).client, "page"), getTopicMastery(session([]).client, "page"), getMaitrise(session([]).client, "page")]);
  check("TopBar puis page (deux clients différents, en parallèle) : une seule exécution de maitrise_joueur", appels - avantPage === 1 && J(barre) === J(page) && complete.source === "unique", String(appels - avantPage));
  await getTopicMastery(session([]).client, "page");
  check("relue dans les 60 s : toujours une seule exécution", appels - avantPage === 1);
  REPONSES.set("autre", brut);
  await getTopicMastery(session([]).client, "autre");
  check("un autre joueur : sa propre lecture", appels - avantPage === 2);
  const vraiNow = Date.now;
  Date.now = () => vraiNow() + 61_000;
  try {
    await getTopicMastery(session([]).client, "page");
  } finally {
    Date.now = vraiNow;
  }
  check("après 60 s : relue", appels - avantPage === 3);
  const fsaTm = barre.find((t) => t.key === "fsa")!;
  check("getTopicMastery : pct unique, answered = toutes les réponses, statut, ancienne et derniere", fsaTm.pct === 40 && fsaTm.answered === 130 && fsaTm.statut === "mesuree" && fsaTm.ancienne === 44 && fsaTm.derniere === "2026-10-15T08:00:00Z");

  // ── l'affichage ─────────────────────────────────────────────────────────
  check("libellePct : « ≈ 52 % » provisoire, « 52 % » mesurée, null non mesurée", libellePct({ pct: 52, statut: "provisoire" }) === `≈${NB}52${NB}%` && libellePct({ pct: 52, statut: "mesuree" }) === `52${NB}%` && libellePct({ pct: null }) === null);
  check("infobulleMaitrise : « provisoire · 23 réponses sur 40 » (1 réponse au singulier), rien si mesurée", infobulleMaitrise({ statut: "provisoire", n: 23 }) === "provisoire · 23 réponses sur 40" && infobulleMaitrise({ statut: "provisoire", n: 1 }) === "provisoire · 1 réponse sur 40" && infobulleMaitrise({ statut: "mesuree", n: 60 }) === null);
  const rail = subjectRail(barre);
  const railDe = (cle: string) => rail.find((x) => x.key === cle)!;
  check("rangée des matières : la provisoire porte son infobulle, la mesurée et la non mesurée non", railDe("quant").provisoire === "provisoire · 23 réponses sur 40" && railDe("quant").pct === 52 && !("provisoire" in railDe("fsa")) && railDe("portfolio").pct === null && !("provisoire" in railDe("portfolio")));
  check("rangée des matières : une liste sans statut (ancienne lecture) s'affiche comme avant", subjectRail([{ key: "fsa", pct: 61 }]).every((x) => !("provisoire" in x)));

  // ── les sceaux de matière ────────────────────────────────────────────────
  const sceau = defSceau("matiere:fsa")!;
  const stats = (mat: ProfilStats["matieres"][number]): ProfilStats => ({ ...STATS_VIDES, matieres: [mat] });
  check("sceau de matière : provisoire à 95 %, aucun palier (il ne progresse que mesuré)", etatSceau(sceau, stats({ key: "fsa", pct: 95, answered: 30, statut: "provisoire" })).palier === 0);
  check("sceau de matière : mesurée à 95 %, dorure", etatSceau(sceau, stats({ key: "fsa", pct: 95, answered: 45, statut: "mesuree" })).palier === 3);
  check("sceau de matière : sans statut (ancienne lecture), mesurée dès 40 questions comme avant", etatSceau(sceau, stats({ key: "fsa", pct: 80, answered: 40 })).palier === 2 && etatSceau(sceau, stats({ key: "fsa", pct: 80, answered: 39 })).palier === 0);
  const base: BaseSceaux = { mesures: null, rarete: null, gardes: [{ cle: "matiere:fsa", palier: 2, dates: [{ iso: "2026-10-01", avant: false }, { iso: "2026-10-05", avant: false }], retro: false, vu: true }] };
  check("sceau de matière : le palier gagné en base reste acquis, même retombé en provisoire", etatSceau(sceau, stats({ key: "fsa", pct: 40, answered: 20, statut: "provisoire" }), base).palier === 2);

  console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
  process.exit(ko ? 1 : 0);
};
void main();
