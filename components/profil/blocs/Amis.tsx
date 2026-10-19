import Link from "next/link";
import { Users } from "lucide-react";
import { Avatar } from "@/components/classement/Avatar";
import { LienJoueur } from "@/components/profil/CarteJoueur";
import type { AmiBloc, DonneesBlocs } from "@/lib/profil/blocs-donnees";
import type { Format } from "@/lib/profil/disposition";
import { nombre } from "@/lib/voice";
import { BLOCS_PROFIL as T } from "@/lib/voice-blocs";
import { BLOCS_RADAR as R, rang } from "@/lib/voice-blocs-radar";
import { Cellule, Coque, DemiBande, Etiquette, Lien, Vide, type Ctx } from "./commun";
import a from "./amis.module.css";

// Le bloc « Amis » (spec des tuiles : « Le nombre et la pile »). Le même
// dessin chez soi et chez un autre : le total d'amis en grand, sa place dans
// son cercle par ELO quand le serveur la donne (« 6e de son cercle par ELO »,
// sinon rien), puis une pile serrée d'avatars qui se chevauchent (6 en
// mini-tuile, 10 en héros et en bande) et une pastille « +17 » pour les
// autres. Chaque avatar est un lien vers le profil (le pseudo et l'ELO en
// infobulle). Chez soi, en plus : « Gérer mes amis ». Pas de comparaison.
// Sans état : serveur comme client.

/** Par ELO décroissant ; un ELO inconnu passe à la fin (l'ordre reçu gardé). */
const parElo = <M extends { elo?: number | null }>(liste: M[]) =>
  liste
    .map((m, i) => ({ m, i }))
    .sort((x, y) => (y.m.elo ?? -Infinity) - (x.m.elo ?? -Infinity) || x.i - y.i)
    .map((x) => x.m);

/** Sa place dans son cercle (dite par le serveur ; sous 3 amis, rien) et la taille du cercle. */
function placeDe(d: DonneesBlocs): { place: number | null; taille: number } {
  const amis = d.amis!;
  const c = amis.cercle;
  return { place: amis.total < 3 || !c ? null : c.lui, taille: c?.taille ?? amis.total };
}

/** La taille des avatars par format (px), et combien on en montre (la tuile : 6 ; héros et bande : 10). */
const TAILLE: Record<Format, number> = { tuile: 34, colonne: 42, heros: 44, bande: 52, demi: 32 };
const COMBIEN: Record<Format, number> = { tuile: 6, colonne: 10, heros: 10, bande: 10, demi: 10 };

/** Un avatar de la pile : un lien vers le profil, le pseudo et l'ELO en infobulle. */
function Visage({ x, d, taille }: { x: AmiBloc; d: DonneesBlocs; taille: number }) {
  const bulle = R.pseudo(x.name, x.elo);
  return (
    <LienJoueur id={x.id} nom={x.name} className={a.visage} title={bulle} aria-label={bulle}>
      <Avatar src={x.avatarUrl} name={x.name} size={taille} userId={x.id === d.viewerId ? null : x.id} />
    </LienJoueur>
  );
}

/**
 * Une pile serrée : les avatars qui se chevauchent (le premier au-dessus, la pastille tout en haut),
 * puis la pastille « +N » s'il y en a d'autres. `reste` : combien d'amis ne
 * sont pas montrés (dans cette pile ou la suivante). `horsTel` : à partir
 * de quel avatar on cache au téléphone (demi-bande).
 */
function Pile({ amis, d, taille, reste = 0, classe = "", horsTel }: { amis: AmiBloc[]; d: DonneesBlocs; taille: number; reste?: number; classe?: string; horsTel?: number }) {
  if (!amis.length) return null;
  return (
    <ul className={a.pile + " " + classe} style={{ ["--t" as string]: `${taille}px` }} aria-label={d.moi ? R.tesAmis : R.cercle(d.nom)}>
      {amis.map((x, i) => (
        <li key={x.id} className={horsTel !== undefined && i >= horsTel ? a.horsTel : undefined} style={{ ["--z" as string]: amis.length + 1 - i, ["--k" as string]: i }}>
          <Visage x={x} d={d} taille={taille} />
        </li>
      ))}
      {reste > 0 && (
        <li className={a.plus} role="img" aria-label={R.autres(reste)} title={R.autres(reste)} style={{ ["--z" as string]: amis.length + 2, ["--k" as string]: amis.length }}>
          {R.pastille(reste)}
        </li>
      )}
    </ul>
  );
}

export function AmisBloc({ d, f, edition }: Ctx): React.ReactNode {
  if (!d.amis) return edition ? <Vide bloc={{ k: "amis", f }} f={f} icone={<Users size={17} aria-hidden />} /> : null;
  return amisDe(d, f);
}

function amisDe(d: DonneesBlocs, f: Format): React.ReactNode {
  const amis = d.amis!;
  const moi = d.moi;
  const { place, taille } = placeDe(d);
  const bulle = place !== null ? R.bulleCercle(d.nom, place, taille) : undefined;
  const tries = parElo(amis.amis);
  const gerer = (
    <Link href="/people?view=amis" className="ink-link font-semibold">
      {R.gerer}
    </Link>
  );

  // aucun ami
  if (amis.amis.length === 0 && amis.total === 0) {
    const mot = moi ? T.sansAmiMoi : T.sansAmi;
    if (f === "demi")
      return (
        <DemiBande label={T.amis} droite={moi ? gerer : undefined}>
          <Cellule etiquette={T.amis} chiffre="0" petit={mot} />
        </DemiBande>
      );
    return (
      <Coque f={f} label={T.amis}>
        <Etiquette f={f} icone={<Users size={17} aria-hidden />} titre={T.amis} />
        <p className="t-small m-0">{mot}</p>
        {moi && <Lien href="/people?view=amis">{T.gererAmis}</Lien>}
      </Coque>
    );
  }

  const pile = (n: number, t: number, classe = "", horsTel?: number) => <Pile amis={tries.slice(0, n)} d={d} taille={t} reste={Math.max(0, amis.total - Math.min(n, tries.length))} classe={classe} horsTel={horsTel} />;

  if (f === "demi")
    return (
      <DemiBande label={T.amis} dessin={pile(COMBIEN.demi, TAILLE.demi, a.pileDemi, 6)} droite={moi ? gerer : undefined}>
        <Cellule etiquette={T.amis} chiffre={nombre(amis.total)} petit={place !== null ? R.deSonCercleCourt(place, moi) : undefined} titre={bulle} />
      </DemiBande>
    );

  // le nombre en grand, puis « amis · 6e de son cercle par ELO »
  const total = (
    <div className={a.total}>
      <span className={"t-num tabular-nums " + a.nombre} title={bulle}>
        {nombre(amis.total)}
      </span>
      <p className={a.ligne} title={bulle}>
        <span>{R.amisMot(amis.total)}</span>
        {place !== null && (
          <>
            {" · "}
            <b className={a.rang}>{rang(place)}</b> {R.deSonCercle(moi)}
          </>
        )}
      </p>
    </div>
  );
  const etiquette = <Etiquette f={f} icone={<Users size={17} aria-hidden />} titre={T.amis} />;
  const lien = moi ? <Lien href="/people?view=amis">{T.gererAmis}</Lien> : null;

  if (f === "colonne") {
    // deux rangées de cinq, la seconde décalée ; la pastille ferme la seconde
    const premiers = tries.slice(0, 5);
    const suivants = tries.slice(5, COMBIEN.colonne);
    const reste = Math.max(0, amis.total - Math.min(COMBIEN.colonne, tries.length));
    return (
      <Coque f={f} label={T.amis}>
        {etiquette}
        <div className={a.milieu}>
          {total}
          <div className={a.piles}>
            <Pile amis={premiers} d={d} taille={TAILLE.colonne} reste={suivants.length ? 0 : reste} />
            {suivants.length > 0 && <Pile amis={suivants} d={d} taille={TAILLE.colonne} reste={reste} classe={a.decalee} />}
          </div>
        </div>
        {lien}
      </Coque>
    );
  }

  if (f === "heros" || f === "bande")
    return (
      <Coque f={f} label={T.amis}>
        {etiquette}
        <div className={a.zone}>
          <div className={a.cote}>
            {total}
            {pile(COMBIEN[f], TAILLE[f], a.pileCote)}
          </div>
        </div>
        {lien}
      </Coque>
    );

  // mini-tuile : étiquette en haut, le nombre et la pile en bas
  return (
    <Coque f={f} label={T.amis}>
      {etiquette}
      <div className={a.bas}>
        {total}
        {pile(COMBIEN.tuile, TAILLE.tuile, a.pileTuile)}
        {lien}
      </div>
    </Coque>
  );
}
