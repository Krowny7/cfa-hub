// Ce qui bouge sur un profil, sans charger le catalogue des pièces : les
// cadres et les bannières dessinés en CSS (components/profil/Pieces.tsx,
// Profil.module.css : pièces du Codex, des trophées, du fil rouge et des
// programmes, V3 §3.9), en plus des cadres vivants du profil (liquide, aura,
// dorure) et des motifs vivants. Un composant client s'en sert pour savoir
// ce qui bouge (au plus deux éléments animés à l'écran sur téléphone) sans
// charger lib/profil/pieces.ts. Les clés sont des clés nues (profile_style).
// Module neutre (client et serveur).

import { cadreDe, motifDe } from "@/lib/profil/catalogue";

/** Les cadres dessinés en CSS : ils bougent tous (figés en mouvement réduit). */
export const CADRES_DESSINES = ["sanguine", "sfumato", "encre-fidele", "laurier", "vitruve", "plume", "diamant-taille", "vitrine-or"] as const;
/** Les bannières dessinées en CSS : elles bougent toutes (figées en mouvement réduit). */
export const BANNIERES_DESSINEES = ["carnet", "florence", "imola", "machine-volante", "salle-trophees", "route-milan"] as const;

export type CadreDessine = (typeof CADRES_DESSINES)[number];
export type BanniereDessinee = (typeof BANNIERES_DESSINEES)[number];

export const estCadreDessine = (frame: string | null | undefined): frame is CadreDessine => !!frame && (CADRES_DESSINES as readonly string[]).includes(frame);
export const estBanniereDessinee = (banner: string | null | undefined): banner is BanniereDessinee => !!banner && (BANNIERES_DESSINEES as readonly string[]).includes(banner);

/** Le cadre bouge : un cadre vivant du profil (liquide, aura, dorure) ou un cadre dessiné. */
export const cadreBouge = (frame: string | null | undefined): boolean => estCadreDessine(frame) || !!cadreDe(frame).anime;
/** La bannière bouge : un motif vivant ou une bannière dessinée, sans image du joueur par-dessus. */
export const banniereBouge = (banner: string | null | undefined, bannerUrl: string | null = null): boolean => !bannerUrl && (estBanniereDessinee(banner) || !!motifDe(banner)?.anime);
