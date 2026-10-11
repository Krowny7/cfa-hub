import { tailleBrand } from "@/lib/largeur-brand";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

// La carte « lieu » (même facture que la carte de l'Atelier, components/atelier/
// CarteAtelier.tsx, dont elle est la version générique) : un endroit du site
// avec son image, son nom, une phrase, l'état du moment et un seul gros
// bouton. Ordinateur : carte haute, l'image à fond perdu en tête (16:10 par
// défaut), le bouton en bas. La carte s'étire sur la hauteur de sa rangée
// (la colonne voisine peut être plus haute) : c'est l'IMAGE qui absorbe la
// différence (elle grandit, de son rapport jusqu'à 520 px de haut), le texte
// reste compact et le bouton reste en bas. Téléphone : compacte, une vignette
// portrait à droite du titre, le bouton pleine largeur, hauteur naturelle.
// Sans état.
//
// Props
//   visuel     l'image de la carte haute (ordinateur), souvent <Illustration />
//   vignette   l'image portrait 88×110 (téléphone)
//   marque     la pastille ou le logo devant le nom (ou null)
//   nom        le nom du lieu, en grand
//   sousTitre  une phrase sous le nom
//   etat       l'état du moment (quelques lignes courtes)
//   action     le bouton : lien, libellé, icône (avec onClick : un vrai bouton, qui agit sur place)
//   label      nom accessible de la carte
//   ratio      rapport de l'image sur ordinateur (« 16 / 10 »)
//   dataLeonard  repère de la visite de Léonard
//   liens      liens secondaires sous le bouton (facultatif)
//   tailleNom  classes de taille MAXIMALE du nom (facultatif) : il rétrécit tout seul si la colonne est trop étroite
//   largeurNom largeur du nom en em (lib/largeur-brand) quand `nom` n'est pas une simple chaîne (facultatif)
//   secondaire le bouton est discret (btn-secondary) quand un autre bouton plein tient la page
//   sansVignette téléphone : pas de vignette, la carte tient sur une colonne (l'image est ailleurs)
export function CarteLieu({
  visuel,
  vignette,
  marque = null,
  nom,
  sousTitre,
  etat,
  action,
  label,
  className = "",
  ratio = "16 / 10",
  dataLeonard,
  liens,
  tailleNom = "text-[28px] lg:text-[44px]",
  largeurNom,
  secondaire = false,
  sansVignette = false,
}: {
  visuel: React.ReactNode;
  vignette: React.ReactNode;
  marque?: React.ReactNode;
  nom: React.ReactNode;
  sousTitre: React.ReactNode;
  etat: React.ReactNode;
  action: { href: string; label: string; icon?: React.ReactNode; onClick?: () => void; disabled?: boolean };
  label: string;
  className?: string;
  ratio?: string;
  dataLeonard?: string;
  liens?: { href: string; label: string }[];
  /** classes de taille MAXIMALE du nom (text-[26px] lg:text-[40px]) : la taille réelle suit la place, voir plus bas */
  tailleNom?: string;
  /** largeur du nom en em (lib/largeur-brand) quand `nom` n'est pas une simple chaîne (sinon : mesurée telle quelle) */
  largeurNom?: number;
  secondaire?: boolean;
  sansVignette?: boolean;
}) {
  return (
    <section
      data-leonard={dataLeonard}
      aria-label={label}
      className={
        "card rl-in grid min-w-0 items-start gap-x-4 gap-y-3 overflow-hidden p-5 " +
        (sansVignette ? "grid-cols-1 " : "grid-cols-[minmax(0,1fr)_88px] ") +
        // ordinateur : une colonne flex qui s'étire avec sa rangée (l'image prend le surplus)
        "lg:flex lg:grow lg:flex-col lg:items-stretch lg:gap-y-3.5 lg:p-0 lg:pb-6 " +
        className
      }
    >
      {!sansVignette && <div className="col-start-2 row-span-2 row-start-1 h-[110px] w-[88px] overflow-hidden rounded-[14px] lg:hidden">{vignette}</div>}
      {/* l'image : son rapport donne la hauteur de départ, le surplus de la rangée la fait grandir (520 px au plus) */}
      <div className="hidden lg:relative lg:block lg:max-h-[520px] lg:shrink-0 lg:grow lg:border-b lg:border-line" style={{ aspectRatio: ratio }}>
        <div className="absolute inset-0">{visuel}</div>
      </div>
      {/* le nom est mis à la taille de `tailleNom` (portée par ce bloc) au plus ; il rétrécit si la colonne est
          trop étroite pour ses lettres (unités cqi, comme le rang du Classement) au lieu de déborder de la carte */}
      <div className={"@container col-start-1 row-start-1 flex min-w-0 flex-col gap-1.5 lg:row-start-2 lg:px-6 lg:pt-2.5 " + tailleNom}>
        <h2
          className={"font-brand m-0 flex min-w-0 items-center gap-2 leading-none lg:gap-3 " + (marque ? "[--m:34px] lg:[--m:52px]" : "[--m:0px]")}
          style={{ fontSize: tailleBrand(typeof nom === "string" ? nom : (largeurNom ?? 4.5)) }}
        >
          {marque}
          {typeof nom === "string" ? <span className="min-w-0">{nom}</span> : nom}
        </h2>
        <p className="m-0 text-[14px] font-semibold leading-snug lg:text-[15px]">{sousTitre}</p>
      </div>
      <div className="t-small col-start-1 row-start-2 m-0 lg:row-start-3 lg:px-6">{etat}</div>
      <div className={(sansVignette ? "col-span-1" : "col-span-2") + " row-start-3 pt-1 lg:col-span-1 lg:mt-auto lg:px-6"}>
        {action.onClick ? (
          <button type="button" onClick={action.onClick} disabled={action.disabled} className={"btn btn-lg rl-press w-full " + (secondaire ? "btn-secondary" : "btn-primary")}>
            {action.icon} {action.label} <ArrowRight size={17} aria-hidden />
          </button>
        ) : (
          <Link href={action.href} className={"btn btn-lg rl-press w-full " + (secondaire ? "btn-secondary" : "btn-primary")}>
            {action.icon} {action.label} <ArrowRight size={17} aria-hidden />
          </Link>
        )}
        {liens && liens.length > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2">
            {liens.map((l) => (
              <Link key={l.href} href={l.href} className="ink-link inline-flex items-center gap-1 text-[14px] font-semibold">
                {l.label} <ArrowRight size={14} aria-hidden />
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
