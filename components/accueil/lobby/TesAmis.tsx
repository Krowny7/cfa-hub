import Link from "next/link";
import { Users } from "lucide-react";
import { nombre } from "@/lib/voice";
import { PARC } from "@/lib/voice-accueil-lobby-parcours";
import { SceauUni } from "./Encre";
import l from "./Lobby.module.css";
import p from "./Parcours.module.css";
import type { AmisLobby } from "./types";

// « Tes amis » : combien sont en ligne (ou, quand la présence ne se lit pas, combien
// tu en as), trois visages (les amis en ligne d'abord, avec leur pastille verte),
// les demandes en attente et le lien vers la liste. Sans ami : l'invitation à en
// ajouter. Un lien, pas de bouton, donc pas d'encre. Les visages sont des initiales
// dans un rond (le contrat n'envoie pas de photo). Composant serveur, sans état.

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const ID = "lobby-amis-titre";
const LISTE = "/people?view=amis";

export function TesAmis({ amis, className }: { amis: AmisLobby; className?: string }) {
  const aucun = amis.total <= 0;
  return (
    <section aria-labelledby={ID} className={cx(l.carte, l.petite, p.amis, className)}>
      <header>
        <h2 id={ID} className={cx("font-brand", p.nvTitre)}>
          <SceauUni>
            <Users size={15} aria-hidden />
          </SceauUni>
          {PARC.amis.titre}
        </h2>
      </header>
      {aucun ? (
        <>
          <p className={p.premiers}>
            <b>{PARC.amis.premiers}</b>
            <span className={l.st}>{PARC.amis.premiersAide}</span>
          </p>
          {amis.demandes > 0 && (
            <Link href={LISTE} className={p.demandes}>
              {PARC.amis.demandes(amis.demandes)}
            </Link>
          )}
          <Link href="/people" className={cx(l.lien, p.basLien)}>
            {PARC.amis.trouver} →
          </Link>
        </>
      ) : (
        <>
          <p className={p.amisChiffre}>
            <b className="font-brand">{nombre(amis.enLigne ?? amis.total)}</b>
            <span>{amis.enLigne !== null ? PARC.amis.enLigneSur(amis.total) : PARC.amis.nombre(amis.total)}</span>
          </p>
          {amis.visages.length > 0 && (
            <ul className={p.visages}>
              {amis.visages.map((v) => (
                <li key={v.id} className={p.visage}>
                  <span className={l.av} aria-hidden>
                    {v.initiales}
                    {v.enLigne && <i />}
                  </span>
                  <span>
                    {v.nom}
                    {v.enLigne && <span className="sr-only">, en ligne</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {amis.demandes > 0 && (
            <Link href={LISTE} className={p.demandes}>
              {PARC.amis.demandes(amis.demandes)}
            </Link>
          )}
          <Link href={LISTE} className={cx(l.lien, p.basLien)}>
            {PARC.amis.lien} →
          </Link>
        </>
      )}
    </section>
  );
}
