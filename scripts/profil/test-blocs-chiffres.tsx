// Tests des blocs Chiffres clés, Questions répondues et Trophées de la page
// de profil (components/profil/blocs/Chiffres.tsx, Reponses.tsx,
// Trophees.tsx), sans base ni réseau ni navigateur (rendu statique).
//   npx tsx scripts/profil/test-blocs-chiffres.tsx
// Chaque bloc à chaque format permis, dans les trois vues : chez un autre
// avec « toi » (RICHE_TOI), l'aperçu « voir comme les autres » (« toi ± »,
// « toi – – »), chez soi (ni jeton, ni score, ni couleur). Puis les textes
// de la spécification : jetons, scores, infobulles, rattrapage, ce qui est
// retiré, les cas particuliers (trop peu de duels, matière non mesurée,
// lecture partielle des trophées, case à 0 des deux côtés, état vide).
import "./sans-css";
import "./react-global";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChiffresBloc, pieceDe, piecesVues } from "@/components/profil/blocs/Chiffres";
import { ReponsesBloc } from "@/components/profil/blocs/Reponses";
import { TropheesBloc } from "@/components/profil/blocs/Trophees";
import type { DonneesBlocs } from "@/lib/profil/blocs-donnees";
import type { VitrineKey } from "@/lib/profil/catalogue";
import { FORMATS_PERMIS, type Format } from "@/lib/profil/disposition";
import { compter } from "@/lib/trophees";
import { nombre } from "@/lib/voice";
import { RICHE, RICHE_TOI, SOBRE, TOI_EXEMPLE } from "./donnees-blocs-exemple";

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
/** le rendu, lu comme du texte : sans les séparateurs de nœuds, apostrophes rendues */
const rend = (n: React.ReactNode) => renderToStaticMarkup(<>{n}</>).replace(/<!-- -->/g, "").replace(/&#x27;/g, "'");
const compte = (html: string, motif: string) => html.split(motif).length - 1;
const M = "−"; // le vrai signe moins
const N = (n: number) => nombre(n);
/** un pourcentage du site (pct) : espace insécable avant « % » */
const P = (n: number | string) => `${n} %`;

type Bloc = (ctx: { d: DonneesBlocs; f: Format; edition: boolean }) => React.ReactNode;
const BLOCS: [string, "vitrine" | "reponses" | "trophees", Bloc][] = [
  ["chiffres clés", "vitrine", ChiffresBloc],
  ["questions répondues", "reponses", ReponsesBloc],
  ["trophées", "trophees", TropheesBloc],
];
const AUTRE = RICHE_TOI;
const APERCU: DonneesBlocs = { ...RICHE, apercu: true };
const MOI: DonneesBlocs = { ...RICHE_TOI, moi: true, toi: null };
const VUES: [string, DonneesBlocs][] = [
  ["chez un autre", AUTRE],
  ["aperçu", APERCU],
  ["chez soi", MOI],
];
const ECARTS = ["toi " + M, "toi +", "toi =", "toi ±", "toi –"];

// ── Chaque bloc, chaque format permis, chaque vue ──
for (const [nom, k, Bloc] of BLOCS) {
  for (const f of FORMATS_PERMIS[k]) {
    for (const [vue, d] of VUES) {
      let html = "";
      let err = "";
      try {
        html = rend(<Bloc d={d} f={f} edition={false} />);
      } catch (e) {
        err = String(e);
      }
      check(`${nom} · ${f} · ${vue} : se rend`, !err && html.length > 0, err);
      if (vue === "chez soi") check(`${nom} · ${f} · chez soi : ni jeton, ni score, ni vert, ni rouge`, ECARTS.every((x) => !html.includes(x)) && !html.includes("var(--gain)") && !html.includes("var(--perte)"));
      if (vue === "aperçu") check(`${nom} · ${f} · aperçu : « toi ± » et « toi – – », sans chiffre d'écart`, html.includes("toi ±") && html.includes("toi – –") && !html.includes("toi " + M) && html.includes("Ici, l'écart avec la personne qui regarde"));
      if (vue === "chez un autre") check(`${nom} · ${f} · chez un autre : un jeton et un score colorés`, html.includes("var(--perte)") && /toi \d+ – \d+/.test(html));
      if (f === "demi") check(`${nom} · demi · ${vue} : rendu en demi-bande (cellules)`, html.includes('class="card min-w-0 demi') && html.includes('class="cellule"'));
    }
  }
}

// ── Chiffres clés ──
{
  const demi = rend(<ChiffresBloc d={AUTRE} f="demi" edition={false} />);
  const texte = demi.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  check("chiffres chez un autre : Questions et Série, déjà dans le bandeau, cèdent la place à Duels et Défis du jour", !demi.includes(`>${N(3412)}<`) && !demi.includes(">12 j<") && demi.includes(">Duels") && demi.includes(">Défis du jour<"), texte.slice(0, 300));
  const vues = (c: VitrineKey[], r: boolean) => piecesVues(c, r).join(",");
  check("piecesVues : chez soi, celles choisies ; chez un autre, la relève dans l'ordre du catalogue", vues(["questions", "serie", "matiere"], false) === "questions,serie,matiere" && vues(["questions", "serie", "matiere"], true) === "duels,defis,matiere" && vues(["serie", "duels"], true) === "matiere,duels");
  check("chiffres : la meilleure matière en étiquette (« En FSA »), le % en chiffre, ton FSA en jeton", demi.includes(">En FSA<") && demi.includes(`>${P(82)}<`) && demi.includes(`toi ${M}12<`));
  check("chiffres : le score « toi 0 – 3 » et son infobulle", demi.includes("toi 0 – 3") && demi.includes("Tu mènes dans 0, Sforzinda dans 3"));
  check("pièce Questions : infobulle, puis le rattrapage", (pieceDe("questions", AUTRE).bulle ?? "").startsWith(`Questions · Sforzinda ${N(3412)} · toi ${N(1720)}\nÀ ton rythme : `));
  check("pièce Série : infobulle avec les records", pieceDe("serie", AUTRE).bulle === "Série · Sforzinda 12 j (record 31 j) · toi 5 j (record 19 j)", pieceDe("serie", AUTRE).bulle);
  check("chiffres : infobulle de la matière (nom complet)", demi.includes(`Sa meilleure matière : Financial Statement Analysis · Sforzinda ${P(82)} · toi ${P(70)}`));
  check(
    "chiffres : retiré chez un autre (« questions posées », « série en cours », « de maîtrise »)",
    ["questions posées", "série en cours", "de maîtrise", "record 31 j<"].every((x) => !demi.includes(x)),
  );

  const autres = (showcase: string[], d: DonneesBlocs = AUTRE, f: Format = "demi") => rend(<ChiffresBloc d={{ ...d, showcase: showcase as VitrineKey[] }} f={f} edition={false} />);
  const dcc = autres(["duels", "defis", "calculs"]);
  check("chiffres : Duels en taux (67 %) et « toi −20 » ; infobulle « 18 sur 27 »", dcc.includes(`>${P(67)}<`) && dcc.includes(`toi ${M}20<`) && dcc.includes("Duels gagnés · Sforzinda 18 sur 27 · toi 9 sur 19"));
  check("chiffres : Défis « toi −11 », Calculs « toi +84 », score « toi 1 – 2 »", dcc.includes(`toi ${M}11<`) && dcc.includes("toi +84<") && dcc.includes("toi 1 – 2") && dcc.includes("Calculs justes · Sforzinda 236 · toi 320"));
  const peu = rend(<ChiffresBloc d={{ ...AUTRE, showcase: ["duels"], stats: { ...AUTRE.stats, duelsGagnes: 4, duelsJoues: 6 } }} f="tuile" edition={false} />);
  check("chiffres : moins de 10 duels, « 4/6 » sans jeton, « Trop peu de duels pour comparer »", peu.includes(">4/6<") && peu.includes('title="Trop peu de duels pour comparer"') && !peu.includes("toi " + M) && !peu.includes("toi +"));
  const peuToi = rend(<ChiffresBloc d={{ ...AUTRE, showcase: ["duels"], toi: { ...TOI_EXEMPLE, stats: { ...TOI_EXEMPLE.stats, duelsJoues: 5, duelsGagnes: 2 } } }} f="tuile" edition={false} />);
  check("chiffres : toi sous 10 duels, son taux sans jeton", peuToi.includes(`>${P(67)}<`) && peuToi.includes("Trop peu de duels pour comparer") && !peuToi.includes("toi " + M));
  const exam = autres(["examens"]);
  check("chiffres : la pièce « Examens blancs » (0 face à 2 : « toi +2 »)", exam.includes(">Examens blancs<") && exam.includes("toi +2<") && exam.includes("Examens blancs · Sforzinda 0 · toi 2"));
  check("chiffres : une seule pièce, pas de score", !exam.includes("toi 0 – ") && !/toi \d+ – \d+/.test(exam));
  const defaut = autres([]);
  check("chiffres : vitrine vide, les pièces par défaut (matière, duels, défis)", defaut.includes(">En FSA<") && defaut.includes(">Duels<") && defaut.includes(">Défis du jour<") && !defaut.includes(">Questions<"));
  const sansFsa = rend(<ChiffresBloc d={{ ...AUTRE, showcase: ["matiere"], toi: { ...TOI_EXEMPLE, stats: { ...TOI_EXEMPLE.stats, matieres: [] } } }} f="tuile" edition={false} />);
  check("chiffres : ta matière non mesurée, pas de jeton et « toi : pas encore mesuré »", sansFsa.includes('title="toi : pas encore mesuré"') && !sansFsa.includes("toi " + M));
  const prov = rend(<ChiffresBloc d={{ ...AUTRE, showcase: ["matiere"], stats: { ...AUTRE.stats, matieres: [{ key: "fsa", pct: 81, answered: 30, statut: "provisoire" }] } }} f="tuile" edition={false} />);
  check("chiffres : maîtrise provisoire, « ≈81 % »", prov.includes(`>≈${P(81)}<`));

  const col = rend(<ChiffresBloc d={AUTRE} f="colonne" edition={false} />);
  check("chiffres · colonne : 3 étages, double trait (barres), jeton de 16 px", compte(col, 'class="etage"') === 3 && compte(col, "barreLui") === 3 && compte(col, "barreToi") === 3 && col.includes("font-size:16px") && col.includes("Épais : Sforzinda · fin : toi"));
  const colSans = rend(<ChiffresBloc d={{ ...AUTRE, toi: { ...TOI_EXEMPLE, stats: { ...TOI_EXEMPLE.stats, matieres: [] } } }} f="colonne" edition={false} />);
  check("chiffres · colonne : pas de double trait pour la matière sans jeton", compte(colSans, "barreLui") === 2);
  const tuile = rend(<ChiffresBloc d={AUTRE} f="tuile" edition={false} />);
  check("chiffres · mini-tuile : « Chiffres clés », 3 lignes, score à droite", tuile.includes(">Chiffres clés<") && compte(tuile, 'class="ligne"') === 3 && tuile.includes("toi 0 – 3") && tuile.includes("font-size:26px"));
  for (const f of ["heros", "bande"] as Format[]) {
    const html = rend(<ChiffresBloc d={AUTRE} f={f} edition={false} />);
    check(`chiffres · ${f} : 3 cases (--n:3), chiffre de ${f === "heros" ? 44 : 36} px, score`, html.includes("--n:3") && compte(html, 'class="case"') === 3 && html.includes(`font-size:${f === "heros" ? 44 : 36}px`) && html.includes("toi 0 – 3"));
  }
  const bande = rend(<ChiffresBloc d={AUTRE} f="bande" edition={false} />);
  check("chiffres · bande : le score dans une 4e cellule", bande.includes("avecScore") && bande.includes('class="caseScore"'));
  const un = rend(<ChiffresBloc d={{ ...RICHE, showcase: ["questions"] }} f="heros" edition={false} />);
  check("chiffres · héros : 1 pièce, 1 colonne (--n:1)", un.includes("--n:1"));

  const moi = rend(<ChiffresBloc d={{ ...MOI, stats: { ...MOI.stats, duJour: 36 } }} f="demi" edition={false} />);
  check("chiffres · chez soi : « dont 36 aujourd'hui », « record 31 j », mêmes chiffres", moi.includes("dont 36 aujourd'hui") && moi.includes("record 31 j") && moi.includes(">En FSA<") && moi.includes(`>${N(3412)}<`));
  const moiDuels = rend(<ChiffresBloc d={{ ...MOI, showcase: ["duels", "matiere"], stats: { ...MOI.stats, matieres: [{ key: "fsa", pct: 81, answered: 30, statut: "provisoire" }] } }} f="tuile" edition={false} />);
  check("chiffres · chez soi : Duels « 67 % » et « 18 sur 27 » ; « provisoire »", moiDuels.includes(`>${P(67)}<`) && moiDuels.includes(">18 sur 27<") && moiDuels.includes(">provisoire<"));
  const pub = rend(<ChiffresBloc d={RICHE} f="demi" edition={false} />);
  check("chiffres · visiteur non connecté : ni jeton ni score", ECARTS.every((x) => !pub.includes(x)) && pub.includes(`>${N(3412)}<`));
  const apercu = rend(<ChiffresBloc d={APERCU} f="demi" edition={false} />);
  check("chiffres · aperçu : 3 « toi ± » et l'infobulle de l'aperçu", compte(apercu, "toi ±") === 3 && apercu.includes('title="Ici, l\'écart avec la personne qui regarde"'));
}

// ── Questions répondues ──
{
  const LIGNES: Record<Format, number> = { tuile: 3, colonne: 10, heros: 5, bande: 10, demi: 4 };
  for (const f of FORMATS_PERMIS.reponses) {
    const html = rend(<ReponsesBloc d={AUTRE} f={f} edition={false} />);
    const n = f === "demi" ? compte(html, 'class="cellule"') - 1 : (html.match(/class="ligne[" ]/g) ?? []).length;
    check(`réponses · ${f} : ${LIGNES[f]} matières`, n === LIGNES[f], String(n));
    check(`réponses · ${f} : « toi −1 692 » et le score par matière « toi 0 – 10 »`, html.includes(`toi ${M}${N(1692)}`) && html.includes("toi 0 – 10") && html.includes("Tu mènes dans 0, Sforzinda dans 10"));
    check(`réponses · ${f} : double trait ${f === "colonne" || f === "heros" || f === "bande" ? "présent" : "absent"}`, (compte(html, "barreLui") > 0) === (f === "colonne" || f === "heros" || f === "bande"));
    check(`réponses · ${f} : « Le détail » ${f === "demi" ? "absent" : "fermé, avec la précision et les sources"}`, f === "demi" ? !html.includes("Le détail") : html.includes("<details") && !html.includes("<details open") && html.includes("64 % justes") && html.includes("Sessions ciblées"));
    check(`réponses · ${f} : retiré (« réponses, toutes sources »)`, !html.includes("toutes sources"));
  }
  const tuile = rend(<ReponsesBloc d={AUTRE} f="tuile" edition={false} />);
  check("réponses · tuile : les plus grands écarts (FSA −705, EQ −351, ETH −292)", tuile.includes(">FSA<") && tuile.includes(`${M}705<`) && tuile.includes(">EQ<") && tuile.includes(`${M}351<`) && tuile.includes(">ETH<") && !tuile.includes(">QM<"));
  check("réponses · tuile : l'étiquette « Questions », le rattrapage en infobulle", tuile.includes(">Questions<") && tuile.includes("\nÀ ton rythme : "));
  check("réponses : infobulle d'une matière", tuile.includes("Questions en FSA · Sforzinda 905 · toi 200"));
  check("réponses · tuile : le repère « % justes » n'est plus visible (dans le repli seulement)", tuile.indexOf("64 % justes") > tuile.indexOf("<details"));
  const col = rend(<ReponsesBloc d={AUTRE} f="colonne" edition={false} />);
  check("réponses · colonne : triées par son volume (FSA, puis ETH)", col.indexOf(">FSA<") < col.indexOf(">ETH<") && col.indexOf(">ETH<") < col.indexOf(">QM<") && col.indexOf(">QM<") < col.indexOf(">ALT<"));
  const demi = rend(<ReponsesBloc d={AUTRE} f="demi" edition={false} />);
  check("réponses · demi : « Questions / 3 412 / toi −1 692 » puis « FSA / 905 / −705 »", demi.includes(">Questions<") && demi.includes(`>${N(905)}<`) && demi.includes(`${M}705<`));
  const sansResume = rend(<ReponsesBloc d={{ ...AUTRE, reponses: null }} f="tuile" edition={false} />);
  check("réponses : sans résumé (pas de client admin), le bloc reste, sans repli", sansResume.includes(`toi ${M}${N(1692)}`) && !sansResume.includes("<details"));
  const pub = rend(<ReponsesBloc d={RICHE} f="tuile" edition={false} />);
  check("réponses · visiteur non connecté : ses plus gros volumes, ni jeton ni score", pub.includes(">FSA<") && pub.includes(">ETH<") && pub.includes(">QM<") && ECARTS.every((x) => !pub.includes(x)));

  const moiT = rend(<ReponsesBloc d={MOI} f="tuile" edition={false} />);
  const moiH = rend(<ReponsesBloc d={MOI} f="heros" edition={false} />);
  check("réponses · chez soi : 3 sources en mini-tuile, 5 en héros", compte(moiT, "grid-template-columns:112px") === 3 && compte(moiH, "grid-template-columns:112px") === 5);
  check("réponses · chez soi : « 64 % justes » visible, « Le détail par matière »", moiT.includes(">64 % justes<") && moiT.includes("/moi?onglet=stats") && moiT.includes("Le détail par matière") && !moiT.includes("<details"));
  check("réponses · chez soi : la précision de chaque source (« 72 % »)", moiH.includes(" · 72 %"));
  const moiD = rend(<ReponsesBloc d={MOI} f="demi" edition={false} />);
  check("réponses · chez soi, demi : Questions + 3 sources, puis « Le détail »", compte(moiD, 'class="cellule"') === 4 && moiD.includes(">Défi du jour<") && moiD.includes("/moi?onglet=stats") && moiD.includes("Le détail"));
  const incomplet = rend(<ReponsesBloc d={{ ...MOI, reponses: { ...MOI.reponses!, incomplet: true } }} f="tuile" edition={false} />);
  check("réponses · une source illisible le dit", incomplet.includes("Au moins : certaines sources"));
  const vide: DonneesBlocs = { ...SOBRE, stats: { ...SOBRE.stats, questions: 0 } };
  check("réponses : aucune question, rien en vue publique", rend(<ReponsesBloc d={vide} f="tuile" edition={false} />) === "");
  check("réponses : aucune question, l'état vide dans Personnaliser", rend(<ReponsesBloc d={vide} f="tuile" edition />).includes("rien à montrer"));
  check("réponses : SOBRE (286 questions, sans résumé) se rend", rend(<ReponsesBloc d={SOBRE} f="heros" edition={false} />).includes(">286<"));
}

// ── Trophées ──
{
  const total = compter(RICHE.trophees!.lignes).total;
  check("trophées : l'exemple compte 22 trophées", total === 22);
  for (const f of FORMATS_PERMIS.trophees) {
    const html = rend(<TropheesBloc d={AUTRE} f={f} edition={false} />);
    check(`trophées · ${f} : « 22 », « toi −12 », « toi 0 – 4 »`, html.includes(">22<") && html.includes(`toi ${M}12<`) && html.includes("toi 0 – 4"));
    check(`trophées · ${f} : les métaux en infobulle (« Or · Sforzinda 2 · toi 1 »), sans leur nom visible`, html.includes('title="Or · Sforzinda 2 · toi 1"') && !html.includes(">Or<") && !html.includes(">Diamant<"));
    check(`trophées · ${f} : 4 jetons courts (−1, −1, −4, −6)`, [`${M}1<`, `${M}4<`, `${M}6<`].every((x) => html.includes(x)) && compte(html, `>${M}1<`) === 2);
    const parSource = f === "colonne" || f === "bande";
    check(`trophées · ${f} : « Par source » ${parSource ? "présent" : "absent"}`, html.includes("Par source") === parSource);
  }
  const incomplet = rend(<TropheesBloc d={{ ...AUTRE, toi: { ...TOI_EXEMPLE, trophees: { ...TOI_EXEMPLE.trophees!, complet: false } } }} f="tuile" edition={false} />);
  check("trophées : lecture partielle, ni jeton ni score, « Comparaison incomplète »", incomplet.includes('title="Comparaison incomplète"') && ECARTS.every((x) => !incomplet.includes(x)) && !/>[−+]\d+</.test(incomplet));
  const sansDiamant: DonneesBlocs = { ...AUTRE, trophees: { lignes: RICHE.trophees!.lignes.filter((l) => l.palier !== 4), complet: true } };
  const zero = rend(<TropheesBloc d={sansDiamant} f="heros" edition={false} />);
  check("trophées : une case à 0 des deux côtés, estompée et sans jeton (hors du score)", zero.includes("tenue") && zero.includes('title="Diamant · Sforzinda 0 · toi 0"') && zero.includes("toi 0 – 3") && !zero.includes("égalité"));
  const demi = rend(<TropheesBloc d={AUTRE} f="demi" edition={false} />);
  check("trophées · demi : 5 cellules (Trophées, puis 4 métaux en dessins de 32 px)", compte(demi, 'class="cellule"') === 5 && compte(demi, "h-8 w-8") === 4);
  const pub = rend(<TropheesBloc d={RICHE} f="tuile" edition={false} />);
  check("trophées · visiteur non connecté : « Or · Sforzinda 2 », ni jeton ni score", pub.includes('title="Or · Sforzinda 2"') && ECARTS.every((x) => !pub.includes(x)));
  const apercuPartiel = rend(<TropheesBloc d={{ ...APERCU, trophees: { ...RICHE.trophees!, complet: false } }} f="tuile" edition={false} />);
  check("trophées · aperçu, sa lecture partielle : ni « toi ± » ni score", !apercuPartiel.includes("toi ±") && !apercuPartiel.includes("toi – –"));

  const moi = rend(<TropheesBloc d={MOI} f="tuile" edition={false} />);
  check("trophées · chez soi : le total en repère, les 4 cases nommées, « Par source »", moi.includes(">22<") && moi.includes(">Diamant<") && moi.indexOf(">Diamant<") < moi.indexOf(">Bronze<") && compte(moi, "card-soft") === 4 && moi.includes("Par source"));
  const moiZero = rend(<TropheesBloc d={{ ...MOI, trophees: { lignes: [], complet: true } }} f="tuile" edition={false} />);
  check("trophées · chez soi, aucun : la phrase d'amorce", moiZero.includes("Aucun trophée pour l'instant : 5/5"));
  const moiD = rend(<TropheesBloc d={MOI} f="demi" edition={false} />);
  check("trophées · chez soi, demi : « Trophées / 22 » puis 4 cellules nommées", compte(moiD, 'class="cellule"') === 5 && moiD.includes(">Diamant<") && moiD.includes(">Bronze<"));
  const nul: DonneesBlocs = { ...SOBRE, trophees: null };
  check("trophées : sans lecture, rien en vue publique", rend(<TropheesBloc d={nul} f="tuile" edition={false} />) === "");
  check("trophées : sans lecture, l'état vide dans Personnaliser (demi aussi)", rend(<TropheesBloc d={nul} f="tuile" edition />).includes("rien à montrer") && rend(<TropheesBloc d={nul} f="demi" edition />).includes("rien pour l'instant"));
}

console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
process.exit(ko ? 1 : 0);
