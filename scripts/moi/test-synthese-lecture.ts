// Test de la lecture de la page Moi « La synthèse » (lot 2), avec de faux
// clients Supabase : ni base, ni réseau, ni navigateur :
//   npx tsx --tsconfig tsconfig.json scripts/moi/test-synthese-lecture.ts
// lireSynthese branche maitrise_synthese, rythme_joueur et activite_depuis
// (client de service) et ne lit points_faibles qu'en repli. On vérifie : chaque
// bloc à sa place quand les fonctions répondent (notions « unique », évolution
// à 3, 30, 60, 90 jours, réponses de chaque période, moyennes, calcul, rythme,
// courbe) ; le repli sur 90 jours (« 90j ») quand la première manque ; la carte
// des notions masquée quand aucune source ne la fonde ; les réponses à null
// quand activite_depuis manque ; et que rien n'est inventé (tout à null) quand
// tout échoue.
import "../codex/sans-css";
import { lireSynthese } from "@/components/moi/synthese/donnees";
import { comptesNotions } from "@/components/moi/synthese/modele";
import type { SyntheseMoi } from "@/components/moi/synthese/types";
import { NOTIONS } from "@/lib/notions";
import { RANG_RECENT, RANG_SEMAINE } from "@/components/moi/synthese/modele";
import type { SupabaseClient } from "@supabase/supabase-js";

let ko = 0;
const titre = (t: string) => {
  console.log("");
  console.log(t);
};
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};

const MAINTENANT = Date.parse("2026-10-31T10:00:00Z");
const idsDe = (matiere: string) => NOTIONS.filter((n) => n.matiere === matiere).map((n) => n.id);

type Reponses = Record<string, unknown>;

/** Un faux client : les tables rendent leurs lignes, les rpc leur réponse (sinon une erreur « fonction absente »). */
function faux(rpcs: Reponses, tables: Record<string, unknown[]> = {}) {
  const appels: string[] = [];
  const client = {
    from(table: string) {
      appels.push("from:" + table);
      const b: Record<string, unknown> = {};
      for (const m of ["select", "eq", "gt", "gte", "lt", "lte", "order", "range", "limit", "in", "is", "not", "or", "neq", "contains"]) b[m] = () => b;
      b.maybeSingle = async () => ({ data: null, error: null });
      b.then = (res: (v: unknown) => unknown) => res({ data: tables[table] ?? [], error: null, count: 0 });
      return b;
    },
    async rpc(nom: string) {
      appels.push("rpc:" + nom);
      if (!(nom in rpcs)) return { data: null, error: { message: "fonction absente" } };
      const r = rpcs[nom];
      if (r instanceof Error) throw r;
      return { data: r, error: null };
    },
  };
  return { client: client as unknown as SupabaseClient, appels };
}

/** Éthique à 80 % (8 justes sur 10 en séances ciblées d'une seule matière) : provisoire, note de préparation 14. */
const SEANCES = { practice_session_results: [{ topics: ["ethics"], score: 8, total: 10 }] };

const lire = (id: string, supabase: SupabaseClient, admin: SupabaseClient | null) => lireSynthese(supabase, admin, { id, user_metadata: {} }, MAINTENANT);
const sansNaN = (s: SyntheseMoi) => !JSON.stringify(s).includes("NaN");

const ligneNotion = (notion: string, ok: number, n: number) => ({
  notion,
  recentes: Array.from({ length: n }, (_, i) => ["2026-10-30T10:00:00Z", i < ok]),
  sources: {},
  en_cours: 0,
  vives: 0,
  anciennes: 0,
  rayees_7j: 0,
  derniere: null,
  concepts: [],
});

async function main() {
  const eth = idsDe("ethics");
  const qua = idsDe("quant");

  // ── A. sans clé de service : le repli points_faibles (90 jours) ───────────
  titre("# repli : sans maitrise_synthese");
  {
    const u = faux({ points_faibles: { remplie: true, rayees_semaine: 0, notions: [ligneNotion(eth[0], 8, 10), ligneNotion(qua[0], 3, 5)] } }, SEANCES);
    const s = await lire("u-repli", u.client, null);
    check("les notions viennent de points_faibles : source « 90j », 93 notions", s.sourceNotions === "90j" && s.notions?.length === 93);
    const n = s.notions?.find((x) => x.id === eth[0]);
    check("8 justes sur 10 : 80 % acquise ; 5 réponses : en cours ; le reste : jamais vue", n?.pct === 80 && n.etat === "e" && s.notions?.find((x) => x.id === qua[0])?.etat === "encours" && !!s.notions && comptesNotions(s.notions).jamais === 91);
    check("points_faibles est lu avec le client du joueur", u.appels.includes("rpc:points_faibles"));
    check("les matières restent (maîtrise d'aujourd'hui) mais sans évolution, ni réponses par période, ni moyenne", s.matieres?.length === 10 && s.matieres[0].pct === 80 && s.matieres.every((m) => m.ilYa === null && m.reponses === null && m.moyJoueurs === null));
    check("globale : la préparation seule ; calcul, rythme, progression : masqués (null)", s.globale?.auj === 14 && s.globale.ilYa === null && s.globale.reponses === null && s.calcul === null && s.rythme === null && s.progression === null);
    check("aucune valeur inventée (pas de NaN)", sansNaN(s));
  }

  titre("# repli : points_faibles pas remplie, absente ou en erreur");
  {
    const vide = faux({ points_faibles: { remplie: false, rayees_semaine: 0, notions: [] } }, SEANCES);
    const s1 = await lire("u-vide", vide.client, null);
    check("pas remplie (les questions ne portent pas leur notion) : carte masquée, 93 « jamais vue » auraient menti", s1.notions === null && s1.sourceNotions === null);
    const absente = faux({}, SEANCES);
    const s2 = await lire("u-absente", absente.client, null);
    check("fonction absente : carte masquée", s2.notions === null && s2.sourceNotions === null);
    const leve = faux({ points_faibles: new Error("réseau") }, SEANCES);
    const s3 = await lire("u-leve", leve.client, null);
    check("la lecture lève une exception : carte masquée, la page répond quand même", s3.notions === null && s3.sourceNotions === null && s3.matieres?.length === 10);
  }

  // ── B. avec maitrise_synthese et rythme_joueur ────────────────────────────
  titre("# maitrise_synthese, rythme_joueur et activite_depuis répondent");
  {
    const historique: unknown[] = [{ i: 1, matieres: { ethics: { pct: 70, n: 30 } } }];
    for (let k = 8; k >= 6; k--) historique.push({ i: RANG_SEMAINE + k, matieres: { ethics: { pct: 60, n: 15 } } });
    for (let k = 5; k >= 1; k--) historique.push({ i: RANG_SEMAINE + k, matieres: { ethics: { pct: 75, n: 35 } } });
    // il y a 3 jours (rang 16, à la fin de la liste)
    historique.push({ i: RANG_RECENT + 1, matieres: { ethics: { pct: 75, n: 35 } } });
    const syn = {
      v: 1,
      historique,
      notions: { [eth[0]]: { pct: 82, n: 20, total: 31, derniere: "2026-10-30T10:00:00Z" }, [qua[0]]: { pct: 40, n: 12, total: 12 }, [qua[1]]: { pct: null, n: 3, total: 3 } },
      calcul: {
        "ethics:avec": { pct: 60, n: 30 },
        "ethics:sans": { pct: 80, n: 30 },
        "quant:avec": { pct: 50, n: 20 },
        "quant:sans": { pct: 70, n: 20 },
        "fsa:avec": { pct: 40, n: 15 },
        "fsa:sans": { pct: 70, n: 15 },
      },
      moyennes: { quant: { pct: 60, joueurs: 12 }, ethics: { pct: 70, joueurs: 4 } },
    };
    const ryt = { v: 1, sec: 104, n: 220, matieres: { ethics: { sec: 98, n: 80 }, quant: { sec: 130, n: 15 } } };
    // l'activité : rang 1 = 3 jours (Éthique 10 réponses), 2 = 30 jours (Éthique 30, Quant 4), 3 = 60 jours (rien), 4 = 90 jours
    const act = { v: 1, depuis: [{ i: 1, matieres: { ethics: { n: 10, justes: 8 } } }, { i: 2, matieres: { ethics: { n: 30, justes: 24 }, quant: { n: 4, justes: 1 } } }, { i: 4, matieres: { ethics: { n: 40, justes: 30 } } }] };
    const admin = faux({ maitrise_synthese: syn, rythme_joueur: ryt, activite_depuis: act });
    const u = faux({ points_faibles: { remplie: true, notions: [] } }, SEANCES);
    const s = await lire("u-syn", u.client, admin.client);

    check(
      "les trois fonctions sont appelées avec le client de service, une fois chacune",
      ["maitrise_synthese", "rythme_joueur", "activite_depuis"].every((f) => admin.appels.filter((a) => a === "rpc:" + f).length === 1),
      admin.appels.join(" "),
    );
    check("réponses par période : Éthique 10 en 3 j, 30 en 30 j, 0 en 60 j, 40 en 90 j ; Quant 4 en 30 j ; globale 10 / 34 / 0 / 40", JSON.stringify(s.matieres?.[0].reponses) === JSON.stringify({ 3: 10, 30: 30, 60: 0, 90: 40 }) && s.matieres?.[1].reponses?.[30] === 4 && JSON.stringify(s.globale?.reponses) === JSON.stringify({ 3: 10, 30: 34, 60: 0, 90: 40 }), JSON.stringify(s.globale?.reponses));
    check("points_faibles n'est PAS lu (le repli ne sert que sans maitrise_synthese)", !u.appels.includes("rpc:points_faibles"));
    const c = s.notions ? comptesNotions(s.notions) : null;
    check("notions : source « unique », 93 cases, 1 acquise, 1 rouge, 1 en cours, 90 jamais vues", s.sourceNotions === "unique" && s.notions?.length === 93 && c?.e === 1 && c.r === 1 && c.encours === 1 && c.jamais === 90, JSON.stringify(c));
    check("matières : évolution (Éthique 75 il y a 3 j, 70 il y a 30 j, rien avant) et moyenne des joueurs (Quant 60 ; Éthique écartée : 4 joueurs)", JSON.stringify(s.matieres?.[0].ilYa) === JSON.stringify({ 3: 75, 30: 70, 60: null, 90: null }) && s.matieres?.[1].moyJoueurs === 60 && s.matieres[0].moyJoueurs === null);
    check("globale : 14 aujourd'hui, 13 il y a 3 j, 12 il y a 30 j, rien il y a 60 j", s.globale?.auj === 14 && s.globale.ilYa?.[3] === 13 && s.globale.ilYa?.[30] === 12 && s.globale.ilYa[60] === null && s.globale.ilYa[90] === null, JSON.stringify(s.globale));
    check("calcul ou théorie : 51 % avec calcul, 75 % sans (3 matières comparables)", s.calcul?.global?.avec === 51 && s.calcul.global.sans === 75 && s.calcul.matieres.length === 3);
    check("rythme : 104 s, Éthique 98 s (Quant sous 20 questions : écartée)", s.rythme?.global === 104 && s.rythme.matieres.map((m) => m.cle).join() === "ethics");
    check("progression : 9 points (10, 13, puis aujourd'hui 14), datés par le serveur", s.progression?.points.join() === "10,10,10,13,13,13,13,13,14" && s.progression.dates[0] === "5 sept." && s.progression.dates[8] === "31 oct.", s.progression?.points.join());
    check("aucune valeur inventée (pas de NaN)", sansNaN(s));
  }

  titre("# maitrise_synthese répond, notions vides");
  {
    const syn = { v: 1, historique: [], notions: {}, calcul: {}, moyennes: {} };
    const a = faux({ maitrise_synthese: syn, rythme_joueur: { v: 1, sec: null, n: 0, matieres: {} } });
    const u = faux({ points_faibles: { remplie: true, notions: [] } }, SEANCES);
    const s = await lire("u-vide-repond", u.client, a.client);
    check("le joueur a répondu mais aucune notion n'est mesurée (questions sans notion) : carte masquée, sans repli", s.notions === null && s.sourceNotions === null && !u.appels.includes("rpc:points_faibles"));
    check("calcul : carte vide mais présente (global null) ; rythme : vide (global null) ; progression : un seul point", s.calcul !== null && s.calcul.global === null && s.rythme !== null && s.rythme.global === null && s.progression?.points.length === 1);
    check("activite_depuis absente (migration pas collée) : réponses à null, le reste de la carte inchangé", s.matieres?.every((m) => m.reponses === null) === true && s.globale?.reponses === null && a.appels.includes("rpc:activite_depuis"));

    const nouveau = faux({});
    const a2 = faux({ maitrise_synthese: syn, rythme_joueur: { v: 1, sec: null, n: 0, matieres: {} }, activite_depuis: { v: 1, depuis: [] } });
    const s2 = await lire("u-nouveau", nouveau.client, a2.client);
    check("un joueur qui n'a rien répondu : les 93 notions sont vraiment « jamais vues »", s2.sourceNotions === "unique" && s2.notions?.length === 93 && !!s2.notions && comptesNotions(s2.notions).jamais === 93);
    check("activite_depuis répond « rien » : 0 réponse partout (pas null)", JSON.stringify(s2.globale?.reponses) === JSON.stringify({ 3: 0, 30: 0, 60: 0, 90: 0 }) && s2.matieres?.every((m) => m.reponses?.[3] === 0) === true);
    check("rien de mesuré : courbe sans point, globale à 0 sans historique de 30 j", s2.progression?.points.length === 0 && s2.globale?.auj === 0 && s2.globale.ilYa?.[30] === null && sansNaN(s2));
  }

  // ── C. tout échoue ────────────────────────────────────────────────────────
  titre("# les trois fonctions échouent");
  {
    const a = faux({ maitrise_synthese: new Error("délai dépassé"), rythme_joueur: null, activite_depuis: new Error("délai dépassé") });
    const u = faux({ points_faibles: { remplie: true, notions: [ligneNotion(eth[0], 10, 10)] } }, SEANCES);
    const s = await lire("u-echec", u.client, a.client);
    check("exception ou NULL : on retombe sur le repli (« 90j ») sans casser la page", s.sourceNotions === "90j" && s.notions?.find((x) => x.id === eth[0])?.pct === 100);
    check("évolution, réponses, calcul, rythme, progression : null ; matières et globale d'aujourd'hui gardées", s.calcul === null && s.rythme === null && s.progression === null && s.matieres?.every((m) => m.ilYa === null && m.reponses === null) === true && s.globale?.ilYa === null && s.globale.reponses === null);
    check("le reste de la page (joueur, objectif, trophées) répond toujours", !!s.joueur && s.objectif.etat === "sans" && !!s.trophees && sansNaN(s));
  }
}

main().then(() => {
  console.log("");
  console.log(ko === 0 ? "Tout est vert." : `${ko} échec(s).`);
  process.exit(ko === 0 ? 0 : 1);
});
