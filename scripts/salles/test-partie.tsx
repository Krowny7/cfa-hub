// Test de rendu de l'écran de partie des Salles (react-dom/server, sans base,
// réseau ni navigateur) :
//   npx tsx --tsconfig tsconfig.json scripts/salles/test-partie.tsx
// La logique pure (compteurs, verdict, classement en direct, podium, bilan),
// puis l'écran à sept instants d'une partie d'exemple (lib/salles/exemples.ts) :
// le décompte, une question ouverte (jamais la bonne réponse avant le temps),
// un calcul, la réponse juste, la réponse fausse, la pause avec sa correction,
// la fin avec le podium et le bilan (admin : « Rejouer » ; membre : non).
// Les noms de classes des modules CSS sont rendus tels quels ; un dernier
// contrôle lit Partie.module.css (classes utilisées, mouvements coupés).
import "../codex/sans-css";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PartieSalle } from "@/components/salles/PartieSalle";
import { VuePartie } from "@/components/salles/VuePartie";
import type { SuiviSalle } from "@/components/salles/useEtatSalle";
import { ETATS_EXEMPLE, exemplePartie, reponseExemple, type EtatExemple } from "@/lib/salles/exemples";
import {
  bilanJoueur,
  chiffreDecompte,
  correctionVue,
  enUrgence,
  finRecente,
  fractionTemps,
  libelleDelai,
  libellePoints,
  lignesDirectes,
  paramsPourRejouer,
  placeOrdinale,
  podium,
  reponseVue,
  secondesAffichees,
  totalPoints,
  verdictQuestion,
  type ReponseOk,
} from "@/lib/salles/partie";
import type { SalleClassementLigne, SalleMaReponse } from "@/lib/salles/types";

(globalThis as { React?: typeof React }).React = React;

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const compte = (html: string, re: RegExp) => (html.match(re) ?? []).length;
const nettoyer = (html: string) => html.replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/[  ]/g, " ");
const rendre = (el: React.ReactElement): string => {
  try {
    return nettoyer(renderToStaticMarkup(el));
  } catch (e) {
    console.log(e);
    return "";
  }
};

const rendreVue = (nom: EtatExemple, admin = true): string => {
  const { etat, t } = exemplePartie(nom, { admin });
  return rendre(
    <VuePartie
      session={etat.session!}
      items={etat.items}
      corrections={etat.corrections}
      mesReponses={etat.mesReponses}
      locales={{}}
      classement={etat.classement}
      monClassement={etat.monClassement}
      moi={{ userId: etat.moi.userId, username: "Toi", avatarUrl: null }}
      estAdmin={admin}
      t={t}
      repondre={async (position, rep) => reponseExemple(position, rep, t)}
      onArreter={admin ? async () => {} : undefined}
      onRejouer={admin ? async () => ({ ok: true }) : undefined}
      onRetour={() => {}}
    />,
  );
};

const ligne = (rang: number, id: string, points: number, bonnes = 0): SalleClassementLigne => ({ rang, userId: id, username: id.toUpperCase(), avatarUrl: null, points, bonnes, repondues: bonnes, tempsMs: 0 });
const ok = (o: Partial<ReponseOk> = {}): ReponseOk => ({ ok: true, deja: false, juste: true, points: 850, delaiMs: 6000, choix: 1, valeur: null, bonneIndex: 1, bonneValeur: null, explication: "Parce que.", etapes: [], ...o });
const mienne = (position: number, o: Partial<SalleMaReponse> = {}): SalleMaReponse => ({ position, choix: 0, valeur: null, juste: true, points: 700, delaiMs: 9000, ...o });

console.log("# compteurs et verdict");
{
  check("chiffreDecompte : 3, 2, 1 sur les trois dernières secondes, rien avant ni à zéro", chiffreDecompte(3500) === null && chiffreDecompte(3000) === 3 && chiffreDecompte(2001) === 3 && chiffreDecompte(2000) === 2 && chiffreDecompte(1000) === 1 && chiffreDecompte(1) === 1 && chiffreDecompte(0) === null && chiffreDecompte(-5) === null);
  check("secondesAffichees : arrondi au-dessus, jamais négatif", secondesAffichees(400) === 1 && secondesAffichees(1000) === 1 && secondesAffichees(1001) === 2 && secondesAffichees(0) === 0 && secondesAffichees(-50) === 0 && secondesAffichees(Number.NaN) === 0);
  check("fractionTemps : la part qui reste, bornée entre 0 et 1", fractionTemps(22500, 45) === 0.5 && fractionTemps(99999, 45) === 1 && fractionTemps(-1, 45) === 0 && fractionTemps(1000, 0) === 0);
  check("enUrgence : les cinq dernières secondes, pas à zéro", enUrgence(5000) && enUrgence(1) && !enUrgence(5001) && !enUrgence(0));
  check("libelleDelai : « 3,2 s »", libelleDelai(3200) === "3,2 s" && libelleDelai(0) === "0,0 s");
  check("libellePoints : « +850 », jamais de signe moins", libellePoints(850) === "+850" && libellePoints(0) === "+0" && libellePoints(-20) === "+0" && /^\+1.000$/.test(libellePoints(1000).replace(/[  ]/g, ".")));
  check("placeOrdinale : 1er, 2e, 3e", placeOrdinale(1) === "1er" && placeOrdinale(2) === "2e" && placeOrdinale(11) === "11e");

  check("reponseVue : la réponse que le serveur vient de rendre prime sur l'état lu", reponseVue(2, { 2: ok({ juste: false, points: 0, choix: 3 }) }, [mienne(2)])?.juste === false);
  check("reponseVue : sinon celle de l'état lu ; sinon rien", reponseVue(2, {}, [mienne(2)])?.points === 700 && reponseVue(5, {}, [mienne(2)]) === null);
  const cor = [{ position: 0, bonneIndex: 2, bonneValeur: null, explication: "Publique.", etapes: [] }];
  check("correctionVue : la publique d'abord, sinon celle rendue à ma réponse, sinon rien", correctionVue(0, cor, { 0: ok() })?.explication === "Publique." && correctionVue(1, cor, { 1: ok() })?.explication === "Parce que." && correctionVue(2, cor, {}) === null);
  check("verdictQuestion : rien tant qu'on peut répondre, sans réponse après, juste ou faux selon ma réponse", verdictQuestion(true, null) === null && verdictQuestion(false, null) === "sans" && verdictQuestion(true, { choix: 1, valeur: null, juste: true, points: 1, delaiMs: 1 }) === "juste" && verdictQuestion(false, { choix: 1, valeur: null, juste: false, points: 0, delaiMs: 1 }) === "faux");
  check("totalPoints : mes réponses lues et celles rendues, une seule fois par question, hors partie ignorées", totalPoints(10, { 2: ok({ points: 900 }) }, [mienne(0, { points: 800 }), mienne(2, { points: 100 }), mienne(40, { points: 5000 })]) === 1700);
}

console.log("# classement en direct, podium, bilan");
{
  const douze = Array.from({ length: 12 }, (_, i) => ligne(i + 1, `j${i}`, 12000 - i * 700, 10 - (i >> 1)));
  const moiHaut = lignesDirectes(douze, null, { userId: "j2", username: "J2", avatarUrl: null });
  check("lignesDirectes : les huit premiers, ma ligne surlignée à sa place si j'y suis", moiHaut.lignes.length === 8 && !moiHaut.moiEnBas && moiHaut.lignes.filter((l) => l.moi).length === 1 && moiHaut.lignes[2].moi && moiHaut.lignes.every((l, i) => l.emplacement === i));
  const moiBas = lignesDirectes(douze, null, { userId: "j10", username: "J10", avatarUrl: null });
  check("lignesDirectes : plus bas que huitième, ma ligne s'ajoute en dernier emplacement", moiBas.lignes.length === 9 && moiBas.moiEnBas && moiBas.lignes[8].moi && moiBas.lignes[8].userId === "j10" && moiBas.lignes[8].emplacement === 8 && moiBas.lignes[8].rang === 11);
  const hors50 = lignesDirectes(douze.slice(0, 8), { rang: 73, points: 900, bonnes: 2, repondues: 4, tempsMs: 1 }, { userId: "moi", username: "Moi", avatarUrl: null });
  check("lignesDirectes : absent des 50 premiers, la ligne vient de monClassement (rang 73)", hors50.lignes.length === 9 && hors50.lignes[8].rang === 73 && hors50.lignes[8].username === "Moi");
  check("lignesDirectes : un classement vide ne donne aucune ligne", lignesDirectes([], null, { userId: "moi", username: null, avatarUrl: null }).lignes.length === 0);
  check("lignesDirectes : la clé d'une ligne est son joueur (elle glisse au lieu de se recréer)", new Set(moiBas.lignes.map((l) => l.userId)).size === moiBas.lignes.length);

  const ordre = (c: SalleClassementLigne[]) => podium(c).map((m) => `${m.ligne.userId}:${m.place}`).join(" ");
  check("podium : deuxième à gauche, premier au centre, troisième à droite", ordre([ligne(1, "a", 900), ligne(2, "b", 800), ligne(3, "c", 700), ligne(4, "d", 600)]) === "b:2 a:1 c:3");
  check("podium : deux joueurs seulement", ordre([ligne(1, "a", 900), ligne(2, "b", 800)]) === "b:2 a:1");
  check("podium : un seul joueur", ordre([ligne(1, "a", 900)]) === "a:1" && ordre([]) === "");
  check("podium : une égalité partage la marche (1, 1, 3)", ordre([ligne(1, "a", 900), ligne(1, "b", 900), ligne(3, "c", 700)]) === "b:1 a:1 c:3");

  const mes = [mienne(0, { delaiMs: 4000 }), mienne(1, { juste: false, points: 0, delaiMs: 9000 }), mienne(2, { delaiMs: 6000 })];
  const b = bilanJoueur({ session: { nb: 5, nbJoueurs: 8 }, mesReponses: mes, classement: [ligne(1, "a", 2000, 2), ligne(2, "moi", 1400, 2)], monClassement: null, moiId: "moi" });
  check("bilanJoueur : bonnes, points et place du classement du serveur ; série d'une case par question", b.bonnes === 2 && b.points === 1400 && b.rang === 2 && b.sur === 8 && b.nb === 5 && b.serie.join() === "juste,faux,juste,sans,sans" && b.repondues === 3);
  check("bilanJoueur : délai moyen de mes bonnes réponses seulement (5 s)", b.delaiMoyenMs === 5000);
  const repli = bilanJoueur({ session: { nb: 3, nbJoueurs: 1 }, mesReponses: mes, classement: [], monClassement: null, moiId: "moi" });
  check("bilanJoueur : sans classement lisible, repli sur mes réponses et pas de place", repli.points === 1400 && repli.bonnes === 2 && repli.rang === null);
  check("bilanJoueur : aucune réponse → 0 point, délai moyen nul", bilanJoueur({ session: { nb: 3, nbJoueurs: 2 }, mesReponses: [], classement: [], monClassement: null, moiId: "moi" }).delaiMoyenMs === null);

  const { etat } = exemplePartie("fin");
  const rejou = paramsPourRejouer(etat.session!.params) as Record<string, unknown>;
  check("paramsPourRejouer : les réglages sans le décompte des tirages", rejou.nombre === 10 && rejou.type === "mixte" && rejou.temps === 45 && rejou.partCalculs === 40 && !("nbQuestions" in rejou) && !("nbCalculs" in rejou));
  check("finRecente : moins de dix minutes après la fin, avec les dates du serveur", finRecente("2026-10-30T20:00:00Z", "2026-10-30T20:05:00Z") && !finRecente("2026-10-30T20:00:00Z", "2026-10-30T20:10:00Z") && !finRecente("2026-10-30T20:00:00Z", "2026-10-30T19:59:00Z") && !finRecente("pas une date", "2026-10-30T20:05:00Z"));
}

console.log("# le serveur d'aperçu (corrige comme repondre_salle)");
{
  const { t } = exemplePartie("question");
  const bonne = reponseExemple(2, { choix: 0 }, t);
  const fausse = reponseExemple(2, { choix: 2 }, t);
  check("QCM : la bonne réponse rapporte des points (867 à 33 s restantes), la mauvaise zéro", bonne.ok && bonne.juste && bonne.points === 867 && fausse.ok && !fausse.juste && fausse.points === 0);
  const calcT = exemplePartie("calcul").t;
  const j = reponseExemple(1, { saisie: "13 382,26" }, calcT);
  const arr = reponseExemple(1, { saisie: "13382" }, calcT);
  const f = reponseExemple(1, { saisie: "12000" }, calcT);
  check("calcul : la valeur exacte et l'arrondi à l'unité passent, 12 000 non", j.ok && j.juste && arr.ok && arr.juste && f.ok && !f.juste);
}

console.log("# le décompte");
{
  const html = rendreVue("decompte");
  check("le décompte : titre, gros « 3 » vermillon (data-fin), règle des points", html.includes("La partie démarre") && /class="decompteChiffre" data-fin="1"[^>]*>3</.test(html) && html.includes("500 à 1 000 points"));
  check("le décompte : pas encore de question ni de classement", !html.includes("partie-question") && !html.includes("partie-classement"));
  check("le décompte : l'admin peut encore arrêter la partie, pas un membre", html.includes("Arrêter la partie") && !rendreVue("decompte", false).includes("Arrêter la partie"));
}

console.log("# une question ouverte (QCM)");
{
  const html = rendreVue("question");
  check("l'en-tête : Question 3 / 10 et le chrono à 33 s", /Question <b>3<\/b> \/ 10/.test(html) && html.includes('aria-label="Temps restant : 33 s"'));
  check("la barre de temps est aux 33/45 (73 %)", /scaleX\(0\.73/.test(html));
  check("étiquettes : type, matière, difficulté", html.includes("Fixed Income") && html.includes("Difficile") && html.includes(">Question<"));
  check("quatre choix A à D, tous libres", compte(html, /class="choixBtn"/g) === 4 && compte(html, /data-etat="libre"/g) === 4 && ["A", "B", "C", "D"].every((l) => html.includes(`>${l}</span>`)));
  check("la question vaut 867 points en répondant maintenant", /Vaut <b>867<\/b> points/.test(html));
  check("JAMAIS la correction avant le temps : ni bonne réponse, ni explication", !html.includes("Variation de prix ≈") && !html.includes('data-etat="bonne"') && !html.includes('data-etat="juste"') && !html.includes("class=\"correction\"") && !html.includes("partie-correction"));
  const { etat } = exemplePartie("question");
  check("l'état d'exemple respecte la règle : corrections des seules questions closes (0 et 1), énoncés jusqu'à la 3e", etat.corrections.map((c) => c.position).join() === "0,1" && etat.items.map((i) => i.position).join() === "0,1,2");
  check("le classement en direct : huit lignes, ma ligne surlignée, « après la question 2 sur 10 »", compte(html, /class="rang"/g) === 8 && compte(html, /data-moi="1"/g) === 1 && html.includes("Après la question 2 sur 10"));
  check("tes points : ma réponse juste à la question 1 (844) + ma réponse fausse à la 2 (0)", html.includes('class="mesPointsNombre" aria-label="844 points"'));
  check("admin : le bouton « Arrêter la partie »", html.includes("Arrêter la partie"));
  check("membre : pas de bouton d'arrêt", !rendreVue("question", false).includes("Arrêter la partie"));
}

console.log("# un calcul ouvert");
{
  const html = rendreVue("calcul");
  check("un calcul : étiquette « Calcul » et sa matière", html.includes(">Calcul<") && html.includes("Quant · Time value of money"));
  check("les données de l'énoncé en liste (valeur, taux, durée)", html.includes("$10,000") && html.includes("6.0%") && html.includes("Number of years"));
  check("un champ numérique, l'unité $ et « Valider »", html.includes('id="partie-calcul"') && html.includes('inputMode="decimal"') && html.includes('class="unite"') && html.includes("Valider"));
  check("aucun choix de QCM", compte(html, /class="choixBtn"/g) === 0);
  check("JAMAIS la bonne valeur avant le temps (13 382,26)", !/13[ ,.]?382/.test(html) && !html.includes("FV = PV"));
  check("chrono à 25 s", html.includes('aria-label="Temps restant : 25 s"'));
}

console.log("# j'ai répondu");
{
  const juste = rendreVue("juste");
  check("réponse juste : le verdict JUSTE, +900 points, ma réponse en métal", juste.includes('data-verdict="juste"') && /Juste<\/span><span class="pointsBloc"/.test(juste) && juste.includes("+900") && compte(juste, /data-etat="juste"/g) === 1);
  check("réponse juste : les autres choix s'estompent, la correction n'est pas encore là", compte(juste, /data-etat="estompe"/g) === 3 && !juste.includes("Variation de prix ≈") && juste.includes("Réponse envoyée"));
  check("réponse juste : délai de réponse (9,0 s) et combien ont déjà répondu", juste.includes("répondu en 9,0 s") && juste.includes("5 sur 8 ont répondu"));
  const faux = rendreVue("faux");
  check("réponse fausse : le verdict FAUX, +0, mon choix en vermillon (data-etat=faux)", faux.includes('data-verdict="faux"') && faux.includes("Faux") && faux.includes("+0") && compte(faux, /data-etat="faux"/g) === 1);
  check("réponse fausse : la bonne réponse n'est PAS révélée tant que le temps court", !faux.includes('data-etat="bonne"') && !faux.includes('data-etat="juste"') && !faux.includes("Variation de prix ≈"));
  check("une réponse définitive : tous les choix sont désactivés", compte(faux, /class="choixBtn"[^>]*disabled=""/g) === 4);
}

console.log("# la pause : la correction");
{
  const html = rendreVue("pause");
  check("temps écoulé : le chrono est à zéro et dit « Temps écoulé »", html.includes('aria-label="Temps restant : 0 s"') && html.includes("Temps écoulé") && !html.includes("chronoUrgence"));
  check("la correction : bonne réponse A (−3.1%) en métal, mon choix D en vermillon, les autres estompés", compte(html, /data-etat="bonne"/g) === 1 && compte(html, /data-etat="faux"/g) === 1 && compte(html, /data-etat="estompe"/g) === 2);
  check("la correction : l'explication en français et « Bonne réponse »", html.includes("Variation de prix ≈") && html.includes("Bonne réponse") && html.includes("−3.1%"));
  check("ma réponse fausse reste annoncée (+0)", html.includes('data-verdict="faux"') && html.includes("+0"));
  check("« Question suivante dans 3 s »", /Question suivante dans <b>3 s<\/b>/.test(html));
  check("la barre est vide pendant la pause", /scaleX\(0\)/.test(html));
  check("les choix ne sont plus cliquables", compte(html, /class="choixBtn"[^>]*disabled=""/g) === 4);
}

console.log("# la fin de partie");
{
  const html = rendreVue("fin");
  check("titre « Partie 2 · résultats »", html.includes("Partie 2 · résultats"));
  const podiumHtml = html.slice(html.indexOf('class="podium"'), html.indexOf("partie-bilan"));
  check("le podium : trois marches, Marc (2e) – Inès (1re) – Sofia (3e)", compte(podiumHtml, /class="marche" data-place/g) === 3 && podiumHtml.indexOf("Marc L.") < podiumHtml.indexOf("Inès B.") && podiumHtml.indexOf("Inès B.") < podiumHtml.indexOf("Sofia R."));
  check("le podium : places 2, 1, 3 et le gagnant annoncé", /data-place="2"[\s\S]*data-place="1"[\s\S]*data-place="3"/.test(podiumHtml) && html.includes("Inès B. gagne la partie"));
  check("le podium : chaque marche entre avec un délai (le premier en dernier)", /--delai:0\.45s/.test(podiumHtml) && /--delai:0\.9s/.test(podiumHtml) && /--delai:0\.1s/.test(podiumHtml));
  check("le bilan : bonnes réponses, points, place", html.includes("Bonnes réponses") && /aria-label="\d[\d ]* points"/.test(html) && html.includes("Place") && html.includes("4e"));
  check("la série : une case par question (10), avec juste, faux et sans réponse", compte(html, /<i data-v="/g) === 10 && html.includes('data-v="juste"') && html.includes('data-v="faux"') && html.includes('data-v="sans"'));
  check("revoir les questions : les dix questions, avec la bonne réponse", compte(html, /class="revueLigne"/g) === 10 && html.includes("<summary>Revoir les questions</summary>"));
  check("admin : « Rejouer » (mêmes réglages) et « Retour au salon »", />\s*<svg[^>]*>[\s\S]*?<\/svg>\s*Rejouer<\/button>/.test(html) && html.includes("Retour au salon") && html.includes("mêmes réglages"));
  const membre = rendreVue("fin", false);
  check("membre : « Retour au salon » mais pas de bouton Rejouer, une phrase pour l'admin", membre.includes("Retour au salon") && !/Rejouer<\/button>/.test(membre) && membre.includes("L'admin peut relancer"));
  check("la fin n'affiche plus ni chrono ni question en cours", !html.includes("partie-question") && !html.includes("role=\"timer\""));
}

console.log("# branché : avant la synchronisation");
{
  const { etat } = exemplePartie("question");
  const suivi: SuiviSalle = { etat, decalageMs: 0, cale: false, hors: false, introuvable: false, maintenant: () => Date.now(), rafraichir: async () => {} };
  const html = rendre(<PartieSalle suivi={suivi} />);
  check("PartieSalle : au premier rendu (serveur), « Synchronisation avec le serveur… » et aucune heure lue", html.includes("Synchronisation avec le serveur") && !html.includes("partie-question") && !html.includes("decompteChiffre"));
}

console.log("# styles");
{
  const css = fs.readFileSync(path.join(process.cwd(), "components/salles/Partie.module.css"), "utf8");
  const classes = new Set([...css.matchAll(/\.([a-zA-Z][\w]*)/g)].map((m) => m[1]));
  const sources = ["PartieSalle", "VuePartie", "CarteQuestion", "ClassementDirect", "FinPartie", "Enonce"].map((n) => fs.readFileSync(path.join(process.cwd(), `components/salles/${n}.tsx`), "utf8")).join("\n");
  const utilisees = new Set([...sources.matchAll(/\bp\.([a-zA-Z]\w*)/g)].map((m) => m[1]));
  const manquantes = [...utilisees].filter((c) => !classes.has(c));
  check("toutes les classes de Partie.module.css utilisées par les composants existent", manquantes.length === 0, manquantes.join(", "));

  const debut = css.indexOf("@media (prefers-reduced-motion: reduce)");
  let fin = css.indexOf("{", debut);
  for (let n = 1, i = fin + 1; n > 0 && i < css.length; i++) {
    if (css[i] === "{") n++;
    if (css[i] === "}") n--;
    fin = i;
  }
  const reduit = css.slice(debut, fin + 1);
  const hors = css.slice(0, debut);
  const animees = new Set<string>();
  for (const m of hors.matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
    if (!/\banimation:\s*(?!none)/.test(m[2]) || /@keyframes/.test(m[1])) continue;
    const cls = [...m[1].matchAll(/\.([a-zA-Z]\w*)/g)].map((x) => x[1]);
    if (cls.length) animees.add(cls[cls.length - 1]);
  }
  const nonCoupees = [...animees].filter((c) => !reduit.includes(`.${c}`));
  check(`mouvement réduit : les ${animees.size} classes animées sont toutes coupées`, animees.size >= 6 && nonCoupees.length === 0, nonCoupees.join(", "));
  const noms = [...css.matchAll(/@keyframes\s+(\w+)/g)].map((m) => m[1]);
  const appeles = [...css.matchAll(/animation:\s*(\w+)/g)].map((m) => m[1]).filter((n) => n !== "none");
  check("chaque animation appelle un @keyframes défini", appeles.every((n) => noms.includes(n)), appeles.filter((n) => !noms.includes(n)).join(", "));
  check("mode discret : mêmes mouvements coupés", css.includes('html[data-discreet="1"]'));
  check("les 7 états d'exemple existent", ETATS_EXEMPLE.length === 7);

  // garde-fou : aucun composant du navigateur n'importe les bonnes réponses (calculs du serveur, exemples)
  const dossier = path.join(process.cwd(), "components/salles");
  const fichiers = [...fs.readdirSync(dossier).filter((n) => /\.(tsx?|ts)$/.test(n)).map((n) => path.join(dossier, n)), path.join(process.cwd(), "lib/salles/partie.ts")];
  const fautifs = fichiers.filter((f) => /from "@\/lib\/(salles\/serveur|salles\/exemples|calc\/(index|session-draw|ethics|quant|economics|corporate|fsa|equity|fixed-income|derivatives|alternatives|portfolio))"/.test(fs.readFileSync(f, "utf8").replace(/\/\/.*$/gm, "")));
  check(`${fichiers.length} fichiers du navigateur : aucun n'importe lib/salles/serveur, les exemples ni un catalogue de calculs`, fautifs.length === 0, fautifs.map((f) => path.basename(f)).join(", "));
}

console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
process.exit(ko ? 1 : 0);
