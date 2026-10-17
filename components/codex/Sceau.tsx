import type { LigneQuete } from "@/lib/codex/vue";
import { CODEX } from "@/lib/voice-codex";
import { libelleEtat } from "@/lib/codex/tout";
import { INK } from "@/components/ui/InkDefs";
import s from "./Encre.module.css";

// Une quête, sous la forme d'un sceau hexagonal tamponné, le même que ceux du
// profil (tracé partagé INK.sealHex, <use href> : jamais d'encre recopiée,
// voir le piège d'hydratation des SVG lourds). Quatre états lisibles sans
// couleur seule :
//   à conquérir (verrouillée)  contour au crayon, en pointillé pâle
//   disponible                 contour d'encre et filet, un point au centre
//   en cours                   contour ocre, l'encre d'or monte selon la progression
//   terminée                   tamponné : hexagone vermillon, filet et coche en réserve
// Une énigme (exploit caché) porte un « ? » ; `signe` pose un « ! » (la quête
// à prendre). Sans état : serveur ou client.

export function Sceau({
  l,
  taille = 44,
  neuf = false,
  signe,
}: {
  l: Pick<LigneQuete, "etat" | "fraction" | "affichage" | "retro">;
  taille?: number;
  neuf?: boolean;
  /** « ! », « ? », ou un chiffre romain (les actes) */
  signe?: string;
}) {
  const enigme = l.affichage === "indice" && l.etat !== "terminee";
  const etat = l.etat;
  const marque = signe ?? (enigme ? "?" : null);
  // le niveau d'encre (en cours), en % de la hauteur de l'hexagone rogné par le haut
  const niveau = Math.round(100 - 100 * Math.max(0.08, Math.min(1, l.fraction)));
  // un chiffre romain se resserre pour tenir dans l'hexagone
  const corps = marque && marque.length > 1 ? { fontSize: Math.min(40, 92 / marque.length) } : undefined;
  const yTexte = corps ? 60 + corps.fontSize * 0.36 : 77;
  return (
    <svg viewBox="0 0 120 120" width={taille} height={taille} aria-hidden focusable="false" className={`${s.sceau} ${s["e_" + etat]} ${neuf ? s.neuf : ""}`}>
      {etat === "terminee" ? (
        <g className={s.tampon}>
          <use href={INK.sealHex} className={s.tamponFond} />
          <use href={INK.sealHexIn} className={s.reserveFilet} />
          {signe ? (
            <text x="60" y={yTexte} textAnchor="middle" className={s.reserveTexte} style={corps}>
              {signe}
            </text>
          ) : (
            <path d="M40 62 L54 75 L82 45" className={s.reserveCoche} />
          )}
        </g>
      ) : etat === "verrouillee" ? (
        <>
          <use href={INK.sealHex} className={s.crayon} />
          {marque ? (
            <text x="60" y={corps ? yTexte : 76} textAnchor="middle" className={s.signeCrayon} style={corps}>
              {marque}
            </text>
          ) : (
            <g className={s.cadenas}>
              <rect x="49" y="58" width="22" height="17" rx="3.5" />
              <path d="M54 58 V52.5 a6 6 0 0 1 12 0 V58" />
            </g>
          )}
        </>
      ) : (
        <>
          {etat === "active" && (
            <>
              <use href={INK.sealHex} className={s.fond} />
              {/* l'encre d'or : l'hexagone rogné par le haut (CSS, sans identifiant : rien à désaccorder à l'hydratation) */}
              <use href={INK.sealHex} className={s.orEncre} style={{ clipPath: `inset(${niveau}% 0 0 0)` }} />
            </>
          )}
          <use href={INK.sealHex} className={etat === "active" ? s.contourOr : s.contour} />
          <use href={INK.sealHexIn} className={etat === "active" ? s.filetOr : s.filet} />
          {marque ? (
            <text x="60" y={yTexte} textAnchor="middle" className={etat === "active" ? s.signeOr : s.signe} style={corps}>
              {marque}
            </text>
          ) : etat === "disponible" ? (
            <circle cx="60" cy="60" r="7" className={s.point} />
          ) : null}
        </>
      )}
    </svg>
  );
}

/** Le libellé lu par un lecteur d'écran, dans les quatre états : « Titre, faite le 12 oct. » / « Titre, en cours, 3 sur 5 ». */
export function libelleSceau(l: Pick<LigneQuete, "titre" | "etat" | "valeur" | "cible" | "affichage"> & Partial<Pick<LigneQuete, "aRecuperer" | "termineeLe">>): string {
  const etat = l.affichage === "indice" && l.etat !== "terminee" ? CODEX.exploits.enigme : libelleEtat({ etat: l.etat, aRecuperer: l.aRecuperer, termineeLe: l.termineeLe ?? null }).toLowerCase();
  const t = l.affichage === "indice" && l.etat !== "terminee" ? "" : l.titre + ", ";
  return `${t}${etat}${l.etat === "active" ? `, ${Math.floor(l.valeur)} sur ${Math.floor(l.cible)}` : ""}`;
}
