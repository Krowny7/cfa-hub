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
  { label: "Réglages", hint: "Profil, date d'examen", href: "/settings", group: "Pages", Icon: Settings },
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
        className="rl-press flex h-[38px] items-center gap-2 rounded-[12px] border border-line-2 bg-surface px-2.5 text-muted"
      >
        <Search size={16} strokeWidth={2} />
        <kbd className="hidden rounded-[6px] border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] font-semibold lg:inline">{mac ? "⌘K" : "Ctrl K"}</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] grid items-start justify-items-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Recherche">
          <div
            className="absolute inset-0"
            style={{ background: "color-mix(in oklab, var(--ink) 28%, transparent)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
            onClick={() => setOpen(false)}
          />
          <div className="rl-in relative w-full max-w-[620px] overflow-hidden rounded-[18px] border border-line bg-surface" style={{ boxShadow: "var(--shadow-2)", animationDuration: ".35s" }}>
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
              <kbd className="hidden shrink-0 rounded-[6px] border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-muted sm:inline">Échap</kbd>
            </div>
            <div ref={list} className="max-h-[min(420px,60vh)] overflow-y-auto p-2">
              {results.length === 0 && <div className="px-3 py-8 text-center text-sm text-muted">Rien ne correspond à « {q} ».</div>}
              {results.map((e, i) => {
                const header = e.group !== lastGroup ? e.group : null;
                lastGroup = e.group;
                const on = i === ix;
                return (
                  <div key={e.href}>
                    {header && <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{header}</div>}
                    <button
                      type="button"
                      data-ix={i}
                      onMouseMove={() => setIx(i)}
                      onClick={() => go(e)}
                      className={"flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left " + (on ? "bg-surface-2" : "")}
                    >
                      <span className={"grid h-8 w-8 shrink-0 place-items-center rounded-[9px] " + (on ? "bg-white text-black" : "bg-surface-2")}>
                        <e.Icon size={16} strokeWidth={2} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14.5px] font-semibold">{e.label}</span>
                        <span className="block truncate text-[12.5px] text-muted">{e.hint}</span>
                      </span>
                      {on && <ArrowRight size={16} className="shrink-0" />}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 border-t border-line px-4 py-2.5 text-[12px] text-muted">
              <span>↑ ↓ pour naviguer</span>
              <span>Entrée pour ouvrir</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
