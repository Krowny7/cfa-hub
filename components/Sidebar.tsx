import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/core";
import { SidebarNav } from "@/components/SidebarNav";
import { getSessionUserWithProfile } from "@/lib/supabase/user";
import { BookOpen, Users, Settings, LayoutDashboard, Target } from "lucide-react";

// Nav réduite à l'essentiel : Bibliothèque (Fiches + Flashcards) et
// Entraînement (QCM + Mocks officiels + Entraînement ciblé + Examens blancs)
// regroupent ce qui occupait 8 entrées auparavant. Session et Examen sont
// masqués (retirés d'ici) sans être supprimés — leurs pages et routes
// restent intactes.
export async function Sidebar() {
  const locale = await getLocale();
  const { user } = await getSessionUserWithProfile();

  if (!user) return null;

  const sections = [
    {
      items: [
        { href: "/dashboard", label: t(locale, "nav.dashboard"), icon: <LayoutDashboard size={16} /> },
        { href: "/library", label: t(locale, "nav.library"), icon: <BookOpen size={16} /> },
        { href: "/entrainement", label: t(locale, "nav.entrainement"), icon: <Target size={16} /> },
        { href: "/people", label: t(locale, "nav.people"), icon: <Users size={16} /> },
      ],
    },
  ];

  const bottomItems = [
    { href: "/settings", label: t(locale, "nav.settings"), icon: <Settings size={16} /> },
  ];

  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col sticky top-12 h-[calc(100vh-3rem)] border-r border-white/[0.07]">
      <SidebarNav sections={sections} bottomItems={bottomItems} />
    </aside>
  );
}
