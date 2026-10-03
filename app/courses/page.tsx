import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ShelfPage } from "@/components/reviser/ShelfPage";
import { COURSE_DESC, courseShelf } from "@/components/reviser/shelves";

// Cours complets : un deck PDF + un audio narré par matière, décrits dans
// lib/courses.ts (bucket privé "courses") ; celles qui n'y sont pas encore
// apparaissent « à venir ».
export default async function CoursesPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { items, upcoming } = courseShelf();
  return <ShelfPage kind="cours" kicker="Réviser" title="Cours complets" desc={COURSE_DESC} items={items} upcoming={upcoming} />;
}
