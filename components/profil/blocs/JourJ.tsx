import { CalendarClock } from "lucide-react";
import { jourJ as libelleJourJ, pct } from "@/lib/voice";
import { BLOCS_NEUVES as V, leJour } from "@/lib/voice-blocs-neuves";
import { Cellule, Coque, DemiBande, Etiquette, Lien, type Ctx } from "./commun";
import { Mention, Tete, mentionDemi, poids, vars } from "./neuves";
import n from "./neuves.module.css";

// Le bloc « Jour J » (jourj) : « Compte à rebours ». « J-25 » en énorme (le
// chiffre remplit la largeur), la date (« le 12 novembre ») et « programme
// couvert à 68 % » avec une barre qui se remplit. Il suit la visibilité du
// Journal (une date d'examen en dit long) : fermé, rien en vue publique, la
// mention « Visible par » dans Personnaliser. Un examen passé ou sans date :
// rien en public ; dans Personnaliser, l'invitation à régler sa date dans
// Moi. Le même dessin chez soi et chez un autre. Sans état.

const ICONE = <CalendarClock size={17} aria-hidden />;

/** La barre du programme couvert : se remplit jusqu'à la part. */
function Barre({ p }: { p: number }) {
  return (
    <div className={n.jjBarre} role="img" aria-label={V.couvertDit(p)}>
      <i style={vars({ "--w": p + "%" })} />
    </div>
  );
}

export function JourJBloc({ d, f, edition }: Ctx): React.ReactNode {
  const j = d.jourJ ?? null;
  if (!j) {
    if (!edition) return null;
    // Personnaliser, sans date (ou examen passé) : sa coque et l'invitation
    if (f === "demi")
      return (
        <DemiBande label={V.jourJ} droite={<Lien href="/moi">{V.jourJLien}</Lien>}>
          <Cellule etiquette={V.avantExamen} chiffre="—" petit={V.jourJRien} />
        </DemiBande>
      );
    return (
      <Coque f={f} label={V.jourJ}>
        <Etiquette f={f} icone={ICONE} titre={V.jourJ} />
        <p className="t-small m-0">{V.jourJInvite}</p>
        <Lien href="/moi">{V.jourJLien}</Lien>
      </Coque>
    );
  }

  const grand = libelleJourJ(j.jours) ?? V.jourJ;
  const date = leJour(j.date);

  if (f === "demi")
    return (
      <DemiBande label={V.jourJ} dessin={j.couverture !== null ? <Barre p={j.couverture} /> : undefined} droite={mentionDemi(d, edition)}>
        <Cellule etiquette={V.avantExamen} chiffre={grand} petit={date} />
        {j.couverture !== null && <Cellule etiquette={V.programme} chiffre={pct(j.couverture)} />}
      </DemiBande>
    );

  return (
    <Coque f={f} label={V.jourJ} className={n.coque + " " + n.jj + " " + n[f]}>
      <Tete titre={V.avantExamen} />
      <div className={n.jjCorps}>
        <b className={"t-num tabular-nums " + n.jjGrand} style={vars({ "--w": poids(grand) })} title={V.dans(j.jours)}>
          {grand}
        </b>
        <div className={n.jjInfos}>
          <p className={n.jjDate}>{date}</p>
          {j.couverture !== null && (
            <div className={n.jjProg}>
              <p className={n.petit}>
                {V.programmeCouvert} <b>{pct(j.couverture)}</b>
              </p>
              <Barre p={j.couverture} />
            </div>
          )}
        </div>
      </div>
      <Mention d={d} edition={edition} />
    </Coque>
  );
}
