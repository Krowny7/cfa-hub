// Tests légers du débrief des examens blancs (V3 §7.6) et des quatre tailles
// de fête (V3 §3.10), sans base ni réseau ni navigateur (rendu statique par
// react-dom/server).
//   npx tsx --tsconfig tsconfig.json scripts/profil/test-debrief.tsx
// Vérifie : etatDepuis (réponse de blanc_debrief_lire, illisible → null),
// avecCause (classée une fois, cause modifiable), la répartition (visible à
// 80 %, triée, arrondie, « 30 % de lecture »), le temps par question
// (« 1 min 32 », cible 75 à 110 s), les replis (section absente : lecture
// null, toucher « absente », jamais d'erreur ; mes_causes lue) ; le rendu
// de la correction avec le débrief (en-tête, cinq causes sous chaque
// question ratée seulement, ancres), et sans la section (boutons masqués,
// temps affiché) ; Fete : les quatre tailles, Échap, durées, mouvement
// réduit (rendu final d'emblée, réplique comprise), le format « +50 XP ».
import "./sans-css";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CAUSES,
  DEBRIEF,
  avecCause,
  causesDepuis,
  debriefAbsent,
  dureeCourte,
  etatDepuis,
  etatVide,
  hrefDebrief,
  ligneRepartition,
  lireDebrief,
  lireMesCauses,
  noterCause,
  repartition,
  repartitionVisible,
  rythme,
  secondesDe,
} from "@/lib/debrief";
import type { ReviewQuestion } from "@/components/session/review";
import { ReviewSection } from "@/components/session/parts";
import { DebriefCopie, EnteteDebrief, piedDebrief } from "@/components/session/Debrief";
import { DUREE_FETE, FeteVue, etapeInitiale, texteXp, touchePasse } from "@/components/fete/Fete";

// tsx compile le JSX à l'ancienne (React.createElement) : React global pour les composants rendus
(globalThis as { React?: typeof React }).React = React;

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const NB = String.fromCharCode(160);
const sansNbsp = (t: string) => t.split(NB).join(" ");

async function main() {
  // ── l'état d'une copie ──────────────────────────────────────────────
  const brut = { erreurs: 20, classees: 3, causes: { savoir: 1, lecture: 2, calcul: 0, temps: 0, chance: 0 }, notes: { a: "savoir", b: "lecture", c: "lecture", d: "inconnue" }, secondesParQuestion: 92 };
  const e = etatDepuis(brut);
  check("etatDepuis : comptes, causes, notes (cause inconnue ignorée), temps", !!e && e.erreurs === 20 && e.classees === 3 && e.causes.lecture === 2 && e.notes.b === "lecture" && !("d" in e.notes) && e.secondesParQuestion === 92, JSON.stringify(e));
  check("etatDepuis : illisible ou copie inconnue → null", etatDepuis(null) === null && etatDepuis([]) === null && etatDepuis({ autre: 1 }) === null);
  check("etatDepuis : sans durée → temps null", etatDepuis({ ...brut, secondesParQuestion: null })?.secondesParQuestion === null);

  const v = etatVide(3);
  const v1 = avecCause(v, "q1", "lecture");
  const v2 = avecCause(v1, "q1", "calcul");
  const v3 = avecCause(v2, "q1", "calcul");
  check("avecCause : classée une fois, cause modifiable, même cause sans effet", v1.classees === 1 && v1.causes.lecture === 1 && v2.classees === 1 && v2.causes.lecture === 0 && v2.causes.calcul === 1 && v3 === v2);
  check("avecCause : jamais plus de classées que d'erreurs", avecCause(avecCause(etatVide(1), "a", "temps"), "b", "temps").classees === 1);

  // ── la répartition ──────────────────────────────────────────────────
  const r = { ...etatVide(10), classees: 8, causes: { savoir: 2, lecture: 3, calcul: 2, temps: 1, chance: 0 } };
  check("répartition visible à 80 % (8/10), pas à 7/10", repartitionVisible(r) && !repartitionVisible({ ...r, classees: 7 }) && !repartitionVisible(etatVide(0)));
  const rep = repartition(r);
  check("répartition : triée (plus fréquente d'abord, ordre des boutons à égalité), arrondie, sans les causes vides",
    rep.map((x) => x.cause).join(",") === "lecture,savoir,calcul,temps" && rep[0].pct === 38 && rep[1].pct === 25, JSON.stringify(rep));
  check("« 30 % de lecture »", sansNbsp(DEBRIEF.part(30, "lecture")) === "30 % de lecture" && sansNbsp(ligneRepartition(r)).startsWith("38 % de lecture · 25 % de savoir"), sansNbsp(ligneRepartition(r)));
  check("« Débrief : 12/20 erreurs classées » (singulier à 1)", DEBRIEF.avancement(12, 20) === "12/20 erreurs classées" && DEBRIEF.avancement(0, 1) === "0/1 erreur classée");
  check("cinq causes, dans l'ordre des boutons", CAUSES.map((c) => c.libelle).join(" · ") === "Savoir · Lecture de l'énoncé · Calcul · Temps · Chance");

  // ── le temps par question ───────────────────────────────────────────
  check("« 1 min 32 », « 48 s », « 2 min »", sansNbsp(dureeCourte(92)) === "1 min 32" && sansNbsp(dureeCourte(48)) === "48 s" && sansNbsp(dureeCourte(120)) === "2 min");
  check("« 1 min 32 par question · cible 75 à 110 s »", sansNbsp(DEBRIEF.temps(92)) === "1 min 32 par question" && sansNbsp(DEBRIEF.cible) === "cible 75 à 110 s");
  check("secondesDe : durée / questions, null sans durée", secondesDe(5400, 60) === 90 && secondesDe(null, 60) === null && secondesDe(600, 0) === null);
  check("rythme : vite / cible / lent", rythme(60) === "vite" && rythme(75) === "cible" && rythme(110) === "cible" && rythme(111) === "lent");
  check("le lien du Codex : /mock-exams/<ref>?debrief=1", hrefDebrief("abc") === "/mock-exams/abc?debrief=1");

  // ── les replis (section §5 absente) ─────────────────────────────────
  const absente = { code: "PGRST202", message: "Could not find the function public.blanc_debrief_lire" };
  const client = (err: unknown, data: unknown = null) => ({ rpc: async () => ({ data, error: err }) }) as unknown as SupabaseClient;
  const jette = { rpc: async () => { throw new Error("réseau"); } } as unknown as SupabaseClient;
  check("debriefAbsent : fonction ou table absente", debriefAbsent(absente) && debriefAbsent({ code: "42P01" }) && !debriefAbsent({ code: "P0001", message: "Not a missed question" }));
  check("lireDebrief : section absente → null, réseau coupé → null", (await lireDebrief(client(absente), "blanc", "x")) === null && (await lireDebrief(jette, "blanc", "x")) === null);
  check("lireDebrief : la réponse lue", (await lireDebrief(client(null, brut), "blanc", "x"))?.classees === 3);
  const nAbs = await noterCause(client(absente), "blanc", "x", "q", "savoir");
  const nRef = await noterCause(client({ code: "P0001", message: "Not a missed question" }), "blanc", "x", "q", "savoir");
  const nOk = await noterCause(client(null, { erreurs: 4, classees: 2 }), "officiel", "x", "q", "savoir");
  const mc = causesDepuis({ savoir: 20, lecture: 40, calcul: 20, temps: 20, chance: 0, n: 5 });
  check("causesDepuis (mes_causes) : % par cause et n ; illisible → null", mc?.n === 5 && mc.parts.lecture === 40 && mc.parts.chance === 0 && causesDepuis({ savoir: 1 }) === null && causesDepuis(null) === null);
  check("lireMesCauses : section absente → null ; lue", (await lireMesCauses(client(absente))) === null && (await lireMesCauses(client(null, { lecture: 30, n: 10 })))?.parts.lecture === 30);
  check("noterCause : absente / refusée / enregistrée", !nAbs.ok && nAbs.absente && !nRef.ok && !nRef.absente && nOk.ok && nOk.classees === 2, JSON.stringify({ nAbs, nRef, nOk }));

  // ── le rendu de la correction avec le débrief ───────────────────────
  const qr = (id: string, ok: boolean, sel: number | null): ReviewQuestion => ({
    question_id: id, prompt: `Question ${id}`, choices: ["A", "B", "C"], correct_index: 0, explanation: null, topic: null, selected_index: sel, is_correct: ok,
  });
  const review = [qr("q1", true, 0), qr("q2", false, 1), qr("q3", false, null)];
  const etat = { ...etatVide(2, 92), classees: 1, causes: { savoir: 0, lecture: 1, calcul: 0, temps: 0, chance: 0 }, notes: { q2: "lecture" as const } };
  const avec = renderToStaticMarkup(
    <DebriefCopie copie={{ source: "blanc", ref: "e1", initial: etat }} review={review} demo>
      <ReviewSection review={review} defaultOpen entete={(o) => <EnteteDebrief ouvrir={o} />} piedDe={piedDebrief} />
    </DebriefCopie>,
  );
  const texte = sansNbsp(avec.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").split("&#x27;").join("'"));
  check("en-tête : « Débrief : 1/2 erreurs classées », le temps et sa cible", texte.includes("Débrief : 1/2 erreurs classées") && texte.includes("1 min 32 par question") && texte.includes("cible 75 à 110 s"), texte.slice(0, 300));
  check("en-tête : sous 80 %, l'invitation et « Reprendre le débrief »", texte.includes(DEBRIEF.aClasser) && texte.includes(DEBRIEF.reprendre));
  const groupes = avec.match(/data-debrief/g)?.length ?? 0;
  check("cinq causes sous chaque question ratée (2), aucune sous la juste", groupes === 2 && (avec.match(/aria-pressed=/g)?.length ?? 0) === 10, String(groupes));
  check("la cause choisie est enfoncée (aria-pressed) et modifiable (les autres restent touchables)", (avec.match(/aria-pressed="true"/g)?.length ?? 0) === 1 && /aria-pressed="true"[^>]*>Lecture de l(&#x27;|')énoncé</.test(avec));
  check("chaque question porte son ancre (?debrief=1 y mène)", avec.includes('id="revue-q2"') && avec.includes('id="revue-q3"'));
  const fini = { ...etat, classees: 2, causes: { ...etat.causes, calcul: 1 }, notes: { q2: "lecture" as const, q3: "calcul" as const } };
  const tout = sansNbsp(renderToStaticMarkup(
    <DebriefCopie copie={{ source: "blanc", ref: "e1", initial: fini }} review={review} demo>
      <EnteteDebrief />
    </DebriefCopie>,
  ));
  check("à 80 % : la répartition (« 50 % de lecture · 50 % de calcul ») et « Toutes tes erreurs sont classées. »", tout.includes("50 % de lecture · 50 % de calcul") && tout.includes(DEBRIEF.fini), tout);

  const sans = sansNbsp(renderToStaticMarkup(
    <DebriefCopie copie={{ source: "blanc", ref: "e1", initial: null, secondesParQuestion: 75 }} review={review} demo>
      <ReviewSection review={review} defaultOpen entete={(o) => <EnteteDebrief ouvrir={o} />} piedDe={piedDebrief} />
    </DebriefCopie>,
  ));
  check("sans la section : boutons de cause masqués, temps par question affiché", !sans.includes("data-debrief") && !sans.includes("Débrief :") && sans.includes("1 min 15 par question"));
  const nu = renderToStaticMarkup(<ReviewSection review={review} defaultOpen />);
  check("ReviewSection sans débrief : inchangée (ni ancre ni causes)", !nu.includes("revue-") && !nu.includes("data-debrief") && nu.includes("Question q2"));

  // ── Fete : les quatre tailles ───────────────────────────────────────
  const rien = () => undefined;
  const ligne = renderToStaticMarkup(<FeteVue taille="ligne" titre="Contrat tenu" xp={20} etape="posee" onPasser={rien} />);
  check("ligne : « Contrat tenu · +20 XP », annoncée (role status), un bouton (clic : passée)", ligne.includes('data-fete="ligne"') && ligne.includes('role="status"') && sansNbsp(ligne.replace(/<[^>]+>/g, "")).includes("Contrat tenu · +20 XP") && ligne.includes("<button"));
  const carte = renderToStaticMarkup(<FeteVue taille="carte" titre="Premier pas en Quant" sous="Jalon de branche" xp={50} etape="entree" onPasser={rien} />);
  const carteAncre = renderToStaticMarkup(<FeteVue taille="carte" titre="Premier pas" ancre={{ x: 120, y: 340 }} etape="entree" onPasser={rien} />);
  check("carte : centrée, le tampon sur la carte, ou à l'ancre (coordonnées de la quête)", carte.includes('data-fete="carte"') && carte.includes("+50 XP") && !carte.includes("tamponAncre") && carteAncre.includes("tamponAncre") && /left:120px;top:340px/.test(carteAncre));
  const pageEntree = renderToStaticMarkup(<FeteVue taille="page" titre="Acte II clos" replique={{ texte: "La bottega t'attend.", pose: "fier" }} etape="entree" onPasser={rien} />);
  const pagePosee = renderToStaticMarkup(<FeteVue taille="page" titre="Acte II clos" replique={{ texte: "La bottega t'attend.", pose: "fier" }} etape="posee" onPasser={rien} />);
  check("page : la réplique de Léonard une fois la page tournée", !pageEntree.includes("bottega") && pagePosee.includes("bottega") && pagePosee.includes('data-pose="fier"'));
  const plein = renderToStaticMarkup(<FeteVue taille="plein" titre="Maître de FSA" piece="cadre:diamant-taille" partage={{ href: "/share" }} xp={300} etape="posee" onPasser={rien} />);
  check("plein : dialogue modal, la pièce en grand (nom, type, rareté), « Partager », « Continuer »",
    plein.includes('role="dialog"') && plein.includes('aria-modal="true"') && plein.includes("Diamant taillé") && plein.includes("Cadre · pièce rare") && plein.includes('href="/share"') && plein.includes("Partager") && plein.includes("Continuer") && plein.includes("+300 XP"));
  const pleinSans = renderToStaticMarkup(<FeteVue taille="plein" titre="Jour J" piece="cadre:inconnu" etape="posee" onPasser={rien} />);
  check("plein : pièce inconnue ou sans partage → ni pièce ni bouton « Partager »", !pleinSans.includes("pièce") && !pleinSans.includes("Partager") && pleinSans.includes("Continuer"));
  check("durées : ligne 2,5 s, carte 3 s, page 3 s, plein jusqu'au clic", DUREE_FETE.ligne === 2500 && DUREE_FETE.carte === 3000 && DUREE_FETE.page === 3000 && DUREE_FETE.plein === null);
  check("Échap passe la fête (et rien d'autre)", touchePasse("Escape") && touchePasse("Esc") && !touchePasse("Enter") && !touchePasse(" "));
  check("mouvement réduit : rendu final d'emblée", etapeInitiale(true) === "posee" && etapeInitiale(false) === "entree");
  check("« +50 XP », rien à 0", texteXp(50) === "+50 XP" && texteXp(0) === null && texteXp(undefined) === null);
}

main().then(
  () => {
    console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
    process.exit(ko ? 1 : 0);
  },
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
