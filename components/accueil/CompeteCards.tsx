import { Check } from "lucide-react";
import { Icone } from "@/components/adn/icons";
import { SceauPerso } from "@/components/adn/SceauPerso";
import { DUEL_QUESTIONS, reviewLeftLabel } from "@/lib/duels";
import { DUEL, nombre, tuileRatures } from "@/lib/voice";
import { TUILES, duelARevoir } from "@/lib/voice-z1";
import { Tile } from "@/components/accueil/Tile";
import { countdown, durationLabel, hourLabel, longDay, plural } from "@/components/accueil/format";
import type { AccueilData, ErrorsSummary, MockExamCard, ReviewDuel } from "@/components/accueil/types";

// Les tuiles de « Aujourd'hui » (hors défi du jour, qui a la sienne :
// components/defi/DefiTile). Chacune dit une seule chose ; Sections.tsx
// choisit les trois plus pressantes. Sans état.

/** Un examen blanc n'apparaît sur l'accueil qu'à 7 jours ou moins. */
export const EXAM_SOON_DAYS = 7;

const TZ = "Europe/Paris";

/** Le sceau d'initiales de l'adversaire, à la place du rond gris. */
function Visage({ nom }: { nom: string | null }) {
  return <SceauPerso nom={nom ?? "?"} taille={38} className="shrink-0" />;
}

function Ligne({ visual, title, meta }: { visual?: React.ReactNode; title: React.ReactNode; meta: React.ReactNode }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      {visual}
      <span className="min-w-0">
        <span className="t-h3 block truncate">{title}</span>
        <span className="t-micro mt-0.5 block truncate">{meta}</span>
      </span>
    </span>
  );
}

/** Défi reçu (à toi le trait) ou duel en cours. */
export function DuelTile({ duel }: { duel: NonNullable<AccueilData["incomingDuel"]> }) {
  const incoming = duel.kind === "incoming";
  const who = duel.from ?? "Un joueur";
  return (
    <Tile
      href={`/duel/${duel.id}`}
      label={incoming ? TUILES.defiRecu : TUILES.duelEnCours}
      icon={<Icone nom="duel" size={15} />}
      ariaLabel={incoming ? `${who} te défie. Relever le défi` : "Reprendre le duel en cours"}
      cta={incoming ? "Relever le défi" : "Reprendre la partie"}
    >
      <Ligne
        visual={<Visage nom={duel.from} />}
        title={incoming ? `${who} te défie` : duel.from ? `Contre ${duel.from}` : "Ta partie t'attend"}
        meta={incoming ? `${DUEL_QUESTIONS} questions · à toi le trait` : `${DUEL_QUESTIONS} questions · à terminer`}
      />
    </Tile>
  );
}

/** Le dernier duel terminé : le verdict en une ligne, la revue en action. */
export function ReviewDuelTile({ duel, nowIso }: { duel: ReviewDuel; nowIso: string }) {
  const v = duelARevoir({ gagne: duel.won, moi: duel.myScore, lui: duel.theirScore, adversaire: duel.opponentName, delta: duel.myDelta });
  const n = duel.myScore !== null ? Math.max(0, duel.total - duel.myScore) : 0;
  const left = reviewLeftLabel(duel.finishedAt, nowIso);
  return (
    <Tile
      href={`/duel/${duel.id}?revue=1`}
      label={TUILES.duelRevoir}
      icon={<Icone nom="duel" size={15} />}
      aside={left ?? undefined}
      ariaLabel={`${v.titre}, ${v.ligne}. ${DUEL.revue(n)}`}
      cta={DUEL.revue(n)}
    >
      <Ligne visual={<Visage nom={duel.opponentName} />} title={v.titre} meta={v.ligne} />
    </Tile>
  );
}

/** Les ratures des fiches : le nombre à reprendre, ou « Page propre. » */
export function RaturesTile({ errors }: { errors: ErrorsSummary }) {
  const t = tuileRatures(errors.total);
  const href = errors.total > 0 ? (errors.bySubject[0]?.href ?? "/fiches") : "/fiches";
  const detail = errors.total > 0 ? errors.bySubject.slice(0, 3).map((s) => `${s.short} ${s.count}`).join(" · ") : "chaque rature a été reprise";
  return (
    <Tile
      href={href}
      label={t.label}
      icon={<Icone nom="erreurs" size={15} className="text-pen" />}
      ariaLabel={`${t.label} : ${t.valeur}`}
      cta={errors.total > 0 ? TUILES.reprendre : "Ouvrir une fiche"}
    >
      {errors.total > 0 ? (
        <span className="flex items-baseline gap-2">
          <span className="t-num text-[30px] leading-none">{nombre(errors.total)}</span>
          <span className="text-[14px] font-semibold text-muted">à reprendre</span>
        </span>
      ) : (
        <span className="t-h3 block">{t.valeur}</span>
      )}
      <span className="t-micro mt-1 block truncate">{detail}</span>
    </Tile>
  );
}

/** Examen blanc classé dans 7 jours ou moins. */
export function ExamTile({ exam }: { exam: MockExamCard }) {
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
      label={TUILES.examen}
      icon={<Icone nom="examen" size={15} />}
      aside={<span className="font-mono text-[11.5px] text-white">{countdown(exam.daysLeft)}</span>}
      ariaLabel={`Examen blanc classé, ${longDay(when)}`}
      cta={exam.registered ? (live ? "Entrer dans l'examen" : "Voir l'examen") : "M'inscrire"}
    >
      <Ligne
        visual={
          <span aria-hidden className="grid h-[38px] w-[38px] flex-none place-content-center rounded-[11px] border border-line bg-surface text-center">
            <span className="text-[14px] font-extrabold leading-none tabular-nums">{day}</span>
            <span className="mt-0.5 text-[9.5px] font-semibold leading-none text-muted">{month}</span>
          </span>
        }
        title={longDay(when)}
        meta={
          <>
            {hourLabel(when)} · {exam.questionCount} questions · {durationLabel(exam.durationMinutes)} · {exam.registered && <Check size={11} aria-hidden className="inline align-[-1px]" />} {status}
          </>
        }
      />
    </Tile>
  );
}

/** Rien de pressant côté duel : en lancer un. */
export function LaunchDuelTile() {
  return (
    <Tile href="/duel" label={TUILES.duel} icon={<Icone nom="duel" size={15} />} ariaLabel={TUILES.lancer} cta={DUEL.trouver}>
      <Ligne
        visual={
          <span aria-hidden className="grid h-[38px] w-[38px] flex-none place-items-center rounded-full border border-line bg-surface">
            <Icone nom="duel" size={19} />
          </span>
        }
        title="Lance un duel"
        meta={TUILES.meta}
      />
    </Tile>
  );
}

/** Une demande d'ami reçue (ou plusieurs) : y répondre dans « Mes amis ». */
export function DemandeAmiTile({ demande }: { demande: NonNullable<AccueilData["demandesAmi"]> }) {
  const { n, premier } = demande;
  return (
    <Tile href="/people?view=amis" label={n > 1 ? `${n} demandes d'ami` : "Demande d'ami"} icon={<Icone nom="moi" size={15} />} ariaLabel={`${premier.name} veut être ton ami. Répondre`} cta="Répondre">
      <Ligne visual={<Visage nom={premier.name} />} title={`${premier.name} veut être ton ami`} meta={n > 1 ? `et ${n - 1} ${n - 1 > 1 ? "autres" : "autre"}` : "accepte, ou laisse passer"} />
    </Tile>
  );
}
