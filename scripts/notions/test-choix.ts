// Le calcul du choix par notion. Lancer : npx tsx --tsconfig ./tsconfig.json scripts/notions/test-choix.ts
import { choixDisponible, choixVide, contientRecherche, matiereDeNotion, matieresDuChoix, plat, questionsDuChoix, type NotionDispo } from "@/lib/notions-choix";
import { chercherProches, ecart, motsDe, type IndexMots } from "@/lib/notions-proches";
import { paramsDepuisJson, paramsParDefaut, paramsVersJson } from "@/lib/salles/logique";

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

console.log(ko ? `${ko} vérification(s) en échec` : "tout est vert");
process.exit(ko ? 1 : 0);
