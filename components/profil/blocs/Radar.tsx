"use client";

import { useEffect, useState } from "react";
import { Radar as IconeRadar } from "lucide-react";
import { Radar } from "@/components/ui/Radar";
import { SUBJECTS } from "@/components/reviser/catalog";
import { classesProfil as s, styleAccent } from "@/components/profil/Pieces";
import { infobulle, provisoires } from "@/components/profil/RadarComparable";
import { infobulleMaitrise } from "@/lib/maitrise";
import { couleurCss } from "@/lib/profil/catalogue";
import { score } from "@/lib/profil/ecart";
import type { DonneesBlocs } from "@/lib/profil/blocs-donnees";
import type { Format } from "@/lib/profil/disposition";
import { BLOCS_PROFIL as T } from "@/lib/voice-blocs";
import { BLOCS_RADAR as R } from "@/lib/voice-blocs-radar";
import { Coque, Detail, Etiquette, ScoreTuile, maitrise, type Ctx } from "./commun";
import { RadarCompact, ecartsAxes, type AxeCompact } from "./RadarCompact";
import r from "./radar.module.css";

// Le bloc « Radar des matières » (spec § 2). Chez soi : inchangé (« Tes
// matières », la moyenne, plus sûre / à reprendre, « X en tête » en héros,
// les barres, le repli « Les 10 matières »). Chez un autre : un petit titre
// (« Statistiques »), le radar et le bouton « Me comparer » ; une fois comparé, ta forme fine par-dessus
// la sienne, le jeton court de chaque matière (« 71 −6 », une étiquette
// rouge mène à l'entraînement) et le score de la tuile (« toi 4 – 6 »). Le
// choix de comparer est retenu par visiteur (localStorage). En aperçu, le
// bouton est grisé et dit pourquoi. Pas de demi-bande (il lui faut de la
// hauteur) : si on la lui donne quand même, il prend sa forme de tuile.

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

export function RadarBloc({ d, f }: Ctx): React.ReactNode {
  if (d.moi) return radarChezSoi(d, f);
  return <RadarAutre d={d} f={f} />;
}

// ── Chez un autre ─────────────────────────────────────────────────────────

/** Les tailles du radar par format (spec § 2 : 330 / 340 / 440 / 520 px au plus). */
const LARGEUR: Record<Format, number> = { tuile: 330, colonne: 340, heros: 440, bande: 520, demi: 330 };

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
    <div className={r.radar} style={{ ["--max" as string]: `${LARGEUR[f]}px` }}>
      <RadarCompact
        axes={axes}
        size={grand ? 320 : 260}
        couleur={couleurCss(d.accent)}
        comparaison={actif ? { valeurs, couleur: couleurToi(d), label: T.toi } : null}
        title={actif ? R.radarCompare(d.nom) : T.radarDe(d.nom, false)}
      />
    </div>
  );
  const label = T.radarDe(d.nom, false);
  // un petit titre, puis à droite le score (une fois comparé) et le bouton
  const droite =
    bouton || scoreTuile ? (
      <span className={r.droite}>
        {scoreTuile}
        {bouton}
      </span>
    ) : undefined;
  return (
    <Coque f={f} label={label}>
      <Etiquette f={f} icone={<IconeRadar size={17} aria-hidden />} titre={R.statistiques} droite={droite} />
      {f === "colonne" || f === "bande" ? <div className={r.centre}>{radar}</div> : radar}
    </Coque>
  );
}

// ── Chez soi : inchangé (l'ancien RadarBloc de BlocsProfil.tsx, sans la comparaison) ──

/** meProv : l'infobulle d'une maîtrise provisoire, qui s'écrit « ≈ 52 » */
type LigneMatiere = { key: string; nom: string; complet: string; me: number | null; avg: number | null; toi: number | null; meProv: string | null; toiProv: string | null };

function Barres({ lignes, n, deuxCol = false, qui }: { lignes: LigneMatiere[]; n: number; deuxCol?: boolean; qui: string }) {
  return (
    <ol className={"m-0 flex list-none flex-col gap-2 p-0 " + (deuxCol ? r.barres2 : "")} aria-label={T.ordreMatieres}>
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

function radarChezSoi(d: DonneesBlocs, fmt: Format): React.ReactNode {
  // la colonne (et une demi-bande donnée quand même) prend la forme de la tuile, comme avant
  const f: Format = fmt === "colonne" || fmt === "demi" ? "tuile" : fmt;
  const couleur = couleurCss(d.accent);
  const sien = new Map(d.stats.matieres.map((m) => [m.key, m]));
  const qui = T.toi;
  const axes = SUBJECTS.map((x) => {
    const m = sien.get(x.key);
    const me = m?.pct ?? null;
    return { label: x.code, nom: x.name, qui, me, avg: d.radar.moyennes[x.key] ?? null, provisoire: m && me !== null && m.statut ? infobulleMaitrise({ statut: m.statut, n: m.answered ?? 0 }) : null };
  });
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
  const grand = f !== "tuile";
  const radar = (
    // en héros et en bande, la liste de droite compare déjà à la moyenne : les libellés gardent « ETH 71 +5 », sans « moy »
    <div className={"mx-auto w-full " + (grand ? r.sansMoy : "")} style={{ maxWidth: grand ? 500 : 330 }}>
      <Radar axes={axes} size={grand ? 300 : 340} couleur={couleur} title={T.radarDe(d.nom, true)} />
    </div>
  );
  const mesurees = lignes.filter((l) => l.me !== null);
  const sure = mesurees[0];
  const fragile = mesurees[mesurees.length - 1];
  const matieres = T.tesMatieres;
  const dix = (
    <Detail libelle={T.dixMatieres}>
      <Barres lignes={lignes} n={10} qui={qui} />
    </Detail>
  );
  if (!grand)
    return (
      <Coque f={f} label={matieres}>
        <div style={styleAccent(d.accent)} className="contents">
          <Etiquette f={f} icone={<IconeRadar size={17} aria-hidden />} titre={matieres} sur={T.faceMoyenne} />
          {radar}
          {sure && fragile && sure !== fragile && (
            <p className="t-small m-0">
              {T.plusSure} : <b className="font-semibold text-white">{sure.nom}</b> {maitrise(sure.me!, sure.meProv)} % · {T.aReprendreMin} : <b className="font-semibold text-white">{fragile.nom}</b> {maitrise(fragile.me!, fragile.meProv)} %
            </p>
          )}
          <div className="mt-auto">{dix}</div>
        </div>
      </Coque>
    );
  // héros et bande : un surtitre et un titre-réponse en grand ; à droite les 4 plus sûres, les 10 à la demande
  return (
    <Coque f={f} label={matieres}>
      <div style={styleAccent(d.accent)} className="contents">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="flex min-w-0 flex-col gap-1.5" style={{ flex: "1 1 220px" }}>
            <p className="t-eyebrow m-0">
              {matieres} · {T.faceMoyenne}
            </p>
            <h3 className="t-h1 m-0">{sure ? T.enTete(sure.nom) : matieres}</h3>
            {fragile && fragile !== sure && (
              <p className="t-small m-0">
                {T.aReprendre} : <b className="font-semibold text-white">{fragile.nom}</b> {maitrise(fragile.me!, fragile.meProv)} %
              </p>
            )}
          </div>
        </div>
        <div className={r.deux + " " + (f === "bande" ? r.deuxLarge : r.deuxRadar)} style={{ flex: "1 1 auto" }}>
          {radar}
          <div className="flex min-w-0 flex-col gap-3">
            <p className="t-eyebrow m-0">{T.tesPlusSures}</p>
            <Barres lignes={lignes} n={4} deuxCol={f === "bande"} qui={qui} />
            {dix}
          </div>
        </div>
      </div>
    </Coque>
  );
}
