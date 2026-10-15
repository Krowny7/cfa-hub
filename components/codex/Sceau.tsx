import type { LigneQuete } from "@/lib/codex/vue";
import { CODEX } from "@/lib/voice-codex";
import s from "./Codex.module.css";

// Une quête, sous la forme d'un sceau à tamponner. Quatre états lisibles sans
// couleur seule : verrouillée (contour en pointillé, petit cadenas), disponible
// (anneau plein, centre vide), en cours (l'anneau se remplit d'encre selon la
// progression), terminée (le sceau est tamponné : disque vermillon, double
// anneau, coche au pinceau). Une énigme (exploit caché) porte un « ? ».
// Dessin léger : quelques cercles et deux tracés (pas d'encre recopiée, voir
// le piège d'hydratation des SVG lourds du dépôt). Sans état : serveur ou client.

const R = 20;
const C = 2 * Math.PI * R;

export function Sceau({ l, taille = 44, neuf = false }: { l: Pick<LigneQuete, "etat" | "fraction" | "affichage" | "retro">; taille?: number; neuf?: boolean }) {
  const enigme = l.affichage === "indice" && l.etat !== "terminee";
  const etat = l.etat;
  return (
    <svg viewBox="0 0 48 48" width={taille} height={taille} aria-hidden className={`${s.sceau} ${s["e_" + etat]} ${neuf ? s.neuf : ""}`} focusable="false">
      {etat === "terminee" ? (
        <>
          <circle cx="24" cy="24" r="22" className={s.tamponFond} />
          <circle cx="24" cy="24" r="22" className={s.tamponBord} />
          <circle cx="24" cy="24" r="17.5" className={s.tamponFin} />
          <path d="M14.6 25.2 L21.2 31.4 L34.2 16.8" className={s.coche} />
        </>
      ) : (
        <>
          <circle cx="24" cy="24" r={R} className={s.anneau} />
          {etat === "active" && <circle cx="24" cy="24" r={R} className={s.arc} strokeDasharray={`${Math.max(0.04, l.fraction) * C} ${C}`} transform="rotate(-90 24 24)" />}
          {etat === "verrouillee" && !enigme && (
            <g className={s.cadenas}>
              <rect x="17.5" y="22.5" width="13" height="9.5" rx="2.2" />
              <path d="M20.5 22.5 V19.6 a3.5 3.5 0 0 1 7 0 V22.5" fill="none" />
            </g>
          )}
          {enigme && <path d="M19.6 19.6 a4.6 4.6 0 1 1 6.6 4.2 c-1.6 .9 -2.2 1.6 -2.2 3.4 M24 31.6 v.3" className={s.enigme} />}
          {etat === "disponible" && !enigme && <circle cx="24" cy="24" r="3.4" className={s.point} />}
          {etat === "active" && <circle cx="24" cy="24" r="3.4" className={s.pointPen} />}
        </>
      )}
    </svg>
  );
}

/** Le libellé lu par un lecteur d'écran : « Titre, tamponnée » / « Titre, en cours, 3 sur 5 ». */
export function libelleSceau(l: Pick<LigneQuete, "titre" | "etat" | "valeur" | "cible" | "affichage">): string {
  const etat = l.affichage === "indice" && l.etat !== "terminee" ? CODEX.exploits.enigme : CODEX.etat[l.etat].toLowerCase();
  const t = l.affichage === "indice" && l.etat !== "terminee" ? "" : l.titre + ", ";
  return `${t}${etat}${l.etat === "active" ? `, ${Math.floor(l.valeur)} sur ${Math.floor(l.cible)}` : ""}`;
}
