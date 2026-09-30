"use client";

import katex from "katex";

/**
 * Rendu texte enrichi pour le contenu généré (flashcards, etc.) : formules
 * KaTeX ($inline$ / $$bloc$$ sur sa propre ligne) et images
 * (![alt](url) sur sa propre ligne), sinon texte brut avec retours à la
 * ligne préservés. Volontairement minimal (pas de markdown complet) — le
 * contenu vient de nos propres scripts de seed, pas d'un éditeur libre.
 */

function renderKatex(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex.trim(), { throwOnError: false, displayMode });
  } catch {
    return tex;
  }
}

const INLINE_MATH_RE = /\$([^$\n]+?)\$/g;
const BLOCK_MATH_RE = /^\$\$([\s\S]+)\$\$$/;
const IMAGE_RE = /^!\[([^\]]*)\]\(([^)]+)\)$/;

function InlineSegments({ line }: { line: string }) {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  INLINE_MATH_RE.lastIndex = 0;
  while ((m = INLINE_MATH_RE.exec(line))) {
    if (m.index > last) nodes.push(line.slice(last, m.index));
    nodes.push(
      <span
        key={key++}
        className="katex-formula"
        dangerouslySetInnerHTML={{ __html: renderKatex(m[1], false) }}
      />
    );
    last = INLINE_MATH_RE.lastIndex;
  }
  if (last < line.length) nodes.push(line.slice(last));
  return <>{nodes}</>;
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
