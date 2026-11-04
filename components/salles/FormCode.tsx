"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DoorOpen } from "lucide-react";
import { BoutonEnvoi } from "@/components/classement/Encre";
import { analyserCode, normaliserCode, SALLE_CODE_LONGUEUR } from "@/lib/salles/logique";
import { messageErreurSalle, rejoindreSalleParCode } from "@/lib/salles/api";
import { createClient } from "@/lib/supabase/browser";
import { SALLES } from "@/lib/voice-salles";
import s from "./Salles.module.css";

// Le champ « Rejoindre avec un code » : 6 caractères (le tiret se pose tout
// seul : K7M-X2Q), contrôlés avant tout appel (pas de 0, 1, O, I ni L), puis
// rejoindre_salle ; on entre dans la salle ou on lit la raison du refus. Sert
// sur /salles, sur /salles/rejoindre?code= et, avec `surCarte` (libellé réservé
// aux lecteurs d'écran, bouton à contour : le bouton d'encre de la carte reste
// seul), sur la carte peinte de S'affronter. Le client Supabase n'est créé que
// dans le navigateur ; `demo` (aperçus) : rien ne part.

/** La saisie telle qu'on l'affiche : majuscules, 6 caractères au plus, un tiret après le troisième. */
export function saisieCode(brut: string): string {
  const n = normaliserCode(brut).slice(0, SALLE_CODE_LONGUEUR);
  return n.length > 3 ? `${n.slice(0, 3)}-${n.slice(3)}` : n;
}

export function FormCode({ initial = "", id = "salle-code", demo = false, surCarte = false }: { initial?: string; id?: string; demo?: boolean; surCarte?: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState(saisieCode(initial));
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const client = useRef<SupabaseClient | null>(null);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (envoi) return;
    const lu = analyserCode(code);
    if (!lu.ok) {
      setErreur(lu.erreur);
      return;
    }
    if (demo) {
      setErreur("Aperçu : aucune salle n'est jointe.");
      return;
    }
    setEnvoi(true);
    setErreur(null);
    try {
      client.current ??= createClient();
      const r = await rejoindreSalleParCode(client.current, lu.code);
      router.push(`/salles/${r.id}`);
    } catch (err) {
      setErreur(messageErreurSalle(err));
      setEnvoi(false);
    }
  }

  const erreurId = `${id}-erreur`;
  return (
    <form className={s.formCode} onSubmit={envoyer} noValidate aria-label={SALLES.codeTitre}>
      <label htmlFor={id} className={surCarte ? "sr-only" : s.libelle}>
        {SALLES.codeLabel}
      </label>
      <div className={s.formCodeRangee}>
        <input
          id={id}
          name="code"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={SALLE_CODE_LONGUEUR + 1}
          placeholder={SALLES.codeExemple}
          className={[s.champ, s.champCode].join(" ")}
          value={code}
          aria-invalid={erreur ? true : undefined}
          aria-describedby={erreur ? erreurId : undefined}
          onChange={(e) => {
            setCode(saisieCode(e.target.value));
            setErreur(null);
          }}
        />
        {surCarte ? (
          <button type="submit" className={s.btn} disabled={envoi}>
            {envoi ? SALLES.codeEnCours : SALLES.codeEnvoi}
          </button>
        ) : (
          <BoutonEnvoi className={s.compact} disabled={envoi}>
            <DoorOpen size={17} aria-hidden /> {envoi ? SALLES.codeEnCours : SALLES.codeEnvoi}
          </BoutonEnvoi>
        )}
      </div>
      {erreur && (
        <p id={erreurId} role="alert" className={s.erreur}>
          {erreur}
        </p>
      )}
    </form>
  );
}
