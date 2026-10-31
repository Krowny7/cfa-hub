import Link from "next/link";
import { Icone } from "@/components/adn/icons";
import { SceauUni } from "@/components/moi/synthese/Encre";
import type { CodexSynthese } from "@/components/moi/synthese/types";
import { SYN } from "@/lib/voice-moi";
import { nombre } from "@/lib/voice";
import s from "@/components/moi/synthese/Synthese.module.css";

// Le Codex dans Moi (Codex simplifié, ajustement C) : le Codex a quitté la
// barre des espaces, on y entre par la ligne « Codex » de la carte du joueur
// (page Moi « La synthèse »). Elle dit où en est le joueur (les quêtes faites,
// l'XP gagnée, ce qui attend « Récupérer ») et mène au Codex. Pas de bouton
// « Récupérer » ici : il vit dans le Codex et dans le panneau du sceau ; pas
// d'historique non plus (il vit dans le Codex). Composant de présentation :
// tout vient de lib/profil/codex-moi.ts, par la synthèse.

/**
 * La ligne « Codex » de la carte du joueur de la page Moi « La synthèse » :
 * les quêtes faites, l'XP gagnée dans le Codex et, s'il y en a, ce qui attend
 * « Récupérer ». Elle mène au Codex et porte la cible de Léonard
 * (data-leonard="moi-codex") : sans Codex lisible, on ne la pose pas (la
 * visite saute alors l'étape facultative). À poser dans un <li>.
 */
export function LigneCodex({ c }: { c: CodexSynthese }) {
  return (
    <Link href="/codex" data-leonard="moi-codex" className={s.stat}>
      <SceauUni>
        <Icone nom="codex" size={15} />
      </SceauUni>
      <span className={s.statTexte}>
        <b>{SYN.joueur.codex.titre}</b>
        <span>
          {c.faites > 0 ? SYN.joueur.codex.sous(c.xp) : SYN.joueur.codex.vide}
          {c.aRecuperer > 0 && <span className={s.etiquette}>{SYN.joueur.codex.aRecuperer(c.aRecuperer)}</span>}
        </span>
      </span>
      {/* le chiffre nu : la ligne dit déjà « quêtes faites », il est caché aux lecteurs d'écran */}
      <b className={s.mono + " " + s.statValeur} aria-hidden>
        {nombre(c.faites)}
      </b>
    </Link>
  );
}
