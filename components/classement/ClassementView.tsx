import Link from "next/link";
import { ArrowRight, Search, TrendingUp } from "lucide-react";
import { Icone } from "@/components/adn/icons";
import { RankBadge } from "@/components/ui/RankBadge";
import { BandeEncre } from "@/components/ui/BandeEncre";
import { CarteLieu } from "@/components/ui/CarteLieu";
import { Illustration } from "@/components/ui/Illustration";
import { BandeauPeint, Medaillon, Sceau, TuileCalme } from "@/components/ui/Tuiles";
import { Leaderboard } from "@/components/classement/Leaderboard";
import { TierTrack } from "@/components/classement/TierTrack";
import { AutourDeToi } from "@/components/classement/AutourDeToi";
import { EloChart } from "@/components/classement/EloChart";
import { Disclosure } from "@/components/classement/Disclosure";
import { DomainPills, HowItWorks } from "@/components/classement/Domains";
import type { TabKey } from "@/components/classement/ClassementTabs";
import { daysUntil, fmtAgo, fmtDay, fmtDuration, fmtHour, fmtInt, fmtLongDate, fmtShortDate, signed } from "@/components/classement/format";
import type { BoardRow, ClassementData } from "@/components/classement/types";
import type { DuelSummary } from "@/lib/rating";
import { CURRENT_DOMAIN } from "@/lib/domains";
import { PLACEMENT_GAMES, rankFor } from "@/lib/ranks";
import { DUEL_REVIEW_DAYS, reviewLeftLabel } from "@/lib/duels";
import { placement as lignePlacement, pointsAvant, scorePct, SOMMET, VERROU } from "@/lib/voice";
import { CLASSEMENT, RIVALITE, coteProchain, ligneRang, partiesClassees } from "@/lib/voice-z2a";
import { CL } from "@/lib/voice-classement";

export const CLASSEMENT_TABS: TabKey[] = ["classement", "duels", "examens"];

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

/** Tuile « Duels en cours » : la partie à reprendre, sinon le défi envoyé qui attend. */
function TuileEnCours({ open }: { open: DuelSummary[] }) {
  const actif = open.find((d) => d.status === "active");
  const envoye = open.find((d) => !d.incoming && d.status === "pending" && d.opponentId);
  return (
    <TuileCalme
      label="Duels en cours"
      icone={<Icone nom="duel" size={19} />}
      titre={CL.enCours}
      droite={open.length > 0 ? <span className="t-micro font-mono">{open.length}</span> : null}
      fort={
        <span className="flex items-center gap-3">
          <Medaillon nom="classement-duels" position="50% 28%" />
          {actif ? CL.contre(nom(actif)) : envoye ? CL.pasEncoreJoue(nom(envoye)) : CL.aucunEnCours}
        </span>
      }
      ligne={actif ? CL.partieOuverte : envoye ? CL.defiEnvoye(fmtAgo(envoye.createdAt)) : CL.enCoursVideLigne}
      actions={
        <>
          {actif && (
            <Link href={`/duel/${actif.id}`} className="btn btn-secondary rl-press min-h-[38px] px-3.5 text-[13.5px]">
              {CL.reprendre} <ArrowRight size={15} aria-hidden />
            </Link>
          )}
          <Link href="/duel" className="ink-link">
            {CLASSEMENT.tousDuels}
          </Link>
        </>
      }
    />
  );
}

/** Tuile « À revoir » : les duels finis dont la revue est encore ouverte. */
function TuileRevoir({ recent }: { recent: DuelSummary[] }) {
  const now = new Date().toISOString();
  const n = recent.filter((d) => d.status === "finished" && d.finishedAt && reviewLeftLabel(d.finishedAt, now) !== null).length;
  return (
    <TuileCalme
      label="À revoir"
      icone={<Icone nom="erreurs" size={19} />}
      titre={CL.aRevoir}
      droite={<span className="t-micro font-mono">{DUEL_REVIEW_DAYS} j</span>}
      fort={n > 0 ? CL.aRelire(n) : CL.rienARevoir}
      ligne={n > 0 ? CL.aRevoirLigne(DUEL_REVIEW_DAYS) : CLASSEMENT.aRevoirVide(DUEL_REVIEW_DAYS)}
      actions={
        <Link href="/duel" className="ink-link">
          {CL.revoirDuels}
        </Link>
      }
    />
  );
}

/** La Grande Salle : la carte « lieu » de l'examen classé (le prochain, ou rien de prévu). */
function GrandeSalle({ data }: { data: ClassementData }) {
  const { exam, pastExams } = data;
  const dernier = pastExams.find((e) => e.score !== null);
  let sousTitre: string = CL.salleVideSous;
  let etat: React.ReactNode = (
    <>
      {CLASSEMENT.examenVide}. {CLASSEMENT.examenVideTexte}
    </>
  );
  let action: { href: string; label: string } = { href: "/mock-exams", label: CL.voirExamens };
  if (exam) {
    const jours = daysUntil(exam.scheduledAt);
    const draft = exam.status === "draft";
    const inscrits =
      exam.registrants === null ? (draft ? "inscriptions bientôt ouvertes" : null) : exam.registrants === 0 ? "aucun inscrit" : `${exam.registrants} inscrit${exam.registrants > 1 ? "s" : ""}`;
    const repere = exam.windowOpen ? `ouvert jusqu'au ${fmtShortDate(exam.windowEnd)}` : jours > 0 ? `J-${jours}` : null;
    sousTitre = CL.salleSous(exam.questionCount, fmtDuration(exam.durationMinutes));
    etat = (
      <>
        {majuscule(fmtDay(exam.scheduledAt))} à {fmtHour(exam.scheduledAt)}
        {[repere, inscrits].filter(Boolean).map((x) => ` · ${x}`)}. {CL.ilFaitBouger}
        {dernier && ` ${CL.dernierExamen(scorePct(dernier.score as number, dernier.total ?? dernier.questionCount), dernier.delta !== null ? signed(dernier.delta) : null)}`}
      </>
    );
    action = {
      href: `/mock-exams/${exam.id}`,
      label: exam.registered ? (exam.windowOpen ? CL.passer : CL.inscritVoir) : draft ? CL.voirExamen : CL.jeMinscris,
    };
  }
  return (
    <CarteLieu
      className="lg:col-span-4 lg:col-start-9 lg:row-start-1"
      label={CL.salle}
      visuel={<Illustration nom="classement-grande-salle" position="50% 60%" />}
      vignette={<Illustration nom="classement-grande-salle" position="50% 60%" decorative />}
      marque={
        <Sceau>
          <Icone nom="examen" size={20} />
        </Sceau>
      }
      nom={CL.salle}
      sousTitre={sousTitre}
      etat={etat}
      action={action}
    />
  );
}

// Espace « Classement » (refonte, variante « Ton rang ») : le rang est le
// héros — l'insigne en grand, la place, le prochain palier, le duel à
// lancer et ceux qui t'entourent ; à droite la carte « lieu » La Grande
// Salle (l'examen classé). Dessous : duels en cours et à revoir, la bande
// « Trouver un adversaire », le classement général sous un bandeau peint, la
// courbe d'ELO repliée et, repliés en bas, les 8 rangs et les règles.
// Composant de présentation : toutes les données arrivent en props.
export function ClassementView({ data }: { data: ClassementData; /** ancien paramètre des onglets, sans effet */ tab?: TabKey }) {
  const { me, history, board, meRow, openDuels, recentDuels } = data;
  const dom = CURRENT_DOMAIN.name;
  const rank = rankFor(me.elo, me.mastery, me.leaderboardRank);
  const enPlacement = me.gamesPlayed < PLACEMENT_GAMES;
  const rangNom = enPlacement ? "Placement" : `${rank.tier.name}${rank.division ? " " + rank.division : ""}`;
  const { moi, devant, derriere } = voisins(board, meRow);
  const defi = openDuels.find((d) => d.incoming && d.status === "pending") ?? null;
  const aJoue = me.gamesPlayed > 0;

  // la phrase sous le rang : le palier à gagner, le verrou de maîtrise ou le sommet
  const diagnostic = enPlacement
    ? lignePlacement(me.gamesPlayed, PLACEMENT_GAMES)
    : rank.lockedBy
      ? VERROU
      : rank.next && rank.pointsToNext !== null
        ? CL.plusQue(pointsAvant(rank.pointsToNext, rank.next.name))
        : SOMMET;
  // la seconde phrase : le défi reçu, sinon le rival juste devant
  const ecart = devant && moi ? Math.max(0, devant.elo - moi.elo) : 0;
  const rivalite = !aJoue
    ? CLASSEMENT.videTexte
    : defi
      ? CL.tAdefie(nom(defi), fmtAgo(defi.createdAt))
      : devant
        ? ecart > 0
          ? CL.devant(devant.name, ecart)
          : RIVALITE.egalite(devant.name) + "."
        : moi && moi.rank === 1
          ? RIVALITE.enTete
          : null;
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

  return (
    <div className="rl-wide rl-page">
      <div className="flex flex-col gap-7 md:gap-10">
        <header className="flex min-w-0 flex-col gap-3">
          <p className="t-small flex items-center gap-2 font-semibold">
            <Icone nom="classement" size={18} />
            <span>{CL.kicker(dom)}</span>
          </p>
          <h1 className="t-hero rl-in m-0">{CL.titre}</h1>
          <DomainPills me={me} />
        </header>

        <div className="flex flex-col gap-4 md:gap-[18px]">
          <div className="grid gap-4 md:gap-[18px] lg:grid-cols-12">
            <div className="flex min-w-0 flex-col gap-4 md:gap-[18px] lg:col-span-8">
              <section
                data-leonard="rang"
                className={"card-hero rl-in grid min-h-[260px] min-w-0 gap-x-8 gap-y-5 p-6 md:p-8 " + (montrerAutour ? "md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]" : "")}
                aria-label="Ton rang"
              >
                <div className="flex min-w-0 flex-col gap-4">
                  <div className="@container flex min-w-0 flex-col gap-2">
                    <p className="t-eyebrow">{CL.tonRang(dom)}</p>
                    {/* la taille suit la place de la colonne (unités cqi) et la longueur du nom :
                        « Placement » ou « Platine II » tiennent sur une ligne sans déborder sur « Autour de toi » */}
                    <h2
                      className="font-brand m-0 flex min-w-0 items-center gap-3 leading-[0.95]"
                      style={{ fontSize: `clamp(26px, calc((100cqi - 100px) / ${(0.76 * Math.max(rangNom.length, 4)).toFixed(2)}), 68px)` }}
                    >
                      <RankBadge tier={rank.tierIndex} division={enPlacement ? null : rank.division} mastery={me.mastery} size={84} gray={enPlacement} />
                      <span className="min-w-0">{rangNom}</span>
                    </h2>
                    <p className="t-micro m-0">
                      {fmtInt(me.elo)} ELO · {ligneRang({ place: me.leaderboardRank, joueurs: me.totalPlayers, maitrise: me.mastery })}
                    </p>
                  </div>
                  <div className="grid gap-1.5">
                    <p className="t-body m-0 max-w-[460px] text-muted">{diagnostic}</p>
                    {rivalite && <p className="t-small m-0 max-w-[460px]">{rivalite}</p>}
                  </div>
                  <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-1">
                    <Link href="/duel" className="btn btn-primary rl-press w-fit max-md:min-h-[44px]">
                      <Icone nom="duel" size={17} /> {CLASSEMENT.lancer}
                    </Link>
                    <Link href={lienDefi.href} className="ink-link inline-flex items-center gap-1 text-[13px] font-semibold">
                      {lienDefi.label} <ArrowRight size={13} aria-hidden />
                    </Link>
                  </div>
                </div>
                {montrerAutour && (
                  <div className="flex min-w-0 flex-col gap-3">
                    <AutourDeToi rows={autour} titre={CL.autour} bornes={bornes} />
                    {events.length > 0 && (
                      <p className="t-micro m-0 mt-auto flex items-center gap-1.5 px-2" title="Courbe complète dans « Ta courbe », plus bas">
                        <TrendingUp size={13} aria-hidden /> {CL.bilan(signed(total), events.length)}
                      </p>
                    )}
                  </div>
                )}
              </section>
              <div className="rl-in grid gap-4 md:gap-[18px] lg:grow xl:grid-cols-2" style={{ animationDelay: ".06s" }}>
                <TuileEnCours open={openDuels} />
                <TuileRevoir recent={recentDuels} />
              </div>
            </div>
            <GrandeSalle data={data} />
          </div>
          <BandeEncre icone={<Search size={22} />} titre={CL.trouver} ligne={CL.trouverLigne} action={{ href: "/people", label: CLASSEMENT.chercher }} />
        </div>
      </div>

      <section className="rl-section" aria-labelledby="cl-tableau">
        <BandeauPeint nom="classement-lice" position="50% 42%" />
        <h2 id="cl-tableau" className="t-h2 m-0">
          {CL.general}
        </h2>
        <Leaderboard board={board} meRow={meRow} totalPlayers={me.totalPlayers} sobre />
      </section>

      <section className="rl-section" aria-labelledby="cl-courbe">
        <h2 id="cl-courbe" className="t-h2 m-0">
          {CL.courbe}
        </h2>
        {events.length ? (
          <Disclosure title={CL.courbeDepuis(signed(total), fmtLongDate(events[0].createdAt))} hint={CL.courbeHint(partiesClassees(events.length))}>
            <EloChart events={events} cap={cap} />
          </Disclosure>
        ) : (
          <p className="t-small m-0">{CLASSEMENT.courbeVide}</p>
        )}
      </section>

      <div>
        <Disclosure title={CLASSEMENT.rangs} hint={enPlacement ? CLASSEMENT.rangsPlacement : `${CLASSEMENT.rangsSous} Tu es ${rangNom}.`}>
          <TierTrack current={rank.tierIndex} mastery={me.mastery} placement={enPlacement} />
        </Disclosure>
        <Disclosure title={CLASSEMENT.regles} hint={CLASSEMENT.reglesSous}>
          <HowItWorks />
        </Disclosure>
      </div>
    </div>
  );
}
