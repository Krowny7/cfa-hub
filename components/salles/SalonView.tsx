"use client";

import { useState } from "react";
import { Globe, Lock, LogOut, Trash2 } from "lucide-react";
import { fmtInt } from "@/components/classement/format";
import { CodePartage } from "@/components/salles/CodePartage";
import { Membres } from "@/components/salles/Membres";
import { ReglagesLecture } from "@/components/salles/Reglages";
import type { EtatSalle, SalleParams } from "@/lib/salles/types";
import { REGLAGES, SALLES } from "@/lib/voice-salles";
import s from "./Salles.module.css";

// Le salon d'une salle (la salle d'attente), sur la console sombre de la DA
// des Salles : nom, publique ou privée, code à partager (copier), joueurs
// (l'admin marqué), puis à droite — pour l'admin, le formulaire de réglages
// (`reglages`, qui lance la partie) ; pour un membre, « En attente du
// lancement » et les réglages de la dernière partie en lecture seule — et en
// bas Quitter la salle (l'admin peut aussi changer la visibilité ou supprimer).
// Pendant une partie, `partie` (l'écran de jeu) prend la place du salon.
// Composant de présentation : les données viennent de SalleVue (ou d'un
// aperçu), les actions sont des fonctions facultatives (absentes : boutons inertes).

export type DonneesSalon = Pick<EtatSalle, "salle" | "moi" | "nbMembres" | "membres" | "session" | "historique">;

export type ActionsSalon = {
  quitter?: (dernier: boolean) => Promise<void>;
  supprimer?: () => Promise<void>;
  basculerVisibilite?: () => Promise<void>;
};

export function SalonView({
  donnees,
  reglages,
  partie,
  actions = {},
  hors = false,
}: {
  donnees: DonneesSalon;
  /** pour l'admin : le formulaire de réglages (Reglages) */
  reglages?: React.ReactNode;
  /** pendant une partie : l'écran de jeu (PartieSalle) */
  partie?: React.ReactNode;
  actions?: ActionsSalon;
  /** la dernière lecture a échoué */
  hors?: boolean;
}) {
  const { salle, moi, membres, nbMembres, session, historique } = donnees;
  const [occupe, setOccupe] = useState(false);
  const admin = membres.find((m) => m.estAdmin);
  const nomAdmin = admin?.username?.trim() || "Un joueur";

  async function agir(f: () => Promise<void>) {
    if (occupe) return;
    setOccupe(true);
    try {
      await f();
    } finally {
      setOccupe(false);
    }
  }

  const dernieresParams: SalleParams | null = session ? session.params : null;
  const quitterMsg = nbMembres <= 1 ? SALLES.quitterDernier : moi.estAdmin ? SALLES.quitterAdminConfirme : SALLES.quitterConfirme;

  return (
    <div className={[s.jetons, s.racine].join(" ")} data-salon={partie ? "partie" : "attente"}>
      <header className={s.entete}>
        <div>
          <p className={s.surtitre}>{SALLES.salonKicker}</p>
          <h1 className={s.nomSalle}>{salle.nom}</h1>
          <p className={s.metas}>
            <span className={[s.etiquette, s.etiquetteMetal].join(" ")}>
              {salle.publique ? <Globe size={14} aria-hidden /> : <Lock size={14} aria-hidden />}
              {salle.publique ? SALLES.salleOuverte : SALLES.sallePrivee}
            </span>
            <span className={s.etiquette}>
              <b>{fmtInt(nbMembres)}</b> {nbMembres > 1 ? "joueurs" : "joueur"}
            </span>
            <span className={s.etiquette}>
              {SALLES.adminLe} <b>{nomAdmin}</b>
            </span>
            {hors && (
              <span className={[s.etiquette, s.etiquetteVive].join(" ")} role="status">
                {SALLES.hors}
              </span>
            )}
          </p>
          {salle.description && <p className={s.sous} style={{ marginTop: 10 }}>{salle.description}</p>}
        </div>
        <CodePartage code={salle.code} />
      </header>

      {partie ? (
        partie
      ) : (
        <div className={s.grille}>
          <div className={s.colonne}>
            <Membres membres={membres} moiId={moi.userId} total={nbMembres} />
          </div>
          <div className={s.colonne}>
            {moi.estAdmin ? (
              <section className={s.panneau} aria-labelledby="salle-reglages">
                <div className={s.panneauTete}>
                  <h2 id="salle-reglages" className={s.titrePanneau}>
                    {REGLAGES.titre}
                  </h2>
                </div>
                {reglages}
              </section>
            ) : (
              <section className={s.panneau} aria-labelledby="salle-attente">
                <div className={s.panneauTete}>
                  <h2 id="salle-attente" className={s.titrePanneau}>
                    {dernieresParams ? SALLES.derniereParty : REGLAGES.titre}
                  </h2>
                </div>
                <div className={s.panneauCorps}>
                  <div className={s.attente} role="status">
                    <span className={s.barres} aria-hidden>
                      <i />
                      <i />
                      <i />
                    </span>
                    <div className={s.attenteTexte}>
                      <p className={s.attenteTitre}>{SALLES.attente}</p>
                      <p className={s.sous}>{SALLES.attenteSous}</p>
                    </div>
                  </div>
                  {dernieresParams ? <ReglagesLecture params={dernieresParams} titre={SALLES.derniereParty} /> : <p className={s.sous}>{SALLES.lecturePlaceholder}</p>}
                </div>
              </section>
            )}

            {historique.length > 0 && (
              <section className={s.panneau} aria-labelledby="salle-historique">
                <div className={s.panneauTete}>
                  <h2 id="salle-historique" className={s.titrePanneau}>
                    {SALLES.historiqueTitre}
                  </h2>
                </div>
                <ul className={s.historique}>
                  {historique.map((h) => (
                    <li key={h.sessionId} className={s.historiqueLigne}>
                      <span className={s.historiqueNum}>{SALLES.historiqueLigne(h.numero)}</span>
                      <span className={s.historiqueTexte}>
                        {h.gagnant ? SALLES.gagnant(h.gagnant.username?.trim() || "Un joueur", fmtInt(h.gagnant.points)) : `${h.nb} questions`}
                        {h.moi ? ` · ${SALLES.monRang(h.moi.rang, h.nbJoueurs)}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      )}

      <footer className={s.pied}>
        <div className={s.piedActions}>
          <button
            type="button"
            className={[s.btn, s.btnDiscret].join(" ")}
            disabled={occupe}
            onClick={() => {
              if (actions.quitter && window.confirm(quitterMsg)) void agir(() => actions.quitter!(nbMembres <= 1));
            }}
          >
            <LogOut size={16} aria-hidden /> {SALLES.quitter}
          </button>
          {moi.estAdmin && !partie && (
            <>
              <button type="button" className={[s.btn, s.btnDiscret].join(" ")} disabled={occupe} onClick={() => actions.basculerVisibilite && void agir(actions.basculerVisibilite)}>
                {salle.publique ? <Lock size={16} aria-hidden /> : <Globe size={16} aria-hidden />} {salle.publique ? SALLES.rendrePrivee : SALLES.rendrePublique}
              </button>
              <button
                type="button"
                className={[s.btn, s.btnDiscret, s.btnDanger].join(" ")}
                disabled={occupe}
                onClick={() => {
                  if (actions.supprimer && window.confirm(SALLES.supprimerConfirme)) void agir(actions.supprimer);
                }}
              >
                <Trash2 size={16} aria-hidden /> {SALLES.supprimer}
              </button>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}
