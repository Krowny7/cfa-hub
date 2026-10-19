import { Medal } from "lucide-react";
import { TIERS } from "@/lib/ranks";
import type { ExtraitClassement } from "@/lib/profil/blocs-donnees";
import { nombre } from "@/lib/voice";
import { BLOCS_NEUVES as V } from "@/lib/voice-blocs-neuves";
import { Cellule, Coque, DemiBande, Vide, type Ctx } from "./commun";
import { Tete, poids, vars } from "./neuves";
import n from "./neuves.module.css";

// Le bloc « Classement » (classement) : « Le rang ». Sa place en énorme
// (« 7e », le chiffre remplit la largeur), « sur 412 joueurs · Platine II ·
// 1 478 ELO » dessous, et en repère la variation de son ELO sur 7 jours
// (« ▲ +24 ELO cette semaine », vert ou rouge ; rien si elle est nulle). En
// colonne, en héros et en bande, où il en est dans son palier (« encore 72
// ELO pour Platine I »). Public. Le même dessin chez soi et chez un autre.
// Pas classé : rien en vue publique, l'état vide dans Personnaliser. Sans état.

const ICONE = <Medal size={17} aria-hidden />;

/** Le palier d'un joueur, avec une puce aux couleurs de son métal : « Platine II ». */
function Palier({ c }: { c: ExtraitClassement }) {
  const palier = TIERS[Math.max(0, Math.min(TIERS.length - 1, c.palier))];
  const m = palier.metal;
  return (
    <span className={n.cPalier}>
      <i className={n.cPuce} style={vars({ "--m0": m[0], "--m1": m[1], "--m2": m[2] })} aria-hidden />
      {palier.name}
      {c.division ? ` ${c.division}` : ""}
    </span>
  );
}

/** Où il en est dans son palier : une barre et « encore 72 ELO pour Platine I » ; au sommet, rien. */
function Progres({ c }: { c: ExtraitClassement }) {
  if (!c.suivant || c.points === null) return null;
  return (
    <div className={n.cProgres}>
      <div className={n.jjBarre} role="img" aria-label={V.encorePour(c.points, c.suivant)}>
        <i style={vars({ "--w": Math.max(2, Math.min(100, c.progress)) + "%" })} />
      </div>
      <p className={n.petit}>{V.encorePour(c.points, c.suivant)}</p>
    </div>
  );
}

/** La variation de la semaine : « ▲ +24 ELO cette semaine » (vert) ou « ▼ −18 … » (rouge) ; rien à zéro. */
function Variation({ v, court = false }: { v: number; court?: boolean }) {
  if (!v) return null;
  return (
    <span className={n.cVar} data-s={v > 0 ? "h" : "b"} data-court={court ? "oui" : undefined} title={V.semaineDit(v)}>
      {court ? `${v > 0 ? "▲" : "▼"} ${v > 0 ? "+" : "−"}${nombre(Math.abs(v))}` : V.semaine(v)}
    </span>
  );
}

/** La place en grand : « 7 » puis « e » plus petit. */
function Place({ place }: { place: number }) {
  return (
    <b className={"t-num tabular-nums " + n.cPlace} style={vars({ "--w": poids(nombre(place)) + 0.45 })} title={V.placeDit(place, null)}>
      {nombre(place)}
      <small>{place === 1 ? "er" : "e"}</small>
    </b>
  );
}

export function ClassementBloc({ d, f, edition }: Ctx): React.ReactNode {
  const c = d.classement ?? null;
  if (!c) return edition ? <Vide bloc={{ k: "classement", f }} f={f} icone={ICONE} /> : null;
  const sur = c.joueurs ? V.surJoueurs(c.joueurs) : null;

  if (f === "demi")
    return (
      <DemiBande label={V.classement}>
        <Cellule etiquette={V.classement} chiffre={`${nombre(c.place)}${c.place === 1 ? "er" : "e"}`} petit={sur ?? undefined} />
        <Cellule etiquette={V.rang} chiffre={<Palier c={c} />} petit={`${nombre(c.elo)} ${V.elo}`} />
        {c.variation !== 0 && <Cellule etiquette={V.cetteSemaine} chiffre={<Variation v={c.variation} court />} petit={V.elo} />}
      </DemiBande>
    );

  const ligne = (
    <p className={n.cLigne}>
      {sur && (
        <>
          <span>{sur}</span>
          <span className={n.cSep} aria-hidden>
            ·
          </span>
        </>
      )}
      <Palier c={c} />
      <span className={n.cSep} aria-hidden>
        ·
      </span>
      <span>
        <b>{nombre(c.elo)}</b> {V.elo}
      </span>
    </p>
  );

  return (
    <Coque f={f} label={V.classement} className={n.coque + " " + n.classement + " " + n[f]}>
      <Tete titre={V.classement} repere={<Variation v={c.variation} />} />
      <div className={n.cCorps}>
        <Place place={c.place} />
        <div className={n.cInfos}>
          {ligne}
          {f !== "tuile" && <Progres c={c} />}
        </div>
      </div>
    </Coque>
  );
}
