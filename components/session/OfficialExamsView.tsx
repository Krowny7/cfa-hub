import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ActionEncre, EnTeteSousPage, Scene, SousPage } from "@/components/ui/SousPage";
import { codeMatiere } from "@/components/entrainement/pieces";
import { SouvenirPacks } from "@/components/session/SouvenirPacks";
import { OFFICIELS } from "@/lib/voice-z3b";
import { NBSP, nombre } from "@/lib/voice";
import { RETOUR_ENTRAINEMENT, SOUS_ENTRAINEMENT } from "@/lib/voice-entrainement-sous";
import s from "./Packs.module.css";

// Examens officiels, direction « le lieu, puis l'objet » (2026-11-13) : la porte (« N SCELLÉS » en
// chiffre-héros : le stock est rare), puis l'objet : les sessions en packs d'ébène biseautés, le nom
// en Dela, un sceau noir uni ; un pack déjà passé porte sa meilleure copie tamponnée, à vie. Le pack
// choisi (?session=) s'avance d'un cran (liseré d'or) et s'ouvre dessous, en place, sur un plateau
// d'ébène : le passer en entier (l'action à l'encre, en grand), ou une matière à la fois en petites
// tuiles (code en Dela, questions en Mono, ses variantes). Le tampon ne se joue que sur un score
// nouveau, la pose des packs qu'à la première visite de la session (SouvenirPacks). Vue sans état :
// app/official-exams regroupe les sets et lit tes copies. Le quiz lui-même vit dans /qcm.

export type OfficialTopic = { id: string; label: string; count: number; variant: { id: string; count: number } | null };
export type OfficialExamGroup = {
  exam: string;
  sessions: Record<string, { topics: OfficialTopic[]; complete: { id: string; count: number } | null }>;
};
/** Ta meilleure copie sur un set (quiz_attempts). */
export type ScoreSet = { score: number; total: number };

type Session = OfficialExamGroup["sessions"][string];
type Entree = { cle: string; exam: string; label: string; s: Session };

const S = SOUS_ENTRAINEMENT.officiels;

const sessionTotal = (x: Session) => x.complete?.count ?? x.topics.reduce((n, t) => n + t.count, 0);
/** La clé d'une session dans l'adresse (?session=) */
const cleSession = (exam: string, label: string) => `${exam}::${label}`;
/** Le code du sceau : la lettre de l'examen et le numéro de la session (« A1 », « VA1 » pour ses variantes). */
function codeSession(exam: string, label: string) {
  const lettre = exam.trim().split(/\s+/).pop()?.slice(0, 1).toUpperCase() ?? "";
  const numero = label.match(/\d+/)?.[0] ?? label.slice(0, 1);
  return `${exam.startsWith("Variantes ") ? "V" : ""}${lettre}${numero}`;
}
/** La matière d'une tuile, d'après son nom anglais (« Fixed Income » → FI). */
const CLES: [RegExp, string][] = [
  [/^ethic/i, "ethics"],
  [/^quant/i, "quant"],
  [/^econ/i, "economics"],
  [/^financial statement/i, "fsa"],
  [/^corporate/i, "corporate"],
  [/^equity/i, "equity"],
  [/^fixed/i, "fixed_income"],
  [/^deriv/i, "derivatives"],
  [/^altern/i, "alternatives"],
  [/^portfolio/i, "portfolio"],
];
const codeTuile = (label: string) => codeMatiere(CLES.find(([re]) => re.test(label.trim()))?.[1] ?? "", label);

/** Le nom du pack en Dela : l'examen sans « Mock Exam », puis la session (« A · SESSION 1 »). */
function nomPack(exam: string) {
  return exam.replace(/^Variantes\s+/, "").replace(/mock\s*exam\s*/i, "").replace(/^mock\s*/i, "").trim() || exam;
}

export function OfficialExamsView({
  exams,
  scores = {},
  choisie = null,
  joursDepuis = null,
}: {
  exams: OfficialExamGroup[];
  scores?: Record<string, ScoreSet>;
  choisie?: string | null;
  /** les jours depuis ta dernière copie d'examen officiel (null : aucune) */
  joursDepuis?: number | null;
}) {
  const entrees: Entree[] = exams.flatMap((g) =>
    Object.entries(g.sessions)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, x]) => ({ cle: cleSession(g.exam, label), exam: g.exam, label, s: x })),
  );

  // ta meilleure copie de la session complète (null : scellée)
  const meilleure = (e: Entree): number | null => {
    const b = e.s.complete ? scores[e.s.complete.id] : undefined;
    return b && b.total > 0 ? Math.round((b.score / b.total) * 100) : null;
  };
  const scelles = entrees.filter((e) => meilleure(e) === null).length;
  const ouvertes = entrees.length - scelles;

  const entete = (
    <EnTeteSousPage
      retour={RETOUR_ENTRAINEMENT}
      titre={OFFICIELS.titre}
      ligne={entrees.length ? S.etat(entrees.length, ouvertes, ouvertes > 0 ? joursDepuis : null) : OFFICIELS.sous}
      heros={entrees.length && scelles > 0 ? { valeur: nombre(scelles), legende: S.heros(scelles) } : null}
      illustration={{ nom: "practice-studiolo-arches", position: "50% 82%" }}
    />
  );

  if (entrees.length === 0) {
    return (
      <SousPage entete={entete}>
        <Scene etiquette={OFFICIELS.videTitre}>
          <p className="t-small m-0">{OFFICIELS.videTexte}</p>
        </Scene>
      </SousPage>
    );
  }

  const ici = entrees.find((e) => e.cle === choisie) ?? entrees.find((e) => meilleure(e) === null) ?? entrees[0];
  const n = sessionTotal(ici.s);

  return (
    <SousPage entete={entete}>
      <Scene etiquette={S.packs}>
        <SouvenirPacks scores={Object.fromEntries(entrees.flatMap((e) => (meilleure(e) === null ? [] : [[e.cle, meilleure(e) as number]])))} />
        <ul className={s.rayon} data-rayon="packs">
          {entrees.map((e, i) => {
            const pct = meilleure(e);
            const choisi = e === ici;
            const variantes = e.exam.startsWith("Variantes ");
            const titre = `${e.exam} · ${e.label}`;
            return (
              <li key={e.cle} className={s.place} style={{ "--i": i } as React.CSSProperties} data-choisi={choisi ? "1" : undefined}>
                <Link
                  href={`/official-exams?session=${encodeURIComponent(e.cle)}#session`}
                  scroll={false}
                  className={"rl-presse " + s.pack}
                  data-ouvert={pct !== null ? "1" : undefined}
                  aria-current={choisi ? "true" : undefined}
                  aria-label={S.lecture(titre, sessionTotal(e.s), pct)}
                >
                  <span className={s.haut} aria-hidden>
                    <span>{variantes ? S.variantes : OFFICIELS.complet}</span>
                    <span>{nombre(sessionTotal(e.s))}Q</span>
                  </span>
                  <b className={s.nom} aria-hidden>
                    {nomPack(e.exam)}
                  </b>
                  <span className={s.session} aria-hidden>
                    {e.label}
                  </span>
                  <span className={s.sceau} aria-hidden>
                    <span>{codeSession(e.exam, e.label)}</span>
                  </span>
                  {pct !== null ? (
                    <span className={s.tampon} data-tampon={e.cle} aria-hidden>
                      {pct}
                      {NBSP}%
                    </span>
                  ) : (
                    <span className={s.scelle} aria-hidden>
                      {S.scelle}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </Scene>

      {/* le pack choisi, ouvert en place : la session entière (l'action), ou une matière à la fois en tuiles */}
      <Scene etiquette={`${ici.exam} · ${ici.label}`}>
        <div id="session" className={s.plateau}>
          {ici.exam.startsWith("Variantes ") && <p className={s.plateauNote}>{OFFICIELS.variantesNote}</p>}
          {ici.s.complete && (
            <div className={s.complet}>
              <ActionEncre href={`/qcm/${ici.s.complete.id}`}>
                {S.complete(n)} <ArrowRight size={18} aria-hidden />
              </ActionEncre>
            </div>
          )}
          <ul className={s.tuiles}>
            {ici.s.topics.map((t) => (
              <li key={t.id} className={s.tuile}>
                <Link href={`/qcm/${t.id}`} className={"rl-presse " + s.tuileLien} aria-label={`${t.label}, ${OFFICIELS.nQuestions(t.count)}`}>
                  <b className={s.tuileCode} aria-hidden>
                    {codeTuile(t.label)}
                  </b>
                  <span className={s.tuileNom} aria-hidden>
                    {t.label}
                  </span>
                  <span className={s.tuileQ} aria-hidden>
                    {S.tuileQ(t.count)}
                  </span>
                </Link>
                {t.variant && (
                  <Link href={`/qcm/${t.variant.id}`} title={OFFICIELS.variantesTitre} aria-label={`${S.variantes} · ${t.label}, ${OFFICIELS.nQuestions(t.variant.count)}`} className={s.tuileVar}>
                    {S.variantesCourt} · {t.variant.count}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      </Scene>
    </SousPage>
  );
}
