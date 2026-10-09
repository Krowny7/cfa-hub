"use client";

import { useState } from "react";
import { Stamp, X } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { SANS_TAMPON, TAMPONS_LISTE, totalTampons, type ComptesTampons, type Tampon } from "@/lib/profil/tampons";
import { MOTS, TAMPONS } from "@/lib/voice-social";
import s from "./Tampons.module.css";

// Les tampons d'une cible (le profil, une entrée du Journal) : Bravo,
// Respect, Revanche ?, un seul par personne. Sur le profil d'un autre
// (`peut`), toucher un tampon le pose, toucher le sien le retire, toucher
// un autre le change ; les comptes suivent tout de suite et la base
// confirme (rl_tamponner, plafond de 30 par jour). Sur son propre profil :
// les comptes reçus seulement, jamais qui. Variante « entree » : les
// comptes en petit, et les trois choix à la demande (un bouton).

const ANGLES = ["-2.5deg", "1.8deg", "-1.2deg"];

function apres(c: ComptesTampons, t: Tampon | null): ComptesTampons {
  const n = { ...c };
  if (c.mien) n[c.mien] = Math.max(0, n[c.mien] - 1);
  if (t) n[t] += 1;
  n.mien = t;
  return n;
}

export function TamponsCible({
  pour,
  cible,
  comptes: initiaux,
  peut,
  variante = "profil",
}: {
  pour: string;
  cible: string;
  comptes: ComptesTampons | undefined;
  /** celui qui regarde peut tamponner (le profil d'un autre, hors aperçu) */
  peut: boolean;
  variante?: "profil" | "entree";
}) {
  const [c, setC] = useState<ComptesTampons>(initiaux ?? SANS_TAMPON);
  const [pose, setPose] = useState<Tampon | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const petit = variante === "entree";

  async function toucher(t: Tampon) {
    if (occupe) return;
    const avant = c;
    const choix = c.mien === t ? null : t;
    setC(apres(c, choix));
    setPose(choix);
    setErreur(null);
    setOccupe(true);
    try {
      const { error } = await createClient().rpc("rl_tamponner", { p_pour: pour, p_cible: cible, p_tampon: choix });
      if (error) {
        setC(avant);
        setPose(null);
        setErreur(/daily stamp limit/i.test(error.message) ? TAMPONS.plafond : TAMPONS.erreur);
      }
    } catch {
      setC(avant);
      setPose(null);
      setErreur(TAMPONS.erreur);
    } finally {
      setOccupe(false);
    }
  }

  // les choix s'affichent : toujours sur le profil d'un autre, à la demande sur une entrée
  const choix = peut && (!petit || ouvert);
  const visibles = choix ? TAMPONS_LISTE : TAMPONS_LISTE.filter((t) => c[t] > 0);
  if (!peut && totalTampons(c) === 0) return null;

  const classe = (t: Tampon) => [s.tampon, petit ? s.petit : "", c.mien === t ? s.mien : c[t] > 0 ? s.recu : "", pose === t ? s.pose : ""].join(" ");
  const corps = (t: Tampon) => (
    <>
      <span className={s.mot} style={{ ["--angle" as string]: ANGLES[TAMPONS_LISTE.indexOf(t)] }}>
        {MOTS[t]}
      </span>
      {c[t] > 0 && <span className={s.n}>{c[t]}</span>}
    </>
  );

  return (
    <div className={petit ? "flex flex-wrap items-center gap-x-1 gap-y-0.5" : "flex flex-col gap-1"}>
      <div className={"flex flex-wrap items-center " + (petit ? "gap-1" : "gap-x-1 gap-y-0")}>
        {/* téléphone : le libellé sur sa ligne, les trois tampons sur la suivante */}
        {!petit && <span className="t-micro mr-1 max-sm:basis-full">{peut ? TAMPONS.tamponner : TAMPONS.recus}</span>}
        <div role="group" aria-label={peut ? TAMPONS.tamponner : TAMPONS.recus} title={peut ? TAMPONS.aide : undefined} className={"flex flex-wrap items-center " + (petit ? "gap-0.5" : "-ml-1.5 gap-0.5 sm:ml-0")}>
          {visibles.map((t) =>
            choix ? (
              <button
                key={t}
                type="button"
                className={classe(t)}
                aria-pressed={c.mien === t}
                aria-label={c.mien === t ? TAMPONS.retirer(MOTS[t], c[t]) : TAMPONS.poser(MOTS[t], c[t])}
                onClick={() => void toucher(t)}
              >
                {corps(t)}
              </button>
            ) : (
              <span key={t} className={classe(t)} aria-label={TAMPONS.compte(MOTS[t], c[t])} role="img">
                {corps(t)}
              </span>
            ),
          )}
        </div>
        {petit && peut && (
          <button
            type="button"
            className="relative grid h-8 w-8 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-white after:absolute after:-inset-1.5 after:content-['']"
            aria-expanded={ouvert}
            aria-label={ouvert ? TAMPONS.fermer : TAMPONS.ouvrir}
            title={ouvert ? TAMPONS.fermer : TAMPONS.ouvrir}
            onClick={() => setOuvert((o) => !o)}
          >
            {ouvert ? <X size={14} aria-hidden /> : <Stamp size={15} aria-hidden />}
          </button>
        )}
      </div>
      {erreur && (
        <p role="alert" className="t-small m-0 basis-full text-pen">
          {erreur}
        </p>
      )}
    </div>
  );
}
