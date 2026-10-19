import { LineChart } from "lucide-react";
import type { DonneesBlocs, SeanceProgression } from "@/lib/profil/blocs-donnees";
import { couleurCss } from "@/lib/profil/catalogue";
import type { Format } from "@/lib/profil/disposition";
import { nombre, pct } from "@/lib/voice";
import { BLOCS_JOURNAL as V } from "@/lib/voice-blocs-journal";
import { jourCourt } from "@/lib/voice-profil";
import { Cellule, Coque, DemiBande, Vide, type Ctx } from "./commun";
import s from "./Progression.module.css";

// Le bloc Progression de la page de profil : les séances d'entraînement
// ciblé, aux trois premiers formats en « Courbe d'encre » (une étiquette, la
// moyenne des 5 dernières séances en grand, la courbe des dernières séances à
// l'encre sur une aire teintée à la couleur du joueur, le dernier point qui
// pulse, la ligne de seuil de 70 % en pointillé discret) et, en bande et en
// demi-bande, en « Barres de score » (une barre par séance : verte à 75 %
// et plus, rouge sous 60 %, à l'encre entre les deux ; la ligne du seuil ;
// les barres qui poussent). Une seule rendue pour tous : chez soi et chez un
// autre, le même dessin, sans comparaison. Le bloc demande 2 séances au
// moins : rien en vue publique, l'état vide dans Personnaliser.
// Sans état : rendu au serveur comme au client.

/** le jour de Paris d'une séance (AAAA-MM-JJ) */
const JOUR_PARIS = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" });

export type PointSeance = { jour: string; pct: number };

/** Les séances notées (total > 0), de la plus ancienne à la plus récente, avec leur % (comme PracticeProgressChart). */
export function pointsSeances(seances: SeanceProgression[] | null | undefined): PointSeance[] {
  return (seances ?? [])
    .filter((x) => x.total > 0)
    .slice()
    .sort((a, b) => Date.parse(a.completed_at) - Date.parse(b.completed_at))
    .map((x) => ({ jour: JOUR_PARIS.format(new Date(x.completed_at)), pct: Math.round((x.score / x.total) * 100) }));
}

/** La moyenne des 5 dernières séances (arrondie) ; null sans séance. */
export function moyenne5(points: PointSeance[]): number | null {
  const cinq = points.slice(-5);
  if (!cinq.length) return null;
  return Math.round(cinq.reduce((t, p) => t + p.pct, 0) / cinq.length);
}

/** Le seuil de réussite visé (%), tracé en pointillé. */
export const SEUIL = 70;
/** Les couleurs d'une barre : vert à partir de 75 %, rouge sous 60 %, l'encre entre les deux. */
export const BON = 75;
export const FAIBLE = 60;
export const sens = (p: number): "ok" | "ko" | "mid" => (p >= BON ? "ok" : p < FAIBLE ? "ko" : "mid");

/** Combien de séances chaque format montre (les dernières). */
export const NOMBRE: Record<Format, number> = { tuile: 12, colonne: 14, heros: 20, bande: 20, demi: 14 };

// ── La courbe d'encre ─────────────────────────────────────────────────────

const Y_HAUT = 10;
const Y_BAS = 90;

export type GeoCourbe = { chemin: string; aire: string; fin: { x: number; y: number }; ySeuil: number };

/** Le tracé des séances, en pourcentages d'une boîte étirée (viewBox 0 0 100 100) ; le seuil compte dans l'échelle. */
export function geoCourbe(valeurs: number[]): GeoCourbe {
  const lo0 = Math.min(...valeurs, SEUIL);
  const hi0 = Math.max(...valeurs, SEUIL);
  const pad = (hi0 - lo0) * 0.12 || 10;
  const y = (v: number) => Y_BAS - ((v - (lo0 - pad)) / (hi0 - lo0 + 2 * pad)) * (Y_BAS - Y_HAUT);
  const n = valeurs.length;
  const xs = valeurs.map((_, i) => (n > 1 ? (i / (n - 1)) * 100 : 50));
  const f = (v: number) => v.toFixed(2);
  const chemin = xs.map((x, i) => `${i ? "L" : "M"}${f(x)},${f(y(valeurs[i]))}`).join(" ");
  return { chemin, aire: `${chemin} L${f(xs[n - 1])},100 L${f(xs[0])},100 Z`, fin: { x: xs[n - 1], y: y(valeurs[n - 1]) }, ySeuil: y(SEUIL) };
}

function CourbeEncre({ d, points, classe, bornes }: { d: DonneesBlocs; points: PointSeance[]; classe: string; bornes: boolean }) {
  const g = geoCourbe(points.map((p) => p.pct));
  const label = V.courbeSeances(d.nom);
  return (
    <figure className={s.figure} style={{ ["--acc" as string]: couleurCss(d.accent) }}>
      <div className={s.courbe + " " + classe}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={label} className={s.svg}>
          <title>{label}</title>
          <path d={g.aire} className={s.aire} />
          <line x1={0} x2={100} y1={g.ySeuil.toFixed(2)} y2={g.ySeuil.toFixed(2)} className={s.seuil} />
          <path d={g.chemin} className={s.trait} />
        </svg>
        <span className={s.repere} style={{ top: `${g.ySeuil.toFixed(2)}%` }} aria-hidden>
          {pct(SEUIL)}
        </span>
        <span className={s.fin} style={{ left: `${g.fin.x.toFixed(2)}%`, top: `${g.fin.y.toFixed(2)}%` }} aria-hidden />
      </div>
      {bornes && points.length > 1 && (
        <figcaption className={s.bornes}>
          <span>{jourCourt(points[0].jour)}</span>
          <span>{jourCourt(points[points.length - 1].jour)}</span>
        </figcaption>
      )}
    </figure>
  );
}

// ── Les barres de score ───────────────────────────────────────────────────

function Barres({ d, points, classe }: { d: DonneesBlocs; points: PointSeance[]; classe: string }) {
  return (
    <div className={s.barres + " " + classe} role="img" aria-label={V.barresSeances(d.nom)}>
      {points.map((p, i) => (
        <i key={i} className={s[sens(p.pct)]} style={{ ["--h" as string]: `${Math.max(0, Math.min(100, p.pct))}%`, ["--d" as string]: `${Math.min(i * 45, 700)}ms` }} title={V.seanceBulle(jourCourt(p.jour), p.pct)} />
      ))}
      <span className={s.ligneSeuil} style={{ bottom: `${SEUIL}%` }} aria-hidden />
    </div>
  );
}

// ── Les formats ───────────────────────────────────────────────────────────

/** L'étiquette discrète et, à droite, ce que dit le grand chiffre. */
function Tete({ titre, droite }: { titre: string; droite?: string }) {
  return (
    <div className={s.tete}>
      <h3 className={s.lab}>{titre}</h3>
      {droite && <span className={s.petit}>{droite}</span>}
    </div>
  );
}

function ProgressionContenu({ d, f, points }: { d: DonneesBlocs; f: Format; points: PointSeance[] }) {
  const m = moyenne5(points);
  const chiffre = m === null ? "—" : pct(m);
  const dernieres = points.slice(-NOMBRE[f]);

  // demi-bande : la cellule et les barres
  if (f === "demi")
    return (
      <DemiBande label={V.seances} dessin={<Barres d={d} points={dernieres} classe={s.barresDemi} />}>
        <Cellule etiquette={V.seances} chiffre={chiffre} petit={V.nSeances(points.length)} />
      </DemiBande>
    );

  // bande : le chiffre à gauche, les barres à droite (dès que la case est assez large)
  if (f === "bande")
    return (
      <Coque f={f} label={V.seances}>
        <div className={s.bande}>
          <div className={s.gauche}>
            <Tete titre={V.dernieres(dernieres.length)} />
            <span className={"t-num " + s.grand}>{chiffre}</span>
            <span className={s.petit}>{V.moyenne5}</span>
          </div>
          <div className={s.droite}>
            <Barres d={d} points={dernieres} classe={s.barresBande} />
            <p className={s.legendeSeuil}>
              <i aria-hidden /> {V.seuil(SEUIL)}
            </p>
          </div>
        </div>
      </Coque>
    );

  // mini-tuile, colonne, héros : la courbe d'encre
  return (
    <Coque f={f} label={V.seances}>
      <div className={s.corps + (f === "colonne" ? " " + s.espace : "")}>
        <Tete titre={V.seances} droite={V.moyenne5} />
        <span className={"t-num " + s.grand}>{chiffre}</span>
        <CourbeEncre d={d} points={dernieres} classe={f === "tuile" ? s.tuile : f === "colonne" ? s.colonne : s.heros} bornes={f !== "tuile"} />
        {f === "colonne" && (
          <dl className={s.reperes}>
            <div>
              <dt>{V.nbSeances}</dt>
              <dd>{nombre(points.length)}</dd>
            </div>
            <div>
              <dt>{V.meilleure}</dt>
              <dd>{pct(Math.max(...points.map((p) => p.pct)))}</dd>
            </div>
            <div>
              <dt>{V.derniere}</dt>
              <dd>{pct(points[points.length - 1].pct)}</dd>
            </div>
          </dl>
        )}
      </div>
    </Coque>
  );
}

/**
 * Le bloc Progression. Moins de 2 séances : rien en vue publique, l'état
 * vide dans Personnaliser.
 */
export function ProgressionBloc({ d, f, edition }: Ctx): React.ReactNode {
  if (!d.progression || d.progression.length < 2)
    return edition ? <Vide bloc={{ k: "progression", f }} f={f} icone={<LineChart size={17} aria-hidden />} /> : null;
  const points = pointsSeances(d.progression);
  if (!points.length) return edition ? <Vide bloc={{ k: "progression", f }} f={f} icone={<LineChart size={17} aria-hidden />} /> : null;
  return <ProgressionContenu d={d} f={f} points={points} />;
}
