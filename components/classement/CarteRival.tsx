import Link from "next/link";
import { Swords } from "lucide-react";
import { Icone } from "@/components/adn/icons";
import { RankBadge } from "@/components/ui/RankBadge";
import { CadreSceau } from "@/components/profil/Pieces";
import { PresenceLigne } from "@/components/classement/AmisPresence";
import { Bouton, Sceau } from "@/components/classement/Encre";
import { fmtInt, ordinal } from "@/components/classement/format";
import type { BilanEpreuve, RivalData } from "@/components/classement/types";
import { PLACEMENT_GAMES, rankFor } from "@/lib/ranks";
import { CL, RIVAL } from "@/lib/voice-classement";
import s from "./Affronter.module.css";

/** « 4–2 pour toi », avec « · 1 nul » quand il y a eu des égalités. */
function ligneEpreuve(e: BilanEpreuve, nom: string) {
  return RIVAL.ligne(e.moi, e.lui, nom) + (e.nuls > 0 ? ` · ${RIVAL.nuls(e.nuls)}` : "");
}

/**
 * « Ton plus grand rival » : le joueur que tu as le plus croisé, toutes
 * épreuves confondues (components/classement/rival.ts). Sa carte joueur (son sceau
 * dans son cadre, sa présence, son insigne,
 * son rang, son ELO, sa place et son niveau, sur une ligne), « Croisé N fois »
 * avec le verdict (« Tu mènes 14–9 »), le détail par épreuve en grille de deux
 * (duels, les 30 du jour, les 5 du jour, examens blancs : le bilan de chacune), puis
 * « Défier » et « Voir son profil ». Présentation : les données arrivent en
 * props ; la présence se lit côté navigateur.
 */
export function CarteRival({ rival, seul = false }: { rival: RivalData; /** la seule carte de la rangée : elle prend toute la largeur */ seul?: boolean }) {
  const { name } = rival;
  const placement = rival.gamesPlayed < PLACEMENT_GAMES;
  const rk = rankFor(rival.elo, rival.mastery, rival.rank);
  const rangNom = placement ? RIVAL.placement : `${rk.tier.name}${rk.division ? " " + rk.division : ""}`;
  const ligne = [`${fmtInt(rival.elo)} ELO`, rival.rank !== null ? ordinal(rival.rank) : null, RIVAL.niveau(rival.niveau)].filter((x): x is string => Boolean(x)).join(" · ");
  const verdictAvance = rival.moi !== rival.lui;
  return (
    <section className={[s.carte, s.papier, s.rival, seul ? s.seule : ""].filter(Boolean).join(" ")} aria-labelledby="cl-rival">
      <header className={s.carteTete}>
        <h2 id="cl-rival" className={"font-brand " + s.titreMoyen}>
          <Sceau>
            <Swords size={18} />
          </Sceau>
          {RIVAL.titre}
        </h2>
        <p className={s.sousCarte}>{RIVAL.sous}</p>
      </header>

      <div className={s.joueur} aria-label={RIVAL.carte(name)} role="group">
        <span className={s.joueurSceau}>
          <CadreSceau frame={rival.style.frame} name={name} avatarUrl={rival.avatarUrl} size={48} calme />
        </span>
        <div className={s.joueurNom}>
          <b>{name}</b>
          <PresenceLigne userId={rival.userId} />
        </div>
        <div className={s.joueurRang}>
          <RankBadge tier={rk.tierIndex} size={40} mastery={rival.mastery ?? 0} division={placement ? null : rk.division} gray={placement} title={rangNom} />
          <div className={s.joueurRangTexte}>
            <b>{rangNom}</b>
            <span>{ligne}</span>
          </div>
        </div>
      </div>

      <div className={s.croise}>
        <p className={"font-brand " + s.croiseTitre}>
          {RIVAL.croise} <span className={s.surligne}>{rival.rencontres}</span> {RIVAL.fois}
        </p>
        <span className={s.verdict + (verdictAvance && rival.moi > rival.lui ? " " + s.enTete : "")}>{RIVAL.verdict(name, rival.moi, rival.lui)}</span>
      </div>

      <ul className={s.epreuves} aria-label={RIVAL.epreuves}>
        {rival.epreuves.map((e) => (
          <li key={e.epreuve} className={s.epreuve}>
            <span className={s.epreuveNom}>
              <b>{RIVAL[e.epreuve]}</b>
              <span className={s.epreuveN}>{e.rencontres}</span>
            </span>
            <span className={s.epreuveLigne}>{ligneEpreuve(e, name)}</span>
          </li>
        ))}
      </ul>

      <div className={s.actions}>
        <Bouton href={`/duel?adversaire=${encodeURIComponent(rival.userId)}`}>
          <Icone nom="duel" size={17} /> {CL.defier(name)}
        </Bouton>
        <Link href={`/people/${rival.userId}`} className={s.lien}>
          {RIVAL.profil}
        </Link>
      </div>
    </section>
  );
}

