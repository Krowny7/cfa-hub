# Les folios : les planches du carnet de Léonard

Un folio est une planche du carnet de Léonard de Vinci, gagnée à chaque acte clos du Codex (I à VI, l'épilogue), à chaque « Maître de… » et à deux paliers du fil rouge. Il se porte sur le profil, dans le bloc « Folio », avec son anecdote. Jamais tiré au sort.

Ce fichier dit, pour chaque folio, l'œuvre à reprendre, où elle est conservée et où trouver son image. Les clés, les quêtes qui les donnent et les anecdotes vivent dans `lib/profil/pieces.ts` (`FOLIOS`) ; le Codex les déclare aussi dans `lib/codex/catalogue.ts`.

## Les images

- Format : `public/folios/<clé>.webp`, 600 × 800 pixels (portrait, 3 × 4), 120 Ko au plus. Recadrer sur le dessin, sans la marge du support ni la cote de l'inventaire.
- Source : Wikimedia Commons, catégorie de l'œuvre ou de sa collection. Les dessins de Léonard sont dans le domaine public, et Commons tient leurs reproductions fidèles pour libres. Garder l'adresse de la page Commons de chaque fichier repris (colonne « Fichier repris » à remplir).
- Une image posée : ajouter sa clé à `FOLIOS_ILLUSTRES` (`lib/profil/pieces.ts`). Le test `scripts/profil/test-etagere.tsx` vérifie que le fichier existe. Tant qu'une image manque, la carte « papier » montre le nom de l'œuvre à la plume : jamais d'image cassée.
- Pour une œuvre qui existe en plusieurs feuilles (les chevaux, le Déluge, les tourbillons, les profils), prendre une seule feuille, la plus lisible en petit, et noter son numéro d'inventaire.

## Les anecdotes

Deux lignes sobres et vérifiables, sans date inventée. Ce qu'elles avancent est rappelé ici, avec de quoi le vérifier. Une anecdote qu'on ne peut pas sourcer se retire plutôt que de rester approximative.

## Les dix-neuf folios

| Clé | Donné par | Œuvre | Collection | Où chercher l'image | Fichier repris |
|---|---|---|---|---|---|
| `mains` | acte I | Étude de mains | Royal Collection, château de Windsor | Commons : « Leonardo da Vinci, Study of hands » (pointe d'argent rehaussée de blanc) | à remplir |
| `draperie` | acte II | Étude de draperie | Musée du Louvre, département des Arts graphiques | Commons : « Drapery study », Léonard (détrempe grise rehaussée de blanc sur toile de lin) | à remplir |
| `codex-leicester` | acte III | Une page du Codex Leicester | Collection privée (Bill Gates) | Commons : catégorie « Codex Leicester » | à remplir |
| `adoration` | acte IV | Étude pour l'Adoration des Mages | Galerie des Offices, Florence, cabinet des dessins et estampes | Commons : « Perspective study for the Adoration of the Magi » | à remplir |
| `chevaux` | acte V | Études de chevaux | Royal Collection, château de Windsor | Commons : études pour le monument Sforza (catégorie « Horses in drawings by Leonardo da Vinci ») | à remplir |
| `autoportrait` | acte VI | Autoportrait à la sanguine | Biblioteca Reale, Turin | Commons : « Leonardo self-portrait » (sanguine de Turin) | à remplir |
| `deluge` | épilogue | Le Déluge | Royal Collection, château de Windsor | Commons : série « A deluge » (pierre noire) | à remplir |
| `vieillard` | Maître d'Ethics | Profil de vieillard | Royal Collection, château de Windsor | Commons : têtes de vieillards de profil, Léonard | à remplir |
| `polyedres` | Maître de Quant | Polyèdres dessinés pour la *Divina proportione* | Biblioteca Ambrosiana, Milan (manuscrit) ; Bibliothèque de Genève (manuscrit) | Commons : catégorie « De divina proportione » | à remplir |
| `moulin` | Maître d'Economics | Étude de moulin | Biblioteca Ambrosiana, Milan (Codex Atlanticus) | Commons : moulins à eau du Codex Atlanticus | à remplir |
| `tourbillons` | Maître de FSA | Études de tourbillons d'eau | Royal Collection, château de Windsor | Commons : « Studies of water », Léonard | à remplir |
| `pont` | Maître de Corporate Issuers | Projet de pont | Institut de France, Paris (manuscrit L) | Commons : « Golden Horn bridge », Léonard | à remplir |
| `chats` | Maître d'Equity | Études de chats | Royal Collection, château de Windsor | Commons : « Cats, lions and a dragon », Léonard | à remplir |
| `arbalete` | Maître de Fixed Income | L'arbalète géante | Biblioteca Ambrosiana, Milan (Codex Atlanticus) | Commons : « Giant crossbow », Léonard | à remplir |
| `vis-aerienne` | Maître de Derivatives | La vis aérienne | Institut de France, Paris (manuscrit B) | Commons : « Aerial screw », Léonard | à remplir |
| `char` | Maître d'Alternative Investments | Le char d'assaut | British Museum, Londres | Commons : « Armoured vehicle », Léonard | à remplir |
| `ornithoptere` | Maître de Portfolio Management | L'ornithoptère | Institut de France, Paris (manuscrit B) | Commons : « Ornithopter », Léonard | à remplir |
| `galerie` | fil rouge « La galerie des maîtres », palier 2 | Études de proportions | Gallerie dell'Accademia, Venise (l'Homme de Vitruve) ; Royal Collection (études de têtes) | Commons : études de proportions, Léonard | à remplir |
| `cabinet` | fil rouge « Le cabinet de curiosités », palier 3 | Feuille d'études diverses | Royal Collection, château de Windsor ; Biblioteca Ambrosiana | Commons : feuilles d'études mêlées (machines, visages, notes en miroir) | à remplir |

## Ce que disent les anecdotes, et où le vérifier

- **mains** : pointe d'argent et rehauts de blanc sur papier préparé (notice de la Royal Collection) ; le rapprochement avec le portrait de Ginevra de' Benci (National Gallery of Art, Washington), dont le bas a été coupé, est une hypothèse courante des historiens de l'art.
- **draperie** : les études de draperie du Louvre sont peintes au pinceau sur toile de lin (notices du Louvre) ; Vasari, dans sa *Vie de Léonard*, raconte les modèles d'argile drapés d'étoffes trempées dans la terre.
- **codex-leicester** : l'eau, la Lune (la lumière cendrée), les fossiles ; l'écriture en miroir. C'est le seul grand carnet de Léonard en mains privées.
- **adoration** : l'étude de perspective des Offices prépare le fond du tableau ; la commande des moines de San Donato a Scopeto, restée inachevée (notice des Offices).
- **chevaux** : les études pour le monument équestre de Francesco Sforza ; le bronze réservé fut fondu en canons, le cheval ne fut jamais coulé.
- **autoportrait** : conservé à la Biblioteca Reale de Turin, rarement exposé (fragile) ; l'identification à un autoportrait reste discutée.
- **deluge** : la série des Déluges de Windsor, pierre noire, datée des dernières années de Léonard (notices de la Royal Collection).
- **vieillard** : Vasari rapporte que Léonard suivait toute une journée les passants dont la tête l'intriguait.
- **polyedres** : les planches de la *Divina proportione* de Luca Pacioli, polyèdres pleins (*solidus*) et évidés (*vacuus*).
- **moulin** : les machines hydrauliques du Codex Atlanticus, à la Biblioteca Ambrosiana.
- **tourbillons** : les notes de Léonard comparent le mouvement de l'eau à celui des cheveux (feuille de Windsor des études d'eau).
- **pont** : le pont d'une arche proposé au sultan Bayezid II pour la Corne d'Or (manuscrit L) ; une version réduite construite en Norvège, à Ås.
- **chats** : la feuille de Windsor où se mêlent chats, lions et un petit dragon.
- **arbalete** : plus de vingt mètres d'envergure, sur six roues (Codex Atlanticus) ; la lettre de Léonard à Ludovic Sforza où il se présente en ingénieur militaire.
- **vis-aerienne** : la vis de lin amidonné du manuscrit B.
- **char** : le dessin du British Museum ; huit hommes pour le mouvoir, de l'intérieur (note de Léonard).
- **ornithoptere** : les machines volantes du manuscrit B ; le *Codex sur le vol des oiseaux* est à la Biblioteca Reale de Turin.
- **galerie** : l'Homme de Vitruve, aux Gallerie dell'Accademia de Venise.
- **cabinet** : l'écriture en miroir, de droite à gauche, sur des feuilles qui mêlent machines, visages et calculs.
