// La partie de cartes (lib/flashcards/partie.ts) et la marque d'une carte
// donnée dans la boucle (boucle.marquerId) : réglages (matières, paquets,
// mains, cartes par main, préférences gardées), tirage et découpage en
// mains (non maîtrisées seulement, mélange, moins de cartes que voulu),
// assemblage avec le texte, jetons, série, Léonard (poses), bilan,
// « Rejouer les non maîtrisées », maîtrise lue dans les boucles (appareil ou
// compte), marque d'une carte dans la boucle de son paquet.
// Usage, depuis le dépôt : npx tsx --tsconfig tsconfig.json scripts/flashcards/test-partie.ts

import { demarrer, marquer, marquerId, phase, tourSuivant, type EtatBoucle, type Stockage } from "@/lib/flashcards/boucle";
import {
  CARTES_MAX,
  CLE_PREFS_PARTIE,
  PAR_MAIN,
  PREFS_DEFAUT,
  assembler,
  basculerMatiere,
  basculerPaquet,
  bilanDe,
  cartesMaitrisees,
  changerParMain,
  choisirMains,
  decouper,
  derniereMain,
  ecrirePrefs,
  jetonsGagnes,
  lirePrefs,
  maitriseesDe,
  maitriseesDuJoueur,
  meilleureSerie,
  niveauBilan,
  paquetsChoisis,
  paquetsVisibles,
  poseBilan,
  poseLeonard,
  reglagesInitiaux,
  rejouer,
  resumer,
  serieDePas,
  serieEnCours,
  tirer,
  titreCarte,
  vivier,
  type MatierePartie,
  type SituationTable,
  type Verdicts,
} from "@/lib/flashcards/partie";
import { cleMatiere, cleSet } from "@/lib/flashcards/progression";
import { maitriseCompteDepuis, matieresDemandees, matieresDepuis } from "@/lib/flashcards/partie-serveur";

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};

// un faux hasard reproductible
const rng = (graine = 7) => {
  let x = graine;
  return () => {
    x = (x * 16807) % 2147483647;
    return (x - 1) / 2147483646;
  };
};

const NB = 15;
const matiere = (cle: string, nom: string, abrege: string, nbPaquets: number): MatierePartie => ({
  cle,
  nom,
  abrege,
  paquets: Array.from({ length: nbPaquets }, (_, i) => ({
    id: `${cle}-p${i + 1}`,
    matiere: cle,
    numero: i + 1,
    theme: `Thème ${i + 1}`,
    cartes: Array.from({ length: NB }, (_, k) => `${cle}-p${i + 1}-c${k + 1}`),
  })),
});
const MATIERES: MatierePartie[] = [matiere("ethics", "Ethics", "ETH", 4), matiere("quant", "Quant", "QUANT", 4), matiere("economics", "Economics", "ECO", 4), matiere("fsa", "FSA", "FSA", 0)];
const aucune = new Set<string>();

// --- réglages
{
  const r = reglagesInitiaux(MATIERES);
  check("à l'ouverture : toutes les matières qui ont des cartes, pas celle sans paquet", r.matieres.join() === "ethics,quant,economics");
  check("tous leurs paquets cochés (12)", r.paquets.length === 12);
  check("défauts : 3 mains de 3 cartes, mélangées, toutes les cartes", r.mains === 3 && r.parMain === 3 && r.melanger && !r.seulementNonMaitrisees);

  const eco = reglagesInitiaux(MATIERES, ["economics"]);
  check("matière demandée : seulement elle, ses 4 paquets", eco.matieres.join() === "economics" && eco.paquets.length === 4);
  const inconnue = reglagesInitiaux(MATIERES, ["nimporte", "fsa"]);
  check("matière inconnue ou sans carte : repli sur toutes", inconnue.matieres.length === 3);

  const sans = basculerMatiere(eco, MATIERES, "economics");
  check("décocher une matière retire ses paquets", sans.matieres.length === 0 && sans.paquets.length === 0);
  const avec = basculerMatiere(sans, MATIERES, "quant");
  check("cocher une matière coche ses 4 paquets", avec.matieres.join() === "quant" && avec.paquets.length === 4);
  check("une matière sans carte ne se coche pas", basculerMatiere(avec, MATIERES, "fsa") === avec);
  check("une matière inconnue : rien", basculerMatiere(avec, MATIERES, "x") === avec);

  const un = basculerPaquet(avec, MATIERES, "quant-p2");
  check("décocher un paquet", un.paquets.length === 3 && !un.paquets.includes("quant-p2"));
  check("le recocher", basculerPaquet(un, MATIERES, "quant-p2").paquets.includes("quant-p2"));
  check("un paquet d'une matière décochée : rien", basculerPaquet(avec, MATIERES, "ethics-p1") === avec);
  check("paquets visibles : ceux des matières cochées, dans l'ordre du programme", paquetsVisibles(reglagesInitiaux(MATIERES, ["economics", "ethics"]), MATIERES).map((p) => p.id).join() === "ethics-p1,ethics-p2,ethics-p3,ethics-p4,economics-p1,economics-p2,economics-p3,economics-p4");
  check("paquets choisis : les cochés", paquetsChoisis(un, MATIERES).length === 3);

  check("mains : 3, 5, 10 seulement", choisirMains(r, 5).mains === 5 && choisirMains(r, 10).mains === 10 && choisirMains(r, 4) === r);
  check("cartes par main : bornées de 1 à 5", changerParMain(r, -9).parMain === PAR_MAIN.min && changerParMain(r, 9).parMain === PAR_MAIN.max && changerParMain(r, 1).parMain === 4);
}

// --- résumé et tirage
{
  const r = reglagesInitiaux(MATIERES, ["economics", "ethics"]); // 8 paquets, 120 cartes
  const res = resumer(r, MATIERES, aucune);
  check("résumé : 8 paquets, 120 en réserve, 9 tirées en 3 mains de 3", res.paquets === 8 && res.vivier === 120 && res.total === 9 && res.mains === 3 && res.parMain === 3);

  const maitrisees = new Set(MATIERES[2].paquets.flatMap((p) => p.cartes).slice(0, 45)); // 45 d'Economics maîtrisées
  check("vivier complet : 120", vivier(paquetsChoisis(r, MATIERES), maitrisees, false).length === 120);
  check("vivier sans les maîtrisées : 75", vivier(paquetsChoisis(r, MATIERES), maitrisees, true).length === 75);

  const non = { ...r, seulementNonMaitrisees: true };
  const mains = tirer(non, MATIERES, maitrisees, rng());
  check("tirage non maîtrisées : aucune carte maîtrisée", mains.flat().every((c) => !maitrisees.has(c.id)));
  check("3 mains de 3", mains.length === 3 && mains.every((m) => m.length === 3));
  check("pas de carte en double", new Set(mains.flat().map((c) => c.id)).size === 9);
  check("chaque carte porte son paquet et sa matière", mains.flat().every((c) => c.id.startsWith(c.setId) && c.setId.startsWith(c.matiere)));

  const melange = tirer(r, MATIERES, aucune, rng(3));
  const melange2 = tirer(r, MATIERES, aucune, rng(4));
  check("mélangé : deux graines, deux donnes", melange.flat().map((c) => c.id).join() !== melange2.flat().map((c) => c.id).join());
  check("mélangé : même graine, même donne", tirer(r, MATIERES, aucune, rng(3)).flat().map((c) => c.id).join() === melange.flat().map((c) => c.id).join());

  const ordre = tirer({ ...r, melanger: false }, MATIERES, aucune);
  check("pas mélangé : les premières, dans l'ordre des paquets", ordre.flat().map((c) => c.id).join() === "ethics-p1-c1,ethics-p1-c2,ethics-p1-c3,ethics-p1-c4,ethics-p1-c5,ethics-p1-c6,ethics-p1-c7,ethics-p1-c8,ethics-p1-c9");

  const grosse = { ...r, mains: 10 as const, parMain: 5 };
  const g = tirer(grosse, MATIERES, aucune, rng(11));
  check("10 mains de 5 : 50 cartes, jamais plus de CARTES_MAX", g.length === 10 && g.flat().length === 50 && CARTES_MAX === 50);

  // moins de cartes que voulu
  const petit = { ...reglagesInitiaux(MATIERES, ["ethics"]), seulementNonMaitrisees: true, mains: 5 as const };
  const presque = new Set(MATIERES[0].paquets.flatMap((p) => p.cartes).slice(0, 55)); // 5 restantes
  const resP = resumer(petit, MATIERES, presque);
  check("5 restantes, 5 mains de 3 voulues : 5 cartes, 2 mains", resP.vivier === 5 && resP.total === 5 && resP.mains === 2);
  const tp = tirer(petit, MATIERES, presque, rng());
  check("tirage : 3 puis 2 cartes", tp.length === 2 && tp[0].length === 3 && tp[1].length === 2);
  const tout = new Set(MATIERES[0].paquets.flatMap((p) => p.cartes));
  const resV = resumer(petit, MATIERES, tout);
  check("tout est maîtrisé : rien à distribuer", resV.total === 0 && resV.mains === 0 && tirer(petit, MATIERES, tout).length === 0);
  const sansPaquet = { ...r, paquets: [] };
  check("aucun paquet coché : rien à distribuer", resumer(sansPaquet, MATIERES, aucune).total === 0);

  check("decouper : 7 cartes par 3 → 3, 3, 1", decouper([1, 2, 3, 4, 5, 6, 7], 3).map((m) => m.length).join() === "3,3,1");
  check("decouper : vide", decouper([], 3).length === 0);

  // un paquet en double dans la sélection ne double pas ses cartes
  const doublon = vivier([MATIERES[0].paquets[0], MATIERES[0].paquets[0]], aucune, false);
  check("une carte en double dans le vivier : une fois", doublon.length === NB);
}

// --- assemblage, titres
{
  check("titre : coupé à un mot, avec points de suspension", titreCarte("Affirmative covenant vs negative covenant dans l'indenture d'une bond : quelle différence entre les deux ?").endsWith("…"));
  check("titre court : tel quel", titreCarte("Règle MR = MC") === "Règle MR = MC");
  check("titre : sans balisage ni image ni retour à la ligne", titreCarte("**Duration** de $D_{mod}$\n![x](u.png) ?") === "Duration de D_{mod} ?");
  check("titre : jamais plus long que prévu", titreCarte("a".repeat(200), 40).length <= 41);

  const refs = tirer({ ...reglagesInitiaux(MATIERES, ["ethics", "quant"]), melanger: false }, MATIERES, aucune);
  const contenus = Object.fromEntries(refs.flat().map((c) => [c.id, { front: `Q ${c.id}`, back: `R ${c.id}` }]));
  const p = assembler(refs, contenus, MATIERES, 3);
  check("assembler : 3 mains, 9 jetons", !!p && p.mains.length === 3 && p.jetons === 9 && p.parMain === 3);
  check("assembler : rangs de 1 à 9, lieu, texte", !!p && p.mains.flat().map((c) => c.rang).join() === "1,2,3,4,5,6,7,8,9" && p.mains[0][0].lieu === "Ethics · Thème 1" && p.mains[0][0].front === "Q ethics-p1-c1" && p.mains[0][0].abrege === "ETH");
  const manque = { ...contenus };
  delete manque["ethics-p1-c2"];
  const q = assembler(refs, manque, MATIERES, 3);
  check("une carte sans texte est écartée, les rangs se resserrent", !!q && q.jetons === 8 && q.mains[0].length === 2 && q.mains.flat().at(-1)!.rang === 8);
  check("rien à jouer : null", assembler(refs, {}, MATIERES, 3) === null);
}

// --- jetons, série, bilan, rejouer
{
  const refs = tirer({ ...reglagesInitiaux(MATIERES, ["ethics", "quant", "economics"]), melanger: false, parMain: 3 }, MATIERES, aucune);
  // trois cartes de chaque matière : on prend 1 de chaque dans l'ordre FI/FSA/ECO comme la maquette
  const choisies = [MATIERES[0], MATIERES[1], MATIERES[2]].flatMap((m) => m.paquets[0].cartes.slice(0, 3).map((id) => ({ id, setId: m.paquets[0].id, matiere: m.cle })));
  void refs;
  const main = (i: number) => [choisies[i], choisies[i + 3], choisies[i + 6]];
  const contenus = Object.fromEntries(choisies.map((c) => [c.id, { front: `Question ${c.id} ?`, back: `Réponse ${c.id}` }]));
  const partie = assembler([main(0), main(1), main(2)], contenus, MATIERES, 3)!;
  check("partie de 9 cartes en 3 mains", partie.jetons === 9 && partie.mains.length === 3);

  const ids = partie.mains.flat().map((c) => c.id);
  const verdicts: Verdicts = Object.fromEntries(ids.map((id, i) => [id, i !== 1 && i !== 7])); // 7 maîtrisées sur 9
  check("jetons gagnés : un par maîtrisée", jetonsGagnes(verdicts) === 7);

  const hist = [true, true, true, false, true, true, false, false, true];
  check("série en cours : 1 (la dernière)", serieEnCours(hist) === 1);
  check("série en cours : 3 maîtrisées d'affilée", serieEnCours([false, true, true, true]) === 3);
  check("pas encore d'affilée", serieDePas([true, false, false]) === 2 && serieDePas([true]) === 0);
  check("meilleure série : 3", meilleureSerie(hist) === 3 && meilleureSerie([]) === 0);

  const b = bilanDe(partie, verdicts, hist);
  check("bilan : 7 sur 9, 78 %, bon", b.total === 9 && b.maitrisees === 7 && b.pct === 78 && b.niveau === "bon" && b.jugees === 9);
  check("bilan : 3 matières dans l'ordre de la table, 3 cartes chacune", b.lignes.map((l) => l.abrege).join() === "ETH,QUANT,ECO" && b.lignes.every((l) => l.total === 3));
  check("bilan : ETH 2/3, QUANT 3/3 ou 2/3 selon l'ordre, total 7", b.lignes.reduce((n, l) => n + l.maitrisees, 0) === 7);
  check("bilan : 2 à revoir, dans l'ordre de jeu", b.aRevoir.length === 2 && b.aRevoir[0].id === ids[1] && b.aRevoir[1].id === ids[7]);
  check("bilan : meilleure série", b.meilleureSerie === 3);

  const sansFaute = bilanDe(partie, Object.fromEntries(ids.map((id) => [id, true])));
  check("sans-faute : niveau et Léonard fier", sansFaute.niveau === "sans-faute" && poseBilan(sansFaute.niveau) === "fier" && sansFaute.aRevoir.length === 0);
  check("niveaux : 6/9 bon, 5/9 moyen, 3/9 moyen, 2/9 bas, 0 sur 0 bas", niveauBilan(6, 9) === "bon" && niveauBilan(5, 9) === "moyen" && niveauBilan(3, 9) === "moyen" && niveauBilan(2, 9) === "bas" && niveauBilan(0, 0) === "bas");
  check("poses du bilan : bon fier, moyen moqueur, bas déçu", poseBilan("bon") === "fier" && poseBilan("moyen") === "moqueur" && poseBilan("bas") === "decu");

  // partie arrêtée en route : les cartes pas jugées ne sont ni maîtrisées ni à revoir
  const enRoute = bilanDe(partie, { [ids[0]]: true, [ids[1]]: false });
  check("partie arrêtée : 2 jugées sur 9, une à revoir", enRoute.jugees === 2 && enRoute.maitrisees === 1 && enRoute.aRevoir.length === 1 && enRoute.lignes[0].cartes.some((c) => c.ok === null));

  const r = rejouer(partie, verdicts, { rng: rng() });
  check("rejouer : les 2 non maîtrisées, 1 main de 2, 2 jetons", !!r && r.jetons === 2 && r.mains.length === 1 && r.mains[0].length === 2);
  check("rejouer : ce sont les bonnes cartes, rangs 1 et 2", !!r && r.mains.flat().map((c) => c.id).sort().join() === [ids[1], ids[7]].sort().join() && r.mains.flat().map((c) => c.rang).join() === "1,2");
  const r1 = rejouer(partie, verdicts, { melanger: false, parMain: 1 });
  check("rejouer sans mélange, 1 carte par main : dans l'ordre, 2 mains", !!r1 && r1.mains.length === 2 && r1.mains[0][0].id === ids[1]);
  check("rejouer sans rien à revoir : null", rejouer(partie, Object.fromEntries(ids.map((id) => [id, true]))) === null);
  check("rejouer ne touche pas la partie d'origine", partie.mains[0][1].rang === 2);
}

// --- Léonard
{
  const s = (o: Partial<SituationTable> = {}): SituationTable => ({ main: 0, nbMains: 3, tailleMain: 3, jugeesMain: 0, maitriseesMain: 0, ouverte: null, dernier: null, serie: 0, serieKo: 0, ...o });
  check("à la donne : étonné", poseLeonard(s()) === "etonne");
  check("question soulevée : moqueur", poseLeonard(s({ ouverte: "recto" })) === "moqueur");
  check("réponse retournée : étonné", poseLeonard(s({ ouverte: "verso" })) === "etonne");
  check("après Maîtrisée : fier", poseLeonard(s({ dernier: true, jugeesMain: 1, maitriseesMain: 1, serie: 1 })) === "fier");
  check("après un Pas encore : moqueur", poseLeonard(s({ dernier: false, jugeesMain: 1, serieKo: 1 })) === "moqueur");
  check("après deux Pas encore d'affilée : déçu", poseLeonard(s({ dernier: false, jugeesMain: 2, serieKo: 2 })) === "decu");
  check("main réussie (2 sur 3) : fier", poseLeonard(s({ jugeesMain: 3, maitriseesMain: 2, dernier: false })) === "fier");
  check("main ratée (1 sur 3) : déçu", poseLeonard(s({ jugeesMain: 3, maitriseesMain: 1, dernier: true })) === "decu");
  check("main d'une carte maîtrisée : fier, ratée : déçu", poseLeonard(s({ tailleMain: 1, jugeesMain: 1, maitriseesMain: 1 })) === "fier" && poseLeonard(s({ tailleMain: 1, jugeesMain: 1, maitriseesMain: 0 })) === "decu");
  check("dernière main", derniereMain(s({ main: 2 })) && !derniereMain(s({ main: 1 })));
}

// --- la maîtrise lue dans les boucles
{
  const ids = Array.from({ length: 6 }, (_, i) => `c${i + 1}`);
  const neuve = demarrer(ids, { maintenant: 1000 });
  check("boucle neuve : rien de maîtrisé", cartesMaitrisees(neuve).length === 0);

  let e = neuve;
  e = marquer(e, true, 2000); // c1 maîtrisée
  e = marquer(e, false, 3000); // c2 à revoir
  e = marquer(e, true, 4000); // c3
  check("tour 1 : les marquées vraies", cartesMaitrisees(e).sort().join() === "c1,c3");

  let t2 = marquer(marquer(marquer(e, true, 5000), true, 6000), false, 7000); // c4 c5 vraies, c6 fausse
  check("fin du tour 1 : 4 maîtrisées", cartesMaitrisees(t2).sort().join() === "c1,c3,c4,c5" && phase(t2) === "entracte");
  t2 = tourSuivant(t2, { rng: rng(), maintenant: 8000 }); // tour 2 : c2 et c6
  check("tour 2 : les sorties de la boucle restent maîtrisées", cartesMaitrisees(t2).sort().join() === "c1,c3,c4,c5");
  const t2b = marquer(t2, true, 9000);
  check("tour 2 : une de plus maîtrisée", cartesMaitrisees(t2b).length === 5);

  // appareil ou compte
  const local = { ...e, maj: 5000 };
  const compteVieux = { maj: 4000, ids: ["c1", "c2"] };
  const compteNeuf = { maj: 9000, ids: ["c1", "c2", "c3", "c4"] };
  check("l'appareil plus récent l'emporte", [...maitriseesDe(local, compteVieux)].sort().join() === "c1,c3");
  check("le compte plus récent l'emporte", [...maitriseesDe(local, compteNeuf)].sort().join() === "c1,c2,c3,c4");
  check("sans appareil : le compte", [...maitriseesDe(null, compteNeuf)].length === 4);
  check("sans compte : l'appareil", [...maitriseesDe(local, null)].length === 2);
  check("ni l'un ni l'autre : rien", maitriseesDe(null, null).size === 0);

  // toutes les boucles d'un joueur : paquet et matière
  const matieres = [matiere("ethics", "Ethics", "ETH", 2)];
  const lireLocal = (cle: string): EtatBoucle | null => (cle === cleSet("ethics-p1") ? { ...marquer(demarrer(matieres[0].paquets[0].cartes, { maintenant: 1 }), true, 2), maj: 10 } : null);
  const compte = { [cleMatiere("ethics")]: { maj: 5, ids: ["ethics-p2-c1", "ethics-p2-c2"] }, [cleSet("ethics-p1")]: { maj: 1, ids: ["ethics-p1-c9"] } };
  const tous = maitriseesDuJoueur(matieres, lireLocal, compte);
  check("maîtrise du joueur : appareil (p1-c1) + matière du compte (p2-c1, p2-c2), la ligne vieille du compte écartée", [...tous].sort().join() === "ethics-p1-c1,ethics-p2-c1,ethics-p2-c2");
}

// --- marquer une carte donnée dans la boucle
{
  const ids = ["a", "b", "c", "d"];
  const e0 = demarrer(ids, { maintenant: 1000 });

  const e1 = marquerId(e0, "c", true, 2000);
  check("marque une carte donnée : maîtrisée, vue, tour 1, carte à l'écran inchangée", e1.marques.c === true && e1.premier.c === true && e1.vues === 1 && e1.derniere === "c" && e1.pos === 0 && e1.tour === 1 && e1.fin === null && phase(e1) === "carte");
  check("l'ancien état n'est pas modifié", e0.vues === 0 && Object.keys(e0.marques).length === 0);

  const e2 = marquerId(e1, "a", false, 3000);
  check("la carte à l'écran marquée : on passe à la suivante sans marque", e2.pos === 1 && e2.file[e2.pos] === "b");
  check("temps actif et horodatage", e2.dernier === 3000 && e2.actif === 2000);
  check("même marque deux fois : l'état tel quel", marquerId(e2, "a", false, 4000) === e2);
  const e3 = marquerId(e2, "a", true, 4000);
  check("changer d'avis : « Pas encore » devient « Maîtrisée » (premier tour compris)", e3.marques.a === true && e3.premier.a === true);
  check("carte inconnue : l'état tel quel", marquerId(e0, "zzz", true) === e0);

  let f = marquerId(marquerId(marquerId(marquerId(e0, "a", true, 10), "b", true, 20), "c", true, 30), "d", true, 40);
  check("tout maîtrisé : la boucle est finie", phase(f) === "fin" && f.fin === 40 && f.pos === 4);
  check("boucle finie : « Maîtrisé » reste, rien ne change", marquerId(f, "a", false, 50) === f);

  const g = marquerId(marquerId(marquerId(marquerId(e0, "a", true, 10), "b", false, 20), "c", true, 30), "d", true, 40);
  check("tout marqué avec un « À revoir » : entracte", phase(g) === "entracte" && g.fin === null && g.pos === 4);
  const g2 = marquerId(g, "b", true, 50);
  check("l'entracte : la dernière « À revoir » maîtrisée finit la boucle", phase(g2) === "fin" && g2.fin === 50);
  const g3 = marquerId(g, "a", false, 50);
  check("l'entracte : une deuxième « À revoir » reste en entracte", phase(g3) === "entracte" && g3.fin === null);

  // tour 2 : seulement les « À revoir » comptent
  const t2 = tourSuivant(g, { rng: rng(), maintenant: 100 });
  check("tour 2 : la file est « b »", t2.tour === 2 && t2.file.join() === "b");
  check("carte maîtrisée au tour d'avant : l'état tel quel", marquerId(t2, "a", false, 110) === t2);
  const t2f = marquerId(t2, "b", true, 120);
  check("tour 2 : la dernière carte maîtrisée finit la boucle, le premier tour garde son score", phase(t2f) === "fin" && t2f.premier.b === false && t2f.premier.a === true);

  // même résultat que le geste de la révision quand c'est la carte à l'écran
  const viaRevision = marquer(e0, true, 2000);
  const viaPartie = marquerId(e0, "a", true, 2000);
  check("sur la carte à l'écran : identique à marquer", JSON.stringify(viaRevision) === JSON.stringify(viaPartie));
}

// --- ce que lit le serveur : matières, paquets, maîtrise du compte
{
  const U = (n: number) => `${String(n).padStart(8, "0")}-0000-0000-0000-000000000000`;
  const paquets = [
    { id: U(2), title: "Fixed Income — Flashcards 2/4 (Duration & convexity)", visibility: "public", library_folders: { name: "Fixed Income (Système)" } },
    { id: U(1), title: "Fixed Income — Flashcards 1/4 (Instruments, émission & marchés)", visibility: "public", library_folders: { name: "Fixed Income (Système)" } },
    { id: U(9), title: "Ethics — Flashcards 1/4 (Code et Standards)", visibility: "public", library_folders: [{ name: "Ethics (Système)" }] },
    { id: U(8), title: "Mocks officiels — Flashcards 1/1", visibility: "public", library_folders: { name: "Mocks Officiels" } },
  ];
  const cartesSql = [
    { id: "c-b", set_id: U(1), position: 2 },
    { id: "c-a", set_id: U(1), position: 1 },
    { id: "c-d", set_id: U(2), position: 1 },
    { id: "c-e", set_id: U(9), position: 1 },
  ];
  const m = matieresDepuis(paquets, cartesSql);
  check("10 matières, toujours, dans l'ordre du programme", m.length === 10 && m[0].cle === "ethics");
  const fi = m.find((x) => x.cle === "fixed_income")!;
  check("Fixed Income : 2 paquets, rangés par numéro", fi.paquets.map((p) => p.numero).join() === "1,2" && fi.paquets[0].id === U(1));
  check("cartes du paquet dans l'ordre des positions", fi.paquets[0].cartes.join() === "c-a,c-b" && fi.paquets[1].cartes.join() === "c-d");
  check("thème du paquet, nom et abréviation de la matière", fi.paquets[1].theme === "Duration & convexity" && fi.nom === "Fixed Income" && fi.abrege === "FI");
  check("dossier donné en tableau : reconnu", m[0].paquets.length === 1 && m[0].paquets[0].cartes.join() === "c-e");
  check("matière sans paquet : vide (« bientôt »)", m.find((x) => x.cle === "derivatives")!.paquets.length === 0);
  check("un paquet hors programme n'entre dans aucune matière", m.flatMap((x) => x.paquets).every((p) => p.id !== U(8)));

  // la maîtrise du compte : paquet 1 (c-a maîtrisée), matière entière (c-d maîtrisée)
  const ids = ["c-a", "c-b"];
  const lignePaquet = { etat: { ...marquer(demarrer(ids, { maintenant: 1 }), true, 2), maj: 777 }, maj: 700 };
  const ligneMatiere = { etat: { ...marquer(demarrer(["c-a", "c-b", "c-d"], { maintenant: 1 }), true, 2), maj: 888 }, maj: 800 };
  const lignes = new Map<string, { etat: unknown; maj: number }>([
    [cleSet(U(1)), lignePaquet],
    [cleMatiere("fixed_income"), ligneMatiere],
    [cleSet(U(2)), { etat: "n'importe quoi", maj: 5 }],
  ]);
  const c = maitriseCompteDepuis(lignes, m);
  check("compte : la boucle du paquet (version de l'état, cartes maîtrisées)", c[cleSet(U(1))]?.maj === 777 && c[cleSet(U(1))].ids.join() === "c-a");
  check("compte : la boucle de la matière", c[cleMatiere("fixed_income")]?.maj === 888 && c[cleMatiere("fixed_income")].ids.join() === "c-a");
  check("compte : une ligne illisible est ignorée, une boucle jamais écrite n'a pas d'entrée", c[cleSet(U(2))] === undefined && c[cleMatiere("ethics")] === undefined);
  check("compte vide : rien", Object.keys(maitriseCompteDepuis(new Map(), m)).length === 0);

  check("?matiere= : clés du programme, noms anciens compris, sans doublon", matieresDemandees("fsa", "FSA", "inconnue", undefined).join() === "fsa" && matieresDemandees("fixed_income,quant").join() === "fixed_income,quant");
  check("?matiere= en tableau", matieresDemandees(["ethics", "quant"]).join() === "ethics,quant");
  check("?matiere= absent : aucune", matieresDemandees(undefined, undefined).length === 0);
}

// --- préférences gardées
{
  const mem = new Map<string, string>();
  const st: Stockage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v), removeItem: (k) => void mem.delete(k) };
  check("rien de gardé : rien", Object.keys(lirePrefs(st)).length === 0);
  const r = { ...reglagesInitiaux(MATIERES), mains: 5 as const, parMain: 4, seulementNonMaitrisees: true, melanger: false };
  ecrirePrefs(r, st);
  const p = lirePrefs(st);
  check("préférences relues", p.mains === 5 && p.parMain === 4 && p.seulementNonMaitrisees === true && p.melanger === false);
  const r2 = reglagesInitiaux(MATIERES, [], p);
  check("réglages d'après les préférences", r2.mains === 5 && r2.parMain === 4 && r2.seulementNonMaitrisees && !r2.melanger);
  mem.set(CLE_PREFS_PARTIE, JSON.stringify({ mains: 7, parMain: 99, melanger: "oui" }));
  const q = lirePrefs(st);
  check("préférences abîmées : écartées ou bornées", q.mains === undefined && q.parMain === PAR_MAIN.max && q.melanger === undefined);
  mem.set(CLE_PREFS_PARTIE, "{pas du json");
  check("JSON illisible : rien", Object.keys(lirePrefs(st)).length === 0);
  const casse: Stockage = { getItem: () => { throw new Error("bloqué"); }, setItem: () => { throw new Error("bloqué"); }, removeItem: () => undefined };
  ecrirePrefs(r, casse);
  check("stockage bloqué : sans erreur", Object.keys(lirePrefs(casse)).length === 0);
  check("défauts exportés", PREFS_DEFAUT.mains === 3 && PREFS_DEFAUT.parMain === 3 && PREFS_DEFAUT.melanger);
}

console.log(ko ? `\n${ko} échec(s)` : "\nTout est vert.");
process.exit(ko ? 1 : 0);
