"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BanniereVs } from "@/components/arene/BanniereVs";
import { dejaJoue, marquerJoue, modeDiscret, precharger } from "@/lib/arene/client";
import { joueurArene, lireArene, lireElos, type JoueurArene } from "@/lib/arene/donnees";
import { ARENE_VIDE, fondDe } from "@/lib/arene/perso";
import { VS_DUREE_MS, VS_SORTIE_MS, dispositionVs, joueursMontres, planVs } from "@/lib/arene/regles";
import { DEFAULT_ELO } from "@/lib/ranks";
import { createClient } from "@/lib/supabase/browser";
import { ARENE } from "@/lib/voice-arene";
import s from "./Arene.module.css";

// L'écran VS du début d'une partie : un calque sur la page en cours, les
// bannières et le « VS » au-dessus, 3 secondes, puis il s'efface seul. Il ne
// tient rien : les clics passent à travers, le chrono et la partie vivent leur
// vie, et il se retire dès que `actif` tombe (la partie démarre). Une fois par
// partie (`cle`), jamais en mode discret ; si une donnée manque, il ne s'affiche pas.
// Deux joueurs : une bannière en haut à gauche, une en bas à droite. 3 ou 4 : le
// quinconce. Dès 5 : la mosaïque, 8 bannières au plus, le nombre au milieu.

export type JoueurVs = { id: string; pseudo: string | null; photo: string | null; elo?: number | null };

const ATTENTE_IMAGES_MS = 900;
/** Les variantes du trait, dans l'ordre des maquettes. */
const QUINCONCE = [
  { droite: false, t2: false },
  { droite: true, t2: true },
  { droite: false, t2: true },
  { droite: true, t2: false },
];
const MOSAIQUE = [
  { droite: false, t2: false },
  { droite: false, t2: true },
  { droite: true, t2: false },
  { droite: false, t2: true },
  { droite: true, t2: true },
  { droite: false, t2: false },
  { droite: false, t2: true },
  { droite: true, t2: false },
];

export function EcranVs({
  cle,
  joueurs,
  moiId,
  maitrise = null,
  hud,
  actif = true,
}: {
  /** la partie (« duel:<id> », « salle:<id> ») : l'écran ne se joue qu'une fois pour elle */
  cle: string;
  joueurs: JoueurVs[];
  moiId: string;
  /** ma maîtrise, pour le verrou de mon rang */
  maitrise?: number | null;
  /** la ligne en haut à droite (« Duel classé · 30 questions ») */
  hud: string;
  /** faux dès que la partie démarre : l'écran se retire */
  actif?: boolean;
}) {
  const [vus, setVus] = useState<{ liste: JoueurArene[]; total: number } | null>(null);
  const [sortie, setSortie] = useState(false);
  const actifRef = useRef(actif);
  const dernier = useRef(joueurs);
  // avant l'effet ci-dessous : il lit la dernière valeur, sans se relancer à chaque rendu
  useEffect(() => {
    actifRef.current = actif;
    dernier.current = joueurs;
  });
  const ids = joueurs.map((j) => j.id).join("|");

  useEffect(() => {
    let abandon = false;
    const tous = dernier.current;
    if (!planVs({ joueurs: tous, discret: modeDiscret(), dejaVu: dejaJoue(`vs:${cle}`), demarree: !actifRef.current })) return;
    const montres = joueursMontres(tous, moiId);
    const encore = () => !abandon && actifRef.current;
    void (async () => {
      try {
        const sb = createClient();
        const idsMontres = montres.map((j) => j.id);
        const [arenes, elos] = await Promise.all([lireArene(sb, idsMontres), montres.every((j) => typeof j.elo === "number") ? null : lireElos(sb, idsMontres)]);
        if (!encore()) return;
        // sans ELO lisible, on ne devine rien : pas d'écran
        if (!elos && montres.some((j) => typeof j.elo !== "number")) return;
        const liste = montres.map((j) =>
          joueurArene(
            { id: j.id, pseudo: (j.pseudo ?? "").trim(), photo: j.photo, elo: j.elo ?? elos?.get(j.id) ?? DEFAULT_ELO, maitrise: j.id === moiId ? maitrise : null },
            arenes.get(j.id) ?? ARENE_VIDE,
          ),
        );
        await precharger(liste.flatMap((j) => [fondDe(j.arene, j.id).src, ...(j.photo ? [j.photo] : [])]), ATTENTE_IMAGES_MS);
        if (!encore()) return;
        marquerJoue(`vs:${cle}`);
        setVus({ liste, total: tous.length });
      } catch {
        // pas de client ou pas de réseau : la partie se passe de l'écran
      }
    })();
    return () => {
      abandon = true;
    };
    // une tentative par partie et par liste de joueurs (`maitrise` et `moiId` n'en lancent pas d'autre)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle, ids]);

  useEffect(() => {
    if (!vus) return;
    const a = setTimeout(() => setSortie(true), VS_DUREE_MS - VS_SORTIE_MS);
    const b = setTimeout(() => setVus(null), VS_DUREE_MS);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [vus]);

  if (!vus || !actif) return null;
  const { liste, total } = vus;
  const disposition = dispositionVs(total);
  if (!disposition) return null;
  const noms = liste.map((j) => j.pseudo);

  return createPortal(
    <div className={s.calque} data-passe="1" data-sortie={sortie ? "1" : "0"} role="img" aria-label={ARENE.vsAria(noms)}>
      <div className={s.scene} data-disposition={disposition} data-nb={liste.length}>
        {disposition === "mosaique" ? (
          <div className={s.grille}>
            {liste.slice(0, 4).map((j, i) => (
              <BanniereVs key={j.id} j={j} compact {...MOSAIQUE[i]} />
            ))}
            <p className={s.milieu}>{ARENE.nbJoueurs(total)}</p>
            {liste.slice(4).map((j, i) => (
              <BanniereVs key={j.id} j={j} compact {...MOSAIQUE[i + 4]} />
            ))}
          </div>
        ) : (
          <>
            <div className={s.entaille} />
            {disposition === "duo" ? (
              <>
                <BanniereVs j={liste[0]} className={s.duoA} />
                <BanniereVs j={liste[1]} className={s.duoB} droite t2 />
              </>
            ) : (
              liste.map((j, i) => <BanniereVs key={j.id} j={j} className={[s.q0, s.q1, s.q2, s.q3][i]} {...QUINCONCE[i]} />)
            )}
            <p className={s.vs}>{ARENE.vs}</p>
            <p className={s.hud}>{hud}</p>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
