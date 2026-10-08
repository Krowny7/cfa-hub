"use client";

import { useState } from "react";
import { Radar } from "@/components/ui/Radar";
import { SectionTitle } from "@/components/ui/Titles";
import { classesProfil as s, styleAccent } from "@/components/profil/Pieces";
import { SUBJECTS } from "@/components/reviser/catalog";
import { couleurCss } from "@/lib/profil/catalogue";

// Le radar des 10 matières d'un joueur, à sa couleur, face à la moyenne des
// joueurs ; à côté, les matières rangées de la plus sûre à la moins sûre, en
// barres. Sur le profil d'un autre joueur, « Me comparer » pose ta forme par
// dessus la sienne (à ta couleur, ou en contraste si vous avez la même) :
// le radar et les barres montrent alors vos deux valeurs et l'écart, et la
// moyenne s'efface le temps de la comparaison. `comparaison` : posée d'office
// (l'onglet Face-à-face).

export type MatierePct = { key: string; pct: number | null };

/** Le détail d'une ligne, en clair : la matière, puis chaque chiffre dit ce qu'il est. */
function infobulle(l: { complet: string; me: number | null; avg: number | null; toi: number | null }, actif: boolean, qui: string) {
  const pct = (v: number | null) => (v === null ? "pas encore mesurée" : `${v} % de bonnes réponses`);
  if (actif) {
    const d = l.toi !== null && l.me !== null ? Math.round(l.toi - l.me) : null;
    return [
      l.complet,
      `${qui} : ${pct(l.me)}`,
      `toi : ${pct(l.toi)}`,
      d === null ? "écart : pas encore comparable" : d === 0 ? "à égalité" : `tu es ${Math.abs(d)} point${Math.abs(d) > 1 ? "s" : ""} ${d > 0 ? "devant" : "derrière"}`,
    ];
  }
  const d = l.me !== null && l.avg !== null ? Math.round(l.me - l.avg) : null;
  return [
    l.complet,
    `${qui === "toi" ? "ta précision" : `précision de ${qui}`} : ${pct(l.me)} (la barre)`,
    l.avg === null ? "moyenne des joueurs : pas encore connue" : `moyenne des joueurs : ${l.avg} % (le trait)`,
    d === null ? "" : d === 0 ? "pile dans la moyenne" : `${Math.abs(d)} point${Math.abs(d) > 1 ? "s" : ""} ${d > 0 ? "au-dessus de" : "sous"} la moyenne (le chiffre ${d > 0 ? "+" : "−"}${Math.abs(d)})`,
  ].filter(Boolean);
}

export function RadarComparable({
  matieres,
  moyennes,
  accent,
  nom,
  moi,
  miennes = null,
  monAccent = null,
  comparaison = false,
}: {
  matieres: MatierePct[];
  moyennes: Record<string, number | null>;
  accent: string;
  nom: string;
  moi: boolean;
  /** les matières de celui qui regarde (profil d'un autre joueur), sinon null */
  miennes?: MatierePct[] | null;
  monAccent?: string | null;
  /** la comparaison ouverte d'office */
  comparaison?: boolean;
}) {
  const [comparer, setComparer] = useState(comparaison);
  const couleur = couleurCss(accent);
  // ma couleur, sauf si c'est la même que la sienne : un contraste alors
  let maCouleur = couleurCss(monAccent);
  if (maCouleur === couleur) maCouleur = couleur === "var(--ink)" ? "var(--pen)" : "var(--ink)";

  const sien = new Map(matieres.map((m) => [m.key, m.pct]));
  const mien = new Map((miennes ?? []).map((m) => [m.key, m.pct]));
  const peutComparer = !moi && !!miennes && miennes.some((m) => m.pct !== null);
  const actif = comparer && peutComparer;

  const qui = moi ? "toi" : nom;
  const axes = SUBJECTS.map((x) => ({ label: x.code, nom: x.name, qui, me: sien.get(x.key) ?? null, avg: moyennes[x.key] ?? null }));
  const lignes = SUBJECTS.map((x) => ({ key: x.key, nom: x.short, complet: x.name, me: sien.get(x.key) ?? null, avg: moyennes[x.key] ?? null, toi: mien.get(x.key) ?? null })).sort(
    (a, b) => (b.me ?? -1) - (a.me ?? -1),
  );
  const mesurees = axes.filter((a) => a.me !== null).length;

  const legende = (
    <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-[12px] font-medium text-muted">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-[2.5px] w-4 rounded-full" style={{ background: couleur }} />
        {moi ? "toi" : nom}
      </span>
      {actif ? (
        <span className="inline-flex items-center gap-1.5">
          <span className="h-[2px] w-4 rounded-full" style={{ background: maCouleur }} />
          toi
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 border-t-[1.5px] border-dashed border-[var(--ink-2)]" />
          moyenne des joueurs
        </span>
      )}
      {!moi && (
        <button
          type="button"
          className={"btn btn-sm " + (actif ? "btn-primary" : "btn-secondary")}
          aria-pressed={actif}
          disabled={!peutComparer}
          title={peutComparer ? undefined : "Aucune de tes matières n'est encore mesurée"}
          onClick={() => setComparer((v) => !v)}
        >
          {actif ? "Arrêter la comparaison" : "Me comparer"}
        </button>
      )}
    </div>
  );

  return (
    <section className="rl-section @container" aria-labelledby="profil-radar" style={styleAccent(accent)}>
      <SectionTitle title={<span id="profil-radar">{moi ? "Mes matières" : "Ses matières"}</span>} action={legende} />
      <div className="card grid items-center gap-8 p-4 @lg:p-8 @4xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] @4xl:gap-12">
        <div className="mx-auto w-full max-w-[560px]">
          <Radar
            axes={axes}
            size={340}
            couleur={couleur}
            comparaison={actif ? { valeurs: SUBJECTS.map((x) => mien.get(x.key) ?? null), couleur: maCouleur, label: "toi" } : null}
            title={actif ? `Les 10 matières de ${nom} comparées aux tiennes` : `Les 10 matières de ${nom} face à la moyenne des joueurs`}
          />
        </div>
        <ol className="m-0 flex list-none flex-col gap-2.5 p-0" aria-label="Matières, de la plus sûre à la moins sûre">
          {/* ce que disent les colonnes ; le détail de chaque ligne au survol (ou au toucher) */}
          <li aria-hidden className="t-micro -mb-1 grid grid-cols-[92px_minmax(0,1fr)_104px] items-end gap-3">
            <span />
            <span>{actif ? `${nom} : barre épaisse · toi : fine` : "bonnes réponses · trait : moyenne"}</span>
            <span className="text-right">{actif ? "écart" : "% · écart"}</span>
          </li>
          {lignes.map((l) => {
            const ref = actif ? l.toi : l.avg;
            const ecart = l.me !== null && ref !== null ? Math.round(l.me - ref) : null;
            const bulle = infobulle(l, actif, qui);
            return (
              <li
                key={l.key}
                tabIndex={0}
                aria-label={bulle.join(". ")}
                className="group/l relative -mx-2 grid cursor-help grid-cols-[92px_minmax(0,1fr)_104px] items-center gap-3 rounded-[8px] px-2 py-0.5 outline-none transition-colors hover:bg-surface-2 focus:bg-surface-2"
              >
                <span
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-[100px] z-20 mb-1.5 w-max max-w-[min(280px,calc(100%-100px))] translate-y-1 rounded-[10px] border border-line-2 bg-surface px-3 py-2 text-[12px] leading-snug opacity-0 shadow-[var(--shadow-2)] transition-[opacity,transform] duration-150 group-hover/l:translate-y-0 group-hover/l:opacity-100 group-focus/l:translate-y-0 group-focus/l:opacity-100"
                >
                  <span className="block font-semibold text-white">{bulle[0]}</span>
                  {bulle.slice(1).map((t) => (
                    <span key={t} className="block text-muted">
                      {t}
                    </span>
                  ))}
                </span>
                <span className={"truncate text-[13px] " + (l.me === null && (!actif || l.toi === null) ? "text-muted" : "font-semibold")}>{l.nom}</span>
                <span className="flex flex-col gap-1">
                  <span className="relative block h-2 rounded-full bg-[color-mix(in_oklab,var(--ink)_7%,transparent)]">
                    {l.me !== null && <span className={`absolute inset-y-0 left-0 rounded-full ${s.filet}`} style={{ width: `${Math.max(2, l.me)}%` }} />}
                    {!actif && l.avg !== null && (
                      <span aria-hidden className="absolute -top-1 bottom-[-4px] w-[2px] rounded-full bg-[var(--ink-2)] opacity-70" style={{ left: `calc(${l.avg}% - 1px)` }} title={`moyenne ${l.avg}`} />
                    )}
                  </span>
                  {/* ma barre, plus fine, sous la sienne */}
                  {actif && (
                    <span className="relative block h-1 rounded-full bg-[color-mix(in_oklab,var(--ink)_5%,transparent)]">
                      {l.toi !== null && <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.max(2, l.toi)}%`, background: maCouleur }} />}
                    </span>
                  )}
                </span>
                <span className="text-right font-mono text-[12px] tabular-nums">
                  {l.me === null ? <span className="text-muted">—</span> : <b className="font-semibold">{l.me}</b>}
                  {actif ? (
                    <>
                      <span style={{ color: maCouleur }}>{` · ${l.toi === null ? "—" : l.toi}`}</span>
                      {l.toi !== null && l.me !== null && Math.round(l.toi - l.me) !== 0 && (
                        <span className="font-semibold" style={{ color: l.toi > l.me ? "var(--gain)" : "var(--perte)" }}>{` ${l.toi > l.me ? "+" : "−"}${Math.abs(Math.round(l.toi - l.me))}`}</span>
                      )}
                    </>
                  ) : (
                    ecart !== null && ecart !== 0 && <span className={ecart < 0 ? "text-pen" : "text-muted"}>{` ${ecart > 0 ? "+" : "−"}${Math.abs(ecart)}`}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
        {actif && (
          <p className="t-small m-0 @4xl:col-span-2">
            {(() => {
              const communes = lignes.filter((l) => l.me !== null && l.toi !== null);
              if (!communes.length) return "Vous n'avez encore aucune matière mesurée en commun.";
              const devant = communes.filter((l) => (l.toi as number) > (l.me as number)).length;
              const derriere = communes.filter((l) => (l.toi as number) < (l.me as number)).length;
              const pastille = (c: string) => <span aria-hidden className="mr-1 inline-block h-2.5 w-2.5 rounded-[3px] align-[-1px]" style={{ background: `color-mix(in oklab, ${c} 45%, transparent)`, boxShadow: `inset 0 0 0 1.5px ${c}` }} />;
              return (
                <>
                  Sur {communes.length} {communes.length > 1 ? "matières mesurées" : "matière mesurée"} en commun :{" "}
                  <span className="font-semibold" style={{ color: "var(--gain)" }}>{pastille("var(--gain)")}tu mènes dans {devant}</span>,{" "}
                  <span className="font-semibold" style={{ color: "var(--perte)" }}>{pastille("var(--perte)")}{nom} dans {derriere}</span>
                  {communes.length - devant - derriere ? `, égalité dans ${communes.length - devant - derriere}` : ""}. Sur le radar, en vert ce que tu couvres en plus, en rouge ce que {nom} couvre en plus de toi.
                </>
              );
            })()}
          </p>
        )}
        {mesurees === 0 && <p className="t-small m-0 text-center @4xl:col-span-2">Aucune matière mesurée pour l&apos;instant : le radar se dessine avec les sessions d&apos;entraînement.</p>}
      </div>
    </section>
  );
}
