// L'enregistrement de « Maîtrisée » / « Pas encore » de la partie de cartes
// (lib/flashcards/partie-enregistrement.ts), avec de faux stockage, envoi,
// balise, répétition espacée et Codex : boucle du paquet gardée sur
// l'appareil au nom du joueur, envoyée sur le compte avec la version connue,
// envois en ordre sans doubler, conflit (compte changé ailleurs : on repart
// de lui et on repose les marques), table absente avalée, erreur passagère,
// boucle finie intacte, balise de fermeture, Codex par paquets de 10 ; et la
// route de la donne (identifiants, réponse).
// Usage, depuis le dépôt : npx tsx --tsconfig tsconfig.json scripts/flashcards/test-partie-enregistrement.ts

import { demarrer, lireBoucleBrute, marquer, phase, type EtatBoucle, type Stockage } from "@/lib/flashcards/boucle";
import { EnregistreurPartie, type DependancesEnregistreur } from "@/lib/flashcards/partie-enregistrement";
import { ID_CARTE, chargerCartes, idsDeRequete, lireReponse } from "@/lib/flashcards/partie-api";
import { cartesMaitrisees } from "@/lib/flashcards/partie";
import type { LigneProgression } from "@/lib/flashcards/progression";
import type { ResultatEcriture } from "@/lib/flashcards/progression-serveur";
import type { CardSRS } from "@/lib/srs";

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};

const JOUEUR = "joueur-1";
const SET_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const SET_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const cartes = (s: string) => Array.from({ length: 6 }, (_, i) => `${s}-c${i + 1}`);
const PAQUETS: Record<string, string[]> = { [SET_A]: cartes("a"), [SET_B]: cartes("b") };
const carte = (setId: string, n: number, matiere = "ethics") => ({ id: `${setId === SET_A ? "a" : "b"}-c${n}`, setId, matiere });
const cleA = `set:${SET_A}`;
const cleB = `set:${SET_B}`;

type Envoi = { cle: string; etat: EtatBoucle };
type Envoyer = DependancesEnregistreur["envoyer"];

function monde(o: { reponses?: ResultatEcriture[]; envoyer?: (envois: Envoi[]) => Envoyer } = {}) {
  const mem = new Map<string, string>();
  const stockage: Stockage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v), removeItem: (k) => void mem.delete(k) };
  const envois: Envoi[] = [];
  const balises: Envoi[] = [];
  const notes: [string, number][] = [];
  const srs = new Map<string, Record<string, CardSRS>>();
  const reponses = [...(o.reponses ?? [])];
  let t = 1_000_000;
  const envoyerParDefaut: Envoyer = async (cle, etat) => {
    envois.push({ cle, etat });
    await new Promise((r) => setTimeout(r, 0));
    return reponses.shift() ?? { ok: true };
  };
  const deps: DependancesEnregistreur = {
    joueur: JOUEUR,
    cartesDuPaquet: (s) => PAQUETS[s] ?? null,
    envoyer: o.envoyer ? o.envoyer(envois) : envoyerParDefaut,
    balise: (cle, etat) => void balises.push({ cle, etat }),
    noter: (m, n) => void notes.push([m, n]),
    stockage,
    srs: { lire: (s) => srs.get(s) ?? {}, ecrire: (s, e) => void srs.set(s, e) },
    maintenant: () => (t += 1000),
  };
  return { enr: new EnregistreurPartie(deps), deps, mem, stockage, envois, balises, notes, srs };
}

const ligne = (e: EtatBoucle): LigneProgression => ({ etat: e, maj: e.maj ?? e.dernier });
const localA = (stockage: Stockage) => lireBoucleBrute(SET_A, stockage);

async function main() {
  // --- sans compte (table pas encore créée) : l'appareil seulement
  {
    const w = monde();
    w.enr.nouvellePartie(null);
    w.enr.enregistrer(carte(SET_A, 1), true);
    w.enr.enregistrer(carte(SET_A, 2), false);
    await w.enr.attendre();
    const e = localA(w.stockage);
    check("sans compte : la boucle du paquet est gardée sur l'appareil, au nom du joueur", !!e && e.u === JOUEUR && e.marques["a-c1"] === true && e.marques["a-c2"] === false && e.vues === 2);
    check("sans compte : rien n'est envoyé", w.envois.length === 0 && !w.enr.envoiActif);
    check("sans compte : pas de base (aucune version du compte connue)", !!e && e.base === undefined);
    check("sans compte : horodaté (maj croissant)", !!e && (e.maj ?? 0) > 1_000_000);
    check("répétition espacée écrite pour la prochaine fois", w.srs.get(SET_A)?.["a-c1"]?.reps === 1 && w.srs.get(SET_A)?.["a-c2"]?.reps === 0);
    check("les maîtrisées de l'appareil se lisent dans la boucle", !!e && cartesMaitrisees(e).join() === "a-c1");
  }

  // --- avec compte : un envoi par geste, avec la version connue du compte pour base
  {
    const compte = { ...demarrer(PAQUETS[SET_A], { maintenant: 500 }), maj: 600 };
    const w = monde();
    w.enr.nouvellePartie({ [cleA]: ligne(compte) });
    w.enr.enregistrer(carte(SET_A, 1), true);
    await w.enr.attendre();
    check("avec compte : un envoi, sur la clé du paquet", w.envois.length === 1 && w.envois[0].cle === cleA);
    check("avec compte : l'état envoyé s'appuie sur la version du compte (base) et la dépasse (maj)", w.envois[0].etat.base === 600 && (w.envois[0].etat.maj ?? 0) > 600);
    check("avec compte : l'état envoyé porte la marque", w.envois[0].etat.marques["a-c1"] === true);
    w.enr.enregistrer(carte(SET_A, 3), false);
    await w.enr.attendre();
    check("deuxième geste : la base est la version précédemment envoyée", w.envois.length === 2 && w.envois[1].etat.base === w.envois[0].etat.maj && (w.envois[1].etat.maj ?? 0) > (w.envois[0].etat.maj ?? 0));
    check("deuxième geste : les deux marques", w.envois[1].etat.marques["a-c1"] === true && w.envois[1].etat.marques["a-c3"] === false);
    check("l'appareil garde la même version que le compte", localA(w.stockage)?.maj === w.envois[1].etat.maj);
  }

  // --- deux paquets : chacun sa boucle, sa clé
  {
    const w = monde();
    w.enr.nouvellePartie({});
    w.enr.enregistrer(carte(SET_A, 1), true);
    w.enr.enregistrer(carte(SET_B, 1), true);
    await w.enr.attendre();
    check("deux paquets : deux boucles, deux clés", w.envois.map((x) => x.cle).sort().join() === [cleA, cleB].sort().join());
    check("deux paquets : chaque boucle sur son appareil", !!localA(w.stockage) && !!lireBoucleBrute(SET_B, w.stockage));
  }

  // --- trois gestes d'affilée pendant un envoi : dans l'ordre, sans doubler, la dernière version part
  {
    const w = monde();
    w.enr.nouvellePartie({});
    w.enr.enregistrer(carte(SET_A, 1), true);
    w.enr.enregistrer(carte(SET_A, 2), true);
    w.enr.enregistrer(carte(SET_A, 3), false);
    await w.enr.attendre();
    check("gestes en rafale : au plus 2 envois, le dernier porte les trois marques", w.envois.length <= 2 && Object.keys(w.envois.at(-1)!.etat.marques).length === 3);
    check("gestes en rafale : versions croissantes", w.envois.every((x, i) => i === 0 || (x.etat.maj ?? 0) > (w.envois[i - 1].etat.maj ?? 0)));
  }

  // --- conflit : le compte a changé ailleurs
  {
    const ailleurs = marquer(demarrer(PAQUETS[SET_A], { maintenant: 100 }), true, 200); // a-c1 maîtrisée ailleurs
    const ailleursLigne = ligne({ ...ailleurs, maj: 90_000_000 });
    const w = monde({ reponses: [{ ok: false, raison: "conflit", ligne: ailleursLigne }, { ok: true }] });
    w.enr.nouvellePartie({});
    w.enr.enregistrer(carte(SET_A, 4), true); // la partie marque a-c4
    await w.enr.attendre();
    check("conflit : un deuxième envoi suit", w.envois.length === 2);
    const e = w.envois[1].etat;
    check("conflit : on repart de la version du compte (a-c1 y est) et on y repose la marque de la partie (a-c4)", e.marques["a-c1"] === true && e.marques["a-c4"] === true);
    check("conflit : la nouvelle version s'appuie sur celle du compte et la dépasse", e.base === 90_000_000 && (e.maj ?? 0) > 90_000_000);
    check("conflit : l'appareil garde la version fusionnée", localA(w.stockage)?.marques["a-c1"] === true && localA(w.stockage)?.marques["a-c4"] === true);
  }

  // --- conflit déjà réglé par la version du compte : rien à renvoyer
  {
    const deja = marquer(demarrer(PAQUETS[SET_A], { maintenant: 100 }), true, 200); // a-c1 maîtrisée
    const w = monde({ reponses: [{ ok: false, raison: "conflit", ligne: ligne({ ...deja, maj: 90_000_000 }) }] });
    w.enr.nouvellePartie({});
    w.enr.enregistrer(carte(SET_A, 1), true);
    await w.enr.attendre();
    check("conflit où le compte a déjà la marque : un seul envoi, la boucle du compte est gardée", w.envois.length === 1 && localA(w.stockage)?.maj === 90_000_000);
  }

  // --- conflits sans fin : on s'arrête
  {
    let n = 0;
    const w = monde({
      envoyer: (envois) => async (cle, etat) => {
        envois.push({ cle, etat });
        const ailleurs = marquer(demarrer(PAQUETS[SET_A], { maintenant: 100 }), true, 200);
        return { ok: false, raison: "conflit", ligne: ligne({ ...ailleurs, maj: 90_000_000 + ++n * 10_000_000 }) };
      },
    });
    w.enr.nouvellePartie({});
    w.enr.enregistrer(carte(SET_A, 5), true);
    await w.enr.attendre();
    check("conflits sans fin : au plus 3 envois", w.envois.length >= 1 && w.envois.length <= 3, `(${w.envois.length})`);
  }

  // --- table absente : on cesse d'envoyer, la partie continue
  {
    const w = monde({ reponses: [{ ok: false, raison: "absente" }] });
    w.enr.nouvellePartie({});
    w.enr.enregistrer(carte(SET_A, 1), true);
    await w.enr.attendre();
    w.enr.enregistrer(carte(SET_A, 2), true);
    await w.enr.attendre();
    check("table absente : un seul essai", w.envois.length === 1 && !w.enr.envoiActif);
    check("table absente : l'appareil garde tout", localA(w.stockage)?.marques["a-c2"] === true);
  }

  // --- erreur passagère : le geste suivant renvoie la boucle entière
  {
    const w = monde({ reponses: [{ ok: false, raison: "erreur" }] });
    w.enr.nouvellePartie({});
    w.enr.enregistrer(carte(SET_A, 1), true);
    await w.enr.attendre();
    check("erreur passagère : on continue d'essayer", w.enr.envoiActif);
    w.enr.enregistrer(carte(SET_A, 2), true);
    await w.enr.attendre();
    check("erreur passagère : le geste suivant renvoie les deux marques", w.envois.length === 2 && Object.keys(w.envois[1].etat.marques).length === 2);
  }

  // --- l'envoi lève : la partie continue
  {
    const w = monde({
      envoyer: () => async () => {
        throw new Error("réseau");
      },
    });
    w.enr.nouvellePartie({});
    w.enr.enregistrer(carte(SET_A, 1), true);
    await w.enr.attendre();
    w.enr.enregistrer(carte(SET_A, 2), true);
    await w.enr.attendre();
    check("l'envoi lève : rien ne casse, l'appareil garde les marques", localA(w.stockage)?.vues === 2);
  }

  // --- boucle finie : « Maîtrisé » reste, la répétition espacée avance
  {
    let e = demarrer(PAQUETS[SET_A], { maintenant: 100 });
    for (let i = 0; i < 6; i++) e = marquer(e, true, 200 + i);
    check("(préalable) boucle finie", phase(e) === "fin");
    const w = monde();
    w.enr.nouvellePartie({ [cleA]: ligne({ ...e, maj: 5000 }) });
    w.enr.enregistrer(carte(SET_A, 2), false);
    await w.enr.attendre();
    check("boucle finie : rien envoyé, rien écrit sur l'appareil", w.envois.length === 0 && localA(w.stockage) === null);
    check("boucle finie : la répétition espacée note quand même la carte à revoir", w.srs.get(SET_A)?.["a-c2"]?.reps === 0);
  }

  // --- paquet inconnu ou sans carte
  {
    const w = monde();
    w.enr.nouvellePartie({});
    w.enr.enregistrer({ id: "x-c1", setId: "inconnu", matiere: "ethics" }, true);
    await w.enr.attendre();
    check("paquet inconnu : sans erreur, rien d'envoyé", w.envois.length === 0);
  }

  // --- nouvelle partie : une version écrite ailleurs entre-temps l'emporte
  {
    const w = monde();
    w.enr.nouvellePartie({});
    w.enr.enregistrer(carte(SET_A, 1), true);
    await w.enr.attendre();
    const nous = w.envois[0].etat;
    // ailleurs : a-c1 repassée « à revoir », version plus récente
    const ailleurs = ligne({ ...marquer(demarrer(PAQUETS[SET_A], { maintenant: 100 }), false, 200), maj: (nous.maj ?? 0) + 50_000 });
    w.enr.nouvellePartie({ [cleA]: ailleurs });
    w.enr.enregistrer(carte(SET_A, 2), true);
    await w.enr.attendre();
    const e = w.envois.at(-1)!.etat;
    check("nouvelle partie : la version écrite ailleurs l'emporte (a-c1 « à revoir » y est), la marque s'y ajoute", e.marques["a-c1"] === false && e.marques["a-c2"] === true && e.base === ailleurs.maj);
  }

  // --- balise : ce que le compte n'a pas confirmé part à la fermeture
  {
    let bloquer = false;
    const w = monde({
      envoyer: (envois) => async (cle, etat) => {
        envois.push({ cle, etat });
        if (bloquer) return new Promise<ResultatEcriture>(() => undefined);
        return { ok: true };
      },
    });
    w.enr.nouvellePartie({});
    w.enr.enregistrer(carte(SET_A, 1), true);
    await w.enr.attendre();
    w.enr.balise();
    check("balise : rien si le compte a tout reçu", w.balises.length === 0);
    bloquer = true; // un envoi qui n'arrive jamais
    w.enr.enregistrer(carte(SET_A, 2), true);
    w.enr.balise();
    check("balise : la dernière version non confirmée part", w.balises.length === 1 && w.balises[0].cle === cleA && w.balises[0].etat.marques["a-c2"] === true);
  }

  // --- Codex : par paquets de 10 et en fin de partie, par matière
  {
    const w = monde();
    w.enr.nouvellePartie(null);
    for (let i = 1; i <= 6; i++) w.enr.enregistrer(carte(SET_A, i, "ethics"), i % 2 === 0);
    check("Codex : rien avant 10 cartes", w.notes.length === 0);
    for (let i = 1; i <= 4; i++) w.enr.enregistrer(carte(SET_B, i, "quant"), true);
    check("Codex : à 10 cartes, une note par matière (6 ethics, 4 quant)", w.notes.length === 2 && w.notes.some(([m, n]) => m === "ethics" && n === 6) && w.notes.some(([m, n]) => m === "quant" && n === 4));
    w.enr.enregistrer(carte(SET_A, 1, "ethics"), true);
    w.enr.terminer();
    check("Codex : la fin de partie note le reste", w.notes.length === 3 && w.notes[2][0] === "ethics" && w.notes[2][1] === 1);
    w.enr.terminer();
    check("Codex : rien noté deux fois", w.notes.length === 3);
  }

  // --- les identifiants et la réponse de la route de la donne
  {
    const u1 = "11111111-1111-1111-1111-111111111111";
    const u2 = "22222222-2222-2222-2222-222222222222";
    const uuids = (n: number) => Array.from({ length: n }, (_, i) => `${String(i).padStart(8, "0")}-1111-1111-1111-111111111111`).join(",");
    check("uuid reconnu", ID_CARTE.test(u1) && !ID_CARTE.test("pas-un-uuid") && !ID_CARTE.test(u1 + "x"));
    check("ids : liste valide, doublons ôtés", idsDeRequete(`${u1},${u2},${u1}`)?.length === 2);
    check("ids : vide, absent, invalide ou trop long : null", idsDeRequete("") === null && idsDeRequete(null) === null && idsDeRequete(`${u1},zzz`) === null && idsDeRequete(uuids(51)) === null);
    check("ids : 50 permis", idsDeRequete(uuids(50))?.length === 50);

    const bonne = { cartes: [{ id: u1, setId: SET_A, front: "Q", back: "R" }], lignes: { [cleA]: { etat: { v: 1 }, maj: 12 }, mauvaise: { etat: 1 } } };
    const r = lireReponse(bonne);
    check("réponse valide lue, ligne sans version écartée", !!r && r.cartes.length === 1 && r.lignes !== null && Object.keys(r.lignes).join() === cleA && r.lignes[cleA].maj === 12);
    check("réponse sans table : lignes null", lireReponse({ cartes: [], lignes: null })?.lignes === null);
    check("réponse invalide : null", lireReponse(null) === null && lireReponse({}) === null && lireReponse({ cartes: [{ id: 1 }] }) === null);

    const faux = (corps: unknown, ok = true) => (async () => ({ ok, json: async () => corps })) as unknown as typeof fetch;
    const horsLigne = (async () => {
      throw new Error("hors ligne");
    }) as unknown as typeof fetch;
    check("chargerCartes : la réponse du serveur", (await chargerCartes([u1], faux(bonne)))?.cartes[0].front === "Q");
    check("chargerCartes : serveur en erreur : null", (await chargerCartes([u1], faux(bonne, false))) === null);
    check("chargerCartes : réseau coupé : null", (await chargerCartes([u1], horsLigne)) === null);
    check("chargerCartes : aucune carte : null", (await chargerCartes([], faux(bonne))) === null);
  }

  console.log(ko ? `\n${ko} échec(s)` : "\nTout est vert.");
  process.exit(ko ? 1 : 0);
}

main();
