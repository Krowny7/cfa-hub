"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { TERMINAL as T } from "@/lib/voice-terminal";
import { CODES, cleEcran, completer, lireCommande, normaliser, type Ecran } from "./commandes";
import { VALEURS } from "./donnees";
import { EcranActif } from "./Ecrans";
import { EXERCICES } from "./exercices";
import { PanneauExercices, type Position } from "./PanneauExercices";
import s from "./Terminal.module.css";

// Le Terminal : une interface de marché générique, sombre quel que soit le thème du site. La
// barre, la ligne de commande, l'écran actif et les exercices à côté, la rangée de touches.

export function Terminal() {
  const [ecran, setEcran] = useState<Ecran>({ code: "AIDE" });
  const [valeur, setValeur] = useState(VALEURS[0].code);
  const [saisie, setSaisie] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const champ = useRef<HTMLInputElement | null>(null);
  const passees = useRef<string[]>([]);
  const rappel = useRef(0);

  // le curseur attend dans la ligne de commande, sauf au téléphone où il sortirait le clavier
  useEffect(() => {
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) champ.current?.focus();
  }, []);

  function lancer(commande: string) {
    const l = lireCommande(commande, valeur, EXERCICES.length);
    if (l.k === "erreur") {
      setMessage(l.message);
      return;
    }
    setMessage(null);
    if (l.k === "exercice") {
      setPosition({ i: l.i, pas: 0 });
      return;
    }
    setEcran(l.ecran);
    if ("valeur" in l.ecran) setValeur(l.ecran.valeur);
    if (position) {
      const etape = EXERCICES[position.i].etapes[position.pas];
      if (etape?.t === "commande" && etape.attendu === cleEcran(l.ecran)) setPosition({ i: position.i, pas: position.pas + 1 });
    }
  }

  function soumettre(e: FormEvent) {
    e.preventDefault();
    const commande = saisie.trim();
    if (!commande) return;
    passees.current = [...passees.current, commande];
    rappel.current = passees.current.length;
    setSaisie("");
    lancer(commande);
  }

  function touche(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      const liste = passees.current;
      if (liste.length === 0) return;
      e.preventDefault();
      rappel.current = Math.max(0, Math.min(liste.length, rappel.current + (e.key === "ArrowUp" ? -1 : 1)));
      setSaisie(liste[rappel.current] ?? "");
    } else if (e.key === "Tab" && !e.shiftKey) {
      const complet = completer(saisie);
      if (complet) {
        e.preventDefault();
        setSaisie(complet);
      }
    } else if (e.key === "Escape") {
      setSaisie("");
      setMessage(null);
    }
  }

  const mot = normaliser(saisie).split(" ")[0];
  const proche = mot ? CODES.find((c) => c.startsWith(mot)) : undefined;
  const indice = message ?? (proche ? `${proche} : ${T.descriptions[proche]}` : T.astuce);

  return (
    <div className={s.terminal}>
      <header className={s.barre}>
        <h1>{T.nom}</h1>
        <span className={s.fictif}>{T.fictif}</span>
      </header>

      <form className={s.ligne} onSubmit={soumettre}>
        <span aria-hidden className={s.invite}>
          &gt;
        </span>
        <label className={s.champ}>
          <span className="sr-only">{T.commandeLibelle}</span>
          <input
            ref={champ}
            value={saisie}
            placeholder={T.invite}
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            onChange={(e) => {
              setSaisie(e.target.value);
              setMessage(null);
            }}
            onKeyDown={touche}
          />
        </label>
        <button type="submit" className={s.action} disabled={!saisie.trim()}>
          {T.executer}
        </button>
      </form>
      <p className={s.indice} data-erreur={message !== null} aria-live="polite">
        {indice}
      </p>

      <div className={s.corps}>
        <section className={s.ecran} aria-label={cleEcran(ecran)}>
          <EcranActif ecran={ecran} onLancer={lancer} />
        </section>
        <aside className={s.panneau} aria-label={T.exercices}>
          <PanneauExercices
            position={position}
            onCommencer={(i) => setPosition({ i, pas: 0 })}
            onAvancer={() => setPosition((p) => (p ? { i: p.i, pas: p.pas + 1 } : p))}
            onQuitter={() => setPosition(null)}
          />
        </aside>
      </div>

      <nav className={s.touches} aria-label={T.touches}>
        {CODES.map((c) => (
          <button key={c} type="button" className={s.touche} aria-current={ecran.code === c ? "true" : undefined} onClick={() => lancer(c)}>
            {c}
          </button>
        ))}
      </nav>
    </div>
  );
}
