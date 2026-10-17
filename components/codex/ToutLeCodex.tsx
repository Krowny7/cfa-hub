"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { LigneQuete as Ligne, VueCodex } from "@/lib/codex/vue";
import {
  TEXTES_TOUT as T, actesParcours, aRecupererDe, avanceeActe, etapesMontrees, exploitsTout, matieresFinies, matieresTout, objectifsLongs, queteParDefaut,
  resumeExploits, resumeMatieres, resumeObjectifs, resumeParcours, texteExploit, texteGain,
} from "@/lib/codex/tout";
import { CODEX } from "@/lib/voice-codex";
import { LigneQuete } from "@/components/codex/LigneQuete";
import { Recuperer } from "@/components/codex/Recuperer";
import { TaSemaine } from "@/components/codex/Aujourdhui";
import { etiquetteActe } from "@/components/codex/CarteCodex";
import s from "./Aujourdhui.module.css";

// Le segment « Tout le Codex » de /codex (Codex simplifié, §3.3 et §3.4) :
// quatre replis résumés en une ligne (Parcours · Matières · Objectifs longs ·
// Exploits), puis « Ta semaine » et « Voir la carte » (?vue=carte). Chaque
// quête est une LigneQuete ; une quête à récupérer porte son bouton
// « Récupérer ». Sur ordinateur (1 024 px et plus), maître-détail : les
// quatre replis ouverts à gauche, le détail de la quête choisie à droite,
// collé à l'écran ; d'office, la première à récupérer, sinon la première en
// cours. Sur téléphone, une quête touchée ouvre sa feuille (`onQuete`).
// Une famille pas encore dévoilée n'a pas de repli. `demo` : aperçus.

const LARGE = "(min-width: 1024px)";
const cle = (l: Pick<Ligne, "id" | "periode">) => `${l.id}|${l.periode}`;

export function ToutLeCodex({
  vue,
  montre,
  demo = false,
  filRouge = true,
  onQuete,
  onVue,
  onCarte,
  detail,
}: {
  vue: VueCodex;
  montre: (quoi: string) => boolean;
  demo?: boolean;
  /** faux : le fil rouge est déjà en tête de page (après l'examen) */
  filRouge?: boolean;
  onQuete: (l: Ligne) => void;
  onVue?: (v: VueCodex) => void;
  onCarte: () => void;
  /** le détail d'une quête, en panneau (ordinateur) */
  detail: (l: Ligne) => ReactNode;
}) {
  const [large, setLarge] = useState(false);
  const [choix, setChoix] = useState<string | null>(null);
  const replis = useRef<HTMLDivElement | null>(null);

  // sur ordinateur, les quatre replis s'ouvrent d'emblée (une fois : le joueur les replie s'il veut)
  useEffect(() => {
    const mq = window.matchMedia(LARGE);
    const maj = () => setLarge(mq.matches);
    maj();
    if (mq.matches) replis.current?.querySelectorAll<HTMLDetailsElement>("details[data-large]").forEach((d) => (d.open = true));
    mq.addEventListener("change", maj);
    return () => mq.removeEventListener("change", maj);
  }, []);

  const actes = useMemo(() => actesParcours(vue.trame), [vue.trame]);
  const matieres = useMemo(() => (montre("codex:branches") ? matieresTout(vue.branches, vue.cap) : []), [vue.branches, vue.cap, montre]);
  const objectifs = useMemo(() => (montre("codex:longcours") ? objectifsLongs(vue.longCours, filRouge ? vue.filRouge : { chapitres: [], aVenir: true }) : []), [vue.longCours, vue.filRouge, filRouge, montre]);
  const exploits = useMemo(() => exploitsTout(montre("codex:exploits") ? vue.exploits : []), [vue.exploits, montre]);
  const parcours = resumeParcours(vue.trame, etiquetteActe);

  // les quêtes dans l'ordre de l'écran : la quête montrée d'office en vient
  const ordre = useMemo(
    () => [...actes.filter((a) => a.courant).flatMap((a) => a.quetes), ...matieres.map((m) => m.etape), ...objectifs.map((o) => o.ligne), ...exploits.aRecuperer, ...exploits.aTrouver],
    [actes, matieres, objectifs, exploits],
  );
  const choisie = (choix ? ordre.concat(actes.flatMap((a) => a.quetes), exploits.trouves, vue.hebdo).find((l) => cle(l) === choix) : null) ?? queteParDefaut(ordre);
  const ouvrir = (l: Ligne) => (large ? setChoix(cle(l)) : onQuete(l));

  const ligne = (l: Ligne, o: { sous?: string | null; texte?: string | null } = {}) => {
    const attend = l.aRecuperer ? aRecupererDe(vue.aRecuperer, l) : null;
    return (
      <LigneQuete
        key={cle(l)}
        l={l}
        sobre={vue.sobre}
        onOuvrir={ouvrir}
        sous={o.sous}
        texte={o.texte}
        choisie={large && !!choisie && cle(choisie) === cle(l)}
        action={l.aRecuperer ? <Recuperer items={[attend ?? { quete: l.id, periode: l.periode, titre: l.titre, famille: l.famille, xp: l.xp, aVerser: true, le: null, recompense: null, piece: null }]} jour={vue.jour} variante="bouton" court sobre={vue.sobre} demo={demo} /> : undefined}
      />
    );
  };

  return (
    <div className={s.tout}>
      <div className={s.toutListe}>
        <div ref={replis} className={`card-quiet ${s.replis}`}>
          {actes.length > 0 && (
            <details className={s.pli} data-large data-leonard="trame">
              <summary>
                {T.parcours} {parcours && <span className={s.val}>{parcours}</span>}
              </summary>
              <div className={s.pliCorps}>
                {actes.map((a) => {
                  const { lignes, autres } = etapesMontrees(a);
                  return (
                    <details key={a.acte.id} className={`${s.pli} ${s.acte}`} open={a.courant || undefined}>
                      <summary>
                        {etiquetteActe(a.acte)} · {a.acte.titre} <span className={s.val}>· {avanceeActe(a)}</span>
                      </summary>
                      <div className={s.pliCorps}>
                        {a.acte.but && <p className="t-small m-0">{T.but(a.acte.but)}</p>}
                        {lignes.map((l) => ligne(l))}
                        {autres > 0 && <p className="t-micro m-0">{T.autresFaites(autres)}</p>}
                      </div>
                    </details>
                  );
                })}
              </div>
            </details>
          )}

          {matieres.length > 0 && (
            <details className={s.pli} data-large>
              <summary>
                {T.matieres} <span className={s.val}>{resumeMatieres(vue.branches)}</span>
              </summary>
              <div className={s.pliCorps}>
                {matieres.map((m) => ligne(m.etape, { sous: [m.b.contenu.court, texteGain(m.gain)].filter(Boolean).join(" · ") }))}
                {matieresFinies(vue.branches) > 0 && <p className="t-micro m-0">{T.matieresFinies(matieresFinies(vue.branches))}</p>}
              </div>
            </details>
          )}

          {objectifs.length > 0 && (
            <details className={s.pli} data-large data-leonard="longcours">
              <summary>
                {T.objectifs} <span className={s.val}>{resumeObjectifs(vue.longCours)}</span>
              </summary>
              <div className={s.pliCorps}>{objectifs.map((o) => ligne(o.ligne, { sous: o.sous }))}</div>
            </details>
          )}

          {exploits.aTrouver.length + exploits.trouves.length > 0 && (
            <details className={s.pli} data-large>
              <summary>
                {T.exploits} <span className={s.val}>{resumeExploits(vue.exploits)}</span>
              </summary>
              <div className={s.pliCorps}>
                {exploits.aRecuperer.map((l) => ligne(l, { texte: l.consigne }))}
                {exploits.aTrouver.map((l) => ligne(l, { texte: texteExploit(l) }))}
                {exploits.trouves.length > 0 && (
                  <details className={`${s.pli} ${s.acte}`}>
                    <summary>{T.trouves(exploits.trouves.length)}</summary>
                    <div className={s.pliCorps}>{exploits.trouves.map((l) => ligne(l, { texte: l.consigne }))}</div>
                  </details>
                )}
                {vue.collection && (
                  <Link href={vue.collection} className={s.lienCarte}>
                    {CODEX.exploits.collection} <ChevronRight size={16} aria-hidden />
                  </Link>
                )}
              </div>
            </details>
          )}

          <TaSemaine vue={vue} demo={demo} onQuete={ouvrir} onVue={onVue} ligne={(l) => ligne(l)} />

          <button type="button" className={`${s.lienCarte} ${s.pliBouton}`} onClick={onCarte}>
            {T.carte} <ChevronRight size={16} aria-hidden />
          </button>
        </div>
      </div>
      {large && choisie ? detail(choisie) : large && <p className={`card-quiet t-small m-0 p-5 ${s.panneauVide}`}>{T.detailVide}</p>}
    </div>
  );
}
