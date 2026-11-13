"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Avatar } from "@/components/classement/Avatar";
import { BanniereSeule } from "@/components/classement/PodiumBannieres";
import { ArcLigne } from "@/components/ui/ArcCoin";
import { couleurArc } from "@/components/ui/ArcElectrique";
import type { BoardRow } from "@/components/classement/types";
import { AmiBouton } from "@/components/profil/AmiBouton";
import { ActionEncre, EnTeteSousPage, Etiquette, SousPage } from "@/components/ui/SousPage";
import type { AmiLite } from "@/lib/profil/donnees";
import { PLACEMENT_GAMES, rankFor, versDivisionSuivante } from "@/lib/ranks";
import { createClient } from "@/lib/supabase/browser";
import { PARTIE } from "@/lib/voice-z2";
import { RETOUR_AFFRONTER, SOUS_AFFRONTER } from "@/lib/voice-affronter-sous";
import {
  DUEL_MINUTES,
  DUEL_QUESTIONS,
  DUEL_WINDOW_HOURS,
  createDuel,
  duelErrorMessage,
  signed,
  stakesAgainst,
  timeLeftLabel,
  type OpenDuel,
} from "@/lib/duels";
import s from "./DuelLobby.module.css";

const D = SOUS_AFFRONTER.duel;

/** Un adversaire possible : sa ligne de bannière (celle du podium), sa place au classement (null : pas classé), ami ou non. */
export type Adversaire = { r: BoardRow; place: number | null; ami: boolean };

type Props = {
  /** ta ligne de bannière (sa place est `place`) */
  moi: BoardRow;
  place: number | null;
  /** joueurs classés (null : inconnu) */
  total: number | null;
  /** le classement (ELO et parties de chacun) : la place qu'une victoire te donnerait */
  classement: Array<{ userId: string; elo: number; gamesPlayed: number }>;
  /** les adversaires, dans l'ordre de la rangée (le premier est choisi d'abord) */
  joueurs: Adversaire[];
  open: OpenDuel[];
  nowIso: string;
  /** la recherche (?q=) ; `trouves` : combien de joueurs elle a trouvés (null : pas de recherche) */
  q?: string;
  trouves?: number | null;
  /** demandes d'ami reçues et envoyées (null : amis pas encore disponibles) */
  demandes?: { recues: AmiLite[]; envoyees: AmiLite[] } | null;
  /** tes amis, en ligne d'abord (null : amis pas encore disponibles) */
  amis?: AmiLite[] | null;
  /** aperçu : aucune requête, les boutons ne font rien */
  demo?: boolean;
};

/**
 * La porte du lieu : la lice des duels (la peinture de la séance /duel/[id] : on reste dans le même lieu), recadrée sur
 * les deux combattants (50 % de la largeur, 76 % de la hauteur : lib/illustrations.ts). Sans données (l'état « bientôt »),
 * la ligne dit le format.
 */
export function EnTeteDuel({ ligne, heros = null, enjeu = null }: { ligne?: ReactNode; heros?: { valeur: ReactNode; legende: ReactNode } | null; enjeu?: ReactNode | null } = {}) {
  return (
    <EnTeteSousPage
      retour={RETOUR_AFFRONTER}
      titre={D.titre}
      ligne={ligne ?? D.ligne(DUEL_QUESTIONS, DUEL_MINUTES, DUEL_WINDOW_HOURS)}
      illustration={{ nom: "duel-lice", position: "50% 76%" }}
      heros={heros}
      enjeu={enjeu}
    />
  );
}

// L'arc électrique du face-à-face : le courant des 5 du jour (même moteur, même couleur que la carte de l'accueil),
// tiré d'une bannière à l'autre sous le tampon ; il coule en continu, une décharge passe d'un camp à l'autre toutes
// les 4,2 s. Posé (une image) en mouvement réduit, en pause hors écran (components/ui/ArcCoin.tsx, demande de Théo
// du 2026-11-13).
/** le palier de l'arc des 5 du jour (PALIER_ECLAIR de CarteCinq : l'aura cyan clair) */
const ARC_PALIER = 3;
function ArcDuel() {
  return <ArcLigne couleur={couleurArc(ARC_PALIER)} className={s.arc} />;
}

/** « 2e », « 1er » */
function Ordinal({ n }: { n: number }) {
  return (
    <>
      {n}
      <sup>{n === 1 ? "er" : "e"}</sup>
    </>
  );
}

/** « Argent II », ou « placement 3/5 » */
function nomRang(elo: number, mastery: number | null, jouees: number, place: number | null): string {
  if (jouees < PLACEMENT_GAMES) return D.placement(jouees, PLACEMENT_GAMES);
  const rk = rankFor(elo, mastery, place);
  return `${rk.tier.name}${rk.division ? ` ${rk.division}` : ""}`;
}

/**
 * Ce que rapporte une victoire contre `adv` (la vraie formule ELO du site) : la place que tu prendrais, sinon le rang,
 * sinon ce qu'il te manque pour la division suivante. null : rien à dire.
 */
function apresVictoire(moi: BoardRow, place: number | null, adv: Adversaire | null, classement: Props["classement"]): ReactNode {
  if (adv) {
    const gain = stakesAgainst(moi.elo, moi.gamesPlayed, adv.r.elo).win;
    const perteAdv = stakesAgainst(adv.r.elo, adv.r.gamesPlayed, moi.elo).loss;
    const nouvel = moi.elo + gain;
    // la place qu'on prendrait : seulement si le classement lu la contient (au-delà du top 50, on ne sait pas qui est devant)
    if (place !== null && place <= classement.length) {
      const devant = classement.filter((c) => c.userId !== moi.userId && (c.userId === adv.r.userId ? c.elo + perteAdv : c.elo) > nouvel).length;
      if (devant + 1 < place)
        return (
          <>
            {D.gagneEtTuPasses} <Ordinal n={devant + 1} />
          </>
        );
    }
    if (moi.gamesPlayed >= PLACEMENT_GAMES) {
      const apres = nomRang(nouvel, moi.mastery, moi.gamesPlayed + 1, place);
      if (apres !== nomRang(moi.elo, moi.mastery, moi.gamesPlayed, place)) return `${D.gagneEtTuPasses} ${apres}`;
    }
  }
  const v = versDivisionSuivante(moi.elo, rankFor(moi.elo, moi.mastery, place), moi.gamesPlayed);
  return v.genre === "division" ? D.encorePour(v.reste, v.cible) : null;
}

// /duel, le face-à-face (direction « le lieu, puis l'objet », 2026-11-13). La porte : la peinture des duels,
// ton ELO en chiffre-héros, la ligne d'état (rang, place, ce que rapporte une victoire contre l'adversaire
// choisi). Puis l'objet : ta bannière à gauche, celle de l'adversaire à droite (les vraies bannières du
// podium : fanion ou bannière composée, volet, contour, insigne, chiffres ; un clic ouvre le profil),
// « VS » tamponné au centre, l'ELO en jeu (vraie formule) et l'arc figé seulement face à quelqu'un. Les deux
// bannières se tournent l'une vers l'autre (CSS) et suivent le pointeur sans se balancer au repos (aucune boucle).
// Sous sa bannière, la rangée de portraits pour changer d'adversaire (le seul carrousel ; la page met en tête
// ce qui presse : un défi reçu, un duel où c'est à toi) ; au centre, « Défier X » à l'encre (ou le duel déjà en
// cours contre lui) et le duel au hasard. Dessous, deux annexes courtes : tes duels en cours (Relever, Jouer,
// Reprendre, Voir) et les joueurs (/people a rejoint /duel : la recherche, tes amis en lignes avec leur
// présence, les demandes d'ami reçues et envoyées).
export function DuelLobby({ moi, place, total, classement, joueurs, open, nowIso, q = "", trouves = null, demandes = null, amis = null, demo = false }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => (demo ? null : createClient()), [demo]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [choisi, setChoisi] = useState(0);
  const [tout, setTout] = useState(false);
  const [tousAmis, setTousAmis] = useState(false);
  const rangee = useRef<HTMLUListElement | null>(null);
  const premier = useRef(true);

  const adv = joueurs.length ? joueurs[Math.min(choisi, joueurs.length - 1)] : null;
  // les duels en cours : les défis reçus, puis ceux où c'est à toi, puis les autres
  const urgence = (d: OpenDuel) => (d.incoming && d.status === "pending" ? 0 : !d.myFinished ? 1 : 2);
  const enCours = [...open].sort((a, b) => urgence(a) - urgence(b));
  // le duel contre chacun : le plus urgent s'il y en a plusieurs (posé en dernier, il l'emporte)
  const duelContre = new Map([...enCours].reverse().filter((d) => d.opponentId).map((d) => [d.opponentId as string, d]));
  const existant = adv ? (duelContre.get(adv.r.userId) ?? null) : null;
  const waitingRandom = open.find((d) => d.mode === "random" && d.status === "pending" && !d.opponentId);
  const enjeu = adv ? stakesAgainst(moi.elo, moi.gamesPlayed, adv.r.elo) : null;
  const recus = open.filter((d) => d.incoming && d.status === "pending").length;

  // le portrait choisi vient au milieu de la rangée (pas au premier rendu : rien ne bouge à l'arrivée)
  useEffect(() => {
    if (premier.current) {
      premier.current = false;
      return;
    }
    const ul = rangee.current;
    const li = ul?.children[choisi] as HTMLElement | undefined;
    if (!ul || !li) return;
    const calme = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ul.scrollTo({ left: li.offsetLeft - ul.clientWidth / 2 + li.clientWidth / 2, behavior: calme ? "auto" : "smooth" });
  }, [choisi]);

  async function run(key: string, action: () => Promise<void>) {
    if (busy) return;
    if (demo) {
      setError(D.apercu);
      return;
    }
    setBusy(key);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(duelErrorMessage(e));
      setBusy(null);
    }
  }
  const launchRandom = () =>
    run("random", async () => {
      const r = await createDuel(supabase!, null);
      router.push(`/duel/${r.id}`);
    });
  const challenge = (userId: string) =>
    run(userId, async () => {
      const r = await createDuel(supabase!, userId);
      router.push(`/duel/${r.id}`);
    });

  const pas = (d: number) => joueurs.length > 1 && setChoisi((i) => (Math.min(i, joueurs.length - 1) + d + joueurs.length) % joueurs.length);

  // l'en-tête : ton rang, ta place, ce que rapporte une victoire contre l'adversaire choisi
  const gain = apresVictoire(moi, place, adv, classement);
  const ligne = (
    <>
      <b>{nomRang(moi.elo, moi.mastery, moi.gamesPlayed, place)}</b>
      {" · "}
      {place !== null ? (
        <>
          <Ordinal n={place} />
          {total ? ` ${D.sur(total)}` : ""}
        </>
      ) : (
        D.pasClasse
      )}
      {gain ? <> · {gain}</> : null}
    </>
  );

  const nomAdv = adv?.r.name ?? D.joueur;

  // l'action à l'encre : défier l'adversaire choisi, ou le duel déjà en cours contre lui ; personne : le hasard
  let action: ReactNode;
  if (adv && existant) {
    const libelle =
      existant.incoming && existant.status === "pending"
        ? D.releverDefi(nomAdv)
        : !existant.myFinished
          ? existant.myStarted
            ? D.reprendreContre(nomAdv)
            : D.jouerContre(nomAdv)
          : D.voirContre(nomAdv);
    action = (
      <ActionEncre href={`/duel/${existant.id}`}>
        {libelle} <ArrowRight size={16} aria-hidden />
      </ActionEncre>
    );
  } else if (adv) {
    action = (
      <ActionEncre onClick={() => void challenge(adv.r.userId)} disabled={busy !== null}>
        {busy === adv.r.userId ? "…" : D.defier(nomAdv)} <ArrowRight size={16} aria-hidden />
      </ActionEncre>
    );
  } else {
    action = (
      <ActionEncre onClick={() => void launchRandom()} disabled={busy !== null}>
        {busy === "random" ? PARTIE.recherche : waitingRandom ? PARTIE.reprendre : PARTIE.trouver} <ArrowRight size={16} aria-hidden />
      </ActionEncre>
    );
  }

  // trois lignes, le reste au déplié
  const visibles = tout ? enCours : enCours.slice(0, 3);
  const visage = new Map(joueurs.map((j) => [j.r.userId, j.r.avatarUrl]));
  const recues = demandes?.recues ?? [];
  const envoyees = demandes?.envoyees ?? [];
  const mesAmis = amis ?? [];
  const amisVus = tousAmis ? mesAmis : mesAmis.slice(0, 3);

  return (
    <SousPage
      entete={<EnTeteDuel ligne={ligne} heros={{ valeur: <bdi className={s.eloHeros}>{moi.elo}</bdi>, legende: D.tonElo }} enjeu={recus > 0 ? D.defisRecus(recus) : null} />}
    >
      <section className={s.arene} data-face={adv ? "1" : "0"} aria-label={adv ? D.face(moi.name, adv.r.name) : D.titre}>
        <div className={s.cote} data-cote="moi">
          <BanniereSeule r={{ ...moi, isMe: false }} place={place} className={s.place} repos={false} />
        </div>

        {adv && <ArcDuel />}
        <div className={s.vs} aria-hidden>
          <b className={s.tampon}>{D.vs}</b>
        </div>

        {enjeu && (
          <p className={s.mise}>
            <span>
              <b data-gain="">{signed(enjeu.win)}</b> {D.siGagnes}
            </span>
            <span>
              <b>{signed(enjeu.loss)}</b> {D.siPerds}
            </span>
          </p>
        )}

        <div className={s.cote} data-cote="adv">
          {adv ? (
            <BanniereSeule key={adv.r.userId} r={adv.r} place={adv.place} className={s.place} repos={false} />
          ) : (
            <div className={s.libre} aria-hidden>
              <span className="font-brand">?</span>
            </div>
          )}
        </div>

        <div className={s.choix}>
          {q && (
            <p className={s.recherche}>
              <span>{trouves ? D.resultats(q, trouves) : D.aucun(q)}</span>
              <Link href="/duel" className={s.effacer}>
                <X size={13} aria-hidden /> {D.effacer}
              </Link>
            </p>
          )}
          {joueurs.length > 0 ? (
            <div className={s.portraits} role="group" aria-label={D.changer}>
              {joueurs.length > 1 && (
                <button type="button" className={s.fleche + " rl-presse"} onClick={() => pas(-1)} aria-label={D.precedent}>
                  <ChevronLeft size={16} aria-hidden />
                </button>
              )}
              <ul ref={rangee} className={s.rangee}>
                {joueurs.map((j, i) => (
                  <li key={j.r.userId}>
                    <button
                      type="button"
                      className={s.portrait}
                      aria-pressed={adv?.r.userId === j.r.userId}
                      data-ami={j.ami ? "1" : undefined}
                      title={D.portrait(j.r.name, j.r.elo, j.ami)}
                      aria-label={D.portrait(j.r.name, j.r.elo, j.ami)}
                      onClick={() => setChoisi(i)}
                    >
                      <Avatar src={j.r.avatarUrl} name={j.r.name} size={42} userId={j.r.userId} />
                    </button>
                  </li>
                ))}
              </ul>
              {joueurs.length > 1 && (
                <button type="button" className={s.fleche + " rl-presse"} onClick={() => pas(1)} aria-label={D.suivant}>
                  <ChevronRight size={16} aria-hidden />
                </button>
              )}
            </div>
          ) : (
            <p className={s.personne}>{D.personne}</p>
          )}
        </div>

        <div className={s.action}>
          {action}
          <p className={s.format}>{D.formatCourt(DUEL_QUESTIONS, DUEL_MINUTES, DUEL_WINDOW_HOURS)}</p>
          {/* un duel au hasard déjà en attente : sa ligne est dans l'annexe, rien à redire ici */}
          {adv && !waitingRandom && (
            <button type="button" className={s.hasard + " rl-presse"} onClick={() => void launchRandom()} disabled={busy !== null}>
              {busy === "random" ? PARTIE.recherche : D.hasardOu}
            </button>
          )}
          {error && (
            <p role="alert" className={s.erreur}>
              {error}
            </p>
          )}
        </div>
      </section>

      <div className={s.annexes}>
        {enCours.length > 0 && (
          <section className={s.annexe} aria-label={D.duelsEnCours}>
            <Etiquette as="h2">{D.duelsEnCours}</Etiquette>
            <ul className={s.lignes}>
              {visibles.map((d) => {
                const nom = d.opponentId ? (d.opponentName ?? D.unJoueur) : D.auHasard;
                const titre = !d.opponentId
                  ? D.auHasard
                  : d.incoming && d.status === "pending"
                    ? D.teDefie(nom)
                    : d.status === "pending" || d.myFinished
                      ? D.attente(nom)
                      : D.contreNom(nom);
                const suite = d.incoming && d.status === "pending" ? D.relever : !d.myFinished ? (d.myStarted ? D.reprendre : D.jouer) : D.voir;
                return (
                  <li key={d.id}>
                    <Link href={`/duel/${d.id}`} className={s.ligne + " rl-presse"} data-urgent={urgence(d) === 0 ? "1" : undefined}>
                      <Avatar src={d.opponentId ? (visage.get(d.opponentId) ?? null) : null} name={nom} size={30} />
                      <span className={s.qui}>
                        <b>{titre}</b>
                        <small>{sousDuel(d, nowIso)}</small>
                      </span>
                      <span className={s.suite}>
                        {suite} <span aria-hidden>→</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {enCours.length > 3 && (
              <button type="button" className={s.plus} onClick={() => setTout((t) => !t)} aria-expanded={tout}>
                {tout ? D.moins : D.autres(enCours.length - 3)}
              </button>
            )}
          </section>
        )}

        <section className={s.annexe} aria-label={D.joueurs}>
          <Etiquette as="h2">{D.joueurs}</Etiquette>
          <form className={s.cherche} action="/duel" method="get" role="search">
            <label htmlFor="rl-duel-q" className="sr-only">
              {D.chercher}
            </label>
            <Search size={16} className={s.loupe} aria-hidden />
            <input id="rl-duel-q" name="q" defaultValue={q} placeholder={D.placeholder} className={s.champ} autoComplete="off" maxLength={40} />
            <button type="submit" className={s.ok + " rl-presse"} aria-label={D.chercher}>
              <ArrowRight size={15} aria-hidden />
            </button>
          </form>
          {mesAmis.length > 0 && !q && (
            <div className={s.amis}>
              <ul className={s.lignes} aria-label={D.tesAmis}>
                {amisVus.map((a) => (
                  <li key={a.id}>
                    <Link href={`/people/${a.id}`} className={s.ami + " rl-presse"} aria-label={D.profilDe(a.name)}>
                      <Avatar src={a.avatarUrl} name={a.name} size={28} userId={a.id} />
                      <b>{a.name}</b>
                      <span aria-hidden className={s.suite}>
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {mesAmis.length > 3 && (
                <button type="button" className={s.plus} onClick={() => setTousAmis((v) => !v)} aria-expanded={tousAmis}>
                  {tousAmis ? D.moins : D.amisEnPlus(mesAmis.length - 3)}
                </button>
              )}
            </div>
          )}
          {(recues.length > 0 || envoyees.length > 0) && (
            <ul className={s.lignes}>
              {recues.map((a) => (
                <li key={a.id} className={s.demande}>
                  <Link href={`/people/${a.id}`} className={s.qui + " " + s.quiLien}>
                    <Avatar src={a.avatarUrl} name={a.name} size={30} userId={a.id} />
                    <span>
                      <b>{a.name}</b>
                      <small>{D.veutEtreAmi}</small>
                    </span>
                  </Link>
                  <AmiBouton autre={a.id} relation="recue" compact />
                </li>
              ))}
              {envoyees.map((a) => (
                <li key={a.id} className={s.demande}>
                  <Link href={`/people/${a.id}`} className={s.qui + " " + s.quiLien}>
                    <Avatar src={a.avatarUrl} name={a.name} size={30} userId={a.id} />
                    <span>
                      <b>{a.name}</b>
                    </span>
                  </Link>
                  <AmiBouton autre={a.id} relation="envoyee" compact />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </SousPage>
  );
}

/** Le point d'un duel en cours, en quelques mots. */
function sousDuel(d: OpenDuel, nowIso: string): string {
  const E = D.etat;
  const reste = timeLeftLabel(d.expiresAt, nowIso);
  if (d.status === "pending" && d.incoming) return E.aAccepter(reste);
  if (d.status === "pending" && !d.opponentId) return d.myFinished ? E.onCherche : E.enAttente;
  if (d.status === "pending") return d.myFinished ? E.copieRendue : E.pasAccepte;
  if (d.myFinished) return d.theirFinished ? E.resultat : d.theirStarted ? E.ilJoue : E.pasJoue;
  return E.aToi(reste);
}

