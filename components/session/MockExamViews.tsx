import Link from "next/link";
import { ArrowRight, Check, ChevronRight } from "lucide-react";
import { PageHead, SectionHead, EloDelta } from "@/components/session/ui";
import { fmtMinutes, pctOf } from "@/components/session/review";
import { Avatar } from "@/components/classement/Avatar";
import { Icone } from "@/components/adn/icons";
import { CLASSEMENT_EXAMEN, DETAIL, LISTE } from "@/lib/voice-z3b";
import { SALLE } from "@/lib/voice-epreuves";
import { CURRENT_DOMAIN, CURRENT_PROGRAM } from "@/lib/domains";
import { PageHero } from "@/components/ui/Titles";
import { HeroEpreuve, ListePodium, RangeeLieu } from "@/components/epreuves/Briques";
import { BandeEncre, RangeeLiens } from "@/components/ui/BandeEncre";
import { CarteLieu } from "@/components/ui/CarteLieu";
import { Illustration } from "@/components/ui/Illustration";
import { Sceau, TuileCalme } from "@/components/ui/Tuiles";
import type { Parcours } from "@/lib/mock-parcours";

// Vues sans état des examens blancs (liste, en-tête, avis, classement,
// comparaison par matière), en voix « Le Trait » : icône maison de l'examen,
// sceau d'initiales des joueurs sans photo, cote du jour J. Aucune requête :
// app/mock-exams charge les données, l'aperçu (app/preview-da/z3b) en fournit
// d'exemple. Sans « use client » : utilisable côté serveur.

export type MockExam = {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  question_count: number;
  status: "draft" | "open" | "closed";
  window_days: number | null;
};

const DAY = 86_400_000;
const TZ = "Europe/Paris";

export function examWindow(e: Pick<MockExam, "scheduled_at" | "window_days">, now: number) {
  const at = new Date(e.scheduled_at).getTime();
  const w = (e.window_days ?? 3) * DAY;
  const start = at - w;
  const end = at + w;
  return { start: new Date(start), end: new Date(end), open: now >= start && now <= end, over: now > end, daysToStart: Math.ceil((start - now) / DAY), hoursToStart: Math.ceil((start - now) / 3_600_000) };
}

const longDate = (d: Date) => d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });
/** « Samedi 10 octobre » : majuscule au premier mot seulement */
const LongDate = (d: Date) => {
  const s = longDate(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
};
export const dayMonth = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: TZ });
const hour = (d: Date) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });

// ── Liste ──────────────────────────────────────────────────────────────────

function ExamRow({ e, registered, eloApplied, now, past }: { e: MockExam; registered: boolean; eloApplied: boolean; now: number; past?: boolean }) {
  const date = new Date(e.scheduled_at);
  const w = examWindow(e, now);
  return (
    <li>
      <Link href={`/mock-exams/${e.id}`} className="rl-row group flex items-center gap-4 px-4 py-3.5 md:px-5">
        <span className={"flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[11px] text-center " + (past ? "bg-surface" : "bg-surface-2")}>
          <span className="text-[15px] font-bold leading-none tabular-nums">{date.toLocaleDateString("fr-FR", { day: "numeric", timeZone: TZ })}</span>
          <span className="mt-0.5 text-[10.5px] font-semibold leading-none text-muted">{date.toLocaleDateString("fr-FR", { month: "short", timeZone: TZ }).replace(".", "")}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[15px] font-semibold">{e.title}</span>
            {!past && w.open && e.status === "open" && <span className="chip chip-active chip-sm">{LISTE.ouvert}</span>}
            {registered && (
              <span className="chip chip-quiet chip-sm">
                <Check size={12} aria-hidden /> {past ? LISTE.participe : LISTE.inscrit}
              </span>
            )}
            {eloApplied && <span className="chip chip-quiet chip-sm">{LISTE.eloApplique}</span>}
          </span>
          <span className="t-micro mt-1 block">
            {past ? dayMonth(date) + " " + date.getFullYear() : `${longDate(date)} · ${hour(date)} · ${fmtMinutes(e.duration_minutes)}`} · {e.question_count} questions
          </span>
        </span>
        <ChevronRight size={16} aria-hidden className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
      </Link>
    </li>
  );
}

/** La carte « lieu » La Grande Salle : le prochain examen, son état et son bouton. */
function GrandeSalle({ e, registered, now }: { e: MockExam; registered: boolean; now: number }) {
  const date = new Date(e.scheduled_at);
  const w = examWindow(e, now);
  const live = e.status === "open" && w.open;
  const etat = live ? SALLE.etatOuvert(dayMonth(w.end)) : w.over ? SALLE.etatFini : e.status === "draft" ? SALLE.etatPrepa : w.daysToStart > 0 ? SALLE.etatOuvre(w.daysToStart, dayMonth(w.start)) : SALLE.etatOuvert(dayMonth(w.end));
  const image = <Illustration nom="mock-grande-salle" position="center 40%" />;
  return (
    <CarteLieu
      visuel={image}
      vignette={image}
      marque={
        <Sceau>
          <Icone nom="examen" size={18} />
        </Sceau>
      }
      nom={SALLE.nom}
      tailleNom="text-[26px] lg:text-[34px]"
      sousTitre={`${e.title} · ${e.question_count} questions · ${fmtMinutes(e.duration_minutes)}`}
      etat={
        <>
          {etat}
          {registered && (
            <>
              {" "}
              <b className="font-semibold text-white">{SALLE.inscrit}</b>
            </>
          )}
        </>
      }
      action={{ href: `/mock-exams/${e.id}`, label: w.over ? LISTE.resultats : live && registered ? LISTE.passer : registered ? LISTE.voir : LISTE.sinscrire }}
      label={SALLE.nom}
    />
  );
}

/** Le héros : où tu en es d'un examen blanc à l'autre (ou, sans copie rendue, ce qui t'attend). */
function Progression({ parcours }: { parcours: Parcours | null }) {
  if (!parcours) {
    return <HeroEpreuve label={SALLE.progression} eyebrow={SALLE.progression} titre={SALLE.debutTitre} micro={SALLE.debutMicro} texte={SALLE.debutTexte} />;
  }
  const { last, prev, faibles } = parcours;
  const ecart = prev && prev.total === last.total ? SALLE.ecart(last.score - prev.score, prev.mois) : prev ? null : SALLE.premier;
  return (
    <HeroEpreuve
      label={SALLE.progression}
      eyebrow={SALLE.progression}
      titre={SALLE.titreScore(last.score, last.total, last.mois)}
      micro={SALLE.micro(last.pct, last.rang, last.joueurs, last.elo)}
      texte={ecart ?? undefined}
      texte2={faibles[0] ? SALLE.aTravailler(faibles[0].topic) : undefined}
      actions={
        <Link href={`/mock-exams/${last.id}`} className="ink-link">
          {SALLE.revoirCopie}
        </Link>
      }
      droite={faibles.length > 0 ? <ListePodium titre={SALLE.faibles} items={faibles.map((f) => ({ nom: f.topic, note: `${f.pct} %`, pct: f.pct }))} /> : undefined}
    />
  );
}

export function MockExamListView({
  exams,
  registeredIds,
  eloApplied,
  eloEnabled,
  admin,
  now,
  parcours = null,
}: {
  exams: MockExam[];
  registeredIds: string[];
  eloApplied: Record<string, string>;
  eloEnabled: boolean;
  /** panneau d'administration (rendu en bas de page) */
  admin?: React.ReactNode;
  now: number;
  /** ta progression d'un examen blanc à l'autre (null : pas encore de copie rendue) */
  parcours?: Parcours | null;
}) {
  const regs = new Set(registeredIds);
  // à venir : par date croissante, le plus proche en premier
  const upcoming = exams.filter((e) => e.status !== "closed").sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const past = exams.filter((e) => e.status === "closed");
  const [next, suivant, ...later] = upcoming;

  const bande = (
    <>
      <BandeEncre icone={<Icone nom="examen" size={22} />} titre={SALLE.bandeTitre} ligne={SALLE.bandeLigne} action={{ href: "/defi", label: SALLE.bandeAction }} />
      <RangeeLiens
        label={SALLE.liensLabel}
        liens={[
          { href: "/official-exams", icon: <Icone nom="examen" size={20} />, title: SALLE.officiels, desc: SALLE.officielsDesc },
          { href: "/exam", icon: <Icone nom="examen" size={20} />, title: SALLE.examen, desc: SALLE.examenDesc },
          { href: "/classement", icon: <Icone nom="classement" size={20} />, title: SALLE.classement, desc: SALLE.classementDesc },
        ]}
      />
    </>
  );

  return (
    <div className="rl-page">
      <div className="flex flex-col gap-7 md:gap-10">
        <PageHero
          kicker={
            <span className="inline-flex items-center gap-1.5">
              <Icone nom="examen" size={15} /> {SALLE.kicker} · {CURRENT_DOMAIN.name} · {CURRENT_PROGRAM.name}
            </span>
          }
          title={SALLE.titre}
        />

        {next ? (
          <div className="flex flex-col gap-4 md:gap-[18px]">
            <RangeeLieu
              droite={<GrandeSalle e={next} registered={regs.has(next.id)} now={now} />}
              gauche={
                <>
                  <Progression parcours={parcours} />
                  {suivant && (
                    <TuileCalme
                      icone={<Icone nom="examen" size={18} />}
                      surTitre={SALLE.ensuite(Math.max(0, Math.ceil((new Date(suivant.scheduled_at).getTime() - now) / DAY)))}
                      titre={suivant.title}
                      ligne={`${LongDate(new Date(suivant.scheduled_at))} · ${suivant.question_count} questions · ${fmtMinutes(suivant.duration_minutes)}. ${regs.has(suivant.id) ? SALLE.inscrit : suivant.status === "open" ? "Inscription ouverte." : SALLE.etatPrepa}`}
                      actions={
                        <Link href={`/mock-exams/${suivant.id}`} className="btn btn-secondary rl-press min-h-[38px] px-3.5 text-[13.5px]">
                          {regs.has(suivant.id) ? LISTE.voir : SALLE.inscrire} <ArrowRight size={15} aria-hidden />
                        </Link>
                      }
                    />
                  )}
                </>
              }
            />
            {bande}
          </div>
        ) : (
          <div className="flex flex-col gap-4 md:gap-[18px]">
            <section className="card-quiet rl-in grid place-items-center gap-2 px-6 py-12 text-center">
              <Icone nom="examen" size={26} className="text-muted" />
              <p className="t-h3 m-0">{LISTE.videTitre}</p>
              <p className="t-small m-0">{LISTE.videTexte}</p>
            </section>
            {bande}
          </div>
        )}
      </div>

      {later.length > 0 && (
        <section className="rl-section">
          <SectionHead title={LISTE.ensuite} meta={LISTE.nExamens(later.length)} />
          <ul className="card m-0 list-none divide-y divide-line overflow-hidden p-0">
            {later.map((e) => (
              <ExamRow key={e.id} e={e} registered={regs.has(e.id)} eloApplied={false} now={now} />
            ))}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section className="rl-section">
          <SectionHead title={LISTE.passes} meta={LISTE.passesMeta} />
          <ul className="card-quiet m-0 list-none divide-y divide-line overflow-hidden p-0">
            {past.map((e) => (
              <ExamRow key={e.id} e={e} registered={regs.has(e.id)} eloApplied={Boolean(eloApplied[e.id])} now={now} past />
            ))}
          </ul>
        </section>
      )}

      {admin}
    </div>
  );
}

// ── Détail ─────────────────────────────────────────────────────────────────

export function MockExamHeader({
  exam,
  eloEnabled,
  now,
}: {
  exam: Pick<MockExam, "title" | "description" | "scheduled_at" | "duration_minutes" | "question_count" | "status" | "window_days">;
  eloEnabled: boolean;
  now: number;
}) {
  const date = new Date(exam.scheduled_at);
  const w = examWindow(exam, now);
  const state =
    exam.status === "draft"
      ? LISTE.enPreparation
      : exam.status === "closed" || w.over
        ? DETAIL.termine
        : w.open
          ? LISTE.ouvertJusquau(dayMonth(w.end))
          : DETAIL.ouvertureDans(w.hoursToStart, w.daysToStart);
  return (
    <PageHead
      back={{ href: "/mock-exams", label: DETAIL.retour }}
      eyebrow={
        <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
          <Icone nom="examen" size={15} />
          {state}
          {eloEnabled && <span className="opacity-70">· {DETAIL.classe}</span>}
        </span>
      }
      title={exam.title}
      sub={
        <>
          {LongDate(date)} à {hour(date)} · {fmtMinutes(exam.duration_minutes)} · {exam.question_count} questions
          {exam.description ? (
            <>
              <br />
              {exam.description}
            </>
          ) : null}
        </>
      }
    />
  );
}

/** Message d'état calme (fenêtre pas encore ouverte, terminée, brouillon). */
export function MockExamNotice({ title, children, countdown }: { title: string; children?: React.ReactNode; countdown?: string | null }) {
  return (
    <section className="card-quiet rl-in flex flex-wrap items-center justify-between gap-5 px-5 py-5 md:px-7 md:py-6">
      <div className="flex min-w-0 items-start gap-3.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface">
          <Icone nom="examen" size={19} />
        </span>
        <div className="min-w-0">
          <p className="t-h3 m-0">{title}</p>
          {children && <p className="t-small m-0 mt-1">{children}</p>}
        </div>
      </div>
      {countdown && <span className="t-num text-[40px]">{countdown}</span>}
    </section>
  );
}

export type LeaderRow = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  score: number;
  total: number;
  durationSeconds: number | null;
};

export function MockExamLeaderboard({ rows, meId, eloDeltas }: { rows: LeaderRow[]; meId: string; eloDeltas: Record<string, number> }) {
  if (rows.length === 0) return null;
  return (
    <section className="rl-section" aria-label={CLASSEMENT_EXAMEN.titre}>
      <SectionHead title={CLASSEMENT_EXAMEN.titre} meta={CLASSEMENT_EXAMEN.participants(rows.length)} />
      <ol className="card m-0 list-none divide-y divide-line overflow-hidden p-0">
        {rows.map((r, rank) => {
          const pct = pctOf(r.score, r.total);
          const isMe = r.userId === meId;
          const mins = r.durationSeconds ? Math.max(1, Math.round(r.durationSeconds / 60)) : null;
          const delta = eloDeltas[r.userId];
          return (
            <li key={r.userId} className={"flex items-center gap-3.5 px-4 py-3 md:gap-4 md:px-5 " + (isMe ? "bg-surface-2/60" : "")}>
              <span
                className={
                  "grid h-8 w-8 shrink-0 place-items-center rounded-full font-mono text-[13px] font-semibold tabular-nums " +
                  (rank === 0 ? "bg-white text-black" : rank < 3 ? "shadow-[inset_0_0_0_1.5px_var(--ink)]" : "text-muted")
                }
              >
                {rank + 1}
              </span>
              {/* sa photo, sinon son sceau d'initiales */}
              <Avatar src={r.avatarUrl} name={r.name} size={36} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[14.5px] font-semibold">{r.name}</span>
                  {isMe && <span className="chip chip-quiet chip-sm min-h-[20px] px-1.5 text-[11px]">{CLASSEMENT_EXAMEN.toi}</span>}
                </span>
                {mins && <span className="t-micro block">{fmtMinutes(mins)}</span>}
              </span>
              {delta !== undefined && <EloDelta delta={delta} size="sm" />}
              <span className="w-[64px] shrink-0 text-right">
                <span className={"block text-[15px] font-semibold tabular-nums " + (pct < 50 ? "text-pen" : "")}>{pct} %</span>
                <span className="t-micro block tabular-nums">
                  {r.score}/{r.total}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export type TopicCell = { pct: number; correct: number; total: number } | null;

/** Réussite par matière, tous les participants (dès deux copies rendues). */
export function MockExamTopicTable({
  users,
  matrix,
  meId,
}: {
  users: [string, string][];
  matrix: { topic: string; byUser: Record<string, TopicCell> }[];
  meId: string;
}) {
  if (users.length < 2) return null;
  return (
    <section className="rl-section" aria-label={CLASSEMENT_EXAMEN.parMatiere}>
      <SectionHead title={CLASSEMENT_EXAMEN.parMatiere} meta={CLASSEMENT_EXAMEN.parMatiereMeta} />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-[14px]">
          <thead>
            <tr className="border-b border-line">
              <th className="t-micro px-4 py-3 text-left font-semibold md:px-5">{CLASSEMENT_EXAMEN.matiere}</th>
              {users.map(([uid, name]) => (
                <th key={uid} className={"px-3 py-3 text-right text-[12.5px] font-semibold " + (uid === meId ? "text-white" : "text-muted")}>
                  {uid === meId ? "Toi" : name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map(({ topic, byUser }) => (
              <tr key={topic} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-medium md:px-5">{topic}</td>
                {users.map(([uid]) => {
                  const c = byUser[uid];
                  return (
                    <td key={uid} className={"px-3 py-3 text-right tabular-nums " + (uid === meId ? "bg-surface-2/50" : "")}>
                      {c ? (
                        <>
                          <span className={"font-semibold " + (c.pct < 50 ? "text-pen" : "")}>{c.pct} %</span>
                          <span className="t-micro ml-1.5 hidden sm:inline">
                            {c.correct}/{c.total}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
