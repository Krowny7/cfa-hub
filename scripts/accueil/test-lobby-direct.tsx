// Test du lot 2 de l'accueil « Le lobby » : « En ce moment dans le lobby » et le
// personnage du vainqueur. Calculs (modele-direct.ts), lectures sur un faux
// client Supabase (lecture-direct.ts) puis rendu react-dom/server, sans base,
// réseau ni navigateur :
//   npx tsx --tsconfig tsconfig.json scripts/accueil/test-lobby-direct.tsx
import "../codex/sans-css";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { EnDirect } from "@/components/accueil/lobby/EnDirect";
import { PersoVainqueur } from "@/components/accueil/lobby/PersoVainqueur";
import { lireBrutDirect, lireEnDirect, lirePersoVainqueur } from "@/components/accueil/lobby/lecture-direct";
import {
  DERIVE_MS,
  EVENEMENTS_MAX,
  FENETRE_MS,
  candidatsDe,
  chiffresDe,
  dansLHeure,
  directDe,
  evenementsDe,
  joueursDe,
  persoDe,
  photoDe,
  prenomDe,
  JOUEURS_LUS,
  JOUEURS_MAX,
  type DirectBrut,
  type JoueurBrut,
} from "@/components/accueil/lobby/modele-direct";
import type { CtxLecture, EnDirectLobby } from "@/components/accueil/lobby/types";
import { bornerCalque, compositionDefaut } from "@/lib/profil/banniere";

// le JSX des composants (tsconfig « preserve ») attend React en portée
(globalThis as { React?: typeof React }).React = React;

let ko = 0;
const titre = (t: string) => {
  console.log("");
  console.log(t);
};
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const compte = (html: string, re: RegExp) => (html.match(re) ?? []).length;
const NB = String.fromCharCode(160);
const ANTISLASH = String.fromCharCode(92);

// ── l'instant et les joueurs ───────────────────────────────────────────────

/** Dimanche 1er novembre 2026, 15 h à Paris (14 h UTC) : la fenêtre « dans l'heure » ne touche pas minuit. */
const NOW = new Date("2026-11-01T14:00:00Z");
const JOUR = "2026-11-01";
const il_y_a = (minutes: number, secondes = 0, depuis = NOW) => new Date(depuis.getTime() - (minutes * 60 + secondes) * 1000).toISOString();
const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const INES = id(1);
const MARIE = id(2);
const HUGO = id(3);
const BOB = id(4);
const ZOE = id(5);
const SARAH = id(6);
const LUCAS = id(7);
const THEO = id(9);

// ── un faux client Supabase ────────────────────────────────────────────────

type Rep = { data?: unknown; error?: { code?: string; message?: string } | null; count?: number | null };
type Requete = { table: string; cols: unknown; head: boolean; filtres: unknown[][] };
type Config = {
  /** les classements, par « nom de la RPC|jour » ; absent : la RPC n'existe pas */
  planches?: Record<string, unknown>;
  /** les tables : chaque lecture reçoit sa requête et rend sa réponse (absente : table vide) */
  tables?: Record<string, (q: Requete) => Rep>;
};

function faux(config: Config) {
  const journal: Requete[] = [];
  const appels: { rpc: string; jour: string; limite: number }[] = [];
  const client = {
    rpc(nom: string, args: { p_day: string; p_limit: number }) {
      appels.push({ rpc: nom, jour: args.p_day, limite: args.p_limit });
      const r = config.planches?.[`${nom}|${args.p_day}`];
      return Promise.resolve(r === undefined ? { data: null, error: { code: "PGRST202", message: "could not find the function" } } : { data: r, error: null });
    },
    from(table: string) {
      const q: Requete = { table, cols: null, head: false, filtres: [] };
      journal.push(q);
      const b: unknown = new Proxy(
        {},
        {
          get(_c, prop) {
            if (prop === "then") {
              const rep = config.tables?.[table]?.(q) ?? { data: [], error: null, count: 0 };
              return (ok: (v: Rep) => unknown, ko2: (e: unknown) => unknown) => Promise.resolve(rep).then(ok, ko2);
            }
            if (prop === "select") {
              return (cols: unknown, opts?: { head?: boolean }) => {
                q.cols = cols;
                q.head = !!opts?.head;
                return b;
              };
            }
            return (...args: unknown[]) => {
              q.filtres.push([String(prop), ...args]);
              return b;
            };
          },
        },
      );
      return b;
    },
  };
  return { client: client as unknown as SupabaseClient, journal, appels };
}

const ligne = (rang: number, uid: string, nom: string | null, score: number, total: number, fini: string) => ({
  rank: rang,
  user_id: uid,
  username: nom,
  avatar_url: null,
  score,
  total,
  seconds: 700,
  finished_at: fini,
  is_me: false,
});
const planche = (jour: string, rows: unknown[]) => ({ day: jour, exists: true, players: rows.length, playing: 0, rows, me: null });
const a_filtre = (q: Requete, nom: string, ...args: unknown[]) => q.filtres.some((f) => f[0] === nom && args.every((a, i) => f[i + 1] === a));

/** Les classements d'un jour ordinaire : 3 copies des 30 dans l'heure (Inès, Marie, Hugo), une pile à l'heure (Bob), une ancienne (Zoé), un 4/5 de Sarah. */
const PLANCHES: Record<string, unknown> = {
  [`daily_leaderboard|${JOUR}`]: planche(JOUR, [
    ligne(1, MARIE, "Marie L.", 29, 30, il_y_a(20)),
    ligne(2, INES, "Inès K.", 28, 30, il_y_a(0, 30)),
    ligne(3, HUGO, "Hugo B.", 28, 30, il_y_a(59, 59)),
    ligne(4, BOB, "Bob", 20, 30, il_y_a(60)),
    ligne(5, ZOE, "Zoé", 18, 30, il_y_a(120)),
  ]),
  [`cinq_leaderboard|${JOUR}`]: planche(JOUR, [ligne(1, SARAH, "Sarah T.", 4, 5, il_y_a(3))]),
};

/** Les profils du faux site : pseudo et photo (Lucas a une photo ; l'adresse de Zoé est dangereuse, elle ne sera jamais une image). */
const PHOTO_LUCAS = "https://exemple.supabase.co/storage/v1/object/public/avatars/lucas.png";
const PROFILS: Record<string, [string, string | null]> = {
  [INES]: ["Inès K.", null],
  [HUGO]: ["Hugo B.", null],
  [LUCAS]: ["Lucas M.", PHOTO_LUCAS],
  [SARAH]: ["Sarah T.", null],
  [ZOE]: ["Zoé", "javascript:alert(1)"],
  [BOB]: ["Bob", null],
};
/** Les joueurs en ligne du faux site, le plus récent d'abord (le compte exact, lui, est de 47). */
const EN_LIGNE_LUS = [INES, LUCAS, HUGO, SARAH, ZOE, BOB];
const idsDe = (q: Requete) => (q.filtres.find((f) => f[0] === "in" && f[1] === "id")?.[2] as string[] | undefined) ?? [];

/** Les tables d'un site complet : 47 joueurs en ligne (six nommés), 6 duels en cours, Lucas a gagné un duel il y a 2 min, Marie masque sa présence. */
const TABLES: NonNullable<Config["tables"]> = {
  user_presence: (q) => (a_filtre(q, "eq", "visible", true) ? { data: EN_LIGNE_LUS.map((u) => ({ user_id: u })), count: 47, error: null } : { data: [{ user_id: MARIE }], error: null }),
  duels: (q) => (q.head ? { count: 6, error: null } : { data: [{ winner_id: LUCAS, finished_at: il_y_a(2) }], error: null }),
  profiles: (q) => ({ data: idsDe(q).filter((u) => PROFILS[u]).map((u) => ({ id: u, username: PROFILS[u][0], avatar_url: PROFILS[u][1] })), error: null }),
};
/** Les amis de Théo : Hugo et Sarah (une amitié où il demande, une où il répond). */
const AMITIES: NonNullable<Config["tables"]> = {
  friendships: () => ({ data: [{ requester: THEO, addressee: HUGO }, { requester: SARAH, addressee: THEO }], error: null }),
};
const MOI = { nom: "Theo", avatarUrl: null };

function contexte(sb: SupabaseClient, admin: SupabaseClient | null, user = THEO, now = NOW, jour = JOUR): CtxLecture {
  return { sb, admin, user: { id: user, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" }, now, jour };
}
const texteDe = (e: { texte: unknown[] }) => e.texte.map((g) => (typeof g === "string" ? g : (g as { b: string }).b)).join("");

async function main() {
  // ── 1. la fenêtre « dans l'heure » ───────────────────────────────────────
  titre("1. La fenêtre d'une heure");
  const t0 = NOW.getTime();
  check("59 min 59 s : dedans", dansLHeure(il_y_a(59, 59), t0));
  check("60 min pile : dehors", !dansLHeure(il_y_a(60), t0));
  check("60 min 1 s : dehors", !dansLHeure(il_y_a(60, 1), t0));
  check("à l'instant : dedans", dansLHeure(NOW.toISOString(), t0));
  check("horloge de la base en avance de 4 min : dedans", dansLHeure(new Date(t0 + DERIVE_MS - 60_000).toISOString(), t0));
  check("en avance de 6 min : dehors", !dansLHeure(new Date(t0 + DERIVE_MS + 60_000).toISOString(), t0));
  check("date illisible : dehors", !dansLHeure("pas une date", t0) && !dansLHeure("", t0));
  check("la fenêtre fait une heure", FENETRE_MS === 3_600_000);

  // ── 2. les noms ──────────────────────────────────────────────────────────
  titre("2. Les prénoms");
  check("« Marie L. » → Marie", prenomDe("Marie L.") === "Marie");
  check("un pseudo en un mot reste entier", prenomDe("theo_cfa") === "theo_cfa");
  check("« Joueur a1b2c3d4 » reste entier", prenomDe("Joueur a1b2c3d4") === "Joueur a1b2c3d4");
  check("vide → « Un joueur »", prenomDe("   ") === "Un joueur");

  // ── 3. les faits, le fil, les chiffres (purs) ────────────────────────────
  titre("3. Le fil et les chiffres");
  const brut: DirectBrut = {
    enLigne: 47,
    duels: 6,
    copies: [
      { userId: MARIE, nom: "Marie L.", score: 29, total: 30, finishedAt: il_y_a(20), format: "trente" },
      { userId: INES, nom: "Inès K.", score: 28, total: 30, finishedAt: il_y_a(0, 30), format: "trente" },
      { userId: HUGO, nom: "Hugo B.", score: 28, total: 30, finishedAt: il_y_a(59, 59), format: "trente" },
      { userId: BOB, nom: "Bob", score: 20, total: 30, finishedAt: il_y_a(60), format: "trente" },
      { userId: SARAH, nom: "Sarah T.", score: 4, total: 5, finishedAt: il_y_a(3), format: "cinq" },
      // les 5 d'une personne qui a aussi rendu les 30 : un seul fait par joueur (le plus récent)
      { userId: INES, nom: "Inès K.", score: 5, total: 5, finishedAt: il_y_a(10), format: "cinq" },
    ],
    victoires: [{ userId: LUCAS, nom: "Lucas M.", finishedAt: il_y_a(2) }],
    masques: [MARIE],
  };
  const d = directDe(brut, t0, THEO)!;
  check("copies des 30 dans l'heure : 3 (Marie, Inès, Hugo ; pas Bob à 60 min pile, pas les 5)", d.copiesHeure === 3, `(${d.copiesHeure})`);
  check("les chiffres lus passent tels quels", d.enLigne === 47 && d.duels === 6);
  check("4 faits au plus", d.evenements.length === EVENEMENTS_MAX && d.evenements.length === 4);
  check(
    "du plus récent au plus ancien : Inès, Lucas, Sarah, Hugo (Marie masque sa présence)",
    d.evenements.map((e) => e.initiales).join(",") === "IK,LM,ST,HB",
    d.evenements.map((e) => e.initiales).join(","),
  );
  check("Inès n'a qu'un fait : le plus récent (les 30, pas les 5)", d.evenements[0].texte.some((g) => typeof g !== "string" && "b" in g && g.b === "28/30"));
  check("phrase des 30 : « Inès vient de rendre sa copie : 28/30 »", texteDe(d.evenements[0]) === "Inès vient de rendre sa copie : 28/30", texteDe(d.evenements[0]));
  check("phrase d'un duel : « Lucas a gagné un duel » (pas de matière)", texteDe(d.evenements[1]) === "Lucas a gagné un duel", texteDe(d.evenements[1]));
  check("phrase des 5 : « Sarah a fait 4/5 aux 5 du jour »", texteDe(d.evenements[2]) === "Sarah a fait 4/5 aux 5 du jour", texteDe(d.evenements[2]));
  check("pastille sombre : les 30 et le duel ; claire : les 5", d.evenements[0].sombre && d.evenements[1].sombre && !d.evenements[2].sombre);
  check("« à l'instant » (30 s), « il y a 2 min », « il y a 59 min »", d.evenements[0].quand === "à l'instant" && d.evenements[1].quand === "il y a 2 min" && d.evenements[3].quand === "il y a 59 min", d.evenements.map((e) => e.quand).join(" | "));
  check("clés uniques", new Set(d.evenements.map((e) => e.cle)).size === d.evenements.length);

  const moi = evenementsDe(brut, t0, INES);
  check("toi, tu te vois à la deuxième personne : « Tu viens de rendre ta copie : 28/30 »", texteDe(moi[0]) === "Tu viens de rendre ta copie : 28/30", texteDe(moi[0]));
  const moiMasque = evenementsDe(brut, t0, MARIE);
  check("même masquée, Marie se voit elle-même", moiMasque.some((e) => texteDe(e).startsWith("Tu viens de rendre ta copie : 29/30")));
  check("un joueur masqué n'apparaît pas aux autres", !d.evenements.some((e) => e.initiales === "ML"));
  const duelMoi = evenementsDe({ ...brut, copies: [], masques: [] }, t0, LUCAS);
  check("duel gagné par toi : « Tu as gagné un duel »", texteDe(duelMoi[0]) === "Tu as gagné un duel");
  const cinqMoi = evenementsDe({ ...brut, copies: [brut.copies[4]], victoires: [], masques: [] }, t0, SARAH);
  check("les 5 par toi : « Tu as fait 4/5 aux 5 du jour »", texteDe(cinqMoi[0]) === "Tu as fait 4/5 aux 5 du jour");

  const egalite = candidatsDe(
    {
      copies: [
        { userId: HUGO, nom: "Hugo", score: 1, total: 30, finishedAt: il_y_a(5), format: "trente" },
        { userId: INES, nom: "Inès", score: 1, total: 30, finishedAt: il_y_a(5), format: "trente" },
      ],
      victoires: [],
    },
    t0,
  );
  check("à égalité d'instant, l'ordre est stable (par clé)", egalite.length === 2 && egalite[0].cle < egalite[1].cle);
  check("candidatsDe borne à `max`", candidatsDe(brut, t0, 2).length === 2);
  check("un fait hors de l'heure ne revient pas dans le fil", !d.evenements.some((e) => e.initiales === "BO" || e.initiales === "ZO"));

  // rien du tout → null
  check("rien du tout (compte non lu, zéro duel, aucun fait) → null", directDe({ enLigne: null, duels: 0, copies: [], victoires: [], masques: [] }, t0, THEO) === null);
  check("rien non lu (null, null, aucun fait) → null", directDe({ enLigne: null, duels: null, copies: [], victoires: [], masques: [] }, t0, THEO) === null);
  {
    // le compte est lu à zéro (personne ne montre sa présence) : toi, tu regardes, donc tu es en ligne
    const seul = directDe({ enLigne: 0, duels: 0, copies: [], victoires: [], masques: [], joueurs: [] }, t0, THEO, { moi: MOI })!;
    check("compte lu à zéro : la carte reste avec toi seul (1 joueur en ligne), pas « 0 »", !!seul && seul.enLigne === 1 && seul.joueurs.length === 1 && seul.joueurs[0].moi && seul.plus === 0, JSON.stringify(seul));
  }
  check("des faits seuls (sans admin) → une carte", directDe({ enLigne: null, duels: null, copies: [brut.copies[1]], victoires: [], masques: [] }, t0, THEO) !== null);
  check("des joueurs en ligne seuls → une carte", directDe({ enLigne: 3, duels: null, copies: [], victoires: [], masques: [] }, t0, THEO) !== null);
  check(
    "tous les faits masqués mais des chiffres : la carte reste, sans fil",
    (() => {
      const r = directDe({ ...brut, copies: [brut.copies[0]], victoires: [], masques: [MARIE] }, t0, THEO)!;
      return r.evenements.length === 0 && r.enLigne === 47;
    })(),
  );

  // les chiffres
  const ch = chiffresDe(d);
  check("3 chiffres quand tout est lu", ch.length === 3 && ch.map((c) => c.cle).join(",") === "enLigne,duels,copies");
  check("libellés : joueurs en ligne, duels en cours, copies des 30 rendues dans l'heure", ch[0].lib === "joueurs en ligne" && ch[1].lib === "duels en cours" && ch[2].lib === "copies des 30 rendues dans l'heure", ch.map((c) => c.lib).join(" | "));
  check("les valeurs sont formatées (espace insécable aux milliers)", chiffresDe({ enLigne: 1204, duels: 1, copiesHeure: 1 })[0].val === `1${NB}204`);
  const un = chiffresDe({ enLigne: 1, duels: 1, copiesHeure: 1 });
  check("singulier à 1 : joueur en ligne, duel en cours, copie ... rendue", un[0].lib === "joueur en ligne" && un[1].lib === "duel en cours" && un[2].lib === "copie des 30 rendue dans l'heure");
  check("sans admin : seules les copies, s'il y en a", chiffresDe({ enLigne: null, duels: null, copiesHeure: 2 }).map((c) => c.cle).join(",") === "copies");
  check("sans admin et sans copie : aucun chiffre", chiffresDe({ enLigne: null, duels: null, copiesHeure: 0 }).length === 0);
  check("avec admin, zéro copie : les trois lignes quand même", chiffresDe({ enLigne: 4, duels: 0, copiesHeure: 0 }).length === 3);

  // les joueurs en ligne : toi d'abord, tes amis, puis les autres
  titre("3 bis. Les visages des joueurs en ligne");
  const jb = (n: number, nom = `Joueur ${n}`, avatarUrl: string | null = null): JoueurBrut => ({ id: id(n), nom, avatarUrl });
  {
    const lus = [jb(1, "Inès K."), jb(2, "Marie L."), jb(3, "Hugo B.", "https://exemple.supabase.co/h.png"), jb(4, "Bob")];
    const r = joueursDe({ enLigne: 4, joueurs: lus }, THEO, { moi: { nom: "Théo C.", avatarUrl: "https://exemple.supabase.co/t.png" }, amis: [HUGO, BOB] });
    check("toi en premier (« Toi »), puis tes amis en ligne, puis les autres dans l'ordre de la lecture", r.joueurs.map((j) => j.prenom).join(",") === "Toi,Hugo,Bob,Inès,Marie", r.joueurs.map((j) => j.prenom).join(","));
    check("toi : ta photo, tes initiales, le drapeau « moi »", r.joueurs[0].moi && r.joueurs[0].avatarUrl === "https://exemple.supabase.co/t.png" && r.joueurs[0].initiales === "TC" && r.joueurs[0].nom === "Théo C.");
    check("les amis sont marqués, les autres non ; la photo suit le joueur", r.joueurs[1].ami && r.joueurs[2].ami && !r.joueurs[3].ami && r.joueurs[1].avatarUrl === "https://exemple.supabase.co/h.png" && r.joueurs[3].avatarUrl === null);
    check("la liste est complète et ne te contient pas : tu t'ajoutes au compte (4 → 5), aucun « +N »", r.enLigne === 5 && r.plus === 0, `${r.enLigne} +${r.plus}`);
    check("sans photo ni pseudo connus, tu restes « Toi » (initiale T)", (() => { const t = joueursDe({ enLigne: 1, joueurs: [] }, THEO).joueurs[0]; return t.moi && t.prenom === "Toi" && t.nom === "Toi" && t.initiales === "T" && t.avatarUrl === null; })());
  }
  {
    const lus = [jb(1, "Inès K."), { id: THEO, nom: "Théo C.", avatarUrl: null }, jb(2, "Marie L.")];
    const r = joueursDe({ enLigne: 3, joueurs: lus }, THEO, { moi: MOI });
    check("la liste te contient déjà : pas de doublon, pas de +1", r.enLigne === 3 && r.joueurs.length === 3 && r.joueurs.filter((j) => j.id === THEO).length === 1 && r.joueurs[0].moi, JSON.stringify(r.joueurs.map((j) => j.prenom)));
  }
  {
    const lus = Array.from({ length: 5 }, (_, i) => jb(i + 1));
    const tronquee = joueursDe({ enLigne: 47, joueurs: lus }, THEO, { moi: MOI });
    check("liste tronquée (5 nommés sur 47) : on ne peut pas savoir si tu y es, le compte reste 47 ; « +41 » pour le reste", tronquee.enLigne === 47 && tronquee.joueurs.length === 6 && tronquee.plus === 41, `${tronquee.enLigne} +${tronquee.plus}`);
    const beaucoup = Array.from({ length: 9 }, (_, i) => jb(i));
    const r = joueursDe({ enLigne: 9, joueurs: beaucoup }, THEO, { moi: MOI });
    check(`huit visages au plus (toi compris) : ${JOUEURS_MAX}, le reste en « +N »`, r.joueurs.length === JOUEURS_MAX && r.joueurs[0].moi && r.plus === 10 - JOUEURS_MAX, `${r.joueurs.length} +${r.plus}`);
    check("la lecture ne nomme pas plus de 40 joueurs", JOUEURS_LUS === 40);
  }
  {
    const sans = joueursDe({ enLigne: null, joueurs: [] }, THEO, { moi: MOI });
    check("compte non lu : enLigne null, « Toi » quand même, pas de « +N »", sans.enLigne === null && sans.joueurs.length === 1 && sans.joueurs[0].moi && sans.plus === 0);
    const zero = joueursDe({ enLigne: 0, joueurs: [] }, THEO, { moi: MOI });
    check("compte à zéro : 1 joueur en ligne, c'est toi", zero.enLigne === 1 && zero.plus === 0);
    const doublons = joueursDe({ enLigne: 2, joueurs: [jb(1), jb(1)] }, THEO, { moi: MOI });
    check("un joueur listé deux fois n'a qu'un visage", doublons.joueurs.length === 2);
    const dangereux = joueursDe({ enLigne: 1, joueurs: [jb(1, "Inès K.", "javascript:alert(1)"), jb(2, "Marie L.", "//evil.example/x.png")] }, THEO, { moi: { nom: "T", avatarUrl: "data:image/png;base64,AAAA" } });
    check("adresse de photo dangereuse (javascript:, //, data:) → pas de photo, des initiales", dangereux.joueurs.every((j) => j.avatarUrl === null));
    check("photoDe : du site ou en https, sinon null", photoDe("/avatars/x.png") === "/avatars/x.png" && photoDe("https://exemple.supabase.co/x.png") === "https://exemple.supabase.co/x.png" && photoDe(null) === null && photoDe(undefined) === null && photoDe("") === null && photoDe(12) === null);
  }

  // ── 4. les lectures, sur un faux client ──────────────────────────────────
  titre("4. Les lectures");
  {
    const sb = faux({ planches: PLANCHES, tables: AMITIES });
    const admin = faux({ tables: TABLES });
    const r = (await lireEnDirect(contexte(sb.client, admin.client), { sansCache: true, moi: MOI }))!;
    check("carte complète : 47 en ligne, 6 duels, 3 copies", r.enLigne === 47 && r.duels === 6 && r.copiesHeure === 3, JSON.stringify({ e: r.enLigne, d: r.duels, c: r.copiesHeure }));
    check(
      "visages : toi d'abord, puis tes amis en ligne (Hugo, Sarah), puis les autres dans l'ordre de présence (Inès, Lucas, Zoé, Bob)",
      r.joueurs.map((j) => j.prenom).join(",") === "Toi,Hugo,Sarah,Inès,Lucas,Zoé,Bob",
      r.joueurs.map((j) => j.prenom).join(","),
    );
    check("toi : ton pseudo, ton drapeau « moi » ; tes amis marqués", r.joueurs[0].moi && r.joueurs[0].nom === "Theo" && r.joueurs[1].ami && r.joueurs[2].ami && !r.joueurs[3].ami);
    check("la photo de Lucas vient de profiles.avatar_url ; l'adresse dangereuse de Zoé est écartée ; les autres n'ont pas de photo", r.joueurs.find((j) => j.prenom === "Lucas")!.avatarUrl === PHOTO_LUCAS && r.joueurs.find((j) => j.prenom === "Zoé")!.avatarUrl === null && r.joueurs.find((j) => j.prenom === "Inès")!.avatarUrl === null);
    check("47 en ligne, 7 visages : « +40 » pour le reste", r.joueurs.length === 7 && r.plus === 40, `+${r.plus}`);
    check("fil : Inès, Lucas, Sarah, Hugo ; Marie (présence masquée) exclue", r.evenements.map((e) => e.initiales).join(",") === "IK,LM,ST,HB", r.evenements.map((e) => e.initiales).join(","));
    check("les classements demandés : les 30 et les 5 d'aujourd'hui, 200 lignes, pas la veille", sb.appels.length === 2 && sb.appels.every((a) => a.jour === JOUR && a.limite === 200) && sb.appels.map((a) => a.rpc).sort().join(",") === "cinq_leaderboard,daily_leaderboard", JSON.stringify(sb.appels));
    const presence = admin.journal.filter((q) => q.table === "user_presence");
    const enLigne = presence.find((q) => a_filtre(q, "eq", "visible", true))!;
    check("en ligne : un seul passage compte (count exact) et nomme, seulement ceux qui montrent leur présence", !!enLigne && !enLigne.head && a_filtre(enLigne, "eq", "visible", true) && presence.filter((q) => a_filtre(q, "eq", "visible", true)).length === 1);
    check("en ligne : les plus récents d'abord, 40 au plus", enLigne.filtres.some((f) => f[0] === "order" && f[1] === "last_seen_at" && (f[2] as { ascending?: boolean })?.ascending === false) && enLigne.filtres.some((f) => f[0] === "limit" && f[1] === JOUEURS_LUS));
    const seuil = (enLigne.filtres.find((f) => f[0] === "gt" && f[1] === "last_seen_at") ?? [])[2];
    check("en ligne : signal de moins de 2 min 30", seuil === new Date(t0 - 150_000).toISOString(), String(seuil));
    const profils = admin.journal.filter((q) => q.table === "profiles" && String(q.cols).includes("avatar_url"));
    check("visages : pseudo et photo lus d'un coup dans profiles (username, avatar_url), pour les joueurs en ligne seulement", profils.length === 1 && String(profils[0].cols) === "id, username, avatar_url" && EN_LIGNE_LUS.every((u) => idsDe(profils[0]).includes(u)) && idsDe(profils[0]).length === EN_LIGNE_LUS.length);
    const masques = presence.find((q) => a_filtre(q, "eq", "visible", false))!;
    check("présence masquée : on ne demande que les joueurs du fil", !!masques && a_filtre(masques, "eq", "visible", false) && masques.filtres.some((f) => f[0] === "in" && f[1] === "user_id" && Array.isArray(f[2]) && (f[2] as string[]).includes(MARIE)));
    const duels = admin.journal.filter((q) => q.table === "duels");
    const actifs = duels.find((q) => q.head)!;
    check("duels en cours : acceptés, pas expirés", !!actifs && a_filtre(actifs, "eq", "status", "active") && a_filtre(actifs, "gt", "expires_at", NOW.toISOString()));
    const gagnes = duels.find((q) => !q.head)!;
    check("duels gagnés : réglés, un gagnant, depuis moins d'une heure et dix minutes", !!gagnes && a_filtre(gagnes, "eq", "status", "finished") && gagnes.filtres.some((f) => f[0] === "gt" && f[1] === "finished_at"));
    check("le fil ne lit que le gagnant et l'instant (pas la matière, que la table n'a pas)", String(gagnes.cols) === "winner_id, finished_at");
    check("le client du joueur ne lit que ses amitiés (jamais duels ni user_presence ni profiles)", sb.journal.length === 1 && sb.journal[0].table === "friendships");
    const amitie = sb.journal[0];
    check("amis : amitiés acceptées dont il est l'un des deux", a_filtre(amitie, "eq", "status", "accepted") && amitie.filtres.some((f) => f[0] === "or" && String(f[1]).includes(`requester.eq.${THEO}`) && String(f[1]).includes(`addressee.eq.${THEO}`)));
  }
  {
    // sans les amis ni le profil du joueur : « Toi » quand même, personne ne passe devant
    const sb = faux({ planches: PLANCHES });
    const admin = faux({ tables: TABLES });
    const r = (await lireEnDirect(contexte(sb.client, admin.client), { sansCache: true }))!;
    check("sans amitiés lues ni profil : « Toi » en tête (nom « Toi »), les autres dans l'ordre de présence, aucun ami", r.joueurs[0].moi && r.joueurs[0].prenom === "Toi" && r.joueurs.map((j) => j.prenom).slice(1).join(",") === "Inès,Lucas,Hugo,Sarah,Zoé,Bob" && r.joueurs.every((j) => !j.ami));
    const casse = faux({ planches: PLANCHES, tables: { friendships: () => ({ data: null, error: { code: "42P01", message: "x" } }) } });
    const r2 = (await lireEnDirect(contexte(casse.client, admin.client), { sansCache: true, moi: MOI }))!;
    check("amitiés illisibles : la carte se rend quand même", r2.joueurs.length === 7 && r2.joueurs[0].moi);
  }
  {
    const sb = faux({ planches: PLANCHES });
    const r = (await lireEnDirect(contexte(sb.client, null), { sansCache: true, moi: MOI }))!;
    check("sans admin : enLigne et duels nuls (lignes masquées)", r.enLigne === null && r.duels === null);
    check("sans admin : tu es quand même là, seul dans la rangée (« Toi »), sans « +N »", r.joueurs.length === 1 && r.joueurs[0].moi && r.plus === 0);
    check("sans admin : les faits des classements seuls (Marie y est : aucune présence à vérifier)", r.evenements.map((e) => e.initiales).join(",") === "IK,ST,ML,HB" && r.copiesHeure === 3, r.evenements.map((e) => e.initiales).join(","));
    check("sans admin : on ne lit que les classements (aucune requête d'amitiés : pas de liste de joueurs à trier)", sb.journal.length === 0 && sb.appels.length === 2);
  }
  {
    // les tables de présence et de duels n'existent pas (erreur 42P01) : leurs lignes se masquent, le fil reste
    const sb = faux({ planches: PLANCHES });
    const absent = (): Rep => ({ data: null, count: null, error: { code: "42P01", message: 'relation "x" does not exist' } });
    const admin = faux({ tables: { user_presence: absent, duels: absent, profiles: absent } });
    const r = (await lireEnDirect(contexte(sb.client, admin.client), { sansCache: true }))!;
    check("tables absentes : enLigne et duels nuls, le fil des classements reste", r.enLigne === null && r.duels === null && r.evenements.length === 4, r.evenements.map((e) => e.initiales).join(","));
    check("tables absentes : pas de duel dans le fil", !r.evenements.some((e) => texteDe(e).includes("duel")));
  }
  {
    // la liste est vide et les compteurs à zéro
    const sb = faux({ planches: { [`daily_leaderboard|${JOUR}`]: planche(JOUR, []), [`cinq_leaderboard|${JOUR}`]: planche(JOUR, []) } });
    const admin = faux({ tables: { user_presence: () => ({ data: [], count: 0, error: null }), duels: () => ({ count: 0, data: [], error: null }) } });
    check("sans admin, liste vide et rien à compter → null (une carte de zéros ne donne pas envie de venir)", (await lireEnDirect(contexte(sb.client, null), { sansCache: true, moi: MOI })) === null);
    const vide = (await lireEnDirect(contexte(sb.client, admin.client), { sansCache: true, moi: MOI }))!;
    check("compteurs lus à zéro : tu regardes, donc la carte dit 1 joueur en ligne (toi), sans « +N » ni vide", !!vide && vide.enLigne === 1 && vide.duels === 0 && vide.joueurs.length === 1 && vide.joueurs[0].moi && vide.plus === 0 && vide.evenements.length === 0, JSON.stringify(vide));
    const seul = faux({ tables: { user_presence: (q) => (a_filtre(q, "eq", "visible", true) ? { data: [], count: 12, error: null } : { data: [], error: null }), duels: () => ({ count: 0, data: [], error: null }) } });
    const r = (await lireEnDirect(contexte(sb.client, seul.client), { sansCache: true }))!;
    check("des joueurs en ligne, aucun fait : la carte reste, sans fil", r.enLigne === 12 && r.evenements.length === 0 && r.copiesHeure === 0);
    // la liste lue est complète (3 sur 3) : le compte te rajoute quand tu n'y es pas, pas quand tu y es
    const trois = (extra: string[]) => faux({ tables: { user_presence: (q) => (a_filtre(q, "eq", "visible", true) ? { data: [INES, HUGO, ...extra].map((u) => ({ user_id: u })), count: 2 + extra.length, error: null } : { data: [], error: null }), duels: () => ({ count: 0, data: [], error: null }), profiles: (q) => ({ data: idsDe(q).filter((u) => PROFILS[u]).map((u) => ({ id: u, username: PROFILS[u][0], avatar_url: PROFILS[u][1] })), error: null }) } });
    const sans = (await lireEnDirect(contexte(sb.client, trois([]).client), { sansCache: true, moi: MOI }))!;
    check("2 joueurs lus, tu n'y es pas (présence masquée ou pas encore comptée) : 3 en ligne avec toi", sans.enLigne === 3 && sans.joueurs.length === 3 && sans.joueurs[0].moi && sans.plus === 0, `${sans.enLigne}`);
    const dedans = (await lireEnDirect(contexte(sb.client, trois([THEO]).client), { sansCache: true, moi: MOI }))!;
    check("tu es dans la liste lue : 3 en ligne (pas 4), un seul visage pour toi, en tête", dedans.enLigne === 3 && dedans.joueurs.length === 3 && dedans.joueurs[0].moi && dedans.joueurs.filter((j) => j.id === THEO).length === 1, `${dedans.enLigne}`);
  }
  {
    // rien ne répond : pas de carte, pas d'exception
    const sb = faux({ planches: {} });
    check("rien ne répond (RPC absentes, pas d'admin) → null", (await lireEnDirect(contexte(sb.client, null), { sansCache: true })) === null);
    const casse = { rpc: () => Promise.reject(new Error("réseau")), from: () => { throw new Error("réseau"); } } as unknown as SupabaseClient;
    check("tout lève → null, sans exception", (await lireEnDirect(contexte(casse, casse), { sansCache: true })) === null);
  }
  {
    // la lecture du classement des 30 déjà faite par la page n'est pas refaite
    const sb = faux({ planches: PLANCHES });
    const lu = { day: JOUR, exists: true, players: 1, playing: 0, rows: [{ rank: 1, userId: HUGO, username: "Hugo B.", avatarUrl: null, score: 25, total: 30, seconds: 600, finishedAt: il_y_a(4), isMe: false }], me: null };
    const brut2 = (await lireBrutDirect({ sb: sb.client, admin: null, jour: JOUR, now: NOW }, { sansCache: true, classements: { trente: lu } }))!;
    check("classement des 30 passé : on ne le relit pas (seuls les 5 sont lus)", sb.appels.length === 1 && sb.appels[0].rpc === "cinq_leaderboard");
    check("classement des 30 passé : ses copies sont celles de la page", brut2.copies.filter((c) => c.format === "trente").length === 1 && brut2.copies.some((c) => c.userId === HUGO && c.score === 25));
  }
  {
    // la première heure d'un jour : les copies de la veille au soir comptent encore
    const minuit = new Date("2026-10-31T23:30:00Z"); // 00 h 30 à Paris, le 1er novembre
    const veille = "2026-10-31";
    const sb = faux({
      planches: {
        [`daily_leaderboard|${JOUR}`]: planche(JOUR, [ligne(1, INES, "Inès K.", 27, 30, il_y_a(10, 0, minuit))]),
        [`daily_leaderboard|${veille}`]: planche(veille, [ligne(1, MARIE, "Marie L.", 29, 30, il_y_a(40, 0, minuit)), ligne(2, HUGO, "Hugo B.", 20, 30, il_y_a(90, 0, minuit))]),
      },
    });
    const r = (await lireEnDirect(contexte(sb.client, null, THEO, minuit, JOUR), { sansCache: true }))!;
    check("00 h 30 : la veille est lue aussi", sb.appels.some((a) => a.jour === veille && a.rpc === "daily_leaderboard"), JSON.stringify(sb.appels.map((a) => a.rpc + "|" + a.jour)));
    check("00 h 30 : la copie de 23 h 50 compte (2 copies), celle de 22 h 30 non", r.copiesHeure === 2, String(r.copiesHeure));
    const apres = faux({ planches: PLANCHES });
    await lireEnDirect(contexte(apres.client, null), { sansCache: true });
    check("15 h : la veille n'est pas lue", apres.appels.every((a) => a.jour === JOUR));
  }
  {
    // les faits de toi, par la lecture entière
    const sb = faux({ planches: PLANCHES });
    const r = (await lireEnDirect(contexte(sb.client, null, INES), { sansCache: true, moi: { nom: "Inès K.", avatarUrl: null } }))!;
    check("lu pour Inès : son fait se dit « Tu viens de rendre ta copie »", texteDe(r.evenements[0]).startsWith("Tu viens de rendre ta copie : 28/30"));
  }

  // ── 5. le personnage du vainqueur ────────────────────────────────────────
  titre("5. Le personnage du vainqueur");
  const ADRESSE = `https://exemple.supabase.co/storage/v1/object/public/profil-medias/${id(2)}/perso-1700000000000.png`;
  check("sans style → null", persoDe(null) === null && persoDe(undefined) === null && persoDe({}) === null);
  const ancien = persoDe({ perso: ADRESSE, persoTaille: 100, persoPos: 50 })!;
  check("ancien personnage : adresse, taille 100, position 50", ancien.src === ADRESSE && ancien.taille === 100 && ancien.pos === 50, JSON.stringify(ancien));
  check("taille bornée à la carte (160 → 115, 50 → 70)", persoDe({ perso: ADRESSE, persoTaille: 160 })!.taille === 115 && persoDe({ perso: ADRESSE, persoTaille: 50 })!.taille === 70);
  check("position bornée à la carte (0 → 35, 100 → 65)", persoDe({ perso: ADRESSE, persoPos: 0 })!.pos === 35 && persoDe({ perso: ADRESSE, persoPos: 100 })!.pos === 65);
  check("taille et position absentes → 100 et 50", (() => { const p = persoDe({ perso: ADRESSE })!; return p.taille === 100 && p.pos === 50; })());
  check("adresse dangereuse → null (javascript:, //, data:)", persoDe({ perso: "javascript:alert(1)" }) === null && persoDe({ perso: "//evil.example/x.png" }) === null && persoDe({ perso: "data:image/png;base64,AAAA" }) === null);
  check("adresse du site acceptée", persoDe({ perso: "/illustrations/x.webp" })?.src === "/illustrations/x.webp");
  const compo = compositionDefaut();
  const avec = { ...compo, perso: bornerCalque({ image: ADRESSE, x: -5, y: 38, l: 110, h: null, r: 0.75 }) };
  const pc = persoDe({ banniere: avec, perso: null })!;
  check("bannière composée : l'image du calque « perso »", pc.src === ADRESSE, JSON.stringify(pc));
  check("bannière composée : taille et position dans les bornes de la carte", pc.taille >= 70 && pc.taille <= 115 && pc.pos >= 35 && pc.pos <= 65, JSON.stringify(pc));
  check("la composition prime sur l'ancien personnage", persoDe({ banniere: avec, perso: "/illustrations/autre.webp" })!.src === ADRESSE);
  check("composition sans image de personnage : on retombe sur l'ancien", persoDe({ banniere: compo, perso: ADRESSE })!.src === ADRESSE);
  check("composition sans image, pas d'ancien → null", persoDe({ banniere: compo, perso: null }) === null);

  {
    // lu en base (profile_style, lisible de tous les joueurs connectés)
    const ligneStyle = { user_id: MARIE, banner_url: null, titre: null, perso_url: ADRESSE, perso_taille: 120, perso_pos: 40, ornement: null, banniere: null };
    const sb = faux({ tables: { profile_style: () => ({ data: [ligneStyle], error: null }) } });
    const p = await lirePersoVainqueur(contexte(sb.client, null), MARIE);
    check("lu en base : perso_url, taille 120 → 115, position 40", !!p && p.src === ADRESSE && p.taille === 115 && p.pos === 40, JSON.stringify(p));
    const sans = faux({ tables: { profile_style: () => ({ data: [{ user_id: MARIE, banner_url: "https://exemple.supabase.co/x.png", titre: null, perso_url: null, perso_taille: 100, perso_pos: 50, ornement: null, banniere: null }], error: null }) } });
    check("pas de personnage → null", (await lirePersoVainqueur(contexte(sans.client, null), MARIE)) === null);
    const aucune = faux({ tables: { profile_style: () => ({ data: [], error: null }) } });
    check("le vainqueur n'a aucune ligne de style → null", (await lirePersoVainqueur(contexte(aucune.client, null), MARIE)) === null);
    // migration_bannieres_perso.sql pas collée : la colonne manque, la lecture se refait sans elle
    let essais = 0;
    const ancienne = faux({
      tables: {
        profile_style: (q) => {
          essais++;
          if (String(q.cols).includes("perso_url")) return { data: null, error: { code: "42703", message: "column profile_style.perso_url does not exist" } };
          return { data: [{ user_id: MARIE, banner_url: "https://exemple.supabase.co/x.png", titre: null }], error: null };
        },
      },
    });
    check("migration du personnage absente → null, sans exception", (await lirePersoVainqueur(contexte(ancienne.client, null), MARIE)) === null && essais >= 2, `(essais ${essais})`);
    const casse = { from: () => { throw new Error("réseau"); } } as unknown as SupabaseClient;
    check("lecture qui lève → null", (await lirePersoVainqueur(contexte(casse, null), MARIE)) === null);
  }

  // ── 6. le rendu ──────────────────────────────────────────────────────────
  titre("6. Le rendu");
  {
    const sb = faux({ planches: PLANCHES, tables: AMITIES });
    const admin = faux({ tables: TABLES });
    const plein = (await lireEnDirect(contexte(sb.client, admin.client), { sansCache: true, moi: MOI }))!;
    const html = renderToStaticMarkup(<EnDirect d={plein} className="place" />);
    check("une carte (section) nommée par son titre", compte(html, /<section /g) === 1 && html.includes('aria-labelledby="lobby-direct-titre"') && html.includes('id="lobby-direct-titre"'));
    check("le titre est un h2 (le h1 de la page est le salut)", compte(html, /<h2 /g) === 1 && !html.includes("<h1"));
    check("le titre dit « En ce moment dans le lobby »", html.includes("En ce moment dans le lobby"));
    check("la classe de placement est posée", html.includes("place"));
    check("3 chiffres : 47, 6, 3", html.includes('<b class="mono">47</b>') && html.includes('<b class="mono">6</b>') && html.includes('<b class="mono">3</b>'));
    check("les libellés des chiffres", html.includes("joueurs en ligne") && html.includes("duels en cours") && html.includes("copies des 30 rendues dans l&#x27;heure"));
    check("4 faits dans le fil, de libellé « Ce qui vient de se passer »", compte(html, /class="fait"/g) === 4 && html.includes('aria-label="Ce qui vient de se passer"'));
    check("deux colonnes (chiffres et fil)", html.includes('data-colonnes="2"'));
    check("le score est en chiffres à chasse fixe", html.includes('<b class="mono">28/30</b>'));
    check("initiales décoratives (aria-hidden), visages du socle, pleins pour les 30 et le duel, clairs pour les 5", html.includes('class="av avN avP" aria-hidden="true">IK') && html.includes('class="av avP" aria-hidden="true">ST'));
    check("le cadre, le HUD et le point vert viennent du socle", html.includes('class="carte hud carte place"') && html.includes('class="live" aria-hidden="true"'));
    check("l'instant de chaque fait", html.includes("à l&#x27;instant") && html.includes("il y a 2 min"));
    check("le point vert est décoratif", html.includes('class="live" aria-hidden="true"'));
    check("aucun lien ni bouton : une carte à lire", !html.includes("<a ") && !html.includes("<button"));
    check("aucun liquide, aucune encre", !html.includes("rl-encre") && !html.includes("data-palette"));

    // la rangée des joueurs en ligne
    check("la rangée des joueurs en ligne est une liste nommée, dans la même grille que les chiffres et le fil", html.includes('<ul class="joueurs" aria-label="Les joueurs en ligne">') && compte(html, /<li class="joueur( moi)?"/g) === 7);
    check("toi en premier, en gras (« moi »), nommé « Toi », initiales sur rond plein, à 40 px", html.includes('<li class="joueur moi" title="Toi"><span class="av avN" style="width:40px;height:40px;font-size:14px" aria-hidden="true">T</span><span class="pseudo">Toi</span></li>') && html.indexOf("joueur moi") < html.indexOf('title="Hugo B."'));
    check("tes amis juste après (Hugo puis Sarah), lus « ami » aux lecteurs d'écran", html.indexOf('title="Hugo B."') < html.indexOf('title="Sarah T."') && html.indexOf('title="Sarah T."') < html.indexOf('title="Inès K."') && compte(html, />, ami</g) === 2);
    check("sans photo : les initiales dans le rond du socle (Inès : IK)", html.includes('<span class="av" style="width:40px;height:40px;font-size:14px" aria-hidden="true">IK</span>'));
    check("avec photo : l'image du site (Avatar), décorative, à la taille du rond ; plus d'initiales pour Lucas", compte(html, /<img /g) === 1 && html.includes(`<img src="${PHOTO_LUCAS}"`) && html.includes('alt=""') && html.includes('width="40" height="40"') && html.includes('class="av avPhoto"') && !html.includes('font-size:14px" aria-hidden="true">LM'));
    check("l'adresse dangereuse de Zoé n'est jamais une image (ses initiales)", !html.includes("javascript:") && html.includes('font-size:14px" aria-hidden="true">Z</span>'));
    check("« +40 » pour le reste, lu « et 40 autres joueurs en ligne »", html.includes('<li class="autres"><b class="mono" aria-hidden="true">+40</b><span class="sr-only">et 40 autres joueurs en ligne</span></li>'));
    check("le pseudo complet en infobulle (title)", html.includes('title="Lucas M."') && html.includes('title="Bob"'));

    const sansFil: EnDirectLobby = { ...plein, evenements: [] };
    const h1 = renderToStaticMarkup(<EnDirect d={sansFil} />);
    check("sans fait : une colonne, les chiffres seuls, les visages dessous", h1.includes('data-colonnes="1"') && !h1.includes('class="fil"') && compte(h1, /class="fait"/g) === 0 && h1.includes("<span>joueurs en ligne</span>") && h1.includes('class="joueurs"'));
    const sansAdmin: EnDirectLobby = { ...plein, enLigne: null, duels: null, copiesHeure: 3, joueurs: plein.joueurs.slice(0, 1), plus: 0 };
    const h2 = renderToStaticMarkup(<EnDirect d={sansAdmin} />);
    check("sans admin : plus de joueurs en ligne ni de duels, les copies restent, et toi (« Toi ») seul dans la rangée", !h2.includes("<span>joueurs en ligne</span>") && !h2.includes("<span>joueur en ligne</span>") && !h2.includes("duels en cours") && h2.includes("copies des 30 rendues") && compte(h2, /<li class="joueur( moi)?"/g) === 1 && h2.includes('<li class="joueur moi"') && !h2.includes('class="autres"'));
    const seulFil: EnDirectLobby = { ...plein, enLigne: null, duels: null, copiesHeure: 0, plus: 0 };
    const h3 = renderToStaticMarkup(<EnDirect d={seulFil} />);
    check("sans chiffre : le fil prend toute la carte", h3.includes('data-colonnes="1"') && !h3.includes('class="chiffres"') && compte(h3, /class="fait"/g) === 4);
    const seulMoi: EnDirectLobby = { enLigne: 1, duels: 0, copiesHeure: 0, evenements: [], joueurs: plein.joueurs.slice(0, 1), plus: 0 };
    const h5 = renderToStaticMarkup(<EnDirect d={seulMoi} />);
    check("ni fait ni autre joueur : les chiffres en rangée et toi dessous, pas de fil vide ni de « +N »", h5.includes('data-colonnes="1"') && h5.includes('<b class="mono">1</b>') && h5.includes("joueur en ligne") && compte(h5, /<li class="joueur( moi)?"/g) === 1 && !h5.includes('class="fil"') && !h5.includes('class="autres"'));
    const echappe: EnDirectLobby = {
      enLigne: 2,
      duels: 0,
      copiesHeure: 0,
      evenements: [{ cle: "x", initiales: "AB", sombre: true, texte: ["<script>alert(1)</script> ", { b: "28/30" }], quand: "à l'instant" }],
      joueurs: [
        plein.joueurs[0],
        { id: "x", nom: "<script>alert(2)</script>", prenom: "<script>alert(2)</script>", initiales: "<S", avatarUrl: null, moi: false, ami: false },
      ],
      plus: 0,
    };
    const h4 = renderToStaticMarkup(<EnDirect d={echappe} />);
    check("un pseudo malicieux est échappé (fil, visage, infobulle)", !h4.includes("<script>") && h4.includes("&lt;script&gt;alert(1)") && h4.includes("&lt;script&gt;alert(2)"));

    const perso = renderToStaticMarkup(<PersoVainqueur perso={{ src: ADRESSE, taille: 115, pos: 40 }} />);
    check("perso : une image décorative (alt vide), chargée à la demande, sans glisser", perso.includes('alt=""') && perso.includes('loading="lazy"') && perso.includes('decoding="async"') && perso.includes('draggable="false"'));
    check("perso : l'adresse telle quelle", perso.includes(`src="${ADRESSE}"`));
    check("perso : cadrage de la bannière verticale (échelle 1.15, décalage −5 %)", perso.includes("--echelle:1.15") && perso.includes("--decalage:-5.0%"), perso.slice(0, 260));
    check("perso : la classe du lot", perso.includes('class="perso"'));
    const persoClasse = renderToStaticMarkup(<PersoVainqueur perso={{ src: "/x.png", taille: 100, pos: 50 }} className="autre" />);
    check("perso : classe de placement ajoutée", persoClasse.includes('class="perso autre"') && persoClasse.includes("--decalage:0.0%"));
  }

  // ── 7. les fichiers du lot ───────────────────────────────────────────────
  titre("7. Les fichiers du lot");
  const racine = process.cwd();
  const fichiers = [
    "components/accueil/lobby/EnDirect.tsx",
    "components/accueil/lobby/EnDirect.module.css",
    "components/accueil/lobby/Visage.tsx",
    "components/accueil/lobby/PersoVainqueur.tsx",
    "components/accueil/lobby/modele-direct.ts",
    "components/accueil/lobby/lecture-direct.ts",
    "lib/voice-accueil-lobby-direct.ts",
    "scripts/accueil/test-lobby-direct.tsx",
  ];
  const interdit = ["Te" + "mp" + ANTISLASH, "Local" + ANTISLASH, "scratch" + "pad", "App" + "Data", "C:" + ANTISLASH];
  for (const f of fichiers) {
    const src = fs.readFileSync(path.join(racine, f), "utf8");
    check(`${f} : pas d'antislash ni de chemin local`, !src.includes(ANTISLASH) && !/(^|[^A-Za-z])Temp[/]/.test(src) && !interdit.some((m) => m !== ANTISLASH && src.includes(m)));
    if (f.endsWith(".tsx") && !f.startsWith("scripts")) {
      check(`${f} : pas d'îlot client, ni Intl ni toLocaleString`, !src.includes('"use client"') && !src.includes("Int" + "l.") && !src.includes("toLocale" + "String"));
    }
  }
  const css = fs.readFileSync(path.join(racine, "components/accueil/lobby/EnDirect.module.css"), "utf8");
  check("CSS : aucune image du dossier de la maquette, aucune texture ni animation", !css.includes("_blob") && !css.includes("@keyframes") && !css.includes("animation") && !css.includes("url("));
  check("CSS : pas de liquide (aplats seulement)", !css.includes("rl-encre") && !css.includes("EncreVive"));
  const lecture = fs.readFileSync(path.join(racine, "components/accueil/lobby/lecture-direct.ts"), "utf8");
  const iCache = lecture.indexOf("unstable_cache(() =>");
  check("lecture : le client du joueur n'entre jamais dans un cache partagé (seule la partie admin est gardée)", iCache >= 0 && !lecture.slice(iCache, iCache + 70).includes("sb") && lecture.slice(iCache, iCache + 70).includes("lirePartieAdmin(admin, now)"));

  console.log("");
  console.log(ko === 0 ? "TOUT EST VERT" : `${ko} VÉRIFICATION(S) EN ÉCHEC`);
  process.exit(ko === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
