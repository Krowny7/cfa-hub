import { Fragment, type ReactNode } from "react";
import katex from "katex";
import st from "@/components/RichText.module.css";
import { decouperVerso } from "@/lib/flashcards/verso";
import { passagesInline, type Passage } from "@/lib/richtext";
import { VERSO_CARTE } from "@/lib/voice-accueil-lobby-carte";
import c from "./CarteDuJour.module.css";

// Le texte d'une flashcard (formules $…$ et $$…$$, gras **…**, surligné ==…==)
// rendu AU SERVEUR pour « La carte du jour », puis passé à l'îlot en ReactNode.
// Même rendu que components/RichText.tsx (mêmes règles de découpe :
// lib/richtext.ts), mais sans le composant client : KaTeX reste côté serveur,
// ni son code ni ses règles ne pèsent sur l'hydratation de l'accueil. Que des
// <span> : le texte vit dans un <button> (la carte se retourne d'un clic), où
// ni <div> ni <p> n'ont leur place. La feuille de KaTeX est déjà globale
// (app/globals.css).

const BLOC = /^\$\$([\s\S]+)\$\$$/;
const IMAGE = /^!\[([^\]]*)\]\(([^)]+)\)$/;

function formule(tex: string, bloc: boolean): string {
  try {
    return katex.renderToString(tex.trim(), { throwOnError: false, displayMode: bloc });
  } catch {
    return tex;
  }
}

function Morceaux({ morceaux }: { morceaux: Passage["morceaux"] }) {
  return (
    <>
      {morceaux.map((m, k) =>
        m.t === "math" ? <span key={k} className="katex-formula" dangerouslySetInnerHTML={{ __html: formule(m.v, false) }} /> : <Fragment key={k}>{m.v}</Fragment>,
      )}
    </>
  );
}

/** Une ligne : les passages gras, les passages surlignés (qui se suivent sous un seul trait) et les formules. */
function Ligne({ texte }: { texte: string }) {
  const passages = passagesInline(texte);
  const rendre = (p: Passage, i: number) =>
    p.gras ? (
      <strong key={i}>
        <Morceaux morceaux={p.morceaux} />
      </strong>
    ) : (
      <Morceaux key={i} morceaux={p.morceaux} />
    );
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
      </mark>,
    );
  }
  return <>{out}</>;
}

/** Un texte de carte, ligne par ligne : formule en bloc, image, ligne vide (un blanc) ou texte courant. */
export function TexteCarte({ texte, className }: { texte: string; className?: string }) {
  const lignes = (texte ?? "").replace(/\r\n?/g, "\n").split("\n");
  return (
    <span className={className}>
      {lignes.map((ligne, i) => {
        const t = ligne.trim();
        const bloc = BLOC.exec(t);
        if (bloc) return <span key={i} className={`${c.formuleBloc} katex-formula`} dangerouslySetInnerHTML={{ __html: formule(bloc[1], true) }} />;
        const img = IMAGE.exec(t);
        if (img) {
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={img[2]} alt={img[1]} loading="lazy" className={c.image} />
          );
        }
        if (t === "") return <span key={i} className={c.blanc} aria-hidden />;
        return (
          <span key={i} className={c.ligne}>
            <Ligne texte={ligne} />
          </span>
        );
      })}
    </span>
  );
}

/**
 * Le verso : les trois cases quand la carte suit le format (À RETENIR en
 * grand, EN CLAIR, PIÈGE au stylo rouge : lib/flashcards/verso.ts), sinon le
 * texte tel quel (anciennes cartes, cartes des joueurs).
 */
export function VersoCarte({ back }: { back: string }) {
  const v = decouperVerso(back);
  if (!v) return <TexteCarte texte={back} className={c.versoTexte} />;
  const r = v.retenir;
  return (
    <span className={c.cases}>
      <span className={c.retenir}>
        {r.forme === "texte" && <TexteCarte texte={r.texte} className={c.retenirTexte} />}
        {r.forme === "formule" && (
          <>
            {r.titre && <TexteCarte texte={r.titre} className={c.retenirTexte} />}
            <TexteCarte texte={r.formule} className={c.retenirFormule} />
            {r.suite && <TexteCarte texte={r.suite} className={c.suite} />}
          </>
        )}
        {r.forme === "liste" && (
          <>
            {r.titre && <TexteCarte texte={r.titre} className={c.retenirTexte} />}
            <span className={c.liste} role="list">
              {r.items.map((it, i) => (
                <span key={i} className={c.item} role="listitem">
                  <TexteCarte texte={it} />
                </span>
              ))}
            </span>
          </>
        )}
      </span>
      <span className={c.clair}>
        <b className={c.etiq}>{VERSO_CARTE.enClair}</b>
        <TexteCarte texte={v.clair} />
      </span>
      {v.piege && (
        <span className={c.piege}>
          <b className={c.etiq}>{VERSO_CARTE.piege}</b>
          <TexteCarte texte={v.piege} />
        </span>
      )}
    </span>
  );
}
