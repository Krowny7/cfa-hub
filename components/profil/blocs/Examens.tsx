import { ClipboardCheck } from "lucide-react";
import type { ExtraitExamens } from "@/lib/profil/blocs-donnees";
import { SEUIL, nombre, pct } from "@/lib/voice";
import { BLOCS_NEUVES as V } from "@/lib/voice-blocs-neuves";
import { Cellule, Coque, DemiBande, Vide, type Ctx } from "./commun";
import { Mention, Tete, mentionDemi, vars } from "./neuves";
import n from "./neuves.module.css";

// Le bloc « Examens blancs » (examens) : « Barres d'examens ». Un bâton par
// examen blanc rendu (du plus ancien au plus récent, 10 au plus), sa note
// au-dessus, vert à partir de 70 % (le repère de réussite du site), rouge
// sous 60 %, à l'encre entre les deux ; une ligne pointillée à 70 % ; en
// repère, « meilleur 74 % ». Héros et bande : en plus le meilleur, la
// moyenne et le dernier. Suit la visibilité du Journal (des scores en
// disent long) : fermé, rien en vue publique, la mention dans Personnaliser.
// Le même dessin chez soi et chez un autre. Sans état.

const ICONE = <ClipboardCheck size={17} aria-hidden />;

/** Le sens d'une note : ok (au seuil de réussite ou au-dessus), ko (sous 60 %), moyen entre les deux. */
export const sensExamen = (p: number): "ok" | "moyen" | "ko" => (p >= SEUIL ? "ok" : p < SEUIL - 10 ? "ko" : "moyen");

/** Les bâtons : une colonne par examen, la ligne du seuil par-dessus. `valeurs` : leurs notes sous les bâtons. */
function Barres({ x, valeurs = true }: { x: ExtraitExamens; valeurs?: boolean }) {
  return (
    <div className={n.eBarres + (valeurs ? "" : " " + n.eMini)} role="img" aria-label={V.barresDit(x.scores.map((s) => s.pct))}>
      {x.scores.map((s, i) => (
        <div key={i} className={n.eCol} title={V.barreDit(x.n - x.scores.length + i + 1, s.titre, s.pct)} style={vars({ "--h": s.pct + "%", "--i": i })}>
          {valeurs && <span className={n.eVal}>{s.pct}</span>}
          <i className={n.eBar} data-s={sensExamen(s.pct)} />
        </div>
      ))}
      <span className={n.eSeuil} style={vars({ "--seuil": SEUIL + "%" })} aria-hidden />
    </div>
  );
}

/** Une mesure : l'étiquette, la note en mono. */
function Mesure({ etiquette, p }: { etiquette: string; p: number }) {
  return (
    <p className={n.eMesure}>
      <span className={n.petit}>{etiquette}</span>
      <b className={n.mono}>{pct(p)}</b>
    </p>
  );
}

export function ExamensBloc({ d, f, edition }: Ctx): React.ReactNode {
  const x = d.examens && d.examens.scores.length ? d.examens : null;
  if (!x) return edition ? <Vide bloc={{ k: "examens", f }} f={f} icone={ICONE} /> : null;
  const notes = x.scores.map((s) => s.pct);
  const meilleur = Math.max(...notes);
  const dernier = notes[notes.length - 1];
  const moyenne = Math.round(notes.reduce((t, v) => t + v, 0) / notes.length);

  if (f === "demi")
    return (
      <DemiBande label={V.examens} dessin={<Barres x={x} valeurs={false} />} droite={mentionDemi(d, edition)}>
        <Cellule etiquette={V.examens} chiffre={nombre(x.n)} petit={V.meilleur(meilleur)} />
        <Cellule etiquette={V.dernier} chiffre={pct(dernier)} />
      </DemiBande>
    );

  const large = f === "heros" || f === "bande";
  return (
    <Coque f={f} label={V.examens} className={n.coque + " " + n.examens + " " + n[f]}>
      <Tete titre={V.examensN(x.n)} repere={large ? undefined : <>meilleur <b>{pct(meilleur)}</b></>} />
      <div className={n.eZone}>
        <div className={n.eCorps}>
          <Barres x={x} />
          {large && (
            <div className={n.eStats}>
              <Mesure etiquette={V.meilleurMot} p={meilleur} />
              <Mesure etiquette={V.moyenne} p={moyenne} />
              <Mesure etiquette={V.dernier} p={dernier} />
            </div>
          )}
        </div>
        <p className={n.petit}>{V.seuilLegende(SEUIL)}</p>
      </div>
      <Mention d={d} edition={edition} />
    </Coque>
  );
}
