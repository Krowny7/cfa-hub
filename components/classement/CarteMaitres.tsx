import { Crown } from "lucide-react";
import { RankBadge } from "@/components/ui/RankBadge";
import { Avatar } from "@/components/classement/Avatar";
import { Sceau } from "@/components/classement/Encre";
import { ordinal } from "@/components/classement/format";
import type { MaitreMatiere } from "@/components/classement/types";
import { NBSP } from "@/lib/voice";
import { PLACEMENT_GAMES, rankFor } from "@/lib/ranks";
import { MAITRES, SEUIL_MAITRE } from "@/lib/voice-classement";
import s from "./Affronter.module.css";

const pct = (n: number) => `${n}${NBSP}%`;

/** Une matière : son nom, ta place, son maître (sceau, nom, insigne, %) et la piste avec ton repère. */
function Ligne({ m }: { m: MaitreMatiere }) {
  const { maitre } = m;
  const toi = m.moiPlace !== null && m.moiPct !== null ? MAITRES.toi(ordinal(m.moiPlace), pct(m.moiPct)) : MAITRES.toiSansPlace;
  const rk = maitre ? rankFor(maitre.elo, maitre.mastery, maitre.rank) : null;
  const placement = maitre ? maitre.gamesPlayed < PLACEMENT_GAMES : false;
  const rangNom = rk ? (placement ? "Placement" : `${rk.tier.name}${rk.division ? " " + rk.division : ""}`) : "";
  return (
    <li className={s.maitre + (m.cestToi ? " " + s.cestToi : "")} aria-current={m.cestToi ? "true" : undefined}>
      <span className={s.maitreHaut}>
        <b>{m.court}</b>
        {m.cestToi ? (
          <span className={s.pastilleToi}>{MAITRES.cestToi}</span>
        ) : (
          <span className={s.maitreToi} title={m.moiPlace === null ? MAITRES.pasClasse(SEUIL_MAITRE, m.moiReponses) : undefined}>
            {toi}
          </span>
        )}
      </span>
      {maitre && rk ? (
        <>
          <span className={s.maitreBas}>
            <Avatar src={maitre.avatarUrl} name={maitre.name} size={28} />
            <span className={s.maitreNom}>{maitre.name}</span>
            <RankBadge tier={rk.tierIndex} size={22} glow={false} gray={placement} title={rangNom} />
            <span className={s.maitrePct}>{pct(maitre.pct)}</span>
          </span>
          <span className={s.pisteMaitre} role="img" aria-label={MAITRES.piste(pct(maitre.pct), m.moiPct !== null ? pct(m.moiPct) : null)}>
            <i style={{ width: `${Math.max(2, Math.min(100, maitre.pct))}%` }} />
            {!m.cestToi && m.moiPct !== null && <span className={s.repere} style={{ left: `${Math.max(0, Math.min(100, m.moiPct))}%` }} />}
          </span>
        </>
      ) : (
        <span className={s.maitreVide}>{MAITRES.pasDeMaitre}</span>
      )}
    </li>
  );
}

/**
 * « Les maîtres de chaque matière » : les 10 matières du programme, deux
 * colonnes de cinq sur ordinateur, une colonne sur téléphone. Pour chacune, le
 * meilleur joueur en maîtrise (son sceau, son nom, son insigne, son pourcentage),
 * ta place et ton pourcentage (« toi 3e · 68 % »), et une piste dont le repère
 * noir est toi. Quand le maître, c'est toi : « C'est toi », sur l'ocre. La
 * règle (maîtrise, seuil de 20 réponses) est dans components/classement/maitres.ts.
 * Présentation : les données arrivent en props.
 */
export function CarteMaitres({ maitres, seul = false }: { maitres: MaitreMatiere[]; /** la seule carte de la rangée : elle prend toute la largeur */ seul?: boolean }) {
  return (
    <section className={[s.carte, s.papier, s.maitres, seul ? s.seule : ""].filter(Boolean).join(" ")} aria-labelledby="cl-maitres">
      <header className={s.carteTete}>
        <h2 id="cl-maitres" className={"font-brand " + s.titreMoyen}>
          <Sceau>
            <Crown size={18} />
          </Sceau>
          {MAITRES.titre}
        </h2>
        <p className={s.sousCarte}>{MAITRES.sous(SEUIL_MAITRE)}</p>
      </header>
      <ul className={s.maitresListe} aria-label={MAITRES.liste}>
        {maitres.map((m) => (
          <Ligne key={m.cle} m={m} />
        ))}
      </ul>
    </section>
  );
}
