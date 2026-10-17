import type { LigneQuete as Ligne } from "@/lib/codex/vue";
import { CODEX } from "@/lib/voice-codex";
import { Sceau, libelleSceau } from "@/components/codex/Sceau";
import s from "./Aujourdhui.module.css";

// Une quête sur une ligne (Codex simplifié, §2) : toute la ligne ouvre son
// détail. À gauche, le sceau en 28 px (vide : à faire, entamé : en cours,
// plein : à récupérer, tamponné : faite) ; au centre, le titre (l'action),
// une barre fine unie et l'avancée avec son unité ; à droite, une seule
// chose : « +40 XP », « À récupérer » ou « Faite le 12 oct. ». Au moins
// 64 px de haut. Le mode sobre tait l'XP.

const jourCourt = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });

/** Ce que la ligne dit à droite. */
export function droiteLigne(l: Pick<Ligne, "etat" | "aRecuperer" | "termineeLe" | "xp">, sobre: boolean): string | null {
  if (l.aRecuperer) return "À récupérer";
  if (l.etat === "terminee") return l.termineeLe ? `Faite le ${jourCourt(l.termineeLe)}` : CODEX.etat.terminee;
  return !sobre && l.xp > 0 ? `+${l.xp} XP` : null;
}

export function LigneQuete({ l, sobre = false, onOuvrir }: { l: Ligne; sobre?: boolean; onOuvrir: (l: Ligne) => void }) {
  const enigme = l.affichage === "indice" && l.etat !== "terminee";
  const titre = enigme ? CODEX.exploits.enigme : l.titre;
  const avancee = !enigme && l.etat !== "terminee" && l.cible > 1 ? `${Math.floor(l.valeur).toLocaleString("fr-FR")} sur ${Math.floor(l.cible).toLocaleString("fr-FR")}` : null;
  const droite = droiteLigne(l, sobre);
  return (
    <button type="button" className={s.ligne} data-etat={l.aRecuperer ? "recuperer" : l.etat} onClick={() => onOuvrir(l)} aria-haspopup="dialog" aria-label={libelleSceau(l)}>
      <Sceau l={l} taille={28} />
      <span className={s.ligneMilieu}>
        <span className={s.ligneTitre}>{titre}</span>
        {avancee && (
          <>
            <span className={s.barre} aria-hidden>
              <i style={{ width: `${Math.round(l.fraction * 100)}%` }} />
            </span>
            <span className="t-small t-num">{avancee}</span>
          </>
        )}
      </span>
      {droite && <span className={l.aRecuperer ? s.ligneRecuperer : "t-micro"}>{droite}</span>}
    </button>
  );
}
