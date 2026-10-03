import { CalendarDays, Check, Swords } from "lucide-react";
import { DUEL_QUESTIONS } from "@/lib/duels";
import { Tile } from "@/components/accueil/Tile";
import { countdown, durationLabel, hourLabel, longDay, plural } from "@/components/accueil/format";
import type { AccueilData, MockExamCard } from "@/components/accueil/types";

// Tuile de contexte de « Aujourd'hui » : une seule chose, la plus pressante.
// Défi reçu > duel en cours > examen blanc classé dans 7 jours ou moins >
// « Lance un duel ». Le reste (classement, examens à venir) vit sur /classement.

/** Un examen blanc n'apparaît sur l'accueil qu'à 7 jours ou moins. */
export const EXAM_SOON_DAYS = 7;

const TZ = "Europe/Paris";
const DISC = "grid h-11 w-11 flex-none place-items-center rounded-full border border-line bg-surface sm:h-14 sm:w-14";

function initials(name: string | null) {
  const parts = (name ?? "").replace(/[^A-Za-zÀ-ÿ ]+/g, " ").trim().split(/ +/).filter(Boolean);
  if (!parts.length) return "?";
  return ((parts[0][0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function ContextTile({ duel, exam }: { duel: AccueilData["incomingDuel"]; exam: MockExamCard | null }) {
  const icon = <Swords size={14} aria-hidden />;

  if (duel) {
    const incoming = duel.kind === "incoming";
    const who = duel.from ?? "Un joueur";
    return (
      <Tile
        href={`/duel/${duel.id}`}
        label={incoming ? "Défi reçu" : "Duel en cours"}
        icon={icon}
        ariaLabel={incoming ? `${who} te défie. Relever le défi` : "Voir le duel en cours"}
      >
        <Row
          visual={<span className={DISC + " text-[13px] font-bold sm:text-[15px]"}>{initials(duel.from)}</span>}
          title={incoming ? `${who} te défie` : duel.from ? `Contre ${duel.from}` : "Ton duel t'attend"}
          meta={incoming ? `${DUEL_QUESTIONS} questions · relève le défi` : `${DUEL_QUESTIONS} questions · à terminer`}
        />
      </Tile>
    );
  }

  if (exam && exam.daysLeft <= EXAM_SOON_DAYS) {
    const when = new Date(exam.scheduledAt);
    const day = new Intl.DateTimeFormat("fr-FR", { day: "numeric", timeZone: TZ }).format(when);
    const month = new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: TZ }).format(when).replace(".", "");
    const live = exam.open && exam.daysLeft <= 0;
    const status = exam.registered
      ? live
        ? "tu es inscrit · c'est parti"
        : "tu es inscrit"
      : `${exam.registrantCount} ${plural(exam.registrantCount, "inscrit")} · inscris-toi`;
    return (
      <Tile
        href={`/mock-exams/${exam.id}`}
        label="Examen blanc classé"
        icon={<CalendarDays size={14} aria-hidden />}
        aside={<span className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-white">{countdown(exam.daysLeft)}</span>}
        ariaLabel={`Examen blanc classé, ${longDay(when)}`}
      >
        <Row
          visual={
            <span className="grid h-11 w-11 flex-none place-content-center rounded-[12px] border border-line bg-surface text-center sm:h-14 sm:w-14 sm:rounded-[14px]">
              <span className="text-[15px] font-extrabold leading-none tabular-nums sm:text-[18px]">{day}</span>
              <span className="t-micro mt-0.5 leading-none">{month}</span>
            </span>
          }
          title={longDay(when)}
          meta={`${hourLabel(when)} · ${exam.questionCount} questions · ${durationLabel(exam.durationMinutes)}`}
          extra={
            <span className="t-micro mt-0.5 flex items-center gap-1 truncate">
              {exam.registered && <Check size={12} aria-hidden />}
              {status}
            </span>
          }
        />
      </Tile>
    );
  }

  return (
    <Tile href="/duel" label="Duel" icon={icon} ariaLabel="Lancer un duel">
      <Row
        visual={
          <span className={DISC}>
            <Swords size={20} strokeWidth={1.8} aria-hidden />
          </span>
        }
        title="Lance un duel"
        meta={`${DUEL_QUESTIONS} questions · format examen · ±ELO`}
      />
    </Tile>
  );
}

function Row({ visual, title, meta, extra }: { visual: React.ReactNode; title: string; meta: string; extra?: React.ReactNode }) {
  return (
    <span className="flex min-w-0 items-center gap-3 sm:gap-4">
      {visual}
      <span className="min-w-0">
        <span className="t-h3 block truncate">{title}</span>
        <span className="t-micro mt-1 block truncate">{meta}</span>
        {extra}
      </span>
    </span>
  );
}
