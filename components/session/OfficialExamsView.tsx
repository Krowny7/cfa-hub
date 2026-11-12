import Link from "next/link";
import { ArrowRight, ChevronRight, Sparkles } from "lucide-react";
import { Carrousel } from "@/components/ui/Carrousel";
import type { Piece } from "@/components/ui/Presentoir";
import { ListeCourte } from "@/components/ui/Decors";
import { ActionEncre, CadreAnnexe, CadreZones, EnTeteSousPage, SousPage } from "@/components/ui/SousPage";
import { numeroPiece } from "@/components/entrainement/pieces";
import { OFFICIELS } from "@/lib/voice-z3b";
import { RETOUR_ENTRAINEMENT, SOUS_ENTRAINEMENT } from "@/lib/voice-entrainement-sous";

// Examens officiels, sur le modèle des sous-pages validé par Théo (2026-11-12) : l'en-tête commun
// (le sceau à droite), puis le cadre à zones : les sessions en sceaux sur le carrousel à gauche (le
// sceau de devant ouvre sa session, juste dessous), tes scores par session dans la colonne grise.
// Dessous, la seule annexe : la session choisie (la passer en entier, ou une matière à la fois, et
// ses variantes). Vue sans état : app/official-exams regroupe les sets et lit tes copies, l'aperçu
// (app/preview-da) en fournit d'exemple. Le quiz lui-même vit dans /qcm.

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

const sessionTotal = (s: Session) => s.complete?.count ?? s.topics.reduce((n, t) => n + t.count, 0);
/** La clé d'une session dans l'adresse (?session=) */
const cleSession = (exam: string, label: string) => `${exam}::${label}`;
/** Le code du sceau : la lettre de l'examen et le numéro de la session (« A1 », « VA1 » pour ses variantes). */
function codeSession(exam: string, label: string) {
  const lettre = exam.trim().split(/\s+/).pop()?.slice(0, 1).toUpperCase() ?? "";
  const numero = label.match(/\d+/)?.[0] ?? label.slice(0, 1);
  return `${exam.startsWith("Variantes ") ? "V" : ""}${lettre}${numero}`;
}

export function OfficialExamsView({ exams, scores = {}, choisie = null }: { exams: OfficialExamGroup[]; scores?: Record<string, ScoreSet>; choisie?: string | null }) {
  const entete = <EnTeteSousPage retour={RETOUR_ENTRAINEMENT} titre={OFFICIELS.titre} ligne={OFFICIELS.sous} illustration={{ nom: "exams-sceau" }} />;

  const entrees: Entree[] = exams.flatMap((g) =>
    Object.entries(g.sessions)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, s]) => ({ cle: cleSession(g.exam, label), exam: g.exam, label, s })),
  );

  if (entrees.length === 0) {
    return (
      <SousPage entete={entete}>
        <CadreZones gauche={{ titre: OFFICIELS.videTitre, contenu: <p className="t-small m-0">{OFFICIELS.videTexte}</p> }} />
      </SousPage>
    );
  }

  const pieces: Piece[] = entrees.map((e, i) => ({
    cle: e.cle,
    href: `/official-exams?session=${encodeURIComponent(e.cle)}#session`,
    numero: numeroPiece(i),
    code: codeSession(e.exam, e.label),
    titre: `${e.exam} · ${e.label}`,
  }));
  const ici = entrees.find((e) => e.cle === choisie) ?? entrees[0];
  const depart = Math.max(0, entrees.indexOf(ici));

  // tes scores : ta meilleure copie de la session complète ; les sessions passées d'abord
  const meilleure = (e: Entree) => (e.s.complete ? scores[e.s.complete.id] : undefined);
  const lignes = [...entrees]
    .sort((a, b) => Number(!!meilleure(b)) - Number(!!meilleure(a)))
    .map((e) => {
      const b = meilleure(e);
      return { cle: e.cle, titre: `${e.exam} · ${e.label}`, detail: b && b.total > 0 ? `${Math.round((b.score / b.total) * 100)} %` : S.pasEncore };
    });

  const n = sessionTotal(ici.s);

  return (
    <SousPage entete={entete}>
      <CadreZones
        gauche={{ titre: S.choisir, contenu: <Carrousel forme="sceau" pieces={pieces} action={S.ouvrir} depart={depart} /> }}
        droite={{ titre: S.scores, contenu: <ListeCourte lignes={lignes} /> }}
      />

      {/* l'annexe indispensable : la session choisie, en entier ou matière par matière */}
      <CadreAnnexe id="session" titre={`${ici.exam} · ${ici.label}`}>
        {ici.exam.startsWith("Variantes ") && <p className="t-micro m-0">{OFFICIELS.variantesNote}</p>}
        {ici.s.complete && (
          <div>
            <ActionEncre href={`/qcm/${ici.s.complete.id}`}>
              {S.complete(n)} <ArrowRight size={16} aria-hidden />
            </ActionEncre>
          </div>
        )}
        <ul className="m-0 grid list-none grid-cols-1 gap-x-6 divide-y divide-line p-0 xl:grid-cols-2 xl:divide-y-0">
          {ici.s.topics.map((t) => (
            <li key={t.id} className="flex min-w-0 items-center gap-1 xl:border-b xl:border-line">
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
      </CadreAnnexe>
    </SousPage>
  );
}
