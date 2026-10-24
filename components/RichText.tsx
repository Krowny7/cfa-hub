"use client";

import { Fragment, type ReactNode } from "react";
import katex from "katex";
import { passagesInline, type Passage } from "@/lib/richtext";
import st from "./RichText.module.css";

/**
 * Rendu texte enrichi pour le contenu généré (flashcards, etc.) : formules
 * KaTeX ($inline$ / $$bloc$$ sur sa propre ligne), gras inline (**…**, qui
 * peut contenir une formule), surligné inline (==…==, un trait de marqueur
 * derrière le texte) et images (![alt](url) sur sa propre ligne),
 * sinon texte brut avec retours à la ligne préservés. Volontairement
 * minimal (pas de markdown complet) — le contenu vient de nos propres
 * scripts de seed, pas d'un éditeur libre. Découpe inline : lib/richtext.ts.
 */

function renderKatex(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex.trim(), { throwOnError: false, displayMode });
  } catch {
    return tex;
  }
}

const BLOCK_MATH_RE = /^\$\$([\s\S]+)\$\$$/;
const IMAGE_RE = /^!\[([^\]]*)\]\(([^)]+)\)$/;

function Morceaux({ morceaux }: { morceaux: Passage["morceaux"] }) {
  return (
    <>
      {morceaux.map((m, k) =>
        m.t === "math" ? <span key={k} className="katex-formula" dangerouslySetInnerHTML={{ __html: renderKatex(m.v, false) }} /> : (
          <Fragment key={k}>{m.v}</Fragment>
        )
      )}
    </>
  );
}

function InlineSegments({ line }: { line: string }) {
  const passages = passagesInline(line);
  const rendre = (p: Passage, i: number) =>
    p.gras ? (
      <strong key={i} className="font-bold text-[var(--ink)]">
        <Morceaux morceaux={p.morceaux} />
      </strong>
    ) : (
      <Morceaux key={i} morceaux={p.morceaux} />
    );
  // les passages surlignés qui se suivent (« ==le **call** price== » en donne
  // trois) partagent un seul <mark> : un trait de marqueur continu, sans
  // bouts fondus ni blancs autour du mot en gras
  const out: ReactNode[] = [];
  for (let i = 0; i < passages.length; ) {
    if (!passages[i].surligne) {
      out.push(rendre(passages[i], i));
      i++;
      continue;
    }
    const debut = i;
    const trait: ReactNode[] = [];
    while (i < passages.length && passages[i].surligne) {
      trait.push(rendre(passages[i], i));
      i++;
    }
    out.push(
      <mark key={`m${debut}`} className={st.surligne}>
        {trait}
      </mark>
    );
  }
  return <>{out}</>;
}

/** Une seule ligne, dans le flux du texte (span) : formules $…$, gras, surligné. */
export function RichTextLigne({ line, className }: { line: string; className?: string }) {
  return (
    <span className={className}>
      <InlineSegments line={line} />
    </span>
  );
}

export function RichText({ text, className = "" }: { text: string; className?: string }) {
  const lines = (text ?? "").replace(/\r\n?/g, "\n").split("\n");

  return (
    <div className={className}>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        const block = BLOCK_MATH_RE.exec(trimmed);
        if (block) {
          return (
            <div
              key={i}
              className="katex-formula my-2 overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: renderKatex(block[1], true) }}
            />
          );
        }

        const img = IMAGE_RE.exec(trimmed);
        if (img) {
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={img[2]}
              alt={img[1]}
              className="mx-auto my-2 max-h-72 rounded-lg border border-white/10"
            />
          );
        }

        if (trimmed === "") {
          return <div key={i} className="h-2" aria-hidden />;
        }

        return (
          <p key={i} className="leading-relaxed">
            <InlineSegments line={line} />
          </p>
        );
      })}
    </div>
  );
}
