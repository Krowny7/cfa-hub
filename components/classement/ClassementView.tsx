import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Icone } from "@/components/adn/icons";
import { ArcElectrique } from "@/components/ui/ArcElectrique";
import { Illustration } from "@/components/ui/Illustration";
import { PeintureAnimee } from "@/components/ui/PeintureAnimee";
import { RankBadge } from "@/components/ui/RankBadge";
import { Amis } from "@/components/classement/Amis";
import { Avatar } from "@/components/classement/Avatar";
import { CarteMaitres } from "@/components/classement/CarteMaitres";
import { CarteRival } from "@/components/classement/CarteRival";
import { Bouton, PAL, Sceau } from "@/components/classement/Encre";
import { RechercheJoueurs } from "@/components/classement/RechercheJoueurs";
import { ClassementTabs, type TabKey } from "@/components/classement/ClassementTabs";
import { HowItWorks } from "@/components/classement/Domains";
import { EloChart } from "@/components/classement/EloChart";
import { Leaderboard } from "@/components/classement/Leaderboard";
import { TierTrack } from "@/components/classement/TierTrack";
import { daysUntil, fmtAgo, fmtDay, fmtDuration, fmtHour, fmtInt, fmtLongDate, fmtShortDate, signed } from "@/components/classement/format";
import type { ClassementData } from "@/components/classement/types";
import type { DuelSummary } from "@/lib/rating";
import { CURRENT_DOMAIN } from "@/lib/domains";
import { styleDePalette } from "@/lib/palettes";
import { PLACEMENT_GAMES, rankFor } from "@/lib/ranks";
import { DUEL_REVIEW_DAYS, reviewLeftLabel } from "@/lib/duels";
import { placement as lignePlacement, scorePct } from "@/lib/voice";
import { CLASSEMENT, coteProchain, joueursDomaine, ligneRang, partiesClassees } from "@/lib/voice-z2a";
import { CL, ONGLETS_CLASSEMENT } from "@/lib/voice-classement";
import s from "./Affronter.module.css";

/** Les onglets du classement général (?onglet=) : le premier est celui d'arrivée. */
export const CLASSEMENT_TABS: TabKey[] = ONGLETS_CLASSEMENT.map((t) => t.key);

const SHOWN = 10;

const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function nom(d: DuelSummary) {
  return d.opponentName?.trim() || (d.opponentId ? "Un joueur" : "Un adversaire");
}

/**
 * La carte « Duels », toute la largeur (la peinture des duels est dans le diptyque) : « En cours »
 * (la partie à reprendre, avec « Reprendre », le défi envoyé qui attend) et
 * « À revoir » (les duels finis dont la revue est encore ouverte) côte à côte,
 * et le lien « Tous tes duels ».
 */
function CarteDuels({ open, recent }: { open: DuelSummary[]; recent: DuelSummary[] }) {
  const actif = open.find((d) => d.status === "active");
  const envoye = open.find((d) => !d.incoming && d.status === "pending" && d.opponentId);
  const now = new Date().toISOString();
  const n = recent.filter((d) => d.status === "finished" && d.finishedAt && reviewLeftLabel(d.finishedAt, now) !== null).length;
  return (
    <section className={[s.carte, s.papier, s.duels].join(" ")} aria-labelledby="cl-duels">
      <div className={s.duelsCorps}>
        <header className={s.duelsTete}>
          <h2 id="cl-duels" className={"font-brand " + s.titreCarte}>
            <Sceau>
              <Icone nom="duel" size={18} />
            </Sceau>
            {CL.duels}
          </h2>
          <Link href="/duel" className={s.lien}>
            {CLASSEMENT.tousDuels}
          </Link>
        </header>

        <div className={s.duelsBlocs}>
          <div className={s.duelsBloc}>
            <p className={s.eyebrow}>{CL.enCours}</p>
            {actif || envoye ? (
              <ul className={s.lignes}>
                {actif && (
                  <li className={s.ligneDuel}>
                    <Avatar src={actif.opponentAvatar} name={nom(actif)} size={56} />
                    <div className={s.ligneTexte}>
                      <b>{CL.contre(nom(actif))}</b>
                      <span className={s.sous}>{CL.partieOuverte}</span>
                    </div>
                    <Bouton href={`/duel/${actif.id}`}>
                      {CL.reprendre} <ArrowRight size={15} aria-hidden />
                    </Bouton>
                  </li>
                )}
                {envoye && (
                  <li className={s.ligneDuel}>
                    <Avatar src={envoye.opponentAvatar} name={nom(envoye)} size={56} />
                    <div className={s.ligneTexte}>
                      <b>{CL.pasEncoreJoue(nom(envoye))}</b>
                      <span className={s.sous}>{CL.defiEnvoye(fmtAgo(envoye.createdAt))}</span>
                    </div>
                    <span className={s.pastilleAttente}>{CL.enAttente}</span>
                  </li>
                )}
              </ul>
            ) : (
              <div className={s.ligneTexte}>
                <b>{CL.aucunEnCours}</b>
                <span className={s.sous}>{CL.enCoursVideLigne}</span>
              </div>
            )}
          </div>
          <div className={s.duelsBloc}>
            <p className={s.eyebrow}>{CL.aRevoir}</p>
            <div className={s.ligneDuel}>
              <span className={"font-brand " + s.pastilleN} aria-hidden>
                {n}
              </span>
              <div className={s.ligneTexte}>
                <b>{n > 0 ? CL.aRelire(n) : CL.rienARevoir}</b>
                <span className={s.sous}>{n > 0 ? CL.aRevoirLigne(DUEL_REVIEW_DAYS) : CLASSEMENT.aRevoirVide(DUEL_REVIEW_DAYS)}</span>
              </div>
              {n > 0 && (
                <Link href="/duel" className={s.lien}>
                  {CL.revoirDuels}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** La Grande Salle : la moitié peinte du diptyque, l'examen classé (le prochain, ou rien de prévu). */
function GrandeSalle({ data }: { data: ClassementData }) {
  const { exam, pastExams } = data;
  const dernier = pastExams.find((e) => e.score !== null);
  let sousTitre: string = CL.salleVideSous;
  let quand: string = CLASSEMENT.examenVide;
  let puces: string[] = [];
  let note: string = CLASSEMENT.examenVideTexte;
  let action: { href: string; label: string } = { href: "/mock-exams", label: CL.voirExamens };
  if (exam) {
    const jours = daysUntil(exam.scheduledAt);
    const draft = exam.status === "draft";
    const inscrits =
      exam.registrants === null ? (draft ? "inscriptions bientôt ouvertes" : null) : exam.registrants === 0 ? "aucun inscrit" : `${exam.registrants} inscrit${exam.registrants > 1 ? "s" : ""}`;
    const repere = exam.windowOpen ? `ouvert jusqu'au ${fmtShortDate(exam.windowEnd)}` : jours > 0 ? `J-${jours}` : null;
    sousTitre = CL.salleSous(exam.questionCount, fmtDuration(exam.durationMinutes));
    quand = `${majuscule(fmtDay(exam.scheduledAt))} à ${fmtHour(exam.scheduledAt)}`;
    puces = [repere, inscrits].filter((x): x is string => Boolean(x));
    note = CL.ilFaitBouger + (dernier ? ` ${CL.dernierExamen(scorePct(dernier.score as number, dernier.total ?? dernier.questionCount), dernier.delta !== null ? signed(dernier.delta) : null)}` : "");
    action = {
      href: `/mock-exams/${exam.id}`,
      label: exam.registered ? (exam.windowOpen ? CL.passer : CL.inscritVoir) : draft ? CL.voirExamen : CL.jeMinscris,
    };
  }
  return (
    <section className={s.salle} aria-label={CL.salle}>
      <div className={s.fondSalle} aria-hidden>
        <PeintureAnimee nom="classement-grande-salle" position="50% 60%" decorative eager />
      </div>
      <div className={s.salleTitre}>
        <span className={s.sceauNoir} aria-hidden>
          <Icone nom="examen" size={20} />
        </span>
        <h2 className="font-brand">{CL.salle}</h2>
      </div>
      <p className={s.salleSous}>{sousTitre}</p>
      <p className={s.salleQuand}>{quand}</p>
      {puces.length > 0 && (
        <ul className={s.puces}>
          {puces.map((p) => (
            <li key={p} className={s.puce}>
              {p}
            </li>
          ))}
        </ul>
      )}
      <p className={s.salleNote}>{note}</p>
      <Bouton href={action.href} surPeinture>
        {action.label}
      </Bouton>
    </section>
  );
}

// Espace « S'affronter » (ex-Classement), disposition A « L'arène » (maquette
// validée), dans le même langage que S'entraîner (Affronter.module.css : cartes
// en papier, diptyque peint, boutons et onglets d'encre, palette san-romano).
// Dans l'ordre : l'en-tête simple (espace · domaine, titre) ; le diptyque « La Grande
// Salle » (l'examen classé, la pièce maîtresse, peinte, à gauche) | la carte du
// duel (en haut ton ELO et ton insigne, une ligne de rang ; en bas la peinture des
// duels et le bouton « Lancer un duel », ou « Relever le défi » quand un défi
// attend ; l'arc électrique court autour quand il y a de l'enjeu) ; la bande noire
// « Trouver un adversaire » (RechercheJoueurs : des suggestions dès 2 lettres) ; « Duels » (la
// partie à reprendre ou le défi envoyé, et les duels à relire) ; la rangée « Ton plus grand rival |
// Les maîtres de chaque matière » (CarteRival, CarteMaitres : chacune seulement
// si elle a des données) ; enfin le Classement général en
// onglets : Classement (podium, liste), Amis, Ta courbe, Les 8 rangs, Comment
// ça marche. Téléphone : une colonne, dans le même ordre.
// Composant de présentation : toutes les données arrivent en props.
// Repères de Léonard (data-leonard) : rang (la carte du duel, ton ELO), joueurs
// (dans le Classement du général).
export function ClassementView({ data, tab = "classement" }: { data: ClassementData; /** l'onglet du classement général ouvert à l'arrivée (?onglet=) */ tab?: TabKey }) {
  const { me, history, board, meRow, openDuels, recentDuels } = data;
  const dom = CURRENT_DOMAIN.name;
  const rank = rankFor(me.elo, me.mastery, me.leaderboardRank);
  const enPlacement = me.gamesPlayed < PLACEMENT_GAMES;
  const rangNom = enPlacement ? "Placement" : `${rank.tier.name}${rank.division ? " " + rank.division : ""}`;
  const defi = openDuels.find((d) => d.incoming && d.status === "pending") ?? null;
  // de l'enjeu : un défi reçu qui attend, ou le palier suivant à 30 points d'ELO ou moins
  // (pas en placement, ni quand la maîtrise bloque le palier) : l'arc électrique court sur la carte
  const palierProche = !enPlacement && !rank.lockedBy && rank.next !== null && rank.pointsToNext !== null && rank.pointsToNext <= 30;
  const enjeu = defi !== null || palierProche;

  const events = history.slice(-SHOWN);
  const total = events.length ? events[events.length - 1].eloAfter - events[0].eloBefore : 0;
  const cap = !enPlacement && rank.next && rank.pointsToNext !== null && !rank.lockedBy ? { elo: rank.next.min, label: coteProchain(rank.next.name, rank.pointsToNext) } : null;
  const nbJoueurs = me.totalPlayers ?? board.length;

  return (
    <div className="rl-wide rl-page">
      <div className="flex flex-col gap-7 md:gap-10">
        <header className="flex min-w-0 flex-col gap-3">
          <p className="t-small flex items-center gap-2 font-semibold">
            <Icone nom="classement" size={18} />
            <span>{CL.kicker(dom)}</span>
          </p>
          <h1 className="t-hero rl-in m-0">{CL.titre}</h1>
        </header>

        <div className={s.racine} style={styleDePalette(PAL)}>
          {/* ——— le diptyque : « La Grande Salle » (7/12, la pièce maîtresse) | la carte du duel (5/12) ——— */}
          <section className={s.diptyque + " rl-in"} aria-label={CL.diptyque}>
            <GrandeSalle data={data} />
            <article data-leonard="rang" className={s.carteDuel} aria-label={CL.rangDomaine}>
              <div className={s.carteDuelHaut}>
                <p className={s.eyebrow}>{CL.tonRang(dom)}</p>
                <h2 className={"font-brand " + s.eloRang}>
                  <RankBadge tier={rank.tierIndex} division={enPlacement ? null : rank.division} mastery={me.mastery} size={52} gray={enPlacement} title={rangNom} />
                  <span>
                    {fmtInt(me.elo)} <small>ELO</small>
                  </span>
                </h2>
                <p className={s.rangLigne}>{enPlacement ? lignePlacement(me.gamesPlayed, PLACEMENT_GAMES) : `${rangNom} · ${ligneRang({ place: me.leaderboardRank, joueurs: me.totalPlayers, maitrise: me.mastery })}`}</p>
              </div>
              <div className={s.carteDuelBas}>
                <div className={s.fondDuel} aria-hidden>
                  <Illustration nom="classement-duels" position="50% 30%" decorative eager />
                </div>
                {defi ? (
                  <Bouton href={`/duel/${defi.id}`} surPeinture>
                    <Icone nom="duel" size={17} /> {CL.releverDefi(nom(defi))}
                  </Bouton>
                ) : (
                  <Bouton href="/duel" surPeinture>
                    <Icone nom="duel" size={17} /> {CLASSEMENT.lancer}
                  </Bouton>
                )}
              </div>
            </article>
            {enjeu && <ArcElectrique palier={rank.tierIndex} rayon={20} />}
          </section>

          {/* ——— la bande « Trouver un adversaire », à l'encre noire : un pseudo, des suggestions, son profil ——— */}
          <RechercheJoueurs demo={data.joueursExemple} />

          {/* ——— « Duels », toute la largeur ——— */}
          <CarteDuels open={openDuels} recent={recentDuels} />

          {/* ——— la rangée « Ton plus grand rival » (5/12) + « Les maîtres de chaque matière » (7/12) ———
              Chacune des deux cartes n'apparaît que si elle a des données (pas de clé admin, rien
              joué ensemble, personne de classé) ; seule, elle prend toute la largeur. Téléphone :
              le rival, puis les maîtres. */}
          {(data.rival || data.maitres) && (
            <div className={s.rangee}>
              {data.rival && <CarteRival rival={data.rival} seul={!data.maitres} />}
              {data.maitres && <CarteMaitres maitres={data.maitres} seul={!data.rival} />}
            </div>
          )}

          {/* ——— le Classement général, en onglets ——— */}
          <section className={[s.carte, s.papier, s.general].join(" ")} aria-labelledby="cl-tableau">
            <div className={s.bandeau}>
              <div className={s.bandeauFond} aria-hidden>
                <PeintureAnimee nom="classement-lice" position="50% 38%" decorative />
              </div>
              <span className={s.sceauNoir} aria-hidden>
                <Icone nom="classement" size={20} />
              </span>
              <div className={s.bandeauTexte}>
                <h2 id="cl-tableau" className={"font-brand " + s.bandeauTitre}>
                  {CL.general}
                </h2>
                <p>{joueursDomaine(nbJoueurs, dom)}</p>
              </div>
            </div>
            <div className={s.corpsGeneral}>
              <ClassementTabs
                label={CL.generalLabel}
                initial={tab}
                tabs={[
                  {
                    key: "classement",
                    label: ONGLETS_CLASSEMENT[0].label,
                    panel: <Leaderboard board={board} meRow={meRow} totalPlayers={me.totalPlayers} sobre />,
                  },
                  { key: "amis", label: ONGLETS_CLASSEMENT[1].label, panel: <Amis rows={data.amis} /> },
                  {
                    key: "courbe",
                    label: ONGLETS_CLASSEMENT[2].label,
                    panel: events.length ? (
                      <>
                        <p className={s.introOnglet}>
                          <b>{CL.courbeDepuis(signed(total), fmtLongDate(events[0].createdAt))}</b> · {CL.courbeHint(partiesClassees(events.length))}
                        </p>
                        <EloChart events={events} cap={cap} />
                      </>
                    ) : (
                      <p className={s.introOnglet}>{CLASSEMENT.courbeVide}</p>
                    ),
                  },
                  {
                    key: "rangs",
                    label: ONGLETS_CLASSEMENT[3].label,
                    panel: (
                      <>
                        <p className={s.introOnglet}>{enPlacement ? CL.rangsPlacementHint : `${CLASSEMENT.rangsSous} Tu es ${rangNom}.`}</p>
                        <TierTrack current={rank.tierIndex} mastery={me.mastery} placement={enPlacement} />
                      </>
                    ),
                  },
                  { key: "regles", label: ONGLETS_CLASSEMENT[4].label, panel: <HowItWorks /> },
                ]}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
