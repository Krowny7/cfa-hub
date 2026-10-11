import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";
import { Icone } from "@/components/adn/icons";
import { Bande, CarteCarnet, EnTete, Heros, Page, Rangee, Section, Tuile } from "@/components/outils/Gabarit";
import { fmtMinutes } from "@/components/session/review";
import { OFFICIELS } from "@/lib/voice-z3b";
import { JOUR_J } from "@/lib/voice-outils";

// Examens officiels, variante A « Le prochain geste » : le héros est le format
// du jour J (la première session, complète, avec ses matières classées par
// poids), le carnet résume l'examen, deux tuiles calmes (la session suivante,
// les variantes), la bande d'encre annonce le prochain examen blanc, puis les
// matières de chaque session. Vue sans état : app/official-exams regroupe les
// sets, l'aperçu (app/preview-da/z3b) en fournit d'exemple. Le quiz lui-même
// vit dans /qcm.

export type OfficialTopic = { id: string; label: string; count: number; variant: { id: string; count: number } | null };
export type OfficialExamGroup = {
  exam: string;
  sessions: Record<string, { topics: OfficialTopic[]; complete: { id: string; count: number } | null }>;
};
/** Le prochain examen blanc (table mock_exams), pour la bande d'encre. */
export type ProchainMock = { id: string; scheduled_at: string; question_count: number; duration_minutes: number; window_days: number | null };

type Session = OfficialExamGroup["sessions"][string];

const DAY = 86_400_000;
const TZ = "Europe/Paris";
const MIN_PAR_QUESTION = 135 / 90; // le rythme de l'examen officiel

const sessionTotal = (s: Session) => s.complete?.count ?? s.topics.reduce((n, t) => n + t.count, 0);
const hrefSession = (s: Session) => (s.complete ? `/qcm/${s.complete.id}` : s.topics[0] ? `/qcm/${s.topics[0].id}` : "#sessions");

/** « Dimanche 18 octobre, 10 h » */
function dateLongue(iso: string) {
  const d = new Date(iso);
  const jour = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });
  const [h, m] = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).split(":");
  return `${jour.charAt(0).toUpperCase() + jour.slice(1)}, ${Number(h)} h${m && m !== "00" ? ` ${m}` : ""}`;
}

function blanc(p: ProchainMock | null, now: number) {
  if (!p) return { titre: JOUR_J.blancAucun, ligne: JOUR_J.blancAucunLigne, action: { href: "/mock-exams", label: JOUR_J.blancAction } };
  const jours = Math.ceil((new Date(p.scheduled_at).getTime() - now) / DAY);
  const quand = jours > 1 ? `dans ${jours} jours` : jours === 1 ? "demain" : jours === 0 ? "aujourd'hui" : "ouvert";
  return {
    titre: `Examen blanc · ${quand}`,
    ligne: `${dateLongue(p.scheduled_at)} · ${p.question_count} questions. ${JOUR_J.blancLigne}`,
    action: { href: "/mock-exams", label: JOUR_J.blancVoir },
  };
}

function ListeMatieres({ exams }: { exams: OfficialExamGroup[] }) {
  return (
    <div className="grid gap-4 md:gap-[18px] xl:grid-cols-2">
      {exams.flatMap((g) =>
        Object.entries(g.sessions)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([label, s]) => (
            <section key={`${g.exam}-${label}`} className="card overflow-hidden" aria-label={`${g.exam} · ${label}`}>
              <div className="flex items-baseline justify-between gap-4 px-5 pb-2 pt-5 md:px-6">
                <p className="t-eyebrow m-0">
                  {g.exam} · {label}
                </p>
                {s.complete && (
                  <Link href={`/qcm/${s.complete.id}`} className="ink-link shrink-0 text-[13px] font-semibold">
                    Complète · {s.complete.count}
                  </Link>
                )}
              </div>
              <ul className="m-0 list-none divide-y divide-line p-0 px-1.5 pb-1.5">
                {s.topics.map((t) => (
                  <li key={t.id} className="flex min-w-0 items-center gap-1">
                    <Link href={`/qcm/${t.id}`} className="rl-row group flex min-h-[52px] min-w-0 flex-1 items-center gap-3 rounded-[12px] px-3.5 py-2.5">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14.5px] font-semibold">{t.label}</span>
                        <span className="t-micro block tabular-nums">{OFFICIELS.nQuestions(t.count)}</span>
                      </span>
                      <ChevronRight size={15} aria-hidden className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
                    </Link>
                    {t.variant && (
                      <Link href={`/qcm/${t.variant.id}`} title={OFFICIELS.variantesTitre} className="chip chip-quiet chip-sm mr-1.5 shrink-0">
                        <Sparkles size={12} aria-hidden />
                        <span className="hidden sm:inline">Variantes ·</span> {t.variant.count}
                        <span className="sr-only sm:hidden">variantes</span>
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )),
      )}
    </div>
  );
}

export function OfficialExamsView({ exams, prochainMock = null, now = Date.now() }: { exams: OfficialExamGroup[]; prochainMock?: ProchainMock | null; now?: number }) {
  const entete = <EnTete icone={<Icone nom="examen" size={16} />} titre={OFFICIELS.titre} ligne={OFFICIELS.sous} />;

  if (exams.length === 0) {
    return (
      <Page
        entete={entete}
        lead={
          <section className="card-quiet rl-in grid place-items-center gap-2 px-6 py-12 text-center">
            <Icone nom="examen" size={26} className="text-muted" />
            <p className="t-h3 m-0">{OFFICIELS.videTitre}</p>
            <p className="t-small m-0">{OFFICIELS.videTexte}</p>
          </section>
        }
      />
    );
  }

  const mock = exams[0];
  const sessions = Object.entries(mock.sessions).sort(([a], [b]) => a.localeCompare(b));
  const [l1, s1] = sessions[0];
  const second = sessions[1] ?? null;
  const totalQ = sessions.reduce((n, [, s]) => n + sessionTotal(s), 0);
  const variantes = exams.reduce((n, g) => n + Object.values(g.sessions).reduce((m, s) => m + s.topics.reduce((k, t) => k + (t.variant?.count ?? 0), 0), 0), 0);
  const matieres = sessions.reduce((n, [, s]) => n + s.topics.length, 0);
  const matieresTout = exams.reduce((n, g) => n + Object.values(g.sessions).reduce((m, s) => m + s.topics.length, 0), 0);
  const n1 = sessionTotal(s1);
  const minutes1 = Math.round(n1 * MIN_PAR_QUESTION);
  const parPoids = [...s1.topics].sort((a, b) => b.count - a.count);
  const b = blanc(prochainMock, now);

  return (
    <Page
      entete={entete}
      lead={
        <div className="flex flex-col gap-4 md:gap-[18px]">
          <Rangee
            heros={
              <Heros
                eyebrow={JOUR_J.eyebrow}
                titre={`${mock.exam} · ${l1}`}
                repere={`${OFFICIELS.nQuestions(n1)} officielles · ${fmtMinutes(minutes1)} · ${OFFICIELS.matieres(s1.topics.length)}`}
                phrase={JOUR_J.phrase(n1, minutes1)}
                action={{ href: hrefSession(s1), label: JOUR_J.action }}
                lien={{ href: "#sessions", label: JOUR_J.lien }}
                listeTitre={parPoids.length > 1 ? JOUR_J.matieresTitre : undefined}
                liste={parPoids.slice(0, 3).map((t) => ({
                  label: t.label,
                  meta: `${OFFICIELS.nQuestions(t.count)}${t.variant ? ` · ${t.variant.count} variantes` : ""}`,
                  pct: null,
                  href: `/qcm/${t.id}`,
                }))}
              />
            }
            cote={
              <CarteCarnet
                eyebrow={`Dans ${mock.exam}`}
                chiffre={String(totalQ)}
                unite={OFFICIELS.questionsOfficielles}
                ligne={`${OFFICIELS.sessions(sessions.length)} · ${OFFICIELS.matieres(matieres)}${variantes ? ` · ${variantes} variantes` : ""}`}
                details={sessions.map(([label, s]) => ({
                  label,
                  value: `${OFFICIELS.nQuestions(sessionTotal(s))} · ${s.topics.filter((t) => t.variant).length} avec variantes`,
                }))}
              />
            }
            tuiles={
              <>
                {second && (
                  <Tuile
                    icone={<Icone nom="examen" size={18} />}
                    titre={`${mock.exam} · ${second[0]}`}
                    droite={fmtMinutes(Math.round(sessionTotal(second[1]) * MIN_PAR_QUESTION))}
                    ligne={`${OFFICIELS.nQuestions(sessionTotal(second[1]))} : ${second[1].topics.map((t) => t.label.split(" ")[0]).join(", ")}.`}
                    action={{ href: hrefSession(second[1]), label: `Passer la ${second[0].toLowerCase()}` }}
                    bouton
                  />
                )}
                {variantes > 0 && (
                  <Tuile
                    icone={<Sparkles size={18} aria-hidden />}
                    titre={JOUR_J.variantesTitre}
                    droite={String(variantes)}
                    ligne={JOUR_J.variantesLigne}
                    action={{ href: "#sessions", label: JOUR_J.variantesAction }}
                  />
                )}
              </>
            }
          />
          <Bande icone={<Icone nom="examen" size={22} />} titre={b.titre} ligne={b.ligne} action={b.action} medaillon="exams-sceau" />
        </div>
      }
    >
      <Section id="sessions" titre={JOUR_J.parMatiere} meta={`${OFFICIELS.matieres(matieresTout)}${variantes ? ` · ${variantes} variantes` : ""}`}>
        <ListeMatieres exams={exams} />
      </Section>
    </Page>
  );
}
