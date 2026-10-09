import Link from "next/link";
import { Icone, type IconeNom } from "@/components/adn/icons";
import { CourbeElo } from "@/components/profil/CourbeEloDifferee";
import { CarnetJours } from "@/components/profil/CarnetJours";
import { JourRelatif } from "@/components/profil/JourRelatif";
import { TIERS, rankFor } from "@/lib/ranks";
import type { EvenementJournal, Journal as DonneesJournal } from "@/lib/profil/journal";
import { signe } from "@/lib/voice";
import { JOURNAL } from "@/lib/voice-profil";

// L'onglet Journal du profil : la courbe d'ELO sur 90 jours (avec le pic et
// les paliers en fond), le carnet de jours et le fil des événements notables
// (victoires en duel, nouveaux paliers, séries), puis les saisons
// (`saisons`). Téléphone : courbe, carnet, fil, saisons, l'un sous l'autre ;
// ordinateur : le fil à gauche (7 colonnes), la courbe, le carnet et les
// saisons à droite (5). Le fil montre ses 6 dernières entrées,
// le reste à la demande. Les dates relatives ne se calculent que dans le
// navigateur (JourRelatif). Sans état : rendu au serveur.

const VISIBLES = 6;

const ICONE: Record<EvenementJournal["type"], IconeNom> = { victoire: "duel", palier: "classement", serie: "serie" };

function Entree({ e, moiId, pied }: { e: EvenementJournal; moiId: string | null; pied: React.ReactNode }) {
  let titre: React.ReactNode;
  let detail: React.ReactNode = null;
  let chiffre: React.ReactNode = null;
  if (e.type === "victoire") {
    // l'adversaire, c'est celui qui regarde : « contre toi », sans lien vers son propre profil
    titre = !e.adversaire ? (
      JOURNAL.victoireSans
    ) : e.adversaire.id === moiId ? (
      JOURNAL.victoireContreToi
    ) : (
      <>
        {JOURNAL.victoireContre}{" "}
        {/* souligné sur téléphone (pas de survol), et 44 px à toucher sans changer la ligne */}
        <Link
          href={`/people/${e.adversaire.id}`}
          className="relative underline underline-offset-2 after:absolute after:-inset-x-1 after:-inset-y-3 after:content-[''] lg:no-underline lg:hover:underline"
        >
          {e.adversaire.nom}
        </Link>
      </>
    );
    detail = e.score ? <span className="font-mono tabular-nums">{JOURNAL.score(e.score[0], e.score[1])}</span> : null;
    chiffre =
      e.delta !== null ? (
        <span className="font-mono text-[13px] font-semibold tabular-nums" style={{ color: e.delta >= 0 ? "var(--gain)" : "var(--perte)" }}>
          {signe(e.delta)}
        </span>
      ) : null;
  } else if (e.type === "palier") {
    titre = JOURNAL.palier(TIERS[e.palier]?.name ?? "");
    detail = JOURNAL.palierTexte;
  } else {
    titre = JOURNAL.serieNotable(e.jours);
    detail = JOURNAL.serieTexte(e.jours);
  }
  return (
    <li className="flex items-start gap-3 border-b border-line py-3 last:border-b-0">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line-2" aria-hidden>
        <Icone nom={ICONE[e.type]} size={16} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="m-0 flex items-baseline justify-between gap-3">
          <span className="min-w-0 text-[14.5px] font-semibold">{titre}</span>
          {chiffre}
        </p>
        {/* la date et son point ne se séparent pas ; le détail suit la ligne */}
        <p className="t-small m-0">
          <span className="whitespace-nowrap">
            <JourRelatif jour={e.jour} />
            {detail ? <span aria-hidden>{" ·"}</span> : null}
          </span>
          {detail ? <> {detail}</> : null}
        </p>
        {pied}
      </div>
    </li>
  );
}

export function Journal({
  journal,
  mastery,
  moi,
  moiId,
  piedEntree,
  saisons,
}: {
  journal: DonneesJournal;
  mastery: number | null;
  moi: boolean;
  /** celui qui regarde : son nom dans le fil devient « toi » */
  moiId: string | null;
  /** sous une entrée du fil : ses tampons */
  piedEntree?: (e: EvenementJournal) => React.ReactNode;
  /** la carte des saisons (SaisonsJournal) : après le fil (téléphone), sous le carnet (ordinateur) */
  saisons?: React.ReactNode;
}) {
  const { courbe, evenements } = journal;
  const pic = courbe.pic !== null ? rankFor(courbe.pic, mastery) : null;
  const premiers = evenements.slice(0, VISIBLES);
  const suite = evenements.slice(VISIBLES);

  return (
    <section className={"grid items-start gap-6 lg:grid-cols-12 lg:gap-8 " + (saisons ? "lg:grid-rows-[auto_1fr]" : "")} aria-labelledby="profil-journal">
      <h2 id="profil-journal" className="sr-only">
        {JOURNAL.titre}
      </h2>

      {/* téléphone : en premier ; ordinateur : la colonne de droite */}
      <div className="flex min-w-0 flex-col gap-4 lg:order-2 lg:col-span-5">
        <div className="card flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="t-eyebrow m-0">{JOURNAL.courbe}</h3>
            {pic && courbe.pic !== null && (
              <span className="font-mono text-[12.5px] font-semibold tabular-nums">{JOURNAL.pic(`${pic.tier.name}${pic.division ? ` ${pic.division}` : ""}`, courbe.pic)}</span>
            )}
          </div>
          {courbe.matchs > 0 ? (
            <>
              <CourbeElo courbe={courbe} />
              {courbe.points.length === 0 && <p className="t-small m-0">{JOURNAL.calme}</p>}
            </>
          ) : (
            <div className="flex flex-col gap-1 py-2">
              <p className="m-0 text-[15px] font-semibold">{JOURNAL.courbeVide}</p>
              <p className="t-small m-0">{JOURNAL.courbeVideTexte}</p>
            </div>
          )}
        </div>
        <div className="card flex flex-col p-5 sm:p-6">
          <CarnetJours jours={journal.jours} aujourdhui={journal.aujourdhui} serie={journal.serie} record={journal.record} />
        </div>
      </div>

      <div className={"card flex min-w-0 flex-col gap-1 p-5 sm:p-6 lg:order-1 lg:col-span-7 " + (saisons ? "lg:row-span-2" : "")}>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="t-eyebrow m-0">{JOURNAL.fil}</h3>
          {evenements.length > 0 && <span className="t-micro">{JOURNAL.filCompte(evenements.length)}</span>}
        </div>
        {evenements.length ? (
          <>
            <ul className="m-0 list-none p-0">
              {premiers.map((e) => (
                <Entree key={e.cle} e={e} moiId={moiId} pied={piedEntree?.(e)} />
              ))}
            </ul>
            {suite.length > 0 && (
              <details className="group">
                <summary className="t-small cursor-pointer list-none py-2 font-semibold text-white group-open:hidden">{JOURNAL.autres(suite.length)}</summary>
                <ul className="m-0 list-none border-t border-line p-0">
                  {suite.map((e) => (
                    <Entree key={e.cle} e={e} moiId={moiId} pied={piedEntree?.(e)} />
                  ))}
                </ul>
              </details>
            )}
          </>
        ) : (
          <p className="t-small m-0 py-3">{moi ? JOURNAL.filVideMoi : JOURNAL.filVide}</p>
        )}
      </div>
      {saisons && <div className="min-w-0 lg:order-3 lg:col-span-5 lg:col-start-8 lg:-mt-4">{saisons}</div>}
    </section>
  );
}
