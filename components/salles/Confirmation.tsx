"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BoutonEnvoi, PorteeEncre } from "@/components/classement/Encre";
import { CONFIRMATION } from "@/lib/voice-salles";
import c from "./Confirmation.module.css";

// Une vraie confirmation, à la place de la fenêtre du navigateur. `demander` rend une promesse :
// vrai si le joueur confirme. Le focus part sur le refus, pour qu'une touche Entrée de trop ne
// valide rien ; Échap ou un clic à côté referment. Un double clic sur le bouton d'origine ne
// répond pas à la question à sa place (TROP_TOT_MS).

export type DemandeConfirmation = {
  titre: string;
  texte?: string;
  /** le libellé du bouton qui confirme */
  confirmer: string;
  annuler?: string;
  /** une action qu'on ne rattrape pas : le bouton n'est pas d'encre */
  danger?: boolean;
};

type Ouverte = DemandeConfirmation & { repondre: (oui: boolean) => void };

const TROP_TOT_MS = 300;

function Dialogue({ titre, texte, confirmer, annuler = CONFIRMATION.annuler, danger = false, repondre }: Ouverte) {
  const id = useId();
  const refus = useRef<HTMLButtonElement | null>(null);
  const boite = useRef<HTMLDivElement | null>(null);
  const ouverteA = useRef(0);

  useEffect(() => {
    const avant = document.activeElement as HTMLElement | null;
    ouverteA.current = performance.now();
    refus.current?.focus();
    return () => avant?.focus?.();
  }, []);

  const repondreSiPret = (oui: boolean) => {
    if (performance.now() - ouverteA.current >= TROP_TOT_MS) repondre(oui);
  };

  function clavier(e: React.KeyboardEvent) {
    // le jeu en dessous a ses raccourcis : rien ne doit les atteindre
    e.stopPropagation();
    if (e.key === "Escape") repondre(false);
    if (e.key !== "Tab") return;
    const boutons = [...(boite.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])") ?? [])];
    if (boutons.length === 0) return;
    const premier = boutons[0];
    const dernier = boutons[boutons.length - 1];
    if (e.shiftKey && document.activeElement === premier) {
      e.preventDefault();
      dernier.focus();
    } else if (!e.shiftKey && document.activeElement === dernier) {
      e.preventDefault();
      premier.focus();
    }
  }

  return createPortal(
    <div className={c.voile} onClick={() => repondreSiPret(false)} onKeyDown={clavier}>
      <div ref={boite} className={c.boite} role="alertdialog" aria-modal="true" tabIndex={-1} aria-labelledby={`${id}-t`} aria-describedby={texte ? `${id}-d` : undefined} onClick={(e) => e.stopPropagation()}>
        {/* la portée d'encre mesure sa largeur sur son parent : elle entoure tout le contenu */}
        <PorteeEncre>
          <div className={c.contenu}>
            <h2 id={`${id}-t`} className="t-h3 m-0">
              {titre}
            </h2>
            {texte && (
              <p id={`${id}-d`} className="t-small m-0">
                {texte}
              </p>
            )}
            <div className={c.actions}>
              <button ref={refus} type="button" className={c.refus} onClick={() => repondreSiPret(false)}>
                {annuler}
              </button>
              {danger ? (
                <button type="button" className={c.danger} onClick={() => repondreSiPret(true)}>
                  {confirmer}
                </button>
              ) : (
                <BoutonEnvoi type="button" onClick={() => repondreSiPret(true)}>
                  {confirmer}
                </BoutonEnvoi>
              )}
            </div>
          </div>
        </PorteeEncre>
      </div>
    </div>,
    document.body,
  );
}

/** `dialogue` se pose n'importe où dans le rendu ; `demander` l'ouvre et attend la réponse. */
export function useConfirmation() {
  const [ouverte, setOuverte] = useState<Ouverte | null>(null);
  const demander = useCallback(
    (d: DemandeConfirmation) =>
      new Promise<boolean>((resolve) => {
        setOuverte({
          ...d,
          repondre: (oui) => {
            setOuverte(null);
            resolve(oui);
          },
        });
      }),
    [],
  );
  return { demander, dialogue: ouverte ? <Dialogue {...ouverte} /> : null };
}
