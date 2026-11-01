import Link from "next/link";
import { Phrase } from "@/components/accueil/lobby/Encre";
import type { CarteRangLobby } from "@/components/accueil/lobby/types";
import { RankBadge } from "@/components/ui/RankBadge";
import { LOBBY } from "@/lib/voice-accueil-lobby";
import s from "./Lobby.module.css";

// Ton rang et ta phase de révision, dans une même carte : en haut l'insigne
// (88 px, avec le halo de maîtrise), le palier, trois chiffres (ELO, place,
// dernier duel) et la barre jusqu'à la division suivante (celle de la page Moi,
// components/moi/synthese/modele.ts) ; en bas, une bande plus claire avec la
// phase de révision (Découverte, Consolidation, Sprint final) aux seuils du
// Codex. Sans date d'examen, la bande invite à la fixer. Aucun liquide :
// aucun bouton ici. Composant serveur ; seul l'insigne est un îlot client.

const ID = "lobby-rang";

export function CarteRang({ r, className }: { r: CarteRangLobby; className?: string }) {
  const R = LOBBY.rang;
  const P = LOBBY.phase;
  const b = r.barre;
  return (
    <section className={[s.carte, s.rang, className].filter(Boolean).join(" ")} aria-labelledby={ID}>
      <div className={s.rangHaut}>
        <div className={s.rangTete}>
          <RankBadge tier={r.tier} division={r.division} mastery={r.maitrise} size={88} gray={r.placement} title={R.insigne(r.palier)} />
          <div className={s.rangTexte}>
            <p className={s.eyebrow}>{R.surTitre}</p>
            <h2 id={ID} className={"font-brand " + s.rangPalier}>
              {r.palier}
            </h2>
          </div>
        </div>
        <ul className={s.chiffres}>
          {r.chiffres.map((c) => (
            <li key={c.lib} className={s.lc}>
              <b>{c.val}</b>
              <span>{c.lib}</span>
            </li>
          ))}
        </ul>
        {b.genre === "barre" ? (
          <div className={s.rangBarre}>
            <span className={s.piste} role="img" aria-label={b.aria}>
              <i style={{ width: `${b.pct}%` }} />
            </span>
            <span className={s.rangLegende}>
              <span>{typeof b.gauche === "string" ? b.gauche : <Phrase segments={b.gauche} />}</span>
              {b.droite && <span className={s.mono}>{b.droite}</span>}
            </span>
          </div>
        ) : (
          <p className={s.rangSeul}>{b.texte}</p>
        )}
      </div>
      <div className={s.phase}>
        {r.phase ? (
          <>
            <p className={s.phaseTete}>
              <span className={s.eyebrow}>{P.surTitre}</span>
              <span className={s.ns}>{r.phase.sur}</span>
            </p>
            <p className={"font-brand " + s.phaseNom}>{r.phase.libelles[r.phase.index]}</p>
            <ol className={s.phases} aria-label={P.aria(r.phase.libelles[r.phase.index], r.phase.libelles)}>
              {r.phase.libelles.map((l, i) => (
                <li key={l} className={s.ph + (i < r.phase!.index ? " " + s.phFait : i === r.phase!.index ? " " + s.phOn : "")} aria-current={i === r.phase!.index ? "step" : undefined}>
                  <i />
                  <span>{l}</span>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <>
            <p className={s.eyebrow}>{P.surTitre}</p>
            <p className={s.st}>{P.sansDate}</p>
            <Link href={LOBBY.entete.fixerHref} className={s.lien}>
              {P.fixer}
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
