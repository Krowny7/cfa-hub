// Test du chrono global des Salles (« examen », comme les 30 du jour), sans
// base, réseau ni navigateur :
//   npx tsx --tsconfig tsconfig.json scripts/salles/test-examen.tsx
// La logique pure (lib/salles/examen.ts : horloge, chrono affiché, prochaine
// question sans réponse, avancement des joueurs, débrief), puis l'écran
// (PartieExamen) à plusieurs instants d'une partie d'exemple passée au chrono
// global : le décompte, la partie en cours (JAMAIS de verdict ni de
// correction), un calcul, tout répondu, la fin avec le podium et le débrief
// (filtre « Mes erreurs »), la fin avant l'arrivée des corrections, « Rendre
// ma copie » (le bloc, la confirmation dans la page, le verrouillage, le repère
// « copie rendue » des joueurs, la fin quand tout le monde a rendu). Un dernier
// contrôle lit Examen.module.css (classes utilisées, pas d'animation oubliée).
import "../codex/sans-css";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DebriefExamen } from "@/components/salles/DebriefExamen";
import { PartieExamen, RendreCopie } from "@/components/salles/PartieExamen";
import {
  avancementBrut,
  avancementJoueurs,
  chronoBas,
  clicTropTot,
  copieRendue,
  debriefExamen,
  estChronoGlobal,
  finRevelee,
  GARDE_DOUBLE_CLIC_MS,
  horlogeExamen,
  libelleChrono,
  positionDeDepart,
  prochaineNonRepondue,
  refusCopieRendue,
  reponsesRetenues,
} from "@/lib/salles/examen";
import { SalleErreur } from "@/lib/salles/api";
import { EXAMEN } from "@/lib/voice-salles";
import { exemplePartie } from "@/lib/salles/exemples";
import type { ReponseOk } from "@/lib/salles/partie";
import type { CopieRendue, EtatSalle, SalleMaReponse, SalleSession } from "@/lib/salles/types";

(globalThis as { React?: typeof React }).React = React;

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const compte = (html: string, re: RegExp) => (html.match(re) ?? []).length;
{
  const deux = [{ userId: "moi", username: "Moi", avatarUrl: null }, { userId: "lui", username: "Lui", avatarUrl: null }];
  const avant = avancementJoueurs({ session: { params: {}, avancement: [] } as never, membres: deux, moiId: "moi", mesRepondues: 0 });
  check("un joueur absent qui n'a rien répondu n'apparaît pas", avancementJoueurs({ session: { params: {}, avancement: [] } as never, membres: deux, moiId: "moi", mesRepondues: 0, presents: new Set(["moi"]) }).length === 1);
  check("un joueur qui n'a encore rien répondu apparaît, à 0", avant.length === 2 && avant.some((j) => j.userId === "lui" && j.n === 0 && !j.moi));
}
/** La balise ouvrante du bouton qui contient `texte`. */
const boutonDe = (html: string, texte: string): string => {
  const i = html.indexOf(texte);
  if (i < 0) return "";
  const debut = html.lastIndexOf("<button", i);
  return debut < 0 ? "" : html.slice(debut, html.indexOf(">", debut) + 1);
};
const casesRepondues = (html: string) => compte(html, /class="case" data-pos="\d+" data-etat="repondue"/g);
const nettoyer = (html: string) => html.replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/[  ]/g, " ");
const rendre = (el: React.ReactElement): string => {
  try {
    return nettoyer(renderToStaticMarkup(el));
  } catch (e) {
    console.log(e);
    return "";
  }
};

// ---------------------------------------------------------------------------
// Une partie d'exemple au chrono global : 10 questions × 45 s = 7 min 30 s

const base = exemplePartie("fin");
const DEBUT = Date.parse(base.etat.session!.startedAt);
const NB = base.etat.session!.nb;
const TEMPS = base.etat.session!.temps;
const FIN = DEBUT + NB * TEMPS * 1000;
const MOI = base.etat.moi.userId;
const finales = base.etat.mesReponses;
const masquee = (m: SalleMaReponse): SalleMaReponse => ({ ...m, juste: null, points: null, delaiMs: 30_000 + m.position * 20_000 });

type Instant = "decompte" | "cours" | "tout" | "fin" | "finSansCorrections";
type OptsPartie = { repondues?: number[]; admin?: boolean; rendus?: string[] };
function partieGlobale(instant: Instant, opts: OptsPartie = {}): { etat: EtatSalle; t: number } {
  const t = instant === "decompte" ? DEBUT - 2_400 : instant === "fin" || instant === "finSansCorrections" ? FIN + 3_000 : DEBUT + 150_000;
  const fin = instant === "fin" || instant === "finSansCorrections";
  const repondues = opts.repondues ?? (instant === "tout" ? Array.from({ length: NB }, (_, i) => i) : instant === "cours" ? [0, 1, 4] : []);
  const rendu = (id: string) => (opts.rendus ?? []).includes(id);
  const session: SalleSession = {
    ...base.etat.session!,
    statut: fin ? "terminee" : instant === "decompte" ? "attente" : "en_cours",
    params: { ...base.etat.session!.params, chrono: "global" },
    pause: 5,
    finAt: new Date(FIN).toISOString(),
    index: fin ? NB : instant === "decompte" ? -1 : 0,
    phase: fin ? "fin" : instant === "decompte" ? "decompte" : "question",
    nbVisibles: NB,
    nbFermees: fin ? NB : 0,
    reponduCourante: 0,
    chrono: "global",
    avancement: fin
      ? null
      : [
          { userId: "u0", n: 7, rendu: rendu("u0") },
          { userId: "u1", n: 5, rendu: rendu("u1") },
          { userId: MOI, n: repondues.length, rendu: rendu(MOI) },
        ],
  };
  // l'exemple laisse une question sans réponse : on en invente une quand il faut tout répondre
  const mienne = (pos: number): SalleMaReponse =>
    finales.find((m) => m.position === pos) ?? { position: pos, choix: base.etat.items[pos]?.origine === "calcul" ? null : 1, valeur: base.etat.items[pos]?.origine === "calcul" ? 1 : null, juste: false, points: 0, delaiMs: 0 };
  const mes = fin ? finales : repondues.map(mienne).map(masquee);
  const etat: EtatSalle = {
    ...base.etat,
    moi: { userId: MOI, estAdmin: opts.admin ?? true },
    session,
    items: base.etat.items,
    corrections: instant === "fin" ? base.etat.corrections : [],
    mesReponses: mes,
    // avant la fin : le serveur ne rend pas de classement (points et bonnes à 0)
    classement: fin ? base.etat.classement : base.etat.classement.map((l) => ({ ...l, points: 0, bonnes: 0, tempsMs: 0 })),
    monClassement: fin ? base.etat.monClassement : null,
  };
  return { etat, t };
}

const COPIE: CopieRendue = { rendus: 1, membres: 3, terminee: false };
const rendreExamen = (instant: Instant, opts: OptsPartie & { locales?: Record<number, ReponseOk | undefined> } = {}): string => {
  const { etat, t } = partieGlobale(instant, opts);
  const admin = opts.admin ?? true;
  return rendre(
    <PartieExamen
      session={etat.session!}
      items={etat.items}
      corrections={etat.corrections}
      mesReponses={etat.mesReponses}
      locales={opts.locales ?? {}}
      classement={etat.classement}
      monClassement={etat.monClassement}
      membres={etat.membres}
      moi={{ userId: MOI, username: "Toi", avatarUrl: null }}
      estAdmin={admin}
      t={t}
      repondre={async () => ({ ok: true, deja: false, masque: true, juste: false, points: 0, delaiMs: 1, choix: 0, valeur: null, bonneIndex: null, bonneValeur: null, explication: null, etapes: [] })}
      rendreCopie={async () => COPIE}
      onArreter={admin ? async () => {} : undefined}
      onRejouer={admin ? async () => ({ ok: true }) : undefined}
      onRetour={() => {}}
    />,
  );
};

// des morceaux de corrections qui ne doivent JAMAIS paraître avant la fin
const secrets = base.etat.corrections.map((c) => c.explication ?? "").filter((e) => e.length > 20).map((e) => e.slice(0, 30));

console.log("# logique pure");
{
  const s = partieGlobale("cours").etat.session!;
  check("estChronoGlobal : par la session, par les réglages, et pas en chrono par question", estChronoGlobal(s) && estChronoGlobal({ params: { ...s.params, chrono: "global" } }) && !estChronoGlobal(exemplePartie("question").etat.session) && !estChronoGlobal(null));
  const hd = horlogeExamen(s, DEBUT - 2_400);
  const hq = horlogeExamen(s, DEBUT + 150_000);
  const hf = horlogeExamen(s, FIN);
  check("horlogeExamen : décompte avant le départ (2,4 s)", hd.phase === "decompte" && hd.avantDebutMs === 2_400 && hd.restantMs === 0);
  check("horlogeExamen : en cours, le chrono global court jusqu'à fin_at (5 min restantes)", hq.phase === "question" && hq.restantMs === 300_000 && hq.totalMs === 450_000);
  check("horlogeExamen : fin à fin_at pile, et dès que la partie est terminée (arrêt admin)", hf.phase === "fin" && horlogeExamen({ ...s, statut: "terminee" }, DEBUT + 1_000).phase === "fin");
  check("horlogeExamen : fin_at illisible, repli sur départ + nb × temps", horlogeExamen({ ...s, finAt: "?" }, FIN - 1).phase === "question" && horlogeExamen({ ...s, finAt: "?" }, FIN).phase === "fin");
  check("libelleChrono : m:ss, h:mm:ss, arrondi à la seconde au-dessus", libelleChrono(0) === "0:00" && libelleChrono(400) === "0:01" && libelleChrono(7_000) === "0:07" && libelleChrono(125_000) === "2:05" && libelleChrono(3_849_000) === "1:04:09" && libelleChrono(8_100_000) === "2:15:00" && libelleChrono(-5) === "0:00");
  check("chronoBas : les 5 dernières minutes d'un long chrono, le dernier cinquième d'un court", chronoBas(300_000, 8_100_000) && !chronoBas(300_001, 8_100_000) && chronoBas(90_000, 450_000) && !chronoBas(90_001, 450_000) && !chronoBas(0, 450_000));

  const rep = new Set([0, 1, 4]);
  check("prochaineNonRepondue : la suivante sans réponse, en repartant du début", prochaineNonRepondue(10, rep, 1) === 2 && prochaineNonRepondue(10, rep, 3) === 5 && prochaineNonRepondue(5, new Set([0, 1, 4]), 4) === 2);
  check("prochaineNonRepondue : null quand tout est répondu ; la question elle-même en dernier", prochaineNonRepondue(3, new Set([0, 1, 2]), 1) === null && prochaineNonRepondue(3, new Set([0, 2]), 1) === 1 && prochaineNonRepondue(0, new Set(), 0) === null);
  check("positionDeDepart : la première sans réponse, sinon la première", positionDeDepart(10, rep) === 2 && positionDeDepart(2, new Set([0, 1])) === 0);

  const ok: ReponseOk = { ok: true, deja: false, masque: true, juste: false, points: 0, delaiMs: 1, choix: 3, valeur: null, bonneIndex: null, bonneValeur: null, explication: null, etapes: [] };
  const ret = reponsesRetenues(10, { 6: ok, 40: ok }, [{ position: 1, choix: 2, valeur: null, juste: null, points: null, delaiMs: 5 }]);
  check("reponsesRetenues : l'état lu et les réponses rendues, hors partie ignorées, sans verdict", ret.size === 2 && ret.get(1)?.choix === 2 && ret.get(6)?.choix === 3 && !ret.has(40) && !("juste" in (ret.get(6) ?? {})));

  const membres = base.etat.membres;
  const av = avancementJoueurs({ session: partieGlobale("cours").etat.session, membres, moiId: MOI, mesRepondues: 4 });
  check("avancementJoueurs : les pseudos, du plus avancé au moins avancé", av[0].username === "Inès B." && av[0].n === 7 && av[1].username === "Marc L." && av[1].n === 5);
  check("avancementJoueurs : ma ligne prend mon compte local s'il est plus frais (4 > 3)", av.find((j) => j.moi)?.n === 4 && av.filter((j) => j.moi).length === 1);
  check("avancementJoueurs : sans avancement lu, tous les membres, à 0", (() => {
    const lu = avancementJoueurs({ session: { params: base.etat.session!.params }, membres, moiId: MOI, mesRepondues: 0 });
    return lu.length === membres.length && lu.every((j) => j.n === 0);
  })());
  check("avancementBrut : lit aussi le JSON du serveur (user_id)", avancementBrut({ params: base.etat.session!.params, avancement: [{ user_id: "a", n: 3 }, { n: 2 }] } as never).length === 1);
  const brutRendu = avancementBrut({ params: base.etat.session!.params, avancement: [{ user_id: "a", n: 3, rendu: true }, { user_id: "b", n: 2 }, { user_id: "c", n: 1, rendu: "oui" }] } as never);
  check("avancementBrut : « rendu » lu, faux s'il manque ou n'est pas un booléen vrai", brutRendu.map((a) => a.rendu).join() === "true,false,false");
  const sesRendus = partieGlobale("cours", { rendus: ["u0", MOI] }).etat.session;
  check("copieRendue : d'après l'avancement lu, pour moi seulement", copieRendue(sesRendus, MOI) && copieRendue(sesRendus, "u0") && !copieRendue(sesRendus, "u1") && !copieRendue(partieGlobale("cours").etat.session, MOI) && !copieRendue(null, MOI));
  const avR = avancementJoueurs({ session: partieGlobale("cours", { rendus: ["u0"] }).etat.session, membres, moiId: MOI, mesRepondues: 3 });
  check("avancementJoueurs : le repère « rendu » suit chaque joueur", avR.find((j) => j.userId === "u0")?.rendu === true && avR.find((j) => j.userId === "u1")?.rendu === false && avR.find((j) => j.moi)?.rendu === false);
  check(
    "avancementJoueurs : ma copie rendue à l'instant compte avant la lecture suivante (moiRendu)",
    avancementJoueurs({ session: partieGlobale("cours").etat.session, membres, moiId: MOI, mesRepondues: 3, moiRendu: true }).find((j) => j.moi)?.rendu === true &&
      avancementJoueurs({ session: { params: base.etat.session!.params }, membres, moiId: MOI, mesRepondues: 0, moiRendu: true })[0].rendu === true,
  );
  // le refus de repondre_salle, tel que repondreSalle le lève (SalleErreur au message repris tel quel)
  const refus = new SalleErreur({ code: "P0001", message: "Ta copie est rendue : tu ne peux plus répondre." });
  check(
    "refusCopieRendue : reconnaît le refus du serveur après la copie rendue, et lui seul",
    refusCopieRendue(refus) &&
      refus.message === EXAMEN.copieRendueVerrou &&
      refusCopieRendue("Ta copie est rendue : tu ne peux plus répondre.") &&
      !refusCopieRendue(new SalleErreur({ message: "Le temps est écoulé." })) &&
      !refusCopieRendue(new Error("Réponse invalide.")) &&
      !refusCopieRendue(null) &&
      !refusCopieRendue({ message: 42 }),
  );
  check(
    `clicTropTot : un clic moins de ${GARDE_DOUBLE_CLIC_MS} ms après l'ouverture est la suite d'un double clic`,
    clicTropTot(1_000, 1_000) &&
      clicTropTot(1_000, 1_120) &&
      clicTropTot(1_000, 1_000 + GARDE_DOUBLE_CLIC_MS - 1) &&
      !clicTropTot(1_000, 1_000 + GARDE_DOUBLE_CLIC_MS) &&
      !clicTropTot(1_000, 4_000) &&
      !clicTropTot(1_000, 900) &&
      !clicTropTot(null, 1_000) &&
      !clicTropTot(Number.NaN, 1_000),
  );

  const d = debriefExamen(NB, base.etat.items, base.etat.corrections, finales);
  check("debriefExamen : justes, faux et sans réponse comptés (10 au total)", d.justes + d.faux + d.sans === NB && d.sans === 1 && d.justes === finales.filter((m) => m.juste).length && d.complet);
  const sansCorr = debriefExamen(NB, base.etat.items, base.etat.corrections.slice(0, 4), finales);
  check("debriefExamen : des corrections manquent → incomplet, les lignes restent", !sansCorr.complet && sansCorr.lignes.length === NB && sansCorr.lignes[6].correction === null);
  check("debriefExamen : une réponse masquée (juste null) n'est jamais « juste »", debriefExamen(NB, base.etat.items, [], finales.map(masquee)).justes === 0);
}

console.log("# le décompte");
{
  const html = rendreExamen("decompte");
  check("le décompte : « L'examen démarre », le 3 du décompte, la règle (réponse modifiable jusqu'à la remise, correction à la fin, 1 000 points)", html.includes("L'examen démarre") && /class="decompteChiffre" data-fin="1"[^>]*>3</.test(html) && html.includes("change une réponse tant que ta copie") && html.includes("1 000 points"));
  check("le décompte : les réglages disent « chrono global 7 min 30 s »", html.includes("chrono global 7 min 30 s"));
  check("le décompte : pas encore de question", !html.includes("examen-question") && !html.includes('role="radio"'));
}

console.log("# la partie en cours (réponses 1, 2 et 5 données)");
{
  const html = rendreExamen("cours");
  check("le chrono global : 5:00 et son libellé lisible", html.includes(">5:00<") && html.includes('role="timer"') && html.includes('aria-label="Temps restant : 5 min"'));
  check("ma progression : 3 / 10 répondues", /3<small>\/10<\/small>/.test(html) && html.includes('aria-label="3 réponses sur 10"'));
  check("la grille : 10 numéros, 3 répondus, la 3e affichée (première sans réponse)", compte(html, /class="case"/g) === 10 && casesRepondues(html) === 3 && /aria-current="step"[^>]*>3</.test(html));
  check("la grille au clavier : une seule case dans l'ordre de tabulation (l'affichée)", compte(html, /class="case"[^>]*tabindex="0"/gi) === 1 && compte(html, /class="case"[^>]*tabindex="-1"/gi) === 9);
  check("la question 3 / 10, à répondre, avec ses étiquettes", /Question <b>3<\/b> \/ 10/.test(html) && html.includes("À répondre"));
  check("les choix : 4 boutons radio, aucun coché, « Valider et continuer » désactivé", compte(html, /role="radio"/g) === 4 && compte(html, /aria-checked="true"/g) === 0 && boutonDe(html, "Valider et continuer").includes('disabled=""'));
  check("définitif et clavier annoncés", html.includes("Une réponse par question, définitive") && html.includes("Entrée pour valider"));
  check("JAMAIS de verdict ni de correction avant la fin", !/>Juste</.test(html) && !/>Faux</.test(html) && !html.includes("Bonne réponse") && !html.includes("data-verdict") && secrets.every((x) => !html.includes(x)));
  check("pas de classement ni de points pendant la partie", !html.includes("partie-classement") && !html.includes("Tes points") && !html.includes("Vaut"));
  check("l'avancement des autres : Inès B. 7 / 10, Marc L. 5 / 10, ma ligne surlignée", html.includes("Inès B.") && html.includes(">7 / 10<") && html.includes(">5 / 10<") && compte(html, /data-moi="1"/g) === 1);
  check("navigation : précédente et suivante", html.includes("Précédente") && html.includes("Suivante"));
  check("admin : « Arrêter la partie » ; membre : non", html.includes("Arrêter la partie") && !rendreExamen("cours", { admin: false }).includes("Arrêter la partie"));
  check("pas encore « Tout est répondu »", !html.includes("Tout est répondu"));
}

console.log("# un calcul en chrono global");
{
  const calc = base.etat.items.find((i) => i.origine === "calcul");
  check("l'exemple a un calcul", Boolean(calc));
  if (calc) {
    const html = rendreExamen("cours", { repondues: Array.from({ length: calc.position }, (_, i) => i) });
    check("le calcul : un champ, l'unité, « Valider et continuer », pas de choix", html.includes('id="examen-calcul"') && html.includes('inputMode="decimal"') && html.includes("Valider et continuer") && compte(html, /role="radio"/g) === 0);
    check("le calcul : jamais la bonne valeur ni les étapes", !html.includes("Le calcul pas à pas") && secrets.every((x) => !html.includes(x)));
  }
}

console.log("# une réponse enregistrée, puis tout répondu");
{
  const html = rendreExamen("tout");
  const q0 = finales.find((m) => m.position === 0)!;
  check("tout répondu : « Tout est répondu : rends ta copie pour finir plus tôt »", html.includes("Tout est répondu : rends ta copie pour finir plus tôt") && html.includes("elles ne se changent plus"));
  check("la question 1 s'affiche, verrouillée : « Réponse enregistrée » avec le choix retenu", /Question <b>1<\/b>/.test(html) && html.includes("Répondue") && html.includes(`Réponse enregistrée : <b>${"ABCD"[q0.choix ?? 0]}</b>`));
  check("le choix retenu est marqué (sans verdict), les autres estompés, tous désactivés", compte(html, /data-etat="retenu"/g) === 1 && compte(html, /data-etat="estompe"/g) === 3 && compte(html, /role="radio"[^>]*disabled=""/g) + compte(html, /disabled=""[^>]*role="radio"/g) === 4 && !html.includes("Valider et continuer"));
  check("toujours aucun verdict ni correction", !/>Juste</.test(html) && !/>Faux</.test(html) && !html.includes("Bonne réponse") && secrets.every((x) => !html.includes(x)));
  check("la grille : les 10 répondues", casesRepondues(html) === 10);
  const locale: ReponseOk = { ok: true, deja: false, masque: true, juste: false, points: 0, delaiMs: 1, choix: 2, valeur: null, bonneIndex: null, bonneValeur: null, explication: null, etapes: [] };
  const avecLocale = rendreExamen("cours", { repondues: [0, 1], locales: { 2: locale } });
  check("une réponse que le serveur vient de rendre compte tout de suite (3 / 10), on passe à la suivante sans réponse", /3<small>\/10<\/small>/.test(avecLocale) && /Question <b>4<\/b>/.test(avecLocale));
}

console.log("# rendre sa copie");
{
  const rendreDe = (html: string) => boutonDe(html, ">Rendre ma copie<");
  // en jeu : l'invite discrète, le bouton secondaire (contour, pas d'encre)
  const enJeu = rendreExamen("cours");
  check("en jeu : « Rendre ma copie » toujours là, avec l'invite", enJeu.includes("Rendre ma copie") && enJeu.includes("Fini avant le chrono ?") && enJeu.includes('data-etat="invite"'));
  check("le bouton est secondaire : contour fin, jamais d'encre", /class="btn rendreBtn"/.test(rendreDe(enJeu)) && !rendreDe(enJeu).includes("rl-encre") && rendreDe(enJeu).includes('data-avant="0"') && !rendreDe(enJeu).includes("disabled"));
  check("le bloc est au-dessus de la question (sous la grille)", enJeu.indexOf("Rendre ma copie") > enJeu.indexOf('class="numeros"') && enJeu.indexOf("Rendre ma copie") < enJeu.indexOf('id="examen-question"'));
  check("pas de confirmation tant qu'on n'a pas cliqué, ni de « copie rendue »", !enJeu.includes("Tu ne pourras plus répondre") && !enJeu.includes("Copie rendue.") && !enJeu.includes("copie rendue<"));
  check("un seul « Rendre ma copie » dans la page", compte(enJeu, />Rendre ma copie</g) === 1);

  // tout répondu : le bloc passe en avant
  const tout = rendreExamen("tout");
  check("tout répondu : le bloc passe en avant (bouton en os, toujours sans encre)", tout.includes('data-etat="avant"') && rendreDe(tout).includes('data-avant="1"') && !rendreDe(tout).includes("rl-encre") && tout.includes("Tout est répondu : rends ta copie pour finir plus tôt"));

  // la confirmation, dans la page
  const conf = rendre(<RendreCopie nb={NB} nbRepondues={7} rendue={false} onRendre={async () => {}} ouverte />);
  check("confirmation : « Rendre ta copie ? Tu ne pourras plus répondre. », dans la page", conf.includes("Rendre ta copie ? Tu ne pourras plus répondre.") && conf.includes('role="group"') && conf.includes('aria-labelledby="examen-rendre-titre"'));
  check("confirmation : le nombre de questions sans réponse (3), mis en avant", conf.includes("3 questions sans réponse.") && conf.includes('data-manque="1"'));
  check("confirmation : « Rendre ma copie » et « Continuer », sans encre", conf.includes(">Rendre ma copie<") && conf.includes(">Continuer<") && !conf.includes("rl-encre") && compte(conf, /<button/g) === 2);
  const conf1 = rendre(<RendreCopie nb={NB} nbRepondues={NB - 1} rendue={false} onRendre={async () => {}} ouverte />);
  const confTout = rendre(<RendreCopie nb={NB} nbRepondues={NB} rendue={false} onRendre={async () => {}} ouverte />);
  check("confirmation : « 1 question sans réponse. » au singulier ; rien ne manque → pas d'alerte", conf1.includes("1 question sans réponse.") && confTout.includes("Toutes les questions ont une réponse.") && confTout.includes('data-manque="0"') && !confTout.includes("sans réponse."));
  const sources = fs.readFileSync(path.join(process.cwd(), "components/salles/PartieExamen.tsx"), "utf8");
  check("jamais de fenêtre du navigateur pour confirmer (window.confirm)", !/window\.confirm|\bconfirm\(/.test(sources));
  // les clics ne se rejouent pas sans navigateur : on vérifie que les gardes sont bien branchées
  check(
    "double clic : la confirmation ignore un clic trop proche de son ouverture (« Rendre ma copie » et « Continuer »)",
    /onClick=\{\(e\) => ouvrir\(e\.timeStamp\)\}/.test(sources) &&
      /onClick=\{\(e\) => void confirmer\(e\.timeStamp\)\}/.test(sources) &&
      /onClick=\{\(e\) => fermer\(e\.timeStamp\)\}/.test(sources) &&
      compte(sources, /clicTropTot\(ouverteA\.current, quand\)/g) === 2,
  );
  check(
    "double clic : la remise ne part qu'une fois (garde synchrone, pas seulement l'état « envoi »)",
    /if \(envoiRef\.current \|\| clicTropTot\(ouverteA\.current, quand\)\) return;\s*envoiRef\.current = true;/.test(sources),
  );
  check(
    "refus du serveur (« Ta copie est rendue… ») : l'écran se verrouille tout de suite, sans message en double",
    /repondre=\{\(rep\) => repondreIci\(courante, rep\)\}/.test(sources) && /if \(refusCopieRendue\(e\)\) \{\s*setRendueIci\(session\.id\);/.test(sources) && sources.includes("{erreur && !verrouillee && ("),
  );

  // copie rendue (le serveur le dit) : tout est verrouillé, la relecture reste
  const rendue = rendreExamen("cours", { rendus: [MOI] });
  check("copie rendue : « Copie rendue. La correction arrive quand tout le monde a rendu sa copie, ou à la fin du chrono. »", rendue.includes("Copie rendue.") && rendue.includes("La correction arrive quand tout le monde a rendu sa copie, ou à la fin du chrono.") && rendue.includes('data-etat="rendue"'));
  check("copie rendue : plus de bouton « Rendre ma copie »", !rendue.includes(">Rendre ma copie<") && !rendue.includes("Fini avant le chrono ?"));
  check(
    "copie rendue : les choix désactivés, aucun coché, « Valider » désactivé",
    compte(rendue, /role="radio"/g) === 4 && compte(rendue, /role="radio"[^>]*disabled=""/g) + compte(rendue, /disabled=""[^>]*role="radio"/g) === 4 && compte(rendue, /aria-checked="true"/g) === 0 && boutonDe(rendue, "Valider et continuer").includes('disabled=""'),
  );
  check("copie rendue : « Ta copie est rendue : tu ne peux plus répondre. », la question dit « Sans réponse »", rendue.includes("Ta copie est rendue : tu ne peux plus répondre.") && rendue.includes(">Sans réponse<") && !rendue.includes(">À répondre<"));
  check("copie rendue : la navigation et la grille restent (relecture)", !boutonDe(rendue, "Précédente").includes("disabled") && !boutonDe(rendue, "Suivante").includes("disabled") && compte(rendue, /class="case"[^>]*disabled/g) === 0 && compte(rendue, /class="case"/g) === NB);
  check("copie rendue : toujours aucun verdict ni correction", !/>Juste</.test(rendue) && !/>Faux</.test(rendue) && !rendue.includes("Bonne réponse") && secrets.every((x) => !rendue.includes(x)));
  check("copie rendue : le chrono court toujours (les autres jouent)", rendue.includes('role="timer"') && rendue.includes(">5:00<"));
  const rendueTout = rendreExamen("tout", { rendus: [MOI] });
  check("copie rendue, tout répondu : la question 1 se relit, « Réponse enregistrée »", /Question <b>1<\/b>/.test(rendueTout) && rendueTout.includes("Réponse enregistrée") && rendueTout.includes("Copie rendue.") && !rendueTout.includes(">Rendre ma copie<"));
  const calc = base.etat.items.find((i) => i.origine === "calcul");
  if (calc) {
    const rendueCalc = rendreExamen("cours", { repondues: Array.from({ length: calc.position }, (_, i) => i), rendus: [MOI] });
    check("copie rendue, un calcul : le champ désactivé", /id="examen-calcul"[^>]*disabled=""/.test(rendueCalc) || /disabled=""[^>]*id="examen-calcul"/.test(rendueCalc));
    check("copie rendue, un calcul : « Valider » désactivé", boutonDe(rendueCalc, "Valider et continuer").includes('disabled=""') && rendueCalc.includes("Ta copie est rendue : tu ne peux plus répondre."));
  }

  // « Où en sont les joueurs » : un repère « copie rendue » par joueur
  const deux = rendreExamen("cours", { rendus: ["u0", MOI] });
  check("avancement : un repère « copie rendue » pour chaque joueur qui a rendu (Inès B. et moi)", compte(deux, /class="joueurRendu"/g) === 2 && compte(deux, / copie rendue<\/span>/g) === 2 && compte(deux, /data-rendu="1"/g) === 2 && compte(deux, /data-rendu="0"/g) >= 1);
  const ines = deux.slice(deux.indexOf("Inès B."), deux.indexOf("</li>", deux.indexOf("Inès B.")));
  const marc = deux.slice(deux.indexOf("Marc L."), deux.indexOf("</li>", deux.indexOf("Marc L.")));
  check("avancement : le repère est sur la bonne ligne (Inès B. oui, Marc L. non), le compte reste", ines.includes("copie rendue") && ines.includes("7 / 10") && !marc.includes("copie rendue") && marc.includes("5 / 10"));
  check("avancement : personne n'a rendu → aucun repère", !enJeu.includes("joueurRendu") && !enJeu.includes("copie rendue<") && compte(enJeu, /data-rendu="1"/g) === 0);
  check("l'aide de l'avancement parle des copies rendues", enJeu.includes("Le nombre de réponses et les copies rendues seulement"));

  // tout le monde a rendu : la partie est terminée avant fin_at, le débrief s'ouvre
  const { etat } = partieGlobale("fin");
  const finTot = rendre(
    <PartieExamen
      session={{ ...etat.session!, statut: "terminee", phase: "fin", finAt: new Date(DEBUT + 150_000).toISOString() }}
      items={etat.items}
      corrections={etat.corrections}
      mesReponses={etat.mesReponses}
      locales={{}}
      classement={etat.classement}
      monClassement={etat.monClassement}
      membres={etat.membres}
      moi={{ userId: MOI, username: "Toi", avatarUrl: null }}
      estAdmin={false}
      t={DEBUT + 150_500}
      repondre={async () => ({ ok: false, raison: "format", indice: "" })}
      rendreCopie={async () => COPIE}
    />,
  );
  check("tout le monde a rendu (partie terminée avant le chrono) : podium et débrief, plus de « Rendre ma copie »", finTot.includes("gagne la partie") && finTot.includes("Le débrief") && !finTot.includes("Rendre ma copie") && !finTot.includes('role="timer"'));
}

console.log("# la fin : podium, bilan et débrief");
{
  const html = rendreExamen("fin");
  check("le podium et le bilan de la fin de partie", html.includes("Partie 2 · résultats") && html.includes("gagne la partie") && html.includes("Ton bilan"));
  check("pas de « Revoir les questions » ni de délai moyen : le débrief les remplace", !html.includes("Revoir les questions") && !html.includes("en moyenne"));
  const d = debriefExamen(NB, base.etat.items, base.etat.corrections, finales);
  check(`le débrief : « ${d.justes} / 10 justes », faux et sans réponse`, html.includes("Le débrief") && new RegExp(`${d.justes}<small> / 10 justes</small>`).test(html) && html.includes(`${d.faux} faux · ${d.sans} sans réponse`));
  check("une case par question, cliquable, qui dit juste / faux / sans réponse", compte(html, /class="serieCase"/g) === 10 && html.includes('aria-label="9 · Sans réponse"'));
  check("le filtre « Mes erreurs » est actif par défaut (il y a des erreurs)", /aria-pressed="true"[^>]*>Mes erreurs/.test(html) && /aria-pressed="false"[^>]*>Tout/.test(html));
  const erreurs = d.faux + d.sans;
  check(`seules les ${erreurs} erreurs (faux et sans réponse) sont listées`, compte(html, /class="carte"/g) === erreurs && compte(html, /class="verdict" data-v="juste"/g) === 0);
  check("chaque erreur : ma réponse, la bonne réponse, l'explication ouverte", html.includes("Bonne réponse") && html.includes(">toi<") && compte(html, /<p class="libelle">Explication<\/p>/g) >= 1 && !html.includes("Voir l'explication"));
  check("les cartes portent leur ancre (#examen-q-N) pour les cases de la série", /id="examen-q-\d+"/.test(html));
  check("plus de chrono ni de grille de jeu", !html.includes('role="timer"') && !html.includes('class="case"'));
  const membre = rendreExamen("fin", { admin: false });
  check("membre : pas de « Rejouer », le débrief est là", !/Rejouer<\/button>/.test(membre) && membre.includes("Le débrief"));
}

console.log("# le débrief en entier (« Tout »)");
{
  // pas d'erreur : le filtre part sur « Tout »
  const items = base.etat.items;
  const toutesJustes: SalleMaReponse[] = items.map((i) => ({ position: i.position, choix: i.origine === "calcul" ? null : 0, valeur: i.origine === "calcul" ? 1 : null, juste: true, points: 1000, delaiMs: 0 }));
  const html = rendre(<DebriefExamen nb={NB} items={items} corrections={base.etat.corrections} mesReponses={toutesJustes} />);
  check("sans erreur : « Tout » actif, toutes les questions, l'explication à la demande", /aria-pressed="true"[^>]*>Tout/.test(html) && compte(html, /class="carte"/g) === items.length && html.includes("Voir l'explication") && compte(html, /<details class="explication"/g) >= 1);
}

console.log("# la fin avant l'arrivée des corrections");
{
  const html = rendreExamen("finSansCorrections");
  check("« La correction arrive… » tant que les corrections ne sont pas là", html.includes("La correction arrive…") && !html.includes("Bonne réponse"));
}

console.log("# la fin à l'horloge, avant la lecture qui la confirme");
{
  // le chrono local est à zéro, mais l'état lu est encore celui de la partie : session en cours,
  // réponses masquées (juste null), classement à 0 → ni podium, ni bilan, ni « faux »
  const { etat } = partieGlobale("cours", { repondues: [0, 1, 2, 3] });
  const html = rendre(
    <PartieExamen
      session={etat.session!}
      items={etat.items}
      corrections={[]}
      mesReponses={etat.mesReponses}
      locales={{}}
      classement={etat.classement}
      monClassement={null}
      membres={etat.membres}
      moi={{ userId: MOI, username: "Toi", avatarUrl: null }}
      estAdmin
      t={FIN + 500}
      repondre={async () => ({ ok: false, raison: "format", indice: "" })}
      rendreCopie={async () => COPIE}
    />,
  );
  check("« Temps écoulé », la correction et le classement arrivent", html.includes("Temps écoulé") && html.includes("La correction et le classement arrivent…"));
  check("rien qui ressemble à un résultat : ni podium, ni bilan, ni faux, ni débrief", !html.includes("gagne la partie") && !html.includes("Ton bilan") && !/>Faux</.test(html) && !html.includes("Le débrief") && secrets.every((x) => !html.includes(x)));
  check("plus de chrono ni de grille de jeu", !html.includes('role="timer"') && !html.includes('class="case"'));
  const ses = etat.session!;
  check(
    "finRevelee : seulement quand le serveur a fini et rendu la justesse",
    !finRevelee(ses, etat.mesReponses) &&
      !finRevelee({ statut: "terminee", phase: "fin" }, etat.mesReponses) &&
      finRevelee({ statut: "terminee", phase: "fin" }, finales) &&
      finRevelee({ statut: "terminee", phase: "fin" }, []) &&
      !finRevelee({ statut: "en_cours", phase: "question" }, finales),
  );
  check("debriefExamen : des réponses encore masquées → incomplet, même avec toutes les corrections", !debriefExamen(NB, base.etat.items, base.etat.corrections, finales.map(masquee)).complet);
}

console.log("# un mock de 90 questions");
{
  const NB90 = 90;
  const items90 = Array.from({ length: NB90 }, (_, pos) => {
    const modele = base.etat.items.filter((i) => i.origine === "question")[pos % 3];
    return { ...modele, position: pos };
  });
  const s = partieGlobale("cours").etat.session!;
  const debut = Date.parse(s.startedAt);
  const ses90: SalleSession = { ...s, nb: NB90, temps: 90, finAt: new Date(debut + NB90 * 90_000).toISOString(), nbVisibles: NB90, avancement: [{ userId: "u0", n: 60, rendu: false }, { userId: MOI, n: 45, rendu: false }] };
  const mes90: SalleMaReponse[] = Array.from({ length: 45 }, (_, pos) => ({ position: pos, choix: 0, valeur: null, juste: null, points: null, delaiMs: pos * 1_000 }));
  const html = rendre(
    <PartieExamen
      session={ses90}
      items={items90}
      corrections={[]}
      mesReponses={mes90}
      locales={{}}
      classement={[]}
      monClassement={null}
      membres={base.etat.membres}
      moi={{ userId: MOI, username: "Toi", avatarUrl: null }}
      estAdmin={false}
      t={debut + 3_600_000}
      repondre={async () => ({ ok: false, raison: "format", indice: "" })}
      rendreCopie={async () => COPIE}
    />,
  );
  check("90 numéros, 45 répondus, la 46e affichée", compte(html, /class="case"/g) === NB90 && casesRepondues(html) === 45 && /aria-current="step"[^>]*>46</.test(html));
  check("une seule case dans l'ordre de tabulation sur 90", compte(html, /class="case"[^>]*tabindex="0"/gi) === 1 && compte(html, /class="case"[^>]*tabindex="-1"/gi) === NB90 - 1);
  check("progression 45 / 90, chrono global 1:15:00 (90 × 90 s − 1 h)", /45<small>\/90<\/small>/.test(html) && html.includes(">1:15:00<"));
  check("question 46 / 90 affichée, suivante et précédente actives", /Question <b>46<\/b> \/ 90/.test(html) && !boutonDe(html, "Précédente").includes("disabled") && !boutonDe(html, "Suivante").includes("disabled"));
  check("toujours aucun verdict sur 90 questions", !/>Juste</.test(html) && !/>Faux</.test(html) && !html.includes("Bonne réponse"));
  check("prochaineNonRepondue sur 90 : après la 90e, on repart au début", prochaineNonRepondue(NB90, new Set(Array.from({ length: 89 }, (_, i) => i + 1)), 89) === 0 && prochaineNonRepondue(NB90, new Set([45]), 45) === 46);
}

console.log("# styles");
{
  const css = fs.readFileSync(path.join(process.cwd(), "components/salles/Examen.module.css"), "utf8");
  const classes = new Set([...css.matchAll(/\.([a-zA-Z][\w]*)/g)].map((m) => m[1]));
  const sources = ["PartieExamen", "DebriefExamen"].map((n) => fs.readFileSync(path.join(process.cwd(), `components/salles/${n}.tsx`), "utf8")).join("\n");
  const utilisees = new Set([...sources.matchAll(/\bx\.([a-zA-Z]\w*)/g)].map((m) => m[1]));
  const manquantes = [...utilisees].filter((c) => !classes.has(c));
  check("toutes les classes d'Examen.module.css utilisées existent", manquantes.length === 0, manquantes.join(", "));
  const partie = fs.readFileSync(path.join(process.cwd(), "components/salles/Partie.module.css"), "utf8");
  const classesPartie = new Set([...partie.matchAll(/\.([a-zA-Z][\w]*)/g)].map((m) => m[1]));
  const manquantesP = [...new Set([...sources.matchAll(/\bp\.([a-zA-Z]\w*)/g)].map((m) => m[1]))].filter((c) => !classesPartie.has(c));
  check("les classes de Partie.module.css reprises existent", manquantesP.length === 0, manquantesP.join(", "));
  check("aucune animation dans Examen.module.css (rien à couper en mouvement réduit)", !/\banimation\s*:/.test(css) && !/@keyframes/.test(css));
  check("aucun antislash dans le CSS (piège Tailwind)", !css.includes("\\"));
  check("la grille passe à la ligne et défile (téléphone)", /\.numeros\s*\{[^}]*flex-wrap:\s*wrap[^}]*overflow-y:\s*auto/.test(css) && css.includes("@media (max-width: 600px)"));
}

console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
process.exit(ko ? 1 : 0);
