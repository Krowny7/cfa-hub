import { useId } from "react";
import { couleurSens, ecart, type Ecart } from "@/lib/profil/ecart";
import { BLOCS_RADAR as R } from "@/lib/voice-blocs-radar";
import r from "./radar.module.css";

// Le radar des 10 matières du bloc Radar, chez un autre (d'après
// components/ui/Radar.tsx, qui reste tel quel pour le Face-à-face et le
// rendu chez soi) : des étiquettes réduites au code et à sa valeur
// (« ETH » / « 71 »). En comparaison, la valeur porte le jeton court de
// l'écart, de ton côté (« 71 −6 », vert si tu mènes, rouge si elle mène) ;
// une étiquette rouge est un lien vers l'entraînement de la matière. Le
// reste (la moyenne, ta valeur, l'écart en clair) est dans l'infobulle de
// l'axe, inchangée. Sa forme épaisse à sa couleur ; la tienne fine, à ta
// couleur ; les zones d'écart en vert et rouge (masques SVG des deux
// formes). Sans état (useId seulement) : serveur comme client.

export type AxeCompact = {
  /** la clé de la matière (le lien d'entraînement) */
  cle: string;
  /** le code court (« ETH ») */
  label: string;
  /** le nom complet (infobulle) */
  nom: string;
  me: number | null;
  avg: number | null;
  /** qui est « me » dans l'infobulle : son prénom */
  qui: string;
  /** maîtrise provisoire de « me » (l'infobulle dit « ≈ 52 % ») */
  provisoire?: string | null;
};

/** Ta forme, par-dessus la sienne : une valeur par axe (null : pas mesurée). */
export type ComparaisonCompacte = { valeurs: (number | null)[]; couleur: string; label: string };

/** L'infobulle d'un axe : tout en clair (reprise telle quelle de components/ui/Radar.tsx). */
function titreAxe(a: AxeCompact, autre: number | null, comparaison: ComparaisonCompacte | null) {
  const nom = a.nom || a.label;
  const qui = a.qui || "toi";
  const me = a.me === null ? "pas encore mesurée" : `${a.provisoire ? "≈ " : ""}${a.me} % de bonnes réponses${a.provisoire ? ` (${a.provisoire})` : ""}`;
  if (comparaison) {
    const toi = autre === null ? "pas encore mesurée" : `${autre} %`;
    const d = autre !== null && a.me !== null ? Math.round(autre - a.me) : null;
    return `${nom} — ${qui} : ${me} · ${comparaison.label} : ${toi}${d ? ` (${comparaison.label} ${d > 0 ? "devant" : "derrière"} de ${Math.abs(d)} point${Math.abs(d) > 1 ? "s" : ""})` : ""}`;
  }
  const ecartEnClair = (d: number) => (d === 0 ? "pile dans la moyenne" : `${Math.abs(d)} point${Math.abs(d) > 1 ? "s" : ""} ${d > 0 ? "au-dessus de" : "sous"} la moyenne`);
  const moy = a.avg === null ? "" : ` · moyenne des joueurs : ${a.avg} %`;
  const d = a.me !== null && a.avg !== null ? ` (${ecartEnClair(Math.round(a.me - a.avg))})` : "";
  return `${nom} — ${qui} : ${me}${moy}${d}`;
}

/** Les écarts par matière, de ton côté (le score de la tuile, les jetons des axes). */
export const ecartsAxes = (axes: AxeCompact[], valeurs: (number | null)[]): (Ecart | null)[] => axes.map((a, i) => ecart(a.me, valeurs[i] ?? null, "pct"));

const f = (n: number) => n.toFixed(1);
/** la marge autour du radar, pour les étiquettes courtes (le radar d'origine en garde 108 : « ETH 71 +5 · moy 66 ») */
const MARGE = 50;

export function RadarCompact({
  axes,
  size = 260,
  couleur = "var(--ink)",
  comparaison = null,
  title,
}: {
  axes: AxeCompact[];
  size?: number;
  couleur?: string;
  comparaison?: ComparaisonCompacte | null;
  title: string;
}) {
  const uid = "radc" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const n = axes.length;
  const c = size / 2;
  const Rr = size * 0.34;
  const P = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [c + Math.cos(a) * Rr * (v / 100), c + Math.sin(a) * Rr * (v / 100)] as const;
  };
  const ring = (lv: number) => axes.map((_, i) => P(i, lv)).map(([x, y], i) => `${i ? "L" : "M"} ${f(x)} ${f(y)}`).join(" ") + " Z";
  const path = (pts: (readonly [number, number])[], close = true) => pts.map(([x, y], i) => `${i ? "L" : "M"} ${f(x)} ${f(y)}`).join(" ") + (close ? " Z" : "");

  const mesures = axes.map((a, i) => ({ i, v: a.me })).filter((m): m is { i: number; v: number } => m.v !== null);
  const mePts = mesures.map((m) => P(m.i, Math.max(2, m.v)));
  const hasAvg = !comparaison && axes.some((a) => a.avg !== null);
  const autrePts = comparaison
    ? comparaison.valeurs.map((v, i) => (v !== null && v !== undefined ? P(i, Math.max(2, v)) : null)).filter((p): p is readonly [number, number] => p !== null)
    : [];
  const avgPts = axes.map((a, i) => (a.avg !== null ? P(i, a.avg) : null)).filter((p): p is readonly [number, number] => p !== null);
  const zones = !!comparaison && mePts.length >= 3 && autrePts.length >= 3;
  const dSien = zones ? path(mePts) : "";
  const dAutre = zones ? path(autrePts) : "";
  const ecarts = comparaison ? ecartsAxes(axes, comparaison.valeurs) : axes.map(() => null);
  // en comparaison, les étiquettes rouges sont des liens : un groupe (une image rendrait ses liens muets)

  return (
    <svg viewBox={`${-MARGE} -4 ${size + 2 * MARGE} ${size + 12}`} width="100%" role={comparaison ? "group" : "img"} aria-label={title} style={{ display: "block", margin: "0 auto", overflow: "visible", color: couleur }}>
      <defs>
        <radialGradient id={`${uid}l`} cx={c} cy={c} r={Rr} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="currentColor" stopOpacity={0.04} />
          <stop offset="1" stopColor="currentColor" stopOpacity={0.26} />
        </radialGradient>
        {zones && (
          <>
            <mask id={`${uid}hs`} maskUnits="userSpaceOnUse" x={0} y={0} width={size} height={size}>
              <rect width={size} height={size} fill="#fff" />
              <path d={dSien} fill="#000" />
            </mask>
            <mask id={`${uid}ha`} maskUnits="userSpaceOnUse" x={0} y={0} width={size} height={size}>
              <rect width={size} height={size} fill="#fff" />
              <path d={dAutre} fill="#000" />
            </mask>
            <clipPath id={`${uid}ca`}>
              <path d={dAutre} />
            </clipPath>
          </>
        )}
      </defs>

      {[100, 80, 60, 40, 20].map((lv, k) => (
        <path key={lv} d={ring(lv)} fill="var(--ink)" fillOpacity={k % 2 === 0 ? 0.028 : 0.012} stroke={lv === 100 ? "var(--line-2)" : "var(--line)"} strokeWidth={1} />
      ))}
      {axes.map((_, i) => {
        const [x, y] = P(i, 100);
        return <line key={i} x1={c} y1={c} x2={f(x)} y2={f(y)} stroke="var(--line)" strokeWidth={1} />;
      })}

      {/* la moyenne des joueurs, au crayon (effacée pendant la comparaison) */}
      {hasAvg && avgPts.length >= 2 && (
        <path d={path(avgPts, avgPts.length === n)} fill="none" stroke="var(--ink-2)" strokeOpacity={0.75} strokeWidth={1.3} strokeDasharray="3.5 4" strokeLinejoin="round" />
      )}

      {/* les zones d'écart : vert = tu couvres plus, rouge = elle couvre plus */}
      {zones && (
        <g className="rl-fade">
          <path d={dSien} fill="var(--ink)" fillOpacity={0.06} clipPath={`url(#${uid}ca)`} />
          <path d={dAutre} fill="var(--gain)" style={{ fillOpacity: "var(--zone-op)" }} mask={`url(#${uid}hs)`} />
          <path d={dSien} fill="var(--perte)" style={{ fillOpacity: "var(--zone-op)" }} mask={`url(#${uid}ha)`} />
        </g>
      )}

      {/* ta forme : le trait fin, à ta couleur */}
      {comparaison && autrePts.length >= 2 && (
        <g style={{ color: comparaison.couleur }}>
          {autrePts.length >= 3 && !zones && <path d={path(autrePts)} fill="currentColor" fillOpacity={0.1} />}
          <path d={path(autrePts, autrePts.length >= 3)} pathLength={100} className="rl-drawline" fill="none" stroke="currentColor" strokeWidth={1.25} strokeLinejoin="round" />
          {autrePts.map(([x, y], k) => (
            <circle key={k} cx={f(x)} cy={f(y)} r={2.4} fill="var(--surface)" stroke="currentColor" strokeWidth={1.2} />
          ))}
        </g>
      )}

      {/* sa forme : le lavis, le trait épais au pinceau, les points */}
      <g className="rl-radar">
        {mePts.length >= 3 && !zones && <path d={path(mePts)} fill={`url(#${uid}l)`} />}
        {mePts.length >= 2 && (
          <path d={path(mePts, mePts.length >= 3)} pathLength={100} className="rl-drawline" filter="url(#rl-ink)" fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinejoin="round" strokeLinecap="round" />
        )}
        {mePts.map(([x, y], k) => (
          <circle key={k} cx={f(x)} cy={f(y)} r={3.6} fill="currentColor" stroke="var(--surface)" strokeWidth={1.6} />
        ))}
        {axes.map((a, i) => {
          if (a.me !== null) return null;
          const [x, y] = P(i, 12);
          return <circle key={`v${i}`} cx={f(x)} cy={f(y)} r={2.6} fill="var(--surface)" stroke="var(--ink-3)" strokeWidth={1.1} />;
        })}
      </g>

      {axes.map((a, i) => {
        const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        const x = c + Math.cos(ang) * (Rr + 26);
        const y = c + Math.sin(ang) * (Rr + 22);
        const anchor = Math.abs(Math.cos(ang)) < 0.2 ? "middle" : Math.cos(ang) > 0 ? "start" : "end";
        const autre = comparaison ? (comparaison.valeurs[i] ?? null) : null;
        const e = ecarts[i];
        const texte = (
          <text x={f(x)} y={f(y + 4)} textAnchor={anchor} className={r.axeL} style={{ fontFamily: "var(--font-sans)", fontWeight: 650, fill: "var(--ink)" }}>
            {a.label}
            <tspan x={f(x)} dy="1.35em" className={r.axeV} style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fill: "var(--ink)" }}>
              {a.me === null ? "—" : a.me}
              {/* le jeton court : ton écart, de ton côté */}
              {e ? <tspan style={{ fill: couleurSens(e.sens), fontWeight: 650 }}>{` ${e.court}`}</tspan> : null}
            </tspan>
          </text>
        );
        // une étiquette rouge (elle mène) : le lien vers l'entraînement de la matière
        if (e && e.sens === "perte") {
          const lien = R.entrainer(a.label, a.qui, Math.abs(e.delta));
          return (
            <g key={i}>
              <title>{titreAxe(a, autre, comparaison)}</title>
              <a href={`/practice?topic=${encodeURIComponent(a.cle)}`} aria-label={lien} className={r.lienAxe}>
                <title>{lien}</title>
                {texte}
              </a>
            </g>
          );
        }
        return (
          <g key={i} style={{ cursor: "help" }}>
            <title>{titreAxe(a, autre, comparaison)}</title>
            {texte}
          </g>
        );
      })}
    </svg>
  );
}
