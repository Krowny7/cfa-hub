import { ExternalLink, FileText, Headphones } from "lucide-react";
import { CourseAudioPlayer } from "@/components/CourseAudioPlayer";
import type { Course } from "@/lib/courses";
import { SUBJECTS } from "@/components/reviser/catalog";
import { EnTeteSousPage, SousPage } from "@/components/ui/SousPage";
import { COURS, RETOUR } from "@/lib/voice-reviser";

// Présentation d'un cours complet (sans requête, rendue aussi par l'aperçu), gabarit B des
// sous-pages : l'en-tête commun (retour aux cours complets, la matière, une ligne : modules,
// pages, audio), puis la zone de travail en 1 240 px : le deck à gauche et l'audio à droite
// sur grand écran — l'audio (avec ses modules) d'abord sur téléphone. Le nombre de pages
// n'est dit qu'une fois (dans l'en-tête) ; le deck n'a qu'un bouton, « Ouvrir ».
export function CourseView({
  course,
  pdfUrl,
  audioUrl,
  startModule = null,
}: {
  course: Course;
  pdfUrl: string | null;
  audioUrl: string | null;
  /** ancien nom du PDF à télécharger : le bouton « Télécharger » a été retiré (2026-11-12), gardé pour l'aperçu */
  downloadName?: string;
  /** ?module=N : le module à démarrer (1 = le premier) */
  startModule?: number | null;
}) {
  return (
    <SousPage
      entete={
        <EnTeteSousPage
          illustration={{ nom: "reviser-pupitre" }}
          retour={RETOUR.cours}
          titre={course.title}
          ligne={
            <>
              {COURS.ligne(course.chapters.length, course.pages, course.minutes)}
              <span className="hidden sm:inline">{COURS.ligneAide}</span>
            </>
          }
        />
      }
    >
      <div className={audioUrl ? "grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_400px] xl:gap-8" : "grid gap-6"}>
        {audioUrl && (
          <aside aria-label={COURS.ecouter} className="min-w-0 lg:sticky lg:top-[84px] lg:order-2">
            <CourseAudioPlayer
              src={audioUrl}
              chapters={course.chapters}
              storageKey={course.slug}
              title={course.title}
              duration={course.minutes * 60}
              startModule={startModule}
              matiere={SUBJECTS.find((x) => x.course === course.slug)?.key}
            />
          </aside>
        )}

        <section aria-label={COURS.lire} className="min-w-0 lg:order-1">
          {!pdfUrl ? (
            <div className="card-quiet px-6 py-12 text-center">
              <FileText size={20} className="mx-auto text-muted" aria-hidden />
              <p className="t-small mt-3">{COURS.indisponible}</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="flex items-center gap-2 border-b border-line py-2 pl-4 pr-2">
                <FileText size={15} className="shrink-0 text-muted" aria-hidden />
                <p className="min-w-0 flex-1 truncate text-[13px] font-semibold">{COURS.deck}</p>
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm shrink-0" title={COURS.ouvrirAide}>
                  <ExternalLink size={15} aria-hidden />
                  <span>
                    {COURS.ouvrir}
                    <span className="hidden sm:inline">{COURS.ouvrirSuite}</span>
                  </span>
                </a>
              </div>
              <iframe src={pdfUrl} title={COURS.iframe(course.title)} className="block h-[70vh] w-full bg-surface-2 lg:h-[calc(100vh-9.75rem)]" />
            </div>
          )}
          {!audioUrl && (
            <p className="t-micro mt-3 inline-flex items-center gap-1.5">
              <Headphones size={13} aria-hidden /> {COURS.sansAudio}
            </p>
          )}
        </section>
      </div>
    </SousPage>
  );
}
