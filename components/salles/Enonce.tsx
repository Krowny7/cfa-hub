import { isNumeric, parsePrompt } from "@/components/QuestionPrompt";
import p from "./Partie.module.css";

// Un énoncé (ou une explication) dans la console des Salles : des paragraphes
// et, quand le texte porte des lignes séparées par des tabulations (les
// pièces jointes des questions d'examen), de vrais tableaux — le découpage est
// celui de QuestionPrompt, la mise en forme celle de la console sombre.

export function Enonce({ texte, className }: { texte: string; className?: string }) {
  const blocs = parsePrompt(texte ?? "");
  return (
    <div className={className}>
      {blocs.map((b, i) =>
        b.kind === "text" ? (
          <p key={i}>{b.lines.join(" ")}</p>
        ) : (
          <div key={i} className={p.tableauCadre}>
            <table className={p.tableau}>
              <tbody>
                {b.rows.map((ligne, r) => (
                  <tr key={r}>
                    {ligne.map((c, k) => {
                      const Cellule = r === 0 && b.rows.length > 2 && ligne.length > 2 ? "th" : "td";
                      return (
                        <Cellule key={k} className={isNumeric(c) && k > 0 ? p.num : undefined}>
                          {c}
                        </Cellule>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ),
      )}
    </div>
  );
}
