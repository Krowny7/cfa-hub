// Tests des blocs Chiffres clés, Questions répondues et Trophées de la page
// de profil (components/profil/blocs/Chiffres.tsx, Reponses.tsx,
// Trophees.tsx), sans base ni réseau ni navigateur (rendu statique).
//   npx tsx --tsconfig tsconfig.json scripts/profil/test-blocs-chiffres.tsx
// Ces trois blocs ne comparent plus : chaque bloc à chaque format permis,
// dans les trois vues (chez un autre avec « toi », l'aperçu « voir comme les
// autres », chez soi), se rend sans erreur, sans jeton ni score, avec le même
// dessin partout (seuls les extras de celui dont c'est la page changent). Puis
// le contenu des maquettes validées : « Une pièce en grand » (chiffres),
// « Anneau de justesse » (questions), « Médailles » (trophées), et les cas
// particuliers (trop peu de duels, matière non mesurée, lecture partielle,
// métal à 0, état vide, résumé absent).
import "./sans-css";
import "./react-global";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChiffresBloc, PIECES_DEFAUT, pieceDe, piecesVues, poidsChiffre } from "@/components/profil/blocs/Chiffres";
import { ReponsesBloc } from "@/components/profil/blocs/Reponses";
import { TropheesBloc } from "@/components/profil/blocs/Trophees";
import type { DonneesBlocs } from "@/lib/profil/blocs-donnees";
import type { VitrineKey } from "@/lib/profil/catalogue";
import { FORMATS_PERMIS, type Format } from "@/lib/profil/disposition";
import { compter } from "@/lib/trophees";
import { nombre, pct } from "@/lib/voice";
import { RICHE, RICHE_TOI, SOBRE, TOI_EXEMPLE } from "./donnees-blocs-exemple";

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
/** le rendu, lu comme du texte : sans les séparateurs de nœuds, apostrophes rendues */
const rend = (n: React.ReactNode) => renderToStaticMarkup(<>{n}</>).replace(/<!-- -->/g, "").replace(/&#x27;/g, "'");
const compte = (html: string, motif: string) => html.split(motif).length - 1;
/** les espaces insécables en espaces simples (pour comparer des phrases) */
const sp = (s: string) => s.replace(/[  ]/g, " ");
/** le texte seul, les balises retirées, les espaces normalisés */
const texte = (html: string) => sp(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
const N = (n: number) => nombre(n);
const P = (n: number) => pct(n);

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
/** plus de comparaison : ni jeton (« toi −… », « toi +… », « toi ± »), ni score (« toi 1 – 2 », « toi – – »), ni double trait */
const COMPARAISON = /toi\s*[−+±=–]|toi \d+ – \d+|Ici, l'écart|Épais :|barreLui|barreToi|doubleTrait/;

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
      check(`${nom} · ${f} · ${vue} : aucune comparaison (ni jeton, ni score, ni double trait)`, !COMPARAISON.test(html) && !html.includes("var(--perte)") && !html.includes("var(--gain)"));
      if (f === "demi") check(`${nom} · demi · ${vue} : rendu en demi-bande (cellules)`, html.includes('class="card min-w-0 demi') && html.includes('class="cellule"'));
      else check(`${nom} · ${f} · ${vue} : rendu en coque, avec son étiquette en tête`, html.startsWith("<section") && html.includes('<h3 class="t-eyebrow') && html.includes(`${f}"`));
    }
  }
}

// ── Chiffres clés ──
{
  // les trois pièces de la maquette (« 3 412 questions posées · 12 j de série · 82 % en FSA »), chez soi
  for (const f of ["tuile", "colonne", "heros", "bande"] as Format[]) {
    const html = rend(<ChiffresBloc d={MOI} f={f} edition={false} />);
    check(`chiffres · ${f} : la 1re pièce en grand (« 3 412 », « questions posées »), un trait de pinceau, les deux autres en ligne`, html.includes(`class="t-num tabular-nums grand" style="--w:${poidsChiffre(N(3412))}">${N(3412)}</b>`) && html.includes('class="legende">questions posées<') && html.includes('class="pinceau"') && html.includes('class="trait"'));
    check(`chiffres · ${f} : « 12 j de série » et « 82 % en FSA » en chiffres gras`, html.includes('<li><b class="val">12 j</b> <span class="leg">de série</span></li>') && html.includes(`<li><b class="val">${P(82)}</b> <span class="leg">en FSA</span></li>`));
    check(`chiffres · ${f} : le format est posé (classe) et le texte de la maquette y est`, html.includes(` ${f}"`) && texte(html).includes(sp(`${N(3412)} questions posées 12 j de série ${P(82)} en FSA`)));
  }
  const tuile = rend(<ChiffresBloc d={MOI} f="tuile" edition={false} />);
  check("chiffres : le trait de pinceau a l'accent du joueur (#e0674b)", tuile.includes("stroke:#e0674b"));
  const sobre = rend(<ChiffresBloc d={{ ...SOBRE, showcase: ["questions", "serie", "matiere"] }} f="tuile" edition={false} />);
  check("chiffres : sans accent (l'encre), le trait est le vermillon du site (--pen)", sobre.includes("stroke:var(--pen)") && !sobre.includes("stroke:var(--ink)"));

  // la relève chez un autre : Questions et Série, déjà dans le bandeau, cèdent la place
  const vues = (c: VitrineKey[], r: boolean) => piecesVues(c, r).join(",");
  check("piecesVues : chez soi, celles choisies ; chez un autre, la relève dans l'ordre du catalogue", vues(["questions", "serie", "matiere"], false) === "questions,serie,matiere" && vues(["questions", "serie", "matiere"], true) === "duels,defis,matiere" && vues(["serie", "duels"], true) === "matiere,duels");
  check("PIECES_DEFAUT : matière, duels, défis", PIECES_DEFAUT.join(",") === "matiere,duels,defis");
  const autre = rend(<ChiffresBloc d={AUTRE} f="heros" edition={false} />);
  check("chiffres chez un autre : la relève (Duels en grand, puis Défis du jour et FSA), sans « 3 412 » ni série", autre.includes(`grand" style="--w:${poidsChiffre(P(67))}">${P(67)}</b>`) && autre.includes("de victoires en duel") && autre.includes(`<b class="val">${N(41)}</b> <span class="leg">défis rendus</span>`) && autre.includes(`<b class="val">${P(82)}</b> <span class="leg">en FSA</span>`) && !autre.includes(N(3412)) && !autre.includes("de série"));
  const apercu = rend(<ChiffresBloc d={APERCU} f="heros" edition={false} />);
  check("chiffres en aperçu : la même relève que chez un autre", apercu.includes(`grand" style="--w:${poidsChiffre(P(67))}">${P(67)}</b>`) && !apercu.includes("de série"));
  const pub = rend(<ChiffresBloc d={RICHE} f="demi" edition={false} />);
  check("chiffres · visiteur non connecté : ses pièces choisies, sans relève", pub.includes(`>${N(3412)}<`) && pub.includes(">12 j<") && pub.includes(">En FSA<") && !COMPARAISON.test(pub));
  const demi = rend(<ChiffresBloc d={MOI} f="demi" edition={false} />);
  check("chiffres · demi : 3 cellules (Questions, Série, En FSA)", compte(demi, 'class="cellule"') === 3 && demi.includes(">Questions<") && demi.includes(">Série<") && demi.includes(">En FSA<") && demi.includes(`>${P(82)}<`));

  // les pièces une à une
  check("pièce Questions : « 3 412 », « questions posées »", pieceDe("questions", MOI).chiffre === N(3412) && pieceDe("questions", MOI).legende === "questions posées");
  check("pièce Série : « 12 j », « de série »", pieceDe("serie", MOI).chiffre === "12 j" && pieceDe("serie", MOI).legende === "de série");
  const duels = pieceDe("duels", MOI);
  check("pièce Duels : le taux (67 %), « de victoires en duel », « 18 duels gagnés sur 27 » en infobulle", duels.chiffre === P(67) && duels.legende === "de victoires en duel" && duels.titre === "18 duels gagnés sur 27");
  const peu: DonneesBlocs = { ...MOI, stats: { ...MOI.stats, duelsGagnes: 4, duelsJoues: 6 } };
  check("pièce Duels : moins de 10 duels, « 4/6 » et « duels gagnés »", pieceDe("duels", peu).chiffre === "4/6" && pieceDe("duels", peu).legende === "duels gagnés");
  const aucun: DonneesBlocs = { ...MOI, stats: { ...MOI.stats, duelsGagnes: 0, duelsJoues: 0 } };
  check("pièce Duels : aucun duel, « — »", pieceDe("duels", aucun).chiffre === "—" && pieceDe("duels", aucun).legende === "aucun duel joué");
  check("pièce Défis, Calculs, Examens : leurs nombres et leurs légendes", pieceDe("defis", MOI).chiffre === "41" && pieceDe("defis", MOI).legende === "défis du jour rendus" && pieceDe("calculs", MOI).chiffre === "236" && pieceDe("calculs", MOI).legende === "calculs justes" && pieceDe("examens", MOI).chiffre === "0" && pieceDe("examens", MOI).legende === "examens blancs");
  const fsa = pieceDe("matiere", MOI);
  check("pièce Meilleure matière : « 82 % », « en FSA », étiquette « En FSA »", fsa.chiffre === P(82) && fsa.legende === "en FSA" && fsa.etiquette === "En FSA");
  const prov: DonneesBlocs = { ...MOI, stats: { ...MOI.stats, matieres: [{ key: "fsa", pct: 81, answered: 30, statut: "provisoire" }] } };
  check("pièce Meilleure matière : provisoire, « ≈81 % » et « en FSA · provisoire »", pieceDe("matiere", prov).chiffre === `≈${P(81)}` && pieceDe("matiere", prov).legende === "en FSA · provisoire");
  const nulle: DonneesBlocs = { ...MOI, stats: { ...MOI.stats, matieres: [] } };
  check("pièce Meilleure matière : non mesurée, « — »", pieceDe("matiere", nulle).chiffre === "—" && pieceDe("matiere", nulle).legende === "meilleure matière, pas encore mesurée");
  check("pièces : la légende courte des deux pièces en ligne (« de victoires », « défis rendus », « en FSA »)", duels.court === "de victoires" && pieceDe("defis", MOI).court === "défis rendus" && fsa.court === "en FSA" && pieceDe("questions", MOI).court === "questions" && pieceDe("duels", peu).court === "duels gagnés");

  const un = rend(<ChiffresBloc d={{ ...MOI, showcase: ["questions"] }} f="heros" edition={false} />);
  check("chiffres : une seule pièce, rien à côté", un.includes(`${N(3412)}</b>`) && !un.includes('class="autres"') && !un.includes("<ul"));
  const defaut = rend(<ChiffresBloc d={{ ...MOI, showcase: [] }} f="demi" edition={false} />);
  check("chiffres : vitrine vide, les pièces par défaut (matière, duels, défis)", defaut.includes(">En FSA<") && defaut.includes(">Duels<") && defaut.includes(">Défis du jour<") && !defaut.includes(">Questions<"));
  const dcc = rend(<ChiffresBloc d={{ ...MOI, showcase: ["duels", "defis", "calculs"] }} f="tuile" edition={false} />);
  check("chiffres : Duels, Défis, Calculs (« 67 % de victoires en duel · 41 défis rendus · 236 calculs justes »)", texte(dcc).includes(sp(`${P(67)} de victoires en duel 41 défis rendus 236 calculs justes`)) && dcc.includes('title="18 duels gagnés sur 27"'));
  check("chiffres : le poids d'un chiffre (la taille s'en tire en CSS)", poidsChiffre("3 412") === 3.75 && poidsChiffre("82 %") === 2.85 && poidsChiffre("12 j") === 2.28 && poidsChiffre("—") === 0.7);
}

// ── Questions répondues ──
{
  for (const f of FORMATS_PERMIS.reponses) {
    for (const [vue, d] of VUES) {
      const html = rend(<ReponsesBloc d={d} f={f} edition={false} />);
      if (f === "demi") {
        check(`réponses · demi · ${vue} : Questions, Justes et Précision (un petit anneau)`, compte(html, 'class="cellule"') === 3 && html.includes(`>${N(3412)}<`) && html.includes(`>${N(2184)}<`) && html.includes(`${P(64)}</span>`) && html.includes('class="anneau mini"') && html.includes("--p:64"));
        continue;
      }
      check(`réponses · ${f} · ${vue} : l'anneau jusqu'à 64 % (« 64 % » au centre), le total « 3 412 », « 2 184 justes »`, html.includes('aria-label="64 % de réponses justes"') && html.includes("--p:64") && html.includes(`centre" style="--wp:${poidsChiffre(P(64))}">${P(64)}</b>`) && html.includes(`grand" style="--w:${poidsChiffre(N(3412))}">${N(3412)}</b>`) && html.includes(`<b>${N(2184)}</b> justes`) && html.includes("<span>questions</span>"));
      const sources = compte(html, 'class="nom"');
      check(`réponses · ${f} · ${vue} : ${f === "tuile" ? "pas de sources" : "ses 5 sources (nom, nombre)"}`, f === "tuile" ? sources === 0 && !html.includes("<ul") : sources === 5 && html.includes(`<span class="nom">Défi du jour</span><span class="guide" aria-hidden="true"></span><span class="nb">${N(1240)}</span>`) && html.includes('<span class="nom">Examens blancs</span>'));
      check(`réponses · ${f} · ${vue} : ni repli « Le détail », ni pourcentage par source`, !html.includes("<details") && !html.includes("toutes sources") && !html.includes(" · 72 %"));
    }
  }
  // le même dessin chez un autre, en aperçu et chez un visiteur non connecté
  for (const f of FORMATS_PERMIS.reponses) {
    const a = rend(<ReponsesBloc d={AUTRE} f={f} edition={false} />);
    check(`réponses · ${f} : le même rendu chez un autre, en aperçu et pour un visiteur non connecté`, a === rend(<ReponsesBloc d={APERCU} f={f} edition={false} />) && a === rend(<ReponsesBloc d={RICHE} f={f} edition={false} />));
    check(`réponses · ${f} : chez un autre, pas de lien vers le détail par matière`, !a.includes("/moi?onglet=stats"));
  }
  // l'extra de celui dont c'est la page : le lien vers le détail par matière
  for (const f of ["tuile", "colonne", "heros", "bande"] as Format[]) {
    const autre = rend(<ReponsesBloc d={AUTRE} f={f} edition={false} />);
    const moi = rend(<ReponsesBloc d={MOI} f={f} edition={false} />);
    const sans = moi.replace(/<div class="mt-auto[^"]*"><a [^>]*>Le détail par matière.*?<\/a><\/div>/, "");
    check(`réponses · ${f} · chez soi : « Le détail par matière » (vers Moi › Statistiques), le reste identique`, moi.includes("/moi?onglet=stats") && moi.includes("Le détail par matière") && sans === autre);
  }
  const moiD = rend(<ReponsesBloc d={MOI} f="demi" edition={false} />);
  check("réponses · chez soi, demi : le lien « Le détail » à droite", moiD.includes("/moi?onglet=stats") && moiD.includes("Le détail"));
  check("réponses · demi chez un autre : pas de lien", !rend(<ReponsesBloc d={AUTRE} f="demi" edition={false} />).includes("/moi?onglet=stats"));

  // sans résumé (pas de client admin) : le total seul, sans anneau ni sources
  for (const f of FORMATS_PERMIS.reponses) {
    const html = rend(<ReponsesBloc d={SOBRE} f={f} edition={false} />);
    check(`réponses · ${f} : SOBRE (286 questions, sans résumé), le total seul`, html.includes(">286<") && !html.includes("anneau") && !html.includes('class="nom"') && !html.includes("justes"));
  }
  check("réponses : sans résumé, le bloc garde son étiquette et sa classe « seul »", rend(<ReponsesBloc d={SOBRE} f="tuile" edition={false} />).includes("scene seul"));
  const incomplet = rend(<ReponsesBloc d={{ ...MOI, reponses: { ...MOI.reponses!, incomplet: true } }} f="tuile" edition={false} />);
  check("réponses · une source illisible le dit", incomplet.includes("Au moins : certaines sources"));
  check("réponses · rien de tel quand tout se lit", !rend(<ReponsesBloc d={MOI} f="tuile" edition={false} />).includes("Au moins"));
  const zero: DonneesBlocs = { ...MOI, reponses: { ...MOI.reponses!, precision: 0, justes: 0 } };
  check("réponses : 0 % de justesse, une piste vide (pas d'arc, donc pas de point)", !rend(<ReponsesBloc d={zero} f="tuile" edition={false} />).includes('class="rempli"') && rend(<ReponsesBloc d={zero} f="tuile" edition={false} />).includes("<b>0</b> juste<"));
  const cent: DonneesBlocs = { ...MOI, reponses: { ...MOI.reponses!, precision: 100, justes: 3412 } };
  check("réponses : 100 % de justesse, l'arc plein", rend(<ReponsesBloc d={cent} f="tuile" edition={false} />).includes("--p:100") && rend(<ReponsesBloc d={cent} f="tuile" edition={false} />).includes(`${P(100)}</b>`));
  const un: DonneesBlocs = { ...MOI, reponses: { ...MOI.reponses!, precision: 100, justes: 1 } };
  check("réponses : « 1 juste » au singulier", rend(<ReponsesBloc d={un} f="tuile" edition={false} />).includes("<b>1</b> juste<"));
  const vide: DonneesBlocs = { ...SOBRE, stats: { ...SOBRE.stats, questions: 0 } };
  check("réponses : aucune question, rien en vue publique", rend(<ReponsesBloc d={vide} f="tuile" edition={false} />) === "");
  check("réponses : aucune question, l'état vide dans Personnaliser", rend(<ReponsesBloc d={vide} f="tuile" edition />).includes("rien à montrer"));
}

// ── Trophées ──
{
  const total = compter(RICHE.trophees!.lignes).total;
  check("trophées : l'exemple compte 22 trophées", total === 22);
  for (const f of FORMATS_PERMIS.trophees) {
    for (const [vue, d] of VUES) {
      const html = rend(<TropheesBloc d={d} f={f} edition={false} />);
      if (f === "demi") {
        check(`trophées · demi · ${vue} : 5 cellules (Trophées 22, puis les 4 métaux nommés, chacun avec sa médaille)`, compte(html, 'class="cellule"') === 5 && html.includes(`>${N(22)}<`) && ["Diamant", "Or", "Argent", "Bronze"].every((m) => html.includes(`>${m}<`)) && compte(html, "medaille gagne") === 4 && html.indexOf(">Diamant<") < html.indexOf(">Bronze<"));
        continue;
      }
      check(`trophées · ${f} · ${vue} : le total « 22 », les 4 cartes dans l'ordre Diamant, Or, Argent, Bronze (1, 2, 7, 12)`, html.includes(`total">${N(22)}</b>`) && compte(html, 'class="card-soft case') === 4 && html.indexOf(">Diamant<") < html.indexOf(">Or<") && html.indexOf(">Or<") < html.indexOf(">Argent<") && html.indexOf(">Argent<") < html.indexOf(">Bronze<") && ["1", "2", "7", "12"].every((n) => html.includes(`nombre">${n}</span>`)));
      check(`trophées · ${f} · ${vue} : les médailles gagnées aux couleurs du métal (Or --m2:#E2B13B), avec l'éclat, et les cartes teintées`, compte(html, "medaille gagne") === 4 && html.includes("--m2:#E2B13B") && html.includes("--m2:#AFC0F5") && compte(html, "carteMetal") === 4);
      check(`trophées · ${f} · ${vue} : le nom du métal en infobulle (« Or · Sforzinda 2 »)`, html.includes('title="Or · Sforzinda 2"') && html.includes('title="Diamant · Sforzinda 1"'));
      const parSource = f === "colonne" || f === "bande";
      check(`trophées · ${f} · ${vue} : « Par source » ${parSource ? "présent" : "absent"}`, html.includes("Par source") === parSource);
    }
    // le même dessin chez un autre, en aperçu, chez un visiteur non connecté et chez soi
    const a = rend(<TropheesBloc d={AUTRE} f={f} edition={false} />);
    check(`trophées · ${f} : le même rendu chez un autre, en aperçu, chez un visiteur non connecté et chez soi`, a === rend(<TropheesBloc d={APERCU} f={f} edition={false} />) && a === rend(<TropheesBloc d={RICHE} f={f} edition={false} />) && a === rend(<TropheesBloc d={MOI} f={f} edition={false} />));
  }
  const incomplet = rend(<TropheesBloc d={{ ...AUTRE, toi: { ...TOI_EXEMPLE, trophees: { ...TOI_EXEMPLE.trophees!, complet: false } } }} f="tuile" edition={false} />);
  check("trophées : plus de « Comparaison incomplète »", !incomplet.includes("Comparaison incomplète") && !COMPARAISON.test(incomplet));
  const sansDiamant: DonneesBlocs = { ...AUTRE, trophees: { lignes: RICHE.trophees!.lignes.filter((l) => l.palier !== 4), complet: true } };
  const zero = rend(<TropheesBloc d={sansDiamant} f="heros" edition={false} />);
  check("trophées : un métal à 0, estompé, médaille au trait et grise, sans teinte", zero.includes("case tenue") && zero.includes("medaille vide") && compte(zero, "medaille gagne") === 3 && compte(zero, "carteMetal") === 3 && zero.includes('title="Diamant · Sforzinda 0"'));
  const demiZero = rend(<TropheesBloc d={sansDiamant} f="demi" edition={false} />);
  check("trophées · demi : un métal à 0, estompé", demiZero.includes("metalDemi tenue") && compte(demiZero, "medaille gagne") === 3);
  const partiel = rend(<TropheesBloc d={{ ...APERCU, trophees: { ...RICHE.trophees!, complet: false } }} f="tuile" edition={false} />);
  check("trophées · lecture partielle (aperçu) : les cartes se montrent, sans comparaison", compte(partiel, 'class="card-soft case') === 4 && !COMPARAISON.test(partiel));

  // chez soi, rien gagné : la phrase d'amorce ; chez un autre, les cartes à zéro
  const rien = { lignes: [], complet: true };
  const moiZero = rend(<TropheesBloc d={{ ...MOI, trophees: rien }} f="tuile" edition={false} />);
  check("trophées · chez soi, aucun : la phrase d'amorce, sans cartes", moiZero.includes("Aucun trophée pour l'instant : 5/5") && !moiZero.includes("card-soft"));
  const moiRepli = rend(<TropheesBloc d={{ ...MOI, trophees: { lignes: [], complet: false } }} f="tuile" edition={false} />);
  check("trophées · chez soi, aucun, lecture partielle : la phrase de l'entraînement ciblé", moiRepli.includes("réussis une séance d'entraînement ciblé à 70 %"));
  const autreZero = rend(<TropheesBloc d={{ ...AUTRE, trophees: rien }} f="tuile" edition={false} />);
  check("trophées · chez un autre, aucun : 4 cartes estompées, pas de phrase", compte(autreZero, "case tenue") === 4 && !autreZero.includes("Aucun trophée"));
  const nul: DonneesBlocs = { ...SOBRE, trophees: null };
  check("trophées : sans lecture, rien en vue publique", rend(<TropheesBloc d={nul} f="tuile" edition={false} />) === "");
  check("trophées : sans lecture, l'état vide dans Personnaliser (demi aussi)", rend(<TropheesBloc d={nul} f="tuile" edition />).includes("rien à montrer") && rend(<TropheesBloc d={nul} f="demi" edition />).includes("rien pour l'instant"));
}

console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
process.exit(ko ? 1 : 0);
