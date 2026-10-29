import Link from "next/link";
import { ArrowRight, Search, TrendingUp } from "lucide-react";
import { Icone } from "@/components/adn/icons";
import { ArcElectrique } from "@/components/ui/ArcElectrique";
import { Illustration } from "@/components/ui/Illustration";
import { PeintureAnimee } from "@/components/ui/PeintureAnimee";
import { RankBadge } from "@/components/ui/RankBadge";
import { AutourDeToi } from "@/components/classement/AutourDeToi";
import { Amis } from "@/components/classement/Amis";
import { Avatar } from "@/components/classement/Avatar";
import { CarteMaitres } from "@/components/classement/CarteMaitres";
import { CarteRival } from "@/components/classement/CarteRival";
import { Bouton, PAL, Sceau } from "@/components/classement/Encre";
import { ClassementTabs, type TabKey } from "@/components/classement/ClassementTabs";
import { HowItWorks } from "@/components/classement/Domains";
import { EloChart } from "@/components/classement/EloChart";
import { Leaderboard } from "@/components/classement/Leaderboard";
import { TierTrack } from "@/components/classement/TierTrack";
import { daysUntil, fmtAgo, fmtDay, fmtDuration, fmtHour, fmtInt, fmtLongDate, fmtShortDate, signed } from "@/components/classement/format";
import type { BoardRow, ClassementData } from "@/components/classement/types";
import type { DuelSummary } from "@/lib/rating";
import { CURRENT_DOMAIN } from "@/lib/domains";
import { styleDePalette } from "@/lib/palettes";
import { PLACEMENT_GAMES, rankFor } from "@/lib/ranks";
import { DUEL_REVIEW_DAYS, reviewLeftLabel } from "@/lib/duels";
import { placement as lignePlacement, pointsAvant, scorePct, SOMMET, VERROU } from "@/lib/voice";
import { CLASSEMENT, RIVALITE, coteProchain, joueursDomaine, ligneRang, partiesClassees } from "@/lib/voice-z2a";
import { CL, ONGLETS_CLASSEMENT } from "@/lib/voice-classement";
import s from "./Affronter.module.css";

/** Les onglets du classement général (?onglet=) : le premier est celui d'arrivée. */
export const CLASSEMENT_TABS: TabKey[] = ONGLETS_CLASSEMENT.map((t) => t.key);

const SHOWN = 10;

const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function nom(d: DuelSummary) {
  return d.opponentName?.trim() || (d.opponentId ? "Un joueur" : "Un adversaire");
}

/** Les voisins de classement : le joueur juste devant, toi, celui qui te suit (seulement s'il a joué et ne te dépasse pas). */
function voisins(board: BoardRow[], meRow: BoardRow | null) {
  const ix = board.findIndex((r) => r.isMe);
  const moi = ix >= 0 ? board[ix] : meRow;
  if (!moi) return { moi: null, devant: null, derriere: null };
  const last = board[board.length - 1];
  const avant = ix > 0 ? board[ix - 1] : ix < 0 && last && last.rank === moi.rank - 1 ? last : null;
  const apres = ix >= 0 && ix < board.length - 1 ? board[ix + 1] : null;
  return {
    moi,
    devant: avant && avant.elo >= moi.elo ? avant : null,
    derriere: apres && apres.gamesPlayed > 0 && apres.elo <= moi.elo ? apres : null,
  };
}

/**
 * La carte « Duels » : la partie à reprendre (avec « Reprendre »), le défi
 * envoyé qui attend, puis « À revoir » (les duels finis dont la revue est
 * encore ouverte) et le lien « Tous tes duels ».
 */
function CarteDuels({ open, recent }: { open: DuelSummary[]; recent: DuelSummary[] }) {
  const actif = open.find((d) => d.status === "active");
  const envoye = open.find((d) => !d.incoming && d.status === "pending" && d.opponentId);
  const now = new Date().toISOString();
  const n = recent.filter((d) => d.status === "finished" && d.finishedAt && reviewLeftLabel(d.finishedAt, now) !== null).length;
  return (
    <section className={[s.carte, s.papier, s.duels].join(" ")} aria-labelledby="cl-duels">
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

      <p className={s.eyebrow + " " + s.revoir}>{CL.aRevoir}</p>
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
// Dans l'ordre : l'en-tête simple (espace · domaine, titre) ; le diptyque
// « Ton rang » (le rang est le héros : insigne, ELO, place, palier, rival, le
// duel à lancer, ceux qui t'entourent, le bilan ; l'arc électrique court autour
// quand il y a de l'enjeu) | « La Grande Salle » (l'examen classé, carte peinte) ;
// la rangée « Duels » (partie à reprendre, défi envoyé, duels à relire) +
// « Trouver un adversaire » ; la rangée « Ton plus grand rival |
// Les maîtres de chaque matière » (CarteRival, CarteMaitres : chacune seulement
// si elle a des données) ; enfin le Classement général en
// onglets : Classement (podium, liste), Amis, Ta courbe, Les 8 rangs, Comment
// ça marche. Téléphone : une colonne, dans le même ordre.
// Composant de présentation : toutes les données arrivent en props.
// Repères de Léonard (data-leonard) : rang (la moitié « Ton rang »), joueurs
// (dans le Classement du général).
export function ClassementView({ data, tab = "classement" }: { data: ClassementData; /** l'onglet du classement général ouvert à l'arrivée (?onglet=) */ tab?: TabKey }) {
  const { me, history, board, meRow, openDuels, recentDuels } = data;
  const dom = CURRENT_DOMAIN.name;
  const rank = rankFor(me.elo, me.mastery, me.leaderboardRank);
  const enPlacement = me.gamesPlayed < PLACEMENT_GAMES;
  const rangNom = enPlacement ? "Placement" : `${rank.tier.name}${rank.division ? " " + rank.division : ""}`;
  const { moi, devant, derriere } = voisins(board, meRow);
  const defi = openDuels.find((d) => d.incoming && d.status === "pending") ?? null;
  const aJoue = me.gamesPlayed > 0;
  // de l'enjeu : un défi reçu qui attend, ou le palier suivant à 30 points d'ELO ou moins
  // (pas en placement, ni quand la maîtrise bloque le palier) : l'arc électrique court sur la carte
  const palierProche = !enPlacement && !rank.lockedBy && rank.next !== null && rank.pointsToNext !== null && rank.pointsToNext <= 30;
  const enjeu = defi !== null || palierProche;

  // la phrase sous le rang : le palier à gagner, le verrou de maîtrise ou le sommet
  const diagnostic = enPlacement
    ? lignePlacement(me.gamesPlayed, PLACEMENT_GAMES)
    : rank.lockedBy
      ? VERROU
      : rank.next && rank.pointsToNext !== null
        ? CL.plusQue(pointsAvant(rank.pointsToNext, rank.next.name))
        : SOMMET;
  // la piste vers le palier suivant (seulement quand la maîtrise ne bloque pas)
  const piste = !enPlacement && !rank.lockedBy && rank.next !== null && rank.pointsToNext !== null ? { pct: Math.max(4, Math.min(100, rank.progress)), de: rank.tier, vers: rank.next } : null;
  // la seconde phrase : le défi reçu, sinon le rival juste devant (l'écart sur le surligneur)
  const ecart = devant && moi ? Math.max(0, devant.elo - moi.elo) : 0;
  const rivalite: React.ReactNode = !aJoue ? (
    CLASSEMENT.videTexte
  ) : defi ? (
    CL.tAdefie(nom(defi), fmtAgo(defi.createdAt))
  ) : devant ? (
    ecart > 0 ? (
      <>
        <b>{devant.name}</b> {CL.devantMilieu}{" "}
        <span className={s.surligne}>
          <b>{fmtInt(ecart)} ELO</b>
        </span>{" "}
        {CL.devantFin}
      </>
    ) : (
      RIVALITE.egalite(devant.name) + "."
    )
  ) : moi && moi.rank === 1 ? (
    RIVALITE.enTete
  ) : null;
  const lienDefi = defi
    ? { href: `/duel/${defi.id}`, label: CL.releverDefi(nom(defi)) }
    : devant
      ? { href: `/duel?adversaire=${encodeURIComponent(devant.userId)}`, label: CL.defier(devant.name) }
      : { href: "/duel#defier", label: CLASSEMENT.defier };

  const autour = [devant, moi, derriere].filter((r): r is BoardRow => r !== null);
  const elos = [...board, ...(meRow ? [meRow] : [])].map((r) => r.elo);
  const bornes: [number, number] = [Math.min(...elos, me.elo), Math.max(...elos, me.elo)];
  const montrerAutour = aJoue && moi !== null && autour.length > 1;

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
          {/* ——— le diptyque : « Ton rang » (8/12) | « La Grande Salle » (4/12) ——— */}
          <section className={s.diptyque + " rl-in"} aria-label={CL.diptyque}>
            <article data-leonard="rang" className={s.rang + (montrerAutour ? "" : " " + s.rangSeul)} aria-label={CL.rangDomaine}>
              <div className={s.rangGauche}>
                <div className={s.rangEntete}>
                  <p className={s.eyebrow}>{CL.tonRang(dom)}</p>
                  {/* la taille suit la place de la colonne (unités cqi) et la longueur du nom :
                      « Placement » ou « Platine II » tiennent sur une ligne sans déborder sur « Autour de toi » */}
                  <div className="@container min-w-0">
                    <h2 className={"font-brand " + s.nomRang} style={{ fontSize: `clamp(26px, calc((100cqi - 100px) / ${(0.76 * Math.max(rangNom.length, 4)).toFixed(2)}), 68px)` }}>
                      <RankBadge tier={rank.tierIndex} division={enPlacement ? null : rank.division} mastery={me.mastery} size={84} gray={enPlacement} />
                      <span className="min-w-0">{rangNom}</span>
                    </h2>
                  </div>
                  <p className="m-0 text-[14px] text-[color:var(--ink-2)]">
                    {fmtInt(me.elo)} ELO · {ligneRang({ place: me.leaderboardRank, joueurs: me.totalPlayers, maitrise: me.mastery })}
                  </p>
                </div>
                <div className={s.palier}>
                  <p>{diagnostic}</p>
                  {piste && (
                    <>
                      <span className={s.piste} role="img" aria-label={CL.barrePalier(fmtInt(me.elo), piste.vers.name, fmtInt(piste.vers.min))}>
                        <i className={"rl-encre " + s.encre} data-palette={PAL.key} style={{ width: `${piste.pct}%` }} />
                      </span>
                      <span className={s.bornes} aria-hidden>
                        <span>{piste.de.min > 0 ? `${piste.de.name} · ${fmtInt(piste.de.min)}` : piste.de.name}</span>
                        <span>
                          {piste.vers.name} · {fmtInt(piste.vers.min)}
                        </span>
                      </span>
                    </>
                  )}
                </div>
                {rivalite && <p className={s.rivalite}>{rivalite}</p>}
                <div className={s.actions}>
                  <Bouton href="/duel">
                    <Icone nom="duel" size={17} /> {CLASSEMENT.lancer}
                  </Bouton>
                  <Link href={lienDefi.href} className={s.lien}>
                    {lienDefi.label}
                  </Link>
                </div>
              </div>
              {montrerAutour && (
                <div className={s.autour}>
                  <AutourDeToi rows={autour} titre={CL.autour} bornes={bornes} palier={rank.tierIndex} />
                  {events.length > 0 && (
                    <p className={s.bilan} title="Courbe complète dans « Ta courbe », plus bas">
                      <TrendingUp size={15} aria-hidden /> <span>{CL.bilan(signed(total), events.length)}</span>
                    </p>
                  )}
                </div>
              )}
            </article>
            <GrandeSalle data={data} />
            {enjeu && <ArcElectrique palier={rank.tierIndex} rayon={20} />}
          </section>

          {/* ——— la rangée « Duels » (7/12) + « Trouver un adversaire » (5/12) ——— */}
          <div className={s.rangee}>
            <CarteDuels open={openDuels} recent={recentDuels} />
            <section className={[s.carte, s.papier, s.trouver].join(" ")} aria-labelledby="cl-trouver">
              <div className={s.trouverImg} aria-hidden>
                <Illustration nom="joueurs-seigneurie" position="50% 40%" decorative />
              </div>
              <div className={s.trouverCorps}>
                <h2 id="cl-trouver" className={"font-brand " + s.titreMoyen}>
                  <Sceau>
                    <Search size={18} />
                  </Sceau>
                  {CL.trouver}
                </h2>
                <p>{CL.trouverLigne}</p>
                <Bouton href="/people">
                  <Search size={17} aria-hidden /> {CLASSEMENT.chercher}
                </Bouton>
              </div>
            </section>
          </div>

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
