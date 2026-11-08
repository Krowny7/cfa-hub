// Tests légers de la mise en scène des parties (lib/arene/regles.ts et
// lib/arene/perso.ts), sans base, réseau ni navigateur :
//   npx tsx --tsconfig tsconfig.json scripts/arene/test-arene.ts
// Vérifie : la disposition de l'écran VS selon le nombre de joueurs, quand il se
// joue, les bannières montrées, le vainqueur d'un duel et d'une Salle, le seuil
// de l'examen blanc, ce qui se joue à la fin (vidéo, bannière, rien), le rideau,
// les durées des règles de Théo et la lecture des réglages du joueur.
import { debitPour, tailleCompressee } from "@/lib/arene/compression";
import { ARENE_VIDE, FONDS, TRAITS, areneDepuis, areneValide, couleurTrait, fichiersArene, fondDe } from "@/lib/arene/perso";
import {
  BANNIERE_DUREE_MS,
  VIDEO_MIN_MS,
  relancerVideo,
  MOSAIQUE_MAX,
  VIDEO_FILET_MS,
  VIDEO_MAX_MS,
  VS_DUREE_MS,
  dispositionVs,
  examenReussi,
  deplacerCadre,
  formatVideo,
  gagnantSalle,
  joueursComplets,
  joueursMontres,
  planVs,
  rideauFerme,
  sceneFin,
  vainqueurDuel,
  vainqueurSalle,
  type LigneFin,
} from "@/lib/arene/regles";

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const egal = (x: unknown, y: unknown) => JSON.stringify(x) === JSON.stringify(y);

const joueurs = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `j${i}`, pseudo: `Joueur ${i}` }));
const ligne = (userId: string, rang: number, points: number, bonnes = 0, tempsMs = 0): LigneFin => ({ userId, rang, points, bonnes, tempsMs });

console.log("# L'écran VS");
{
  check("moins de 2 joueurs : pas d'écran", dispositionVs(0) === null && dispositionVs(1) === null);
  check("2 joueurs : deux bannières", dispositionVs(2) === "duo");
  check("3 et 4 joueurs : le quinconce", dispositionVs(3) === "quinconce" && dispositionVs(4) === "quinconce");
  check("à partir de 5 joueurs : la mosaïque", dispositionVs(5) === "mosaique" && dispositionVs(8) === "mosaique" && dispositionVs(30) === "mosaique");
  const base = { joueurs: joueurs(2), discret: false, dejaVu: false, demarree: false };
  check("une partie qui commence : il se joue", planVs(base) === "duo");
  check("mode discret : pas d'écran", planVs({ ...base, discret: true }) === null);
  check("une seule fois par partie : recharger ne le rejoue pas", planVs({ ...base, dejaVu: true }) === null);
  check("la partie a démarré : il ne s'affiche plus", planVs({ ...base, demarree: true }) === null);
  check("un pseudo manque : pas d'écran", planVs({ ...base, joueurs: [{ id: "a", pseudo: "Theo" }, { id: "b", pseudo: null }] }) === null);
  check("un pseudo vide ne compte pas", !joueursComplets([{ id: "a", pseudo: "   " }]));
  check("un identifiant manque : pas d'écran", planVs({ ...base, joueurs: [{ id: "a", pseudo: "Theo" }, { id: null, pseudo: "Inès" }] }) === null);
  const montres = joueursMontres(joueurs(12), "j9");
  check("moi d'abord", montres[0].id === "j9");
  check("8 bannières au plus", montres.length === MOSAIQUE_MAX && new Set(montres.map((j) => j.id)).size === MOSAIQUE_MAX);
  check("à deux, personne ne disparaît", joueursMontres(joueurs(2), "j1").map((j) => j.id).join() === "j1,j0");
  check("6 secondes, et il tient dans le décompte de 30 secondes des Salles, images comprises", VS_DUREE_MS === 6000 && VS_DUREE_MS + 900 < 30_000);
}

console.log("# Le vainqueur");
{
  check("duel : le vainqueur est l'un des deux", vainqueurDuel("a", ["a", "b"]) === "a" && vainqueurDuel("b", ["a", "b"]) === "b");
  check("duel : égalité, pas de vainqueur", vainqueurDuel(null, ["a", "b"]) === null);
  check("duel : un vainqueur inconnu est ignoré", vainqueurDuel("c", ["a", "b"]) === null);
  check("duel : adversaire manquant, sans planter", vainqueurDuel("a", ["a", undefined]) === "a");
  check("salle : le premier", vainqueurSalle([ligne("a", 1, 900, 8, 1000), ligne("b", 2, 700, 6, 900)]) === "a");
  check("salle : l'ordre de la liste ne compte pas", vainqueurSalle([ligne("b", 2, 700), ligne("a", 1, 900)]) === "a");
  check("salle : même rang, égalité", vainqueurSalle([ligne("a", 1, 900), ligne("b", 1, 900)]) === null);
  check("salle : mêmes points et même temps, égalité", vainqueurSalle([ligne("a", 1, 900, 8, 500), ligne("b", 2, 900, 8, 500)]) === null);
  check("salle : le temps départage les points", vainqueurSalle([ligne("a", 1, 900, 8, 400), ligne("b", 2, 900, 8, 500)]) === "a");
  check("salle : personne n'a marqué, pas de vainqueur", vainqueurSalle([ligne("a", 1, 0), ligne("b", 2, 0)]) === null);
  check("salle : classement vide, sans planter", vainqueurSalle([]) === null);
  check("examen : 70 % réussit, compté juste (21 / 30)", examenReussi(21, 30) && examenReussi(7, 10) && examenReussi(126, 180));
  check("examen : sous 70 %, raté", !examenReussi(20, 30) && !examenReussi(125, 180));
  check("examen : sans question, raté", !examenReussi(0, 0));
  check("salle jouée seul : le joueur s'il réussit", gagnantSalle([ligne("a", 1, 2100, 21)], 30, 1) === "a");
  check("salle jouée seul : rien sous 70 %", gagnantSalle([ligne("a", 1, 2000, 20)], 30, 1) === null);
  check("salle à plusieurs : le seuil ne compte pas", gagnantSalle([ligne("a", 1, 500, 5), ligne("b", 2, 300, 3)], 30, 2) === "a");
}

console.log("# La fin de partie");
{
  check("vainqueur avec vidéo : la vidéo", sceneFin({ gagnantId: "a", aVideo: true, reduit: false }) === "video");
  check("vainqueur sans vidéo : sa bannière", sceneFin({ gagnantId: "a", aVideo: false, reduit: false }) === "banniere");
  check("égalité ou examen raté : rien", sceneFin({ gagnantId: null, aVideo: true, reduit: false }) === "aucune");
  check("mouvement réduit : pas de vidéo qui se lance seule", sceneFin({ gagnantId: "a", aVideo: true, reduit: true }) === "banniere");
  check("le résultat est caché à la fin d'une partie", rideauFerme({ discret: false, dejaVu: false }));
  check("mode discret : le résultat directement", !rideauFerme({ discret: true, dejaVu: false }));
  check("déjà vu : le résultat directement", !rideauFerme({ discret: false, dejaVu: true }));
  check("40 secondes au plus, filet de 50 s, bannière 7 s", VIDEO_MAX_MS === 40_000 && VIDEO_FILET_MS === 50_000 && BANNIERE_DUREE_MS === 7000);
  check("une vidéo courte repart, une vidéo assez longue s'arrête", relancerVideo(4000) && relancerVideo(VIDEO_MIN_MS - 1) && !relancerVideo(VIDEO_MIN_MS) && VIDEO_MIN_MS < VIDEO_MAX_MS);
  check("le filet passe après le plafond", VIDEO_FILET_MS > VIDEO_MAX_MS);
  check("le cadre suit le format", formatVideo(16 / 9) === "paysage" && formatVideo(9 / 16) === "vertical" && formatVideo(1) === "carre" && formatVideo(4 / 3) === "paysage");
}

console.log("# Les réglages du joueur");
{
  const uid = "11111111-2222-3333-4444-555555555555";
  const autre = "99999999-2222-3333-4444-555555555555";
  const dossier = (id: string) => `https://x.supabase.co/storage/v1/object/public/arene-medias/${id}/`;
  const video = { url: `${dossier(uid)}victoire-1730000000000.mp4`, ratio: 0.5625, duree: 12.4, nom: "edit.mp4", poids: 1000, format: "carre", cadre: { x: 30, y: 62.5, z: 1.4 } };
  check("recadrage étranger : centré", areneDepuis({ video: { ...video, format: "rond", cadre: { x: "a" } } }).video?.format === null && areneDepuis({ video: { ...video, cadre: { x: 1 } } }).video?.cadre === null);
  check("recadrage hors bornes : ramené dedans", egal(areneDepuis({ video: { ...video, cadre: { x: 150, y: -3, z: 9 } } }).video?.cadre, { x: 100, y: 0, z: 3 }));
  check("glisser à droite garde la gauche", deplacerCadre({ x: 50, y: 50, z: 1 }, 0.1, 0, 16 / 9, "carre").x < 50);
  const image = `${dossier(uid)}vs-1730000000000.webp`;
  check("rien en base : les réglages de départ", egal(areneDepuis(null), ARENE_VIDE) && egal(areneDepuis("n'importe quoi"), ARENE_VIDE) && egal(areneDepuis([]), ARENE_VIDE));
  const lu = areneDepuis({ fond: "glace", image, trait: "bronze", video });
  check("une ligne complète se relit telle quelle", lu.fond === "glace" && lu.image === image && lu.trait === "bronze" && egal(lu.video, video));
  check("une chaîne JSON aussi", areneDepuis(JSON.stringify({ fond: "colisee" })).fond === "colisee");
  check("fond et trait inconnus : ceux de départ", areneDepuis({ fond: "lune", trait: "rose" }).fond === null && areneDepuis({ trait: "rose" }).trait === "peinture");
  check("une adresse hors du bucket est ignorée", areneDepuis({ video: { ...video, url: "https://evil.example/v.mp4" } }).video === null);
  check("une adresse avec des guillemets est ignorée", areneDepuis({ image: `${dossier(uid)}vs-1730000000000.webp"` }).image === null);
  check("une vidéo sans proportion est ignorée", areneDepuis({ video: { url: video.url } }).video === null);
  check("« image » sans image : pas de fond choisi", areneDepuis({ fond: "image" }).fond === null);
  check("enregistrer : le fichier d'un autre joueur est refusé", areneValide({ video: { ...video, url: `${dossier(autre)}victoire-1730000000000.mp4` } }, dossier(uid)).video === null);
  check("enregistrer : son image d'un autre dossier retire le fond « image »", areneValide({ fond: "image", image: `${dossier(autre)}vs-1730000000000.webp` }, dossier(uid)).fond === null);
  check("enregistrer : ses propres fichiers passent", egal(areneValide({ fond: "image", image, video }, dossier(uid)).video, video) && areneValide({ fond: "image", image }, dossier(uid)).fond === "image");
  check("le ménage garde ses deux fichiers", egal([...fichiersArene(lu)].sort(), ["victoire-1730000000000.mp4", "vs-1730000000000.webp"]));
  check("rien à garder sans fichier", fichiersArene(ARENE_VIDE).size === 0);
  check("son image remplit sa bannière", fondDe({ ...ARENE_VIDE, fond: "image", image }, uid).src === image);
  check("la peinture choisie remplit sa bannière", fondDe({ ...ARENE_VIDE, fond: "glace" }, uid).src === FONDS[1].src);
  check("la peinture de départ est toujours la même pour lui", fondDe(ARENE_VIDE, uid).src === fondDe(ARENE_VIDE, uid).src);
  check("chaque trait a sa couleur", TRAITS.every((t) => /^#[0-9a-f]{6}$/.test(couleurTrait(t.key))));
}

console.log("# La compression des vidéos");
{
  const k = tailleCompressee(3840, 2160);
  check("une vidéo 4K descend à 1280 de large, cadrage gardé, dimensions paires", k.l === 1280 && k.h === 720);
  check("une vidéo verticale garde son sens", tailleCompressee(1080, 1920).h === 1280 && tailleCompressee(1080, 1920).l % 2 === 0);
  check("une petite vidéo n'est pas agrandie", tailleCompressee(640, 360).l === 640);
  check("le débit tient sous la limite, son compris", ((debitPour(50 * 1024 * 1024, 15) + 128000) * 15) / 8 < 50 * 1024 * 1024);
}

console.log(ko ? `\n${ko} échec(s)` : "\nTout est bon.");
process.exit(ko ? 1 : 0);
