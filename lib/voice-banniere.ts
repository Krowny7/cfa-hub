// Les mots de l'éditeur de bannière (Personnaliser › Ta bannière :
// components/profil/EditeurBanniere.tsx, ChoixPanneau.tsx).

export const BANNIERE_ED = {
  titre: "Ta bannière",
  /** la pastille de l'en-tête et le renvoi de la feuille Bannière */
  composer: "Composer ta bannière : fond, personnage, pièces",
  versEditeur: "Ton personnage, ta pièce du haut, ta pièce du bas et ton fond se règlent dans « Ta bannière », sous l'en-tête de cette page.",
  aide: "Compose-la comme tu veux : un fond, un personnage, une pièce en haut et une pièce en bas. Le fond remplit la bannière, le reste se place librement ; tout peut déborder dans la marge transparente, rien ne sort au-delà. À gauche, la carte est dessinée par le site : tu choisis seulement ce qu'elle montre.",
  /** la base n'a pas la colonne (migration_bannieres_composees.sql) */
  bientot: "Ta bannière composée arrive bientôt : la base n'est pas encore prête. En attendant, ton profil garde sa bannière actuelle.",
  /** l'ancien personnage, repris comme calque, pas encore enregistré */
  repris: "Ton ancien personnage a été repris comme calque. Enregistre pour passer à la bannière composée.",
  apercu: "Aperçu de ta bannière : glisse le calque choisi, tire ses poignées pour le redimensionner",
  legendeScene: "Les pointillés bordent la marge de débordement : tes images peuvent y dépasser, jamais au-delà.",
  zoneDebord: "Débordement",
  elements: "Éléments de la bannière",
  /** l'onglet de chaque élément */
  fond: "Fond",
  perso: "Personnage",
  haut: "Pièce du haut",
  bas: "Pièce du bas",
  cadre: "Cadre",
  vide: "vide",
  /** les images */
  choisir: "Envoyer une image",
  changer: "Changer d'image",
  retirer: "Retirer",
  envoi: "Envoi de l'image…",
  erreurEnvoi: "L'image n'a pas pu être envoyée. Réessaie, ou choisis-en une autre.",
  formats: "PNG ou WebP détouré de préférence (fond transparent), JPG accepté · 4 Mo au plus. Ton image reste dans ton dossier, visible de tous sur ta bannière.",
  formatsFond: "Le fond remplit la bannière, sans autre réglage que le cadrage. Une image haute (360 × 1000) ou large, peu importe : elle est recadrée.",
  /** les préréglages */
  prereglages: "Pièces du site",
  prereglagesAide: "Des pièces toutes prêtes, à prendre à la place de la tienne.",
  aucune: "Aucune",
  /** les réglages d'un calque */
  placement: "Placement",
  x: "Gauche",
  y: "Haut",
  largeur: "Largeur",
  hauteur: "Hauteur",
  verrou: "Garder les proportions de l'image",
  verrouAide: "Désactivé, la largeur et la hauteur se règlent séparément (huit poignées sur l'aperçu).",
  reinitialiser: "Réinitialiser",
  cadrage: "Cadrage du fond",
  cadrageX: "Cadrage horizontal",
  cadrageY: "Cadrage vertical",
  cadrageAide: "Quelle partie de l'image reste visible quand elle est recadrée.",
  /** l'ordre d'empilement */
  ordre: "Ordre d'empilement",
  ordreAide: "Du plus en avant au plus en arrière. Le fond est toujours derrière tout.",
  devant: "Passer devant",
  derriere: "Passer derrière",
  devantCadre: "devant le cadre",
  derriereCadre: "derrière le cadre",
  cadreSite: "dessiné par le site",
  /** le clavier */
  clavier: "Flèches pour déplacer · Maj pour aller plus vite · + et − pour la taille",
  /** revenir à la bannière simple */
  retirerTout: "Revenir à la bannière simple",
  retirerToutAide: "Sans bannière composée, ton profil montre le fanion simple avec son ornement.",
  /** le panneau */
  panneau: "Ta carte",
  panneauAide: "Le panneau de gauche est dessiné par le site : ton pseudo, ton rang et ce que tu choisis ici.",
  panneauApercu: "Aperçu de ta carte complète, avec le panneau de gauche",
  badges: "Badges",
  badgesAide: "Trois au plus, parmi ce que tu as gagné. Glisse ou utilise les flèches pour les ranger.",
  badgesRepli: "Aucun choix : le site pose tes trois sceaux les plus rares.",
  badgeVide: "Emplacement libre",
  badgesAucun: "Tu n'as encore rien gagné à afficher. Tes sceaux, trophées et titres apparaîtront ici.",
  sceaux: "Sceaux",
  trophees: "Trophées",
  titres: "Titres",
  monter: "Monter",
  descendre: "Descendre",
  ranger: "Retirer ce badge",
  stats: "Chiffres",
  statsAide: "Trois statistiques, avec tes vraies valeurs.",
  statN: (n: number) => `Chiffre ${n}`,
} as const;
