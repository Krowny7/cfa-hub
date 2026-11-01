"use client";

import { useState } from "react";
import Link from "next/link";
import { Selecteur } from "@/components/accueil/lobby/Encre";
import type { ClassementLobby, JourClassement } from "@/components/accueil/lobby/types";
import { LOBBY } from "@/lib/voice-accueil-lobby";
import s from "./Lobby.module.css";

// Le classement des 30, accolé au héros : le top 5 du jour (rang, pseudo,
// score, et le temps des trois premiers), ta ligne à part, le pied de carte et
// le lien vers le classement entier. Le sélecteur Aujourd'hui | Hier ne porte
// l'encre vive que sur son option active ; sans classement d'hier (pas de
// défi), pas de sélecteur. Îlot client : il ne reçoit que des données déjà
// formatées par le serveur (aucune date ni aucun nombre à formater ici).

type Cle = JourClassement["cle"];

export function ClassementTrente({ c }: { c: ClassementLobby }) {
  const [cle, setCle] = useState<Cle>("auj");
  const j = cle === "hier" && c.hier ? c.hier : c.aujourdhui;
  const C = LOBBY.classement;
  return (
    <div className={s.classement}>
      <div className={s.classementTete}>
        <p className={s.eyebrow}>
          {j.direct && <span className={s.live} aria-hidden />}
          <span>{j.etat}</span>
        </p>
        <h3 className={"font-brand " + s.classementTitre}>{c.titre}</h3>
      </div>
      <div className={s.classementBarre}>
        {c.hier ? (
          <Selecteur
            label={C.quelJour}
            valeur={cle}
            onChoisir={setCle}
            options={[
              { cle: "auj", libelle: C.aujourdhui },
              { cle: "hier", libelle: C.hier },
            ]}
          />
        ) : (
          <span />
        )}
        <span className={s.mono + " " + s.classementJoueurs}>{j.joueurs}</span>
      </div>
      <ol className={s.lignes} aria-live="polite" aria-label={C.aria(j.cle)}>
        {j.lignes.map((r, i) => (
          <li key={r.rang + r.nom} className={s.rg + (i < 3 ? " " + s.rgPod : "")}>
            <span className={r.rang <= 3 ? s.med + (r.rang === 1 ? " " + s.medOr : "") : s.num}>{r.rang}</span>
            <span className={s.nm}>
              <b>{r.nom}</b>
              <span>{r.temps}</span>
            </span>
            <b className={s.mono + " " + s.sc}>{r.score}</b>
          </li>
        ))}
      </ol>
      {j.lignes.length === 0 && <p className={s.vide}>{j.cle === "auj" ? C.videAujourdhui : C.videHier}</p>}
      <div className={s.toi}>
        <span className={s.av + " " + s.avN + " " + s.avP} aria-hidden>
          {c.initiales}
        </span>
        <span className={s.nm}>
          <b>{j.toi.titre}</b>
          <span>{j.toi.sous}</span>
        </span>
        {j.toi.rendu ? <b className={s.mono + " " + s.sc}>{j.toi.val}</b> : <span className={s.etat}>{j.toi.val}</span>}
      </div>
      <p className={s.classementPied}>
        <span>{j.pied}</span>
        <Link href={j.href} className={s.lien}>
          {C.toutLeClassement}
        </Link>
      </p>
    </div>
  );
}
