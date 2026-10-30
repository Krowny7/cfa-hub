"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Globe, Lock, Plus } from "lucide-react";
import { SALLE_DESCRIPTION_MAX, SALLE_NOM_MAX, SALLE_NOM_MIN } from "@/lib/salles/logique";
import { flechesRadios } from "@/components/salles/radios";
import { creerSalle, messageErreurSalle } from "@/lib/salles/api";
import { createClient } from "@/lib/supabase/browser";
import { SALLES } from "@/lib/voice-salles";
import s from "./Salles.module.css";

// « Créer une salle » : un nom, publique ou privée (privée par défaut : on n'y
// entre qu'avec le code), une phrase facultative. creer_salle renvoie la salle
// et son code ; on arrive dans le salon, où l'admin règle la partie. `demo`
// (aperçus) : rien ne part.

export function FormCreer({ demo = false }: { demo?: boolean }) {
  const router = useRouter();
  const uid = useId();
  const [nom, setNom] = useState("");
  const [publique, setPublique] = useState(false);
  const [description, setDescription] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const client = useRef<SupabaseClient | null>(null);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (envoi) return;
    const n = nom.trim();
    if (n.length < SALLE_NOM_MIN || n.length > SALLE_NOM_MAX) {
      setErreur(`Le nom de la salle compte de ${SALLE_NOM_MIN} à ${SALLE_NOM_MAX} caractères.`);
      return;
    }
    if (demo) {
      setErreur("Aperçu : aucune salle n'est créée.");
      return;
    }
    setEnvoi(true);
    setErreur(null);
    try {
      client.current ??= createClient();
      const r = await creerSalle(client.current, n, publique, description.trim() || null);
      router.push(`/salles/${r.id}`);
    } catch (err) {
      setErreur(messageErreurSalle(err));
      setEnvoi(false);
    }
  }

  return (
    <form className={s.formulaire} onSubmit={envoyer} noValidate aria-label={SALLES.pageTitre}>
      <div className={s.etiquetteChamp}>
        <label htmlFor={`${uid}-nom`} className={s.libelle}>
          {SALLES.nomLabel}
        </label>
        <input
          id={`${uid}-nom`}
          name="nom"
          type="text"
          autoComplete="off"
          maxLength={SALLE_NOM_MAX}
          placeholder={SALLES.nomExemple}
          className={s.champ}
          value={nom}
          aria-describedby={`${uid}-nom-aide`}
          onChange={(e) => {
            setNom(e.target.value);
            setErreur(null);
          }}
        />
        <span id={`${uid}-nom-aide`} className={s.aide}>
          {SALLES.nomAide}
        </span>
      </div>

      <fieldset className={s.bloc}>
        <legend className={s.libelle}>{SALLES.visibiliteLabel}</legend>
        <div className={s.deux} role="radiogroup" aria-label={SALLES.visibiliteLabel} onKeyDown={flechesRadios}>
          <button type="button" role="radio" aria-checked={!publique} tabIndex={!publique ? 0 : -1} className={s.puce} onClick={() => setPublique(false)}>
            <b>
              <Lock size={15} aria-hidden style={{ display: "inline", verticalAlign: "-2px", marginRight: 6 }} />
              {SALLES.privee}
            </b>
            <span>{SALLES.priveeAide}</span>
          </button>
          <button type="button" role="radio" aria-checked={publique} tabIndex={publique ? 0 : -1} className={s.puce} onClick={() => setPublique(true)}>
            <b>
              <Globe size={15} aria-hidden style={{ display: "inline", verticalAlign: "-2px", marginRight: 6 }} />
              {SALLES.publique}
            </b>
            <span>{SALLES.publiqueAide}</span>
          </button>
        </div>
      </fieldset>

      <div className={s.etiquetteChamp}>
        <label htmlFor={`${uid}-desc`} className={s.libelle}>
          {SALLES.descriptionLabel}
        </label>
        <input
          id={`${uid}-desc`}
          name="description"
          type="text"
          autoComplete="off"
          maxLength={SALLE_DESCRIPTION_MAX}
          placeholder={SALLES.descriptionExemple}
          className={s.champ}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {erreur && (
        <p role="alert" className={s.erreur}>
          {erreur}
        </p>
      )}
      <div>
        <button type="submit" className={[s.btn, s.btnPrimaire].join(" ")} disabled={envoi}>
          <Plus size={20} aria-hidden /> {envoi ? SALLES.creerEnCours : SALLES.creerEnvoi}
        </button>
      </div>
    </form>
  );
}
