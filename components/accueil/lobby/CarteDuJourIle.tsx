"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, RotateCcw, Settings, X } from "lucide-react";
import { CARTE_JOUR, SOURCES_CARTE } from "@/lib/voice-accueil-lobby-carte";
import { reglerCarteDuJour } from "./actions-carte";
import { BoutonAction } from "./Encre";
import { MATIERES_CARTE, SOURCES, noteReglages, type ReglagesCarte, type SourceCarte } from "./modele-carte";
import c from "./CarteDuJour.module.css";

// L'îlot de « La carte du jour » (accueil « Le lobby ») : la tuile EST la carte.
// Un clic la retourne ; « Copier pour l'IA » met le prompt (construit au
// serveur) dans le presse-papier ; l'engrenage ouvre le choix des cartes
// (matières, source) dans un panneau qui se superpose à la carte, et
// « Enregistrer » l'écrit dans le compte (actions-carte.ts) puis relit la
// page : le serveur tire la nouvelle carte. Le recto et le verso arrivent déjà
// rendus du serveur (ReactNode, formules KaTeX comprises : TexteCarte.tsx) ;
// aucune fonction ne passe du serveur ici, et rien ne se formate côté client.
// Le liquide d'encre n'est que sur « Enregistrer » : le seul bouton d'action.

type Props = {
  matiere: { cle: string; court: string; code: string };
  /** la question, rendue au serveur */
  recto: ReactNode;
  /** la réponse, rendue au serveur */
  verso: ReactNode;
  /** la ligne sous le titre (les réglages, ou la raison du repli) */
  resume: string;
  /** le prompt « Copier pour l'IA » */
  prompt: string;
  /** les réglages enregistrés : le panneau repart toujours d'eux */
  reglages: ReglagesCarte;
  className?: string;
  /** panneau déjà ouvert au premier rendu : pour les aperçus et les tests, jamais pour la page */
  ouvertAuDepart?: boolean;
};

type Copie = "non" | "ok" | "echec";

const classes = (...x: (string | false | null | undefined)[]) => x.filter(Boolean).join(" ");

/** Copie un texte : l'API moderne, sinon un champ caché (page servie hors HTTPS). Faux si rien n'a marché. */
async function copierTexte(texte: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texte);
      return true;
    }
  } catch {
    // refusé (permission, page en arrière-plan) : on essaie l'ancienne voie
  }
  try {
    const champ = document.createElement("textarea");
    champ.value = texte;
    champ.setAttribute("readonly", "");
    champ.style.position = "fixed";
    champ.style.left = "-9999px";
    document.body.appendChild(champ);
    champ.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(champ);
    return ok;
  } catch {
    return false;
  }
}

/** Les deux coins d'une face : le code de la matière et un losange, le bas à l'envers. */
function Coins({ code }: { code: string }) {
  return (
    <>
      <span className={c.idx} aria-hidden>
        <b>{code}</b>
        <i className={c.losange} />
      </span>
      <span className={classes(c.idx, c.idxFin)} aria-hidden>
        <b>{code}</b>
        <i className={c.losange} />
      </span>
    </>
  );
}

export function CarteDuJourIle({ matiere, recto, verso, resume, prompt, reglages, className, ouvertAuDepart = false }: Props) {
  const router = useRouter();
  const id = useId();
  const idTitre = `${id}-t`;
  const idApercu = `${id}-ap`;
  const idReglages = `${id}-r`;
  const nomRadios = `${id}-src`;

  const [vu, setVu] = useState(false);
  // annoncé aux lecteurs d'écran seulement après un premier retournement
  const [annonce, setAnnonce] = useState("");
  const [copie, setCopie] = useState<Copie>("non");
  const [ouvert, setOuvert] = useState(ouvertAuDepart);
  // le brouillon du panneau : repart des réglages enregistrés à chaque ouverture
  const [mats, setMats] = useState<string[]>(reglages.mats);
  const [src, setSrc] = useState<SourceCarte>(reglages.src);
  const [alerte, setAlerte] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const engrenage = useRef<HTMLButtonElement | null>(null);
  const panneau = useRef<HTMLDivElement | null>(null);
  const minuterie = useRef<number | null>(null);
  const avaitOuvert = useRef(false);

  // le panneau prend le focus à l'ouverture et le rend à l'engrenage à la fermeture
  useEffect(() => {
    if (ouvert) {
      avaitOuvert.current = true;
      panneau.current?.focus();
    } else if (avaitOuvert.current) {
      avaitOuvert.current = false;
      engrenage.current?.focus();
    }
  }, [ouvert]);
  // pas de minuterie qui survive à la carte
  useEffect(
    () => () => {
      if (minuterie.current !== null) window.clearTimeout(minuterie.current);
    },
    [],
  );

  const retourner = () => {
    const suivant = !vu;
    setVu(suivant);
    setAnnonce(suivant ? CARTE_JOUR.statut.reponse : CARTE_JOUR.statut.question);
  };

  const copier = async () => {
    const ok = await copierTexte(prompt);
    setCopie(ok ? "ok" : "echec");
    if (minuterie.current !== null) window.clearTimeout(minuterie.current);
    minuterie.current = window.setTimeout(() => setCopie("non"), ok ? 2600 : 6000);
  };

  const ouvrir = () => {
    setMats(reglages.mats);
    setSrc(reglages.src);
    setAlerte(false);
    setErreur(null);
    setOuvert(true);
  };
  const fermer = () => setOuvert(false);

  const basculer = (cle: string) => {
    setAlerte(false);
    setErreur(null);
    setMats((cur) => (cur.includes(cle) ? cur.filter((x) => x !== cle) : [...cur, cle]));
  };

  const enregistrer = async () => {
    if (!mats.length) {
      setAlerte(true);
      return;
    }
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await reglerCarteDuJour({ mats, src });
      if (r.ok) {
        setOuvert(false);
        router.refresh();
      } else {
        setErreur(r.erreur);
      }
    } catch {
      setErreur(CARTE_JOUR.reglages.erreur);
    } finally {
      setEnvoi(false);
    }
  };

  const note = alerte ? CARTE_JOUR.reglages.alerte : (erreur ?? noteReglages(mats, src));

  return (
    <section className={classes(c.jc, className)} aria-labelledby={idTitre} data-matiere={matiere.cle}>
      {/* la carte : un bouton ; sa face cachée sort de l'arbre d'accessibilité, son nom est le texte de la face visible */}
      <button type="button" className={classes(c.fcj, vu && c.vu)} aria-pressed={vu} onClick={retourner} inert={ouvert}>
        <span className={c.fcjIn}>
          <span className={c.jf} aria-hidden={vu || undefined}>
            <Coins code={matiere.code} />
            <span className={c.jcorps}>
              <span className={c.jlab}>{CARTE_JOUR.recto.etiquette}</span>
              <span className={c.jq}>{recto}</span>
              <span className={c.indice}>
                <RotateCcw size={13} strokeWidth={2.2} aria-hidden />
                {CARTE_JOUR.recto.indice}
              </span>
            </span>
          </span>
          <span className={classes(c.jf, c.verso)} aria-hidden={!vu || undefined}>
            <Coins code={matiere.code} />
            <span className={c.jcorps}>
              <span className={c.jlab}>{CARTE_JOUR.verso.etiquette}</span>
              <span className={c.jq}>{verso}</span>
              <span className={c.indice}>
                <RotateCcw size={13} strokeWidth={2.2} aria-hidden />
                {CARTE_JOUR.verso.indice}
              </span>
            </span>
          </span>
        </span>
      </button>
      <span className={c.sr} role="status" aria-live="polite">
        {annonce}
      </span>

      {/* le HUD : le titre, l'engrenage, « Copier pour l'IA » ; inerte pendant que le panneau est ouvert */}
      <div className={c.jhud} inert={ouvert}>
        <div className={c.jt}>
          <h2 id={idTitre} className="font-brand">
            {CARTE_JOUR.titre}
          </h2>
          <p>{resume}</p>
        </div>
        <button ref={engrenage} type="button" className={c.engr} aria-label={CARTE_JOUR.reglages.ouvrir} aria-expanded={ouvert} aria-haspopup="dialog" aria-controls={idReglages} onClick={ouvrir}>
          <Settings size={16} strokeWidth={2} aria-hidden />
        </button>
        <div className={c.iaw} data-etat={copie}>
          <button type="button" className={c.ia} onClick={copier} aria-describedby={idApercu}>
            {copie === "ok" ? <Check size={14} strokeWidth={2.4} aria-hidden /> : <Copy size={14} strokeWidth={2} aria-hidden />}
            {copie === "ok" ? CARTE_JOUR.copier.copie : copie === "echec" ? CARTE_JOUR.copier.echec : CARTE_JOUR.copier.libelle}
          </button>
          <span id={idApercu} className={c.apercu} role="tooltip">
            <b>{copie === "ok" ? CARTE_JOUR.copier.apercuCopie : copie === "echec" ? CARTE_JOUR.copier.apercuEchec : CARTE_JOUR.copier.apercu}</b>
            <span>{prompt}</span>
          </span>
        </div>
      </div>

      {ouvert && (
        <div
          id={idReglages}
          ref={panneau}
          className={c.regl}
          role="dialog"
          aria-labelledby={`${id}-rt`}
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              fermer();
            }
          }}
        >
          <div className={c.rh}>
            <h3 id={`${id}-rt`} className="font-brand">
              {CARTE_JOUR.reglages.titre}
            </h3>
            <button type="button" className={c.ferme} aria-label={CARTE_JOUR.reglages.fermer} onClick={fermer}>
              <X size={15} strokeWidth={2.2} aria-hidden />
            </button>
          </div>
          <p className={c.eyebrow}>{CARTE_JOUR.reglages.matieres}</p>
          <div className={c.chips} role="group" aria-label={CARTE_JOUR.reglages.matieres}>
            {MATIERES_CARTE.map((m) => {
              const on = mats.includes(m.cle);
              return (
                <button key={m.cle} type="button" className={classes(c.chip, on && c.chipOn)} aria-pressed={on} onClick={() => basculer(m.cle)}>
                  {on && <Check size={12} strokeWidth={3} aria-hidden />}
                  {m.libelle}
                </button>
              );
            })}
          </div>
          <p className={c.eyebrow} style={{ marginTop: 3 }}>
            {CARTE_JOUR.reglages.sources}
          </p>
          <div className={c.srcs} role="radiogroup" aria-label={CARTE_JOUR.reglages.sources}>
            {SOURCES.map((cle) => {
              const on = src === cle;
              return (
                <label key={cle} className={classes(c.src, on && c.srcOn)}>
                  <input
                    type="radio"
                    name={nomRadios}
                    value={cle}
                    checked={on}
                    className={c.radioNatif}
                    onChange={() => {
                      setSrc(cle);
                      setErreur(null);
                    }}
                  />
                  <span className={c.rad} aria-hidden />
                  {SOURCES_CARTE[cle].libelle}
                </label>
              );
            })}
          </div>
          <div className={c.rpied}>
            <BoutonAction taille="sm" className={c.enregistrer} disabled={envoi} onClick={enregistrer}>
              {envoi ? CARTE_JOUR.reglages.enregistrement : CARTE_JOUR.reglages.enregistrer}
            </BoutonAction>
            <p className={classes(c.note, (alerte || erreur !== null) && c.alerte)} aria-live="polite">
              {note}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
