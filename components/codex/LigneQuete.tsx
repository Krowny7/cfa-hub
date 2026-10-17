import type { ReactNode } from "react";
import type { LigneQuete as Ligne } from "@/lib/codex/vue";
import { CODEX } from "@/lib/voice-codex";
import { libelleEtat } from "@/lib/codex/tout";
import { Sceau, libelleSceau } from "@/components/codex/Sceau";
import s from "./Aujourdhui.module.css";

// Une quête sur une ligne (Codex simplifié, §2), la même partout : toute la
// ligne ouvre son détail. À gauche, le sceau en 28 px (vide : à faire,
// entamé : en cours, plein : à récupérer, tamponné : faite) ; au centre, le
// titre (l'action), une barre fine unie et l'avancée avec son unité ; à
// droite, une seule chose : « +40 XP », « À récupérer » (ou le bouton
// « Récupérer », `action`) ou « Faite le 12 oct. ». Au moins 64 px de haut.
// `sous` : un mot de plus sur la ligne de l'avancée (« étape 2 sur 5 ») ;
// `texte` : une ligne lisible à la place de l'avancée, sans barre (l'énigme
// d'un exploit) ; `choisie` : la quête montrée dans le détail, à côté (sur
// ordinateur, où la ligne n'ouvre pas de feuille : `feuille` faux). Le mode
// sobre tait l'XP.

/** Ce que la ligne dit à droite. */
export function droiteLigne(l: Pick<Ligne, "etat" | "aRecuperer" | "termineeLe" | "xp">, sobre: boolean): string | null {
  if (l.aRecuperer || l.etat === "terminee") return libelleEtat(l);
  return !sobre && l.xp > 0 ? `+${l.xp} XP` : null;
}

export function LigneQuete({
  l,
  sobre = false,
  onOuvrir,
  sous,
  texte,
  action,
  choisie = false,
  feuille = true,
}: {
  l: Ligne;
  sobre?: boolean;
  onOuvrir: (l: Ligne) => void;
  sous?: string | null;
  texte?: string | null;
  /** à la place du mot de droite : le bouton « Récupérer » */
  action?: ReactNode;
  choisie?: boolean;
  /** faux : la ligne montre son détail à côté, sans ouvrir de feuille */
  feuille?: boolean;
}) {
  const enigme = l.affichage === "indice" && l.etat !== "terminee";
  // une énigme lisible (`texte`) garde le nom de l'exploit ; sans elle, « Une énigme »
  const titre = enigme && !texte ? CODEX.exploits.enigme : l.titre;
  const mesure = !texte && !enigme && l.etat !== "terminee" && l.cible > 1;
  const avancee = mesure ? `${Math.floor(l.valeur).toLocaleString("fr-FR")} sur ${Math.floor(l.cible).toLocaleString("fr-FR")}` : null;
  const droite = droiteLigne(l, sobre);
  const bouton = (
    <button
      type="button"
      className={s.ligne}
      data-etat={l.aRecuperer ? "recuperer" : l.etat}
      data-choisie={choisie || undefined}
      aria-current={choisie || undefined}
      onClick={() => onOuvrir(l)}
      aria-haspopup={feuille ? "dialog" : undefined}
      aria-label={libelleSceau(l)}
    >
      <Sceau l={l} taille={28} />
      <span className={s.ligneMilieu}>
        <span className={s.ligneTitre}>{titre}</span>
        {mesure && (
          <span className={s.barre} aria-hidden>
            <i style={{ width: `${Math.round(l.fraction * 100)}%` }} />
          </span>
        )}
        {texte ? (
          <span className="t-small">{texte}</span>
        ) : (
          (avancee || sous) && (
            // l'avancée en chiffres (t-num), le mot de plus en texte
            <span className="t-small">
              {avancee && <span className="t-num">{avancee}</span>}
              {avancee && sous ? " · " : ""}
              {sous}
            </span>
          )
        )}
      </span>
      {!action && droite && <span className={l.aRecuperer ? s.ligneRecuperer : "t-micro"}>{droite}</span>}
    </button>
  );
  if (!action) return bouton;
  return (
    <div className={s.ligneAvecAction}>
      {bouton}
      <span className={s.ligneAction}>{action}</span>
    </div>
  );
}
