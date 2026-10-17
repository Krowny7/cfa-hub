"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { dateLongue, texteRecap, type Recap } from "@/lib/codex/calendrier";
import k from "./Calendrier.module.css";
import e from "./Encre.module.css";

// Le lendemain (J+1 à J+7, V3 §7.5) : « Pose le pinceau. » et le récap de la
// préparation, depuis l'inscription au programme (sinon la première
// réponse) : questions, heures estimées, jours d'encre, matières remontées,
// ratures scellées, trophées, préparation finale. « Partager » passe par le
// partage de l'appareil, sinon copie le texte. Ce que la base ne sait pas
// encore (ratures scellées, trophées) ne s'affiche pas plutôt que 0.

const nombre = (n: number) => n.toLocaleString("fr-FR");

export function PoseLePinceau({ recap }: { recap: Recap }) {
  const [message, setMessage] = useState<string | null>(null);

  const partager = async () => {
    const texte = texteRecap(recap);
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: "Pose le pinceau.", text: texte });
        return;
      }
      await navigator.clipboard.writeText(texte);
      setMessage("Récap copié : il n'y a plus qu'à le coller.");
    } catch (err) {
      // partage annulé par le joueur : rien à dire
      if (err instanceof Error && err.name === "AbortError") return;
      setMessage("Le partage n'a pas marché sur cet appareil.");
    }
  };

  const chiffres: [string, string][] = [
    [nombre(recap.questions), recap.questions > 1 ? "questions" : "question"],
    ...(recap.heures > 0 ? [[`≈ ${nombre(recap.heures)} h`, "de travail, à 1,2 min la question"] as [string, string]] : []),
    [nombre(recap.joursEncre), recap.joursEncre > 1 ? "jours d'encre" : "jour d'encre"],
    [`${recap.preparation} %`, "de préparation finale"],
    ...(recap.raturesScellees !== null ? [[nombre(recap.raturesScellees), "ratures scellées"] as [string, string]] : []),
    ...(recap.trophees !== null ? [[nombre(recap.trophees), recap.trophees > 1 ? "trophées gagnés" : "trophée gagné"] as [string, string]] : []),
  ];

  return (
    <section className={`card ${e.carnet} ${k.carte}`} aria-labelledby="pose-le-pinceau">
      <p className={`t-micro ${k.sur}`}>{recap.depuis ? `Depuis le ${dateLongue(recap.depuis)}` : "Ta préparation"}</p>
      <h2 id="pose-le-pinceau" className={`font-brand ${k.titre}`}>
        Pose le pinceau.
      </h2>
      <p className="t-small m-0">Le travail est fait. Voici le chemin parcouru.</p>
      <dl className={k.chiffres}>
        {chiffres.map(([valeur, quoi]) => (
          <div key={quoi} className={k.chiffre}>
            <dt>{quoi}</dt>
            <dd className="t-num font-brand">{valeur}</dd>
          </div>
        ))}
      </dl>
      {recap.matieres.length > 0 && (
        <div>
          <p className={`t-micro ${k.sur}`}>Ce qui a le plus monté</p>
          <ul className={k.montees}>
            {recap.matieres.map((m) => (
              <li key={m.cle} className="t-small">
                <strong>{m.court}</strong> <span className="t-num">{m.debut} % → {m.pct} %</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className={k.actions}>
        <button type="button" className="btn rl-press" onClick={partager}>
          <Share2 size={16} aria-hidden /> Partager
        </button>
        {message && (
          <p role="status" className="t-small m-0">
            {message}
          </p>
        )}
      </div>
    </section>
  );
}
