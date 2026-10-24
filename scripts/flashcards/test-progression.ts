// La progression des flashcards sur le compte : choix entre l'appareil et
// le compte, gestes envoyés ou non (lib/flashcards/boucle.ts), état reçu
// validé et borné, ce qu'un onglet sait du compte (versions vues, base des
// gestes, horloge en retard), résumé affiché dans les listes, réparé, avec
// les cartes ajoutées, et relu sur l'appareil (lib/flashcards/progression.ts),
// lecture et écriture en base avec un faux client, refus d'un état dépassé
// (« conflit »), table absente avalée une seule fois
// (lib/flashcards/progression-serveur.ts).
// Usage, depuis le dépôt : npx tsx --tsconfig tsconfig.json scripts/flashcards/test-progression.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  aller,
  appareilPrime,
  boucleDuJoueur,
  choisirBoucle,
  demarrer,
  doitSynchroniser,
  horodatage,
  lireBoucleBrute,
  marquer,
  tourSuivant,
  valider,
  type EtatBoucle,
  type Stockage,
} from "@/lib/flashcards/boucle";
import {
  EVENEMENT_BOUCLE,
  SuiviCompte,
  TAILLE_MAX,
  afficher,
  annoncerBoucle,
  cleLocale,
  cleMatiere,
  cleSet,
  etatAEcrire,
  etatAffiche,
  etatListe,
  etatLocalAffiche,
  lireLigne,
  majLigne,
  resumer,
  type DetailBoucle,
} from "@/lib/flashcards/progression";
import { cleValide, ecrireProgression, lireProgressions, tableAbsente } from "@/lib/flashcards/progression-serveur";

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};

const IDS = ["a", "b", "c", "d"];
const T0 = 1_760_000_000_000;
const avec = (e: EtatBoucle, maj: number): EtatBoucle => ({ ...e, maj });

// ---------------------------------------------------------------------------
console.log("# Horodatage et validation");
{
  const e = demarrer(IDS, { maintenant: T0 });
  check("sans maj : le dernier geste", horodatage(e) === T0);
  check("avec maj : maj", horodatage(avec(e, T0 + 5)) === T0 + 5);
  check("valider accepte maj nombre", valider(avec(e, T0 + 5)) !== null);
  check("valider refuse maj illisible", valider({ ...e, maj: "hier" }) === null);
  check("valider accepte un état sans maj (gardé avant la synchronisation)", valider(JSON.parse(JSON.stringify(e))) !== null);
}

// ---------------------------------------------------------------------------
console.log("\n# Le plus récent entre l'appareil et le compte");
{
  const e1 = avec(marquer(demarrer(IDS, { maintenant: T0 }), true, T0 + 1000), T0 + 1000);
  const e2 = avec(marquer(e1, false, T0 + 2000), T0 + 2000);
  check("rien nulle part", choisirBoucle(null, null).etat === null && choisirBoucle(null, null).source === null);
  check("appareil seul", choisirBoucle(e1, null).source === "appareil");
  check("compte seul", choisirBoucle(null, { etat: e1, maj: T0 }).source === "compte");
  check("compte plus récent : le compte", choisirBoucle(e1, { etat: e2, maj: T0 }).etat === e2);
  check("appareil plus récent : l'appareil", choisirBoucle(e2, { etat: e1, maj: T0 + 9_999_999 }).etat === e2, "l'horodatage de l'état prime sur updated_at");
  check("égalité : l'appareil", choisirBoucle(e1, { etat: { ...e1 }, maj: T0 }).source === "appareil");
  const sansMaj = { ...e1 } as EtatBoucle;
  delete sansMaj.maj;
  check("état du compte sans maj : updated_at", choisirBoucle(e1, { etat: sansMaj, maj: T0 + 5000 }).source === "compte" && choisirBoucle(e1, { etat: sansMaj, maj: T0 + 10 }).source === "appareil");
  // une boucle finie sur l'ordinateur bat une boucle entamée plus tôt sur le téléphone
  let f = demarrer(["a", "b"], { maintenant: T0 });
  f = marquer(f, true, T0 + 10);
  f = avec(marquer(f, true, T0 + 20), T0 + 20);
  const tel = avec(marquer(demarrer(["a", "b"], { maintenant: T0 }), true, T0 + 5), T0 + 5);
  check("finie ailleurs plus tard : la fin gagne", choisirBoucle(tel, { etat: f, maj: T0 + 21 }).etat?.fin === T0 + 20);

  // avec la base : l'appareil sait sur quelle version du compte il s'appuyait
  const surC = { ...e2, maj: T0 + 9000, base: T0 + 2000 };
  check("base à jour, appareil plus récent (envoi perdu) : l'appareil", choisirBoucle(surC, { etat: e2, maj: 0 }).source === "appareil");
  const ailleurs = { ...e2, maj: T0 + 5000, base: T0 + 2000 };
  check(
    "compte changé ailleurs depuis la base : le compte, même si l'appareil a plus récent (geste refusé)",
    choisirBoucle(surC, { etat: ailleurs, maj: 0 }).source === "compte" && !appareilPrime(surC, T0 + 5000)
  );
  check("même version : l'appareil", appareilPrime(surC, T0 + 9000));
  check("pas de ligne : l'appareil", appareilPrime(surC, null));
  check("base absente (gardée avant la synchronisation) : le plus récent", appareilPrime(e2, T0 + 1500) && !appareilPrime(e1, T0 + 1500));
}

// ---------------------------------------------------------------------------
console.log("\n# Gestes envoyés ou non");
{
  const n = demarrer(IDS, { maintenant: T0 });
  const feuillete = aller(n, 1);
  check("feuilleter une boucle neuve (← →) : rien n'est envoyé", feuillete !== n && !doitSynchroniser("aller", feuillete));
  const entamee = marquer(n, true, T0 + 1);
  check("se déplacer dans une boucle entamée : envoyé", doitSynchroniser("aller", aller(entamee, 1)));
  check("marquer, tour suivant, Recommencer : envoyés", doitSynchroniser("marquer", entamee) && doitSynchroniser("tour", n) && doitSynchroniser("recommencer", demarrer(IDS)));

  // le paquet est maîtrisé (appareil et compte) ; on l'ouvre : boucle neuve à l'écran, on feuillette
  let finie = demarrer(["a", "b"], { maintenant: T0 });
  finie = marquer(finie, true, T0 + 1);
  finie = avec(marquer(finie, true, T0 + 2), T0 + 2);
  const ouvert = demarrer(["a", "b"], { maintenant: T0 + 100 });
  const apres = aller(ouvert, 1);
  // la boucle de l'appareil n'est réécrite (et l'envoi planifié) que si le geste compte
  const surAppareil = doitSynchroniser("aller", apres) ? avec(apres, T0 + 101) : finie;
  const reprise = choisirBoucle(surAppareil, { etat: finie, maj: T0 + 3 });
  check("feuilleter une boucle neuve ne remplace pas une boucle finie : « Maîtrisé » reste", afficher(resumer(reprise.etat!))?.fini === true, JSON.stringify(afficher(resumer(reprise.etat!))));
}

// ---------------------------------------------------------------------------
console.log("\n# Ce qu'un onglet sait du compte");
{
  const s = new SuiviCompte();
  const ligne = (maj: number): { etat: unknown; maj: number } => ({ etat: avec(demarrer(IDS, { maintenant: T0 }), maj), maj: 0 });
  check("rien de lu : connu 0", s.connu === 0);
  s.lue(ligne(T0 + 100));
  check("ligne lue : connue, base des gestes", s.connu === T0 + 100 && !s.recue(ligne(T0 + 100)));
  // horloge de l'appareil en retard de 10 min : le geste passe quand même après la version connue
  const g1 = s.horodater(demarrer(IDS), { synchro: true, maintenant: T0 - 600_000 });
  check("horloge en retard : maj au-delà de la version connue, base = version connue", g1.maj === T0 + 101 && g1.base === T0 + 100, JSON.stringify([g1.maj, g1.base]));
  const g2 = s.horodater(g1, { synchro: true, maintenant: T0 - 599_000 });
  check("gestes suivants : maj strictement croissant", g2.maj === T0 + 102);
  s.envoye(g2);
  check("état envoyé : sa version est connue (base du geste suivant)", s.connu === T0 + 102 && s.horodater(g2, { synchro: true, maintenant: T0 }).base === T0 + 102);
  check("refus rendant notre propre version (envoi arrivé dans le désordre) : pas « ailleurs »", !s.recue(ligne(T0 + 102)));
  check("version jamais vue (autre appareil) : « ailleurs », puis connue", s.recue(ligne(T0 + 5000)) && s.connu === T0 + 5000 && !s.recue(ligne(T0 + 5000)));
  check("version jamais vue, même plus ancienne que la connue : « ailleurs »", s.recue(ligne(T0 + 50)) && s.connu === T0 + 5000);
  check("ligne illisible : ignorée", !s.recue({ etat: { v: 9 }, maj: 1 }) && !s.recue(null));
  const sans = s.horodater({ ...g2, base: 3 }, { synchro: false, maintenant: T0 + 10 });
  check("sans synchronisation : pas de base", sans.base === undefined && sans.maj === T0 + 103);
  check("Recommencer après l'état d'avant : maj au-delà de lui", s.horodater(demarrer(IDS), { synchro: false, avant: T0 + 9_000, maintenant: T0 }).maj === T0 + 9_001);
  check("majLigne : maj de l'état, sinon updated_at", majLigne(ligne(T0 + 7)) === T0 + 7 && majLigne({ etat: demarrer(IDS, { maintenant: T0 }), maj: 42 }) === 42 && majLigne(null) === null);
}

// ---------------------------------------------------------------------------
console.log("\n# Ordinateur partagé : la boucle de l'appareil est au nom du joueur");
{
  const e = { ...marquer(demarrer(IDS, { maintenant: T0 }), true, T0 + 1), u: "joueur-a" };
  check("celle du joueur : reprise", boucleDuJoueur(e, "joueur-a") === e);
  check("celle d'un autre compte : écartée", boucleDuJoueur(e, "joueur-b") === null);
  const ancienne = marquer(demarrer(IDS, { maintenant: T0 }), true, T0 + 1);
  check("sans auteur (gardée avant) : reprise", boucleDuJoueur(ancienne, "joueur-b") === ancienne && boucleDuJoueur(null, "x") === null);
  check("valider accepte u et base, refuse des formes fausses", valider(e) !== null && valider({ ...e, base: 4 }) !== null && valider({ ...e, u: 4 }) === null && valider({ ...e, base: "x" }) === null);
}

// ---------------------------------------------------------------------------
console.log("\n# Ligne lue en base : validée et réparée");
{
  let e = demarrer(IDS, { maintenant: T0 });
  e = marquer(e, false, T0 + 1);
  e = marquer(e, true, T0 + 2);
  const ligne = { etat: JSON.parse(JSON.stringify(avec(e, T0 + 2))), maj: T0 + 3 };
  const r = lireLigne(ligne, IDS);
  check("ligne lisible", !!r && r.etat.tour === 1 && r.maj === T0 + 3);
  const r2 = lireLigne(ligne, ["b", "c", "d"]);
  check("carte disparue : réparée (sortie de la file et des marques)", !!r2 && !r2.etat.file.includes("a") && !("a" in r2.etat.marques));
  check("plus aucune carte : null", lireLigne(ligne, ["x"]) === null);
  check("ligne illisible : null", lireLigne({ etat: { v: 2 }, maj: 0 }, IDS) === null && lireLigne(null, IDS) === null);
}

// ---------------------------------------------------------------------------
console.log("\n# État reçu du navigateur");
{
  const e = avec(marquer(demarrer(IDS, { maintenant: T0 }), true, T0 + 1), T0 + 1);
  const p = etatAEcrire({ ...e, injecte: "x", u: "joueur-a" });
  check("champs inconnus et auteur local retirés", !!p && !("injecte" in p) && !("u" in p) && p.maj === T0 + 1);
  check("maj gardé tel quel (il identifie la version), même en avance", etatAEcrire(avec(e, T0 + 10_000))?.maj === T0 + 10_000);
  check("base gardée (la base refuse un état dépassé)", etatAEcrire({ ...e, base: T0 })?.base === T0 && !("base" in etatAEcrire(e)!));
  check("sans maj : le dernier geste", etatAEcrire({ ...e, maj: undefined })?.maj === e.dernier);
  check("forme fausse : refusé", etatAEcrire({ v: 1, tour: 0 }) === null && etatAEcrire("x") === null && etatAEcrire(null) === null);
  const gros = demarrer(Array.from({ length: 590 }, (_, i) => `${"x".repeat(80)}-${i}`), { maintenant: T0 });
  check(`plus de ${TAILLE_MAX} caractères : refusé`, etatAEcrire(gros) === null);
  check("plus de 600 cartes : refusé", etatAEcrire(demarrer(Array.from({ length: 601 }, (_, i) => `c${i}`))) === null);
}

// ---------------------------------------------------------------------------
console.log("\n# Où j'en suis (listes)");
{
  const ids15 = Array.from({ length: 15 }, (_, i) => `k${i}`);
  let e = demarrer(ids15, { maintenant: T0 });
  check("jamais commencée : rien", resumer(e) === null && afficher(resumer(e)) === null);
  for (let i = 0; i < 7; i++) e = marquer(e, i % 3 !== 0, T0 + i);
  const r1 = resumer(e);
  // la barre du tour dit « 8 / 15 » (la carte à l'écran) : la pastille ne donne pas une autre fraction
  check("tour 1 : « Tour 1 · 8 restantes »", r1?.genre === "tour1" && afficher(r1)?.texte === "Tour 1 · 8 restantes" && afficher(r1)?.genre === "tour1", afficher(r1)?.texte);
  check("tour 1 : l'aide dit les passées et les restantes", afficher(r1)?.aide === "Premier tour : 7 sur 15 cartes passées, 8 restantes", afficher(r1)?.aide);
  for (let i = 7; i < 15; i++) e = marquer(e, i !== 9, T0 + i);
  // fin du tour 1 : k0, k3, k6, k9 à revoir
  const r2 = resumer(e);
  check("fin du tour 1 : « Tour 1 · 4 à revoir »", afficher(r2)?.texte === "Tour 1 · 4 à revoir", afficher(r2)?.texte);
  e = tourSuivant(e, { rng: () => 0.3, maintenant: T0 + 100 });
  check("début du tour 2 : « Tour 2 · 4 à revoir »", afficher(resumer(e))?.texte === "Tour 2 · 4 à revoir", afficher(resumer(e))?.texte);
  e = marquer(e, true, T0 + 101);
  e = marquer(e, false, T0 + 102);
  check("tour 2, une maîtrisée, une à revoir : « Tour 2 · 3 à revoir »", afficher(resumer(e))?.texte === "Tour 2 · 3 à revoir", afficher(resumer(e))?.texte);
  e = marquer(e, true, T0 + 103);
  e = marquer(e, true, T0 + 104);
  e = tourSuivant(e, { maintenant: T0 + 200 });
  const fin = Date.UTC(2026, 9, 24, 21, 30);
  e = marquer(e, true, fin);
  const r3 = afficher(resumer(e));
  check("bouclée : « Maîtrisé · 24 oct. », la date visible, la longue en aide", r3?.fini === true && r3.genre === "fini" && r3.texte === "Maîtrisé · 24 oct." && r3.aide === "Tout maîtrisé le 24 octobre 2026", JSON.stringify(r3));
  check("recommencée : rien", resumer(demarrer(ids15)) === null);
  const ligneFinie = { etat: JSON.parse(JSON.stringify(e)), maj: 0 };
  check("depuis une ligne en base", etatAffiche(ligneFinie)?.fini === true && etatAffiche({ etat: "x", maj: 0 }) === null && etatAffiche(null) === null);

  // le contenu change après la fin (ids des paquets et des cartes stables) : deux cartes ajoutées
  const plus = [...ids15, "k15", "k16"];
  const n1 = afficher(resumer(e, 17));
  check("bouclée puis 2 cartes ajoutées : plus « Maîtrisé », « 2 nouvelles »", n1?.fini === false && n1.genre === "nouvelles" && n1.texte === "2 nouvelles" && n1.aide === "Tout maîtrisé le 24 octobre 2026, puis 2 cartes ajoutées au paquet", JSON.stringify(n1));
  check("… depuis la ligne, avec les ids (page du paquet, de la matière)", etatAffiche(ligneFinie, plus)?.genre === "nouvelles");
  check("… depuis la ligne, avec le nombre (liste)", etatAffiche(ligneFinie, 17)?.genre === "nouvelles" && etatAffiche(ligneFinie, 15)?.genre === "fini");
  check("une seule ajoutée : « 1 nouvelle »", afficher(resumer(e, 16))?.texte === "1 nouvelle");

  // une boucle au tour 2 dont une carte « à revoir » a été retirée : réparée avec les ids
  let t2 = demarrer(ids15, { maintenant: T0 });
  for (let i = 0; i < 15; i++) t2 = marquer(t2, i > 3, T0 + i);
  t2 = tourSuivant(t2, { rng: () => 0.3, maintenant: T0 + 100 });
  const ligneT2 = { etat: JSON.parse(JSON.stringify(t2)), maj: 0 };
  const sansK0 = ids15.filter((x) => x !== "k0");
  check("tour 2, carte retirée : « Tour 2 · 3 à revoir » (réparée), 4 sans les ids", etatAffiche(ligneT2, sansK0)?.texte === "Tour 2 · 3 à revoir" && etatAffiche(ligneT2)?.texte === "Tour 2 · 4 à revoir", etatAffiche(ligneT2, sansK0)?.texte);
  check("plus aucune carte de la boucle : rien", etatAffiche(ligneT2, ["zz"]) === null);
}

// ---------------------------------------------------------------------------
console.log("\n# Listes : l'appareil relu après le montage");
{
  const st = new Map<string, string>();
  const stock: Stockage = { getItem: (k) => st.get(k) ?? null, setItem: (k, v) => void st.set(k, v), removeItem: (k) => void st.delete(k) };
  const id = "6f1c2b3a-0d4e-4f5a-8b6c-7d8e9f0a1b2c";
  check("clé locale : l'id du paquet, la matière telle quelle", cleLocale(cleSet(id)) === id && cleLocale(cleMatiere("fsa")) === "matiere:fsa");
  let e = demarrer(IDS, { maintenant: T0 });
  e = avec(marquer(e, true, T0 + 1), T0 + 1);
  const compte = etatListe(cleSet(id), { etat: e, maj: 0 }, 4, "joueur-a");
  check("état de liste : affiché, version, total, clé locale", compte.affiche?.texte === "Tour 1 · 3 restantes" && compte.maj === T0 + 1 && compte.total === 4 && compte.local === id && compte.joueur === "joueur-a");
  const plusLoin = { ...avec(marquer(e, false, T0 + 2), T0 + 2), base: T0 + 1, u: "joueur-a" };
  st.set(`rl_fc_boucle:${id}`, JSON.stringify(plusLoin));
  check("lue brute sur l'appareil (sans réparation)", lireBoucleBrute(id, stock)?.maj === T0 + 2 && lireBoucleBrute("autre", stock) === null);
  check("appareil plus récent (retour arrière, envoi pas arrivé) : son état", etatLocalAffiche(lireBoucleBrute(id, stock), compte)?.texte === "Tour 1 · 2 restantes");
  check("même version que le compte : celui du serveur", etatLocalAffiche(e, compte) === undefined);
  check("appareil plus ancien : celui du serveur", etatLocalAffiche(avec(demarrer(IDS, { maintenant: T0 }), T0), compte) === undefined);
  check("boucle d'un autre compte : celui du serveur", etatLocalAffiche({ ...plusLoin, u: "joueur-b" }, compte) === undefined);
  check("compte changé ailleurs depuis la base de l'appareil : celui du serveur", etatLocalAffiche({ ...plusLoin, maj: T0 + 9, base: T0 }, compte) === undefined);
  check("Recommencer pas encore arrivé : rien (pas l'ancien « Maîtrisé »)", etatLocalAffiche({ ...avec(demarrer(IDS, { maintenant: T0 }), T0 + 50), u: "joueur-a" }, compte) === null);
  check("pas de ligne sur le compte : l'appareil", etatLocalAffiche(plusLoin, etatListe(cleSet(id), null, 4, "joueur-a"))?.texte === "Tour 1 · 2 restantes");
}

// ---------------------------------------------------------------------------
console.log("\n# Clés");
{
  const ID_HAUT = "6F1C2B3A-0D4E-4F5A-8B6C-7D8E9F0A1B2C";
  const id = "6f1c2b3a-0d4e-4f5a-8b6c-7d8e9f0a1b2c";
  check("set:<uuid>", cleSet(id) === `set:${id}` && cleValide(cleSet(id)));
  check("matiere:<clé du programme>", cleValide(cleMatiere("fixed_income")) && cleValide(cleMatiere("fsa")));
  check("matière inconnue refusée", !cleValide(cleMatiere("astrologie")));
  check("formes fausses refusées", !cleValide("set:abc") && !cleValide(id) && !cleValide(`set:${ID_HAUT}`) && !cleValide(42) && !cleValide("rl_fc_boucle:x"));
}

// ---------------------------------------------------------------------------
console.log("\n# En-tête en direct");
{
  const e = demarrer(IDS, { maintenant: T0 });
  annoncerBoucle("set:x", e);
  check("sans fenêtre : rien, sans erreur", true);
  const w = new EventTarget();
  (globalThis as unknown as { window: EventTarget }).window = w;
  const recus: DetailBoucle[] = [];
  w.addEventListener(EVENEMENT_BOUCLE, (ev) => void recus.push((ev as CustomEvent<DetailBoucle>).detail));
  annoncerBoucle("matiere:fsa", e);
  check("annonce reçue avec sa clé et son état", recus.length === 1 && recus[0].cle === "matiere:fsa" && recus[0].etat === e);
  delete (globalThis as unknown as { window?: EventTarget }).window;
}

// ---------------------------------------------------------------------------
async function base() {
  console.log("\n# Base : table absente, lecture, écriture (faux client)");
  type Appel = { table: string; op: string; args: unknown[] };
  function faux(reponse: (a: Appel) => { data: unknown; error: { code?: string; message?: string } | null }) {
    const appels: Appel[] = [];
    const client = {
      from(table: string) {
        const a: Appel = { table, op: "select", args: [] };
        appels.push(a);
        const q: Record<string, unknown> = {};
        for (const m of ["select", "eq", "in", "limit", "upsert"]) {
          q[m] = (...args: unknown[]) => {
            if (m === "upsert") a.op = "upsert";
            a.args.push([m, ...args]);
            return q;
          };
        }
        q.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(reponse(a)).then(res, rej);
        return q;
      },
    };
    return { client: client as unknown as SupabaseClient, appels };
  }
  const id = "6f1c2b3a-0d4e-4f5a-8b6c-7d8e9f0a1b2c";
  const e = avec(marquer(demarrer(IDS, { maintenant: T0 }), true, T0 + 1), T0 + 1);

  check("42P01 / PGRST205 / message : table absente", tableAbsente({ code: "42P01" }) && tableAbsente({ code: "PGRST205" }) && tableAbsente({ message: 'relation "public.flashcard_progress" does not exist' }) && !tableAbsente({ code: "23514" }) && !tableAbsente(null));

  const ok = faux(() => ({ data: [{ deck_key: `set:${id}`, state: e, updated_at: "2026-10-24T10:00:00Z" }], error: null }));
  const m = await lireProgressions(ok.client, "u1", [`set:${id}`, "pas-une-cle"]);
  check("lecture : une ligne, updated_at en ms", m?.get(`set:${id}`)?.maj === Date.parse("2026-10-24T10:00:00Z"));
  check("lecture : filtrée sur le joueur et les clés valides seulement", JSON.stringify(ok.appels[0].args).includes('"user_id","u1"') && JSON.stringify(ok.appels[0].args).includes(`["in","deck_key",["set:${id}"]]`), JSON.stringify(ok.appels[0].args));
  const vide = await lireProgressions(ok.client, "u1", ["pas-une-cle"]);
  check("lecture : aucune clé valide, aucune requête", vide?.size === 0 && ok.appels.length === 1);

  const w = await ecrireProgression(ok.client, "u1", `set:${id}`, { ...e, injecte: 1 });
  const up = ok.appels[1];
  const payload = (up?.args.find((x) => (x as unknown[])[0] === "upsert") as unknown[] | undefined)?.[1] as { user_id: string; deck_key: string; state: Record<string, unknown> } | undefined;
  check("écriture : upsert de l'état propre au nom du joueur", w.ok && up?.op === "upsert" && payload?.user_id === "u1" && payload.deck_key === `set:${id}` && !("injecte" in payload.state), JSON.stringify(up?.args));
  check("écriture : la ligne écrite est demandée en retour (vide : ignorée par la base)", JSON.stringify(up?.args).includes('["select","updated_at"]'), JSON.stringify(up?.args));
  check("écriture : clé refusée sans requête", (await ecrireProgression(ok.client, "u1", "matiere:astrologie", e)).ok === false && ok.appels.length === 2);
  check("écriture : état refusé sans requête", (await ecrireProgression(ok.client, "u1", `set:${id}`, { v: 1 })).ok === false && ok.appels.length === 2);

  // la base ignore un état bâti sur une version dépassée : aucune ligne rendue, le compte est relu
  const ailleurs = { deck_key: `set:${id}`, state: avec(e, T0 + 999), updated_at: "2026-10-24T11:00:00Z" };
  const conflit = faux((a) => (a.op === "upsert" ? { data: [], error: null } : { data: [ailleurs], error: null }));
  const rc = await ecrireProgression(conflit.client, "u1", `set:${id}`, { ...e, base: T0 });
  const envoye = (conflit.appels[0]?.args.find((x) => (x as unknown[])[0] === "upsert") as unknown[] | undefined)?.[1] as { state: Record<string, unknown> } | undefined;
  check("écriture : la base de l'état part avec lui", envoye?.state.base === T0, JSON.stringify(envoye?.state));
  check(
    "écriture ignorée (version dépassée) : « conflit » avec la ligne du compte relue",
    !rc.ok && rc.raison === "conflit" && majLigne(rc.ligne) === T0 + 999 && conflit.appels.length === 2 && conflit.appels[1].op === "select",
    JSON.stringify(rc)
  );

  const autre = faux(() => ({ data: null, error: { code: "23514", message: "violates check constraint" } }));
  const r = await ecrireProgression(autre.client, "u1", `set:${id}`, e);
  check("écriture : autre erreur → « erreur » (retentée par le navigateur)", !r.ok && r.raison === "erreur");
  check("lecture : autre erreur → null, sans retenir d'absence", (await lireProgressions(autre.client, "u1")) === null && (await lireProgressions(ok.client, "u1")) !== null);

  // table absente : une requête, puis plus rien pendant quelques minutes, sans un mot en console
  const bruit: unknown[] = [];
  const [ce, cw] = [console.error, console.warn];
  console.error = (...x: unknown[]) => void bruit.push(x);
  console.warn = (...x: unknown[]) => void bruit.push(x);
  const absente = faux(() => ({ data: null, error: { code: "PGRST205", message: "Could not find the table 'public.flashcard_progress' in the schema cache" } }));
  check("table absente : lecture → null", (await lireProgressions(absente.client, "u1")) === null);
  check("table absente : la lecture suivante ne requête plus", (await lireProgressions(absente.client, "u1")) === null && absente.appels.length === 1);
  const w2 = await ecrireProgression(absente.client, "u1", `set:${id}`, e);
  check("table absente : écriture → « absente », sans requête", !w2.ok && w2.raison === "absente" && absente.appels.length === 1);
  console.error = ce;
  console.warn = cw;
  check("table absente : rien n'est écrit en console", bruit.length === 0, JSON.stringify(bruit));
}

base().then(
  () => {
    console.log(ko ? `\n${ko} échec(s)` : "\nTout est vert.");
    process.exit(ko ? 1 : 0);
  },
  (e) => {
    console.error(e);
    process.exit(1);
  }
);
