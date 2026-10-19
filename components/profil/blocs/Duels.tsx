import { Swords } from "lucide-react";
import { couleurCss } from "@/lib/profil/catalogue";
import type { IssueDuel } from "@/lib/profil/blocs-donnees";
import { nombre, pct } from "@/lib/voice";
import { BLOCS_NEUVES as V } from "@/lib/voice-blocs-neuves";
import { Cellule, Coque, DemiBande, Vide, type Ctx } from "./commun";
import { Mention, Tete, part, poids, vars } from "./neuves";
import n from "./neuves.module.css";

// Le bloc « Duels » (duels) : « Bilan ». Un anneau à la couleur du joueur
// se remplit jusqu'à son taux de victoires (le % au centre) ; à côté,
// « de victoires », son nombre de duels en grand et « 12 V · 7 D » ; sous
// l'anneau (à droite en héros et en bande), ses 5 derniers duels en
// pastilles : V vert, D rouge, N gris, du plus ancien au plus récent. Les
// totaux sont publics ; la suite des 5 derniers suit la visibilité du
// Journal (absente quand il est fermé). Aucune comparaison : le même
// dessin chez soi et chez un autre. Les nuls ne sont pas comptés à part
// (les stats ne les connaissent pas) : D = joués − gagnés. Sans duel : rien
// en vue publique, l'état vide dans Personnaliser. Sans état.

const ICONE = <Swords size={17} aria-hidden />;

/** L'anneau du taux de victoires : une piste de crayon, l'arc à la couleur du joueur, le % au centre. */
function Anneau({ p, couleur, dit }: { p: number; couleur: string; dit: string }) {
  const texte = pct(p);
  return (
    <span className={n.anneau} style={vars({ "--k": couleur })} role="img" aria-label={dit}>
      <svg viewBox="0 0 100 100" aria-hidden focusable="false">
        <circle className={n.piste} cx="50" cy="50" r="42" pathLength={100} />
        {p > 0 && <circle className={n.rempli} cx="50" cy="50" r="42" pathLength={100} transform="rotate(-90 50 50)" style={vars({ "--p": p })} />}
      </svg>
      <b className={"t-num tabular-nums " + n.centre} style={vars({ "--wp": poids(texte) })}>
        {texte}
      </b>
    </span>
  );
}

/** Les derniers duels en pastilles (le plus ancien d'abord). */
function Forme({ forme }: { forme: IssueDuel[] }) {
  return (
    <ul className={n.forme} aria-label={V.formeDit(forme.length)}>
      {forme.map((x, i) => (
        <li key={i} className={n.pastille} data-i={x} style={vars({ "--i": i })} title={V.issue[x]} aria-label={V.issue[x]}>
          {x}
        </li>
      ))}
    </ul>
  );
}

export function DuelsBloc({ d, f, edition }: Ctx): React.ReactNode {
  const joues = Math.max(0, d.stats.duelsJoues);
  if (joues <= 0) return edition ? <Vide bloc={{ k: "duels", f }} f={f} icone={ICONE} /> : null;
  const gagnes = Math.max(0, Math.min(d.stats.duelsGagnes, joues));
  const perdus = joues - gagnes;
  const p = part(gagnes, joues);
  const forme = d.formeDuels && d.formeDuels.length ? d.formeDuels : null;
  const mention = edition ? V.formeVisiblePar(d.visibiliteJournal) : undefined;
  const vd = (
    <>
      <b>{nombre(gagnes)}</b> V · <b>{nombre(perdus)}</b> D
    </>
  );

  if (f === "demi")
    return (
      <DemiBande
        label={V.duels}
        dessin={forme ? <Forme forme={forme} /> : undefined}
        droite={mention ? <span className="t-micro">{mention}</span> : undefined}
      >
        <Cellule etiquette={V.duels} chiffre={nombre(joues)} petit={vd} />
        <Cellule etiquette={V.victoires} chiffre={pct(p)} petit={V.deVictoires} />
      </DemiBande>
    );

  return (
    <Coque f={f} label={V.duels} className={n.coque + " " + n.duels + " " + n[f]}>
      <Tete titre={V.duels} />
      <div className={n.duelsScene}>
        <Anneau p={p} couleur={couleurCss(d.accent)} dit={V.anneauDit(p, gagnes, joues)} />
        <div className={n.duelsCorps}>
          <p className={n.petit}>{V.deVictoires}</p>
          <p className={n.duelsN}>
            <b className="t-num tabular-nums">{nombre(joues)}</b>
            <span>{V.duelsMot(joues)}</span>
          </p>
          <p className={n.petit + " " + n.mono}>{vd}</p>
        </div>
        {forme && <Forme forme={forme} />}
      </div>
      <Mention d={d} edition={edition} texte={mention} />
    </Coque>
  );
}
