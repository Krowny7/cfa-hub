"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import type { LigneQuete } from "@/lib/codex/vue";
import type { ARecuperer } from "@/lib/codex/recuperer";
import { TEXTES_TOUT as T, avanceeDetail, dureeDetail, etatClair, libelleEtat, recompenseDetail, surTitre, texteExploit } from "@/lib/codex/tout";
import { CODEX } from "@/lib/voice-codex";
import { Recuperer } from "@/components/codex/Recuperer";
import e from "./Encre.module.css";
import s from "./Codex.module.css";
import j from "./Aujourdhui.module.css";

// Le détail d'une quête, allégé (Codex simplifié, §3.6) : une feuille qui
// monte du bas (téléphone, et « Aujourd'hui » sur ordinateur), ou le panneau
// à côté de la liste (« Tout le Codex » sur ordinateur, `forme="panneau"`).
// Dans l'ordre : le sur-titre (famille · matière), le titre (l'action) et son
// état (À faire · En cours · À récupérer · Faite le 12 oct.), la barre et ce
// qui manque, la récompense sur une ligne, UN bouton (« Y aller »,
// « Récupérer +40 XP », ou rien : la date en gris), « Changer cette quête »
// en lien discret pour une quête du jour, puis « Pourquoi ▸ » et « Plus ▸ »
// repliés. La durée ne se dit que si la quête peut se finir aujourd'hui.
// Léonard n'y parle pas. Échap ou un clic à côté referme la feuille.

export function DetailQuete({
  l,
  nomMatiere,
  sobre = false,
  forme = "feuille",
  semaine = false,
  plus = [],
  recuperer,
  jour,
  demo = false,
  onClose,
  changer,
}: {
  l: LigneQuete;
  nomMatiere?: string;
  /** le mode sobre (lib/codex/sobre) : ni XP ni pièce dans la récompense */
  sobre?: boolean;
  forme?: "feuille" | "panneau";
  /** une quête de la semaine (« jusqu'à dimanche ») */
  semaine?: boolean;
  /** « Plus ▸ » : la chaîne ou la matière et sa place, « comptée avec », les dates (lib/codex/tout, plusDetail) */
  plus?: string[];
  /** ce qui attend « Récupérer » pour cette quête (vue.aRecuperer) */
  recuperer?: ARecuperer | null;
  jour: string;
  demo?: boolean;
  onClose: () => void;
  /** une quête du jour qu'on peut encore changer : « Changer cette quête », en lien discret */
  changer?: { occupe: boolean; onChanger: () => void };
}) {
  const fermer = useRef<HTMLButtonElement | null>(null);
  const feuille = forme === "feuille";

  useEffect(() => {
    if (!feuille) return;
    const avant = document.activeElement as HTMLElement | null;
    fermer.current?.focus();
    const touche = (ev: KeyboardEvent) => ev.key === "Escape" && onClose();
    window.addEventListener("keydown", touche);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", touche);
      document.body.style.overflow = overflow;
      avant?.focus?.();
    };
  }, [onClose, feuille]);

  const enigme = l.affichage === "indice" && l.etat !== "terminee";
  const verrouille = l.etat === "verrouillee";
  const etat = etatClair(l);
  const avancee = enigme ? null : avanceeDetail(l);
  const recompense = recompenseDetail(l, sobre);
  const duree = dureeDetail(l, { semaine });
  const lien = l.destination?.href ?? l.lien;
  // un seul « pourquoi » : la raison chiffrée de la destination, sinon celui du catalogue
  const pourquoi = enigme ? null : (l.destination?.raison ?? l.pourquoi ?? null);
  // à récupérer : l'entrée de vue.aRecuperer, sinon la ligne elle-même (sa récompense attend)
  const item: ARecuperer | null = l.aRecuperer
    ? (recuperer ?? { quete: l.id, periode: l.periode, titre: l.titre, famille: l.famille, xp: l.xp, aVerser: true, le: null, recompense: null, piece: null })
    : null;

  const corps = (
    <div className={j.dq}>
      <p className="t-micro m-0 pr-10">{surTitre(l, { matiere: nomMatiere, semaine })}</p>
      <div className={j.dqTete}>
        <h2 id={feuille ? "codex-detail-titre" : undefined} className={j.dqTitre}>
          {l.titre}
        </h2>
        <span className={j.etat} data-etat={etat}>
          {libelleEtat(l)}
        </span>
      </div>
      {l.optionnelle && <p className="t-micro m-0">{T.facultative}</p>}

      {enigme ? (
        <p className="t-small m-0">{texteExploit(l)}</p>
      ) : (
        <p className="t-small m-0">{l.consigne}</p>
      )}
      {l.differee && <p className="t-micro m-0">{T.apresExamen}</p>}

      {avancee && (
        <div className="flex flex-col gap-1.5">
          <span className={j.barre} aria-hidden>
            <i style={{ width: `${Math.round(l.fraction * 100)}%` }} />
          </span>
          <p className={`${j.dqAvance} m-0`}>
            <b>{avancee.texte}</b>
            {avancee.manque && <span>{avancee.manque}</span>}
          </p>
        </div>
      )}

      {/* verrouillée : ce qui manque, prérequis par prérequis (V3 §10.1) ; la carte les allume */}
      {l.manque && l.manque.length > 0 && (
        <div>
          <p className="t-micro m-0">{T.manque}</p>
          <ul className={j.plusListe}>
            {l.manque.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      {recompense && <p className={j.dqRecompense}>{recompense}</p>}
      {duree && <p className="t-micro m-0">{duree}</p>}

      {item ? (
        <Recuperer items={[item]} jour={jour} variante="bouton" sobre={sobre} demo={demo} />
      ) : etat === "faite" ? (
        <p className="t-small m-0 text-[var(--ink-3)]">{libelleEtat(l)}</p>
      ) : (
        lien &&
        !verrouille &&
        !enigme && (
          <Link href={lien} className="btn btn-primary btn-lg rl-press w-full" onClick={onClose}>
            {T.aller} <ArrowRight size={17} aria-hidden />
          </Link>
        )
      )}
      {changer && (
        <p className="m-0 text-center">
          <button type="button" className={j.lien} disabled={changer.occupe} onClick={changer.onChanger} title={CODEX.contrats.changerAide}>
            {T.changer}
          </button>
        </p>
      )}

      {pourquoi && (
        <details className={j.pli}>
          <summary>{T.pourquoi}</summary>
          <div className={j.pliCorps}>
            <p className="t-small m-0">{pourquoi}</p>
          </div>
        </details>
      )}
      {plus.length > 0 && (
        <details className={j.pli}>
          <summary>{T.plus}</summary>
          <div className={j.pliCorps}>
            <ul className={j.plusListe}>
              {plus.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        </details>
      )}
    </div>
  );

  if (!feuille) {
    return (
      <section className={`card ${j.panneauDetail}`} aria-label={l.titre}>
        {corps}
      </section>
    );
  }
  return (
    <div className={s.voile} onMouseDown={(ev) => ev.target === ev.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="codex-detail-titre" className={`${s.feuille} ${e.carnet}`}>
        <button ref={fermer} type="button" className={s.fermer} onClick={onClose} aria-label={CODEX.detail.fermer}>
          <X size={20} aria-hidden />
        </button>
        {corps}
      </div>
    </div>
  );
}
