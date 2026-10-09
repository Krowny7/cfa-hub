import { Batons } from "@/components/adn/Batons";
import { OBJECTIF_DU_JOUR } from "@/components/adn/AnneauDuJourEvents";
import { decaleJour } from "@/lib/objectif-calc";
import { JOURNAL, jourCourt } from "@/lib/voice-profil";
import s from "./CarnetJours.module.css";

// Le carnet de jours du Journal : l'encre de chaque jour, une case par jour
// (l'encre d'ActivityHeatmap : case au trait, puis de plus en plus dense ;
// encre pleine à l'objectif du jour). 52 semaines sur ordinateur, les 18
// dernières sur téléphone. Au-dessus : la série en cours en bâtons (Batons)
// et le record. Le détail d'un jour au survol (title, jours d'encre
// seulement). Des jours, jamais d'heures. Sans état : rendu au serveur.

const SEMAINES = 52;
const SEMAINES_TELEPHONE = 18;

const niveau = (n: number) => (n <= 0 ? 0 : n < OBJECTIF_DU_JOUR / 2 ? 1 : n < OBJECTIF_DU_JOUR ? 2 : 3);

export function CarnetJours({ jours, aujourdhui, serie, record }: { jours: Map<string, number>; aujourdhui: string; serie: number; record: number }) {
  // la première case : le lundi d'il y a 51 semaines
  const dow = (new Date(aujourdhui + "T12:00:00Z").getUTCDay() + 6) % 7;
  const debut = decaleJour(aujourdhui, -dow - (SEMAINES - 1) * 7);
  const debutTel = decaleJour(debut, (SEMAINES - SEMAINES_TELEPHONE) * 7);
  const cases: { jour: string; n: number; avenir: boolean }[] = [];
  for (let i = 0; i < SEMAINES * 7; i++) {
    const jour = decaleJour(debut, i);
    cases.push({ jour, n: jours.get(jour) ?? 0, avenir: jour > aujourdhui });
  }
  const actifs = cases.filter((c) => c.n > 0).length;
  const actifsTel = cases.filter((c) => c.n > 0 && c.jour >= debutTel).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h3 className="t-eyebrow m-0">{JOURNAL.carnet}</h3>
        {record > 0 ? (
          <p className="m-0 flex items-center gap-2.5 text-[13px] font-semibold">
            {serie > 0 && <Batons jours={serie} height={20} max={3} animer={false} className="shrink-0" />}
            <span>
              {JOURNAL.serie(serie)} <span className="font-normal text-muted">· {JOURNAL.record(record)}</span>
            </span>
          </p>
        ) : (
          <p className="t-small m-0">{JOURNAL.carnetVide}</p>
        )}
      </div>
      <div className={s.carnet} aria-hidden>
        {cases.map((c, i) =>
          c.avenir ? (
            <i key={i} data-f="" />
          ) : c.n > 0 ? (
            <i key={i} data-n={niveau(c.n)} title={JOURNAL.case(c.jour, c.n)} />
          ) : (
            <i key={i} />
          ),
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 font-mono text-[10.5px] tabular-nums text-muted">
        <span>
          {/* l'année du premier jour quand ce n'est pas celle d'aujourd'hui */}
          <span className="md:hidden">{jourCourt(debutTel, debutTel.slice(0, 4) !== aujourdhui.slice(0, 4))}</span>
          <span className="max-md:hidden">{jourCourt(debut, debut.slice(0, 4) !== aujourdhui.slice(0, 4))}</span>
          {" – "}
          {jourCourt(aujourdhui)}
          {" · "}
          <span className="md:hidden">{JOURNAL.actifs(actifsTel, SEMAINES_TELEPHONE)}</span>
          <span className="max-md:hidden">{JOURNAL.actifs(actifs, SEMAINES)}</span>
        </span>
        <span className="inline-flex items-center gap-1.5" title={JOURNAL.legende(OBJECTIF_DU_JOUR)}>
          {JOURNAL.moins}
          <span className={s.legende} aria-hidden>
            <i />
            <i data-n={1} />
            <i data-n={2} />
            <i data-n={3} />
          </span>
          {JOURNAL.plus}
        </span>
      </div>
    </div>
  );
}
