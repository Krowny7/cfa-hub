import type { ReactNode } from "react";
import katex from "katex";
import { Info, Lightbulb, OctagonAlert, TriangleAlert } from "lucide-react";

// Briques des fiches de lecture en JSX (ex. Derivatives) : sans état,
// utilisables depuis un composant serveur (KaTeX est rendu côté serveur).

export function FCard({
  title,
  en,
  children,
}: {
  title?: string;
  en?: string;
  children: ReactNode;
}) {
  return (
    <div className="card mb-3 p-5">
      {title && <h4 className="text-[15px] font-semibold leading-snug tracking-[-0.01em]">{title}</h4>}
      {en && <p className="mt-0.5 text-[12px] italic text-muted">{en}</p>}
      <div
        className={`text-[14.5px] leading-[1.72] text-body [&_strong]:font-semibold [&_strong]:text-white ${title || en ? "mt-2.5" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}

// Quatre nuances de remarque. Noir et blanc : seule « red » (piège) prend le
// rouge correcteur ; les autres se distinguent par leur icône.
const ruleStyles = {
  blue: { Icon: Info, pen: false },
  green: { Icon: Lightbulb, pen: false },
  amber: { Icon: TriangleAlert, pen: false },
  red: { Icon: OctagonAlert, pen: true },
} as const;

export function Rule({
  c = "blue",
  children,
}: {
  c?: keyof typeof ruleStyles;
  children: ReactNode;
}) {
  const { Icon, pen } = ruleStyles[c];
  return (
    <div
      className={`my-3 flex gap-3 rounded-l-[3px] rounded-r-[12px] px-4 py-3 text-[14px] leading-[1.62] text-white [&_strong]:font-semibold ${
        pen
          ? "bg-[color-mix(in_oklab,var(--pen)_9%,var(--paper))] shadow-[inset_2px_0_0_var(--pen)]"
          : "bg-surface-2 shadow-[inset_2px_0_0_var(--ink-3)]"
      }`}
    >
      <Icon size={16} className={`mt-[3px] shrink-0 ${pen ? "text-pen" : "text-muted"}`} aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Formula({ children }: { children: ReactNode }) {
  return (
    <pre className="my-3 overflow-x-auto whitespace-pre rounded-[12px] border border-line bg-surface-2/60 px-4 py-3 font-mono text-[12.5px] leading-[1.85] text-white">
      {children}
    </pre>
  );
}

/**
 * Formule rendue avec KaTeX (vraie notation mathématique — fractions,
 * exposants, Σ, etc.) plutôt qu'en texte ASCII brut. `lines` accepte une ou
 * plusieurs expressions LaTeX, chacune affichée sur sa propre ligne.
 */
export function KFormula({ lines }: { lines: string | string[] }) {
  const items = Array.isArray(lines) ? lines : [lines];
  return (
    <div className="my-3 grid gap-2.5 overflow-x-auto rounded-[12px] border border-line bg-surface-2/60 px-4 py-3.5">
      {items.map((tex, i) => (
        <div
          key={i}
          className="katex-formula text-white"
          dangerouslySetInnerHTML={{
            __html: katex.renderToString(tex, { throwOnError: false, displayMode: true }),
          }}
        />
      ))}
    </div>
  );
}

export function Sec({
  los,
  label,
  children,
}: {
  los?: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-9">
      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        {los && (
          <span className="rounded-[7px] bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-muted">{los}</span>
        )}
        <h3 className="t-eyebrow">{label}</h3>
      </div>
      {children}
    </div>
  );
}

export function Reading({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    // scroll-mt : barre du haut (64 px) + sous-navigation collante (48 px)
    <section className="mb-16 scroll-mt-32" id={id}>
      <header className="mb-8 border-t border-line pt-8">
        <span className="inline-flex rounded-[8px] bg-white px-2 py-1 font-mono text-[11.5px] font-bold uppercase tracking-[0.06em] text-black">
          {number}
        </span>
        <h2 className="t-h2 mt-3">{title}</h2>
      </header>
      {children}
    </section>
  );
}

export function FTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | ReactNode)[][];
}) {
  return (
    <div className="card mb-3 overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse text-[13.5px]">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="t-eyebrow border-b border-line px-4 pb-2.5 pt-3.5 text-left">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={`px-4 py-3 align-top leading-[1.55] ${ri < rows.length - 1 ? "border-b border-line" : ""} ${
                    ci === 0 ? "font-semibold text-white" : "text-body"
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
