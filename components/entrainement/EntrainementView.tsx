import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { InkProgressRing } from "@/components/ui/InkRings";
import { Icone } from "@/components/adn/icons";
import { DefiTile } from "@/components/defi/DefiTile";
import { Glyphe } from "@/components/entrainement/Glyphes";
import { DomainSpace } from "@/components/reviser/DomainSpace";
import { FormatRow } from "@/components/reviser/ReviserView";
import { TwoColumnRows } from "@/components/reviser/SubjectRows";
import { TopicRail } from "@/components/ui/TopicRail";
import { subjectRail, weightLabel } from "@/components/reviser/rail";
import { subjectByKey } from "@/components/reviser/catalog";
import { agoLabel, countdown, durationLabel, hourLabel, longDay } from "@/components/accueil/format";
import type { MockExamCard } from "@/components/accueil/types";
import { PLACEMENT_GAMES } from "@/lib/ranks";
import { DUEL_MINUTES, DUEL_QUESTIONS } from "@/lib/duels";
import type { TodayDaily } from "@/lib/daily";
import { ACCUEIL, DUEL } from "@/lib/voice";
import { ESPACES } from "@/lib/voice-z4";
import { EclairCarte } from "@/components/eclair/EclairCarte";

// Espace « S'entraîner », même langage que Réviser. Un seul choix mis en
// avant (la matière la plus faible, sinon reprendre l'entraînement ciblé) ;
// à côté, le défi du jour (le rituel quotidien, sans bouton plein : le point
// focal reste la session) puis les autres façons de s'entraîner seul, dont
// les calculs ; ensuite une session par matière, en rangée horizontale
// (choisir une matière lance sa session ciblée) et, plus calme, ce qui fait
// bouger le rang (examen blanc, duel).
// Sans requête : app/entrainement charge les données, l'aperçu en fournit.

export type EntrainementData = {
  practice: { sessions: number; last: { score: number; total: number; at: string; topics?: string[] } | null };
  mockExam: MockExamCard | null;
  rating: { elo: number; gamesPlayed: number };
  incomingDuels: number;
  subjects: { key: string; name: string; pct: number | null }[];
  /** défi du jour (getTodayDaily) ; null : on n'affiche pas la tuile */
  daily: TodayDaily | null;
  /** séries éclair rendues aujourd'hui ; null : table absente */
  eclair?: number | null;
  /** instant de rendu (ISO), pour les échéances du défi */
  nowIso: string;
};

const pctOf = (score: number, total: number) => (total > 0 ? Math.round((score / total) * 100) : null);

function topicsLabel(keys: string[] | undefined) {
  if (!keys || keys.length === 0) return null;
  const first = subjectByKey(keys[0])?.name ?? keys[0];
  return keys.length > 1 ? `${first} + ${keys.length - 1}` : first;
}

/** Le point focal : la session à lancer maintenant. */
function FocusSession({ d, now, className = "" }: { d: EntrainementData; now?: number; className?: string }) {
  const measured = d.subjects.filter((s) => s.pct !== null) as { key: string; name: string; pct: number }[];
  const weakest = measured.length ? measured.reduce((a, b) => (b.pct < a.pct ? b : a)) : null;
  const last = d.practice.last;
  const lastPct = last ? pctOf(last.score, last.total) : null;
  const lastLine = last
    ? `Dernière session${topicsLabel(last.topics) ? ` · ${topicsLabel(last.topics)}` : ""}${lastPct !== null ? ` · ${lastPct} %` : ""} · ${agoLabel(last.at, now)}`
    : null;

  const focus = weakest
    ? {
        kicker: "Ta prochaine session",
        title: weakest.name,
        text: ESPACES.plusFragile,
        href: `/practice?topic=${weakest.key}`,
        cta: "Lancer la session",
        ring: { pct: weakest.pct, label: "maîtrise" },
      }
    : last
      ? {
          kicker: ACCUEIL.repriseSurTitre(agoLabel(last.at, now)),
          title: topicsLabel(last.topics) ?? "Entraînement ciblé",
          text: ESPACES.enchaine,
          href: last.topics?.length === 1 ? `/practice?topic=${last.topics[0]}` : "/practice",
          cta: "Nouvelle session",
          ring: lastPct !== null ? { pct: lastPct, label: "dernière" } : null,
        }
      : {
          kicker: ESPACES.premiereGoutte,
          title: ESPACES.premiereSession,
          text: ESPACES.premiereTexte,
          href: "/practice",
          cta: "Commencer",
          ring: null,
        };

  return (
    <section className={"card-hero rl-in flex min-h-[260px] flex-col gap-4 p-6 md:p-8 " + className} aria-label="Session conseillée">
      {focus.ring && (
        <div className="absolute right-4 top-4 md:right-8 md:top-8" title={`${focus.ring.pct} % · ${focus.ring.label}`}>
          <span className="block sm:hidden">
            <InkProgressRing pct={focus.ring.pct} size={80}>
              <span className="t-num text-[13px]">{focus.ring.pct}%</span>
            </InkProgressRing>
          </span>
          <span className="hidden sm:block">
            <InkProgressRing pct={focus.ring.pct} size={124}>
              <span className="flex flex-col items-center gap-0.5">
                <span className="t-num text-[20px]">{focus.ring.pct}%</span>
                <span className="t-micro">{focus.ring.label}</span>
              </span>
            </InkProgressRing>
          </span>
        </div>
      )}
      <div className={"flex min-w-0 flex-col gap-2 " + (focus.ring ? "pr-24 sm:pr-36" : "")}>
        <p className="t-eyebrow">{focus.kicker}</p>
        <h2 className="t-h1 m-0 [overflow-wrap:anywhere]">{focus.title}</h2>
      </div>
      <p className="t-body max-w-[440px] text-muted">{focus.text}</p>
      <div className="mt-auto flex flex-col gap-3 pt-2">
        <Link href={focus.href} className="btn btn-primary rl-press w-fit">
          {focus.cta} <ArrowRight size={16} aria-hidden />
        </Link>
        {weakest && lastLine && <p className="t-micro">{lastLine}</p>}
      </div>
    </section>
  );
}

function TileHead({ icon, title, right }: { icon: React.ReactNode; title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-surface">{icon}</span>
      <h3 className="m-0 flex-1 text-[16px] font-bold tracking-[-0.01em]">{title}</h3>
      {right}
    </div>
  );
}

function MockExamTile({ exam }: { exam: MockExamCard | null }) {
  const when = exam ? new Date(exam.scheduledAt) : null;
  return (
    <section className="card-quiet flex flex-col gap-3 p-6" aria-label="Examen blanc">
      <TileHead
        icon={<Icone nom="examen" size={19} />}
        title="Examen blanc"
        right={exam && <span className="t-micro rounded-lg bg-surface px-2 py-1 font-mono font-semibold">{countdown(exam.daysLeft)}</span>}
      />
      {exam && when ? (
        <>
          <p className="t-small">
            {longDay(when)} · {hourLabel(when)} · {exam.questionCount} questions · {durationLabel(exam.durationMinutes)}
          </p>
          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
            <Link href={`/mock-exams/${exam.id}`} className="btn btn-secondary rl-press min-h-[38px] px-3.5 text-[13.5px]">
              {exam.registered ? "Voir l'examen" : "Je m'inscris"} <ArrowRight size={15} aria-hidden />
            </Link>
            {exam.registered ? (
              <span className="t-micro inline-flex items-center gap-1 font-semibold">
                <Check size={13} aria-hidden /> Inscrit{exam.registrantCount > 1 ? ` · ${exam.registrantCount} participants` : ""}
              </span>
            ) : (
              exam.registrantCount > 0 && <span className="t-micro">{exam.registrantCount} inscrit{exam.registrantCount > 1 ? "s" : ""}</span>
            )}
            <Link href="/mock-exams" className="ink-link ml-auto">
              Tous les examens
            </Link>
          </div>
        </>
      ) : (
        <>
          <p className="t-small">Aucun examen blanc programmé pour l&apos;instant.</p>
          <Link href="/mock-exams" className="ink-link mt-auto w-fit">
            Tous les examens
          </Link>
        </>
      )}
    </section>
  );
}

function DuelTile({ rating, incoming }: { rating: EntrainementData["rating"]; incoming: number }) {
  const placement = rating.gamesPlayed < PLACEMENT_GAMES;
  return (
    <section className="card-quiet flex flex-col gap-3 p-6" aria-label="Duel">
      <TileHead
        icon={<Icone nom="duel" size={19} />}
        title="Duel"
        right={<span className="t-micro font-mono">{placement ? `placement ${rating.gamesPlayed}/${PLACEMENT_GAMES}` : `${rating.elo} ELO`}</span>}
      />
      <p className="t-small">{ESPACES.duelTexte(DUEL_QUESTIONS, DUEL_MINUTES)}</p>
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
        <Link href="/duel" className="btn btn-secondary rl-press min-h-[38px] px-3.5 text-[13.5px]">
          {DUEL.trouver}
        </Link>
        <Link href="/duel" className="ink-link">
          {incoming > 0 ? ESPACES.defisEnAttente(incoming) : "Défier quelqu'un"}
        </Link>
      </div>
    </section>
  );
}

export function EntrainementView({ d, now }: { d: EntrainementData; now?: number }) {
  const practiceMeta = d.practice.sessions > 0 ? `${d.practice.sessions} session${d.practice.sessions > 1 ? "s" : ""}` : null;

  const formats = [
    { href: "/practice", icon: <Icone nom="entrainer" size={20} />, title: "Entraînement ciblé", desc: "Tes matières, au poids réel de l'examen.", meta: practiceMeta },
    { href: "/qcm", icon: <Glyphe nom="qcm" size={20} />, title: "QCM par thème", desc: "Toutes les banques, classées par matière." },
    { href: "/calculs", icon: <Glyphe nom="calculs" size={20} />, title: "Calculs", desc: ESPACES.calculsTexte },
    { href: "/official-exams", icon: <Icone nom="examen" size={20} />, title: "Examens officiels", desc: "Les sessions officielles, rejouées question par question." },
  ];

  const lead = (
    <div className="flex flex-col gap-4 md:gap-[18px]">
      <div className="grid gap-4 md:gap-[18px] lg:grid-cols-12" data-leonard="session">
        <FocusSession d={d} now={now} className={d.daily ? "lg:col-span-8" : "lg:col-span-12"} />
        {/* le rituel du jour : parmi les choix principaux, sans bouton plein */}
        {d.daily && (
          <div className="rl-in flex min-w-0 flex-col gap-4 lg:col-span-4 [&>*:first-child]:flex-1" style={{ animationDelay: ".06s" }}>
            <DefiTile daily={d.daily} nowIso={d.nowIso} actionEnBas />
            {typeof d.eclair === "number" && <EclairCarte today={d.eclair} />}
          </div>
        )}
      </div>
      <nav aria-label="S'entraîner seul" className="card rl-in overflow-hidden px-1 py-1" style={{ animationDelay: ".1s" }}>
        <TwoColumnRows
          items={formats}
          keyOf={(f) => f.href}
          render={(f) => <FormatRow href={f.href} icon={f.icon} title={f.title} desc={f.desc} meta={f.meta} />}
        />
      </nav>
    </div>
  );

  return (
    <DomainSpace kicker="S'entraîner" icon={<Icone nom="entrainer" size={18} />} title="Pratiquer, comme le jour J" lead={lead}>
      <section className="rl-section" aria-labelledby="ent-matieres">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="ent-matieres" className="t-h2 m-0">
            Une session par matière
          </h2>
          <span className="t-micro">ta maîtrise · le poids de chaque matière à l&apos;examen</span>
        </div>
        <TopicRail
          label="Une session par matière"
          actionLabel="Session ciblée"
          items={subjectRail(d.subjects, (key) => ({ href: `/practice?topic=${key}`, note: weightLabel(key) }))}
        />
      </section>
      <section className="rl-section" aria-labelledby="ent-contre" data-leonard="contre">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="ent-contre" className="t-h2 m-0">
            Contre les autres
          </h2>
          <span className="t-micro">ce qui fait bouger ton rang</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 md:gap-[18px]">
          <MockExamTile exam={d.mockExam} />
          <DuelTile rating={d.rating} incoming={d.incomingDuels} />
        </div>
      </section>

    </DomainSpace>
  );
}
