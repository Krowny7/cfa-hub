// Tests des blocs Radar, Amis, Folio et Saisons de la page de profil, dans
// leur refonte (« Radar et podium », « Le nombre et la pile », « Au musée »,
// « Écussons »), sans base ni réseau ni navigateur (rendu statique par
// react-dom/server).
//   npx tsx --tsconfig tsconfig.json scripts/profil/test-blocs-radar.tsx
// Chaque bloc, à chaque format permis, dans les trois vues : chez un autre
// avec écarts (RICHE_TOI), l'aperçu « voir comme les autres » (sans toi),
// chez soi. Puis le contenu clé de chaque maquette et les états
// particuliers (aperçu, rien de mesuré, pas classée, aucun ami…). Seul le
// Radar compare encore (« Me comparer ») : les trois autres n'ont plus ni
// jeton, ni score, ni « toi », et montrent le même dessin chez soi et chez
// un autre.
import "./sans-css";
import "./react-global";
import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { RadarAutre, RadarBloc } from "@/components/profil/blocs/Radar";
import * as AmisModule from "@/components/profil/blocs/Amis";
import * as SaisonsModule from "@/components/profil/blocs/Saisons";
import { AmisBloc } from "@/components/profil/blocs/Amis";
import { FolioBloc } from "@/components/profil/blocs/Folio";
import { SaisonsBloc } from "@/components/profil/blocs/Saisons";
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
const lu = (html: string) => html.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/[  ]/g, " ");
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
/** plus de comparaison : ni jeton « toi −… », ni « toi +… », ni « toi ± », ni score « toi 0 – … » */
const COMPARAISON = /toi [−+±]|toi 0 –|toi \d+ –|toi – –/;

// ── Chaque bloc, chaque format permis, chaque vue : il se rend, proprement ──
for (const [nom, k, B] of BLOCS) {
  for (const f of FORMATS_PERMIS[k]) {
    for (const [vue, d] of VUES) {
      let html = "";
      let encore = "";
      let err = "";
      try {
        html = r(B, d, f);
        encore = r(B, d, f);
      } catch (e) {
        err = String(e);
      }
      check(`${nom} · ${f} · ${vue} : rendu`, !err && html.length > 0 && !/undefined|NaN|\[object Object\]/.test(html), err);
      check(`${nom} · ${f} · ${vue} : même rendu à chaque fois (serveur = client)`, html === encore);
      if (f === "demi") check(`${nom} · demi · ${vue} : une demi-bande`, html.includes('class="card min-w-0 demi'));
      if (k !== "radar") check(`${nom} · ${f} · ${vue} : aucune comparaison (« toi − », « toi + », « toi ± », « toi 0 – »)`, !COMPARAISON.test(html) && !html.includes(">toi<"));
    }
  }
}
check("Radar : pas de demi-bande permise", !FORMATS_PERMIS.radar.includes("demi"));
check("Folio : pas de bande ; Saisons : pas de héros", !FORMATS_PERMIS.folio.includes("bande") && !FORMATS_PERMIS.saisons.includes("heros"));
check("le code de comparaison mort est parti (tranche, rangPic)", !("tranche" in AmisModule) && !("rangPic" in SaisonsModule));

// ── Radar : « Radar et podium » ──
{
  const t = r(RadarBloc, AUTRE, "tuile");
  check("radar chez un autre : le bouton « Me comparer »", t.includes(">Me comparer</button>") && t.includes("btn-secondary"));
  check("radar chez un autre : le titre « Statistiques », ni « Ses matières » ni surtitre de la moyenne", t.includes(">Statistiques</h3>") && !t.includes("Ses matières") && !t.includes("face à la moyenne des joueurs"));
  check("radar chez un autre : ni « en tête », ni « à reprendre », ni « Plus sûre »", !t.includes("en tête") && !/à reprendre/i.test(t) && !t.includes("Plus sûre"));
  check("radar chez un autre (tuile) : le radar seul, sans podium ni barres ni repli", !t.includes("Ses plus sûres") && !t.includes('class="puce"') && !t.includes("Les 10 matières</summary>") && !t.includes("Ses plus sûres"));
  check("radar chez un autre : étiquette « ETH » puis sa valeur « 71 », sans « moy » ni écart à la moyenne", t.includes(">ETH<tspan") && t.includes(">71</tspan>") && !/· moy \d/.test(t) && !t.includes(">71<tspan"));
  check("radar chez un autre : l'infobulle de l'axe (avec la moyenne)", t.includes("Ethics — Sforzinda : 71 % de bonnes réponses · moyenne des joueurs : 66 %"));
  check("radar chez un autre, fermé : la moyenne en pointillés, pas de score", t.includes('stroke-dasharray="3.5 4"') && !t.includes("toi 2 – 2"));
  check("radar chez un autre (tuile) : le radar centré dans la hauteur", t.includes('class="zone centre"'));
  for (const f of ["tuile", "colonne", "heros", "bande"] as Format[]) {
    const max = { tuile: 330, colonne: 340, heros: 440, bande: 520, demi: 330 }[f];
    check(`radar chez un autre (${f}) : ${max} px au plus`, r(RadarBloc, AUTRE, f).includes(`--max:${max}px`));
  }
  check("radar chez un autre : le titre « Statistiques » à chaque format", (["tuile", "colonne", "heros", "bande"] as Format[]).every((f) => r(RadarBloc, AUTRE, f).includes(">Statistiques</h3>")));

  // le podium : FSA 82, ETH 71, EQ 66 (or, argent, bronze)
  const c = r(RadarBloc, AUTRE, "colonne");
  const pod = c.slice(c.indexOf('class="podium"'));
  check("radar (colonne) : le podium sous le radar, « Ses plus sûres »", c.includes(">Ses plus sûres</p>") && c.indexOf("Ses plus sûres") > c.indexOf("</svg>"));
  check("radar (colonne) : trois puces, FSA 82, ETH 71, EQ 66, dans l'ordre", compte(c, 'class="puce"') === 3 && pod.indexOf(">FSA<") < pod.indexOf(">ETH<") && pod.indexOf(">ETH<") < pod.indexOf(">EQ<") && c.includes('82<small>%</small>') && c.includes('71<small>%</small>') && c.includes('66<small>%</small>'));
  check("radar (colonne) : médailles or, argent, bronze (les métaux de TIERS)", c.includes("--m2:#E2B13B") && c.includes("--m2:#BCC1C7") && c.includes("--m2:#B8713F") && c.indexOf("--m2:#E2B13B") < c.indexOf("--m2:#BCC1C7") && c.indexOf("--m2:#BCC1C7") < c.indexOf("--m2:#B8713F"));
  check("radar (colonne) : les rangs 1, 2, 3 et l'infobulle de chaque puce", c.includes('class="medaille" aria-hidden="true">1<') && c.includes('>3</span>') && c.includes('title="1re : Financial Statement Analysis, 82 %"') && c.includes('title="2e : Ethics, 71 %"'));
  const h = r(RadarBloc, AUTRE, "heros");
  check("radar (héros) : le radar et le podium côte à côte (ensemble)", h.includes('class="ensemble"') && compte(h, 'class="puce"') === 3 && h.indexOf('class="radar"') < h.indexOf('class="podium"'));
  const b = r(RadarBloc, AUTRE, "bande");
  check("radar (bande) : le radar et le podium, le bouton à droite du titre", b.includes('class="ensemble"') && compte(b, 'class="puce"') === 3 && b.includes('class="droite"><button'));
  // une maîtrise provisoire garde son « ≈ »
  const prov = r(RadarBloc, { ...AUTRE, stats: { ...AUTRE.stats, matieres: AUTRE.stats.matieres.map((m) => (m.key === "alternatives" ? { ...m, pct: 99 } : m)) } }, "colonne");
  check("radar : une matière provisoire monte au podium avec son « ≈ »", prov.includes("≈99<small>%</small>") && prov.includes(">ALT<"));
  const rien = r(RadarBloc, { ...SOBRE, stats: { ...SOBRE.stats, matieres: SOBRE.stats.matieres.map((m) => ({ ...m, pct: null })) } }, "heros");
  check("radar : rien de mesuré, pas de podium (le radar seul)", !rien.includes("plus sûres") && !rien.includes('class="puce"') && rien.includes('class="ensemble seul"'));
  const deux = r(RadarBloc, SOBRE, "colonne");
  check("radar : deux matières mesurées, deux puces", compte(deux, 'class="puce"') === 2);

  // « Me comparer » : inchangé
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
  const oc = lu(rend(<RadarAutre d={AUTRE} f="colonne" ouvert />));
  check("radar comparé (colonne) : le podium reste, le score et la comparaison aussi", oc.includes("toi 2 – 2") && compte(oc, 'class="puce"') === 3 && oc.includes('aria-pressed="true"'));
  const ob = lu(rend(<RadarAutre d={AUTRE} f="bande" ouvert />));
  check("radar comparé (bande) : le score à droite du titre, avant le bouton", ob.includes("toi 2 – 2") && ob.indexOf("toi 2 – 2") < ob.indexOf("<button") && ob.indexOf(">Statistiques<") < ob.indexOf("toi 2 – 2"));

  const a = r(RadarBloc, APERCU, "tuile");
  check("radar en aperçu : bouton grisé, « Ici, la personne qui regarde peut se comparer »", a.includes('disabled=""') && a.includes('title="Ici, la personne qui regarde peut se comparer"') && !a.includes("Aucune de tes matières"));
  const vide = r(RadarBloc, { ...RICHE_TOI, radar: { ...RICHE.radar, miennes: null }, toi: { ...TOI_EXEMPLE, stats: { ...TOI_EXEMPLE.stats, matieres: [] } } }, "tuile");
  check("radar : aucune de tes matières mesurée, bouton grisé avec sa raison", vide.includes('disabled=""') && vide.includes("Aucune de tes matières n'est encore mesurée"));
  const anonyme = r(RadarBloc, { ...RICHE, viewerId: null, radar: { ...RICHE.radar, miennes: null } }, "tuile");
  check("radar : visiteur non connecté, pas de bouton", !anonyme.includes("<button"));

  // chez soi : le même dessin, sans « Me comparer »
  const st = r(RadarBloc, SOI, "tuile");
  check("radar chez soi (tuile) : le même dessin, « Statistiques », le radar seul, sans bouton ni score", st.includes(">Statistiques</h3>") && st.includes('aria-label="Tes 10 matières"') && !st.includes("<button") && !st.includes("toi 2") && !st.includes("Tes matières"));
  check("radar chez soi : la moyenne en pointillés, aucun vert, aucun rouge", st.includes('stroke-dasharray="3.5 4"') && !st.includes("var(--gain)") && !st.includes("var(--perte)"));
  check("radar chez soi : le détail en repli, « Les 10 matières », fermé", st.includes("Les 10 matières</summary>") && !st.includes("<details open"));
  const sh = r(RadarBloc, SOI, "heros");
  check("radar chez soi (héros) : le podium « Tes plus sûres » à côté du radar, plus de « en tête » ni « À reprendre »", sh.includes(">Tes plus sûres</p>") && sh.includes('class="ensemble"') && compte(sh, 'class="puce"') === 3 && !sh.includes("en tête") && !sh.includes("À reprendre"));
  check("radar chez soi : les 10 matières en barres dans le repli, avec leur moyenne", sh.includes("Les 10 matières</summary>") && sh.includes("moyenne des joueurs : 66 %") && !sh.includes("var(--gain)"));
  const sc = r(RadarBloc, SOI, "colonne");
  check("radar chez soi (colonne) : le podium dessous, plus de forme de tuile imposée", sc.includes(">Tes plus sûres</p>") && sc.includes("--max:340px"));
  check("radar : chez un autre, pas de repli des 10 matières (propre au propriétaire)", !r(RadarBloc, AUTRE, "heros").includes("Les 10 matières</summary>"));
}

// ── Amis : « Le nombre et la pile » ──
{
  // le cercle de Sforzinda : 6e sur 25 ; 12 amis montrés sur 23
  const t = r(AmisBloc, AUTRE, "tuile");
  check("amis (tuile) : le total « 23 » en grand, « amis · 6e de son cercle par ELO »", t.includes('nombre" title="Par ELO, dans le cercle de Sforzinda : 6e sur 25">23</span>') && t.includes('<span>amis</span> · <b class="rang">6e</b> de son cercle par ELO'));
  check("amis (tuile) : l'infobulle de la place, sans toi", t.includes("Par ELO, dans le cercle de Sforzinda : 6e sur 25") && !t.includes("si tu en étais"));
  check("amis (tuile) : 6 avatars qui se chevauchent, la pastille « +17 »", compte(t, 'class="visage"') === 6 && t.includes('class="pile pileTuile"') && t.includes(">+17</li>") && t.includes('aria-label="et 17 autres"'));
  check("amis (tuile) : les liens vers les profils, pseudo et ELO en infobulle", t.includes('href="/people/ami-0"') && t.includes('title="Nadia T. · 1 472"') && !t.includes(">Nadia T.<") && !t.includes("Gérer mes amis"));
  check("amis (tuile) : triés par ELO (Inès B. d'abord), le premier au-dessus", t.indexOf("Inès B.") < t.indexOf("Hugo P.") && t.includes("--z:7;--k:0") && t.includes("--z:2;--k:5"));
  check("amis (tuile) : plus de point d'ami commun, de « toi », d'« en commun », d'illustration", !t.includes("en commun") && !t.includes('class="point"') && !t.includes('class="legende"') && !t.includes("joueurs-seigneurie"));
  check("amis (tuile) : le nombre et la pile en bas, sous l'étiquette", t.indexOf(">Amis</h3>") < t.indexOf('class="bas"') && t.indexOf('class="bas"') < t.indexOf('class="pile'));

  const h = r(AmisBloc, AUTRE, "heros");
  check("amis (héros) : 10 avatars, la pastille « +13 », le nombre à côté de la pile", compte(h, 'class="visage"') === 10 && h.includes('class="pile pileCote"') && h.includes(">+13</li>") && h.indexOf('class="total"') < h.indexOf('class="pile'));
  const b = r(AmisBloc, AUTRE, "bande");
  check("amis (bande) : 10 avatars, des plus grands (52 px)", compte(b, 'class="visage"') === 10 && b.includes("--t:52px") && b.includes(">+13</li>"));
  const c = r(AmisBloc, AUTRE, "colonne");
  check("amis (colonne) : 10 avatars sur deux rangées (la seconde décalée), la pastille à la fin", compte(c, 'class="visage"') === 10 && c.includes('class="pile decalee"') && compte(c, '<ul class="pile') === 2 && c.includes(">+13</li>") && c.indexOf(">+13</li>") > c.indexOf("decalee"));
  const dm = r(AmisBloc, AUTRE, "demi");
  check(
    "amis (demi) : « Amis » / « 23 » / « 6e de son cercle », la pile de 10 (6 au téléphone), sans jeton",
    dm.includes(">Amis</span>") && dm.includes(">23</span>") && dm.includes(">6e de son cercle</span>") && compte(dm, 'class="visage"') === 10 && compte(dm, 'class="horsTel"') === 4 && dm.includes(">+13</li>") && dm.includes("pileDemi"),
  );

  const ap = r(AmisBloc, APERCU, "tuile");
  check("amis en aperçu : le total « 23 » et « amis », sans place (pas de cercle), rien sur toi", ap.includes(">23</span>") && ap.includes("<span>amis</span></p>") && !ap.includes("de son cercle") && !ap.includes("toi"));
  const apc = r(AmisBloc, { ...RICHE_TOI, toi: null, apercu: true }, "tuile");
  check("amis en aperçu avec cercle : la même place « 6e », sans « toi ± »", apc.includes('<b class="rang">6e</b> de son cercle par ELO') && !apc.includes("toi ±"));
  const peu = r(AmisBloc, { ...RICHE_TOI, amis: { amis: RICHE_TOI.amis!.amis.slice(0, 2), total: 2 } }, "tuile");
  check("amis : moins de 3 amis, le total sans place ni pastille", peu.includes(">2</span>") && !peu.includes("de son cercle") && compte(peu, 'class="visage"') === 2 && !peu.includes('class="plus"'));
  const trois: DonneesBlocs = { ...RICHE_TOI, amis: { amis: RICHE_TOI.amis!.amis.slice(0, 3), total: 3, cercle: { lui: 2, toi: 4, taille: 4 } } };
  check("amis : 3 amis, la place est dite, pas de pastille", r(AmisBloc, trois, "tuile").includes('<b class="rang">2e</b> de son cercle') && !r(AmisBloc, trois, "tuile").includes('class="plus"'));
  const un = r(AmisBloc, { ...RICHE_TOI, amis: { amis: RICHE_TOI.amis!.amis.slice(0, 1), total: 1 } }, "tuile");
  check("amis : un seul ami, « ami » au singulier", un.includes("<span>ami</span>") && !un.includes("<span>amis</span>"));
  const pasMontres: DonneesBlocs = { ...RICHE_TOI, amis: { amis: [], total: 5 } };
  check("amis : le total sans avatars montrés, le nombre seul", r(AmisBloc, pasMontres, "heros").includes(">5</span>") && !r(AmisBloc, pasMontres, "heros").includes('class="visage"'));
  const aucun = r(AmisBloc, { ...RICHE_TOI, amis: { amis: [], total: 0 } }, "tuile");
  check("amis : aucun ami, « Pas encore d'amis. »", aucun.includes("Pas encore d'amis.") && !aucun.includes("Gérer mes amis"));
  const aucunSoi = r(AmisBloc, { ...SOI, amis: { amis: [], total: 0 } }, "tuile");
  check("amis chez soi : aucun ami, l'invitation et « Gérer mes amis »", aucunSoi.includes("Pas encore d'amis : ajoute") && aucunSoi.includes("Gérer mes amis"));
  check("amis : sans données, rien en vue publique ; l'état vide en édition", r(AmisBloc, { ...RICHE, amis: null }, "tuile") === "" && r(AmisBloc, { ...RICHE, amis: null }, "tuile", true).includes("rien à montrer"));
  const sansElo = r(AmisBloc, { ...RICHE, amis: { amis: [...RICHE.amis!.amis].reverse(), total: 23 } }, "tuile");
  check("amis : sans ELO, l'ordre reçu est gardé, l'infobulle sans ELO", sansElo.indexOf("Jade N.") < sansElo.indexOf("Omar F.") && sansElo.includes('title="Jade N."'));

  // chez soi : le même dessin, « Gérer mes amis » en plus
  const s = r(AmisBloc, SOI, "tuile");
  check("amis chez soi (tuile) : le même dessin (le nombre, la pile), « Gérer mes amis » en plus", s.includes(">23</span>") && compte(s, 'class="visage"') === 6 && s.includes("Gérer mes amis") && s.includes('href="/people?view=amis"'));
  check("amis chez soi : « de ton cercle par ELO » (la place est la sienne)", s.includes("de ton cercle par ELO") && !s.includes("de son cercle"));
  const sb = r(AmisBloc, { ...SOI, amis: { ...SOI.amis!, amis: [...SOI.amis!.amis].reverse() } }, "bande");
  check("amis chez soi : triés par ELO", sb.indexOf("Inès B.") < sb.indexOf("Hugo P.") && sb.indexOf("Hugo P.") < sb.indexOf("Clara S."));
  const sd = r(AmisBloc, SOI, "demi");
  check("amis chez soi (demi) : « Amis » / « 23 » / « Gérer › », puis la pile", sd.includes(">23</span>") && sd.includes(">Gérer ›</a>") && sd.includes('href="/people?view=amis"') && compte(sd, 'class="visage"') === 10);
  check("amis chez un autre : pas de « Gérer mes amis »", !r(AmisBloc, AUTRE, "bande").includes("Gérer") && !r(AmisBloc, AUTRE, "demi").includes("Gérer"));
  const sc = r(AmisBloc, SOI, "colonne");
  check("amis chez soi (colonne) : le lien « Gérer mes amis » en bas", sc.includes("Gérer mes amis") && sc.indexOf("Gérer mes amis") > sc.indexOf("decalee"));
}

// ── Folio : « Au musée » ──
{
  const fo = RICHE.folio!;
  const t = r(FolioBloc, AUTRE, "tuile");
  check("folio (tuile) : le cadre (filet doré, passe-partout), la planche, le cartel", t.includes('class="cadre') && t.includes('class="passe"') && t.includes("--m2:#E2B13B") && t.includes('class="cartel"'));
  check("folio (tuile) : le nom en gras et « Léonard de Vinci », sans « Planche portée »", t.includes(`<span class="nom">${fo.nom}</span>`) && t.includes(">Léonard de Vinci</span>") && !t.includes("Planche portée"));
  check("folio (tuile) : l'anecdote en infobulle, pas en texte", t.includes(`title="${fo.anecdote.join(" ")}"`) && !t.includes(`>${fo.anecdote[0]}<`));
  check("folio (tuile) : plus de badge « à toi aussi » ni « pas à toi »", !t.includes("à toi aussi") && !t.includes("pas à toi"));
  const avecOeuvre = r(FolioBloc, { ...AUTRE, folio: { ...fo, nom: "Maître des eaux", oeuvre: "Études de tourbillons d'eau" } }, "tuile");
  check("folio : le nom, puis l'œuvre en italique, puis l'auteur", avecOeuvre.indexOf(">Maître des eaux<") < avecOeuvre.indexOf('class="oeuvre">Études de tourbillons') && avecOeuvre.indexOf('class="oeuvre"') < avecOeuvre.indexOf('class="auteur"'));
  check("folio : l'œuvre n'est pas répétée quand elle porte le même nom", !t.includes('class="oeuvre"'));
  const c = r(FolioBloc, AUTRE, "colonne");
  check("folio (colonne) : le cadre centré, le cartel, le repli « L'histoire » fermé avec l'anecdote", c.includes('class="colonne"') && c.includes("cadreColonne") && c.includes("L'histoire</summary>") && c.includes(`>${fo.anecdote[0]}<`) && !c.includes("<details open"));
  const h = r(FolioBloc, AUTRE, "heros");
  check("folio (héros) : le cadre à gauche, le nom en grand, l'anecdote sous le cartel (les deux lignes)", h.includes('class="heros"') && h.includes('class="nomGrand"') && h.includes(`>${fo.anecdote[0]}<`) && h.includes(`>${fo.anecdote[1]}<`) && h.indexOf('class="cartel"') < h.indexOf(`>${fo.anecdote[0]}<`));
  const dm = r(FolioBloc, AUTRE, "demi");
  check("folio (demi) : la vignette encadrée, le nom, l'auteur ; l'anecdote en infobulle seulement", dm.includes('class="cadre vignette"') && dm.includes(fo.nom) && dm.includes(">Léonard de Vinci</span>") && !dm.includes(`>${fo.anecdote[0]}<`) && dm.includes(`title="${fo.anecdote.join(" ")}"`));
  // le badge ne revient pas, même si la donnée existe
  const badge = r(FolioBloc, { ...AUTRE, toi: { ...AUTRE.toi!, folio: true } }, "heros") + r(FolioBloc, { ...AUTRE, toi: { ...AUTRE.toi!, folio: false } }, "demi");
  check("folio : même avec toi.folio, aucun badge", !badge.includes("à toi aussi") && !badge.includes("pas à toi"));
  // chez soi : le même dessin
  const s = r(FolioBloc, SOI, "tuile");
  check("folio chez soi (tuile) : le même dessin, plus de « Planche portée », l'anecdote en infobulle", s.includes('class="cadre') && !s.includes("Planche portée") && !s.includes(`>${fo.anecdote[0]}<`) && s.includes(`title="${fo.anecdote.join(" ")}"`));
  const sh = r(FolioBloc, SOI, "heros");
  check("folio chez soi (héros) : l'anecdote sous le cartel comme chez un autre", sh.includes(`>${fo.anecdote[0]}<`) && sh.includes('class="nomGrand"'));
  const sd = r(FolioBloc, SOI, "demi");
  check("folio chez soi (demi) : comme chez un autre, sans l'anecdote en texte", sd.includes('class="cadre vignette"') && !sd.includes(`>${fo.anecdote[0]}<`));
  // une planche avec son image
  const img = r(FolioBloc, { ...AUTRE, folio: { ...fo, image: "/folios/tourbillons.webp" } }, "tuile");
  check("folio : avec son image, la planche dans le passe-partout", img.includes('src="/folios/tourbillons.webp"') && img.indexOf('class="passe"') < img.indexOf("<img"));
  check("folio : sans folio, rien en vue publique ; l'invitation en édition", r(FolioBloc, SOBRE, "tuile") === "" && r(FolioBloc, { ...SOBRE, moi: true }, "tuile", true).includes("Aucun folio porté") && r(FolioBloc, { ...SOBRE, moi: true }, "demi", true).includes("Aucun folio porté"));
}

// ── Saisons : « Écussons » ──
{
  // Sforzinda : saison 3, pic Platine II (1 502) ; gravées S2 Diamant III (5e sur 212), S1 Or I (19e sur 168)
  const t = r(SaisonsBloc, AUTRE, "tuile");
  check("saisons (tuile) : le titre « Saisons » et le repère « 2 gravées »", t.includes(">Saisons</h3>") && t.includes(">2 gravées</span>"));
  check("saisons (tuile) : trois écussons, du plus ancien au plus récent (S1, S2, S3)", compte(t, "<li class=\"ecu") === 3 && t.indexOf("S1 · Or I") < t.indexOf("S2 · Diamant III") && t.indexOf("S2 · Diamant III") < t.indexOf("S3 · Platine II"));
  check("saisons (tuile) : le numéro et le palier dessous, la place « 19e / 168 », « 5e / 212 », « en cours »", t.includes(">S1 · Or I</b>") && t.includes(">19e / 168</span>") && t.includes(">5e / 212</span>") && t.includes('<span class="place">en cours</span>'));
  check("saisons (tuile) : les couleurs du métal de chaque palier (Or, Diamant, Platine)", t.includes("--m1:#FFF3B0;--m2:#E2B13B;--m3:#875611") && t.includes("--m1:#F4F8FF;--m2:#AFC0F5;--m3:#5A5CC0") && t.includes("--m1:#FFFFFF;--m2:#D9E1E8;--m3:#7B8896"));
  check("saisons (tuile) : un écusson hexagonal, la division au centre", compte(t, "<polygon") >= 9 && t.includes(">I</text>") && t.includes(">III</text>") && t.includes(">II</text>"));
  check("saisons (tuile) : la saison en cours respire (classe « cours »)", compte(t, 'class="ecu cours"') === 1);
  check("saisons (tuile) : les infobulles (gravées et saison en cours)", t.includes("S2 · Diamant III · 5e sur 212") && t.includes("S1 · Or I · 19e sur 168") && t.includes("Saison 3 · Mai 2027 · en cours, pic Platine II"));
  check("saisons (tuile) : plus de jeton, de score, de sceau ni de « pic de saison »", !t.includes("class=\"jeton\"") && !t.includes("pic de saison") && !t.includes("Février 2027") && !t.includes("Ses saisons") && !t.includes("Tes saisons"));
  const plus = (n: number): DonneesBlocs => ({
    ...AUTRE,
    saisons: {
      courante: { ...RICHE.saisons!.courante!, numero: n + 1, cle: `s${n + 1}` },
      palmares: Array.from({ length: n }, (_, i) => ({ ...RICHE.saisons!.palmares[0], cle: `s${i + 1}`, numero: i + 1, place: i + 1 })).reverse(),
    },
  });
  const cinq = r(SaisonsBloc, plus(5), "tuile");
  check("saisons (tuile) : trois au plus, les plus récentes (S5, S6 en cours… S4)", compte(cinq, "<li class=\"ecu") === 3 && cinq.includes(">S4 ·") && cinq.includes(">S5 ·") && cinq.includes(">S6 ·") && !cinq.includes(">S3 ·"));
  const c = r(SaisonsBloc, AUTRE, "colonne");
  check("saisons (colonne) : une grille d'écussons, le lien « Ses saisons »", c.includes('class="grille"') && compte(c, "<li class=\"ecu") === 3 && c.includes("Ses saisons") && c.includes("onglet=sceaux"));
  check("saisons (colonne) : six au plus", compte(r(SaisonsBloc, plus(8), "colonne"), "<li class=\"ecu") === 6);
  const b = r(SaisonsBloc, AUTRE, "bande");
  check("saisons (bande) : les écussons en ligne, huit au plus", b.includes('class="ligne"') && compte(b, "<li class=\"ecu") === 3 && compte(r(SaisonsBloc, plus(10), "bande"), "<li class=\"ecu") === 8);
  const dm = r(SaisonsBloc, AUTRE, "demi");
  check("saisons (demi) : « Saison 3 » / « Platine II » / « pic 1 502 », sans jeton ni score", dm.includes(">Saison 3</span>") && dm.includes(">Platine II</span>") && dm.includes(">pic 1 502</span>") && !dm.includes('class="score"'));
  check("saisons (demi) : de petits écussons (S1, S2, S3) et leur place", dm.includes('class="demiRangee"') && dm.includes(">S1</b>") && dm.includes(">S3</b>") && dm.includes(">19e / 168</span>") && !dm.includes("<text"));
  const pc = r(SaisonsBloc, { ...AUTRE, saisons: { ...RICHE.saisons!, courante: { ...RICHE.saisons!.courante!, moi: null } } }, "tuile");
  check("saisons : pas classée cette saison, un écusson en pointillés et « S3 · Pas classée »", pc.includes("S3 · Pas classée") && pc.includes('stroke-dasharray="4 4"') && pc.includes(">—</text>") && pc.includes("pas de match classé"));
  const pcd = r(SaisonsBloc, { ...AUTRE, saisons: { ...RICHE.saisons!, courante: { ...RICHE.saisons!.courante!, moi: null } } }, "demi");
  check("saisons (demi) : pas classée, « Pas classée » et « pas de match classé »", pcd.includes("Pas classée") && pcd.includes("pas de match classé"));
  const seul = r(SaisonsBloc, { ...AUTRE, saisons: { courante: null, palmares: RICHE.saisons!.palmares } }, "tuile");
  check("saisons : sans saison en cours, seulement les gravées (S1, S2)", compte(seul, "<li class=\"ecu") === 2 && !seul.includes('class="ecu cours"'));
  const seulD = r(SaisonsBloc, { ...AUTRE, saisons: { courante: null, palmares: RICHE.saisons!.palmares } }, "demi");
  check("saisons (demi) : sans saison en cours, « Saisons » et « — »", seulD.includes(">Saisons</span>") && seulD.includes(">—</span>"));
  const sansJoueurs = r(SaisonsBloc, { ...AUTRE, saisons: { courante: null, palmares: [{ ...RICHE.saisons!.palmares[0], joueurs: null }] } }, "tuile");
  check("saisons : sans nombre de joueurs, la place seule (« 5e »)", sansJoueurs.includes('<span class="place">5e</span>') && sansJoueurs.includes("S2 · Diamant III · 5e"));
  const top: DonneesBlocs = { ...AUTRE, saisons: { courante: null, palmares: [{ ...RICHE.saisons!.palmares[0], pic: { palier: 7, division: null } }] } };
  check("saisons : un Top 10 (sans division) montre « 10 » au centre", r(SaisonsBloc, top, "tuile").includes(">10</text>") && r(SaisonsBloc, top, "tuile").includes("S2 · Top 10"));
  const apercu = r(SaisonsBloc, APERCU, "tuile");
  check("saisons en aperçu : le même dessin, sans « toi ± » ni « toi – – »", apercu.includes(">S3 · Platine II</b>") && !apercu.includes("toi"));
  // chez soi : le même dessin, le lien « Tes saisons » en plus
  const s = r(SaisonsBloc, SOI, "tuile");
  check("saisons chez soi (tuile) : les mêmes écussons, « Tes saisons » en plus, plus de « pic de saison »", s.includes(">S3 · Platine II</b>") && s.includes(">19e / 168</span>") && s.includes("Tes saisons") && !s.includes("pic de saison") && !s.includes("Sceau de saison"));
  check("saisons chez soi (colonne, bande) : « Tes saisons »", r(SaisonsBloc, SOI, "colonne").includes("Tes saisons") && r(SaisonsBloc, SOI, "bande").includes("Tes saisons") && !r(SaisonsBloc, SOI, "bande").includes("Ses saisons"));
  const sd = r(SaisonsBloc, SOI, "demi");
  check("saisons chez soi (demi) : « Saison 3 » / « Platine II » / « pic 1 502 », puis les écussons", sd.includes(">Platine II</span>") && sd.includes(">pic 1 502</span>") && sd.includes(">19e / 168</span>") && sd.includes(">5e / 212</span>"));
  check("saisons : sans saison, rien en vue publique ; l'état vide en édition", r(SaisonsBloc, { ...RICHE, saisons: null }, "tuile") === "" && r(SaisonsBloc, { ...RICHE, saisons: null }, "tuile", true).includes("rien à montrer"));
  const sobre = r(SaisonsBloc, SOBRE, "tuile");
  check("saisons : une saison en cours sans match classé et sans gravée, un seul écusson en pointillés", compte(sobre, "<li class=\"ecu") === 1 && sobre.includes("Pas classée"));
}

// ── Les feuilles de style : chaque classe employée existe, les animations se coupent ──
{
  const src = (f: string) => readFileSync(`components/profil/blocs/${f}`, "utf8");
  const pairs: [string, string, string[]][] = [
    ["radar.module.css", "r", ["Radar.tsx", "RadarCompact.tsx"]],
    ["amis.module.css", "a", ["Amis.tsx"]],
    ["folio.module.css", "fl", ["Folio.tsx"]],
    ["saisons.module.css", "sa", ["Saisons.tsx"]],
  ];
  for (const [css, v, fichiers] of pairs) {
    const feuille = src(css);
    const definies = new Set([...feuille.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((m) => m[1]));
    const utilisees = new Set(fichiers.flatMap((f) => [...src(f).matchAll(new RegExp(`\\b${v}\\.([A-Za-z_]\\w*)`, "g"))].map((m) => m[1])));
    const manquantes = [...utilisees].filter((c) => !definies.has(c));
    check(`${css} : toutes les classes employées existent`, manquantes.length === 0, manquantes.join(", "));
    check(`${css} : les animations se coupent sous prefers-reduced-motion`, !/animation\s*:/.test(feuille) || feuille.includes("prefers-reduced-motion: reduce"));
    check(`${css} : pas de couleur codée en dur hors cadre et métaux (hors Folio)`, css === "folio.module.css" || !/#[0-9a-fA-F]{3,8}\b/.test(feuille.replace(/\/\*[\s\S]*?\*\//g, "")));
    check(`${css} : pas de chemin local ni de scratchpad`, !/AppData|scratchpad/i.test(feuille));
  }
  const tsx = ["Radar.tsx", "Amis.tsx", "Folio.tsx", "Saisons.tsx"].map(src).join("\n");
  check("blocs : pas de Date.now, de Math.random ni de toLocaleString", !/Date\.now|Math\.random|toLocaleString/.test(tsx));
  check("blocs : aucun chemin local ni de scratchpad", !/AppData|scratchpad/i.test(tsx));
}

console.log(ko ? `\n${ko} échec(s)` : "\nTout est vert.");
process.exit(ko ? 1 : 0);
