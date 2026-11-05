// Les règles du mini-jeu de la salle d'attente : npx tsx --tsconfig ./tsconfig.json scripts/salles/test-jeu.ts
import { CARTE, COLONNES, ETAT_VIDE, LIGNES, MANCHE, TUILE, avancer, caseDeRouleau, centreDe, classement, depart, directionDe, estBloquee, etatLu, meneur, prendre, rouleauAPortee } from "@/lib/salles/jeu-attente";

let echecs = 0;
function check(nom: string, ok: boolean, detail = "") {
  console.log(`${ok ? "ok  " : "KO  "} ${nom}${detail ? "  " + detail : ""}`);
  if (!ok) echecs++;
}

check("la carte : toutes les lignes ont la même largeur", CARTE.every((l) => l.length === COLONNES) && CARTE.length === LIGNES);
check("on ne sort pas de la carte", estBloquee(-1, 40) && estBloquee(40, -1) && estBloquee(COLONNES * TUILE + 1, 40));
check("le tour de la cour est fermé", [...CARTE[0], ...CARTE[LIGNES - 1]].every((t) => t === "T"));

const p = depart("joueur-a");
check("un joueur apparaît sur une case libre", !estBloquee(p.x, p.y));
check("deux joueurs n'apparaissent pas forcément au même endroit", new Set(["a", "b", "c", "d", "e"].map((x) => JSON.stringify(depart(x)))).size > 1);

const herbe = { x: 2 * TUILE + 8, y: 2 * TUILE + 8 };
const pas = avancer(herbe, 1, 0, 0.1);
check("un pas avance à la bonne vitesse", Math.abs(pas.x - herbe.x - 6.2) < 0.01 && pas.y === herbe.y);
check("en diagonale, on ne va pas plus vite", Math.abs(Math.hypot(avancer(herbe, 1, 1, 0.1).x - herbe.x, avancer(herbe, 1, 1, 0.1).y - herbe.y) - 6.2) < 0.01);
const mur = { x: TUILE + 6, y: 2 * TUILE + 8 };
const contre = avancer(mur, -1, 1, 0.5);
check("contre un arbre, on glisse le long au lieu de se bloquer", contre.x === mur.x && contre.y > mur.y);
check("à l'arrêt, rien ne bouge", avancer(herbe, 0, 0, 0.1) === herbe);
let marcheur = herbe;
for (let i = 0; i < 400; i++) marcheur = avancer(marcheur, 1, 1, 0.05);
check("on ne traverse jamais un obstacle", !estBloquee(marcheur.x, marcheur.y));

check("la direction suit le déplacement", directionDe(1, 0, "bas") === "droite" && directionDe(-3, 1, "bas") === "gauche" && directionDe(0, -1, "bas") === "haut");
check("à l'arrêt, le joueur garde sa direction", directionDe(0, 0, "gauche") === "gauche");

const k = caseDeRouleau([], 0.5);
check("un rouleau se pose sur une case libre", !!k && !estBloquee(k.c * TUILE + 8, k.l * TUILE + 8));
const deux = Array.from({ length: 60 }, (_, i) => caseDeRouleau([{ id: "a", c: k?.c ?? 1, l: k?.l ?? 1 }], i / 60));
check("jamais deux rouleaux sur la même case", deux.every((x) => x && !(x.c === k?.c && x.l === k?.l)));

const r = { id: "r1", c: 2, l: 2 };
check("un rouleau se ramasse à portée", rouleauAPortee(centreDe(r), [r])?.id === "r1");
check("pas de loin", rouleauAPortee({ x: centreDe(r).x + 30, y: centreDe(r).y }, [r]) === null);

check("le meneur est le plus petit identifiant, quel que soit l'ordre", meneur(["c", "a", "b"]) === "a" && meneur([]) === null);

const e0 = { ...ETAT_VIDE, rouleaux: [r] };
const e1 = prendre(e0, "a", "r1");
check("une prise compte un point et retire le rouleau", e1.scores.a === 1 && e1.rouleaux.length === 0);
check("un rouleau déjà pris ne compte pas deux fois", prendre(e1, "b", "r1") === e1);
const fin = prendre({ rouleaux: [r], scores: { a: MANCHE - 1 }, gagnant: null }, "a", "r1");
check("le dernier rouleau donne la manche", fin.gagnant === "a");
check("la manche finie, plus de prise", prendre({ ...fin, rouleaux: [r] }, "b", "r1").scores.b === undefined);

const ids = new Set(["a", "b"]);
check("un état mal formé est ignoré", etatLu(null, ids) === null && etatLu({ rouleaux: "x" }, ids) === null);
check("un état ne garde que les joueurs de la salle et les cases de la carte", (() => {
  const e = etatLu({ rouleaux: [{ id: "1", c: 3, l: 3 }, { id: "2", c: 99, l: 1 }], scores: { a: 2, intrus: 9 }, gagnant: "intrus" }, ids);
  return !!e && e.rouleaux.length === 1 && e.scores.intrus === undefined && e.gagnant === null;
})());
check("le classement va du meilleur au moins bon", classement({ a: 1, b: 3 })[0][0] === "b");

console.log(echecs ? `${echecs} échec(s)` : "tout est bon");
process.exit(echecs ? 1 : 0);
