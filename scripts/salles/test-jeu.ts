// Les règles du mini-jeu de la salle d'attente : npx tsx --tsconfig ./tsconfig.json scripts/salles/test-jeu.ts
import { COUPS, PLATEFORMES, SANS_ENTREE, VIES, avancer, coupActif, dernierDebout, elimine, horsArene, meneur, nouveauCombattant, subir, touche, type Combattant, type Entrees } from "@/lib/salles/jeu-combat";

let echecs = 0;
function check(nom: string, ok: boolean, detail = "") {
  console.log(`${ok ? "ok  " : "KO  "} ${nom}${detail ? "  " + detail : ""}`);
  if (!ok) echecs++;
}

const DT = 1 / 60;
const jouer = (f: Combattant, e: Partial<Entrees>, images: number) => {
  let c = f;
  for (let i = 0; i < images; i++) c = avancer(c, { ...SANS_ENTREE, ...e }, DT);
  return c;
};
const pose = (over: Partial<Combattant> = {}): Combattant => ({ ...jouer(nouveauCombattant(2), {}, 30), invincible: 0, ...over });

const debut = nouveauCombattant(0);
check("on commence avec toutes ses vies, à 0 %", debut.vies === VIES && debut.degats === 0);
check("deux joueurs n'apparaissent pas au même endroit", nouveauCombattant(0).x !== nouveauCombattant(1).x);

const f = pose();
check("on retombe sur la plateforme du bas et on y reste", f.sol && f.y === PLATEFORMES[0].y);

const course = jouer(f, { droite: true }, 30);
check("on court vers la droite et on regarde devant soi", course.x > f.x + 60 && course.dir === 1);
const arret = jouer(course, {}, 30);
check("sans touche, on s'arrête au sol", arret.vx === 0);

const saute = avancer(f, { ...SANS_ENTREE, saut: true }, DT);
check("un saut quitte le sol", saute.vy < 0 && !saute.sol);
const double = avancer(jouer(saute, {}, 10), { ...SANS_ENTREE, saut: true }, DT);
check("un second saut est possible en l'air", double.vy < 0 && double.sauts === 0);
const triple = avancer(double, { ...SANS_ENTREE, saut: true }, DT);
check("pas de troisième saut", triple.sauts === 0 && triple.vy > double.vy);

const planche = PLATEFORMES[1];
const milieu = planche.x + planche.l / 2;
const haut = pose({ x: milieu, y: planche.y - 20, vy: 0, sol: false });
const pose2 = jouer(haut, {}, 30);
check("on se pose sur une plateforme en tombant", pose2.sol && pose2.y === planche.y);
check("on la traverse en appuyant vers le bas", jouer(pose2, { bas: true }, 20).y > planche.y);
const dessous = pose({ x: milieu, y: planche.y + 60, vy: -700, sol: false });
check("on la traverse en sautant par-dessous", jouer(dessous, {}, 20).y < planche.y);

const att = avancer(f, { ...SANS_ENTREE, leger: true }, DT);
check("un coup démarre, et il ne porte pas tout de suite", !!att.coup && !coupActif(att));
const actif = jouer(att, {}, 6);
check("puis il porte", coupActif(actif));
check("il finit, et on peut rejouer", jouer(att, {}, 30).coup === null);
check("un coup en cours ne se relance pas", avancer(att, { ...SANS_ENTREE, fort: true }, DT).coup?.type === "leger");

check("le coup atteint qui est devant, pas qui est derrière ni trop loin", touche({ ...actif, dir: 1 }, { x: actif.x + 40, y: actif.y }) && !touche({ ...actif, dir: 1 }, { x: actif.x - 60, y: actif.y }) && !touche({ ...actif, dir: 1 }, { x: actif.x + 200, y: actif.y }));

const coup1 = subir(pose(), "leger", 1);
check("un coup fait monter les dégâts et projette", coup1.degats === COUPS.leger.degats && coup1.vx > 0 && coup1.vy < 0);
const fragile = subir(pose({ degats: 120 }), "fort", 1);
check("plus on a de dégâts, plus on vole loin", fragile.vx > subir(pose(), "fort", 1).vx * 2);
check("le coup fort va plus loin que le léger", subir(pose(), "fort", 1).vx > subir(pose(), "leger", 1).vx);
check("invincible, on ne subit rien", subir(pose({ invincible: 1 }), "fort", 1).degats === 0);
check("étourdi, on ne peut plus agir", (() => {
  const e = pose({ etourdi: 0.3 });
  const s = avancer(e, { ...SANS_ENTREE, saut: true, leger: true }, DT);
  return s.vy >= 0 && s.coup === null;
})());

// le dash
const lance = avancer(f, { ...SANS_ENTREE, dash: true, droite: true }, DT);
check("le dash part vite, bien au-delà de la course", lance.dash > 0 && lance.vx > 700 && lance.dir === 1);
check("il finit, et on retombe à la vitesse de course", (() => {
  const c = jouer(lance, {}, 14);
  return c.dash === 0 && Math.abs(c.vx) <= 300;
})());
check("il parcourt plus de chemin que la course sur le même temps", jouer(lance, {}, 9).x - f.x > 90);
check("il ne se relance pas tout de suite, puis il revient", (() => {
  const c = jouer(lance, {}, 12);
  return avancer(c, { ...SANS_ENTREE, dash: true }, DT).dash === 0 && avancer(jouer(c, {}, 40), { ...SANS_ENTREE, dash: true }, DT).dash > 0;
})());
check("sans direction, il part du côté où l'on regarde", avancer(pose({ dir: -1 }), { ...SANS_ENTREE, dash: true }, DT).vx < 0);
check("le début du dash esquive un coup, pas sa fin", subir(lance, "fort", 1).degats === lance.degats && subir(jouer(lance, {}, 8), "fort", 1).degats > 0);
check("en l'air, le dash file à plat et ne sert qu'une fois", (() => {
  const a = avancer(jouer(saute, {}, 4), { ...SANS_ENTREE, dash: true }, DT);
  const b = jouer(a, {}, 50);
  return a.vy === 0 && !a.dashAir && avancer({ ...a, dash: 0, recharge: 0, sol: false }, { ...SANS_ENTREE, dash: true }, DT).dash === 0 && b.dashAir;
})());
check("sonné, pas de dash", avancer(pose({ etourdi: 0.3 }), { ...SANS_ENTREE, dash: true }, DT).dash === 0);
check("le dash annule la fin d'un coup, pas le moment où il porte", (() => {
  const a = avancer(f, { ...SANS_ENTREE, leger: true }, DT);
  return avancer(jouer(a, {}, 6), { ...SANS_ENTREE, dash: true }, DT).dash === 0 && avancer(jouer(a, {}, 12), { ...SANS_ENTREE, dash: true }, DT).dash > 0;
})());

// les combos
const presse = (c: Combattant, e: Partial<Entrees>) => avancer(c, { ...SANS_ENTREE, ...e }, DT);
const chaine = (n: number, e: Partial<Entrees>) => {
  let c = presse(f, { leger: true });
  for (let i = 0; i < n; i++) c = presse(jouer(c, {}, 11), e);
  return c;
};
check("léger, puis suite, puis final", chaine(1, { leger: true }).coup?.type === "suite" && chaine(2, { leger: true }).coup?.type === "final");
check("le coup fort peut conclure l'enchaînement", chaine(1, { fort: true }).coup?.type === "fort");
check("une touche pressée un peu tôt est gardée pour la suite", jouer(presse(jouer(presse(f, { leger: true }), {}, 5), { leger: true }), {}, 8).coup?.type === "suite");
check("après le final, on attend la fin du coup", presse(jouer(chaine(2, { leger: true }), {}, 16), { leger: true }).coup?.type === "final");
check("sans toucher à rien, on repart du léger", presse(jouer(presse(f, { leger: true }), {}, 40), { leger: true }).coup?.type === "leger");
check("la cible reste sonnée le temps du coup suivant", COUPS.leger.etourdi > COUPS.leger.fin - COUPS.leger.debut + COUPS.suite.debut && COUPS.suite.etourdi > COUPS.suite.fin - COUPS.suite.debut + COUPS.final.debut);
check("le final projette bien plus loin que le léger", subir(pose(), "final", 1).vx > subir(pose(), "leger", 1).vx * 2);

// la danse
const danseuse = presse(f, { danse: true });
check("la danse part au sol, et on reste sur place", danseuse.danse > 0 && jouer(danseuse, {}, 30).x === f.x);
check("elle finit toute seule", jouer(danseuse, {}, 130).danse === 0);
check("le moindre geste l'arrête", presse(danseuse, { droite: true }).danse === 0 && presse(danseuse, { saut: true }).danse === 0 && presse(danseuse, { leger: true }).danse === 0 && presse(danseuse, { dash: true }).danse === 0);
check("un coup reçu l'arrête", subir(danseuse, "leger", 1).danse === 0);
check("pas de danse en l'air", presse(jouer(saute, {}, 4), { danse: true }).danse === 0);

const sommet = (vy: number) => (vy * vy) / (2 * 1900);
check("un saut suffit pour la planche du côté, deux pour celle du haut", sommet(745) > PLATEFORMES[0].y - PLATEFORMES[1].y && sommet(745) + sommet(660) > PLATEFORMES[0].y - PLATEFORMES[3].y);
check("le bord de l'arène est loin de la plateforme", !horsArene({ x: 100, y: 400 }) && horsArene({ x: -200, y: 300 }) && horsArene({ x: 500, y: 800 }));
const ejecte = avancer(pose({ x: -139, vx: -900, y: 300, sol: false, degats: 90 }), SANS_ENTREE, DT);
check("sortir de l'arène coûte une vie, et remet à 0 %", ejecte.vies === VIES - 1 && ejecte.degats === 0 && ejecte.invincible > 0);
check("plus de vie : éliminé", elimine({ ...f, vies: 0 }) && !elimine(f));

check("le dernier debout gagne", dernierDebout([{ id: "a", vies: 1 }, { id: "b", vies: 0 }]) === "a");
check("tant que deux tiennent, ça continue", dernierDebout([{ id: "a", vies: 1 }, { id: "b", vies: 2 }]) === null);
check("seul, il n'y a pas de gagnant", dernierDebout([{ id: "a", vies: 1 }]) === null);
check("le meneur est le plus petit identifiant, quel que soit l'ordre", meneur(["c", "a", "b"]) === "a" && meneur([]) === null);

console.log(echecs ? `${echecs} échec(s)` : "tout est bon");
process.exit(echecs ? 1 : 0);
