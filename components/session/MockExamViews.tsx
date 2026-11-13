import { PageHead, SectionHead, EloDelta } from "@/components/session/ui";
import { fmtMinutes, pctOf } from "@/components/session/review";
import { Avatar } from "@/components/classement/Avatar";
import { Icone } from "@/components/adn/icons";
import type { Ligne } from "@/components/ui/Decors";
import { EnTeteSousPage, Etiquette, SousPage } from "@/components/ui/SousPage";
import { RangeePacks, type Pack } from "@/components/MockExamPacks";
import { CLASSEMENT_EXAMEN, DETAIL, LISTE } from "@/lib/voice-z3b";
import { RETOUR_AFFRONTER, SOUS_AFFRONTER } from "@/lib/voice-affronter-sous";

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

const E = SOUS_AFFRONTER.examens;

/** « OCT », « DÉC », « JUIL » : le mois de l'examen, frappé sur son sceau. */
function moisCourt(d: Date) {
  return d.toLocaleDateString("fr-FR", { month: "short", timeZone: TZ }).replace(".", "").toUpperCase();
}

/** Le pack d'un examen (components/MockExamPacks) : son état à l'instant `now`, ta copie en pourcentage. */
export function packDe(e: MockExam, now: number, score: number | null): Pack {
  const w = examWindow(e, now);
  const fini = e.status === "closed" || w.over;
  const base = { id: e.id, titre: e.title, mois: moisCourt(new Date(e.scheduled_at)), format: E.format(e.question_count, e.duration_minutes), score };
  if (e.status === "draft") return { ...base, genre: "preparation", etat: E.preparation };
  if (score !== null) return { ...base, genre: "rendu", etat: fini ? E.termine : `${E.ouvert} · ${E.jusquau(dayMonth(w.end))}` };
  if (fini) return { ...base, genre: "fini", etat: E.manque };
  if (w.open) return { ...base, genre: "ouvert", etat: `${E.ouvert} · ${E.jusquau(dayMonth(w.end))}` };
  return { ...base, genre: "scelle", etat: w.hoursToStart <= 24 ? E.dansHeures(Math.max(1, w.hoursToStart)) : E.dansJours(w.daysToStart) };
}

/**
 * La liste des examens blancs (direction « le lieu, puis l'objet », lot 4 du 2026-11-13) : la porte (la
 * Grande Salle ; en chiffre-héros les packs encore scellés, sinon tes copies rendues ; en enjeu le
 * prochain examen quand il approche ou qu'il est ouvert), puis la vitrine : un pack scellé par examen,
 * posés sur une même ligne de sol, le prochain avancé et entouré ; dessous, l'action à l'encre qui
 * l'ouvre (inscription, passage, copie). Le classement général n'y est plus (il est sur /classement).
 * Le panneau d'administration vient dessous (admin seulement).
 */
export function MockExamListView({
  exams,
  eloEnabled,
  admin,
  scores = {},
  now,
  inscrits = [],
}: {
  exams: MockExam[];
  eloEnabled: boolean;
  /** panneau d'administration (rendu sous la vitrine) */
  admin?: React.ReactNode;
  /** tes copies rendues : le pourcentage par examen */
  scores?: Record<string, number>;
  /** l'instant de la lecture (la page le pose une fois, côté serveur) */
  now: number;
  /** les examens où tu es inscrit (ta ligne d'état) */
  inscrits?: string[];
  /** ancien : le classement général (n'est plus affiché) */
  classement?: Ligne[];
}) {
  // à venir : par date croissante, le plus proche en premier ; passés : du plus ancien au plus récent
  const upcoming = exams.filter((e) => e.status !== "closed").sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const past = exams.filter((e) => e.status === "closed").sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const ordre = [...past, ...upcoming];
  const packs = ordre.map((e) => packDe(e, now, scores[e.id] ?? null));
  // le prochain : le premier examen à venir qui n'est ni fini ni en préparation, sinon le dernier
  const prochain = packs.find((p) => p.genre === "scelle" || p.genre === "ouvert") ?? packs.find((p) => p.genre === "rendu" && p.etat !== E.termine) ?? packs[packs.length - 1] ?? null;
  const rendues = packs.filter((p) => p.score !== null);
  const exProchain = prochain ? ordre.find((e) => e.id === prochain.id) : null;
  const w = exProchain ? examWindow(exProchain, now) : null;
  const aVenir = prochain && (prochain.genre === "scelle" || prochain.genre === "ouvert") ? prochain : null;
  // la ligne : l'état du joueur (inscrit ou non au prochain, ses copies rendues), jamais la date ni
  // le format (écrits sur le pack)
  const ligne =
    [
      aVenir ? (inscrits.includes(aVenir.id) ? E.inscritA(aVenir.titre) : E.pasInscritA(aVenir.titre)) : null,
      rendues.length > 0 ? E.copiesRendues(rendues.length) : aVenir ? null : E.aucuneCopie,
    ]
      .filter(Boolean)
      .join(" · ") || null;
  // le chiffre-héros : l'enjeu du joueur. Le prochain scellé : J-n (ou n h la veille), légendé de son
  // nom ; sinon ta dernière copie rendue.
  const derniere = [...rendues].reverse()[0] ?? null;
  const heros =
    aVenir && aVenir.genre === "scelle" && w
      ? { valeur: w.hoursToStart <= 24 ? `${Math.max(1, w.hoursToStart)} h` : `J-${w.daysToStart}`, legende: aVenir.titre }
      : derniere
        ? { valeur: `${derniere.score} %`, legende: E.taDerniere }
        : null;
  // l'enjeu, seulement s'il est vrai et nouveau : le prochain est ouvert et se ferme sous 48 h
  const heuresAvantFin = w ? Math.ceil((w.end.getTime() - now) / 3_600_000) : null;
  const enjeu = aVenir && aVenir.genre === "ouvert" && heuresAvantFin !== null && heuresAvantFin <= 48 ? E.enjeuFerme(Math.max(1, heuresAvantFin)) : null;
  const action = prochain ? { href: `/mock-exams/${prochain.id}`, label: prochain.genre === "rendu" ? E.revoirCopie(prochain.titre) : E.ouvrirExamen(prochain.titre) } : null;

  return (
    <SousPage
      entete={
        <EnTeteSousPage
          retour={RETOUR_AFFRONTER}
          titre={E.titre}
          ligne={ligne}
          illustration={{ nom: "mock-grande-salle", position: "50% 88%" }}
          heros={heros}
          enjeu={enjeu}
        />
      }
    >
      {packs.length > 0 ? <RangeePacks packs={packs} conseil={prochain?.id ?? null} action={action} /> : <p className="t-body m-0 text-muted">{E.vide}</p>}
      {admin}
    </SousPage>
  );
}

/** L'état d'un examen en quelques mots : en préparation, ouvert jusqu'au…, ouverture dans…, terminé. */
export function etatExamen(exam: Pick<MockExam, "scheduled_at" | "window_days" | "status">, now: number): string {
  const w = examWindow(exam, now);
  return exam.status === "draft"
    ? LISTE.enPreparation
    : exam.status === "closed" || w.over
      ? DETAIL.termine
      : w.open
        ? LISTE.ouvertJusquau(dayMonth(w.end))
        : DETAIL.ouvertureDans(w.hoursToStart, w.daysToStart);
}

/** La ligne de l'en-tête d'un examen : son état, son format, classé ou non. */
export function ligneExamen(
  exam: Pick<MockExam, "scheduled_at" | "window_days" | "status" | "question_count" | "duration_minutes">,
  eloEnabled: boolean,
  now: number,
): string {
  return [etatExamen(exam, now), `${exam.question_count} questions`, fmtMinutes(exam.duration_minutes), eloEnabled ? DETAIL.classe : null]
    .filter(Boolean)
    .join(" · ");
}

// ── Détail ─────────────────────────────────────────────────────────────────

/** L'ancien en-tête d'un examen (la page passe par EnTeteSousPage et ligneExamen) ; gardé pour les aperçus. */
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
  const state = etatExamen(exam, now);
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
    <section className="grid gap-2.5" aria-label={CLASSEMENT_EXAMEN.titre}>
      {/* lot 4 du 2026-11-13 : l'étiquette Mono et des filets, plus de carte ni de bande de titre */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <Etiquette as="h2">{CLASSEMENT_EXAMEN.titre}</Etiquette>
        <span className="font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-muted">{CLASSEMENT_EXAMEN.participants(rows.length)}</span>
      </div>
      <ol className="m-0 list-none divide-y divide-line border-y border-line p-0">
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
              <span className="w-[72px] shrink-0 text-right">
                <span className={"block font-brand text-[22px] leading-none tabular-nums " + (pct < 50 ? "text-pen" : "")}>{pct} %</span>
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
