"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  FileText,
  Headphones,
  Home,
  Layers,
  Library,
  ListChecks,
  Search,
  Settings,
  Swords,
  Target,
  Trophy,
  User,
  Users,
} from "lucide-react";
import { COURSES } from "@/lib/courses";
import { signalNavStart } from "@/components/ui/motion/NavProgress";

// Palette de commandes (⌘K / Ctrl+K), à la Raycast : on tape quelques
// lettres et on saute n'importe où — espaces, pages, fiches, cours.

type Entry = { label: string; hint: string; href: string; group: string; Icon: typeof Home };

const FICHES: [string, string][] = [
  ["financial-statement-analysis", "Financial Statement Analysis"],
  ["fixed-income", "Fixed Income"],
  ["equity", "Equity Investments"],
  ["derivatives", "Derivatives"],
  ["portfolio-management", "Portfolio Management"],
];

const ENTRIES: Entry[] = [
  { label: "Accueil", hint: "Ta journée, ton rang, tes stats", href: "/dashboard", group: "Espaces", Icon: Home },
  { label: "Réviser", hint: "Fiches, cours, flashcards", href: "/reviser", group: "Espaces", Icon: BookOpen },
  { label: "S'entraîner", hint: "QCM, sessions, examens", href: "/entrainement", group: "Espaces", Icon: Target },
  { label: "Classement", hint: "Rang, ELO, duels", href: "/classement", group: "Espaces", Icon: Trophy },
  { label: "Moi", hint: "Profil, erreurs, réglages", href: "/moi", group: "Espaces", Icon: User },
  { label: "Lancer un duel", hint: "30 questions, ELO en jeu", href: "/duel", group: "Actions", Icon: Swords },
  { label: "Examens blancs", hint: "Examens classés et inscriptions", href: "/mock-exams", group: "Actions", Icon: ListChecks },
  { label: "Session d'entraînement", hint: "Questions ciblées par matière", href: "/practice", group: "Actions", Icon: Target },
  { label: "QCM", hint: "Toutes les séries", href: "/qcm", group: "Pages", Icon: ListChecks },
  { label: "Examens officiels", hint: "Questions officielles CFA", href: "/official-exams", group: "Pages", Icon: FileText },
  { label: "Fiches de révision", hint: "Cours + quiz côte à côte", href: "/fiches", group: "Pages", Icon: FileText },
  { label: "Cours complets", hint: "Decks PDF et audio", href: "/courses", group: "Pages", Icon: Headphones },
  { label: "Flashcards", hint: "Paquets par matière", href: "/flashcards", group: "Pages", Icon: Layers },
  { label: "Bibliothèque", hint: "Documents partagés", href: "/library", group: "Pages", Icon: Library },
  { label: "Joueurs", hint: "Chercher un joueur", href: "/people", group: "Pages", Icon: Users },
  { label: "Réglages", hint: "Profil, date d'examen", href: "/moi?onglet=reglages", group: "Pages", Icon: Settings },
  ...FICHES.map(([slug, title]) => ({ label: title, hint: "Fiche de révision", href: `/fiches/${slug}`, group: "Fiches", Icon: FileText })),
  ...COURSES.map((c) => ({ label: c.title, hint: `Cours complet · ${c.minutes} min d'audio`, href: `/courses/${c.slug}`, group: "Cours", Icon: Headphones })),
];

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function matches(e: Entry, q: string) {
  if (!q) return true;
  const hay = norm(`${e.label} ${e.hint} ${e.group}`);
  return norm(q)
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [ix, setIx] = useState(0);
  const input = useRef<HTMLInputElement | null>(null);
  const list = useRef<HTMLDivElement | null>(null);
  const [mac, setMac] = useState(true);

  const results = useMemo(() => ENTRIES.filter((e) => matches(e, q)), [q]);

  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQ("");
      setIx(0);
      requestAnimationFrame(() => input.current?.focus());
    }
  }, [open]);

  useEffect(() => setIx(0), [q]);

  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-ix="${ix}"]`)?.scrollIntoView({ block: "nearest" });
  }, [ix]);

  const go = (e: Entry | undefined) => {
    if (!e) return;
    setOpen(false);
    signalNavStart();
    router.push(e.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[ix]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  let lastGroup = "";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Rechercher (raccourci Ctrl+K)"
        className="icon-btn flex w-auto items-center gap-2 px-[10px] text-muted lg:pr-1.5"
      >
        <Search size={16} strokeWidth={1.9} />
        <span className="hidden text-[13px] font-medium xl:inline">Rechercher</span>
        <kbd className="kbd hidden lg:inline-flex">{mac ? "⌘K" : "Ctrl K"}</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] grid items-start justify-items-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Recherche">
          <div
            className="rl-fade absolute inset-0"
            style={{ background: "color-mix(in oklab, var(--paper) 55%, rgba(0,0,0,.28))", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
            onClick={() => setOpen(false)}
          />
          <div className="menu relative w-full max-w-[620px] overflow-hidden rounded-[20px] p-0">
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search size={18} className="shrink-0 text-muted" />
              <input
                ref={input}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Aller à une page, une fiche, un cours…"
                className="h-[56px] w-full bg-transparent text-[16px] outline-none placeholder:text-muted"
                aria-label="Rechercher"
              />
              <kbd className="kbd hidden shrink-0 sm:inline-flex">Échap</kbd>
            </div>
            <div ref={list} className="max-h-[min(420px,60vh)] overflow-y-auto p-2">
              {results.length === 0 && <div className="px-3 py-8 text-center text-sm text-muted">Rien ne correspond à « {q} ».</div>}
              {results.map((e, i) => {
                const header = e.group !== lastGroup ? e.group : null;
                lastGroup = e.group;
                const on = i === ix;
                return (
                  <div key={e.href}>
                    {header && <div className="t-eyebrow px-3 pb-1.5 pt-3">{header}</div>}
                    <button
                      type="button"
                      data-ix={i}
                      onMouseMove={() => setIx(i)}
                      onClick={() => go(e)}
                      data-active={on}
                      className="menu-item gap-3 px-3 py-2"
                    >
                      <span className={"grid h-8 w-8 shrink-0 place-items-center rounded-[9px] transition-colors " + (on ? "bg-white text-black" : "bg-surface-2 text-muted")}>
                        <e.Icon size={16} strokeWidth={2} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14.5px] font-semibold tracking-[-0.006em]">{e.label}</span>
                        <span className="block truncate text-[12.5px] font-normal text-muted">{e.hint}</span>
                      </span>
                      {on && <ArrowRight size={16} className="shrink-0" />}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="hidden items-center gap-4 border-t border-line px-4 py-2.5 text-[12px] text-muted sm:flex">
              <span className="flex items-center gap-1.5"><kbd className="kbd">↑</kbd><kbd className="kbd">↓</kbd> naviguer</span>
              <span className="flex items-center gap-1.5"><kbd className="kbd">Entrée</kbd> ouvrir</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
