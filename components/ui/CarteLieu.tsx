import Link from "next/link";
import { ArrowRight } from "lucide-react";

// La carte « lieu » (même facture que la carte de l'Atelier, components/atelier/
// CarteAtelier.tsx, dont elle est la version générique) : un endroit du site
// avec son image, son nom, une phrase, l'état du moment et un seul gros
// bouton. Ordinateur : carte haute, l'image à fond perdu en tête (16:10 par
// défaut), le bouton en bas. Téléphone : compacte, une vignette portrait à
// droite du titre, le bouton pleine largeur. Sans état.
//
// Props
//   visuel     l'image de la carte haute (ordinateur), souvent <Illustration />
//   vignette   l'image portrait 88×110 (téléphone)
//   marque     la pastille ou le logo devant le nom (ou null)
//   nom        le nom du lieu, en grand
//   sousTitre  une phrase sous le nom
//   etat       l'état du moment (quelques lignes courtes)
//   action     le bouton : lien, libellé, icône
//   label      nom accessible de la carte
//   ratio      rapport de l'image sur ordinateur (« 16 / 10 »)
//   dataLeonard  repère de la visite de Léonard
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
}: {
  visuel: React.ReactNode;
  vignette: React.ReactNode;
  marque?: React.ReactNode;
  nom: string;
  sousTitre: React.ReactNode;
  etat: React.ReactNode;
  action: { href: string; label: string; icon?: React.ReactNode };
  label: string;
  className?: string;
  ratio?: string;
  dataLeonard?: string;
}) {
  return (
    <section
      data-leonard={dataLeonard}
      aria-label={label}
      className={
        "card rl-in grid min-w-0 grid-cols-[minmax(0,1fr)_88px] items-start gap-x-4 gap-y-3 overflow-hidden p-5 " +
        "lg:grid-cols-1 lg:grid-rows-[auto_auto_auto_1fr] lg:gap-y-3.5 lg:p-0 lg:pb-6 " +
        className
      }
    >
      <div className="col-start-2 row-span-2 row-start-1 h-[110px] w-[88px] overflow-hidden rounded-[14px] lg:hidden">{vignette}</div>
      <div className="hidden lg:col-start-1 lg:row-span-1 lg:block lg:border-b lg:border-line" style={{ aspectRatio: ratio }}>
        {visuel}
      </div>
      <div className="col-start-1 row-start-1 flex min-w-0 flex-col gap-1.5 lg:row-start-2 lg:px-6 lg:pt-2.5">
        <h2 className="font-brand m-0 flex items-center gap-2 text-[28px] leading-none lg:gap-3 lg:text-[44px]">
          {marque}
          {nom}
        </h2>
        <p className="m-0 text-[14px] font-semibold leading-snug lg:text-[15px]">{sousTitre}</p>
      </div>
      <div className="t-small col-start-1 row-start-2 m-0 lg:row-start-3 lg:px-6">{etat}</div>
      <div className="col-span-2 row-start-3 pt-1 lg:col-span-1 lg:row-start-4 lg:self-end lg:px-6">
        <Link href={action.href} className="btn btn-primary btn-lg rl-press w-full">
          {action.icon} {action.label} <ArrowRight size={17} aria-hidden />
        </Link>
      </div>
    </section>
  );
}
