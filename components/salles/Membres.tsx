"use client";

import { useState } from "react";
import { Crown } from "lucide-react";
import { Avatar } from "@/components/classement/Avatar";
import { fmtInt } from "@/components/classement/format";
import { PresenceText } from "@/components/presence/Presence";
import { RankBadge } from "@/components/ui/RankBadge";
import { DEFAULT_ELO, rankFor } from "@/lib/ranks";
import type { SalleMembre } from "@/lib/salles/types";
import { SALLES } from "@/lib/voice-salles";
import s from "./Salles.module.css";

// La liste des joueurs du salon : avatar (le point vert dit « en ligne »),
// pseudo, l'admin marqué d'une couronne, insigne de rang et ELO. Les
// douze premiers s'affichent, « Voir les N autres » déplie le reste (une salle
// n'a pas de limite de joueurs ; la base en rend 200 au plus). L'admin passe
// en tête, toi tu es surligné. Les lignes entrent l'une après l'autre.

const VISIBLES = 12;
const nomDe = (m: SalleMembre) => m.username?.trim() || "Un joueur";

export function Membres({ membres, moiId, total }: { membres: SalleMembre[]; moiId: string; total: number }) {
  const [tout, setTout] = useState(false);
  const montres = tout ? membres : membres.slice(0, VISIBLES);
  const reste = membres.length - VISIBLES;
  return (
    <section className={s.panneau} aria-labelledby="salle-membres">
      <div className={s.panneauTete}>
        <h2 id="salle-membres" className={s.titrePanneau}>
          {SALLES.membresTitre}
        </h2>
        <span className={s.compte}>{total}</span>
      </div>
      <ul className={s.membres}>
        {montres.map((m, i) => {
          const moi = m.userId === moiId;
          const rk = rankFor(m.elo ?? DEFAULT_ELO);
          return (
            <li key={m.userId} className={[s.membre, moi ? s.membreMoi : ""].filter(Boolean).join(" ")} style={{ "--i": i } as React.CSSProperties}>
              <Avatar src={m.avatarUrl} name={nomDe(m)} size={40} userId={moi ? null : m.userId} />
              <div className={s.membreNom}>
                <span className={s.pseudo}>
                  <span title={nomDe(m)}>{nomDe(m)}</span>
                  {m.estAdmin && (
                    <span className={s.couronne}>
                      <Crown size={12} aria-hidden /> {SALLES.admin}
                    </span>
                  )}
                  {moi && <span className={s.toi}>{SALLES.vous}</span>}
                </span>
                <span className={s.presence}>
                  {moi ? SALLES.enLigne : <PresenceText userId={m.userId} court point={false} repli={SALLES.horsLigne} />}
                </span>
              </div>
              <div className={s.membreDroite}>
                {m.elo !== null && <span className={s.elo}>{fmtInt(m.elo)}</span>}
                <RankBadge tier={rk.tierIndex} size={32} glow={false} gray={m.elo === null} />
              </div>
            </li>
          );
        })}
      </ul>
      {reste > 0 && (
        <div style={{ padding: "0 20px 18px" }}>
          <button type="button" className={[s.btn, s.btnDiscret].join(" ")} aria-expanded={tout} onClick={() => setTout((v) => !v)}>
            {tout ? SALLES.membresReplier : SALLES.membresAutres(reste)}
          </button>
        </div>
      )}
    </section>
  );
}
