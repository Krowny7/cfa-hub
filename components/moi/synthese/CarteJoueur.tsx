import Link from "next/link";
import { Bookmark, Clock } from "lucide-react";
import { Avatar } from "@/components/classement/Avatar";
import { LigneCodex } from "@/components/moi/CodexMoi";
import { Phrase, SceauUni } from "@/components/moi/synthese/Encre";
import { barreRang, entier, ligneRang } from "@/components/moi/synthese/modele";
import type { JoueurSynthese } from "@/components/moi/synthese/types";
import { Illustration } from "@/components/ui/Illustration";
import { RankBadge } from "@/components/ui/RankBadge";
import { SYN } from "@/lib/voice-moi";
import s from "@/components/moi/synthese/Synthese.module.css";

// La carte du joueur (4 colonnes) : la peinture de ton cabinet avec ton visage
// et ton pseudo, ton rang (insigne, ELO, place, barre jusqu'à la division
// suivante), puis trois lignes : le temps passé sur le site, le Codex (avec ce
// qui attend « Récupérer ») et les marquées. Une ligne dont la source manque
// disparaît sans bruit (sauf les marquées, qui restent avec « — »). Aplats
// seulement : aucun liquide sur cette carte. Composant serveur, aucun hook.

const ID = "syn-joueur";

function Marquees({ j }: { j: JoueurSynthese }) {
  const m = j.marquees;
  const total = m ? (m.questions ?? 0) + (m.cartes ?? 0) : null;
  const sous = !m ? SYN.joueur.marquees.sansSource : total === 0 ? SYN.joueur.marquees.vide : SYN.joueur.marquees.sous(m.questions, m.cartes);
  return (
    <Link href="/moi?onglet=marquees" className={s.stat}>
      <SceauUni>
        <Bookmark size={15} aria-hidden />
      </SceauUni>
      <span className={s.statTexte}>
        <b>{SYN.joueur.marquees.titre}</b>
        <span>{sous}</span>
      </span>
      <b className={s.mono + " " + s.statValeur}>{total === null ? SYN.joueur.marquees.aucune : entier(total)}</b>
    </Link>
  );
}

export function CarteJoueur({ j, className }: { j: JoueurSynthese; className?: string }) {
  const r = j.rang;
  const barre = barreRang(r);
  return (
    <section className={[s.carte, s.joueur, className].filter(Boolean).join(" ")} aria-labelledby={ID}>
      <div className={s.peint}>
        <div className={s.peintFond} aria-hidden>
          <Illustration nom="moi-cabinet" position="62% 58%" decorative />
        </div>
        {j.jn && <span className={s.puce}>{j.jn}</span>}
        <span className={s.visage}>
          <Avatar src={j.avatar} name={j.nom} size={52} />
        </span>
        <div className={s.peintTexte}>
          <span className={s.eyebrow}>{SYN.joueur.cabinet}</span>
          <h2 id={ID} className="font-brand">
            {j.nom}
          </h2>
        </div>
      </div>
      <div className={s.joueurCorps}>
        <div className={s.rangTete}>
          <RankBadge tier={r.tier} division={r.division} mastery={r.maitrise} size={56} gray={r.placement} title={SYN.joueur.insigne(r.palier)} />
          <div className={s.rangTexte}>
            <p className="font-brand">{r.palier}</p>
            <p className={s.mono}>{ligneRang(r)}</p>
          </div>
        </div>
        {barre.genre === "barre" ? (
          <div className={s.rangBarre}>
            <span className={[s.piste, s.pisteViolet, s.pisteFine].join(" ")} role="img" aria-label={barre.aria}>
              <i style={{ width: `${barre.pct}%` }} />
            </span>
            <span className={s.rangLegende}>
              <span>{typeof barre.gauche === "string" ? barre.gauche : <Phrase segments={barre.gauche} />}</span>
              {barre.droite && <span className={s.mono}>{barre.droite}</span>}
            </span>
          </div>
        ) : (
          <p className={s.rangTexteSeul}>{barre.texte}</p>
        )}
        <ul className={s.stats}>
          {j.temps && (
            <li>
              <div className={s.stat}>
                <SceauUni>
                  <Clock size={15} aria-hidden />
                </SceauUni>
                <span className={s.statTexte}>
                  <b>{SYN.joueur.temps.titre}</b>
                  <span>{[SYN.joueur.temps.semaine(j.temps.semaine), j.temps.depuis ? SYN.joueur.temps.depuis(j.temps.depuis) : null].filter(Boolean).join(" · ")}</span>
                </span>
                <b className={s.mono + " " + s.statValeur}>{j.temps.total}</b>
              </div>
            </li>
          )}
          {j.codex && (
            <li>
              <LigneCodex c={j.codex} />
            </li>
          )}
          <li>
            <Marquees j={j} />
          </li>
        </ul>
        {j.codex && j.codex.aRecuperer > 0 && (
          <Link href="/codex" className={s.lien + " " + s.joueurLien}>
            {SYN.joueur.codex.recuperer(j.codex.aRecuperer)}
          </Link>
        )}
      </div>
    </section>
  );
}
