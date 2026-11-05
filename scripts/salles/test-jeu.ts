// Les règles du mini-jeu de la salle d'attente : npx tsx --tsconfig ./tsconfig.json scripts/salles/test-jeu.ts
import { ETAT_VIDE, LARGEUR, MANCHE, POTEAUX, avancer, classement, depart, directionDe, echelle, estBloquee, etatLu, lieuDeRouleau, meneur, prendre, rouleauAPortee } from "@/lib/salles/jeu-attente";

let echecs = 0;
function check(nom: string, ok: boolean, detail = "") {
  console.log(`${ok ? "ok  " : "KO  "} ${nom}${detail ? "  " + detail : ""}`);
  if (!ok) echecs++;
}

check("le centre de la salle est libre", !estBloquee(512, 320));
check("on ne sort pas du sol : le fond, le devant, les côtés", estBloquee(512, 150) && estBloquee(512, 500) && estBloquee(60, 320) && estBloquee(LARGEUR - 60, 320));
check("le sol s'élargit vers le devant", estBloquee(180, 230) && !estBloquee(180, 400));
check("on ne traverse pas les poteaux, à gauche comme à droite", estBloquee(345, 320) && estBloquee(LARGEUR - 345, 320));
check("les meubles bloquent", estBloquee(300, 225) && estBloquee(140, 420));

const p = depart("joueur-a");
check("un joueur apparaît sur un point libre", !estBloquee(p.x, p.y));
check("deux joueurs n'apparaissent pas forcément au même endroit", new Set(["a", "b", "c", "d", "e"].map((x) => JSON.stringify(depart(x)))).size > 1);

const centre = { x: 512, y: 320 };
const pas = avancer(centre, 1, 0, 0.1);
check("un pas avance à la bonne vitesse", Math.abs(pas.x - centre.x - 17) < 0.01 && pas.y === centre.y);
const fond = avancer(centre, 0, -1, 0.1);
check("en profondeur, on avance moins vite à l'écran", centre.y - fond.y < 17 && centre.y - fond.y > 10);
check("à l'arrêt, rien ne bouge", avancer(centre, 0, 0, 0.1) === centre);
let contre = { x: 365, y: 320 };
for (let i = 0; i < 12; i++) contre = avancer(contre, -1, 1, 0.05);
check("contre une rangée de poteaux, on glisse au lieu de se bloquer", contre.y > 330 && contre.x > 330);
let marcheur = centre;
for (let i = 0; i < 40; i++) marcheur = avancer(marcheur, -1, 0, 0.05);
check("on ne traverse jamais un obstacle", !estBloquee(marcheur.x, marcheur.y) && marcheur.x > 340);
let tour = { x: 512, y: 435 };
for (let i = 0; i < 200; i++) tour = avancer(tour, -1, 0, 0.05);
check("on fait le tour des poteaux par le devant de la salle", tour.x < 300);

check("la direction suit le déplacement", directionDe(1, 0, "bas") === "droite" && directionDe(-3, 1, "bas") === "gauche" && directionDe(0, -1, "bas") === "haut");
check("à l'arrêt, le joueur garde sa direction", directionDe(0, 0, "gauche") === "gauche");
check("les personnages rapetissent vers le fond", echelle(220) < echelle(440));

const k = lieuDeRouleau([], 0.5);
check("un rouleau se pose sur un point libre", !!k && !estBloquee(k.x, k.y));
const r = { id: "r1", x: k?.x ?? 512, y: k?.y ?? 320 };
const loin = Array.from({ length: 60 }, (_, i) => lieuDeRouleau([r], i / 60));
check("jamais deux rouleaux côte à côte", loin.every((x) => x && Math.hypot(x.x - r.x, x.y - r.y) > 70));
check("un rouleau se ramasse à portée", rouleauAPortee({ x: r.x + 20, y: r.y }, [r])?.id === "r1");
check("pas de loin", rouleauAPortee({ x: r.x + 80, y: r.y }, [r]) === null);

check("les poteaux, à gauche et en miroir à droite", POTEAUX.length === 6 && POTEAUX[0].contour[0].x + POTEAUX[3].contour[0].x === LARGEUR);

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
check("un état ne garde que les joueurs de la salle et le sol de la salle", (() => {
  const e = etatLu({ rouleaux: [{ id: "1", x: 512, y: 320 }, { id: "2", x: 5, y: 5 }], scores: { a: 2, intrus: 9 }, gagnant: "intrus" }, ids);
  return !!e && e.rouleaux.length === 1 && e.scores.intrus === undefined && e.gagnant === null;
})());
check("le classement va du meilleur au moins bon", classement({ a: 1, b: 3 })[0][0] === "b");

console.log(echecs ? `${echecs} échec(s)` : "tout est bon");
process.exit(echecs ? 1 : 0);
