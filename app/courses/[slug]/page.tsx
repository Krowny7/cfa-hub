import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCourse } from "@/lib/courses";
import { CourseView } from "./CourseView";

// Page d'un cours complet : même architecture que les fiches (bucket privé,
// URL signée), dans le bucket "courses". La configuration de chaque matière
// (fichiers, chapitres de l'audio) est dans lib/courses.ts ; la mise en page
// est dans CourseView. Lien direct : ?module=N démarre le module N.
export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ module?: string | string[] }>;
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams ?? Promise.resolve(undefined)]);
  const moduleParam = Number(Array.isArray(sp?.module) ? sp?.module[0] : sp?.module);
  const startModule = Number.isInteger(moduleParam) && moduleParam > 0 ? moduleParam : null;
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

  return <CourseView course={course} pdfUrl={pdfUrl} audioUrl={audioUrl} downloadName={downloadName} startModule={startModule} />;
}
