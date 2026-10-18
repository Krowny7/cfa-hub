import { Trophy } from "lucide-react";
import { CaseTrophee, ParSource } from "@/components/trophees/SalleDesTrophees";
import type { DonneesBlocs, ResumeTrophees } from "@/lib/profil/blocs-donnees";
import type { Format } from "@/lib/profil/disposition";
import { ecart, type Ecart } from "@/lib/profil/ecart";
import { PALIERS_TROPHEE, compter, type PalierTrophee } from "@/lib/trophees";
import { nombre } from "@/lib/voice";
import { BLOCS_PROFIL as T } from "@/lib/voice-blocs";
import { BLOCS_CHIFFRES as V } from "@/lib/voice-blocs-chiffres";
import { Cellule, Chiffre, Coque, DemiBande, Etiquette, Jeton, Repere, Vide, type Ctx } from "./commun";
import { scoreVisible } from "./Chiffres";
import t from "./Trophees.module.css";

// Le bloc « Trophées » (trophees). Chez un autre : son total en chiffre
// fort, ton jeton (« toi −5 »), le score sur les 4 métaux (« toi 1 – 3 »)
// et les 4 cases (Diamant, Or, Argent, Bronze) : le dessin, son nombre, ton
// jeton court ; le nom du métal passe en infobulle. Une lecture partielle,
// de son côté ou du tien : ni jeton ni score. Chez soi : la Salle d'avant
// (le total en repère, les 4 cases nommées, « Par source »).

const ICONE = <Trophy size={17} aria-hidden />;
/** du plus haut au plus bas : Diamant, Or, Argent, Bronze */
const METAUX = [...PALIERS_TROPHEE].reverse();
/** la case du dessin de chaque format (px, en classes du site) ; le trophée y est dessiné à 55 % */
const CASE: Record<Format, { px: number; classe: string }> = {
  tuile: { px: 28, classe: "h-7 w-7" },
  colonne: { px: 48, classe: "h-12 w-12" },
  heros: { px: 56, classe: "h-14 w-14" },
  bande: { px: 56, classe: "h-14 w-14" },
  demi: { px: 32, classe: "h-8 w-8" },
};
const dessin = (f: Format) => Math.round(CASE[f].px * 0.55);
/** le nombre d'un métal, selon le format */
const TAILLE_NOMBRE: Record<Format, number> = { tuile: 20, colonne: 26, heros: 26, bande: 26, demi: 30 };

/** Le bloc Trophées, à son format, dans sa vue. Sans lecture : rien (son état vide dans Personnaliser). */
export function TropheesBloc({ d, f, edition }: Ctx): React.ReactNode {
  const res = d.trophees;
  if (!res) return edition ? <Vide bloc={{ k: "trophees", f }} f={f} icone={ICONE} /> : null;
  return d.moi ? <ChezSoi d={d} f={f} res={res} /> : <ChezAutre d={d} f={f} res={res} />;
}

type Metal = { palier: PalierTrophee; nom: string; lui: number; toi: number | null; e: Ecart | null; zero: boolean; bulle: string };

function ChezAutre({ d, f, res }: { d: DonneesBlocs; f: Format; res: ResumeTrophees }) {
  const { total, parPalier } = compter(res.lignes);
  const sien = d.toi?.trophees ?? null;
  // on ne compare que deux lectures complètes
  const comparer = !!sien && res.complet && sien.complet;
  const incomplete = (!!sien && !comparer) || (!!d.apercu && !d.toi && !res.complet);
  const e = comparer && sien ? ecart(total, sien.total, "compte") : null;
  const bulle = e && sien ? T.bulle(V.trophees, d.nom, nombre(total), nombre(sien.total)) : undefined;
  const metaux: Metal[] = METAUX.map(({ palier, nom }) => {
    const lui = parPalier[palier];
    const toi = comparer && sien ? (sien.parPalier[palier] ?? 0) : null;
    // une case à 0 des deux côtés : estompée, sans jeton (et hors du score)
    const zero = lui === 0 && (toi ?? 0) === 0;
    return { palier, nom, lui, toi, zero, e: toi !== null && !zero ? ecart(lui, toi, "compte") : null, bulle: toi !== null ? T.bulle(nom, d.nom, nombre(lui), nombre(toi)) : V.metalSeul(nom, d.nom, lui) };
  });
  const sc = scoreVisible(
    d,
    metaux.map((m) => m.e),
    res.complet ? METAUX.length : 0,
  );
  // en aperçu, « toi ± » seulement si sa lecture est complète
  const jeton = res.complet ? <Jeton e={e} d={d} bulle={bulle} taille={f === "tuile" || f === "demi" ? undefined : 16} /> : null;
  const titre = incomplete ? V.comparaisonIncomplete : undefined;
  const court = (m: Metal) => <Jeton e={m.e} d={d} bulle={m.bulle} forme="court" taille={12} />;

  if (f === "demi")
    return (
      <DemiBande label={V.trophees} droite={sc ?? undefined}>
        <Cellule etiquette={V.trophees} chiffre={nombre(total)} titre={titre} jeton={jeton ?? undefined} />
        {metaux.map((m) => (
          <Cellule
            key={m.palier}
            titre={m.bulle}
            etiquette={<CaseTrophee palier={m.palier} gagne={m.lui > 0} taille={dessin(f)} className={CASE[f].classe + (m.zero ? " " + t.tenue : "")} />}
            chiffre={<span className={m.zero ? t.tenue : undefined}>{nombre(m.lui)}</span>}
            jeton={court(m)}
          />
        ))}
      </DemiBande>
    );

  const chiffre = (
    <div className="flex flex-col gap-1">
      <Chiffre f={f} titre={titre}>
        {nombre(total)}
      </Chiffre>
      {jeton}
    </div>
  );
  const carte = f !== "tuile";
  const cases = (
    <ul className={"m-0 list-none p-0 " + (f === "tuile" ? t.ligne4 : f === "colonne" ? t.quatre : t.quatre + " " + t.quatreLigne)} aria-label={V.parPalier}>
      {metaux.map((m) => (
        <li key={m.palier} className={t.case + (carte ? " card-soft " + t.carte : "") + (m.zero ? " " + t.tenue : "")} title={m.bulle} aria-label={m.bulle}>
          <CaseTrophee palier={m.palier} gagne={m.lui > 0} taille={dessin(f)} className={CASE[f].classe} />
          <span className={t.nombres}>
            <span className="t-num leading-none tabular-nums" style={{ fontSize: TAILLE_NOMBRE[f] }}>
              {nombre(m.lui)}
            </span>
            {court(m)}
          </span>
        </li>
      ))}
    </ul>
  );
  const parSource = f === "colonne" || f === "bande" ? <ParSource lignes={res.lignes} complet={res.complet} className="mt-auto" /> : null;
  return (
    <Coque f={f} label={V.trophees}>
      <Etiquette f={f} icone={ICONE} titre={V.trophees} droite={sc ?? undefined} />
      {f === "heros" || f === "bande" ? (
        // le chiffre à gauche, les 4 cases sur une ligne
        <div className={t.cote}>
          {chiffre}
          {cases}
        </div>
      ) : (
        <>
          {chiffre}
          {cases}
        </>
      )}
      {parSource}
    </Coque>
  );
}

function ChezSoi({ d, f, res }: { d: DonneesBlocs; f: Format; res: ResumeTrophees }) {
  const { total, parPalier } = compter(res.lignes);

  if (f === "demi")
    // Trophées, puis les 4 métaux nommés
    return (
      <DemiBande label={V.trophees}>
        <Cellule etiquette={V.trophees} chiffre={nombre(total)} />
        {METAUX.map(({ palier, nom }) => (
          <Cellule
            key={palier}
            etiquette={nom}
            chiffre={
              <span className={t.metalDemi + (parPalier[palier] === 0 ? " " + t.tenue : "")}>
                <CaseTrophee palier={palier} gagne={parPalier[palier] > 0} taille={14} className="h-6 w-6" />
                {nombre(parPalier[palier])}
              </span>
            }
          />
        ))}
      </DemiBande>
    );

  // la Salle d'avant : le total en repère, les 4 cases nommées (2 × 2, puis sur une ligne en héros et en bande), « Par source »
  return (
    <Coque f={f} label={V.trophees}>
      <Etiquette f={f} icone={ICONE} titre={V.trophees} droite={total > 0 ? <Repere>{nombre(total)}</Repere> : undefined} />
      {total === 0 ? (
        <p className="t-small m-0">{res.complet ? V.aucunMoiComplet : V.aucunMoi}</p>
      ) : (
        <ul className={"m-0 list-none p-0 " + t.quatre + " " + (f === "heros" || f === "bande" ? t.quatreLigne : "")}>
          {METAUX.map(({ palier, nom }) => (
            <li key={palier} className={"card-soft flex min-w-0 items-center gap-3 px-3.5 py-3 " + (parPalier[palier] === 0 ? "opacity-50" : "")}>
              <CaseTrophee palier={palier} gagne={parPalier[palier] > 0} className="h-9 w-9" />
              <span className="flex min-w-0 flex-col">
                <span className="t-num text-[24px] leading-none">{nombre(parPalier[palier])}</span>
                <span className="t-micro truncate">{nom}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto">
        <ParSource lignes={res.lignes} complet={res.complet} className="" />
      </div>
    </Coque>
  );
}
