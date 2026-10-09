"use client";

import dynamic from "next/dynamic";

// La courbe d'ELO en morceau à part : le serveur la rend comme avant, mais
// son code ne part au navigateur que sur l'onglet Journal (sans ce détour,
// il irait avec la page, donc aussi sur Profil, Sceaux et Face-à-face).
export const CourbeElo = dynamic(() => import("@/components/profil/CourbeElo").then((m) => m.CourbeElo));
