import Link from "next/link";
import { Search } from "lucide-react";
import { Icone } from "@/components/adn/icons";
import { RankBadge } from "@/components/ui/RankBadge";
import { Avatar } from "@/components/classement/Avatar";
import { CompteEnLigne, PresenceLigne } from "@/components/classement/AmisPresence";
import { LienJoueur } from "@/components/profil/CarteJoueur";
import { fmtInt, ordinal } from "@/components/classement/format";
import type { AmiRow } from "@/components/classement/types";
import { PLACEMENT_GAMES, rankFor } from "@/lib/ranks";
import { AMIS } from "@/lib/voice-classement";
import s from "./Affronter.module.css";

/** Combien d'amis la liste montre d'emblée (la suite se déplie). */
const VISIBLES = 12;

/** La place générale, en toutes lettres courtes (« 2e »), ou un tiret si elle est inconnue. */
const placeDe = (a: AmiRow) => (a.rank !== null ? ordinal(a.rank) : "—");

function Ligne({ a }: { a: AmiRow }) {
  const placement = a.gamesPlayed < PLACEMENT_GAMES;
  const rk = rankFor(a.elo, a.mastery, a.rank);
  const rangNom = placement ? AMIS.placement : `${rk.tier.name}${rk.division ? " " + rk.division : ""}`;
  return (
    <li>
      <div className={`${s.amisGrille} ${s.ami} ${a.isMe ? s.moi : ""}`} aria-current={a.isMe ? "true" : undefined}>
        <span className={s.amiPlace}>{placeDe(a)}</span>
        <span className={s.avatar}>
          <Avatar src={a.avatarUrl} name={a.name} size={40} />
        </span>
        <span className={s.amiNom}>
          <b data-place={placeDe(a)}>
            {a.isMe ? (
              <>
                {a.name} <span>· {AMIS.toi}</span>
              </>
            ) : (
              <LienJoueur id={a.userId} nom={a.name} className="hover:underline">
                {a.name}
              </LienJoueur>
            )}
          </b>
          <PresenceLigne userId={a.userId} />
        </span>
        <span className={s.amiRang}>
          <RankBadge tier={rk.tierIndex} size={30} glow={false} gray={placement} title={rangNom} />
          <span>{rangNom}</span>
        </span>
        <span className={s.amiElo}>{fmtInt(a.elo)}</span>
        {a.isMe ? (
          <span aria-hidden />
        ) : (
          <Link href={`/duel?adversaire=${encodeURIComponent(a.userId)}`} className={s.defier} aria-label={AMIS.defierNom(a.name)}>
            <Icone nom="duel" size={15} /> {AMIS.defier}
          </Link>
        )}
      </div>
    </li>
  );
}

/**
 * L'onglet « Amis » du classement général : tes amis et toi, classés par place
 * générale. En tête, combien d'amis, combien sont en ligne (présence lue côté
 * navigateur) et ta place parmi eux ; à droite « Ajouter un ami » (l'annuaire).
 * Pour chaque ami : sa place, son nom et sa présence (« en ligne », « vu il y
 * a 3 h »), son insigne, son ELO et « Défier » (/duel?adversaire=…). Ta ligne
 * est cerclée d'encre. Sans ami (ou lecture indisponible) : un état vide qui
 * mène à l'annuaire. Présentation : les données arrivent en props.
 */
export function Amis({ rows }: { rows: AmiRow[] | null | undefined }) {
  const tous = [...(rows ?? [])].sort((a, b) => (a.rank ?? Number.POSITIVE_INFINITY) - (b.rank ?? Number.POSITIVE_INFINITY) || b.elo - a.elo);
  const amis = tous.filter((r) => !r.isMe);

  if (amis.length === 0) {
    return (
      <div className={s.amisVide}>
        <h3 className="font-brand">{AMIS.videTitre}</h3>
        <p className={s.sous}>{AMIS.videTexte}</p>
        <Link href="/people" className={`${s.bouton} ${s.encre} rl-encre`} data-palette="san-romano">
          <Search size={17} aria-hidden /> {AMIS.chercher}
        </Link>
      </div>
    );
  }

  const monIx = tous.findIndex((r) => r.isMe);
  const visibles = tous.slice(0, VISIBLES);
  // ta ligne reste visible même si ta place est au-delà de la liste d'emblée
  if (monIx >= VISIBLES) visibles.push(tous[monIx]);
  const suite = tous.slice(VISIBLES).filter((r) => !visibles.includes(r));

  return (
    <>
      <div className={s.amisTete}>
        <p>
          <b>{AMIS.nombre(amis.length)}</b>
          <CompteEnLigne ids={amis.map((a) => a.userId)} />
          {monIx >= 0 && (
            <>
              {" · "}
              {AMIS.tuEs} <b>{ordinal(monIx + 1)}</b> {AMIS.parmiEux}
            </>
          )}
        </p>
        <Link href="/people" className={s.lien}>
          {AMIS.ajouter}
        </Link>
      </div>
      <div>
        <div className={`${s.amisGrille} ${s.amisCols}`} aria-hidden>
          <span>{AMIS.colPlace}</span>
          <span />
          <span>{AMIS.colAmi}</span>
          <span>{AMIS.colRang}</span>
          <span>{AMIS.colElo}</span>
          <span />
        </div>
        <ol className={s.amisListe} aria-label={AMIS.liste}>
          {visibles.map((a) => (
            <Ligne key={a.userId} a={a} />
          ))}
        </ol>
        {suite.length > 0 && (
          <details className="group mt-2">
            <summary className="mx-auto flex w-fit cursor-pointer list-none items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-white [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">{AMIS.suivants(suite.length)}</span>
              <span className="hidden group-open:inline">{AMIS.replier}</span>
            </summary>
            <ol className={s.amisListe + " mt-2"}>
              {suite.map((a) => (
                <Ligne key={a.userId} a={a} />
              ))}
            </ol>
          </details>
        )}
      </div>
    </>
  );
}
