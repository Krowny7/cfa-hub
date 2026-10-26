import { ChevronRight, Hourglass } from "lucide-react";
import { TuileCalme } from "@/components/ui/Tuiles";
import { heuresMinutes } from "@/lib/voice";
import { leJour, leJourCourt } from "@/lib/voice-blocs-neuves";
import { CAB } from "@/lib/voice-moi";
import { depuisQuand, enPartieEstime, type ResumeTemps } from "@/lib/temps-site";

// La tuile « Temps sur le site » du cabinet (Moi) : le total en heures, en
// grand (« 34 h 20 », sans « ≈ » : demande de l'utilisateur), puis
// « depuis ton inscription le 16 juin · en partie estimé ». Le détail à la
// demande, replié : la part estimée (avant le premier jour mesuré), la part
// mesurée, les 7 derniers jours, et comment chacune se compte. Rien encore :
// le compteur vient de démarrer. Sans la migration, pas de tuile (Cabinet).
// Sans état : rendue au serveur.

/** Une ligne du détail : le nom à gauche, la durée à droite. */
function Ligne({ nom, valeur }: { nom: string; valeur: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-line pt-2 first:border-t-0 first:pt-0">
      <dt className="t-small m-0">{nom}</dt>
      <dd className="m-0 shrink-0 font-mono text-[14px] font-semibold tabular-nums">{valeur}</dd>
    </div>
  );
}

export function TuileTemps({ t, aujourdhui, className }: { t: ResumeTemps; aujourdhui: string; className?: string }) {
  const vide = t.total < 60;
  const estime = enPartieEstime(t);
  const depuis = depuisQuand(t);
  const date = depuis ? leJour(depuis.jour, aujourdhui) : null;
  const ligneDepuis = date ? (depuis?.inscription ? CAB.tempsDepuisInscription(date) : CAB.tempsDepuis(date)) : null;
  const mesureDepuis = t.premierMesure ? leJourCourt(t.premierMesure, aujourdhui) : null;
  return (
    <TuileCalme
      className={className}
      icone={<Hourglass size={18} aria-hidden />}
      titre={CAB.tuileTemps}
      fort={
        vide ? undefined : (
          <span className="t-num text-[30px] leading-none tabular-nums">{heuresMinutes(t.total)}</span>
        )
      }
      ligne={vide ? CAB.tempsVide : [ligneDepuis, estime ? CAB.tempsEnPartieEstime : null].filter(Boolean).join(" · ")}
      actions={
        vide ? null : (
          <details className="group/d w-full">
            <summary className="ink-link inline-flex w-fit cursor-pointer list-none items-center gap-1 text-[14px] font-semibold [&::-webkit-details-marker]:hidden">
              {CAB.tempsDetail} <ChevronRight size={14} aria-hidden className="transition-transform group-open/d:rotate-90 motion-reduce:transition-none" />
            </summary>
            <div className="rl-in mt-3 flex flex-col gap-3">
              <dl className="m-0 flex flex-col gap-2">
                {estime && <Ligne nom={CAB.tempsEstimeAvant(mesureDepuis)} valeur={heuresMinutes(t.estimees)} />}
                {mesureDepuis && <Ligne nom={CAB.tempsMesureDepuis(mesureDepuis)} valeur={heuresMinutes(t.mesurees)} />}
                <Ligne nom={CAB.tempsSemaine} valeur={heuresMinutes(t.semaine)} />
              </dl>
              <p className="t-micro m-0">
                {estime ? `${CAB.tempsEstimeComment} ` : ""}
                {CAB.tempsMesureComment}
              </p>
            </div>
          </details>
        )
      }
    />
  );
}
