import type { EtiquetteRadar, GeoRadar } from "@/components/moi/synthese/modele";
import s from "@/components/moi/synthese/Synthese.module.css";

// Le radar de « Tes matières » : dix sommets (une matière chacun), l'anneau du
// seuil à 70 %, les zones sous 50 et de 50 à 70, le polygone « toi » et, quand
// l'historique répond, celui de « toi il y a N jours » en améthyste pointillé.
// Deux dessins (grand pour l'ordinateur, petit pour le téléphone) et une seule
// série d'étiquettes : de vrais <button> posés en % du dessin, que le CSS place
// selon la largeur du cadre (requête de conteneur « radar »). Rendu neutre,
// aucun hook : la géométrie et les textes viennent de modele.ts.

const COTE = { d: s.coteD, g: s.coteG, h: s.coteH, b: s.coteB } as const;
const TON = { pos: s.pos, neg: s.neg, nul: s.nul } as const;

function Dessin({ g, className, aria }: { g: GeoRadar; className: string; aria: string }) {
  const p = g.profil;
  return (
    <svg className={className} viewBox={`0 0 ${p.larg} ${p.haut}`} role="img" aria-label={aria}>
      <polygon points={g.z100} className={s.rz100} />
      <polygon points={g.z70} className={s.rz70} />
      <polygon points={g.z50} className={s.rz50} />
      <polygon points={g.z25} className={s.rz25} />
      <path d={g.axes} className={s.raxes} />
      <polygon points={g.z70} className={s.rseuil} strokeWidth={p.traitSeuil} strokeDasharray={p.seuilTirets} />
      {g.halo && <line x1={g.halo.x1} y1={g.halo.y1} x2={g.halo.x2} y2={g.halo.y2} className={s.rhalo} strokeWidth={p.halo} strokeLinecap="round" />}
      {g.comp && <polygon points={g.comp} className={s.rcmp} strokeWidth={p.traitCmp} strokeDasharray={p.cmpTirets} strokeLinejoin="round" />}
      {g.compPts && <path d={g.compPts} className={s.rcmpPts} />}
      <polygon points={g.toi} className={s.rtoi} strokeWidth={p.trait} strokeLinejoin="round" />
      <path d={g.ptsV} className={s.rV} strokeWidth={p.bordPt} />
      <path d={g.ptsE} className={s.rE} strokeWidth={p.bordPt} />
      <path d={g.ptsA} className={s.rA} strokeWidth={p.bordPt} />
      <path d={g.ptsR} className={s.rR} strokeWidth={p.bordPt} />
      {g.sel && <circle cx={g.sel.x} cy={g.sel.y} r={p.rSel} className={s.rsel} strokeWidth={p.traitSel} />}
      {g.reperes.map((r) => (
        <text key={r.texte} x={r.x} y={r.y} textAnchor="middle" className={r.seuil ? s.rtxt + " " + s.rtxtSeuil : s.rtxt}>
          {r.texte}
        </text>
      ))}
    </svg>
  );
}

export function Radar({ grand, petit, etiquettes, aria, onChoisir }: { grand: GeoRadar; petit: GeoRadar; etiquettes: EtiquetteRadar[]; aria: string; onChoisir: (i: number) => void }) {
  return (
    <div className={s.radarCadre}>
      <div className={s.radarBoite}>
        <Dessin g={grand} className={s.radarGrand} aria={aria} />
        <Dessin g={petit} className={s.radarPetit} aria={aria} />
        {etiquettes.map((e) => (
          <button
            key={e.i}
            type="button"
            className={[s.rlab, COTE[e.cote], e.sous ? s.rlabSous : null, e.on ? s.rlabOn : null].filter(Boolean).join(" ")}
            style={{ "--xg": e.xG, "--yg": e.yG, "--xp": e.xP, "--yp": e.yP } as React.CSSProperties}
            aria-pressed={e.on}
            aria-label={e.aria}
            title={e.info ?? undefined}
            onClick={() => onChoisir(e.i)}
          >
            <b aria-hidden>
              <span className={s.nomCourt}>{e.court}</span>
              <span className={s.nomMini}>{e.mini}</span>
            </b>
            <span className={s.rlabLigne} aria-hidden>
              <span className={s.mono}>{e.valeur}</span>
              {e.ecart && <> <span className={TON[e.ecart.ton]}>{e.ecart.texte}</span></>}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
