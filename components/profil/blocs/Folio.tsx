import { Feather } from "lucide-react";
import { CarteFolio, type DonneesFolio } from "@/components/profil/Folio";
import type { DonneesBlocs } from "@/lib/profil/blocs-donnees";
import type { Format } from "@/lib/profil/disposition";
import { BLOCS_PROFIL as T } from "@/lib/voice-blocs";
import { BLOCS_RADAR as R } from "@/lib/voice-blocs-radar";
import { Cellule, Coque, DemiBande, Detail, Etiquette, type Ctx } from "./commun";
import fl from "./folio.module.css";

// Le bloc « Folio » (spec § 7) : la planche portée, son nom, son œuvre.
// Chez un autre : sans le surtitre « Planche portée » ; l'anecdote passe
// en infobulle de la planche (mini-tuile) ou dans le repli « L'histoire »
// (colonne), et reste sur 2 lignes en héros. Le badge « à toi aussi / pas
// à toi » (`toi.folio`, lu au serveur si le bloc est posé), avec pour
// infobulle la manière de l'obtenir ; sans la donnée, pas de badge. Chez
// soi : comme avant ; en demi-bande, la
// vignette, le nom, l'œuvre et la 1re ligne de l'anecdote. Sans état.

const icone = <Feather size={17} aria-hidden />;

export function FolioBloc({ d, f, edition }: Ctx): React.ReactNode {
  const fo = d.folio;
  if (!fo) {
    if (!edition) return null;
    // dans Personnaliser : l'invitation d'avant
    if (f === "demi")
      return (
        <DemiBande label={T.folio}>
          <Cellule etiquette={T.folio} chiffre="—" petit={T.sansFolio} titre={T.sansFolioTexte} />
        </DemiBande>
      );
    return (
      <Coque f={f} label={T.folio}>
        <Etiquette f={f} icone={icone} titre={T.folio} />
        <p className="m-0 flex flex-col gap-1">
          <span className="text-[15px] font-semibold">{T.sansFolio}</span>
          <span className="t-small">{T.sansFolioTexte}</span>
        </p>
      </Coque>
    );
  }
  if (f === "demi") return folioDemi(fo, d);
  return d.moi ? folioChezSoi(fo, f) : folioChezUnAutre(fo, f, d);
}

/** Le badge chez un autre : le folio qu'il porte est-il aussi à toi ? Sans la donnée (aperçu, lecture ratée) : rien. */
function Badge({ fo, d }: { fo: DonneesFolio; d: DonneesBlocs }) {
  const aussi = d.moi ? null : d.toi?.folio;
  if (typeof aussi !== "boolean") return null;
  return (
    <span className={fl.badge} style={{ color: aussi ? "var(--ink-2)" : "var(--perte)" }} title={fo.obtention}>
      {aussi ? R.aToiAussi : R.pasAToi}
    </span>
  );
}

/** La demi-bande : la vignette (66 × 88), le nom et l'œuvre sur une ligne ; chez soi, la 1re ligne de l'anecdote dessous. */
function folioDemi(fo: DonneesFolio, d: DonneesBlocs): React.ReactNode {
  const moi = d.moi;
  return (
    <DemiBande label={T.folio} className={fl.demiFolio}>
      <div className={fl.demiLigne}>
        <span className={fl.vignette + " " + fl.folioNuit} title={moi ? undefined : fo.anecdote.filter(Boolean).join(" ")}>
          <CarteFolio f={fo} />
        </span>
        <span className={fl.demiTexte}>
          <span className={fl.nomOeuvre}>
            <span className={fl.nom}>{fo.nom}</span>
            {fo.nom !== fo.oeuvre && <span className={fl.oeuvre}>{fo.oeuvre}</span>}
          </span>
          <Badge fo={fo} d={d} />
          {moi && fo.anecdote[0] && (
            <span className={fl.uneLigne} title={fo.anecdote.filter(Boolean).join(" ")}>
              {fo.anecdote[0]}
            </span>
          )}
        </span>
      </div>
    </DemiBande>
  );
}

// ── Chez un autre ─────────────────────────────────────────────────────────

function folioChezUnAutre(fo: DonneesFolio, f: Format, d: DonneesBlocs): React.ReactNode {
  const histoire = fo.anecdote.filter(Boolean);
  const oeuvre = (
    <>
      {fo.nom !== fo.oeuvre && <span className="t-small m-0 italic">{fo.oeuvre}</span>}
      <Badge fo={fo} d={d} />
    </>
  );
  if (f === "colonne")
    return (
      <Coque f={f} label={T.folio}>
        <Etiquette f={f} icone={icone} titre={T.folio} />
        <span className={"block " + fl.folioNuit}>
          <CarteFolio f={fo} />
        </span>
        <p className="m-0 flex min-w-0 flex-col gap-1">
          <span className="text-[18px] font-bold leading-snug tracking-[-0.01em]">{fo.nom}</span>
          {oeuvre}
        </p>
        {histoire.length > 0 && (
          <div className="mt-auto">
            <Detail libelle={R.histoire}>
              {histoire.map((l) => (
                <p key={l} className="t-small m-0">
                  {l}
                </p>
              ))}
            </Detail>
          </div>
        )}
      </Coque>
    );
  if (f === "heros" || f === "bande")
    return (
      <Coque f={f} label={T.folio}>
        <Etiquette f={f} icone={icone} titre={T.folio} />
        <figure className={"m-0 grid items-start gap-4 " + fl.deux}>
          <span className={"block " + fl.folioNuit}>
            <CarteFolio f={fo} className="mx-auto max-w-[220px]" />
          </span>
          <figcaption className="flex min-w-0 flex-col gap-1.5">
            <span className={fl.nomHeros}>{fo.nom}</span>
            {oeuvre}
            {histoire.map((l) => (
              <span key={l} className="t-small m-0 block">
                {l}
              </span>
            ))}
          </figcaption>
        </figure>
      </Coque>
    );
  // mini-tuile : la planche (110 px) à gauche, le nom à droite ; l'anecdote en infobulle de la planche
  return (
    <Coque f={f} label={T.folio}>
      <Etiquette f={f} icone={icone} titre={T.folio} />
      <figure className="m-0 grid items-start gap-4" style={{ gridTemplateColumns: "110px minmax(0,1fr)" }}>
        <span className={"block " + fl.folioNuit} title={histoire.join(" ") || undefined}>
          <CarteFolio f={fo} />
        </span>
        <figcaption className="flex min-w-0 flex-col gap-1.5">
          <span className="m-0 text-[18px] font-bold leading-snug tracking-[-0.01em]">{fo.nom}</span>
          {oeuvre}
        </figcaption>
      </figure>
    </Coque>
  );
}

// ── Chez soi : comme avant (l'ancien FolioBloc de BlocsProfil.tsx) ──────────

function folioChezSoi(fo: DonneesFolio, fmt: Format): React.ReactNode {
  // la colonne prend la forme de la tuile, comme avant
  const f: Format = fmt === "colonne" ? "tuile" : fmt;
  const [premiere, seconde] = fo.anecdote;
  return (
    <Coque f={f} label={T.folio}>
      <Etiquette f={f} icone={icone} titre={T.folio} sur={T.planche} />
      <figure className={"m-0 grid items-start gap-4 " + (f === "tuile" ? "" : fl.deux)} style={f === "tuile" ? { gridTemplateColumns: "104px minmax(0,1fr)" } : undefined}>
        <span className={"block " + fl.folioNuit}>
          <CarteFolio f={fo} className={f === "tuile" ? "" : "mx-auto max-w-[220px]"} />
        </span>
        <figcaption className="flex min-w-0 flex-col gap-1.5">
          <span className="m-0 text-[18px] font-bold leading-snug tracking-[-0.01em]">{fo.nom}</span>
          {fo.nom !== fo.oeuvre && <span className="t-small m-0 italic">{fo.oeuvre}</span>}
          {(f === "tuile" ? [premiere] : [premiere, seconde]).filter(Boolean).map((l) => (
            <span key={l} className="t-small m-0 block">
              {l}
            </span>
          ))}
        </figcaption>
      </figure>
      {f === "tuile" && seconde && <p className="t-small m-0 mt-auto">{seconde}</p>}
    </Coque>
  );
}
