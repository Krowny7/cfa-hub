import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CourseAudioPlayer, type Chapter } from "@/components/CourseAudioPlayer";

// Même architecture que les fiches (bucket privé, URL signée) mais dans le
// bucket "courses" : le deck complet (PDF, 12 Learning Modules) + l'audio
// narré correspondant (un seul fichier compilé — voir
// scripts/upload-course-fsa.mjs — avec des chapitres cliquables calculés à
// partir de la durée exacte de chaque module au moment de la génération).
const CHAPTERS: Chapter[] = [
  { title: "Introduction to Financial Statement Analysis", start: 0 },
  { title: "Analyzing Income Statements", start: 422.3 },
  { title: "Analyzing Balance Sheets", start: 835.9 },
  { title: "Analyzing Statements of Cash Flows I", start: 1166.5 },
  { title: "Analyzing Statements of Cash Flows II", start: 1452.7 },
  { title: "Analysis of Inventories", start: 1746.2 },
  { title: "Analysis of Long-Term Assets", start: 2050.2 },
  { title: "Topics in Long-Term Liabilities and Equity", start: 2429.8 },
  { title: "Analysis of Income Taxes", start: 2794 },
  { title: "Financial Reporting Quality", start: 3100.5 },
  { title: "Financial Analysis Techniques", start: 3354.5 },
  { title: "Introduction to Financial Statement Modeling", start: 3825.1 },
];

export default async function FSACoursePage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const [pdfRes, audioRes] = await Promise.all([
    supabase.storage.from("courses").createSignedUrl("financial-statement-analysis.pdf", 3600),
    supabase.storage.from("courses").createSignedUrl("financial-statement-analysis.mp3", 3600),
  ]);

  const pdfUrl = pdfRes.error ? null : pdfRes.data?.signedUrl ?? null;
  const audioUrl = audioRes.error ? null : audioRes.data?.signedUrl ?? null;

  return (
    <div className="grid gap-4">
      <div>
        <Link href="/courses" className="text-xs text-white/50 hover:text-white/80">
          ← Cours complets
        </Link>
        <h1 className="mt-1 font-display text-xl font-medium tracking-tight">
          Financial Statement Analysis — Cours complet
        </h1>
        <p className="mt-1 text-sm text-white/55">
          12 Learning Modules détaillés, avec un audio explicatif façon cours magistral — clique un module
          pour sauter directement à ce passage.
        </p>
      </div>

      {audioUrl && (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
            Écouter le cours
          </div>
          <CourseAudioPlayer src={audioUrl} chapters={CHAPTERS} />
        </div>
      )}

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">Lire le cours</div>
        {!pdfUrl ? (
          <div className="card p-6 text-center text-sm text-muted">
            Impossible de charger le cours pour le moment. Réessaie dans un instant.
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] p-3">
              <div className="text-xs text-white/50">Financial Statement Analysis — 100 pages</div>
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
                  download="Financial_Statement_Analysis_Cours_Complet.pdf"
                  className="btn btn-secondary inline-flex items-center gap-1.5 text-xs"
                >
                  <Download size={13} /> Télécharger
                </a>
              </div>
            </div>
            <iframe src={pdfUrl} title="Financial Statement Analysis — Cours complet" className="h-[80vh] w-full" />
          </div>
        )}
      </div>
    </div>
  );
}
