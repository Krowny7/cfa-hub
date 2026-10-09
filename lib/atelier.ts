// L'Atelier : la séance de remise à niveau (environ 30 minutes) sur 1 à 3
// notions faibles, pondérées 60/25/15 (70/30 à deux, 100 seule). Module pur
// (ni serveur ni client), testé par scripts/test-atelier.mjs.
//
// Le serveur (migration_atelier.sql) prépare un pool d'environ deux fois les
// questions nécessaires et corrige ; ici, l'enchaînement :
// - planifier(items) : la cible de chaque bloc. Rappel (une carte par
//   notion), 8 ratures, 8 questions neuves, 4 calculs, 4 re-tests au plus.
//   Un bloc absent ou court est remplacé par des questions neuves (moins de
//   ratures : autant de neuves en plus ; pas de calcul : 4 neuves de plus).
// - prochaineEtape(etat, plan) : la carte ou la question suivante.
//   · Deux fautes de suite sur une notion : une carte Rappel s'intercale, et
//     la question suivante de la notion est plus facile (l'officielle, un
//     calcul d'un niveau en dessous).
//   · Trois justes de suite : la suivante est plus dure. Une notion tenue
//     (80 % sur 6 réponses ou plus) laisse son poids aux autres.
//   · Le chrono commande : à 20 minutes, si les questions neuves ne sont pas
//     finies, on passe au re-test (le calcul saute) ; à 32 minutes (plafond
//     doux), plus de nouvelle question : le bilan. Le bilan n'est jamais coupé.
// - bilan(…) : avant / pendant par notion, ratures avant et après, calcul,
//   re-test, le prochain Atelier conseillé.

export type Bloc = "rappel" | "ratures" | "neuves" | "calcul" | "retest";
export const BLOCS: Bloc[] = ["rappel", "ratures", "neuves", "calcul", "retest"];
export type Nature = "rature" | "neuve" | "calc";
/** 1 : l'officielle (ou un calcul facile) ; 2 : angle différent (moyen) ; 3 : plus dure (difficile) */
export type Niveau = 1 | 2 | 3;

export const DUREE_S = 30 * 60;
export const BASCULE_RETEST_S = 20 * 60;
export const PLAFOND_S = 32 * 60;
export const CIBLE = { ratures: 8, neuves: 8, neuvesSansCalcul: 4, calcul: 4, retest: 4 } as const;
export const SERIE_FAUTES = 2;
export const SERIE_JUSTES = 3;
/** une notion « tenue » : au moins 6 réponses et 80 % de justes pendant l'Atelier */
export const TENUE = { min: 6, taux: 0.8 } as const;
/** au-delà de 60 % de réussite récente, les questions neuves visent la variante plus dure */
export const SEUIL_PLUS_DURE = 0.6;

const NATURE_DU_BLOC: Partial<Record<Bloc, Nature>> = { ratures: "rature", neuves: "neuve", calcul: "calc" };

/** Les poids des notions, dans l'ordre (les mêmes qu'atelier_lancer). */
export function poidsDe(n: number): number[] {
  return n <= 1 ? [100] : n === 2 ? [70, 30] : [60, 25, 15];
}

export type ItemPool = { i: number; k: Nature; notion: string; niveau: Niveau };
/** Une réponse donnée, dans l'ordre : premier passage, ou re-test. */
export type Reponse = { i: number; ok: boolean; retest: boolean };
/** Une carte Rappel déjà montrée : celle de l'ouverture (notion null), puis celles des fautes, après `apres` réponses. */
export type RappelVu = { notion: string | null; apres: number };

export type EtatAtelier = {
  notions: string[];
  poids: number[];
  items: ItemPool[];
  reponses: Reponse[];
  rappels: RappelVu[];
  /** temps de la séance (secondes) */
  secondes: number;
  /** réussite récente avant l'Atelier, par notion (0 à 1 ; null : inconnue) */
  reussiteAvant: Record<string, number | null>;
};

export type Plan = Record<Exclude<Bloc, "rappel">, number>;

export type Etape =
  | { type: "rappel"; notions: string[]; raison: "ouverture" | "fautes" }
  | { type: "question"; i: number; bloc: Exclude<Bloc, "rappel">; retest: boolean }
  | { type: "fin"; raison: "fini" | "plafond" };

/** La cible de chaque bloc, d'après le pool. */
export function planifier(items: ItemPool[]): Plan {
  const nb = (k: Nature) => items.filter((x) => x.k === k).length;
  const ratures = Math.min(CIBLE.ratures, nb("rature"));
  const calcul = Math.min(CIBLE.calcul, nb("calc"));
  const neuves = Math.min(nb("neuve"), CIBLE.neuves + (CIBLE.ratures - ratures) + (calcul === 0 ? CIBLE.neuvesSansCalcul : 0));
  return { ratures, neuves, calcul, retest: CIBLE.retest };
}

const itemDe = (etat: EtatAtelier, i: number) => etat.items.find((x) => x.i === i) ?? null;
const premiers = (etat: EtatAtelier) => etat.reponses.filter((r) => !r.retest);
const repondu = (etat: EtatAtelier) => new Set(premiers(etat).map((r) => r.i));

/** Réponses du premier passage d'une notion (toutes natures), justes parmi elles. */
export function compteNotion(etat: EtatAtelier, notion: string): { n: number; ok: number } {
  let n = 0;
  let ok = 0;
  for (const r of premiers(etat)) {
    if (itemDe(etat, r.i)?.notion !== notion) continue;
    n += 1;
    if (r.ok) ok += 1;
  }
  return { n, ok };
}

export const estTenue = (c: { n: number; ok: number }) => c.n >= TENUE.min && c.ok / c.n >= TENUE.taux;

/**
 * La série en cours d'une notion (premier passage) : fautes ou justes de
 * suite, et l'indice dans `reponses` où elle commence.
 */
export function serieDe(etat: EtatAtelier, notion: string): { fautes: number; justes: number; debut: number } {
  let fautes = 0;
  let justes = 0;
  let debut = etat.reponses.length;
  for (let k = etat.reponses.length - 1; k >= 0; k--) {
    const r = etat.reponses[k];
    if (r.retest || itemDe(etat, r.i)?.notion !== notion) continue;
    if (r.ok ? fautes > 0 : justes > 0) break;
    if (r.ok) justes += 1;
    else fautes += 1;
    debut = k;
  }
  return { fautes, justes, debut };
}

/** Le niveau visé pour la prochaine question d'une notion (neuve ou calcul). */
export function niveauCible(etat: EtatAtelier, notion: string, k: "neuve" | "calc"): Niveau {
  const s = serieDe(etat, notion);
  const sens = s.fautes >= SERIE_FAUTES ? -1 : s.justes >= SERIE_JUSTES ? 1 : 0;
  if (k === "neuve") {
    if (sens < 0) return 1;
    if (sens > 0) return 3;
    const avant = etat.reussiteAvant[notion];
    return avant !== null && avant !== undefined && avant > SEUIL_PLUS_DURE ? 3 : 2;
  }
  // calcul : le niveau le plus fourni du pool est celui du joueur ; un cran en dessous, ou au-dessus
  const niveaux = etat.items.filter((x) => x.k === "calc" && x.notion === notion).map((x) => x.niveau);
  if (!niveaux.length) return 1;
  const compte = (v: Niveau) => niveaux.filter((x) => x === v).length;
  const base = ([3, 2, 1] as Niveau[]).reduce((m, v) => (compte(v) > compte(m) ? v : m), 3 as Niveau);
  if (sens < 0) return Math.max(Math.min(...niveaux), base - 1) as Niveau;
  if (sens > 0) return Math.max(...niveaux) as Niveau;
  return base;
}

/** Les poids qui comptent encore : une notion tenue laisse le sien aux autres (toutes tenues : les poids d'origine). */
export function poidsEffectifs(etat: EtatAtelier): number[] {
  const w = etat.notions.map((n, k) => (estTenue(compteNotion(etat, n)) ? 0 : (etat.poids[k] ?? 0)));
  return w.some((x) => x > 0) ? w : etat.notions.map((_, k) => etat.poids[k] ?? 0);
}

const faitDe = (etat: EtatAtelier, k: Nature) => premiers(etat).filter((r) => itemDe(etat, r.i)?.k === k).length;
const resteDe = (etat: EtatAtelier, k: Nature) => {
  const vus = repondu(etat);
  return etat.items.some((x) => x.k === k && !vus.has(x.i));
};
const enCours = (etat: EtatAtelier, k: Nature, cible: number) => faitDe(etat, k) < cible && resteDe(etat, k);

/** Les questions manquées au premier passage, pas encore reposées, « remélangées » (ordre fixe, d'une reprise à l'autre). */
export function aReposer(etat: EtatAtelier): number[] {
  const deja = new Set(etat.reponses.filter((r) => r.retest).map((r) => r.i));
  const melange = (i: number) => (i * 7919 + 17) % 104729;
  return premiers(etat)
    .filter((r) => !r.ok && !deja.has(r.i))
    .map((r) => r.i)
    .sort((a, b) => melange(a) - melange(b) || a - b);
}

/** Le bloc en cours (null : plus rien, le bilan). */
export function blocCourant(etat: EtatAtelier, plan: Plan): Exclude<Bloc, "rappel"> | null {
  const retestCommence = etat.reponses.some((r) => r.retest);
  const retestPossible = () => etat.reponses.filter((r) => r.retest).length < plan.retest && aReposer(etat).length > 0;
  if (!retestCommence) {
    const ratures = enCours(etat, "rature", plan.ratures);
    const neuves = enCours(etat, "neuve", plan.neuves);
    if (ratures || neuves) {
      // le chrono commande : à 20 minutes, le re-test (le calcul saute)
      if (etat.secondes >= BASCULE_RETEST_S) return retestPossible() ? "retest" : null;
      return ratures ? "ratures" : "neuves";
    }
    if (enCours(etat, "calc", plan.calcul)) return "calcul";
  }
  return retestPossible() ? "retest" : null;
}

/** La question suivante d'un bloc : la notion la plus en retard sur son poids, puis le niveau visé, puis l'ordre du pool. */
export function choisir(etat: EtatAtelier, bloc: "ratures" | "neuves" | "calcul"): number | null {
  const k = NATURE_DU_BLOC[bloc] as Nature;
  const vus = repondu(etat);
  const libres = etat.items.filter((x) => x.k === k && !vus.has(x.i));
  if (!libres.length) return null;
  const w = poidsEffectifs(etat);
  const avecLibres = etat.notions.filter((n) => libres.some((x) => x.notion === n));
  // une notion tenue (poids 0) ne revient que si plus aucune autre n'a de question
  const enLice = avecLibres.filter((n) => (w[etat.notions.indexOf(n)] ?? 0) > 0);
  const choix = enLice.length ? enLice : avecLibres;
  const poids = (n: number) => (enLice.length ? (w[n] ?? 0) : (etat.poids[n] ?? 1)) || 1;
  const faitNotion = (notion: string) => premiers(etat).filter((r) => {
    const it = itemDe(etat, r.i);
    return it?.k === k && it.notion === notion;
  }).length;
  let notion = choix[0];
  let meilleur = Infinity;
  for (const n of choix) {
    const v = (faitNotion(n) + 0.5) / poids(etat.notions.indexOf(n));
    if (v < meilleur - 1e-9) {
      meilleur = v;
      notion = n;
    }
  }
  const siens = libres.filter((x) => x.notion === notion);
  if (k === "rature") return siens.sort((a, b) => a.i - b.i)[0].i;
  const cible = niveauCible(etat, notion, k);
  return siens.sort((a, b) => Math.abs(a.niveau - cible) - Math.abs(b.niveau - cible) || a.i - b.i)[0].i;
}

/** La carte ou la question suivante. */
export function prochaineEtape(etat: EtatAtelier, plan: Plan): Etape {
  if (!etat.rappels.some((r) => r.notion === null)) return { type: "rappel", notions: etat.notions, raison: "ouverture" };
  // deux fautes de suite : un rappel de la notion, une fois par série
  const der = etat.reponses.at(-1);
  if (der && !der.retest && !der.ok) {
    const notion = itemDe(etat, der.i)?.notion;
    if (notion) {
      const s = serieDe(etat, notion);
      if (s.fautes >= SERIE_FAUTES && !etat.rappels.some((r) => r.notion === notion && r.apres > s.debut)) return { type: "rappel", notions: [notion], raison: "fautes" };
    }
  }
  if (etat.secondes >= PLAFOND_S) return { type: "fin", raison: "plafond" };
  const bloc = blocCourant(etat, plan);
  if (bloc === null) return { type: "fin", raison: "fini" };
  if (bloc === "retest") return { type: "question", i: aReposer(etat)[0], bloc, retest: true };
  const i = choisir(etat, bloc);
  return i === null ? { type: "fin", raison: "fini" } : { type: "question", i, bloc, retest: false };
}

export type EtatBloc = "fait" | "encours" | "avenir" | "saute";

/** L'avancement des blocs pour le plan affiché (fait / cible). */
export function avancement(etat: EtatAtelier, plan: Plan, etape: Etape): { bloc: Bloc; fait: number; cible: number; etat: EtatBloc }[] {
  const courant: Bloc | null = etape.type === "rappel" && etape.raison === "ouverture" ? "rappel" : etape.type === "question" ? etape.bloc : etape.type === "rappel" ? blocCourant(etat, plan) : null;
  const ordre = BLOCS.indexOf(courant ?? "retest");
  const fin = etape.type === "fin";
  return BLOCS.flatMap((bloc, k) => {
    const nature = NATURE_DU_BLOC[bloc];
    const cible = bloc === "rappel" ? etat.notions.length : bloc === "retest" ? plan.retest : plan[bloc];
    if (bloc !== "rappel" && bloc !== "retest" && cible === 0) return [];
    const fait = bloc === "rappel" ? (etat.rappels.some((r) => r.notion === null) ? etat.notions.length : 0) : bloc === "retest" ? etat.reponses.filter((r) => r.retest).length : faitDe(etat, nature as Nature);
    let e: EtatBloc;
    if (bloc === courant && !fin) e = "encours";
    else if (fin || k < ordre) e = fait > 0 || bloc === "rappel" ? "fait" : "saute";
    else e = "avenir";
    return [{ bloc, fait, cible, etat: e }];
  });
}

// ---------------------------------------------------------------------------
// Le bilan

/** La photographie d'une notion au lancement (atelier_lancer), calcul compris (ajouté par le site). */
export type AvantNotion = { n: number; ok: number; enCours: number; vives: number; calc: { n: number; ok: number } | null };
export type ApresNotion = { enCours: number; vives: number };

export type BilanNotion = {
  notion: string;
  /** réussite récente aux questions avant, et réussite aux questions pendant l'Atelier (premier passage) */
  avant: { n: number; ok: number };
  pendant: { n: number; ok: number };
  ratures: { avant: number; apres: number; rayees: number; nouvelles: number };
  /** null : pas de calcul joué dans l'Atelier */
  calcul: { avant: { n: number; ok: number } | null; pendant: { n: number; ok: number }; niveau: Niveau } | null;
  tenue: boolean;
};

export type Conseil = "demain" | "apres-demain" | "semaine";

export type BilanAtelier = {
  notions: BilanNotion[];
  /** premier passage, questions et calculs */
  score: number;
  total: number;
  retest: { n: number; ok: number };
  /** la notion à revoir d'abord (la plus basse pendant l'Atelier) ; null sans réponse */
  aRevoir: string | null;
  prochain: Conseil;
};

/**
 * Le bilan : avant / pendant par notion (questions), ratures avant et après
 * (celles que le serveur a comptées à la clôture, sinon avant − rayées +
 * nouvelles), calcul à part, re-test. Prochain Atelier : demain sous 60 %
 * pendant, après-demain sous 80 %, sinon dans une semaine.
 */
export function bilan(etat: Pick<EtatAtelier, "notions" | "items" | "reponses">, avant: Record<string, AvantNotion | undefined>, apres?: Record<string, ApresNotion | undefined> | null): BilanAtelier {
  const item = new Map(etat.items.map((x) => [x.i, x]));
  const prem = etat.reponses.filter((r) => !r.retest);
  const notions: BilanNotion[] = etat.notions.map((notion) => {
    const a = avant[notion];
    const siennes = prem.filter((r) => item.get(r.i)?.notion === notion);
    const qcm = siennes.filter((r) => item.get(r.i)?.k !== "calc");
    const calc = siennes.filter((r) => item.get(r.i)?.k === "calc");
    const rayees = siennes.filter((r) => item.get(r.i)?.k === "rature" && r.ok).length;
    const nouvelles = siennes.filter((r) => item.get(r.i)?.k === "neuve" && !r.ok).length;
    const enCoursAvant = a?.enCours ?? 0;
    const tout = { n: siennes.length, ok: siennes.filter((r) => r.ok).length };
    return {
      notion,
      avant: { n: a?.n ?? 0, ok: a?.ok ?? 0 },
      pendant: { n: qcm.length, ok: qcm.filter((r) => r.ok).length },
      ratures: { avant: enCoursAvant, apres: apres?.[notion]?.enCours ?? Math.max(0, enCoursAvant - rayees + nouvelles), rayees, nouvelles },
      calcul: calc.length
        ? {
            avant: a?.calc && a.calc.n > 0 ? a.calc : null,
            pendant: { n: calc.length, ok: calc.filter((r) => r.ok).length },
            niveau: Math.max(...calc.map((r) => item.get(r.i)?.niveau ?? 1)) as Niveau,
          }
        : null,
      tenue: estTenue(tout),
    };
  });
  const score = prem.filter((r) => r.ok).length;
  const reponduesQcm = notions.filter((x) => x.pendant.n > 0);
  const aRevoir = reponduesQcm.length ? [...reponduesQcm].sort((a, b) => a.pendant.ok / a.pendant.n - b.pendant.ok / b.pendant.n || etat.notions.indexOf(a.notion) - etat.notions.indexOf(b.notion))[0].notion : null;
  const total = prem.length;
  const taux = total > 0 ? score / total : 0;
  const retests = etat.reponses.filter((r) => r.retest);
  return {
    notions,
    score,
    total,
    retest: { n: retests.length, ok: retests.filter((r) => r.ok).length },
    aRevoir,
    prochain: taux < 0.6 ? "demain" : taux < 0.8 ? "apres-demain" : "semaine",
  };
}
