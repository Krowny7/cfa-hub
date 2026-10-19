import Link from "next/link";
import { ScrollText } from "lucide-react";
import { couleurCss } from "@/lib/profil/catalogue";
import { defSceau } from "@/lib/profil/sceaux";
import { hrefOnglet } from "@/lib/profil/onglets";
import { TIERS } from "@/lib/ranks";
import { decaleJour } from "@/lib/objectif-calc";
import type { DonneesBlocs, ExtraitJournal } from "@/lib/profil/blocs-donnees";
import type { EvenementJournal } from "@/lib/profil/journal";
import { signe } from "@/lib/voice";
import { BLOCS_PROFIL as T } from "@/lib/voice-blocs";
import { BLOCS_JOURNAL as V } from "@/lib/voice-blocs-journal";
import { JOURNAL, PALIERS, condition, jourCourt, nomSceau } from "@/lib/voice-profil";
import { Cellule, Coque, DemiBande, Lien, Vide, type Ctx } from "./commun";
import s from "./Journal.module.css";

// Le bloc Journal de la page de profil : « Courbe annotée ». Une étiquette
// (« Journal · ELO 90 j »), le gain d'ELO des 90 jours à droite (vert, rouge
// s'il a perdu), la courbe d'ELO de ses 90 jours (aire teintée à sa couleur,
// tracé qui se déroule, dernier point qui pulse) et, posés sur la courbe au
// jour où ils sont arrivés, ses derniers événements : des pastilles
// numérotées 1, 2, 3 de la plus ancienne à la plus récente, avec leur légende
// dessous (une ligne chacune). Mini-tuile : la courbe et un événement.
// Demi-bande : la cellule, la courbe et le lien. La bande est refusée ;
// reçue quand même, elle se rend comme le héros.
// Une seule rendue pour tous : chez soi et chez un autre, le même dessin
// (aucune comparaison) ; seul « Visible par » reste au propriétaire, dans
// Personnaliser. Journal fermé : rien en vue publique, l'état vide dans
// Personnaliser. Sans état : rendu au serveur comme au client.

export type Serie = { dates: string[]; valeurs: number[] };

const JOUR_MS = 86400000;
const midi = (j: string) => Date.parse(j + "T12:00:00Z");

/** Le jour de référence (aujourd'hui, Paris) : celui du carnet, sinon le dernier point. */
function aujourdhuiDe(d: DonneesBlocs, dates: string[] | undefined): string | null {
  if (d.carnet?.aujourdhui) return d.carnet.aujourdhui;
  const tous = [...(dates ?? [])].sort();
  return tous.length ? tous[tous.length - 1] : null;
}

/**
 * La courbe d'ELO des 90 jours sur l'axe des dates : le départ au premier
 * jour, chaque match à son jour, puis l'ELO tenu jusqu'à aujourd'hui. null
 * sans les jours (données d'avant).
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

// ── La courbe, en pourcentages d'une boîte (viewBox 0 0 100 100, étirée) ─────

export type Point = { x: number; y: number };
export type CourbeElo = {
  /** le tracé, puis l'aire fermée jusqu'au bas */
  chemin: string;
  aire: string;
  /** le dernier point */
  fin: Point;
  /** l'ordonnée de la courbe à l'abscisse x (en %) */
  yEn: (x: number) => number;
  /** l'abscisse d'un jour (en %), null sans l'axe des dates */
  xDuJour: (jour: string) => number | null;
};

/** la plage verticale de la courbe : de quoi poser une pastille au-dessus du sommet */
const Y_HAUT = 12;
const Y_BAS = 88;

function construire(xs: number[], valeurs: number[], xDuJour: (jour: string) => number | null): CourbeElo {
  const min = Math.min(...valeurs);
  const max = Math.max(...valeurs);
  const pad = (max - min) * 0.1 || 10;
  const lo = min - pad;
  const hi = max + pad;
  const ys = valeurs.map((v) => Y_BAS - ((v - lo) / (hi - lo)) * (Y_BAS - Y_HAUT));
  const f = (n: number) => n.toFixed(2);
  const chemin = xs.map((x, i) => `${i ? "L" : "M"}${f(x)},${f(ys[i])}`).join(" ");
  const yEn = (x: number) => {
    if (x <= xs[0]) return ys[0];
    for (let i = 1; i < xs.length; i++) {
      if (x <= xs[i]) {
        const dx = xs[i] - xs[i - 1];
        return dx > 0 ? ys[i - 1] + ((x - xs[i - 1]) / dx) * (ys[i] - ys[i - 1]) : ys[i];
      }
    }
    return ys[ys.length - 1];
  };
  return { chemin, aire: `${chemin} L${f(xs[xs.length - 1])},100 L${f(xs[0])},100 Z`, fin: { x: xs[xs.length - 1], y: ys[ys.length - 1] }, yEn, xDuJour };
}

/** La courbe sur l'axe des dates : plusieurs matchs le même jour sont répartis dans la journée ; le dernier point est au bord droit. */
export function courbeElo(serie: Serie): CourbeElo | null {
  const n = serie.valeurs.length;
  if (n < 2 || serie.dates.length !== n) return null;
  const t0 = midi(serie.dates[0]);
  const t1 = midi(serie.dates[n - 1]);
  const etendue = t1 - t0 + JOUR_MS;
  const brut = serie.dates.map((j, i) => {
    const meme = serie.dates.filter((x) => x === j).length;
    const rang = serie.dates.slice(0, i).filter((x) => x === j).length;
    return (midi(j) - t0 + (rang / Math.max(1, meme)) * JOUR_MS) / etendue;
  });
  const k = 100 / (Math.max(...brut) || 1);
  const xs = brut.map((b) => b * k);
  const xDuJour = (jour: string) => Math.max(0, Math.min(100, ((midi(jour) - t0) / etendue) * k));
  return construire(xs, serie.valeurs, xDuJour);
}

/** Sans les jours (données d'avant) : les matchs à égale distance, aucun événement posé. */
export function courbeParIndice(valeurs: number[]): CourbeElo | null {
  if (valeurs.length < 2) return null;
  return construire(valeurs.map((_, i) => (i / (valeurs.length - 1)) * 100), valeurs, () => null);
}

// ── Les événements posés sur la courbe ───────────────────────────────────

const titreEvenement = (e: EvenementJournal, viewerId: string | null): string => ditEvenement(e, viewerId).titre;

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

/** Les `n` derniers événements, rangés du plus ancien au plus récent (la pastille 1 est la plus à gauche). */
export function evenementsPosables(j: ExtraitJournal, n: number): EvenementJournal[] {
  return j.evenements
    .slice(0, n)
    .reverse()
    .sort((a, b) => (a.jour < b.jour ? -1 : a.jour > b.jour ? 1 : 0));
}

/** l'écart minimal de deux pastilles, en % de la largeur de la courbe */
export const ECART_PINS = 8;

export type Epingle = { n: number; e: EvenementJournal; x: number; y: number };

/**
 * Les pastilles : chaque événement au jour où il est arrivé, sur la courbe ;
 * deux pastilles ne se recouvrent pas (8 % d'écart au moins : 25 px dans la
 * plus étroite des cases) et aucune ne sort de la boîte.
 */
export function epingles(c: CourbeElo, evts: EvenementJournal[]): Epingle[] {
  const xs = evts.map((e) => Math.max(4, Math.min(96, c.xDuJour(e.jour) ?? 0)));
  // vers la droite d'abord ; ce qui dépasse le bord revient vers la gauche
  for (let i = 1; i < xs.length; i++) if (xs[i] - xs[i - 1] < ECART_PINS) xs[i] = xs[i - 1] + ECART_PINS;
  if (xs.length) xs[xs.length - 1] = Math.min(xs[xs.length - 1], 96);
  for (let i = xs.length - 2; i >= 0; i--) xs[i] = Math.min(xs[i], xs[i + 1] - ECART_PINS);
  return evts.map((e, i) => ({ n: i + 1, e, x: xs[i], y: c.yEn(xs[i]) }));
}

// ── Le dessin ─────────────────────────────────────────────────────────────

const pct = (n: number) => `${n.toFixed(2)}%`;

/** Le gain d'ELO : vert s'il est positif, rouge s'il est négatif, encre douce sinon. */
const couleurGain = (g: number) => (g > 0 ? "var(--gain)" : g < 0 ? "var(--perte)" : "var(--ink-2)");

/**
 * La courbe et ses pastilles. `evts` : les événements à poser (vide en
 * demi-bande). Sans match sur les 90 jours : la phrase calme.
 */
function Courbe({ d, j, evts, classe }: { d: DonneesBlocs; j: ExtraitJournal; evts: EvenementJournal[]; classe: string }) {
  if (j.points.length === 0) return <p className={"t-small m-0 " + s.calme}>{JOURNAL.calme}</p>;
  const serie = serieElo(j, aujourdhuiDe(d, j.dates));
  const c = serie ? courbeElo(serie) : courbeParIndice([j.depart, ...j.points]);
  if (!c) return <p className={"t-small m-0 " + s.calme}>{JOURNAL.calme}</p>;
  const label = JOURNAL.courbeDit(j.depart, j.points[j.points.length - 1], j.matchs90 ?? j.points.length);
  const pins = epingles(c, evts);
  return (
    <div className={s.courbe + " " + classe} style={{ ["--acc" as string]: couleurCss(d.accent) }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={label} className={s.svg}>
        <title>{label}</title>
        <path d={c.aire} className={s.aire} />
        <path d={c.chemin} className={s.trait} />
      </svg>
      <span className={s.fin} style={{ left: pct(c.fin.x), top: pct(c.fin.y) }} aria-hidden />
      {pins.map((p) => (
        <span key={p.e.cle} className={s.pin} style={{ left: pct(p.x), top: pct(p.y) }} title={V.ligneBulle(jourCourt(p.e.jour), titreEvenement(p.e, d.viewerId))} aria-hidden>
          {p.n}
        </span>
      ))}
    </div>
  );
}

/** La légende : une ligne par événement, sa pastille, son titre, son écart d'ELO. */
function Legende({ evts, d, posees }: { evts: EvenementJournal[]; d: DonneesBlocs; posees: boolean }) {
  if (!evts.length) return null;
  return (
    <ol className={s.legende}>
      {evts.map((e, i) => {
        const x = ditEvenement(e, d.viewerId);
        return (
          <li key={e.cle} title={V.ligneBulle(jourCourt(e.jour), x.detail ? `${x.titre} · ${x.detail}` : x.titre)}>
            <i className={posees ? s.num : s.puce} aria-hidden>
              {posees ? i + 1 : ""}
            </i>
            <span className={s.titre}>{x.titre}</span>
            {x.delta !== null && (
              <span className={s.delta} style={{ color: x.delta >= 0 ? "var(--gain)" : "var(--perte)" }}>
                {signe(x.delta)}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** L'étiquette et le gain à droite. */
function Tete({ g, calme }: { g: number; calme: boolean }) {
  return (
    <div className={s.tete}>
      <h3 className={s.lab}>{V.titreCourbe}</h3>
      {!calme && (
        <b className={s.gain} style={{ color: couleurGain(g) }}>
          {signe(g)}
        </b>
      )}
    </div>
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

function JournalContenu({ d, f, edition }: Ctx) {
  const j = d.journal!;
  const g = gain(j);
  const calme = j.points.length === 0;
  const matchs = j.matchs90 ?? j.points.length;

  if (f === "demi")
    return (
      <DemiBande label={T.journal} dessin={<Courbe d={d} j={j} evts={[]} classe={s.demi} />} droite={<DroiteDemi d={d} edition={edition} />}>
        <Cellule etiquette={V.elo90} chiffre={<span style={{ color: couleurGain(g) }}>{signe(g)}</span>} petit={V.matchs(matchs)} />
      </DemiBande>
    );

  const heros = f === "heros" || f === "bande";
  const evts = evenementsPosables(j, f === "tuile" ? 1 : 3);
  // les pastilles ne se posent que sur une courbe lue jour par jour
  const posees = !calme && !!j.dates && j.dates.length === j.points.length;
  const courbe = <Courbe d={d} j={j} evts={posees ? evts : []} classe={f === "tuile" ? s.tuile : f === "colonne" ? s.colonne : s.heros} />;
  const legende = <Legende evts={evts} d={d} posees={posees} />;
  const visible = edition ? <p className="t-micro m-0">{T.visiblePar(d.visibiliteJournal)}</p> : null;
  const lien = <Lien href={hrefOnglet(d.id, "journal")}>{T.toutJournal}</Lien>;

  return (
    <Coque f={heros ? "heros" : f} label={T.journal}>
      <div className={s.corps}>
        <Tete g={g} calme={calme} />
        {heros ? (
          <div className={s.milieu}>
            {courbe}
            <div className={s.cote}>
              {legende}
              {visible}
              {lien}
            </div>
          </div>
        ) : (
          <>
            {courbe}
            {legende}
            {visible}
            {lien}
          </>
        )}
      </div>
    </Coque>
  );
}

/**
 * Le bloc Journal. Rien à montrer (non lu, ou Journal fermé à celui qui
 * regarde) : rien en vue publique, l'état vide dans Personnaliser.
 */
export function JournalBloc({ d, f, edition }: Ctx): React.ReactNode {
  if (!d.journal) return edition ? <Vide bloc={{ k: "journal", f }} f={f} icone={<ScrollText size={17} aria-hidden />} /> : null;
  return <JournalContenu d={d} f={f} edition={edition} />;
}
