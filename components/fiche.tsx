"use client";

import { useState, type ReactNode } from "react";

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
    <div className="card p-4 mb-3">
      {title && <div className="text-[13px] font-semibold mb-1">{title}</div>}
      {en && <div className="text-[11px] text-muted italic mb-2">{en}</div>}
      <div className="text-[13px] text-white/65 leading-[1.75]">{children}</div>
    </div>
  );
}

const ruleStyles = {
  blue: "border-blue-400 bg-blue-400/10 text-blue-300",
  green: "border-emerald-400 bg-emerald-400/10 text-emerald-300",
  amber: "border-amber-400 bg-amber-400/10 text-amber-300",
  red: "border-red-400 bg-red-400/10 text-red-300",
} as const;

export function Rule({
  c = "blue",
  children,
}: {
  c?: keyof typeof ruleStyles;
  children: ReactNode;
}) {
  return (
    <div
      className={`border-l-2 pl-3.5 pr-2.5 py-2 rounded-r-md my-2 text-[13px] leading-[1.65] ${ruleStyles[c]}`}
    >
      {children}
    </div>
  );
}

export function Formula({ children }: { children: ReactNode }) {
  return (
    <pre className="font-mono text-[12px] bg-black/60 border border-white/[0.13] rounded-md px-3.5 py-3 my-3 text-white/85 leading-[1.9] overflow-x-auto whitespace-pre">
      {children}
    </pre>
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
    <div className="mb-7">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-faint mb-3.5">
        {los && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-400/25">
            {los}
          </span>
        )}
        {label}
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
    <section className="mb-20 scroll-mt-20" id={id}>
      {/* Full-width header band — visible anchor when scrolling */}
      <div className="-mx-4 md:-mx-8 px-4 md:px-8 py-5 mb-7 border-t-2 border-blue-500/40 bg-gradient-to-b from-blue-500/[0.06] to-transparent">
        <div className="flex items-center gap-3">
          <span className="shrink-0 font-mono text-[11px] font-bold tracking-widest text-blue-300 bg-blue-500/15 border border-blue-400/30 px-2.5 py-1 rounded-md uppercase">
            {number}
          </span>
          <h2 className="text-base font-semibold tracking-tight text-white">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

type QuizCardProps =
  | { q: string; a: ReactNode; choices?: undefined; answer?: undefined; explain?: undefined }
  | { q: string; choices: string[]; answer: number; explain: ReactNode; a?: undefined };

export function QuizCard(props: QuizCardProps) {
  const { q } = props;
  const [shown, setShown] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);

  if (props.choices) {
    const { choices, answer, explain } = props;
    return (
      <div className="card p-4 mb-3">
        <div className="text-[13px] font-medium mb-2.5">{q}</div>
        <div className="flex flex-col gap-2">
          {choices.map((choice, i) => {
            const isPicked = picked === i;
            const isCorrect = i === answer;
            const revealed = picked !== null;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setPicked(i)}
                className={
                  "text-left text-[13px] px-3 py-1.5 rounded-md border transition-colors " +
                  (revealed && isCorrect
                    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                    : revealed && isPicked && !isCorrect
                    ? "border-red-400/40 bg-red-400/10 text-red-200"
                    : "border-white/[0.10] text-white/65 hover:bg-white/5")
                }
              >
                {choice}
              </button>
            );
          })}
        </div>
        {picked !== null && (
          <div className="text-[13px] text-white/65 bg-white/[0.04] rounded-md px-3 py-2 mt-2 leading-[1.6]">
            {explain}
          </div>
        )}
      </div>
    );
  }

  const { a } = props;
  return (
    <div
      className="card p-4 mb-3 cursor-pointer select-none"
      onClick={() => setShown((v) => !v)}
    >
      <div className="text-[13px] font-medium mb-2.5">{q}</div>
      <button
        type="button"
        className="text-[11px] font-medium border border-white/[0.13] text-white/50 px-2.5 py-0.5 rounded-full hover:bg-white/5 hover:text-white/80 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {shown ? "Masquer" : "Révéler"}
      </button>
      {shown && (
        <div className="text-[13px] text-white/65 bg-white/[0.04] rounded-md px-3 py-2 mt-2 leading-[1.6]">
          {a}
        </div>
      )}
    </div>
  );
}

export function QuizSec({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-white/25 mb-3.5">
        Quiz Flash
        <span className="flex-1 h-px bg-white/[0.07]" />
      </div>
      {children}
    </div>
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
    <div className="card overflow-x-auto mb-3">
      <table className="w-full min-w-max text-[13px] border-collapse">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className="text-[11px] font-medium text-faint pb-2.5 pt-3 px-3.5 border-b border-white/[0.07] text-left uppercase tracking-[0.04em]"
              >
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
                  className={`py-2.5 px-3.5 text-white/65 align-top ${ri < rows.length - 1 ? "border-b border-white/[0.05]" : ""} ${ci === 0 ? "font-medium text-white/85" : ""}`}
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
