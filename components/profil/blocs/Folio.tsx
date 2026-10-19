import { Feather } from "lucide-react";
import { CarteFolio, type DonneesFolio } from "@/components/profil/Folio";
import { TIERS } from "@/lib/ranks";
import type { Format } from "@/lib/profil/disposition";
import { BLOCS_PROFIL as T } from "@/lib/voice-blocs";
import { BLOCS_RADAR as R } from "@/lib/voice-blocs-radar";
import { Cellule, Coque, DemiBande, Detail, Etiquette, type Ctx } from "./commun";
import fl from "./folio.module.css";

// Le bloc « Folio » (spec des tuiles : « Au musée »). Le même dessin chez
// soi et chez un autre : la planche portée dans un cadre (un passe-partout
// clair, un filet doré, une ombre douce), et à côté son cartel : le nom en
// gras, l'œuvre, « Léonard de Vinci ». L'anecdote passe en infobulle de la
// mini-tuile, dans le repli « L'histoire » de la colonne, sous le cartel en
// héros. Plus de badge « à toi aussi ». Sans état.

const icone = <Feather size={17} aria-hidden />;

/** Le filet doré du cadre : les couleurs du métal du palier Or (lib/ranks). */
const [OR1, OR2, OR3] = TIERS[2].metal;
const styleOr = { ["--m1" as string]: OR1, ["--m2" as string]: OR2, ["--m3" as string]: OR3 } as React.CSSProperties;

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
  return folioDe(fo, f);
}

/** La planche encadrée : le filet doré, le passe-partout clair, la planche (toujours en papier clair, de jour comme de nuit). */
function Cadre({ fo, className = "" }: { fo: DonneesFolio; className?: string }) {
  return (
    <span className={fl.cadre + " " + className} style={styleOr} aria-hidden>
      <span className={fl.passe}>
        <CarteFolio f={fo} />
      </span>
    </span>
  );
}

/** Le cartel : le nom en gras, l'œuvre en italique, puis l'auteur sous un filet. */
function Cartel({ fo, grand = false }: { fo: DonneesFolio; grand?: boolean }) {
  return (
    <figcaption className={fl.cartel}>
      <span className={grand ? fl.nomGrand : fl.nom}>{fo.nom}</span>
      {fo.nom !== fo.oeuvre && <span className={fl.oeuvre}>{fo.oeuvre}</span>}
      <span className={fl.auteur}>{R.auteur}</span>
    </figcaption>
  );
}

function folioDe(fo: DonneesFolio, f: Format): React.ReactNode {
  const histoire = fo.anecdote.filter(Boolean);

  // demi-bande : la vignette encadrée, le nom, l'œuvre et l'auteur sur une ligne
  if (f === "demi")
    return (
      <DemiBande label={T.folio} className={fl.demiFolio}>
        <figure className={fl.demiLigne} title={histoire.join(" ") || undefined}>
          <Cadre fo={fo} className={fl.vignette} />
          <figcaption className={fl.demiTexte}>
            <span className={fl.nomOeuvre}>
              <span className={fl.nom}>{fo.nom}</span>
              {fo.nom !== fo.oeuvre && <span className={fl.oeuvre}>{fo.oeuvre}</span>}
            </span>
            <span className={fl.auteurLigne}>{R.auteur}</span>
          </figcaption>
        </figure>
      </DemiBande>
    );

  // colonne : le cadre centré, le cartel dessous, l'histoire en repli
  if (f === "colonne")
    return (
      <Coque f={f} label={T.folio}>
        <Etiquette f={f} icone={icone} titre={T.folio} />
        <figure className={fl.colonne}>
          <Cadre fo={fo} className={fl.cadreColonne} />
          <Cartel fo={fo} />
        </figure>
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

  // héros : le cadre à gauche, le cartel et l'anecdote à droite ; l'un sur l'autre si la place manque
  if (f === "heros" || f === "bande")
    return (
      <Coque f={f} label={T.folio}>
        <Etiquette f={f} icone={icone} titre={T.folio} />
        <div className={fl.zone}>
          <figure className={fl.heros}>
            <Cadre fo={fo} className={fl.cadreHeros} />
            <div className={fl.texte}>
              <Cartel fo={fo} grand />
              {histoire.length > 0 && (
                <div className={fl.histoire}>
                  {histoire.map((l) => (
                    <p key={l} className="t-small m-0">
                      {l}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </figure>
        </div>
      </Coque>
    );

  // mini-tuile : le cadre à gauche, le cartel à droite ; l'anecdote en infobulle
  return (
    <Coque f={f} label={T.folio}>
      <Etiquette f={f} icone={icone} titre={T.folio} />
      <figure className={fl.tuile} title={histoire.join(" ") || undefined}>
        <Cadre fo={fo} />
        <Cartel fo={fo} />
      </figure>
    </Coque>
  );
}
