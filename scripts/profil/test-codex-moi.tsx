// Tests légers du Codex vu de Moi (Codex simplifié, ajustement C, lot B3) :
// lib/profil/codex-moi.ts et components/moi/CodexMoi.tsx, sans base ni
// réseau (faux client), rendu statique par react-dom/server.
//   npx tsx --tsconfig tsconfig.json scripts/profil/test-codex-moi.tsx
// Vérifie : le compte (quêtes faites sans les actes ni les miroirs, XP
// versée seulement, ce qui attend « Récupérer » avec et sans le mode sobre) ;
// l'historique (du plus récent au plus ancien, par jour de Paris, les
// rétroactives à part, plafond et « et N plus anciennes ») ; les titres en
// clair (quête, acte, contrats) ; la lecture (une requête légère, repli
// silencieux sans la table, en dernier) ; la tuile (cible de Léonard, lien vers le Codex,
// « à récupérer », pas de bouton « Récupérer ») et le bloc (résumé,
// historique replié, absent sans historique) ; leur place dans Moi.
import "./sans-css";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CODEX_MOI_VIDE, HISTORIQUE_MAX, codexMoiDe, lireCodexMoi, titreLigne, type LigneCodexMoi } from "@/lib/profil/codex-moi";
import { BlocCodex, TuileCodex, resumeCodex } from "@/components/moi/CodexMoi";
import { catalogueCodex } from "@/lib/codex/catalogue";

// tsx compile le JSX à l'ancienne (React.createElement) : React global pour les composants rendus
(globalThis as { React?: typeof React }).React = React;

let echecs = 0;
const check = (label: string, cond: boolean, extra = "") => {
  if (!cond) echecs++;
  console.log(`${cond ? "  ok" : "ÉCHEC"}  ${label}${!cond && extra ? ` — ${extra}` : ""}`);
};
const RACINE = path.resolve(__dirname, "../..");
const nbsp = (s: string) => s.replace(/ /g, " ");

const ligne = (quete_id: string, l: Partial<LigneCodexMoi> = {}): LigneCodexMoi => ({
  quete_id,
  periode: "",
  etat: "recompensee",
  xp: 20,
  cosmetique: null,
  titre: null,
  vu: true,
  retro: false,
  terminee_le: "2026-10-15T10:00:00Z",
  recompensee_le: "2026-10-15T10:00:00Z",
  ...l,
});
const miroir = catalogueCodex().find((q) => q.miroir)?.id;

console.log("# Le compte");
{
  const lignes = [
    ligne("trame:prologue:dix", { xp: 30 }),
    ligne("trame:prologue:jour-j", { etat: "terminee", xp: 40, vu: false }), // à verser
    ligne("trame:a1:cinq", { vu: false, xp: 25, recompensee_le: "2026-10-18T10:00:00Z" }), // déjà versée (depuis DEBUT_RECUPERER), pas vue : le repli de « Récupérer »
    ligne("trame:a1:duel", { vu: false, retro: true, xp: 10 }), // rétroactive : jamais à récupérer
    ligne("trame:a1:cours", { vu: false, xp: 0 }), // ne rapporte rien
    ligne("exploit:sceau:assiduite:1", { vu: false, xp: 15 }), // les sceaux ont leur cérémonie
    ligne("acte:prologue", { xp: 50 }),
    ...(miroir ? [ligne(miroir, { xp: 0, vu: false, cosmetique: "x" })] : []),
  ];
  const c = codexMoiDe(lignes, { sobre: false });
  check("(le catalogue a au moins un miroir)", !!miroir);
  check("les quêtes faites : à récupérer comprises, sans les actes ni les miroirs", c.faites === 6, String(c.faites));
  check("l'XP gagnée : seulement ce qui est versé (pas la ligne « terminee »), les actes compris", c.xp === 30 + 25 + 10 + 0 + 15 + 50, String(c.xp));
  check("à récupérer : la ligne à verser et la versée pas vue qui rapporte (ni rétro, ni sans récompense, ni sceau, ni miroir)", c.aRecuperer === 2, String(c.aRecuperer));
  check("mode sobre (versées d'office) : seulement ce qui reste à verser", codexMoiDe(lignes, { sobre: true }).aRecuperer === 1);
  check("aucune ligne : rien de fait, disponible", JSON.stringify(codexMoiDe([], { sobre: false })) === JSON.stringify({ ...CODEX_MOI_VIDE, disponible: true }));
}

console.log("# L'historique");
{
  const lignes = [
    ligne("trame:prologue:dix", { terminee_le: "2026-10-14T08:00:00Z" }),
    ligne("trame:a1:cinq", { terminee_le: "2026-10-16T23:30:00Z" }), // le 17 à Paris
    ligne("trame:a1:duel", { terminee_le: "2026-10-17T06:00:00Z", etat: "terminee" }),
    ligne("trame:a1:cours", { retro: true, terminee_le: "2026-10-17T07:00:00Z" }),
    ligne("trame:prologue:visite", { terminee_le: "2026-10-16T09:00:00Z" }),
  ];
  const c = codexMoiDe(lignes, { sobre: false, titre: (id) => id });
  const jours = c.historique.map((j) => `${j.jour}:${j.quetes.map((q) => q.titre).join("+")}`);
  check(
    "par jour de Paris, du plus récent au plus ancien, les rétroactives à part en dernier",
    jours.join(" | ") === "2026-10-17:trame:a1:duel+trame:a1:cinq | 2026-10-16:trame:prologue:visite | 2026-10-14:trame:prologue:dix | null:trame:a1:cours",
    jours.join(" | "),
  );
  const beaucoup = Array.from({ length: HISTORIQUE_MAX + 7 }, (_, i) => ligne(`contrat:ratures:2026-09-${String((i % 28) + 1).padStart(2, "0")}`, { periode: String(i), terminee_le: new Date(Date.UTC(2026, 8, 1) + i * 3_600_000).toISOString() }));
  const b = codexMoiDe(beaucoup, { sobre: false });
  check(`au plus ${HISTORIQUE_MAX} quêtes listées, le reste compté`, b.historique.reduce((n, j) => n + j.quetes.length, 0) === HISTORIQUE_MAX && b.plusAnciennes === 7 && b.faites === HISTORIQUE_MAX + 7);
  check("chaque quête a une clé unique (quête et période)", new Set(b.historique.flatMap((j) => j.quetes.map((q) => q.cle))).size === HISTORIQUE_MAX);
}

console.log("# Les titres en clair");
{
  check("une quête : son titre clair", titreLigne("trame:prologue:dix") === "Répondre à 10 questions", titreLigne("trame:prologue:dix"));
  check("un acte : « Acte II · Les 10 matières »", titreLigne("acte:acte2") === "Acte II · Les 10 matières", titreLigne("acte:acte2"));
  check("un contrat du jour sans paramètre : son titre clair", titreLigne("contrat:ratures:2026-10-15") === "Corriger 5 ratures");
  check("un contrat dont la matière n'est plus connue : « Quête du jour »", titreLigne("contrat:matiere-faible:2026-10-15") === "Quête du jour");
  check("le bonus des 3 quêtes du jour et la quête de la semaine", titreLigne("contrat:trio:2026-10-15") === "Les 3 quêtes du jour" && titreLigne("contrat:hebdo:inconnu") === "Quête de la semaine");
  check("une quête de la semaine connue : son titre clair", titreLigne("contrat:hebdo:pigments") === "Répondre juste dans 6 matières");
  check("inconnue : « Une quête du Codex »", titreLigne("zzz:inconnue") === "Une quête du Codex");
}

console.log("# La tuile et le bloc");
{
  const plein = { disponible: true, faites: 37, xp: 2140, aRecuperer: 2, historique: [{ jour: "2026-10-17", quetes: [{ cle: "a|", titre: "Corriger 5 ratures", xp: 20 }] }, { jour: null, quetes: [{ cle: "b|", titre: "Répondre à 10 questions", xp: 0 }] }], plusAnciennes: 3 };
  check("le résumé : « 37 quêtes faites · 2 140 XP gagnés dans le Codex »", nbsp(resumeCodex(plein)) === "37 quêtes faites · 2 140 XP gagnés dans le Codex", resumeCodex(plein));
  const tuile = nbsp(renderToStaticMarkup(<TuileCodex c={plein} />));
  check("la tuile : cible de Léonard, titre « Codex », lien vers le Codex", tuile.includes('data-leonard="moi-codex"') && tuile.includes(">Codex<") && tuile.includes('href="/codex"') && tuile.includes("Ouvrir le Codex"));
  check("la tuile dit où en est le joueur : à récupérer, quêtes faites, XP", tuile.includes("2 quêtes à récupérer") && tuile.includes("37 quêtes faites · 2 140 XP gagnés dans le Codex") && tuile.includes('href="#codex-historique"'));
  check("le chiffre nu de la tuile (« 37 ») est caché aux lecteurs d'écran : la ligne le dit déjà", /<span class="t-micro font-mono font-semibold" aria-hidden="true">37<\/span>/.test(tuile));
  check("la tuile n'a pas de bouton « Récupérer » (il vit dans le Codex et le panneau)", !tuile.includes("<button") && !tuile.includes("Tout récupérer"));
  const neuve = renderToStaticMarkup(<TuileCodex c={CODEX_MOI_VIDE} />);
  check("sans rien de fait (ou sans la table) : la phrase d'accueil et le lien, ni compte ni historique", neuve.includes("Des quêtes pour guider tes révisions") && neuve.includes('href="/codex"') && !neuve.includes("#codex") && !neuve.includes("à récupérer"));
  const bloc = nbsp(renderToStaticMarkup(<BlocCodex c={plein} now={Date.parse("2026-10-17T12:00:00Z")} />));
  // le résumé et le lien « Ouvrir le Codex » sont sur la tuile, en haut de Moi : le bloc ne les répète pas
  check("le bloc : son ancre et un titre pour les lecteurs d'écran, sans répéter le résumé ni le lien de la tuile", bloc.includes('id="codex"') && bloc.includes('class="sr-only"') && !bloc.includes("37 quêtes faites · 2 140 XP gagnés dans le Codex") && !bloc.includes('href="/codex"'));
  check("l'historique est replié", bloc.includes("<details") && !/<details[^>]*\sopen/.test(bloc) && bloc.includes("Historique"));
  check("le repli porte l'ancre du lien « Historique » de la tuile, et s'ouvre à l'arrivée (OuvrirSurAncre)", bloc.includes('<details id="codex-historique"') && fs.readFileSync(path.join(RACINE, "components/moi/CodexMoi.tsx"), "utf8").includes("<OuvrirSurAncre id={ANCRE_HISTORIQUE} />"));
  check("le résumé est une phrase en police courante, pas en t-num (réservé à un seul grand chiffre)", !/class="[^"]*t-num[^"]*">37 quêtes faites/.test(bloc));
  check("les jours : « Aujourd'hui », puis les quêtes comptées à l'arrivée ; l'XP de chaque quête", bloc.includes("Aujourd&#x27;hui") && bloc.includes("Comptées à ton arrivée") && bloc.includes("+20 XP") && bloc.includes("Corriger 5 ratures"));
  check("au-delà du plafond : « et 3 plus anciennes »", bloc.includes("et 3 plus anciennes"));
  const hier = renderToStaticMarkup(<BlocCodex c={{ ...plein, historique: [{ jour: "2026-10-16", quetes: plein.historique[0].quetes }, { jour: "2026-10-14", quetes: plein.historique[1].quetes }] }} now={Date.parse("2026-10-17T12:00:00Z")} />);
  check("« Hier », puis la date courte", hier.includes("Hier") && hier.includes("Mer. 14 oct."), hier.match(/t-eyebrow m-0">[^<]*/g)?.join(" ; ") ?? "");
  check("pas d'historique : pas de bloc", renderToStaticMarkup(<BlocCodex c={{ ...plein, historique: [] }} />) === "" && renderToStaticMarkup(<BlocCodex c={CODEX_MOI_VIDE} />) === "");
}

console.log("# Leur place dans Moi");
{
  const cabinet = fs.readFileSync(path.join(RACINE, "components/moi/Cabinet.tsx"), "utf8");
  const page = fs.readFileSync(path.join(RACINE, "app/moi/page.tsx"), "utf8");
  check("la tuile Codex vient en tête des tuiles de Moi", cabinet.includes("<TuileCodex") && cabinet.indexOf("<TuileCodex") < cabinet.indexOf("CAB.tuileObjectif") && cabinet.indexOf("<TuileCodex") < cabinet.indexOf("CAB.tuileMarquees"));
  check("sur téléphone, la carte du cabinet passe après les tuiles (la tuile Codex reste haut) ; à sa place sur ordinateur", /<CarteCabinet[^>]*className="order-last lg:order-none /.test(cabinet));
  check("sur téléphone, la tuile Codex passe avant le héros (tuiles en display: contents, la tuile en order-first)", cabinet.includes('className={"contents md:grid ') && /<TuileCodex[^>]*className="order-first md:order-none /.test(cabinet));
  check("la tuile n'est posée que si le Codex est lisible (pas de lien vers un Codex fermé)", cabinet.includes("{d.codex?.disponible && <TuileCodex"));
  check("le bloc Codex suit la Salle des trophées", cabinet.indexOf("<BlocCodex") > cabinet.indexOf("<SalleDesTrophees"));
  check("Moi lit le Codex sur Stats seulement, sans le moteur", page.includes('tab === "stats" ? lireCodexMoi(') && !page.includes("lireCodex(") && !page.includes("lib/codex/serveur"));
}

/** La lecture (asynchrone) : en dernier. */
async function lecture() {
  console.log("# La lecture");
  const appels: string[] = [];
  const client = (r: { data?: unknown; error?: unknown } | "leve") =>
    ({
      from(table: string) {
        appels.push(`from:${table}`);
        const b = {
          select: (c: string) => (appels.push(`select:${c}`), b),
          eq: (c: string, v: string) => (appels.push(`eq:${c}=${v}`), b),
          in: (c: string, v: string[]) => (appels.push(`in:${c}=${v.join(",")}`), b),
          order: () => b,
          limit: () => b,
          then: (ok: (x: unknown) => unknown, ko: (e: unknown) => unknown) => (r === "leve" ? Promise.reject(new Error("réseau")) : Promise.resolve({ data: r.data ?? null, error: r.error ?? null })).then(ok, ko),
        };
        return b;
      },
    }) as unknown as SupabaseClient;
  const lu = await lireCodexMoi(client({ data: [ligne("trame:prologue:dix")] }), "u1", { sobre: false });
  check("une seule requête légère sur codex_progression, filtrée sur le joueur et les quêtes faites", lu.disponible && lu.faites === 1 && appels.filter((a) => a.startsWith("from:")).join() === "from:codex_progression" && appels.includes("eq:user_id=u1") && appels.includes("in:etat=terminee,recompensee"));
  const absente = await lireCodexMoi(client({ error: { code: "42P01", message: 'relation "codex_progression" does not exist' } }), "u1", { sobre: false });
  check("sans la table : le repli, sans erreur", JSON.stringify(absente) === JSON.stringify(CODEX_MOI_VIDE));
  const leve = await lireCodexMoi(client("leve"), "u1", { sobre: false });
  check("une exception : le repli, sans erreur", JSON.stringify(leve) === JSON.stringify(CODEX_MOI_VIDE));
}

lecture().then(
  () => {
    console.log(echecs ? `\n${echecs} échec(s).` : "\nTout est bon.");
    process.exit(echecs ? 1 : 0);
  },
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
