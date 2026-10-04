import Link from "next/link";
import { ArrowLeft, Download, ExternalLink, FileText, Headphones } from "lucide-react";
import { CourseAudioPlayer } from "@/components/CourseAudioPlayer";
import type { Course } from "@/lib/courses";

// Présentation d'un cours complet (sans requête, rendue aussi par l'aperçu) :
// en-tête, puis le deck à gauche et l'audio à droite sur grand écran —
// l'audio (avec ses modules) d'abord sur téléphone.
export function CourseView({
  course,
  pdfUrl,
  audioUrl,
  downloadName,
  startModule = null,
}: {
  course: Course;
  pdfUrl: string | null;
  audioUrl: string | null;
  downloadName: string;
  /** ?module=N : le module à démarrer (1 = le premier) */
  startModule?: number | null;
}) {
  return (
    <div className="rl-wide flex flex-col gap-6 md:gap-8">
      <header className="min-w-0">
        <Link href="/courses" className="t-small inline-flex items-center gap-1.5 font-semibold hover:text-white">
          <ArrowLeft size={14} aria-hidden /> Cours complets
        </Link>
        <h1 className="t-h1 mt-3">{course.title}</h1>
        <p className="t-small mt-2">
          {course.chapters.length} Learning Modules · {course.pages} pages · {course.minutes} min d&apos;audio
          <span className="hidden sm:inline"> — clique un module pour sauter directement à ce passage.</span>
        </p>
      </header>

      <div className={audioUrl ? "grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_400px] xl:gap-8" : "grid gap-6"}>
        {audioUrl && (
          <aside aria-label="Écouter le cours" className="min-w-0 lg:sticky lg:top-[84px] lg:order-2">
            <CourseAudioPlayer
              src={audioUrl}
              chapters={course.chapters}
              storageKey={course.slug}
              title={course.title}
              duration={course.minutes * 60}
              startModule={startModule}
            />
          </aside>
        )}

        <section aria-label="Lire le cours" className="min-w-0 lg:order-1">
          {!pdfUrl ? (
            <div className="card-quiet px-6 py-12 text-center">
              <FileText size={20} className="mx-auto text-muted" aria-hidden />
              <p className="t-small mt-3">Impossible de charger le cours pour le moment. Réessaie dans un instant.</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="flex items-center gap-2 border-b border-line py-2 pl-4 pr-2">
                <FileText size={15} className="shrink-0 text-muted" aria-hidden />
                <p className="min-w-0 flex-1 truncate text-[13px] text-muted">
                  <span className="font-semibold text-white">Le deck</span> · {course.pages} pages
                </p>
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm shrink-0" title="Ouvrir dans un nouvel onglet">
                  <ExternalLink size={15} aria-hidden />
                  <span>
                    Ouvrir<span className="hidden sm:inline"> dans un nouvel onglet</span>
                  </span>
                </a>
                <a href={pdfUrl} download={downloadName} className="btn btn-ghost btn-sm shrink-0" title="Télécharger le PDF">
                  <Download size={15} aria-hidden />
                  <span className="hidden sm:inline">Télécharger</span>
                </a>
              </div>
              <iframe
                src={pdfUrl}
                title={`${course.title} — Cours complet`}
                className="block h-[70vh] w-full bg-surface-2 lg:h-[calc(100vh-9.75rem)]"
              />
            </div>
          )}
          {!audioUrl && (
            <p className="t-micro mt-3 inline-flex items-center gap-1.5">
              <Headphones size={13} aria-hidden /> L&apos;audio de ce cours n&apos;est pas disponible pour le moment.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
