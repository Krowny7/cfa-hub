// Tests des blocs Radar, Amis, Folio et Saisons de la page de profil, dans
// leur nouvelle grammaire (spec des tuiles § 2, 3, 7, 9), sans base ni
// réseau ni navigateur (rendu statique par react-dom/server).
//   npx tsx scripts/profil/test-blocs-radar.tsx
// Chaque bloc, à chaque format permis, dans les trois vues : chez un autre
// avec écarts (RICHE_TOI), l'aperçu « voir comme les autres » (sans toi),
// chez soi. Puis les textes clés : jetons, score, ce qui est retiré, les
// états particuliers (aperçu, rien de mesuré, pas classée, aucun ami…).
import "./sans-css";
import "./react-global";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RadarAutre, RadarBloc } from "@/components/profil/blocs/Radar";
import { AmisBloc, tranche } from "@/components/profil/blocs/Amis";
import { FolioBloc } from "@/components/profil/blocs/Folio";
import { SaisonsBloc, rangPic } from "@/components/profil/blocs/Saisons";
import type { Ctx } from "@/components/profil/blocs/commun";
import { FORMATS_PERMIS, type Format } from "@/lib/profil/disposition";
import type { DonneesBlocs } from "@/lib/profil/blocs-donnees";
import { RICHE, RICHE_TOI, SOBRE, TOI_EXEMPLE } from "./donnees-blocs-exemple";

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const rend = (n: React.ReactNode) => renderToStaticMarkup(<>{n}</>);
/** le texte tel qu'on le lit : entités décodées, espaces insécables en espaces */
const lu = (html: string) => html.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/ | /g, " ");
const compte = (html: string, motif: string) => html.split(motif).length - 1;

type Bloc = (c: Ctx) => React.ReactNode;
const BLOCS: [string, "radar" | "amis" | "folio" | "saisons", Bloc][] = [
  ["Radar", "radar", RadarBloc],
  ["Amis", "amis", AmisBloc],
  ["Folio", "folio", FolioBloc],
  ["Saisons", "saisons", SaisonsBloc],
];
const AUTRE: DonneesBlocs = RICHE_TOI;
const APERCU: DonneesBlocs = { ...RICHE, apercu: true };
const SOI: DonneesBlocs = { ...RICHE_TOI, moi: true, toi: null };
const VUES: [string, DonneesBlocs][] = [
  ["chez un autre", AUTRE],
  ["aperçu", APERCU],
  ["chez soi", SOI],
];
const r = (B: Bloc, d: DonneesBlocs, f: Format, edition = false) => lu(rend(<B d={d} f={f} edition={edition} />));

// ── Chaque bloc, chaque format permis, chaque vue : il se rend, proprement ──
for (const [nom, k, B] of BLOCS) {
  for (const f of FORMATS_PERMIS[k]) {
    for (const [vue, d] of VUES) {
      let html = "";
      let err = "";
      try {
        html = r(B, d, f);
      } catch (e) {
        err = String(e);
      }
      check(`${nom} · ${f} · ${vue} : rendu`, !err && html.length > 0 && !/undefined|NaN|\[object Object\]/.test(html), err);
      if (f === "demi") check(`${nom} · demi · ${vue} : une demi-bande`, html.includes('class="card min-w-0 demi'));
    }
  }
}
check("Radar : pas de demi-bande permise", !FORMATS_PERMIS.radar.includes("demi"));
check("Folio : pas de bande ; Saisons : pas de héros", !FORMATS_PERMIS.folio.includes("bande") && !FORMATS_PERMIS.saisons.includes("heros"));

// ── Radar (§ 2) ──
{
  const t = r(RadarBloc, AUTRE, "tuile");
  check("radar chez un autre : le bouton « Me comparer »", t.includes(">Me comparer</button>") && t.includes("btn-secondary"));
  check("radar chez un autre : ni « Ses matières », ni le surtitre de la moyenne", !t.includes("Ses matières") && !t.includes("face à la moyenne des joueurs"));
  check("radar chez un autre : ni « en tête », ni « à reprendre », ni « Plus sûre »", !t.includes("en tête") && !/à reprendre/i.test(t) && !t.includes("Plus sûre"));
  check("radar chez un autre : ni barres ni repli « Les 10 matières »", !t.includes("Les 10 matières</summary>") && !t.includes("Ses plus sûres") && !t.includes(" en commun :"));
  check("radar chez un autre : étiquette « ETH » puis sa valeur « 71 », sans « moy » ni écart à la moyenne", t.includes(">ETH<tspan") && t.includes(">71</tspan>") && !/· moy \d/.test(t) && !t.includes(">71<tspan"));
  check("radar chez un autre : l'infobulle de l'axe, inchangée (avec la moyenne)", t.includes("Ethics — Sforzinda : 71 % de bonnes réponses · moyenne des joueurs : 66 %"));
  check("radar chez un autre, fermé : la moyenne en pointillés, pas de score", t.includes('stroke-dasharray="3.5 4"') && !t.includes("toi 2 – 2"));
  for (const f of ["tuile", "colonne", "heros", "bande"] as Format[]) {
    const max = { tuile: 330, colonne: 340, heros: 440, bande: 520, demi: 330 }[f];
    check(`radar chez un autre (${f}) : ${max} px au plus`, r(RadarBloc, AUTRE, f).includes(`--max:${max}px`));
  }
  check("radar chez un autre (colonne) : centré verticalement", r(RadarBloc, AUTRE, "colonne").includes('class="centre"'));
  const titre = r(RadarBloc, AUTRE, "bande");
  check("radar chez un autre (bande) : le titre « Statistiques », le bouton à droite, le radar centré", titre.includes(">Statistiques</h3>") && titre.includes('class="droite"><button') && titre.includes('class="centre"'));
  check("radar chez un autre : le titre « Statistiques » à chaque format", (["tuile", "colonne", "heros"] as Format[]).every((f) => r(RadarBloc, AUTRE, f).includes(">Statistiques</h3>")));

  const o = lu(rend(<RadarAutre d={AUTRE} f="tuile" ouvert />));
  // Sforzinda / toi : ETH 71/63 (−8), QM 58/67 (+9), FSA 82/70 (−12), FI 38/57 (+19)
  check("radar comparé : « Arrêter »", o.includes(">Arrêter</button>") && o.includes('aria-pressed="true"'));
  check("radar comparé : le score « toi 2 – 2 » à égalité (encre douce)", o.includes("toi 2 – 2") && o.includes('color:var(--ink-2)" title="Tu mènes dans 2, Sforzinda dans 2"'));
  check("radar comparé : les jetons courts « 71 −8 », « 58 +9 », « 82 −12 », « 38 +19 »", o.includes(">71<tspan") && o.includes("> −8</tspan>") && o.includes("> +9</tspan>") && o.includes("> −12</tspan>") && o.includes("> +19</tspan>"));
  check("radar comparé : jeton vert si tu mènes, rouge si elle mène", o.includes('fill:var(--gain);font-weight:650"> +9') && o.includes('fill:var(--perte);font-weight:650"> −8'));
  check("radar comparé : une étiquette rouge est un lien d'entraînement", o.includes('href="/practice?topic=ethics"') && o.includes('href="/practice?topic=fsa"') && !o.includes("topic=quant") && !o.includes("topic=fixed_income"));
  check("radar comparé : l'infobulle du lien", o.includes("M'entraîner en ETH · Sforzinda mène de 8") && o.includes("M'entraîner en FSA · Sforzinda mène de 12"));
  check("radar comparé : « toi 63 » dans l'infobulle de l'axe", o.includes("Ethics — Sforzinda : 71 % de bonnes réponses · toi : 63 %"));
  check("radar comparé : l'aria-label du radar", o.includes('aria-label="Les 10 matières de Sforzinda, comparées aux tiennes"'));
  check("radar comparé : la moyenne s'efface, ta forme fine à ta couleur", !o.includes('stroke-dasharray="3.5 4"') && o.includes('stroke-width="1.25"') && o.includes("color:#3b6fd6"));
  check("radar comparé : ni bilan ni surtitre « (épais) · toi (fin) »", !o.includes("(épais)") && !o.includes("matières mesurées en commun"));
  const ob = lu(rend(<RadarAutre d={AUTRE} f="bande" ouvert />));
  check("radar comparé (bande) : le score à droite du titre, avant le bouton", ob.includes("toi 2 – 2") && ob.indexOf("toi 2 – 2") < ob.indexOf("<button") && ob.indexOf(">Statistiques<") < ob.indexOf("toi 2 – 2"));

  const a = r(RadarBloc, APERCU, "tuile");
  check("radar en aperçu : bouton grisé, « Ici, la personne qui regarde peut se comparer »", a.includes('disabled=""') && a.includes('title="Ici, la personne qui regarde peut se comparer"') && !a.includes("Aucune de tes matières"));
  const vide = r(RadarBloc, { ...RICHE_TOI, radar: { ...RICHE.radar, miennes: null }, toi: { ...TOI_EXEMPLE, stats: { ...TOI_EXEMPLE.stats, matieres: [] } } }, "tuile");
  check("radar : aucune de tes matières mesurée, bouton grisé avec sa raison", vide.includes('disabled=""') && vide.includes("Aucune de tes matières n'est encore mesurée"));
  const anonyme = r(RadarBloc, { ...RICHE, viewerId: null, radar: { ...RICHE.radar, miennes: null } }, "tuile");
  check("radar : visiteur non connecté, pas de bouton", !anonyme.includes("<button"));

  const sh = r(RadarBloc, SOI, "heros");
  check("radar chez soi (héros) : inchangé, « Tes matières », « FSA en tête », les plus sûres, le repli", sh.includes("Tes matières · face à la moyenne des joueurs") && sh.includes("FSA en tête") && sh.includes("Tes plus sûres") && sh.includes("Les 10 matières</summary>") && sh.includes("À reprendre"));
  const st = r(RadarBloc, SOI, "tuile");
  check("radar chez soi (tuile) : « Plus sûre », la moyenne, sans bouton ni score", st.includes("Plus sûre") && /· moy \d/.test(st) && !st.includes("<button") && !st.includes("toi 2"));
  check("radar chez soi : aucun vert, aucun rouge", !st.includes("var(--gain)") && !st.includes("var(--perte)") && !sh.includes("var(--gain)"));
}

// ── Amis (§ 3) ──
{
  // le cercle de Sforzinda : 6e sur 25 ; toi 11e (pas son ami) ; 3 amis communs
  const t = r(AmisBloc, AUTRE, "tuile");
  check("amis chez un autre : le chiffre « 6e » et « sur 25 »", t.includes(">6e<span") && t.includes(">sur 25</span>"));
  check("amis chez un autre : le jeton « toi 11e », rouge", t.includes('color:var(--perte)') && t.includes(">toi 11e</span>"));
  check(
    "amis chez un autre : l'infobulle du jeton",
    t.includes("Par ELO, dans le cercle de Sforzinda : Sforzinda 6e · toi 11e sur 25 (si tu en étais)"),
  );
  check("amis chez un autre : le repère « 3 en commun »", t.includes(">3 en commun</span>"));
  check("amis chez un autre : 6 avatars en mini-tuile, elle cernée d'encre, toi à ta couleur et « toi » dessous", compte(t, 'class="visage"') === 6 && t.includes("box-shadow:0 0 0 2.5px var(--ink)") && t.includes("box-shadow:0 0 0 2px #3b6fd6") && t.includes('class="legende" style="color:#3b6fd6">toi</span>'));
  check("amis chez un autre : les pseudos en infobulle seulement", t.includes('title="Nadia T. · 1 472"') && !t.includes(">Nadia T.<") && !t.includes("Gérer mes amis"));
  check("amis chez un autre : un point sous les amis communs", t.includes('class="point"'));
  check("amis chez un autre : plus d'illustration", !t.includes("joueurs-seigneurie"));
  check("amis : la tranche contient elle et toi", t.includes('title="Sforzinda · 1 478"') && t.includes('title="toi · 1 360"'));

  const h = r(AmisBloc, AUTRE, "heros");
  check("amis chez un autre (héros) : 9 avatars en 3 × 3", compte(h, 'class="visage"') === 9 && h.includes('class="grille3"'));
  const b = r(AmisBloc, AUTRE, "bande");
  check("amis chez un autre (bande) : 12 avatars en ligne", compte(b, 'class="visage"') === 12 && b.includes('class="rangeeLigne"'));
  const dm = r(AmisBloc, AUTRE, "demi");
  check("amis chez un autre (demi) : « Amis » / « 6e » / « toi 11e », 14 avatars (8 au téléphone), « 3 en commun » à droite", dm.includes(">Amis</span>") && dm.includes(">toi 11e</span>") && compte(dm, 'class="visage"') === 14 && compte(dm, 'class="horsTel"') === 6 && dm.includes(">3 en commun</span>"));
  const coherent: DonneesBlocs = { ...RICHE_TOI, amis: { ...RICHE_TOI.amis!, cercle: { lui: 6, toi: 11, taille: 25 } } };
  const c = r(AmisBloc, coherent, "colonne");
  check("amis chez un autre (colonne) : l'échelle de 10 lignes (de Sofia R. à Clara S.), pseudos visibles, ELO", compte(c, '<li class="ligne') === 10 && c.includes(">Sofia R.</a>") && c.includes(">Clara S.</a>") && !c.includes("Hugo P.") && c.includes(">1 546</span>"));
  check("amis chez un autre (colonne) : sa ligne en gras, la tienne d'un filet à ta couleur", c.includes('class="ligne lui"') && c.includes("box-shadow:inset 2px 0 0 #3b6fd6"));
  check("amis chez un autre (colonne) : les rangs suivis (4e à 13e)", c.includes(">4e</span>") && c.includes(">13e</span>") && !c.includes(">…</li>"));
  const loin: DonneesBlocs = {
    ...RICHE_TOI,
    toi: { ...TOI_EXEMPLE, elo: 900 },
    amis: { amis: RICHE_TOI.amis!.amis.map((x) => ({ ...x })).concat(Array.from({ length: 8 }, (_, i) => ({ id: `bas-${i}`, name: `Bas ${i}`, avatarUrl: null, elo: 1100 - i * 20 }))), total: 20, cercle: { lui: 5, toi: 22, taille: 22 } },
  };
  const cl = r(AmisBloc, loin, "colonne");
  check("amis chez un autre (colonne) : ta place au-delà, « … » puis ta ligne", cl.includes(">…</li>") && cl.includes(">22e</span>"));

  const ap = r(AmisBloc, { ...RICHE_TOI, toi: null, apercu: true }, "tuile");
  check("amis en aperçu : « toi ± », sans toi dans le cercle ni amis communs", ap.includes(">toi ±</span>") && ap.includes("Ici, l'écart avec la personne qui regarde") && !ap.includes('class="legende"') && !ap.includes("en commun"));
  const apAncien = r(AmisBloc, APERCU, "tuile");
  check("amis en aperçu sans ELO : le total « 23 »", apAncien.includes(">23</span>"));
  const peu = r(AmisBloc, { ...RICHE_TOI, amis: { amis: RICHE_TOI.amis!.amis.slice(0, 2), total: 2 } }, "tuile");
  check("amis : moins de 3 amis, le chiffre est le total, sans jeton", peu.includes(">2</span>") && !peu.includes("toi 11e") && !peu.includes(">toi ±"));
  const aucun = r(AmisBloc, { ...RICHE_TOI, amis: { amis: [], total: 0 } }, "tuile");
  check("amis : aucun ami, « Pas encore d'amis. »", aucun.includes("Pas encore d'amis."));
  check("amis : sans données, rien en vue publique ; l'état vide en édition", r(AmisBloc, { ...RICHE, amis: null }, "tuile") === "" && r(AmisBloc, { ...RICHE, amis: null }, "tuile", true).includes("rien à montrer"));
  const ami = r(AmisBloc, { ...RICHE_TOI, toi: { ...TOI_EXEMPLE, amis: ["sforzinda"] } }, "tuile");
  check("amis : déjà son ami, pas de « (si tu en étais) »", ami.includes("toi 11e sur 25") && !ami.includes("si tu en étais"));
  // son ami, mais loin des amis montrés : le serveur le dit (cercle.toiAmi)
  const amiLoin = r(AmisBloc, { ...RICHE_TOI, amis: { ...RICHE_TOI.amis!, cercle: { ...RICHE_TOI.amis!.cercle!, toiAmi: true } } }, "tuile");
  const pasAmi = r(AmisBloc, { ...RICHE_TOI, amis: { ...RICHE_TOI.amis!, cercle: { ...RICHE_TOI.amis!.cercle!, toiAmi: false } } }, "tuile");
  check("amis : son ami hors des amis montrés (cercle.toiAmi), pas de « (si tu en étais) » ; pas son ami, si", !amiLoin.includes("si tu en étais") && pasAmi.includes("si tu en étais"));

  const s = r(AmisBloc, SOI, "tuile");
  check("amis chez soi : le total, les pseudos, « Gérer mes amis »", s.includes(">23</span>") && s.includes(">Inès B.</span>") && s.includes("Gérer mes amis") && !s.includes("toi 11e"));
  const sb = r(AmisBloc, { ...SOI, amis: { ...SOI.amis!, amis: [...SOI.amis!.amis].reverse() } }, "bande");
  check("amis chez soi : triés par ELO", sb.indexOf("Inès B.") < sb.indexOf("Hugo P.") && sb.indexOf("Hugo P.") < sb.indexOf("Jade N."));
  const sd = r(AmisBloc, SOI, "demi");
  check("amis chez soi (demi) : « Amis » / « 23 » / « Gérer › », puis les avatars", sd.includes(">23</span>") && sd.includes(">Gérer ›</a>") && sd.includes('href="/people?view=amis"'));

  check("tranche : contiguë autour d'elle et de toi", tranche(6, 14, [4, 9]).join() === "4,5,6,7,8,9" && tranche(6, 14, [4, 6]).join() === "2,3,4,5,6,7");
  check("tranche : trop loin, les voisins de chacun", tranche(6, 14, [0, 13]).join() === "0,1,2,11,12,13");
  check("tranche : moins de membres que de places", tranche(6, 3, [1]).join() === "0,1,2");
}

// ── Folio (§ 7) ──
{
  const fo = RICHE.folio!;
  const t = r(FolioBloc, AUTRE, "tuile");
  check("folio chez un autre (tuile) : le nom, sans « Planche portée »", t.includes(fo.nom) && !t.includes("Planche portée"));
  check("folio chez un autre (tuile) : l'anecdote en infobulle de la planche, pas en texte", t.includes(`title="${fo.anecdote.join(" ")}"`) && !t.includes(`>${fo.anecdote[0]}<`));
  check("folio chez un autre (tuile) : planche de 110 px", t.includes("grid-template-columns:110px minmax(0,1fr)"));
  const c = r(FolioBloc, AUTRE, "colonne");
  check("folio chez un autre (colonne) : le repli « L'histoire », fermé, avec l'anecdote", c.includes("L'histoire</summary>") && c.includes(`>${fo.anecdote[0]}<`) && !c.includes("<details open"));
  const h = r(FolioBloc, AUTRE, "heros");
  check("folio chez un autre (héros) : nom en 22 px, l'anecdote sur 2 lignes", h.includes('class="nomHeros"') && h.includes(`>${fo.anecdote[0]}<`) && h.includes(`>${fo.anecdote[1]}<`));
  // le badge : « à toi aussi » (encre douce) / « pas à toi » (rouge), l'obtention en infobulle ; sans la donnée, rien
  const aussi = r(FolioBloc, { ...AUTRE, toi: { ...AUTRE.toi!, folio: true } }, "tuile");
  const pas = r(FolioBloc, { ...AUTRE, toi: { ...AUTRE.toi!, folio: false } }, "demi");
  const sans = r(FolioBloc, { ...AUTRE, toi: { ...AUTRE.toi!, folio: null } }, "heros");
  check("folio : le badge « à toi aussi », à l'encre douce, l'obtention en infobulle", aussi.includes(">à toi aussi<") && aussi.includes("color:var(--ink-2)") && !!fo.obtention && aussi.includes(`title="${fo.obtention}"`));
  check("folio : le badge « pas à toi », en rouge (demi-bande aussi)", pas.includes(">pas à toi<") && pas.includes("color:var(--perte)"));
  check("folio : sans la donnée, pas de badge ; chez soi non plus", !sans.includes("à toi aussi") && !sans.includes("pas à toi") && !r(FolioBloc, { ...AUTRE, moi: true, toi: { ...AUTRE.toi!, folio: true } }, "tuile").includes("à toi aussi"));
  const dm = r(FolioBloc, AUTRE, "demi");
  check("folio chez un autre (demi) : vignette, nom et œuvre, sans anecdote visible", dm.includes('class="vignette') && dm.includes(fo.nom) && dm.includes(fo.oeuvre) && !dm.includes(`>${fo.anecdote[0]}<`));
  check("folio : pas de badge (la donnée toi.folio n'existe pas encore)", !t.includes("à toi aussi") && !t.includes("pas à toi") && !dm.includes("pas à toi"));
  const s = r(FolioBloc, SOI, "tuile");
  check("folio chez soi : inchangé, « Planche portée », l'anecdote visible", s.includes("Planche portée") && s.includes(`>${fo.anecdote[0]}<`));
  const sd = r(FolioBloc, SOI, "demi");
  check("folio chez soi (demi) : la 1re ligne de l'anecdote", sd.includes(`>${fo.anecdote[0]}<`) && !sd.includes(`>${fo.anecdote[1]}<`));
  check("folio : sans folio, rien en vue publique ; l'invitation en édition", r(FolioBloc, SOBRE, "tuile") === "" && r(FolioBloc, { ...SOBRE, moi: true }, "tuile", true).includes("Aucun folio porté") && r(FolioBloc, { ...SOBRE, moi: true }, "demi", true).includes("Aucun folio porté"));
}

// ── Saisons (§ 9) ──
{
  // Sforzinda : saison 3, pic Platine II (1 502) ; toi : Or I (1 371) ; gravées S2 (5e sur 212), S1 (19e sur 168)
  const t = r(SaisonsBloc, AUTRE, "tuile");
  check("saisons chez un autre : « Saison 3 », son nom en infobulle", t.includes(">Saison 3</h3>") && t.includes('title="Saison 3 · Mai 2027"'));
  check("saisons chez un autre : le chiffre « Platine II » et son sceau", t.includes(">Platine II</span>") && t.includes("PLATINE"));
  check("saisons chez un autre : le jeton « toi Or I », rouge", t.includes(">toi Or I</span>") && t.includes("color:var(--perte)"));
  check("saisons chez un autre : l'infobulle du jeton", t.includes("Pic de saison · Sforzinda Platine II, 1 502 · toi Or I, 1 371"));
  check("saisons chez un autre : retirés « pic de saison … », « S2 · Février 2027 », « Ses saisons » (tuile)", !t.includes("pic de saison") && !t.includes("Février 2027") && !t.includes("Ses saisons"));
  check("saisons chez un autre : les sceaux gravés, leur infobulle", t.includes("S2 · Diamant III · 5e sur 212") && t.includes("S1 · Or I · 19e sur 168"));
  check("saisons chez un autre : une seule saison comparable, pas de score", !/toi \d – \d/.test(t));
  const toiGrave: DonneesBlocs = {
    ...RICHE_TOI,
    toi: { ...TOI_EXEMPLE, saisons: { ...TOI_EXEMPLE.saisons!, palmares: [{ ...RICHE.saisons!.palmares[0], place: 41, pic: { palier: 3, division: "I" }, eloPic: 1450 }] } },
  };
  const g = r(SaisonsBloc, toiGrave, "tuile");
  check("saisons : ta place gravée en jeton court « 41e », rouge", g.includes(">41e</span>") && g.includes("S2 · Diamant III · 5e sur 212 · toi 41e"));
  check("saisons : le score sur la saison en cours et la gravée commune, « toi 0 – 2 »", g.includes("toi 0 – 2") && g.includes("Tu mènes dans 0, Sforzinda dans 2"));
  check("saisons : pas de jeton sous une saison où tu n'étais pas gravé", compte(g, 'class="jeton"') === 2);
  const c = r(SaisonsBloc, toiGrave, "colonne");
  check("saisons chez un autre (colonne) : les lignes « S2 · 5e · 41e » et le lien « Ses saisons »", c.includes(">S2</span>") && c.includes(">5e</span>") && c.includes(">41e</span>") && c.includes("Ses saisons"));
  const b = r(SaisonsBloc, toiGrave, "bande");
  check("saisons chez un autre (bande) : les sceaux en ligne avec leur jeton", b.includes('class="gravesLigne"') && b.includes(">41e</span>") && !b.includes("Ses saisons"));
  const dm = r(SaisonsBloc, toiGrave, "demi");
  check("saisons chez un autre (demi) : « Saison 3 » / « Platine II » / « toi Or I », les sceaux, le score à droite", dm.includes(">Saison 3</span>") && dm.includes(">Platine II</span>") && dm.includes(">toi Or I</span>") && dm.includes('class="demiGraves"') && dm.includes('class="droite"><span class="score"'));
  const pc = r(SaisonsBloc, { ...RICHE_TOI, saisons: { ...RICHE.saisons!, courante: { ...RICHE.saisons!.courante!, moi: null } } }, "tuile");
  check("saisons : pas classée cette saison, « Pas classée » sans jeton", pc.includes("Pas classée") && !pc.includes("toi Or I"));
  const ap = r(SaisonsBloc, APERCU, "tuile");
  check("saisons en aperçu : « toi ± » et « toi – – »", ap.includes(">toi ±</span>") && ap.includes(">toi – –</span>"));
  const s = r(SaisonsBloc, SOI, "tuile");
  check("saisons chez soi : inchangé (« pic de saison », « 2 gravées », « Tes saisons »)", s.includes("pic de saison Platine II · 1 502") && s.includes("2 gravées") && s.includes("Tes saisons") && !s.includes("toi Or I"));
  const sd = r(SaisonsBloc, SOI, "demi");
  check("saisons chez soi (demi) : « Saison 3 » / « Platine II » / « pic 1 502 », puis les sceaux et sa place", sd.includes(">Platine II</span>") && sd.includes(">pic 1 502</span>") && sd.includes(">5e</span>") && sd.includes(">19e</span>"));
  check("saisons : sans saison, rien en vue publique ; l'état vide en édition", r(SaisonsBloc, { ...RICHE, saisons: null }, "tuile") === "" && r(SaisonsBloc, { ...RICHE, saisons: null }, "tuile", true).includes("rien à montrer"));
  check("rangPic : Or III < Or II < Or I < Platine III", rangPic({ palier: 2, division: "III" }) < rangPic({ palier: 2, division: "II" }) && rangPic({ palier: 2, division: "II" }) < rangPic({ palier: 2, division: "I" }) && rangPic({ palier: 2, division: "I" }) < rangPic({ palier: 3, division: "III" }));
}

console.log(ko ? `\n${ko} échec(s)` : "\nTout est vert.");
process.exit(ko ? 1 : 0);
