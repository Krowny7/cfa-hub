import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Download, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CourseAudioPlayer } from "@/components/CourseAudioPlayer";
import { getCourse } from "@/lib/courses";

// Page d'un cours complet : même architecture que les fiches (bucket privé,
// URL signée), dans le bucket "courses". La configuration de chaque matière
// (fichiers, chapitres de l'audio) est dans lib/courses.ts.
export default async function CoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = getCourse(slug);
  if (!course) notFound();

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const [pdfRes, audioRes] = await Promise.all([
    supabase.storage
      .from("courses")
      .createSignedUrl(`${course.file}.pdf`, 3600),
    supabase.storage
      .from("courses")
      .createSignedUrl(`${course.file}.mp3`, 3600),
  ]);

  const pdfUrl = pdfRes.error ? null : (pdfRes.data?.signedUrl ?? null);
  const audioUrl = audioRes.error ? null : (audioRes.data?.signedUrl ?? null);
  const downloadName = `${course.title.replace(/[^A-Za-z0-9]+/g, "_")}_Cours_Complet.pdf`;

  return (
    <div className="grid gap-4">
      <div>
        <Link
          href="/courses"
          className="text-xs text-white/50 hover:text-white/80"
        >
          ← Cours complets
        </Link>
        <h1 className="mt-1 font-display text-xl font-medium tracking-tight">
          {course.title} — Cours complet
        </h1>
        <p className="mt-1 text-sm text-white/55">
          {course.chapters.length} Learning Modules détaillés, avec un audio
          explicatif façon cours magistral — clique un module pour sauter
          directement à ce passage.
        </p>
      </div>

      {audioUrl && (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
            Écouter le cours
          </div>
          <CourseAudioPlayer src={audioUrl} chapters={course.chapters} />
        </div>
      )}

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
          Lire le cours
        </div>
        {!pdfUrl ? (
          <div className="card p-6 text-center text-sm text-muted">
            Impossible de charger le cours pour le moment. Réessaie dans un
            instant.
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] p-3">
              <div className="text-xs text-white/50">
                {course.title} — {course.pages} pages
              </div>
              <div className="flex gap-2">
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary inline-flex items-center gap-1.5 text-xs"
                >
                  <ExternalLink size={13} /> Ouvrir dans un nouvel onglet
                </a>
                <a
                  href={pdfUrl}
                  download={downloadName}
                  className="btn btn-secondary inline-flex items-center gap-1.5 text-xs"
                >
                  <Download size={13} /> Télécharger
                </a>
              </div>
            </div>
            <iframe
              src={pdfUrl}
              title={`${course.title} — Cours complet`}
              className="h-[80vh] w-full"
            />
          </div>
        )}
      </div>
    </div>
  );
}
