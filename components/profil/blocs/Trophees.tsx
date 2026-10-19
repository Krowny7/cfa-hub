import { Trophy } from "lucide-react";
import { CaseTrophee, ParSource } from "@/components/trophees/SalleDesTrophees";
import type { DonneesBlocs, ResumeTrophees } from "@/lib/profil/blocs-donnees";
import type { Format } from "@/lib/profil/disposition";
import { TIERS } from "@/lib/ranks";
import { PALIERS_TROPHEE, compter, type PalierTrophee } from "@/lib/trophees";
import { nombre } from "@/lib/voice";
import { BLOCS_CHIFFRES as V } from "@/lib/voice-blocs-chiffres";
import { Cellule, Coque, DemiBande, Vide, type Ctx } from "./commun";
import t from "./Trophees.module.css";

// Le bloc « Trophées » (trophees) : « Médailles ». Le total, puis les 4 métaux
// (Diamant, Or, Argent, Bronze) en cartes : la médaille, son nombre, le nom du
// métal. Un métal gagné prend ses couleurs (celles des rangs du site : la
// médaille et la carte teintée) et un éclat lent passe sur sa médaille ; un
// métal à 0 reste gris, estompé. Aucune comparaison : le même dessin chez soi,
// chez un autre et en aperçu (seule la phrase d'amorce, quand le joueur dont
// c'est la page n'a encore rien gagné, lui est réservée). « Par source »
// reste au pied de la colonne et de la bande.

const ICONE = <Trophy size={17} aria-hidden />;
/** du plus haut au plus bas : Diamant, Or, Argent, Bronze */
const METAUX = [...PALIERS_TROPHEE].reverse();
const GRIS = ["#ffffff", "#bcc1c7", "#686e75"] as const;
/** les couleurs d'un métal : celles du rang du même nom (clair, moyen, sombre) */
const COULEURS = new Map(PALIERS_TROPHEE.map(({ palier, cle }) => [palier, TIERS.find((x) => x.key === cle)?.metal ?? GRIS]));
/** les variables du métal (--m1 clair, --m2 moyen, --m3 sombre), posées sur la carte ou sur la médaille */
function teinte(p: PalierTrophee): React.CSSProperties {
  const [m1, m2, m3] = COULEURS.get(p) ?? GRIS;
  return { ["--m1" as string]: m1, ["--m2" as string]: m2, ["--m3" as string]: m3 };
}
/** La médaille : la case du trophée, ronde, aux couleurs du métal s'il est gagné (avec son éclat), pointillée et grise sinon. Sa taille : --m. */
function Medaille({ palier, gagne, taille = 22 }: { palier: PalierTrophee; gagne: boolean; taille?: number }) {
  return (
    <span className={t.teinte} style={gagne ? teinte(palier) : undefined}>
      <CaseTrophee palier={palier} gagne={gagne} taille={taille} className={t.medaille + " " + (gagne ? t.gagne : t.vide)} />
    </span>
  );
}

/** Le bloc Trophées, à son format. Sans lecture : rien (son état vide dans Personnaliser). */
export function TropheesBloc({ d, f, edition }: Ctx): React.ReactNode {
  const res = d.trophees;
  if (!res) return edition ? <Vide bloc={{ k: "trophees", f }} f={f} icone={ICONE} /> : null;
  return <Medailles d={d} f={f} res={res} />;
}

function Medailles({ d, f, res }: { d: DonneesBlocs; f: Format; res: ResumeTrophees }) {
  const { total, parPalier } = compter(res.lignes);

  if (f === "demi")
    // Trophées, puis les 4 métaux nommés, chacun avec sa petite médaille
    return (
      <DemiBande label={V.trophees}>
        <Cellule etiquette={V.trophees} chiffre={nombre(total)} />
        {METAUX.map(({ palier, nom }) => (
          <Cellule
            key={palier}
            etiquette={nom}
            titre={V.metalSeul(nom, d.nom, parPalier[palier])}
            chiffre={
              <span className={t.metalDemi + (parPalier[palier] === 0 ? " " + t.tenue : "")}>
                <Medaille palier={palier} gagne={parPalier[palier] > 0} taille={14} />
                {nombre(parPalier[palier])}
              </span>
            }
          />
        ))}
      </DemiBande>
    );

  // chez soi, rien gagné : la phrase d'amorce à la place des cartes à zéro
  const amorce = d.moi && total === 0 ? (res.complet ? V.aucunMoiComplet : V.aucunMoi) : null;
  return (
    <Coque f={f} label={V.trophees} className={t[f]}>
      <div className={t.corps + (amorce ? " " + t.rien : "")}>
        <h3 className={"t-eyebrow m-0 " + t.lab}>{V.trophees}</h3>
        <b className={"t-num tabular-nums " + t.total}>{nombre(total)}</b>
        {amorce ? (
          <p className={"t-small m-0 " + t.amorce}>{amorce}</p>
        ) : (
          <ul className={t.cases} aria-label={V.parPalier}>
            {METAUX.map(({ palier, nom }, i) => {
              const n = parPalier[palier];
              return (
                <li
                  key={palier}
                  className={"card-soft " + t.case + (n > 0 ? " " + t.carteMetal : " " + t.tenue)}
                  style={{ ...(n > 0 ? teinte(palier) : {}), ["--k" as string]: i } as React.CSSProperties}
                  title={V.metalSeul(nom, d.nom, n)}
                >
                  <Medaille palier={palier} gagne={n > 0} />
                  <span className={"t-num tabular-nums " + t.nombre}>{nombre(n)}</span>
                  <span className={t.metal}>{nom}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {f === "colonne" || f === "bande" ? <ParSource lignes={res.lignes} complet={res.complet} className="mt-auto" /> : null}
    </Coque>
  );
}
