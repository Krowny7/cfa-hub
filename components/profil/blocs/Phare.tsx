import { Gauge } from "lucide-react";
import { SUBJECTS } from "@/components/reviser/catalog";
import { matierePhare } from "@/lib/profil/blocs-donnees";
import { pct } from "@/lib/voice";
import { BLOCS_NEUVES as V } from "@/lib/voice-blocs-neuves";
import { Cellule, Coque, DemiBande, Vide, type Ctx } from "./commun";
import { Tete, vars } from "./neuves";
import n from "./neuves.module.css";

// Le bloc « Matière phare » (phare) : « La jauge ». Une jauge en demi-cercle
// dont l'aiguille monte jusqu'à la maîtrise de sa matière la plus sûre (la
// règle de la pièce « matière » des chiffres clés : un pourcentage et 10
// réponses au moins), « FSA · 82 % » et le nom complet de la matière. Public.
// Le même dessin chez soi et chez un autre. Mini-tuile, colonne, héros et
// demi-bande (pas de bande : une jauge n'a pas besoin de toute la largeur).
// Sans matière mesurée : rien en vue publique, l'état vide dans Personnaliser.
// Sans état.

const ICONE = <Gauge size={17} aria-hidden />;

/** Les graduations de la jauge : 25, 50 et 75 %, en dehors de l'arc (rayon 89 à 95) ; 0 et 100 sont écrits sous ses bouts. */
const GRADUATIONS = [25, 50, 75].map((p) => {
  const a = Math.PI * (1 - p / 100);
  const c = (r: number) => `${(100 + r * Math.cos(a)).toFixed(1)}`;
  const s = (r: number) => `${(100 - r * Math.sin(a)).toFixed(1)}`;
  return { p, x1: c(89), y1: s(89), x2: c(95), y2: s(95) };
});

/** La jauge : la piste, l'arc jusqu'à `p` (0–100), l'aiguille qui monte, le pivot. */
function Jauge({ p, dit, mini = false }: { p: number; dit: string; mini?: boolean }) {
  return (
    <span className={n.jauge + (mini ? " " + n.jMini : "")} role="img" aria-label={dit}>
      <svg viewBox="0 0 200 116" aria-hidden focusable="false">
        {GRADUATIONS.map((g) => (
          <line key={g.p} className={n.jGrad} x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} />
        ))}
        <path className={n.jPiste} d="M20 100a80 80 0 0 1 160 0" pathLength={100} />
        {p > 0 && <path className={n.jValeur} d="M20 100a80 80 0 0 1 160 0" pathLength={100} style={vars({ "--p": p })} />}
        <g className={n.jAiguille} style={vars({ "--a": `${(p * 1.8 - 90).toFixed(1)}deg` })}>
          <line x1="100" y1="100" x2="100" y2="34" />
        </g>
        <circle className={n.jPivot} cx="100" cy="100" r="6.5" />
        <text className={n.jBorne} x="20" y="115" textAnchor="middle">
          0
        </text>
        <text className={n.jBorne} x="180" y="115" textAnchor="middle">
          100
        </text>
      </svg>
    </span>
  );
}

export function PhareBloc({ d, f, edition }: Ctx): React.ReactNode {
  const phare = matierePhare(d.stats.matieres);
  if (!phare) return edition ? <Vide bloc={{ k: "phare", f }} f={f} icone={ICONE} /> : null;
  const matiere = SUBJECTS.find((s) => s.key === phare.key);
  const code = matiere?.code ?? phare.key;
  const nom = matiere?.name ?? phare.key;
  const dit = V.jaugeDit(nom, phare.pct);

  if (f === "demi")
    return (
      <DemiBande label={V.phare} dessin={<Jauge p={phare.pct} dit={dit} mini />}>
        <Cellule etiquette={V.phare} chiffre={code} petit={nom} />
        <Cellule etiquette={V.maitrise} chiffre={pct(phare.pct)} />
      </DemiBande>
    );

  return (
    <Coque f={f} label={V.phare} className={n.coque + " " + n.phare + " " + n[f]}>
      <Tete titre={V.phare} />
      <div className={n.pBody}>
        <Jauge p={phare.pct} dit={dit} />
        <p className={n.pTexte}>
          <b className={"t-num tabular-nums " + n.pNom}>
            {code} · {pct(phare.pct)}
          </b>
          <span className={n.petit}>{nom}</span>
        </p>
      </div>
    </Coque>
  );
}
