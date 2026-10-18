import Link from "next/link";
import { ScrollText, Stamp } from "lucide-react";
import { Icone, type IconeNom } from "@/components/adn/icons";
import { JourRelatif } from "@/components/profil/JourRelatif";
import { couleurCss } from "@/lib/profil/catalogue";
import { defSceau } from "@/lib/profil/sceaux";
import { hrefOnglet } from "@/lib/profil/onglets";
import { TIERS } from "@/lib/ranks";
import { decaleJour } from "@/lib/objectif-calc";
import { ecart } from "@/lib/profil/ecart";
import type { DonneesBlocs, ExtraitJournal } from "@/lib/profil/blocs-donnees";
import type { EvenementJournal } from "@/lib/profil/journal";
import type { Format } from "@/lib/profil/disposition";
import { signe } from "@/lib/voice";
import { BLOCS_PROFIL as T } from "@/lib/voice-blocs";
import { BLOCS_JOURNAL as V } from "@/lib/voice-blocs-journal";
import { JOURNAL, PALIERS, condition, jourCourt, nomSceau } from "@/lib/voice-profil";
import { Cellule, Chiffre, Coque, DEUX_LIGNES, DemiBande, DoubleCourbe, Etiquette, Jeton, Lien, Repere, Vide, maCouleur, type Ctx, type Serie } from "./commun";
import s from "./Journal.module.css";

// Le bloc Journal de la page de profil : un extrait de l'onglet (la courbe
// d'ELO des 90 jours, les derniers événements, le lien). Chez un autre :
// « monte-t-il en classé, et plus vite que moi ? » : le chiffre fort est son
// ELO gagné en 90 jours (« +84 »), le jeton ton écart (« toi −72 »), la
// courbe double l'ELO réel des deux sur un même axe de dates et une même
// échelle (la sienne épaisse à l'encre, la tienne fine à ta couleur), un
// point à chaque croisement ; les événements qui te concernent en tête.
// Chez soi : l'existant (repère « +84 ELO · 90 j », courbe, événements,
// lien). Formats : mini-tuile, colonne, héros, demi-bande (la bande est
// refusée ; reçue quand même, elle se rend comme le héros).
// Sans état : rendu au serveur comme au client.

const W = 600;

/** Le jour de référence (aujourd'hui, Paris) : celui du visiteur, sinon celui du carnet, sinon le dernier point. */
function aujourdhuiDe(d: DonneesBlocs, ...listes: (string[] | undefined)[]): string | null {
  const vu = d.toi?.aujourdhui ?? d.carnet?.aujourdhui ?? null;
  if (vu) return vu;
  const tous = listes.flatMap((l) => l ?? []).sort();
  return tous.length ? tous[tous.length - 1] : null;
}

/**
 * Une courbe d'ELO des 90 jours sur l'axe des dates : le départ au premier
 * jour, chaque match à son jour, puis l'ELO tenu jusqu'à aujourd'hui (pour
 * que les deux courbes couvrent le même temps). null sans les jours.
 */
export function serieElo(c: { depart: number; points: number[]; dates?: string[] }, aujourdhui: string | null): Serie | null {
  if (!c.dates || c.dates.length !== c.points.length) return null;
  const fin = aujourdhui ?? c.dates[c.dates.length - 1] ?? null;
  if (!fin) return null;
  let debut = decaleJour(fin, -90);
  if (c.dates.length && c.dates[0] < debut) debut = c.dates[0];
  const dates = [debut, ...c.dates];
  const valeurs = [c.depart, ...c.points];
  const derniere = dates[dates.length - 1];
  if (fin > derniere) {
    dates.push(fin);
    valeurs.push(valeurs[valeurs.length - 1]);
  }
  return { dates, valeurs };
}

/** L'ELO gagné sur la courbe (le dernier point moins le départ ; 0 sans match). */
const gain = (c: { depart: number; points: number[] }) => (c.points.length ? c.points[c.points.length - 1] : c.depart) - c.depart;

export type Croisement = { x: number; y: number; jour: string; sens: "lui" | "toi" };

/**
 * Les croisements des deux courbes, aux coordonnées de DoubleCourbe (même
 * axe, même échelle, même calcul) : « lui » quand il passe devant, « toi »
 * quand tu passes devant ; le jour est celui du point qui achève le passage.
 */
export function croisements(lui: Serie, toi: Serie, h: number): Croisement[] {
  const toutes = [...lui.dates, ...toi.dates].sort();
  if (!toutes.length || lui.valeurs.length < 2 || toi.valeurs.length < 2) return [];
  const t0 = Date.parse(toutes[0] + "T12:00:00Z");
  const t1 = Date.parse(toutes[toutes.length - 1] + "T12:00:00Z");
  const vals = [...lui.valeurs, ...toi.valeurs];
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = (max - min) * 0.12 || 10;
  const y = (v: number) => 4 + (1 - (v - (min - pad)) / (max - min + 2 * pad)) * (h - 8);
  // les abscisses : celles de DoubleCourbe (plusieurs points le même jour, répartis dans la journée)
  const xs = (sr: Serie) =>
    sr.dates.map((j, i) => {
      const t = Date.parse(j + "T12:00:00Z");
      const meme = sr.dates.filter((x) => x === j);
      const rang = sr.dates.slice(0, i).filter((x) => x === j).length;
      const dt = t1 > t0 ? ((t - t0 + (rang / Math.max(1, meme.length)) * 86400000) / (t1 - t0 + 86400000)) * W : (i / Math.max(1, sr.dates.length - 1)) * W;
      return Math.max(0, Math.min(W, dt));
    });
  const xl = xs(lui);
  const xt = xs(toi);
  // la valeur d'une courbe en x (interpolée entre ses points)
  const en = (x: number, px: number[], v: number[]) => {
    if (x <= px[0]) return v[0];
    for (let i = 1; i < px.length; i++) {
      if (x <= px[i]) {
        const dx = px[i] - px[i - 1];
        return dx > 0 ? v[i - 1] + ((x - px[i - 1]) / dx) * (v[i] - v[i - 1]) : v[i];
      }
    }
    return v[v.length - 1];
  };
  const debut = Math.max(xl[0], xt[0]);
  const fin = Math.min(xl[xl.length - 1], xt[xt.length - 1]);
  if (fin <= debut) return [];
  const echantillons = [
    ...xl.map((x, i) => ({ x, jour: lui.dates[i] })),
    ...xt.map((x, i) => ({ x, jour: toi.dates[i] })),
  ]
    .filter((e) => e.x >= debut && e.x <= fin)
    .sort((a, b) => a.x - b.x || (a.jour < b.jour ? -1 : 1));
  const out: Croisement[] = [];
  let avant: { x: number; diff: number } | null = null;
  let signeAvant = 0;
  for (const e of echantillons) {
    const diff = en(e.x, xl, lui.valeurs) - en(e.x, xt, toi.valeurs);
    const sg = Math.sign(diff);
    if (sg !== 0 && signeAvant !== 0 && sg !== signeAvant && avant) {
      const x = avant.diff === 0 || e.x === avant.x ? avant.x : avant.x + ((e.x - avant.x) * avant.diff) / (avant.diff - diff);
      out.push({ x, y: y(en(x, xl, lui.valeurs)), jour: e.jour, sens: sg > 0 ? "lui" : "toi" });
    }
    if (sg !== 0) signeAvant = sg;
    avant = { x: e.x, diff };
  }
  return out;
}

/** L'ancienne courbe du bloc (chez soi) : l'ELO à la couleur du joueur, un lavis dessous. */
function CourbeAccent({ v, accent, h }: { v: number[]; accent: string; h: number }) {
  const min = Math.min(...v) - 10;
  const max = Math.max(...v) + 10;
  const pts = v.map((y, i) => `${((i / Math.max(1, v.length - 1)) * 100).toFixed(2)},${(((max - y) / (max - min)) * h).toFixed(2)}`);
  return (
    <svg viewBox={`0 0 100 ${h}`} preserveAspectRatio="none" className="block w-full" style={{ height: h }} aria-hidden>
      <polyline points={`0,${h} ${pts.join(" ")} 100,${h}`} fill={`color-mix(in oklab, ${accent} 14%, transparent)`} stroke="none" />
      <polyline points={pts.join(" ")} fill="none" stroke={accent} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * La courbe chez un autre : son ELO réel épais, le tien fin, un point de
 * 4 px à chaque croisement (« Inès t'a dépassé le 12 sept. »). Sans les
 * jours (données d'avant) : sa courbe seule, à l'ancienne. Aucun match des
 * deux côtés : la phrase calme.
 */
function CourbeDouble({ d, h, bornes = true }: { d: DonneesBlocs; h: number; bornes?: boolean }) {
  const j = d.journal!;
  const ce = d.toi?.courbeElo ?? null;
  const jour = aujourdhuiDe(d, j.dates, ce?.dates);
  const lui = serieElo(j, jour);
  const toi = ce ? serieElo(ce, jour) : null;
  const calmeLui = j.points.length === 0;
  const calmeToi = !ce || ce.points.length === 0;
  if (calmeLui && calmeToi) return <p className="t-small m-0">{JOURNAL.calme}</p>;
  if (!lui) return calmeLui ? <p className="t-small m-0">{JOURNAL.calme}</p> : <CourbeAccent v={[j.depart, ...j.points]} accent="var(--ink)" h={h} />;
  const deux = toi && toi.valeurs.length > 1 ? toi : null;
  const label = deux ? T.doubleTrait(d.nom) : JOURNAL.courbeDit(j.depart, lui.valeurs[lui.valeurs.length - 1], j.matchs90 ?? j.points.length);
  const croix = deux ? croisements(lui, deux, h) : [];
  return (
    <div className={s.courbe}>
      <DoubleCourbe lui={lui} toi={deux} couleurToi={maCouleur(d)} h={h} label={label} bornes={bornes} />
      {croix.map((c, i) => {
        const bulle = c.sens === "lui" ? V.teDepasse(d.nom, jourCourt(c.jour)) : V.tuDepasses(d.nom, jourCourt(c.jour));
        return (
          <span key={i} role="img" className={s.croix} style={{ left: `${(c.x / W) * 100}%`, top: c.y, color: c.sens === "lui" ? "var(--perte)" : "var(--gain)" }} title={bulle} aria-label={bulle}>
            <i />
          </span>
        );
      })}
    </div>
  );
}

const ICONE_EVT: Record<Exclude<EvenementJournal["type"], "sceau">, IconeNom> = { victoire: "duel", palier: "classement", serie: "serie" };

/** Le titre, le détail et l'écart d'une entrée (textes de l'onglet Journal). */
function ditEvenement(e: EvenementJournal, viewerId: string | null): { titre: string; detail: string | null; delta: number | null } {
  if (e.type === "victoire")
    return {
      titre: !e.adversaire ? JOURNAL.victoireSans : e.adversaire.id === viewerId ? JOURNAL.victoireContreToi : `${JOURNAL.victoireContre} ${e.adversaire.nom}`,
      detail: e.score ? JOURNAL.score(e.score[0], e.score[1]) : null,
      delta: e.delta,
    };
  if (e.type === "palier") return { titre: JOURNAL.palier(TIERS[e.palier]?.name ?? ""), detail: JOURNAL.palierTexte, delta: null };
  if (e.type === "sceau") {
    const def = defSceau(e.sceau);
    return { titre: JOURNAL.sceau(def ? `${nomSceau(def)} · ${PALIERS[e.palier]}` : e.sceau), detail: def ? condition(def, def.seuils[e.palier - 1]) : null, delta: null };
  }
  return { titre: JOURNAL.serieNotable(e.jours), detail: JOURNAL.serieTexte(e.jours), delta: null };
}

/** Chez un autre : les événements qui te concernent (« Victoire contre toi ») passent en tête, l'ordre gardé sinon. */
export function evenementsPour(d: DonneesBlocs, n: number): EvenementJournal[] {
  const evts = d.journal?.evenements ?? [];
  if (d.moi || !d.viewerId) return evts.slice(0, n);
  const toi = (e: EvenementJournal) => e.type === "victoire" && !!e.adversaire && e.adversaire.id === d.viewerId;
  return [...evts.filter(toi), ...evts.filter((e) => !toi(e))].slice(0, n);
}

function Evenements({ evts, d }: { evts: EvenementJournal[]; d: DonneesBlocs }) {
  if (!evts.length) return null;
  return (
    <ul className="m-0 list-none p-0">
      {evts.map((e) => {
        const x = ditEvenement(e, d.viewerId);
        return (
          <li key={e.cle} className="flex items-start gap-3 border-b border-line py-2.5 last:border-b-0">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line-2" aria-hidden>
              {e.type === "sceau" ? <Stamp size={15} /> : <Icone nom={ICONE_EVT[e.type]} size={16} />}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-[14px] font-semibold">{x.titre}</span>
                {x.delta !== null && (
                  <span className="font-mono text-[13px] font-semibold tabular-nums" style={{ color: x.delta >= 0 ? "var(--gain)" : "var(--perte)" }}>
                    {signe(x.delta)}
                  </span>
                )}
              </span>
              <span className="t-small" style={DEUX_LIGNES}>
                <JourRelatif jour={e.jour} />
                {x.detail ? ` · ${x.detail}` : ""}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Le lien de la demi-bande (« Tout le journal › »), et, dans Personnaliser, qui voit le Journal. */
function DroiteDemi({ d, edition }: { d: DonneesBlocs; edition: boolean }) {
  return (
    <span className="flex flex-col items-end gap-1 text-right">
      <Link href={hrefOnglet(d.id, "journal")} className="ink-link whitespace-nowrap text-[14px] font-semibold">
        {V.toutJournalCourt}
      </Link>
      {edition && <span className={"t-micro " + s.visible}>{T.visiblePar(d.visibiliteJournal)}</span>}
    </span>
  );
}

/** L'écart d'ELO gagné en 90 jours (chez un autre) : le jeton et son infobulle ; null si ta courbe n'est pas lue. */
function ecartJournal(d: DonneesBlocs, j: ExtraitJournal) {
  const lui = gain(j);
  const ce = d.toi?.courbeElo ?? null;
  const toi = ce ? gain(ce) : null;
  const e = d.toi && toi !== null ? ecart(lui, toi, "elo") : null;
  return {
    lui,
    e,
    bulle: e && toi !== null ? T.bulle(V.eloGagne, d.nom, signe(lui), signe(toi)) : undefined,
    // pas de jeton : le chiffre le dit en infobulle (visiteur connecté seulement)
    titre: d.toi && !e ? T.pasMesure : undefined,
  };
}

// ── Chez un autre ─────────────────────────────────────────────────────────
function JournalAutre({ d, f }: { d: DonneesBlocs; f: Format }) {
  const j = d.journal!;
  const { lui, e, bulle, titre } = ecartJournal(d, j);
  const chiffre = (
    <span className="flex flex-col gap-1">
      <Chiffre f={f} titre={titre}>
        {signe(lui)}
      </Chiffre>
      <Jeton e={e} d={d} bulle={bulle} taille={f === "heros" ? 16 : undefined} />
    </span>
  );
  if (f === "demi")
    return (
      <DemiBande label={T.journal} dessin={<CourbeDouble d={d} h={80} bornes={false} />} droite={<DroiteDemi d={d} edition={false} />}>
        <Cellule etiquette={V.elo90} chiffre={signe(lui)} jeton={<Jeton e={e} d={d} bulle={bulle} />} titre={titre} />
      </DemiBande>
    );
  const lien = <Lien href={hrefOnglet(d.id, "journal")}>{T.toutJournal}</Lien>;
  const etiquette = <Etiquette f={f} icone={<ScrollText size={17} aria-hidden />} titre={T.journal} />;
  if (f === "tuile")
    return (
      <Coque f={f} label={T.journal}>
        {etiquette}
        {chiffre}
        <CourbeDouble d={d} h={48} />
        <Evenements evts={evenementsPour(d, 1)} d={d} />
        {lien}
      </Coque>
    );
  if (f === "colonne")
    return (
      <Coque f={f} label={T.journal}>
        {etiquette}
        {chiffre}
        <CourbeDouble d={d} h={140} />
        <Evenements evts={evenementsPour(d, 4)} d={d} />
        {lien}
      </Coque>
    );
  // héros (et la bande, refusée, reçue quand même) : chiffre et jeton à gauche, 3 événements à droite, la courbe en pleine largeur
  return (
    <Coque f={f === "bande" ? "heros" : f} label={T.journal}>
      {etiquette}
      <div className={s.haut}>
        {chiffre}
        <Evenements evts={evenementsPour(d, 3)} d={d} />
      </div>
      <CourbeDouble d={d} h={120} />
      {lien}
    </Coque>
  );
}

// ── Chez soi : l'existant ────────────────────────────────────────────────
function JournalMoi({ d, f, edition }: Ctx) {
  const j = d.journal!;
  const accent = couleurCss(d.accent);
  const v = [j.depart, ...j.points];
  const ecartElo = v[v.length - 1] - j.depart;
  const calme = j.points.length === 0;
  if (f === "demi")
    return (
      <DemiBande
        label={T.journal}
        dessin={calme ? <p className="t-small m-0">{JOURNAL.calme}</p> : <CourbeAccent v={v} accent={accent} h={80} />}
        droite={<DroiteDemi d={d} edition={edition} />}
      >
        <Cellule etiquette={V.elo90} chiffre={signe(ecartElo)} petit={V.matchs(j.matchs90 ?? j.points.length)} />
      </DemiBande>
    );
  const compact = f === "tuile" || f === "colonne";
  const evenements = j.evenements.slice(0, f === "tuile" ? 3 : 4);
  return (
    <Coque f={f === "bande" ? "heros" : f} label={T.journal}>
      <Etiquette f={f} icone={<ScrollText size={17} aria-hidden />} titre={T.journal} droite={calme ? undefined : <Repere>{T.repereJournal(signe(ecartElo))}</Repere>} />
      {calme && evenements.length === 0 ? (
        <p className="t-small m-0">{JOURNAL.calme}</p>
      ) : (
        <div className={compact ? "flex flex-col gap-3" : s.deux}>
          {calme ? <p className="t-small m-0">{JOURNAL.calme}</p> : <CourbeAccent v={v} accent={accent} h={f === "tuile" ? 48 : f === "colonne" ? 140 : 96} />}
          <Evenements evts={evenements} d={d} />
        </div>
      )}
      {edition && <p className="t-micro m-0">{T.visiblePar(d.visibiliteJournal)}</p>}
      <Lien href={hrefOnglet(d.id, "journal")}>{T.toutJournal}</Lien>
    </Coque>
  );
}

/**
 * Le bloc Journal. Rien à montrer (non lu, ou Journal fermé à celui qui
 * regarde) : rien en vue publique, l'état vide dans Personnaliser.
 */
export function JournalBloc({ d, f, edition }: Ctx): React.ReactNode {
  if (!d.journal) return edition ? <Vide bloc={{ k: "journal", f }} f={f} icone={<ScrollText size={17} aria-hidden />} /> : null;
  if (d.moi) return <JournalMoi d={d} f={f} edition={edition} />;
  return <JournalAutre d={d} f={f} />;
}
