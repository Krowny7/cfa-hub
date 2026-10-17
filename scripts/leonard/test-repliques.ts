// Tests légers de Léonard (V3 §11.1, §11.2), sans navigateur ni réseau :
//   npx tsx --tsconfig tsconfig.json scripts/leonard/test-repliques.ts
// Vérifie : les répliques des échecs, du retour et de la nuit (aucun mot qui
// moque l'effort ou l'absence ; chaque réplique d'échec a une `action` vers
// une page qui existe, sans `topic=all` ; les marqueurs que leur émetteur
// remplit ; pas de doublon) ; le plafond de 5 apparitions par jour de Paris
// (prioritaires comptées, visite hors compte, jour J et mode sobre muets,
// écart de 4 minutes, hasard, minuit à Paris) ; l'hôte branché sur ce plafond
// et son bouton d'action de 44 px (la bulle attend tant qu'on la survole) ;
// la visite en 4 étapes et les nouveautés v3 (V3 §11.4), leurs cibles posées
// dans les pages.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { EVENEMENTS_DELICATS, EVENEMENTS_ECHEC, NOUVEAUTES, REPLIQUES, TUTO, type Replique } from "@/lib/leonard/repliques";
import { VERSION_NOUVEAUTES, VERSION_PRESENTATION, nouveautesVues, visiteVue } from "@/lib/presentation";
import { ECART_MIN, MAX_JOUR, PRIORITAIRES, decider, jourParis, type Compteur, type Contexte } from "@/lib/leonard/apparitions";
import type { EvenementLeonard } from "@/lib/leonard/signal";

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const J = JSON.stringify;
const RACINE = process.cwd();

// ── les répliques ────────────────────────────────────────────────────────
// minuscules, apostrophe droite : « T’as » et « t'as » se valent
const plat = (t: string) => t.toLowerCase().replace(/[’‘]/g, "'");
const INTERDITS: (string | RegExp)[] = [
  /\bnul(le|s|les)?\b/, /\bparess/, "flemm", "encore raté", "tu abandonnes", "abandonn", "honte", "lamentable", "pathétique", "minable",
  "au pif", "au hasard", "exprès", "congés payés", "revenant", "on te croyait perdu", "t'as raté", "wasted", "you died", "coffin", "bref.",
];
const interditDans = (t: string) => INTERDITS.find((m) => (typeof m === "string" ? plat(t).includes(m) : m.test(plat(t))));

for (const evt of EVENEMENTS_DELICATS) {
  const liste = REPLIQUES[evt] ?? [];
  const fautes = liste.flatMap((r) => {
    const m = interditDans(r.texte);
    return m ? [`« ${r.texte} » (${String(m)})`] : [];
  });
  check(`${evt} : aucun mot qui moque l'effort ou l'absence`, fautes.length === 0, fautes.join(" ; "));
}

// le chemin d'une action : une page de l'app (app/<chemin>/page.tsx)
const pageExiste = (href: string) => {
  const chemin = href.split("?")[0].replace(/^\//, "");
  return existsSync(join(RACINE, "app", chemin, "page.tsx"));
};
for (const evt of EVENEMENTS_ECHEC) {
  const liste = REPLIQUES[evt] ?? [];
  const sans = liste.filter((r) => !r.action || !r.action.libelle.trim() || !r.action.href.startsWith("/"));
  check(`${evt} : au moins 4 répliques, chacune avec son action`, liste.length >= 4 && sans.length === 0, sans.map((r) => r.texte).join(" ; "));
}
const actions = Object.values(REPLIQUES).flatMap((l) => l.flatMap((r) => (r.action ? [r.action] : [])));
const mortes = [...new Set(actions.map((a) => a.href))].filter((h) => !pageExiste(h));
check("Chaque action mène à une page qui existe", actions.length > 0 && mortes.length === 0, mortes.join(", "));
check("Aucune action en topic=all", actions.every((a) => !a.href.includes("topic=all")));
check("Libellés d'action courts (un bouton, 24 signes au plus)", actions.every((a) => a.libelle.length <= 24), J(actions.filter((a) => a.libelle.length > 24)));
check(
  "La réplique de l'exemple (§11.1) : « elle aura séché » + Voir mes ratures",
  REPLIQUES["session-ratee"].some((r) => /elle aura séché/.test(r.texte) && r.action?.libelle === "Voir mes ratures"),
);
check("« Dix minutes à l'Atelier ? » + Atelier", REPLIQUES["session-ratee"].some((r) => /Dix minutes à l’Atelier/.test(r.texte) && r.action?.href === "/atelier"));
check("La nuit : pas de bouton (on l'envoie dormir)", REPLIQUES.tard.every((r) => !r.action));

// les marqueurs que chaque émetteur remplit (lib/leonard/signal, Verdict, DefiResult)
const MARQUEURS: Partial<Record<EvenementLeonard, string[]>> = {
  "erreurs-serie": ["score", "pct", "n"],
  "session-ratee": ["score", "pct", "n"],
  "session-moyenne": ["score", "pct", "n"],
  tard: ["score", "pct", "n"],
  "defi-rate": ["score", "pct"],
  "duel-perdu": ["score"],
  "duel-ecrase": ["score"],
  "atelier-dur": ["score", "n", "notion"],
  retour: [],
};
for (const [evt, permis] of Object.entries(MARQUEURS) as [Exclude<EvenementLeonard, "tuto" | "nouveautes">, string[]][]) {
  const hors = REPLIQUES[evt].flatMap((r) => [...r.texte.matchAll(/[{](\w+)[}]/g)].map((m) => m[1]).filter((k) => !permis.includes(k)));
  check(`${evt} : seulement les marqueurs remplis par son émetteur`, hors.length === 0, hors.join(", "));
}
const tous: Replique[] = Object.values(REPLIQUES).flat();
const textes = tous.map((r) => r.texte);
check("Aucune réplique en double", new Set(textes).size === textes.length);
check("Poses connues", tous.every((r) => ["base", "fier", "moqueur", "decu", "etonne"].includes(r.pose)));
// après un échec, Léonard ne prend jamais l'air moqueur (§11.1 : la pointe vise lui-même, Florence ou la finance)
check(
  "Aucune réplique d'échec en pose moqueur",
  EVENEMENTS_ECHEC.every((e) => REPLIQUES[e].every((r) => r.pose !== "moqueur")),
  J(EVENEMENTS_ECHEC.flatMap((e) => REPLIQUES[e].filter((r) => r.pose === "moqueur").map((r) => r.texte))),
);

// ── le plafond des apparitions ──────────────────────────────────────────
const T0 = Date.parse("2026-10-17T08:00:00Z"); // 10 h à Paris
const MIN = 60_000;
const ctx = (c: Partial<Contexte> = {}): Contexte => ({ compteur: { j: "", n: 0 }, dernier: 0, maintenant: T0, jourJ: false, sobre: false, hasard: 0, ...c });

/** Une journée de signaux, espacés de `pas` : ce qui apparaît, compteur tenu comme l'hôte le tient. */
function journee(evts: EvenementLeonard[], pas = 5 * MIN, depart: Partial<Contexte> = {}) {
  let compteur: Compteur = depart.compteur ?? { j: "", n: 0 };
  let dernier = 0;
  const vus: EvenementLeonard[] = [];
  evts.forEach((evt, k) => {
    const maintenant = T0 + k * pas;
    const d = decider(evt, ctx({ ...depart, compteur, dernier, maintenant }));
    if (d.ok) {
      compteur = d.compteur;
      dernier = maintenant;
      vus.push(evt);
    }
  });
  return { vus, compteur };
}

check("Plafond : 5 par jour", MAX_JOUR === 5);
{
  const { vus, compteur } = journee(Array(8).fill("quete-faite"));
  check("Huit réactions ordinaires espacées : 5 apparaissent", vus.length === 5 && compteur.n === 5, J({ vus: vus.length, compteur }));
}
{
  const { vus } = journee(["quete-faite", "duel-gagne", "atelier-fini", "defi-reussi", "rang-monte", "sceau-gagne", "session-parfaite", "progression"]);
  check("Les prioritaires comptent dans les 5 (rang, sceau, sans-faute, progression refusés au-delà)", vus.length === 5 && vus[4] === "rang-monte", J(vus));
}
{
  const plein: Compteur = { j: jourParis(T0), n: 5 };
  const d = decider("tuto", ctx({ compteur: plein }));
  check("La visite passe même à 5, sans compter", d.ok && d.compteur.n === 5, J(d));
  const n = decider("nouveautes", ctx({ compteur: { j: jourParis(T0), n: 2 } }));
  check("Les nouveautés non plus ne comptent pas", n.ok && n.compteur.n === 2, J(n));
  const r = decider("rang-monte", ctx({ compteur: plein }));
  check("Une montée de rang à 5 : refusée (plafond)", !r.ok && r.refus === "plafond", J(r));
}
{
  const evts: EvenementLeonard[] = ["tuto", "rang-monte", "furtif", "sceau-gagne", "retour"];
  const refus = evts.map((e) => decider(e, ctx({ jourJ: true })));
  check("Le jour J : rien, pas même la visite ni un prioritaire", refus.every((d) => !d.ok && d.refus === "jour-j"), J(refus));
  const { vus } = journee(Array(6).fill("quete-faite"), 5 * MIN, { jourJ: true });
  check("Le jour J, une journée entière de signaux : aucune apparition", vus.length === 0);
}
{
  const f = decider("furtif", ctx({ sobre: true }));
  const p = decider("sceau-gagne", ctx({ sobre: true }));
  const v = decider("tuto", ctx({ sobre: true }));
  check("Mode sobre : ni furtif ni prioritaire", !f.ok && f.refus === "sobre" && !p.ok && p.refus === "sobre", J({ f, p }));
  check("Mode sobre : la visite reste", v.ok);
}
{
  const proche = decider("quete-faite", ctx({ dernier: T0 - (ECART_MIN - MIN) }));
  const prio = decider("progression", ctx({ dernier: T0 - MIN }));
  const loin = decider("quete-faite", ctx({ dernier: T0 - ECART_MIN }));
  check("Écart : une réaction ordinaire 3 min après une autre est refusée", !proche.ok && proche.refus === "ecart", J(proche));
  check("Écart : un prioritaire passe 1 min après", prio.ok, J(prio));
  check("Écart : 4 min après, elle passe", loin.ok, J(loin));
  check("Une seule journée resserrée : jamais plus d'une apparition ordinaire par 4 min", journee(Array(10).fill("quete-faite"), MIN).vus.length === 3);
}
{
  const non = decider("session-moyenne", ctx({ hasard: 0.5 }));
  const oui = decider("session-moyenne", ctx({ hasard: 0.2 }));
  check("Hasard : session moyenne à 0,5 refusée (30 %), à 0,2 montrée", !non.ok && non.refus === "hasard" && oui.ok, J({ non, oui }));
  check("Les visites sont prioritaires", PRIORITAIRES.has("tuto") && PRIORITAIRES.has("nouveautes"));
}
{
  // minuit à Paris (UTC+2 en octobre) : 21 h 30 UTC = 23 h 30 la veille, 22 h 30 UTC = 0 h 30 le lendemain
  const veille: Compteur = { j: "2026-10-16", n: 5 };
  const avant = decider("quete-faite", ctx({ compteur: veille, maintenant: Date.parse("2026-10-16T21:30:00Z") }));
  const apres = decider("quete-faite", ctx({ compteur: veille, maintenant: Date.parse("2026-10-16T22:30:00Z") }));
  check("23 h 30 à Paris : encore le même jour, plafond atteint", !avant.ok && avant.refus === "plafond", J(avant));
  check("0 h 30 à Paris : jour nouveau, compteur remis à 1", apres.ok && apres.compteur.j === "2026-10-17" && apres.compteur.n === 1, J(apres));
  check("jourParis : « 2026-10-17 »", jourParis(T0) === "2026-10-17");
}

// ── l'hôte branché ───────────────────────────────────────────────────────
const hote = readFileSync(join(RACINE, "components/leonard/LeonardHote.tsx"), "utf8");
check("L'hôte décide avec lib/leonard/apparitions (plus de plafond à 10 en local)", /from "@\/lib\/leonard\/apparitions"/.test(hote) && /decider\(sig\.evt/.test(hote) && !/MAX_JOUR\s*=/.test(hote));
check("L'hôte lit le jour J (data-jour-j) et le mode sobre (lireSobre de lib/codex/sobre)", /\[data-jour-j\]/.test(hote) && hote.includes('from "@/lib/codex/sobre"') && /sobreDuCompte\(data\.session/.test(hote));
check("L'hôte affiche l'action en bouton de 44 px", /replique\.action\.href/.test(hote) && /min-h-\[44px\]/.test(hote));
check("Une bulle survolée ou au clavier ne repart pas sous la main", /onPointerEnter=\{scene\.tuto \? undefined : retenir\}/.test(hote) && /onFocus=\{scene\.tuto \? undefined : retenir\}/.test(hote));

// ── la visite et les nouveautés (V3 §11.4) ──────────────────────────────
console.log("\n# la visite en 4 étapes, les nouveautés v3");
const etapes = (l: { page: string; cible?: string }[]) => l.map((x) => `${x.page}#${x.cible ?? ""}`).join(" ");
check("la visite : les 30 et les 5, la séance, le cap, les réglages", etapes(TUTO) === "/dashboard#defi /dashboard#seance /codex#cap /moi?onglet=reglages#reglages", etapes(TUTO));
check("la visite parle du mode sobre à l'étape des réglages", /mode sobre/.test(TUTO[3]?.texte ?? ""));
check("les nouveautés v3 : la séance du jour, le cap, Mes pièces", etapes(NOUVEAUTES) === "/dashboard#seance /codex#cap /moi?onglet=pieces#mes-pieces", etapes(NOUVEAUTES));
check("Mes pièces reste facultative (l'onglet peut manquer) ; la séance et le cap ont un repli", NOUVEAUTES[2]?.facultatif === true && !!NOUVEAUTES[0]?.repli && !!NOUVEAUTES[1]?.repli);
check("qui a vu la visite ne la refait pas (version 2 gardée), il a les nouveautés v3", VERSION_PRESENTATION === 2 && visiteVue({ rl_visite: 2 }) && VERSION_NOUVEAUTES === 3 && !nouveautesVues({ rl_nouveautes: 2 }) && nouveautesVues({ rl_nouveautes: 3 }));
// les cibles de la visite sont posées dans les pages (data-leonard)
const CIBLES: Record<string, string> = { defi: "components/accueil/Rendezvous.tsx", seance: "components/codex/SeanceDuJour.tsx", cap: "components/codex/Cap.tsx", prochaine: "components/codex/CodexEcran.tsx", reglages: "components/moi/AppearanceSwitches.tsx", "mes-pieces": "components/moi/MesPieces.tsx" };
for (const [cible, f] of Object.entries(CIBLES)) check(`cible « ${cible} » posée (${f})`, readFileSync(join(RACINE, f), "utf8").includes(`data-leonard="${cible}"`));
// toutes les étapes, facultatives comprises : une cible facultative jamais posée
// faisait sauter l'étape à chaque fois (la visite des nouveautés revenait sans fin)
check("chaque étape de la visite vise une cible posée", [...TUTO, ...NOUVEAUTES].every((x) => !x.cible || x.cible in CIBLES), [...TUTO, ...NOUVEAUTES].flatMap((x) => (x.cible && !(x.cible in CIBLES) ? [x.cible] : [])).join(" "));
check("chaque repli de la visite vise une cible posée", [...TUTO, ...NOUVEAUTES].every((x) => !x.repli || x.repli in CIBLES));
// une visite courte est retenue quand ses étapes obligatoires ont joué (pas « 3 » fixe)
check("une visite courte (3 étapes, une facultative) est retenue sans sa facultative", hote.includes("montrees.current >= Math.min(3, scene.repliques.filter((e) => !(e as EtapeTuto).facultatif).length)") && NOUVEAUTES.filter((x) => !x.facultatif).length <= 3);
const fautesVisite = [...TUTO, ...NOUVEAUTES].flatMap((x) => (interditDans(x.texte) ? [x.texte] : []));
check("la visite ne moque personne", fautesVisite.length === 0, fautesVisite.join(" ; "));

console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
process.exit(ko ? 1 : 0);
