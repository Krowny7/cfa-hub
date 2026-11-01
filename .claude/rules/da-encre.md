---
paths:
  - "app/**/*.tsx"
  - "app/**/*.css"
  - "components/**"
  - "lib/palettes.*"
  - "public/encres/**"
---
# Direction artistique « encre »

- Mise en scène de jeu vidéo (casino pour les cartes), faite avec les éléments du site : papier clair, encre, Dela Gothic One pour les titres, Geist pour le texte, très peu de couleurs. Rien de médiéval.
- Vraie encre (EncreVive, WebGL) uniquement sur les boutons principaux et le sélecteur actif. Jamais en fond complet de carte, de case, de barre ou de pavé : aplats ébène ou bronze à la place.
- Vraie encre ou rien : jamais de fausse animation qui glisse. Repli immobile si WebGL manque ou si prefers-reduced-motion.
- Palettes par espace dans lib/palettes.json et lib/palettes.ts : accueil « graphite », S'affronter « florence », Moi « jade ».
- Tracés d'encre en `<use href>` via InkDefs, jamais recopiés en ligne.
- Stats : un résumé visible, le détail à la demande (replis, légendes, infobulles).
