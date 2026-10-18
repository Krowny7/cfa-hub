import { LineChart } from "lucide-react";
import { PracticeProgressChart } from "@/components/PracticeProgressChart";
import { TOPIC_LABELS } from "@/lib/practiceTopics";
import { decaleJour } from "@/lib/objectif-calc";
import { ecart } from "@/lib/profil/ecart";
import type { DonneesBlocs, SeanceProgression } from "@/lib/profil/blocs-donnees";
import type { Format } from "@/lib/profil/disposition";
import { pct } from "@/lib/voice";
import { BLOCS_PROFIL as T } from "@/lib/voice-blocs";
import { BLOCS_JOURNAL as V } from "@/lib/voice-blocs-journal";
import { Cellule, Chiffre, Coque, DemiBande, DoubleCourbe, Etiquette, Jeton, Vide, maCouleur, type Ctx, type Serie } from "./commun";
import s from "./Progression.module.css";

// Le bloc Progression de la page de profil : les séances d'entraînement
// ciblé. Chez un autre : « en séance, est-il plus juste que moi ces derniers
// temps ? » : le chiffre fort est la moyenne de ses 5 dernières séances
// (« 78 % »), le jeton ton écart (« toi −9 », 3 séances au moins de chaque
// côté), la courbe double les 60 derniers jours sur un même axe de dates (la
// sienne épaisse, avec ses points en héros et en bande ; la tienne fine,
// sans points ; le seuil de 70 % en pointillé ; les dates aux deux bouts).
// Retirés chez un autre : le titre, la ligne « N sessions · moyenne… », le
// menu des matières, la légende, la ligne de moyenne.
// Chez soi : en héros et en bande, PracticeProgressChart tel quel ; en
// mini-tuile, colonne et demi-bande, un rendu compact (le chiffre, « 12
// séances », la courbe seule). Le bloc demande 2 séances au moins.
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

/** Les seuils de la spécification : le jeton (3 séances de chaque côté), ta courbe (2 séances). */
export const SEUIL_JETON = 3;
export const SEUIL_COURBE = 2;

/**
 * Les deux courbes des 60 derniers jours (jusqu'à aujourd'hui, ou la
 * dernière séance) ; si ses séances y sont moins de 2, ses 10 dernières, et
 * les tiennes depuis la première d'entre elles.
 */
export function seriesSeances(lui: PointSeance[], toi: PointSeance[] | null, aujourdhui: string | null): { lui: Serie; toi: Serie | null } {
  const fin = aujourdhui ?? [...lui, ...(toi ?? [])].map((p) => p.jour).sort().pop() ?? "";
  let debut = fin ? decaleJour(fin, -60) : "";
  let siens = lui.filter((p) => p.jour >= debut);
  if (siens.length < 2) {
    siens = lui.slice(-10);
    debut = siens[0]?.jour ?? debut;
  }
  const tiens = (toi ?? []).filter((p) => p.jour >= debut);
  const serie = (pts: PointSeance[]): Serie => ({ dates: pts.map((p) => p.jour), valeurs: pts.map((p) => p.pct) });
  return { lui: serie(siens), toi: toi && tiens.length >= SEUIL_COURBE ? serie(tiens) : null };
}

/** La courbe du bloc : la sienne (et la tienne, chez un autre). */
function Courbe({ d, lui, toi, h, points, bornes = true }: { d: DonneesBlocs; lui: PointSeance[]; toi: PointSeance[] | null; h: number; points: boolean; bornes?: boolean }) {
  const series = seriesSeances(lui, toi, d.toi?.aujourdhui ?? d.carnet?.aujourdhui ?? null);
  const label = series.toi ? T.doubleTrait(d.nom) : d.moi ? V.tesSeances : V.courbeSeances(d.nom);
  return <DoubleCourbe lui={series.lui} toi={series.toi} couleurToi={maCouleur(d)} h={h} seuil={70} points={points} label={label} bornes={bornes} />;
}

/** La hauteur de la courbe selon le format (la grammaire : 48 / 160 / 160 / 140 / 80 px). */
const HAUTEUR: Record<Format, number> = { tuile: 48, colonne: 160, heros: 160, bande: 140, demi: 80 };

// ── Chez un autre ─────────────────────────────────────────────────────────
function ProgressionAutre({ d, f, lui }: { d: DonneesBlocs; f: Format; lui: PointSeance[] }) {
  const toi = d.toi ? pointsSeances(d.toi.seances) : null;
  const mLui = moyenne5(lui);
  const mToi = toi ? moyenne5(toi) : null;
  // le jeton : 3 séances au moins de chaque côté
  const e = toi && lui.length >= SEUIL_JETON && toi.length >= SEUIL_JETON ? ecart(mLui, mToi, "pct") : null;
  const bulle = e && mLui !== null && mToi !== null ? T.bulle(V.cinqDernieres, d.nom, pct(mLui), pct(mToi)) : undefined;
  const titre = d.toi && !e ? T.pasMesure : undefined;
  const chiffre = mLui === null ? "—" : pct(mLui);
  const courbe = <Courbe d={d} lui={lui} toi={toi} h={HAUTEUR[f]} points={f === "heros" || f === "bande"} bornes={f !== "demi"} />;
  if (f === "demi")
    return (
      <DemiBande label={V.seances} dessin={courbe}>
        <Cellule etiquette={V.seances} chiffre={chiffre} jeton={<Jeton e={e} d={d} bulle={bulle} />} titre={titre} />
      </DemiBande>
    );
  const grand = f === "heros" || f === "bande";
  return (
    <Coque f={f} label={V.seances}>
      <Etiquette f={f} icone={<LineChart size={17} aria-hidden />} titre={V.seances} />
      {/* le jeton sous le chiffre ; en bande, à sa droite, sur la même ligne de base */}
      <span className={f === "bande" ? "flex flex-wrap items-baseline gap-x-4 gap-y-1" : "flex flex-col gap-1"}>
        <Chiffre f={f} titre={titre}>
          {chiffre}
        </Chiffre>
        <Jeton e={e} d={d} bulle={bulle} taille={grand ? 16 : undefined} />
      </span>
      <div className={grand ? s.pleine : "mt-auto"}>{courbe}</div>
    </Coque>
  );
}

// ── Chez soi ──────────────────────────────────────────────────────────────
function ProgressionMoi({ d, f, lui }: { d: DonneesBlocs; f: Format; lui: PointSeance[] }) {
  // héros et bande : la courbe du site telle quelle (sa carte, son filtre par matière)
  if (f === "heros" || f === "bande")
    return (
      <div className={"flex min-w-0 flex-col " + s.remplit}>
        <PracticeProgressChart pastSessions={d.progression!} topicLabels={TOPIC_LABELS} />
      </div>
    );
  const m = moyenne5(lui);
  const chiffre = m === null ? "—" : pct(m);
  const courbe = <Courbe d={d} lui={lui} toi={null} h={HAUTEUR[f]} points={false} bornes={f !== "demi"} />;
  if (f === "demi")
    return (
      <DemiBande label={V.seances} dessin={courbe}>
        <Cellule etiquette={V.seances} chiffre={chiffre} petit={V.nSeances(lui.length)} />
      </DemiBande>
    );
  return (
    <Coque f={f} label={V.seances}>
      <Etiquette f={f} icone={<LineChart size={17} aria-hidden />} titre={V.seances} />
      <span className="flex flex-col gap-1">
        <Chiffre f={f}>{chiffre}</Chiffre>
        <span className="text-[13px]" style={{ color: "var(--ink-2)" }}>
          {V.nSeances(lui.length)}
        </span>
      </span>
      <div className="mt-auto">{courbe}</div>
    </Coque>
  );
}

/**
 * Le bloc Progression. Moins de 2 séances : rien en vue publique, l'état
 * vide dans Personnaliser.
 */
export function ProgressionBloc({ d, f, edition }: Ctx): React.ReactNode {
  const lui = pointsSeances(d.progression);
  if (!d.progression || d.progression.length < 2)
    return edition ? <Vide bloc={{ k: "progression", f }} f={f} icone={<LineChart size={17} aria-hidden />} /> : null;
  if (d.moi) return <ProgressionMoi d={d} f={f} lui={lui} />;
  return <ProgressionAutre d={d} f={f} lui={lui} />;
}
