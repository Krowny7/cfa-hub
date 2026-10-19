import { Clock } from "lucide-react";
import { parHeure, type ExtraitRythme } from "@/lib/profil/blocs-donnees";
import { BLOCS_NEUVES as V, JOURS_SEMAINE } from "@/lib/voice-blocs-neuves";
import { Cellule, Coque, DemiBande, Vide, type Ctx } from "./commun";
import { Mention, Tete, mentionDemi, vars } from "./neuves";
import n from "./neuves.module.css";

// Le bloc « Rythme » (rythme) : les heures où il révise, sur 60 jours. Deux
// dessins. A, « Les heures » (héros, bande, demi-bande) : une grille de 7
// lignes (lundi → dimanche) × 24 heures, une case par heure, à quatre
// niveaux d'encre ; en repère « plutôt le soir ». B, « L'horloge » (mini-tuile
// et colonne) : une horloge de 24 h, un rayon par heure, plus long aux heures
// fortes, le pic en vermillon ; en repère « pic à 21 h ». Suit la visibilité du
// Journal (des heures en disent long) : fermé, rien en vue publique, la
// mention dans Personnaliser. Le serveur calcule la grille (168 entiers) ;
// aucun horodatage ne part au client. Le même dessin chez soi et chez un
// autre. Sans état.

const ICONE = <Clock size={17} aria-hidden />;

/** Le niveau d'encre d'une case, de 0 (vide) à 4 : la racine de sa part du maximum (les petites valeurs restent visibles). */
export function niveauRythme(v: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (!(v > 0) || !(max > 0)) return 0;
  const r = Math.sqrt(Math.min(1, v / max));
  return r < 0.4 ? 1 : r < 0.65 ? 2 : r < 0.85 ? 3 : 4;
}

/** Le jour le plus actif (0 : lundi … 6 : dimanche). */
export function jourFort(grille: number[][]): number {
  const sommes = grille.map((ligne) => ligne.reduce((t, v) => t + v, 0));
  return sommes.indexOf(Math.max(...sommes));
}

/** La légende des niveaux : « moins ▢▢▢▢▢ plus ». */
function Legende() {
  return (
    <p className={n.rLegende} aria-hidden>
      <span>{V.moins}</span>
      {[0, 1, 2, 3, 4].map((i) => (
        <i key={i} data-n={i} />
      ))}
      <span>{V.plus}</span>
    </p>
  );
}

/** La grille A : 7 lignes × 24 heures ; `etiquettes` : les initiales des jours et les heures repères. */
function Grille({ r, etiquettes, dit }: { r: ExtraitRythme; etiquettes: boolean; dit: string }) {
  const max = Math.max(...r.grille.flat());
  return (
    <div className={n.rGrille + (etiquettes ? "" : " " + n.rMini)} role="img" aria-label={dit}>
      {etiquettes && (
        <div className={n.rJours} aria-hidden>
          {JOURS_SEMAINE.map(([ini, nom]) => (
            <span key={nom}>{ini}</span>
          ))}
        </div>
      )}
      <div className={n.rCases}>
        {r.grille.flatMap((ligne, j) =>
          ligne.map((v, h) => <i key={j * 24 + h} data-n={niveauRythme(v, max)} title={v > 0 && etiquettes ? V.caseDit(JOURS_SEMAINE[j][1], h, v) : undefined} />),
        )}
      </div>
      {etiquettes && (
        <div className={n.rHeures} aria-hidden>
          {[0, 6, 12, 18].map((h) => (
            <span key={h} style={{ gridColumn: `${h + 1} / span 6` }}>
              {V.heure(h)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** L'horloge B : un rayon par heure, du centre vers le bord, plus long aux heures fortes ; le pic en vermillon. */
function Horloge({ r, dit }: { r: ExtraitRythme; dit: string }) {
  const heures = parHeure(r.grille);
  const max = Math.max(...heures) || 1;
  const point = (rayon: number, h: number): [string, string] => {
    const a = (2 * Math.PI * h) / 24;
    return [(100 + rayon * Math.sin(a)).toFixed(1), (100 - rayon * Math.cos(a)).toFixed(1)];
  };
  return (
    <svg className={n.rHorloge} viewBox="-10 -10 220 220" role="img" aria-label={dit} focusable="false">
      <circle cx="100" cy="100" r="34" className={n.rCentre} />
      <circle cx="100" cy="100" r="94" className={n.rBord} />
      {heures.map((v, h) => {
        const x = v / max;
        const [x1, y1] = point(40, h);
        const [x2, y2] = point(40 + Math.max(0.05, x) * 52, h);
        const pic = h === r.pic;
        return (
          <line
            key={h}
            className={n.rayon}
            data-pic={pic ? "oui" : undefined}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            pathLength={100}
            style={vars({ "--i": h, opacity: pic ? 1 : (0.25 + x * 0.75).toFixed(2) })}
          >
            <title>{`${V.heure(h)} · ${v}`}</title>
          </line>
        );
      })}
      {[0, 6, 12, 18].map((h) => {
        const [x, y] = point(106, h);
        return (
          <text key={h} className={n.rBorne} x={x} y={y} textAnchor="middle" dominantBaseline="middle">
            {V.heure(h)}
          </text>
        );
      })}
    </svg>
  );
}

export function RythmeBloc({ d, f, edition }: Ctx): React.ReactNode {
  const r = d.rythme ?? null;
  if (!r) return edition ? <Vide bloc={{ k: "rythme", f }} f={f} icone={ICONE} /> : null;
  const moment = V.moments[r.moment];

  if (f === "demi")
    return (
      <DemiBande label={V.rythme} dessin={<Grille r={r} etiquettes={false} dit={V.grilleDit(r.pic, moment)} />} droite={mentionDemi(d, edition)}>
        <Cellule etiquette={V.rythme} chiffre={V.heure(r.pic)} petit={`${V.picMot.toLowerCase()} · ${moment}`} />
      </DemiBande>
    );

  // B : l'horloge, en mini-tuile et en colonne
  if (f === "tuile" || f === "colonne") {
    const fort = JOURS_SEMAINE[jourFort(r.grille)][1];
    return (
      <Coque f={f} label={V.rythme} className={n.coque + " " + n.rythme + " " + n[f]}>
        <Tete titre={V.rythme} repere={f === "tuile" ? V.pic(r.pic) : moment} />
        <div className={n.rHorlogeBox}>
          <Horloge r={r} dit={V.horlogeDit(r.pic, moment)} />
        </div>
        {f === "colonne" && (
          <dl className={n.rFaits}>
            <div>
              <dt>{V.picMot}</dt>
              <dd className={n.mono}>{V.heure(r.pic)}</dd>
            </div>
            <div>
              <dt>{V.jourFort}</dt>
              <dd>{fort}</dd>
            </div>
            <div>
              <dt>{V.momentMot}</dt>
              <dd>{moment.replace("plutôt ", "")}</dd>
            </div>
          </dl>
        )}
        {f === "colonne" && <p className={n.petit}>{V.lectureHorloge}</p>}
        <Mention d={d} edition={edition} />
      </Coque>
    );
  }

  // A : la grille, en héros et en bande ; à côté (dès que la case est large), l'heure forte et le jour fort
  const fort = JOURS_SEMAINE[jourFort(r.grille)][1];
  return (
    <Coque f={f} label={V.rythme} className={n.coque + " " + n.rythme + " " + n[f]}>
      <Tete titre={V.rythme} repere={moment} />
      <div className={n.rCorps}>
        <Grille r={r} etiquettes dit={V.grilleDit(r.pic, moment)} />
        <div className={n.rAside}>
          <p className={n.rFait}>
            <span className={n.petit}>{V.picMot}</span>
            <b className={"t-num tabular-nums " + n.rPic}>{V.heure(r.pic)}</b>
          </p>
          <p className={n.rFait}>
            <span className={n.petit}>{V.jourFort}</span>
            <b className={n.rJourFort}>{fort}</b>
          </p>
          <Legende />
          <p className={n.petit}>{V.fenetre}</p>
        </div>
      </div>
      <Mention d={d} edition={edition} />
    </Coque>
  );
}
