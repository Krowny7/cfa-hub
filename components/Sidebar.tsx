import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/core";
import { SidebarNav } from "@/components/SidebarNav";
import { getSessionUserWithProfile } from "@/lib/supabase/user";
import {
  Timer,
  BookOpen,
  Layers,
  ClipboardList,
  Users,
  Settings,
  LayoutDashboard,
  GraduationCap,
  Trophy,
  BookMarked,
} from "lucide-react";

export async function Sidebar() {
  const locale = await getLocale();
  const { user } = await getSessionUserWithProfile();

  if (!user) return null;

  const sections = [
    {
      items: [
        {
          href: "/session",
          label: t(locale, "nav.session"),
          icon: <Timer size={16} />,
          highlight: true,
        },
        {
          href: "/exam",
          label: t(locale, "nav.exam"),
          icon: <GraduationCap size={16} />,
        },
        {
          href: "/dashboard",
          label: t(locale, "nav.dashboard"),
          icon: <LayoutDashboard size={16} />,
        },
      ],
    },
    {
      label: t(locale, "nav.sectionContent"),
      items: [
        { href: "/library", label: t(locale, "nav.library"), icon: <BookOpen size={16} /> },
        { href: "/flashcards", label: t(locale, "nav.flashcards"), icon: <Layers size={16} /> },
        { href: "/qcm", label: t(locale, "nav.qcm"), icon: <ClipboardList size={16} /> },
        { href: "/fiches", label: "Fiches de Révision", icon: <BookMarked size={16} /> },
      ],
    },
    {
      label: t(locale, "nav.sectionSocial"),
      items: [
        { href: "/mock-exams", label: "Examens blancs", icon: <Trophy size={16} /> },
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
