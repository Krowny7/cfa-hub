// Le calcul du choix par notion. Lancer : npx tsx --tsconfig ./tsconfig.json scripts/notions/test-choix.ts
import { choixDisponible, choixVide, contientRecherche, partagerFaibles, matiereDeNotion, matieresDuChoix, plat, questionsDuChoix, type NotionDispo } from "@/lib/notions-choix";
import { chercherProches, ecart, motsDe, type IndexMots } from "@/lib/notions-proches";
import { bilanRetest, lienSimilaires, lireSimilaires, ratures, type CibleRetest } from "@/lib/notions-similaires";
import { libelleParams, paramsDepuisJson, paramsParDefaut, paramsVersJson, roundsMax, tailleRounds, validerParams } from "@/lib/salles/logique";
import { libelleSession, paramsPourRejouer, rideauDeFin, serieFinale, titreSession } from "@/lib/salles/partie";
import type { SalleSerie } from "@/lib/salles/types";

let ko = 0;
const check = (label: string, cond: boolean) => {
  console.log((cond ? "ok   " : "KO   ") + label);
  if (!cond) ko++;
};

const dispo: NotionDispo[] = [
  { notion: "fsa:3", total: 80, concepts: [{ concept: "EPS", total: 20 }, { concept: "Revenus", total: 10 }] },
  { notion: "alternatives:2", total: 70, concepts: [{ concept: "Frais", total: 30 }] },
  { notion: "ethics:3", total: 400, concepts: [] },
];

check("la matière d'une notion", matiereDeNotion("fixed_income:11") === "fixed_income");
check("un choix vide", choixVide({ notions: [], concepts: [] }) && !choixVide({ notions: ["fsa:3"], concepts: [] }));
check("les matières viennent des notions et des concepts", matieresDuChoix({ notions: ["ethics:3"], concepts: ["Frais"] }, dispo).sort().join() === "alternatives,ethics");
check("les questions s'additionnent", questionsDuChoix({ notions: ["ethics:3"], concepts: ["EPS", "Frais"] }, dispo) === 450);
check("une notion cochée compte déjà ses concepts", questionsDuChoix({ notions: ["fsa:3"], concepts: ["EPS"] }, dispo) === 80);
check("la recherche ignore accents et majuscules", plat("Éthique") === "ethique");
const reste = choixDisponible({ notions: ["fsa:3", "quant:4"], concepts: ["Frais", "Absent"] }, dispo);
check("un choix perd ce que la source ne propose plus", reste.notions.join() === "fsa:3" && reste.concepts.join() === "Frais");

const p = { ...paramsParDefaut(), notions: ["fsa:3"], concepts: ["EPS"] };
const json = paramsVersJson(p);
check("les réglages envoient les notions", JSON.stringify(json.notions) === '["fsa:3"]' && JSON.stringify(json.concepts) === '["EPS"]');
check("sans choix, rien n'est envoyé", !("notions" in paramsVersJson(paramsParDefaut())));
const relu = paramsDepuisJson({ ...json });
check("les réglages relus gardent les notions", relu.notions?.[0] === "fsa:3" && relu.concepts?.[0] === "EPS");

const valide = validerParams({ ...paramsParDefaut(), notions: ["fsa:3"], concepts: ["EPS"], rounds: 3 });
check("le lancement garde les notions et les rounds", valide.ok && valide.params.notions?.[0] === "fsa:3" && valide.params.concepts?.[0] === "EPS" && valide.params.rounds === 3);
check("ce qui part au serveur les porte", valide.ok && JSON.stringify(paramsVersJson(valide.params).notions) === '["fsa:3"]' && paramsVersJson(valide.params).rounds === 3);
const surMock = paramsVersJson({ ...paramsParDefaut(), source: "examen", mock: { examens: ["Mock A — Session 1"], version: "base", complet: true, ordre: "examen" }, notions: ["fsa:3"], concepts: [] });
check("un mock envoie aussi les notions", JSON.stringify(surMock.notions) === '["fsa:3"]');

check("les mots : sans accents, sans s final, sans mots vides ni nombres", motsDe("The Incentive fees de 20 % coûts P/E").join() === "incentive,fee,cout,p/e");
check("loss garde ses deux s", motsDe("loss").join() === "loss");
check("annuities donne annuity", motsDe("annuities").join() === "annuity");
check("une recherche courte vise le début d'un mot", contientRecherche("Les composantes de l'IPS", "ips") && !contientRecherche("Relationships", "ips") && contientRecherche("Duration", "dur"));
check("une recherche longue cherche partout", contientRecherche("Hyperinflation", "inflation"));
check("l'écart compte une inversion pour une lettre", ecart("incentvie", "incentive", 2) === 1 && ecart("bilan", "bilan", 1) === 0 && ecart("bilan", "duration", 2) === 3);

const index: IndexMots = {
  cibles: [["alternatives:2", "Frais", 30], ["fsa:3", "EPS", 20], ["ethics:3", null, 400], ["quant:9", "Absent de la source", 9]],
  mots: { incentive: [0, 12, 1, 1], fee: [0, 20, 2, 3], dilution: [1, 8], absent: [3, 5], carried: [1, 2], interest: [1, 3, 2, 9], "carried interest": [0, 3], bootstrap: [1, 4], deferred: [0, 40], differed: [1, 2], "sharpe ratio": [1, 5], sharp: [2, 3], ratio: [2, 9], goodwill: [1, 6], rare: [3, 9, 0, 1] },
};
const noms = (r: ReturnType<typeof chercherProches>) => r.map((p) => `${p.notion}=${p.concepts.join("+")}`).join(" ");
check("plusieurs mots : la cible qui les porte tous, et elle seule", noms(chercherProches("incentives fees", index, dispo)) === "alternatives:2=Frais");
check("un seul des mots connu : il suffit", noms(chercherProches("zzzz fee", index, dispo)) === "alternatives:2=Frais");
check("une expression connue passe avant ses deux mots", noms(chercherProches("carried interest", index, dispo)) === "alternatives:2=Frais");
check("le début d'un mot suffit", noms(chercherProches("incent", index, dispo)).startsWith("alternatives:2=Frais"));
check("une faute de frappe passe", noms(chercherProches("incentvie", index, dispo)).startsWith("alternatives:2=Frais"));
check("ce que la source ne propose pas reste dehors", chercherProches("absent", index, dispo).length === 0);
check("rien de connu, rien de proche", chercherProches("zzzz", index, dispo).length === 0);
check("les mots réservés de JavaScript ne cassent rien", chercherProches("constructor", index, dispo).length === 0 && chercherProches("__proto__", index, dispo).length === 0 && chercherProches("tostring", index, dispo).length === 0);
check("un mot plus long mène à son radical", noms(chercherProches("bootstrapping", index, dispo)) === "fsa:3=EPS");
check("une faute va vers le mot le plus courant", noms(chercherProches("deffered", index, dispo)).startsWith("alternatives:2=Frais"));
check("une faute dans une expression se corrige", noms(chercherProches("sharp ratio", index, dispo)) === "fsa:3=EPS");
check("un nom français rejoint le mot des questions", noms(chercherProches("écart d'acquisition", index, dispo)) === "fsa:3=EPS");
check("une cible hors source ne fait pas de l'ombre aux autres", noms(chercherProches("absent fee", index, dispo)) === "alternatives:2=Frais");
check("les résultats sont pris dans la source avant d'être comptés", noms(chercherProches("rare", index, dispo)) === "alternatives:2=Frais");
const libelles: IndexMots = { cibles: [["fsa:3", "EPS", 20], ["alternatives:2", "Frais", 30]], mots: { frais: [0, 9, 1, 5] } };
check("le terme présent dans le libellé passe devant", chercherProches("frais", libelles, dispo)[0]?.notion === "alternatives:2");

check("les rounds se partagent les questions, les premiers prennent le reste", tailleRounds(10, 3).join() === "4,3,3" && tailleRounds(30, 3).join() === "10,10,10");
check("un round garde au moins une question, sans autre limite", roundsMax(5) === 5 && roundsMax(3000) === 3000);
check("100 rounds de 30 et 10 rounds de 180 passent", validerParams({ ...paramsParDefaut(), nombre: 3000, rounds: 100 }).ok && validerParams({ ...paramsParDefaut(), nombre: 1800, rounds: 10 }).ok);
check("100 rounds de 30 se partagent à parts égales", tailleRounds(3000, 100).every((n) => n === 30) && tailleRounds(3000, 100).length === 100);
check("zéro round est refusé", !validerParams({ ...paramsParDefaut(), rounds: 0 }).ok);
const relue = paramsDepuisJson({ ...paramsVersJson({ ...paramsParDefaut(), rounds: 3 }), round: 2 });
check("une partie relue sait son round", relue.rounds === 3 && relue.round === 2 && titreSession({ numero: 7, params: relue }) === "Round 2 sur 3");
check("en chrono global, le résumé annonce la durée d'un round", libelleParams({ ...paramsParDefaut(), nombre: 3000, temps: 90, rounds: 100, chrono: "global" }).includes("chrono global 45 min par round") && libelleParams({ ...paramsParDefaut(), nombre: 3000, temps: 90, rounds: 100, chrono: "global" }).includes("100 rounds"));
check("une partie sans round garde son nom", titreSession({ numero: 7, params: paramsDepuisJson(paramsVersJson(paramsParDefaut())) }) === "Partie 7");
check("rejouer garde les rounds et les notions", paramsPourRejouer({ ...relue, notions: ["fsa:3"], concepts: [] }).rounds === 3 && paramsPourRejouer({ ...relue, notions: ["fsa:3"], concepts: [] }).notions?.[0] === "fsa:3");
const ligneSerie = { rang: 1, userId: "a", username: "A", avatarUrl: null, points: 1700, bonnes: 2, repondues: 2, tempsMs: 5, rangAvant: 1, pointsRound: 800, pointsAvant: 900, parRound: { 1: 900, 2: 800 } };
const serieEnCours: SalleSerie = { id: "s", round: 2, rounds: 3, finie: false, termineeAt: null, parties: [], prochain: 3, total: 7, classement: [ligneSerie] };
const serieFinie: SalleSerie = { ...serieEnCours, round: 3, finie: true, total: 10 };
check("la partie n'est conclue qu'une fois le dernier classement lu", serieFinale(serieEnCours) === null && serieFinale({ ...serieFinie, classement: [] }) === null && serieFinale(serieFinie) === serieFinie);
const partieRound = { id: "p", nb: 3, params: { rounds: 3 } };
check("le rideau du dernier round parle de toute la partie, sous sa propre clé", rideauDeFin(partieRound, [], serieFinie).session.nb === 10 && rideauDeFin(partieRound, [], serieFinie).classement.length === 1 && rideauDeFin(partieRound, [], serieFinie).session.id === "p:finale" && !rideauDeFin(partieRound, [], serieFinie).titre);
check("le rideau d'un round dit que le round est fini", rideauDeFin(partieRound, [], serieEnCours).session.nb === 3 && rideauDeFin(partieRound, [], serieEnCours).titre === "Round terminé");
check("une partie simple garde son rideau", rideauDeFin({ id: "p", nb: 3, params: {} }, [], null).titre === undefined);
check("le résumé d'un round annonce le round, pas toute la série", libelleSession({ nb: 10, params: { ...relue, nombre: 30 } }).startsWith("10 questions") && libelleSession({ nb: 30, params: paramsDepuisJson(paramsVersJson({ ...paramsParDefaut(), nombre: 30 })) }).startsWith("30 questions"));

const faiblesSalle = [{ notion: "fsa:3", joueurs: 2 }, { notion: "quant:1", joueurs: 3 }, { notion: "ethics:3", joueurs: 1 }];
const partage = partagerFaibles([{ notion: "quant:1" }, { notion: "fsa:3" }, { notion: "ethics:3" }], faiblesSalle);
check("les notions communes passent à part, dans leur ordre", partage.communes.map((n) => n.notion).join() === "quant:1,fsa:3" && partage.seules.map((n) => n.notion).join() === "ethics:3");

const a1 = "11111111-1111-4111-8111-111111111111";
const a2 = "22222222-2222-4222-8222-222222222222";
check("les ratures : sans doublon, ni vide, ni autre chose qu'un identifiant", ratures([a1, a1, "", null, "x", a2]).join() === `${a1},${a2}`);
check("le lien du retest se relit", lireSimilaires(lienSimilaires([a1, a2]).split("=")[1]).length === 2 && lireSimilaires("<script>,1").length === 0 && lireSimilaires(null).length === 0);
const quatreVingts = Array.from({ length: 80 }, (_, i) => `${String(i).padStart(8, "0")}-1111-4111-8111-111111111111`);
check("les ratures sont plafonnées, réparties sur toute la copie", ratures(quatreVingts).length === 60 && ratures(quatreVingts).at(-1) === quatreVingts[78] && new Set(ratures(quatreVingts)).size === 60);
const cible = (id: string, concept: string | null): CibleRetest => ({ questionId: id, topic: "fsa", notion: "fsa:2", concept });
const bilan = bilanRetest([cible("a", "EPS"), cible("b", "EPS"), cible("c", "Goodwill"), cible("d", "Stocks"), cible("e", "Stocks"), cible("f", null), cible("g", "Absent")], [
  { question_id: "a", is_correct: true },
  { question_id: "b", is_correct: true },
  { question_id: "c", is_correct: false },
  { question_id: "d", is_correct: true },
  { question_id: "e", is_correct: false },
  { question_id: "f", is_correct: true },
]);
check("le bilan : ce qui coince d'abord, puis les progrès, puis ce qui est compris", bilan.map((l) => `${l.libelle}:${l.verdict}`).join() === "Goodwill:fragile,Stocks:en_progres,Analyse des États Financiers:compris,EPS:compris");
check("le bilan compte les justes par concept, et oublie ce qui n'a pas été corrigé", bilan.find((l) => l.libelle === "Stocks")?.justes === 1 && bilan.find((l) => l.libelle === "Stocks")?.total === 2 && !bilan.some((l) => l.libelle === "Absent"));

console.log(ko ? `${ko} vérification(s) en échec` : "tout est vert");
process.exit(ko ? 1 : 0);
