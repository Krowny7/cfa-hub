import Link from "next/link";
import { TYPES_EPREUVE, type EpreuveCommune, type EpreuvesCommunes as Donnees } from "@/lib/profil/epreuves-communes";
import { COMMUNES, dateCourte, jourCourt } from "@/lib/voice-profil";

// Le haut de l'onglet Face-à-face : toutes les épreuves faites par les deux
// joueurs avec les mêmes questions. Le bilan général en une phrase, le bilan
// par épreuve (défi du jour, 5 du jour, examen blanc, duel), les cinq
// dernières épreuves communes (vos deux copies, en points et en pourcentage,
// et qui l'emporte), le reste dans un repli. Sans état.

const RECENTES = 5;

const couleur = (e: EpreuveCommune) => (e.issue === "victoire" ? "var(--gain)" : e.issue === "defaite" ? "var(--perte)" : undefined);

function Ligne({ e, nom }: { e: EpreuveCommune; nom: string }) {
  const type = COMMUNES.type[e.type];
  const date = e.jour ? jourCourt(e.date) : dateCourte(e.date);
  const mienne = COMMUNES.copie(e.monScore, e.total);
  const sienne = COMMUNES.copie(e.sonScore, e.total);
  const issue = COMMUNES.issue[e.issue];
  const titre = e.titre && e.type === "examen" ? e.titre : null;
  return (
    <li
      className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-0.5 border-t border-line py-2.5 first:border-t-0 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_minmax(0,1fr)_4.5rem]"
      aria-label={COMMUNES.ligneDit(type, date, mienne, sienne, nom, issue)}
    >
      <span aria-hidden className="min-w-0 truncate text-[14px]">
        {e.href ? (
          <Link href={e.href} className="font-semibold underline-offset-2 hover:underline" title={titre ?? undefined}>
            {type}
          </Link>
        ) : (
          <span className="font-semibold">{type}</span>
        )}
        <span className="t-micro"> · {date}</span>
      </span>
      <span aria-hidden className="text-right text-[13px] font-semibold sm:order-last" style={{ color: couleur(e) }}>
        {issue}
      </span>
      <span aria-hidden className="min-w-0 truncate font-mono text-[13px] tabular-nums">
        <span className="font-sans font-semibold">{COMMUNES.toi}</span> {mienne}
      </span>
      <span aria-hidden className="min-w-0 truncate text-right font-mono text-[13px] tabular-nums text-muted sm:text-left">
        <span className="font-sans font-semibold">{nom}</span> {sienne}
      </span>
    </li>
  );
}

export function EpreuvesCommunes({ donnees, nom, className = "" }: { donnees: Donnees; nom: string; className?: string }) {
  const { epreuves, parType, general } = donnees;
  const recentes = epreuves.slice(0, RECENTES);
  const reste = epreuves.slice(RECENTES);
  return (
    <section className={"card flex flex-col gap-4 p-5 sm:p-6 " + className} aria-labelledby="face-communes">
      <div className="flex flex-col gap-1">
        <h2 id="face-communes" className="t-eyebrow m-0">
          {COMMUNES.titre}
        </h2>
        {general.total > 0 ? (
          <p className="m-0 text-[17px] font-semibold leading-snug">{COMMUNES.general(general.total, general.victoires, general.defaites, nom, general.nuls)}</p>
        ) : (
          <>
            <p className="m-0 text-[17px] font-semibold leading-snug">{COMMUNES.aucune(nom)}</p>
            <p className="t-small m-0">{COMMUNES.aucuneTexte}</p>
          </>
        )}
      </div>

      {general.total > 0 && (
        <>
          <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-4">
            {TYPES_EPREUVE.map((t) => {
              const b = parType[t];
              const n = b.victoires + b.defaites + b.nuls;
              return (
                <li key={t} className="card-quiet flex flex-col gap-0.5 px-3 py-2.5">
                  <span className="t-micro">{COMMUNES.type[t]}</span>
                  {n > 0 ? (
                    <>
                      <span className="t-num text-[22px] leading-tight" aria-label={COMMUNES.general(n, b.victoires, b.defaites, nom, b.nuls)}>
                        {COMMUNES.score(b.victoires, b.defaites)}
                      </span>
                      <span className="t-micro">{b.nuls ? COMMUNES.egalites(b.nuls) : `${COMMUNES.toi} – ${nom}`}</span>
                    </>
                  ) : (
                    <span className="t-num text-[22px] leading-tight text-muted">{COMMUNES.jamais}</span>
                  )}
                </li>
              );
            })}
          </ul>

          {recentes.length > 0 && (
            <div className="flex flex-col gap-1">
              <h3 className="t-eyebrow m-0">{COMMUNES.recentes}</h3>
              <ol className="m-0 list-none p-0">
                {recentes.map((e) => (
                  <Ligne key={e.cle} e={e} nom={nom} />
                ))}
              </ol>
              {reste.length > 0 && (
                <details className="group">
                  <summary className="inline-flex min-h-[44px] cursor-pointer list-none items-center text-[14px] font-semibold underline underline-offset-2 lg:min-h-[32px] [&::-webkit-details-marker]:hidden">
                    {COMMUNES.voirTout(epreuves.length)}
                  </summary>
                  <ol className="m-0 list-none border-t border-line p-0">
                    {reste.map((e) => (
                      <Ligne key={e.cle} e={e} nom={nom} />
                    ))}
                  </ol>
                </details>
              )}
            </div>
          )}
          <p className="t-micro m-0">{COMMUNES.aide}</p>
        </>
      )}
    </section>
  );
}
