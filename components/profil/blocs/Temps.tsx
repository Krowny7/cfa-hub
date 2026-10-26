import { Hourglass } from "lucide-react";
import { heuresMinutes, heuresRondes } from "@/lib/voice";
import { BLOCS_NEUVES as V, leJour, leJourCourt } from "@/lib/voice-blocs-neuves";
import { depuisQuand, enPartieEstime, jourParisDe } from "@/lib/temps-site";
import { Cellule, Coque, DemiBande, Etiquette, type Ctx } from "./commun";
import { Mention, Tete, poids, vars } from "./neuves";
import n from "./neuves.module.css";

// Le bloc « Temps sur le site » (temps) : les heures passées sur le site en
// énorme (« 34 h », le chiffre remplit la largeur, comme le jour J), « depuis
// le 16 juin » dessous et, si une part du total est estimée (le passé,
// d'après les traces), la mention discrète « en partie estimé » (l'infobulle
// dit comment). En colonne, en héros et en bande : les 7 derniers jours en
// plus. Les totaux seulement (temps_site_resume) : la base ne les rend à un
// autre joueur que si la tuile est sur la page. Public ; la mention
// « Visible par » dans Personnaliser. Rien de compté encore (ou la migration
// absente) : rien en vue publique, l'invitation dans Personnaliser. Le même
// dessin chez soi et chez un autre. Sans état.

const ICONE = <Hourglass size={17} aria-hidden />;

export function TempsBloc({ d, f, edition }: Ctx): React.ReactNode {
  const t = d.temps ?? null;
  if (!t || t.total < 60) {
    if (!edition) return null;
    // Personnaliser, rien de compté encore : sa coque et l'invitation
    if (f === "demi")
      return (
        <DemiBande label={V.temps} droite={<span className="t-micro">{V.tempsVisible}</span>}>
          <Cellule etiquette={V.temps} chiffre="—" petit={V.tempsRien} />
        </DemiBande>
      );
    return (
      <Coque f={f} label={V.temps}>
        <Etiquette f={f} icone={ICONE} titre={V.temps} />
        <p className="t-small m-0">{V.tempsInvite}</p>
        <Mention d={d} edition={edition} texte={V.tempsVisible} />
      </Coque>
    );
  }

  const aujourdhui = jourParisDe();
  const grand = heuresRondes(t.total);
  const exact = heuresMinutes(t.total);
  const q = depuisQuand(t);
  const depuis = q ? V.tempsDepuis(leJour(q.jour, aujourdhui)) : null;
  const estime = enPartieEstime(t);
  const bulle = V.tempsEstimeBulle(t.premierMesure ? leJourCourt(t.premierMesure, aujourdhui) : null);
  const mention = estime ? (
    <span className="t-micro" title={bulle}>
      {V.tempsEstime}
    </span>
  ) : null;

  if (f === "demi")
    return (
      <DemiBande label={V.temps} droite={edition ? <span className="t-micro">{V.tempsVisible}</span> : (mention ?? undefined)}>
        <Cellule etiquette={V.temps} chiffre={exact} petit={depuis ?? undefined} titre={V.tempsDit(exact, depuis)} />
        {t.semaine >= 60 && <Cellule etiquette={V.tempsSemaine} chiffre={heuresMinutes(t.semaine)} />}
      </DemiBande>
    );

  return (
    <Coque f={f} label={V.temps} className={n.coque + " " + n.jj + " " + n[f]}>
      <Tete titre={V.temps} />
      <div className={n.jjCorps}>
        <b className={"t-num tabular-nums " + n.jjGrand} style={vars({ "--w": poids(grand) })} title={V.tempsDit(exact, depuis)}>
          {grand}
        </b>
        <div className={n.jjInfos}>
          {depuis && <p className={n.jjDate}>{depuis}</p>}
          {f !== "tuile" && t.semaine >= 60 && (
            <p className={n.petit}>
              {V.tempsSemaine} <b>{heuresMinutes(t.semaine)}</b>
            </p>
          )}
          {mention && <p className="m-0">{mention}</p>}
        </div>
      </div>
      <Mention d={d} edition={edition} texte={V.tempsVisible} />
    </Coque>
  );
}
