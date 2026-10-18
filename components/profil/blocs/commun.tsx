import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { SUBJECTS } from "@/components/reviser/catalog";
import { couleurCss } from "@/lib/profil/catalogue";
import { nomBloc, type Bloc, type Format } from "@/lib/profil/disposition";
import type { DonneesBlocs } from "@/lib/profil/blocs-donnees";
import { couleurSens, sensScore, type Ecart, type Score } from "@/lib/profil/ecart";
import { BLOCS_PROFIL as T } from "@/lib/voice-blocs";
import c from "./commun.module.css";

// Ce que partagent les blocs de la page de profil (components/profil/blocs/*,
// BlocsProfil.tsx) : la coque et l'étiquette d'un bloc, le repère, le lien
// du bas, le détail à la demande ; et la grammaire des écarts (lib/profil/
// ecart.ts) mise en forme : le jeton (« toi −1 692 »), le score d'une tuile
// (« toi 1 – 2 »), la cellule de la demi-bande, le double trait des
// courbes (la sienne épaisse à l'encre, la tienne fine à ta couleur), le
// ruban des semaines. Sans état : rendus au serveur comme au client.

export type Ctx = { d: DonneesBlocs; f: Format; edition: boolean };

export const PAD: Record<Format, string> = { tuile: "p-5 md:p-6", colonne: "p-5 md:p-6", heros: "p-6 md:p-8", bande: "p-5 md:p-6", demi: "px-6 py-4" };
/** deux lignes au plus */
export const DEUX_LIGNES: React.CSSProperties = { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" };
export const nomCourt = (k: string) => SUBJECTS.find((x) => x.key === k)?.short ?? k;
export const codeMatiere = (k: string) => SUBJECTS.find((x) => x.key === k)?.code ?? k;
/** Une maîtrise, « ≈ » devant si elle est provisoire. */
export const maitrise = (v: number, prov: string | null) => `${prov ? "≈" : ""}${v}`;
/** La taille du chiffre fort selon le format (la grammaire : 26 / 30 / 36 / 44 px). */
export const TAILLE_CHIFFRE: Record<Format, number> = { tuile: 26, demi: 30, bande: 36, colonne: 44, heros: 44 };

/** Chez un autre, connecté : les écarts se montrent (chez soi : jamais ; en aperçu : « toi ± » sans chiffre). */
export const compare = (d: DonneesBlocs) => !d.moi && (!!d.toi || !!d.apercu);

/** Ta couleur (le trait fin) : ton accent, sinon un contraste si c'est la même que la sienne (la règle du radar). */
export function maCouleur(d: DonneesBlocs): string {
  const sienne = couleurCss(d.accent);
  let mienne = d.toi?.accent ? couleurCss(d.toi.accent) : "var(--pen)";
  if (mienne === sienne) mienne = sienne === "var(--ink)" ? "var(--pen)" : "var(--ink)";
  return mienne;
}

export function Coque({ f, label, children, className = "" }: { f: Format; label: string; children: React.ReactNode; className?: string }) {
  return <section aria-label={label} className={(f === "tuile" ? "card-quiet " : "card ") + "flex min-w-0 flex-col gap-4 " + PAD[f] + " " + className}>{children}</section>;
}

export function Etiquette({ icone, titre, droite, f, sur }: { icone: React.ReactNode; titre: string; droite?: React.ReactNode; f: Format; sur?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className={"grid h-9 w-9 shrink-0 place-items-center rounded-[11px] " + (f === "tuile" ? "bg-surface" : "bg-surface-2")}>
        {icone}
      </span>
      <div className="min-w-0 flex-1">
        {sur && <p className="t-micro m-0 truncate">{sur}</p>}
        <h3 className="m-0 truncate text-[16px] font-bold tracking-[-0.01em]">{titre}</h3>
      </div>
      {droite}
    </div>
  );
}

export const Repere = ({ children }: { children: React.ReactNode }) => <span className="t-micro shrink-0 font-mono tabular-nums">{children}</span>;

export const Lien = ({ children, href }: { children: React.ReactNode; href: string }) => (
  <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
    <Link href={href} className="ink-link inline-flex items-center gap-1 text-[14px] font-semibold">
      {children} <ArrowRight size={14} aria-hidden />
    </Link>
  </div>
);

/** Le détail à la demande, avec son chevron (44 px à toucher). */
export function Detail({ libelle, children }: { libelle: string; children: React.ReactNode }) {
  return (
    <details className="group/d">
      <summary className="t-small inline-flex min-h-[44px] cursor-pointer list-none items-center gap-1.5 font-semibold hover:text-white [&::-webkit-details-marker]:hidden">
        <ChevronRight size={15} aria-hidden className="transition-transform group-open/d:rotate-90 motion-reduce:transition-none" /> {libelle}
      </summary>
      <div className="rl-in mt-2">{children}</div>
    </details>
  );
}

/** Dans Personnaliser : un bloc qui n'a encore rien à montrer garde sa coque et le dit. */
export function Vide({ bloc, f, icone }: { bloc: Bloc; f: Format; icone: React.ReactNode }) {
  const nom = nomBloc(bloc);
  if (f === "demi")
    return (
      <DemiBande label={nom}>
        <Cellule etiquette={nom} chiffre="—" petit={T.rienAMontrerCourt} />
      </DemiBande>
    );
  return (
    <Coque f={f} label={nom}>
      <Etiquette f={f} icone={icone} titre={nom} />
      <p className="t-small m-0">
        <b className="font-semibold">{nom}</b>
        {T.rienAMontrer}
      </p>
    </Coque>
  );
}

// ── La grammaire des écarts, mise en forme ────────────────────────────────

/**
 * Le jeton d'écart : « toi −1 692 » (long) ou « −1 692 » (court), vert si tu
 * mènes, rouge s'il mène, encre douce à égalité ; son infobulle dit les deux
 * valeurs (« Questions · Inès 4 812 · toi 3 120 ») et, au besoin, le
 * rattrapage. Aperçu : « toi ± », sans chiffre. Sans écart : rien.
 */
export function Jeton({ e, d, bulle, forme = "long", taille }: { e: Ecart | null; d: DonneesBlocs; bulle?: string; forme?: "long" | "court"; taille?: number }) {
  if (d.apercu && !d.toi) {
    if (forme === "court") return null;
    return (
      <span className={c.jeton} style={{ color: "var(--ink-2)", fontSize: taille }} title={T.apercuEcart}>
        toi ±
      </span>
    );
  }
  if (!e) return null;
  return (
    <span className={c.jeton} style={{ color: couleurSens(e.sens), fontSize: taille }} title={bulle} aria-label={bulle}>
      {forme === "long" ? e.long : e.court}
    </span>
  );
}

/** Le score d'une tuile : « toi 1 – 2 » à la couleur de celui qui mène ; infobulle « Tu mènes dans 1, Inès dans 2 ». */
export function ScoreTuile({ s, d }: { s: Score | null; d: DonneesBlocs }) {
  if (d.apercu && !d.toi)
    return (
      <span className={c.score} style={{ color: "var(--ink-2)" }} title={T.apercuEcart}>
        toi – –
      </span>
    );
  if (!s) return null;
  const bulle = T.scoreBulle(s.toi, s.lui, s.egal, d.nom);
  return (
    <span className={c.score} style={{ color: couleurSens(sensScore(s)) }} title={bulle} aria-label={bulle}>
      toi {s.toi} – {s.lui}
    </span>
  );
}

/**
 * La demi-bande : une ligne compacte, pleine largeur (121 px de haut dès
 * 1 024 px : GrilleProfil) ; des cellules séparées de filets, puis un dessin
 * qui prend la largeur restante, puis le score ou un lien collé à droite. Au
 * téléphone : les cellules sur deux colonnes, le dessin dessous.
 */
export function DemiBande({ label, children, dessin, droite, className = "" }: { label: string; children: React.ReactNode; dessin?: React.ReactNode; droite?: React.ReactNode; className?: string }) {
  return (
    <section aria-label={label} className={"card min-w-0 " + c.demi + " " + className}>
      <div className={c.cellules}>{children}</div>
      {dessin && <div className={c.dessin}>{dessin}</div>}
      {droite && <div className={c.droite}>{droite}</div>}
    </section>
  );
}

/** Une cellule de demi-bande : l'étiquette (le titre), le chiffre (30 px), puis le jeton (chez un autre) ou une petite ligne (chez soi). */
export function Cellule({ etiquette, chiffre, jeton, petit, titre }: { etiquette: React.ReactNode; chiffre: React.ReactNode; jeton?: React.ReactNode; petit?: React.ReactNode; titre?: string }) {
  return (
    <div className={c.cellule} title={titre}>
      <span className={c.etiquette}>{etiquette}</span>
      <span className={c.chiffre}>{chiffre}</span>
      {jeton ? <span className={c.sous}>{jeton}</span> : petit ? <span className={c.petit}>{petit}</span> : null}
    </div>
  );
}

/** Le chiffre fort d'un bloc, à la taille de son format (tabulaire, à l'encre). */
export function Chiffre({ f, children, titre }: { f: Format; children: React.ReactNode; titre?: string }) {
  return (
    <span className="t-num leading-none tabular-nums" style={{ fontSize: TAILLE_CHIFFRE[f] }} title={titre}>
      {children}
    </span>
  );
}

// ── Le double trait ──────────────────────────────────────────────────────

export type Serie = { dates: string[]; valeurs: number[] };

/**
 * Deux courbes sur un axe de dates commun : la sienne épaisse à l'encre
 * (points facultatifs), la tienne fine à ta couleur ; un seuil en
 * pointillé ; les dates aux deux bouts. Une seule série : sa courbe seule.
 * L'échelle couvre les deux séries (on voit qui est au-dessus).
 */
export function DoubleCourbe({
  lui,
  toi = null,
  couleurToi = "var(--pen)",
  h,
  seuil = null,
  points = false,
  label,
  bornes = true,
}: {
  lui: Serie;
  toi?: Serie | null;
  couleurToi?: string;
  h: number;
  seuil?: number | null;
  points?: boolean;
  label: string;
  bornes?: boolean;
}) {
  const W = 600;
  const toutes = [...lui.dates, ...(toi?.dates ?? [])].sort();
  if (!toutes.length || lui.valeurs.length < 1) return null;
  const t0 = Date.parse(toutes[0] + "T12:00:00Z");
  const t1 = Date.parse(toutes[toutes.length - 1] + "T12:00:00Z");
  const vals = [...lui.valeurs, ...(toi?.valeurs ?? []), ...(seuil !== null ? [seuil] : [])];
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = (max - min) * 0.12 || 10;
  const y = (v: number) => 4 + (1 - (v - (min - pad)) / (max - min + 2 * pad)) * (h - 8);
  // plusieurs points le même jour : répartis dans la journée
  const xs = (s: Serie) =>
    s.dates.map((j, i) => {
      const t = Date.parse(j + "T12:00:00Z");
      const meme = s.dates.filter((x) => x === j);
      const rang = s.dates.slice(0, i).filter((x) => x === j).length;
      const dt = t1 > t0 ? ((t - t0 + (rang / Math.max(1, meme.length)) * 86400000) / (t1 - t0 + 86400000)) * W : (i / Math.max(1, s.dates.length - 1)) * W;
      return Math.max(0, Math.min(W, dt));
    });
  const chemin = (s: Serie) => {
    const x = xs(s);
    return s.valeurs.map((v, i) => `${i ? "L" : "M"}${x[i].toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  };
  const xl = xs(lui);
  return (
    <figure className="m-0 flex min-w-0 flex-col gap-1">
      <svg viewBox={`0 0 ${W} ${h}`} preserveAspectRatio="none" role="img" aria-label={label} className="block w-full" style={{ height: h }}>
        <title>{label}</title>
        {seuil !== null && <line x1={0} x2={W} y1={y(seuil)} y2={y(seuil)} stroke="var(--ink-3)" strokeWidth={1} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />}
        {toi && toi.valeurs.length > 1 && <path d={chemin(toi)} fill="none" stroke={couleurToi} strokeWidth={1.25} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />}
        <path d={chemin(lui)} fill="none" stroke="var(--ink)" strokeWidth={2.25} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        {points &&
          lui.valeurs.map((v, i) => (
            <circle key={i} cx={xl[i]} cy={y(v)} r={2.6} fill={seuil !== null && v < seuil * (50 / 70) ? "var(--pen)" : seuil !== null && v < seuil ? "var(--surface)" : "var(--ink)"} stroke="var(--ink)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}
      </svg>
      {bornes && (
        <figcaption className="flex justify-between font-mono text-[11px] text-muted tabular-nums">
          <span>{jourCourt(toutes[0])}</span>
          <span>{jourCourt(toutes[toutes.length - 1])}</span>
        </figcaption>
      )}
    </figure>
  );
}

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
/** « 12 sept. » */
export const jourCourt = (j: string) => {
  const [, m, dd] = j.split("-").map(Number);
  return `${dd} ${MOIS[(m || 1) - 1]}`;
};

/**
 * Le ruban des semaines, sous un carnet : une case par semaine, verte si tu
 * as fait plus de questions, rouge s'il en a fait plus, au trait à égalité
 * ou sans rien. `semaines` : [début, lui, toi] du plus ancien au plus récent.
 */
export function RubanSemaines({ semaines, nom }: { semaines: [string, number, number][]; nom: string }) {
  return (
    <div className={c.ruban} style={{ gridTemplateColumns: `repeat(${semaines.length}, minmax(0, 1fr))` }} aria-hidden>
      {semaines.map(([debut, lui, toi]) => (
        <span
          key={debut}
          className={c.semaine}
          style={{ background: toi > lui ? "var(--gain)" : lui > toi ? "var(--perte)" : "var(--line-2)" }}
          title={T.semaineBulle(jourCourt(debut), nom, lui, toi)}
        />
      ))}
    </div>
  );
}
