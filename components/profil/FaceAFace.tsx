import Link from "next/link";
import { Icone } from "@/components/adn/icons";
import { INK } from "@/components/ui/InkDefs";
import { RadarComparable, type MatierePct } from "@/components/profil/RadarComparable";
import { Revanche } from "@/components/profil/Revanche";
import { subjectByKey } from "@/components/reviser/catalog";
import { ecartsMatieres, type DuelCommun, type Ecart, type FaceAFace as Bilan } from "@/lib/profil/face-a-face";
import { nombre, signe } from "@/lib/voice";
import { JOUEURS } from "@/lib/voice-z2a";
import { FACE, dateCourte } from "@/lib/voice-profil";

// L'onglet Face-à-face (profil d'un autre joueur) : le bilan de vos duels
// (« Toi 3 – 2 Theo »), les 5 derniers en bâtons, le dernier, la revanche
// (ou le défi) avec l'enjeu d'ELO, puis vos matières superposées sur le
// radar, ouvert d'office (le détail matière par matière dans un repli), et
// où chacun devance l'autre. Jamais affrontés :
// « Premier duel ? ». Sans état (la revanche est un bouton client).

/**
 * Les derniers duels en bâtons, du plus ancien au plus récent : un bâton
 * d'encre pour une victoire, un bâton gris de crayon pour une défaite, un
 * bâton sec pour un nul (les traits de la série, components/adn/Batons.tsx).
 * Rien sous deux duels : un seul bâton ne dit rien de plus que le dernier.
 */
export function BatonsDuels({ duels, height = 26, className = "" }: { duels: DuelCommun[]; height?: number; className?: string }) {
  const liste = [...duels].reverse();
  if (liste.length < 2) return null;
  const w = liste.length * 17 - 3;
  const dit = liste.map((d) => (d.gagne === null ? FACE.issue.nulle : d.gagne ? FACE.issue.victoire : FACE.issue.defaite)).join(", ");
  return (
    <svg viewBox={`-2 -2 ${w + 4} 52`} height={height} width={(height * (w + 4)) / 52} role="img" aria-label={`${FACE.derniers(liste.length)} : ${dit}`} className={"block overflow-visible " + className}>
      {liste.map((d, i) => (
        <use
          key={d.id}
          href={INK.tally[(i * 3 + 1) % 5]}
          x={i * 17}
          y={0}
          fill={d.gagne ? "currentColor" : "var(--pencil)"}
          filter={d.gagne === null ? INK.dry : undefined}
        />
      ))}
    </svg>
  );
}

const ligneEcarts = (liste: Ecart[]) => (liste.length ? liste.map((e) => FACE.ecart(subjectByKey(e.key)?.short ?? e.key, e.points)).join(" · ") : FACE.nullePart);

export function FaceAFace({
  autreId,
  nom,
  bilan,
  enjeu,
  matieres,
  miennes,
  moyennes,
  accent,
  monAccent,
}: {
  autreId: string;
  nom: string;
  bilan: Bilan;
  /** ce que mon ELO gagne ou perd contre lui (null : inconnu) */
  enjeu: { gain: number; perte: number } | null;
  matieres: MatierePct[];
  miennes: MatierePct[] | null;
  moyennes: Record<string, number | null>;
  accent: string;
  monAccent: string | null;
}) {
  const dernier = bilan.duels[0] ?? null;
  const ecarts = miennes ? ecartsMatieres(matieres, miennes) : null;
  const defier = (
    <Link href={`/duel?adversaire=${encodeURIComponent(autreId)}`} className="btn btn-primary rl-press min-h-[44px]">
      <Icone nom="duel" size={17} /> {JOUEURS.defier(nom)}
    </Link>
  );
  const action = bilan.ouvert ? (
    <Link href={`/duel/${bilan.ouvert}`} className="btn btn-primary rl-press min-h-[44px]">
      <Icone nom="duel" size={17} /> {FACE.reprendre}
    </Link>
  ) : dernier && dernier.gagne === false ? (
    <Revanche adversaire={autreId} duel={dernier.id} className="btn btn-primary rl-press min-h-[44px]" />
  ) : (
    defier
  );

  return (
    <div className="grid items-start gap-6 lg:grid-cols-12 lg:gap-8">
      <div className="flex min-w-0 flex-col gap-4 lg:col-span-5">
        <section className="card flex flex-col gap-5 p-5 sm:p-6" aria-labelledby="face-bilan">
          <h2 id="face-bilan" className="t-eyebrow m-0">
            {FACE.titre}
          </h2>
          {dernier ? (
            <>
              {/* téléphone : les deux noms au-dessus du score, en entier ; plus large : de part et d'autre */}
              <p className="m-0 grid grid-cols-2 items-baseline gap-x-3 gap-y-1.5 text-center sm:flex sm:justify-center" aria-label={FACE.bilanDit(bilan.victoires, bilan.defaites, nom, bilan.nuls)}>
                <span aria-hidden className="min-w-0 break-words text-right text-[15px] font-semibold sm:flex-1 sm:truncate">
                  {FACE.toi}
                </span>
                <span aria-hidden className="t-num col-span-2 row-start-2 text-[44px] leading-none sm:shrink-0">
                  {nombre(bilan.victoires)}
                  <span className="px-2 text-muted">–</span>
                  {nombre(bilan.defaites)}
                </span>
                <span aria-hidden className="min-w-0 break-words text-left text-[15px] font-semibold sm:flex-1 sm:truncate">
                  {nom}
                </span>
              </p>
              {bilan.duels.length > 1 && (
                <div className="flex flex-col items-center gap-1.5">
                  <BatonsDuels duels={bilan.duels.slice(0, 5)} className="text-white" />
                  <span className="t-micro">
                    {FACE.derniers(Math.min(5, bilan.duels.length))}
                    {bilan.nuls ? ` · ${FACE.nuls(bilan.nuls)}` : ""}
                  </span>
                </div>
              )}
              <p className="t-small m-0 flex flex-wrap items-baseline justify-center gap-x-2 border-t border-line pt-4 text-center">
                <span>
                  {FACE.dernier} · {dateCourte(dernier.fin)} · {dernier.gagne === null ? FACE.issue.nulle : dernier.gagne ? FACE.issue.victoire : FACE.issue.defaite}
                  {dernier.monScore !== null && dernier.sonScore !== null ? ` ${nombre(dernier.monScore)}–${nombre(dernier.sonScore)}` : ""}
                </span>
                {dernier.monDelta !== null && (
                  <span className="font-mono font-semibold tabular-nums" style={{ color: dernier.monDelta >= 0 ? "var(--gain)" : "var(--perte)" }}>
                    {signe(dernier.monDelta)}
                  </span>
                )}
                <Link href={`/duel/${dernier.id}?revue=1`} className="inline-flex min-h-[44px] items-center font-semibold underline underline-offset-2 lg:min-h-0 lg:no-underline lg:hover:underline">
                  {FACE.revoir}
                </Link>
              </p>
            </>
          ) : (
            <div className="flex flex-col gap-1">
              <p className="t-h2 m-0">{FACE.premier}</p>
              <p className="t-small m-0">{FACE.premierTexte(nom)}</p>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            {action}
            {enjeu && !bilan.ouvert && (
              <span className="t-micro font-mono tabular-nums" title={FACE.enjeuAide}>
                {FACE.enjeu(enjeu.gain, enjeu.perte)}
              </span>
            )}
          </div>
          {bilan.ouvert && <p className="t-micro m-0 text-center">{FACE.enCours}</p>}
        </section>
        {ecarts && (
          <dl className="card-quiet m-0 grid gap-2 px-4 py-3.5 text-[14px]">
            {ecarts.communes === 0 ? (
              <dd className="t-small m-0">{FACE.rienEnCommun}</dd>
            ) : (
              <>
                <div className="flex flex-wrap gap-x-2">
                  <dt className="font-semibold">{FACE.teDevance(nom)}</dt>
                  <dd className="m-0 font-mono text-[13px] tabular-nums" style={{ color: "var(--perte)" }}>
                    {ligneEcarts(ecarts.ilDevance)}
                  </dd>
                </div>
                <div className="flex flex-wrap gap-x-2">
                  <dt className="font-semibold">{FACE.tuDevances(nom)}</dt>
                  <dd className="m-0 font-mono text-[13px] tabular-nums" style={{ color: "var(--gain)" }}>
                    {ligneEcarts(ecarts.tuDevances)}
                  </dd>
                </div>
              </>
            )}
          </dl>
        )}
      </div>

      {/* sans aucune matière mesurée chez lui, le radar n'aurait rien à superposer : la carte des écarts le dit */}
      {matieres.some((m) => m.pct !== null) && (
        <div className="min-w-0 lg:col-span-7">
          <RadarComparable matieres={matieres} moyennes={moyennes} accent={accent} nom={nom} moi={false} miennes={miennes} monAccent={monAccent} comparaison />
        </div>
      )}
    </div>
  );
}
