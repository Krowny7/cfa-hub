import { ExternalLink, FileText, Headphones } from "lucide-react";
import { CourseAudioPlayer } from "@/components/CourseAudioPlayer";
import type { Course } from "@/lib/courses";
import { SUBJECTS } from "@/components/reviser/catalog";
import { CadreZones, EnTeteSousPage, SousPage } from "@/components/ui/SousPage";
import { COURS, RETOUR } from "@/lib/voice-reviser";
import { POSTE_COURS } from "@/lib/voice-postes";
import poste from "@/components/reviser/Postes.module.css";

// Présentation d'un cours complet (sans requête, rendue aussi par l'aperçu), sur le modèle des
// sous-pages (2026-11-12) : l'en-tête commun (retour aux cours complets, la matière, une ligne :
// modules, pages, audio), puis le cadre à zones : « Le deck » à gauche (un seul bouton, « Ouvrir »),
// « L'audio » dans la colonne grise : le lecteur et la liste des modules, le module courant marqué.
// Sans audio, le deck seul.
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
          ligne={COURS.ligne(course.chapters.length, course.pages, course.minutes)}
        />
      }
    >
      <CadreZones
        gauche={{
          titre: POSTE_COURS.deck,
          contenu: (
            <section aria-label={COURS.lire} className={poste.haut + " grid min-w-0 gap-3"}>
              {!pdfUrl ? (
                <div className="card-quiet px-6 py-12 text-center">
                  <FileText size={20} className="mx-auto text-muted" aria-hidden />
                  <p className="t-small mt-3">{COURS.indisponible}</p>
                </div>
              ) : (
                <div className="card overflow-hidden">
                  <div className="flex items-center justify-end border-b border-line py-1.5 pl-4 pr-2">
                    <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm shrink-0" title={COURS.ouvrirAide}>
                      <ExternalLink size={15} aria-hidden />
                      <span>
                        {COURS.ouvrir}
                        <span className="hidden sm:inline">{COURS.ouvrirSuite}</span>
                      </span>
                    </a>
                  </div>
                  <iframe src={pdfUrl} title={COURS.iframe(course.title)} className="block h-[70vh] w-full bg-surface-2 min-[980px]:h-[calc(100vh-9.75rem)]" />
                </div>
              )}
              {!audioUrl && (
                <p className="t-micro m-0 inline-flex items-center gap-1.5">
                  <Headphones size={13} aria-hidden /> {COURS.sansAudio}
                </p>
              )}
            </section>
          ),
        }}
        droite={
          audioUrl
            ? {
                titre: POSTE_COURS.audio,
                contenu: (
                  <section aria-label={COURS.ecouter} className="min-w-0">
                    <CourseAudioPlayer
                      src={audioUrl}
                      chapters={course.chapters}
                      storageKey={course.slug}
                      title={course.title}
                      duration={course.minutes * 60}
                      startModule={startModule}
                      matiere={SUBJECTS.find((x) => x.course === course.slug)?.key}
                    />
                  </section>
                ),
              }
            : undefined
        }
      />
    </SousPage>
  );
}
