"use client";

import { useEffect, useState } from "react";
import { Radar as IconeRadar } from "lucide-react";
import { SUBJECTS } from "@/components/reviser/catalog";
import { classesProfil as s, styleAccent } from "@/components/profil/Pieces";
import { infobulle, provisoires } from "@/components/profil/RadarComparable";
import { infobulleMaitrise } from "@/lib/maitrise";
import { couleurCss } from "@/lib/profil/catalogue";
import { score } from "@/lib/profil/ecart";
import { TIERS } from "@/lib/ranks";
import type { DonneesBlocs } from "@/lib/profil/blocs-donnees";
import type { Format } from "@/lib/profil/disposition";
import { BLOCS_PROFIL as T } from "@/lib/voice-blocs";
import { BLOCS_RADAR as R } from "@/lib/voice-blocs-radar";
import { Coque, Detail, Etiquette, ScoreTuile, maitrise, type Ctx } from "./commun";
import { RadarCompact, ecartsAxes, type AxeCompact } from "./RadarCompact";
import r from "./radar.module.css";

// Le bloc « Radar » (spec des tuiles : « Radar et podium »). Le même dessin
// chez soi et chez un autre : le titre « Statistiques », le radar des 10
// matières (étiquettes courtes, la moyenne des joueurs en pointillés) et, à
// côté (héros, bande) ou dessous (colonne), le podium des trois matières les
// plus sûres en puces médaillées (or, argent, bronze : les métaux de TIERS).
// La mini-tuile : le radar seul. Chez un autre, « Me comparer » reste
// inchangé : ta forme fine par-dessus la sienne, le jeton court de chaque
// matière (« 71 −6 », une étiquette rouge mène à l'entraînement) et le score
// de la tuile (« toi 4 – 6 ») ; le choix est retenu par visiteur
// (localStorage) ; en aperçu, le bouton est grisé et dit pourquoi. Chez soi,
// sans « Me comparer » : les 10 matières en barres restent en repli. Pas de
// demi-bande (il lui faut de la hauteur) : si on la lui donne quand même,
// il prend sa forme de tuile.

/** le choix « comparer » retenu d'un profil à l'autre (par visiteur) */
const CLE_COMPARER = "rl-radar-comparer";

/** Ta couleur (le trait fin) : ton accent, sinon un contraste si c'est la même que la sienne. */
function couleurToi(d: DonneesBlocs): string {
  const sienne = couleurCss(d.accent);
  const accent = d.toi?.accent ?? d.radar.monAccent;
  let mienne = accent ? couleurCss(accent) : "var(--pen)";
  if (mienne === sienne) mienne = sienne === "var(--ink)" ? "var(--pen)" : "var(--ink)";
  return mienne;
}

/** Les tailles du radar par format (330 / 340 / 440 / 520 px au plus). */
const LARGEUR: Record<Format, number> = { tuile: 330, colonne: 340, heros: 440, bande: 520, demi: 330 };

const icone = <IconeRadar size={17} aria-hidden />;

// ── Le podium : ses trois matières les plus sûres ─────────────────────────

type Puce = { cle: string; code: string; nom: string; valeur: string };

/** Les trois matières les plus sûres (mesurées), de la plus sûre à la moins sûre ; l'ordre officiel à égalité. */
function plusSures(d: DonneesBlocs): Puce[] {
  const prov = provisoires(d.stats.matieres);
  return d.stats.matieres
    .map((m) => ({ m, x: SUBJECTS.find((y) => y.key === m.key) }))
    .filter((e): e is { m: (typeof d.stats.matieres)[number] & { pct: number }; x: (typeof SUBJECTS)[number] } => !!e.x && e.m.pct !== null)
    .sort((a, b) => b.m.pct - a.m.pct || SUBJECTS.indexOf(a.x) - SUBJECTS.indexOf(b.x))
    .slice(0, 3)
    .map(({ m, x }) => ({ cle: x.key, code: x.code, nom: x.name, valeur: maitrise(m.pct, prov.get(m.key) ?? null) }));
}

/** Or, argent, bronze : les métaux des paliers Or, Argent et Bronze. */
const METAL_PLACE = [2, 1, 0];

function Podium({ puces, titre }: { puces: Puce[]; titre: string }) {
  return (
    <div className={r.podium}>
      <p className="t-eyebrow m-0">{titre}</p>
      <ol className={r.puces} aria-label={titre}>
        {puces.map((p, i) => {
          const [m1, m2, m3] = TIERS[METAL_PLACE[i]].metal;
          const dit = R.puce(i + 1, p.nom, p.valeur);
          return (
            <li key={p.cle} className={r.puce} style={{ ["--m1" as string]: m1, ["--m2" as string]: m2, ["--m3" as string]: m3, ["--i" as string]: i }} title={dit} aria-label={dit}>
              <span className={r.medaille} aria-hidden>
                {i + 1}
              </span>
              <span className={r.nomMat}>
                <b className={r.code}>{p.code}</b>
                <span className={r.nomLong}>{p.nom}</span>
              </span>
              <span className={r.valeur}>
                {p.valeur}
                <small>%</small>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ── La mise en page, la même chez soi et chez un autre ────────────────────

/**
 * Le bloc : l'étiquette (et, à droite, « Me comparer » chez un autre), le
 * radar, le podium. Mini-tuile : le radar seul. Colonne : le radar, le
 * podium dessous. Héros et bande : côte à côte dès que la place le permet,
 * l'un sur l'autre sinon. Chez soi : les 10 matières en barres, en repli.
 */
function Mise({ d, f, radar, droite }: { d: DonneesBlocs; f: Format; radar: React.ReactNode; droite?: React.ReactNode }) {
  const fm: Format = f === "demi" ? "tuile" : f;
  const puces = plusSures(d);
  const podium = puces.length ? <Podium puces={puces} titre={d.moi ? T.tesPlusSures : R.sesPlusSures} /> : null;
  const label = T.radarDe(d.nom, d.moi);
  const leRadar = (
    <div className={r.radar} style={{ ["--max" as string]: `${LARGEUR[fm]}px` }}>
      {radar}
    </div>
  );
  const dessin =
    fm === "tuile" ? (
      <div className={r.zone + " " + r.centre}>{leRadar}</div>
    ) : fm === "colonne" ? (
      <div className={r.zone}>
        <div className={r.centre}>{leRadar}</div>
        {podium}
      </div>
    ) : (
      <div className={r.zone + " " + r.centre}>
        <div className={r.ensemble + (podium ? "" : " " + r.seul)}>
          {leRadar}
          {podium}
        </div>
      </div>
    );
  return (
    <Coque f={fm} label={label}>
      <div style={styleAccent(d.accent)} className="contents">
        <Etiquette f={fm} icone={icone} titre={R.statistiques} droite={droite} />
        {dessin}
        {d.moi && <div className="mt-auto">{detailDesDix(d)}</div>}
      </div>
    </Coque>
  );
}

export function RadarBloc({ d, f }: Ctx): React.ReactNode {
  if (d.moi) return radarChezSoi(d, f);
  return <RadarAutre d={d} f={f} />;
}

// ── Chez un autre ─────────────────────────────────────────────────────────

/**
 * Le radar chez un autre. `ouvert` : la comparaison ouverte d'office (les
 * tests ; la page passe par la mémoire du visiteur).
 */
export function RadarAutre({ d, f, ouvert = false }: { d: DonneesBlocs; f: Format; ouvert?: boolean }) {
  const [comparer, setComparer] = useState(ouvert);
  const apercu = !!d.apercu && !d.toi;
  const miennes = apercu ? null : (d.radar.miennes ?? d.toi?.stats.matieres ?? null);
  const peutComparer = !apercu && !!miennes && miennes.some((m) => m.pct !== null);
  // qui a comparé une fois retrouve la comparaison ouverte sur les profils suivants
  useEffect(() => {
    if (!peutComparer) return;
    try {
      if (window.localStorage.getItem(CLE_COMPARER) === "1") setComparer(true);
    } catch {
      /* stockage indisponible : fermé d'office */
    }
  }, [peutComparer]);
  const actif = comparer && peutComparer;
  const basculer = () => {
    const suivant = !actif;
    setComparer(suivant);
    try {
      window.localStorage.setItem(CLE_COMPARER, suivant ? "1" : "0");
    } catch {
      /* stockage indisponible : le choix vaut pour cette page */
    }
  };

  const sien = new Map(d.stats.matieres.map((m) => [m.key, m]));
  const mien = new Map((miennes ?? []).map((m) => [m.key, m.pct]));
  const axes: AxeCompact[] = SUBJECTS.map((x) => {
    const m = sien.get(x.key);
    const me = m?.pct ?? null;
    return {
      cle: x.key,
      label: x.code,
      nom: x.name,
      qui: d.nom,
      me,
      avg: d.radar.moyennes[x.key] ?? null,
      provisoire: m && me !== null && m.statut ? infobulleMaitrise({ statut: m.statut, n: m.answered ?? 0 }) : null,
    };
  });
  const valeurs = SUBJECTS.map((x) => mien.get(x.key) ?? null);
  const sc = actif ? score(ecartsAxes(axes, valeurs)) : null;

  // un visiteur non connecté ne peut pas se comparer : pas de bouton
  const bouton =
    d.viewerId || d.toi || d.apercu ? (
      <button
        type="button"
        className="btn btn-secondary btn-sm shrink-0"
        aria-pressed={actif}
        disabled={!peutComparer}
        title={peutComparer ? undefined : apercu ? R.comparerApercu : T.comparerImpossible}
        onClick={basculer}
      >
        {actif ? R.arreter : R.comparer}
      </button>
    ) : null;
  const scoreTuile = actif ? <ScoreTuile s={sc} d={d} /> : null;
  const grand = f === "heros" || f === "bande";
  const radar = (
    <RadarCompact
      axes={axes}
      size={grand ? 320 : 260}
      couleur={couleurCss(d.accent)}
      comparaison={actif ? { valeurs, couleur: couleurToi(d), label: T.toi } : null}
      title={actif ? R.radarCompare(d.nom) : T.radarDe(d.nom, false)}
    />
  );
  // à droite du titre : le score (une fois comparé), puis le bouton
  const droite =
    bouton || scoreTuile ? (
      <span className={r.droite}>
        {scoreTuile}
        {bouton}
      </span>
    ) : undefined;
  return <Mise d={d} f={f} radar={radar} droite={droite} />;
}

// ── Chez soi : le même dessin, sans « Me comparer » ───────────────────────

/** meProv : l'infobulle d'une maîtrise provisoire, qui s'écrit « ≈ 52 » */
type LigneMatiere = { key: string; nom: string; complet: string; me: number | null; avg: number | null; toi: number | null; meProv: string | null; toiProv: string | null };

function Barres({ lignes, n, qui }: { lignes: LigneMatiere[]; n: number; qui: string }) {
  return (
    <ol className="m-0 flex list-none flex-col gap-2 p-0" aria-label={T.ordreMatieres}>
      {lignes.slice(0, n).map((l) => {
        const bulle = infobulle(l, false, qui);
        return (
          <li key={l.key} aria-label={bulle.join(". ")} title={bulle.join("\n")} className="grid items-center gap-3 py-0.5" style={{ gridTemplateColumns: "88px minmax(0,1fr) 44px" }}>
            <span className={"truncate text-[13px] " + (l.me === null ? "text-muted" : "font-semibold")}>{l.nom}</span>
            <span className="flex flex-col gap-1">
              <span className="relative block h-2 rounded-full bg-[color-mix(in_oklab,var(--ink)_7%,transparent)]">
                {l.me !== null && <span className={`absolute inset-y-0 left-0 rounded-full ${s.filet}`} style={{ width: `${Math.max(2, l.me)}%` }} />}
                {/* la moyenne des joueurs : un trait sur la barre */}
                {l.avg !== null && <span aria-hidden className="absolute -top-1 bottom-[-4px] w-[2px] rounded-full bg-[var(--ink-2)] opacity-70" style={{ left: `calc(${l.avg}% - 1px)` }} />}
              </span>
            </span>
            <span className="text-right font-mono text-[12px] font-semibold tabular-nums">{l.me === null ? "—" : maitrise(l.me, l.meProv)}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Le repli du propriétaire : les 10 matières en barres, de la plus sûre à la moins sûre. */
function detailDesDix(d: DonneesBlocs): React.ReactNode {
  const sien = new Map(d.stats.matieres.map((m) => [m.key, m]));
  const sienProv = provisoires(d.stats.matieres);
  const lignes: LigneMatiere[] = SUBJECTS.map((x) => ({
    key: x.key,
    nom: x.short,
    complet: x.name,
    me: sien.get(x.key)?.pct ?? null,
    avg: d.radar.moyennes[x.key] ?? null,
    toi: null,
    meProv: sienProv.get(x.key) ?? null,
    toiProv: null,
  })).sort((a, c) => (c.me ?? -1) - (a.me ?? -1));
  return (
    <Detail libelle={T.dixMatieres}>
      <Barres lignes={lignes} n={10} qui={T.toi} />
    </Detail>
  );
}

function radarChezSoi(d: DonneesBlocs, f: Format): React.ReactNode {
  const sien = new Map(d.stats.matieres.map((m) => [m.key, m]));
  const axes: AxeCompact[] = SUBJECTS.map((x) => {
    const m = sien.get(x.key);
    const me = m?.pct ?? null;
    return {
      cle: x.key,
      label: x.code,
      nom: x.name,
      qui: T.toi,
      me,
      avg: d.radar.moyennes[x.key] ?? null,
      provisoire: m && me !== null && m.statut ? infobulleMaitrise({ statut: m.statut, n: m.answered ?? 0 }) : null,
    };
  });
  const grand = f === "heros" || f === "bande";
  const radar = <RadarCompact axes={axes} size={grand ? 320 : 260} couleur={couleurCss(d.accent)} title={T.radarDe(d.nom, true)} />;
  return <Mise d={d} f={f} radar={radar} />;
}
