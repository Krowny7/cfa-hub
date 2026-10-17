// Tests de rendu de la barre du haut et de la navigation (Codex simplifié,
// react-dom/server, sans base, réseau ni navigateur) :
//   npx tsx --tsconfig tsconfig.json scripts/codex/test-barre.tsx
// Le sceau et son panneau « Aujourd'hui » (la pastille « à récupérer », la
// ligne de niveau, À récupérer, La suite, Fait aujourd'hui, le jour J), les
// quatre onglets du haut (sans le Codex) et les cinq du bas (Accueil rendu).
import "./sans-css";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { SceauQuetes } from "@/components/codex/SceauQuetes";
import { DevoileProvider } from "@/components/nav/DevoileContext";
import { SpaceNav } from "@/components/nav/SpaceNav";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { panneauDe, type Panneau } from "@/lib/codex/panneau";
import { exempleCodex } from "./exemple";

// le JSX des composants (tsconfig « preserve ») attend React en portée
(globalThis as { React?: typeof React }).React = React;

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const compte = (html: string, re: RegExp) => (html.match(re) ?? []).length;
/** Le lien allumé (aria-current) d'une barre : son href. */
const allume = (html: string) => (html.match(/<a [^>]*aria-current="page"[^>]*>/)?.[0].match(/href="([^"]+)"/) ?? [])[1];
const routeur = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {} };
const rendre = (el: React.ReactElement): string => {
  try {
    const html = renderToStaticMarkup(
      <AppRouterContext.Provider value={routeur}>
        <DevoileProvider initial={{ devoile: "tout", codex: true }}>{el}</DevoileProvider>
      </AppRouterContext.Provider>,
    );
    return html.replace(/&#x27;/g, "'");
  } catch (e) {
    console.log(e);
    return "";
  }
};

const base = panneauDe(exempleCodex("milieu"));
const seance = { lancee: false, faits: 1, total: 3, suivant: { titre: "Corriger 14 ratures", href: "/revoir", duree: 10, xp: 10 } };
const fait = { n: 1, xp: 10, quetes: [{ quete: "contrat:x", periode: base.jour, titre: "Réviser 30 flashcards", xp: 10 }] };
const items = base.recuperer.items.map((x, i) => ({ ...x, aVerser: true, xp: [10, 150, 100][i] ?? 20 }));
const panneau = (p: Partial<Panneau>): Panneau => ({ ...base, versees: null, seance, fait, revoir: { aujourdhui: 14, demain: 20 }, ...p });
const sceau = (p: Panneau) => rendre(<SceauQuetes initial={p} xp={2140} demo ouvert />);

console.log("# le sceau et son panneau « Aujourd'hui »");
check("(l'exemple « milieu » a des quêtes à récupérer)", items.length > 0, `${items.length}`);
{
  const html = sceau(panneau({ recuperer: { n: 4, xp: 300, items } }));
  check("le sceau dit ce qui attend, la pastille le compte", html.includes('aria-label="Aujourd\'hui : 4 quêtes à récupérer"') && /class="pastille t-num"[^>]*>4</.test(html));
  check("le panneau s'appelle « Aujourd'hui », la ligne de niveau en tête", html.includes(">Aujourd'hui</h2>") && html.includes("Niv. ") && html.includes("XP sur "));
  const autres = 4 - Math.min(3, items.length);
  check("À récupérer : trois lignes au plus, « et N autres », le bouton plein « Tout récupérer »", html.includes("À récupérer · 4") && html.includes(`et ${autres} autre${autres > 1 ? "s" : ""}`) && html.includes("Tout récupérer · +300 XP"));
  check("La suite : l'étape, sa durée et son XP, « Commencer » en contour (il y a à récupérer)", html.includes("La suite") && html.includes("Corriger 14 ratures") && html.includes("10 min · +10 XP") && /btn btn-secondary[^"]*"[^>]*>Commencer</.test(html));
  check("en pied : « Fait aujourd'hui » et « Ouvrir le Codex → »", html.includes("Fait aujourd'hui : 1 · +10 XP") && html.includes("Ouvrir le Codex →"));
  check("un seul bouton plein : « Tout récupérer »", compte(html, /btn btn-primary/g) === 1);
  check("plus de « ! », de « Y aller », de « Changer », d'« Une autre idée ? », de budget ni de « à revoir »", !/>!<|Y aller|Changer|Une autre idée|J'ai|à revoir/.test(html));
}
{
  const html = sceau(panneau({ recuperer: { n: 0, xp: 0, items: [] } }));
  check("rien à récupérer : pas de pastille, « Commencer » devient le bouton plein", !html.includes('class="pastille') && !html.includes("À récupérer") && /btn btn-primary[^"]*"[^>]*>Commencer</.test(html));
  check("une séance lancée : « Continuer »", />Continuer</.test(sceau(panneau({ recuperer: { n: 0, xp: 0, items: [] }, seance: { ...seance, lancee: true } }))));
  check("séance finie : « Séance du jour faite. »", sceau(panneau({ recuperer: { n: 0, xp: 0, items: [] }, seance: { ...seance, suivant: null } })).includes("Séance du jour faite."));
  check("au-delà de 9 : « 9+ »", />9\+</.test(sceau(panneau({ recuperer: { n: 12, xp: 300, items } }))));
  const sobre = sceau(panneau({ recuperer: { n: 0, xp: 0, items: [] }, sobre: true }));
  check("mode sobre : ni « +n XP » dans La suite ni dans Fait aujourd'hui", sobre.includes("10 min<") && sobre.includes("Fait aujourd'hui : 1<") && !sobre.includes("+10 XP"));
  const j = sceau(panneau({ jourJ: true, seance: null, recuperer: { n: 4, xp: 300, items } }));
  check("le jour J : « Bonne chance », rien d'autre (ni pastille, ni niveau, ni La suite)", j.includes("Bonne chance.") && !j.includes('class="pastille') && !j.includes("Niv. ") && !j.includes("La suite") && j.includes('data-jour-j="true"'));
}

console.log("\n# les onglets");
{
  const haut = rendre(<SpaceNav chemin="/codex" />);
  check("en haut : quatre onglets, pas de Codex", compte(haut, /<a /g) === 4 && !haut.includes('href="/codex"'), `${compte(haut, /<a /g)}`);
  check("sur /codex, « Moi » s'allume aux couleurs du carnet", allume(haut) === "/moi" && haut.includes('data-palette="carnet"'), allume(haut));
  const bas = rendre(<MobileBottomNav chemin="/dashboard" />);
  const noms = [...bas.matchAll(/<span class="whitespace-nowrap[^"]*">([^<]+)</g)].map((m) => m[1]);
  check("en bas : Accueil · Réviser · S'entraîner · Classement · Moi", noms.join(" · ") === "Accueil · Réviser · S'entraîner · Classement · Moi", noms.join(" · "));
  check("sur l'accueil, l'onglet Accueil est allumé", allume(bas) === "/dashboard", allume(bas));
  check("sur /codex, en bas aussi, « Moi »", allume(rendre(<MobileBottomNav chemin="/codex" />)) === "/moi");
}

console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
process.exit(ko ? 1 : 0);
