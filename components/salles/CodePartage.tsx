"use client";

import { useRef, useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";
import { formaterCode } from "@/lib/salles/logique";
import { SALLES } from "@/lib/voice-salles";
import s from "./Salles.module.css";

// Le code de la salle, en grand, avec deux boutons : copier le code, copier le
// lien d'invitation (/salles/rejoindre?code=…, qui pré-remplit le champ). La
// copie dit « Copié » dans une zone lue par les lecteurs d'écran ; si le
// navigateur refuse, on le dit (le code est sélectionnable d'un clic).

async function copier(texte: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texte);
    return true;
  } catch {
    try {
      const t = document.createElement("textarea");
      t.value = texte;
      t.setAttribute("readonly", "");
      t.style.position = "fixed";
      t.style.opacity = "0";
      document.body.appendChild(t);
      t.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(t);
      return ok;
    } catch {
      return false;
    }
  }
}

export function CodePartage({ code }: { code: string }) {
  const [etat, setEtat] = useState<"" | "code" | "lien" | "echec">("");
  const minuteur = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const brut = code.toUpperCase();

  async function faire(quoi: "code" | "lien") {
    const texte = quoi === "code" ? brut : `${window.location.origin}/salles/rejoindre?code=${brut}`;
    const ok = await copier(texte);
    setEtat(ok ? quoi : "echec");
    clearTimeout(minuteur.current);
    minuteur.current = setTimeout(() => setEtat(""), 2200);
  }

  return (
    <div className={s.codeBloc} data-copie={etat === "code" || etat === "lien" ? "1" : "0"}>
      <span className={s.codeLabel}>{SALLES.codeSalle}</span>
      <span className={s.codeValeur} aria-label={`${SALLES.codeSalle} : ${brut.split("").join(" ")}`}>
        {formaterCode(brut)}
      </span>
      <div className={s.codeActions}>
        <button type="button" className={[s.btn, s.btnDiscret].join(" ")} onClick={() => faire("code")}>
          {etat === "code" ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />} {SALLES.copier}
        </button>
        <button type="button" className={[s.btn, s.btnDiscret].join(" ")} onClick={() => faire("lien")}>
          {etat === "lien" ? <Check size={16} aria-hidden /> : <Link2 size={16} aria-hidden />} {SALLES.copierLien}
        </button>
      </div>
      <span role="status" aria-live="polite" className={s.aide} style={{ minHeight: 18 }}>
        {etat === "code" ? SALLES.copie : etat === "lien" ? SALLES.copieLien : etat === "echec" ? SALLES.copieEchec : ""}
      </span>
    </div>
  );
}
