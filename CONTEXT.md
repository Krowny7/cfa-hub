# Ranked Lobby — Contexte du projet

## Objectif

Ranked Lobby (nom de code interne : CFA Hub) est une **plateforme collaborative d'étude pour la préparation à l'examen CFA (Chartered Financial Analyst)**. Elle est conçue pour un usage personnel et entre amis/collègues qui préparent le CFA ensemble.

L'idée centrale : centraliser tous les outils d'étude (documents, flashcards, quiz) dans un seul endroit, avec un système de partage par groupes et une gamification légère via XP et ELO pour maintenir la motivation.

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 19, Next.js 15 (App Router), TypeScript |
| Style | Tailwind CSS 4, PostCSS |
| Backend | Next.js Server Components + Route Handlers |
| Base de données | PostgreSQL via Supabase |
| Auth | Google OAuth via Supabase Auth |
| Client SDK | @supabase/ssr (gestion cookies) |
| i18n | Système custom (Context + dictionnaire) |

---

## Fonctionnalités

### 1. Bibliothèque PDF (`/library`)
- Ajouter des liens vers des PDFs hébergés sur Drive/OneDrive (pas de stockage en base)
- Organiser en dossiers
- Partager avec des groupes spécifiques ou rendre public
- Prévisualisation Drive intégrée (quand disponible)

### 2. Flashcards (`/flashcards`)
- Créer des sets de cartes (privé / groupes / public)
- Ajout rapide de cartes (recto/verso)
- Import/export compatible Quizlet (terme[TAB]définition)
- Mode révision plein écran avec navigation clavier

### 3. QCM — Questions à Choix Multiples (`/qcm`)
- Créer des sets de questions (2 à 6 choix par question)
- Mode examen : navigation question par question, correction immédiate, explication
- QCM officiels (créés par admin) : accordent de l'XP à la première bonne réponse
- Import/export JSON

### 4. Système XP & Niveaux
- XP uniquement via les QCM officiels (anti-farming : 1 XP par question, première fois)
- XP selon la difficulté : niveau 1 → 10 XP, niveau 2 → 15 XP, niveau 3 → 20 XP
- Courbe de progression : BASE=100 XP, croissance 15% par niveau
- Dashboard : niveau actuel + barre de progression + chart 90 jours

### 5. Groupes de travail (`/settings`)
- Créer un groupe (code d'invitation généré)
- Rejoindre un groupe avec le code
- Définir un groupe "actif" (pré-sélectionné lors du partage)
- Partage de contenu avec un ou plusieurs groupes simultanément

### 6. Profils & Classement (`/people`)
- Pseudo + avatar (stocké Supabase Storage)
- ELO (bêta) + nombre de parties
- Annuaire global avec filtre par groupe
- Classement ELO top 20

### 7. Internationalisation
- Français (défaut) et Anglais
- Persisté via cookie + API route `/api/locale`
- Clés centralisées dans `lib/i18n/messages.ts`

---

## Architecture base de données (Supabase)

### Tables principales
- `profiles` — id, username, avatar_url, active_group_id, xp_total
- `documents` — PDFs (titre, url externe, visibilité, owner, folder)
- `flashcard_sets` — sets de flashcards
- `flashcards` — cartes individuelles (front, back, position)
- `quiz_sets` — sets de QCM (avec flags is_official, difficulty, published_at)
- `quiz_questions` — questions (prompt, choices[], correct_index, explanation, position)
- `study_groups` — groupes (nom, code d'invitation)
- `group_memberships` — appartenance user ↔ groupe

### Tables de partage (many-to-many)
- `document_shares` — document ↔ groupes
- `flashcard_set_shares` — set flashcard ↔ groupes
- `quiz_set_shares` — set QCM ↔ groupes

### Tables de gamification
- `xp_events` — historique XP (user, montant, source, timestamp)
- `quiz_question_progress` — suivi "première bonne réponse" par question/user
- `ratings` — ELO (user, elo, games_played)
- `app_admins` — utilisateurs ayant les droits admin (créer QCM officiels)
- `quiz_attempts` — tentatives complètes (score, durée)

### Dossiers
- `library_folders` — dossiers pour organiser les 3 types de contenu

### RLS (Row Level Security)
Toutes les tables sensibles sont protégées par RLS Supabase. Les règles de visibilité sont :
- `private` → owner uniquement
- `groups` → owner + membres des groupes associés
- `public` → tout le monde peut lire, owner uniquement peut modifier

---

## Structure des fichiers

```
app/                    # Pages Next.js (App Router)
  api/locale/           # POST — changer la langue
  auth/callback/        # OAuth callback Google
  dashboard/            # Stats utilisateur
  flashcards/           # Liste + [id] détail
  library/              # Liste + [id] détail
  login/                # Page de connexion
  people/               # Annuaire + [id] profil
  qcm/                  # Liste + [id] détail/exam
  settings/             # Profil + gestion groupes
  layout.tsx            # Layout racine (Header + Providers)

components/             # Composants React
  Header.tsx            # Navigation sticky (server)
  HeaderNav.tsx         # Liens nav desktop
  I18nProvider.tsx      # Contexte i18n (client)
  LanguageSwitcher.tsx  # Toggle FR/EN
  Providers.tsx         # Wrapper providers client-side
  FlashcardSetCreator   # Créer un set
  FlashcardReview       # Mode révision
  FlashcardImporterExporter  # Import/export Quizlet
  FlashcardQuickAdd     # Ajout rapide carte
  QuizSetCreator        # Créer un QCM
  QuizSetView           # Viewer + runner QCM
  PdfLinkAdder          # Ajouter un lien PDF
  DocumentList          # Liste de PDFs
  DocumentActions       # Actions sur un PDF
  ContentDetailHeader   # Header des pages détail
  ContentItemSettings   # Panel visibilité/partage
  ContentFolderBlocks   # Affichage groupé par dossier
  FolderPicker          # Sélecteur de dossier
  GroupMultiPicker      # Sélecteur multi-groupes
  GroupSettings         # Gestion des groupes
  ProfileSettings       # Éditer profil
  LevelBar              # Barre XP/niveau
  XpBarChart            # Graphique 90 jours XP
  LoginButton           # Bouton OAuth
  SignOutButton         # Déconnexion

lib/
  supabase/
    browser.ts          # Client Supabase côté navigateur
    server.ts           # Client Supabase côté serveur (cookies)
  i18n/
    core.ts             # Fonction t() de traduction
    messages.ts         # Dictionnaire FR + EN
    server.ts           # getLocale() côté serveur
  types.ts              # Types TypeScript partagés (DB entities)
  leveling.ts           # Calcul XP → niveau
  permissions.ts        # Règles canEdit par visibilité
  content/
    grouping.ts         # Logique de groupement par dossier
    visibility.ts       # Normalisation de visibilité

supabase/
  leveling.sql          # Migration SQL : XP, niveaux, admin

middleware.ts           # Refresh session auth sur chaque requête
```

---

## Règles métier importantes

### Langue des questions (règle universelle)

Toutes les questions du site — fiches, banque officielle, défi du jour,
duels, sessions par matière, examens blancs — suivent la même règle :
**énoncé et choix en anglais** (comme à l'examen), **explication en
français**. Elle est appliquée à l'entrée :

- éditeur de séries (`components/QuizSetManage.tsx`) : ajout, modification
  et import JSON refusés si la règle est nettement enfreinte ;
- scripts d'import (`scripts/lib/seed-core.mjs`) : le lot entier est refusé
  avant toute écriture ;
- détection commune : `lib/langue-contenu.ts` / `scripts/lib/langue.mjs`
  (mots outils dans `lib/langue-contenu.json`) ;
- contrôle de la base : `node scripts/verifier-langues.mjs` liste les
  questions officielles qui l'enfreignent.

Les explications d'origine (anglaises) des anciens scripts `seed-*` ont été
traduites en base le 2026-10-05 : relancer un ancien script sans traduire
ses explications serait refusé, ce qui protège les traductions.

### Notions des questions

Chaque question officielle porte sa notion (un Learning Module, référentiel
`lib/notions.ts`) et parfois son concept : colonnes `quiz_questions.notion`
et `.concept` (`migration_notions.sql`). Elles viennent de
`scripts/notions/rattachement.json`, par l'empreinte de l'énoncé, et seule la
clé service les écrit :

- les seeds (`scripts/lib/seed-core.mjs`) les reposent après chaque import ;
- l'éditeur de séries (`components/QuizSetManage.tsx`) ne les écrit pas :
  un import JSON dans une série officielle (effacer puis réinsérer) les
  laisse vides, un énoncé modifié garde l'ancienne notion. Après toute
  retouche d'une série officielle dans l'éditeur, relancer
  `node scripts/notions/synchroniser.mjs --ecrire` (et, pour une question
  nouvelle, `rattacher.mjs` d'abord : ordre complet en tête de
  `scripts/notions/rattacher.mjs`).

« Tes points faibles » (Moi › Stats, S'entraîner) se range par notion dès
que `points_faibles()` répond et que les colonnes sont remplies
(`components/moi/points-faibles-data.ts`) ; sinon il garde les thèmes de
l'étape 1 (`ratures_par_theme`). Une question sans notion reste comptée
dans sa matière.

L'Atelier (`/atelier`, `migration_atelier.sql`) : 30 minutes sur 1 à 3
notions faibles (poids 60/25/15), en cinq blocs (rappel, ratures, questions
neuves, calcul, re-test). Le serveur prépare le pool et corrige ; l'ordre
des questions, l'adaptation et le chrono sont dans `lib/atelier.ts` (pur,
`node scripts/test-atelier.mjs`). Les calculs sont tirés et corrigés par les
actions serveur (`app/atelier/actions.ts`) et notés avec la clé service
(`atelier_ajouter_calc`, `atelier_noter_calc`, fermées aux joueurs). XP des
séries éclair sur les questions neuves et les calculs (première bonne
réponse), rien sur les ratures rejouées ni au re-test. Le pool et l'XP
raisonnent par énoncé (l'« officielle » d'un drill copie une question de la
banque) : un énoncé du carnet n'est jamais « neuf », une copie déjà jouée
passe pour vue. Ses réponses comptent dans les stats (source `atelier`), le
carnet, l'anneau du jour et `_reponses_joueur` (par `_reponses_atelier`,
qu'un nouveau collage de `migration_notions.sql` ne touche pas) ; le re-test
d'un calcul n'entre pas dans `calc_attempts`. Tant que la table manque, ou par thème, aucun point
d'entrée ne s'affiche et `/atelier` dit « bientôt ».

Autour : la tuile « Ton point faible » de l'accueil
(`components/accueil/point-faible.ts`, `points_faibles()` seule, jamais
`getAnswerStats`) prend la place de celle des ratures quand le n° 1 est net ;
le carnet de Moi › Erreurs se range aussi par notion
(`migration_carnet_notions.sql`, `ratures_par_notion`, repli par source) ;
Moi › Stats montre l'historique des Ateliers clos (« Tes Ateliers », lecture
de la table `ateliers`, bilan recalculé par `bilan` de `lib/atelier`) ;
Léonard commente le bilan (`analyserAtelier`, une réaction par Atelier à la
place de celle de `FinDeSession`).

### Permissions d'édition
- `private` → owner uniquement
- `public` → owner uniquement (tout le monde peut lire)
- `groups` → owner OU membre d'un groupe associé au contenu

### XP — règles anti-farming
- XP uniquement sur les QCM officiels (`is_official = true` et `official_published = true`)
- Une seule attribution XP par paire (user, question) — suivi dans `quiz_question_progress`
- La RPC `award_quiz_question_xp` gère tout côté serveur (atomique, sécurisé)

### Groupes
- Un utilisateur peut appartenir à plusieurs groupes
- Le groupe "actif" est celui pré-sélectionné par défaut au moment de partager du contenu
- La propriété d'un groupe permet de le supprimer (et donc d'affecter tous les membres)

---

## Variables d'environnement requises

```env
NEXT_PUBLIC_SUPABASE_URL=      # URL du projet Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY= # Clé anon publique Supabase
NEXT_PUBLIC_APP_URL=           # URL de l'app (ex: http://localhost:3000)
```

---

## Setup Supabase

1. Créer un projet Supabase
2. Activer Google OAuth dans Authentication → Providers
3. Ajouter `[APP_URL]/auth/callback` dans les Redirect URLs
4. Exécuter `supabase/leveling.sql` dans l'éditeur SQL pour créer les tables XP
5. Créer les autres tables via les migrations (schema complet à documenter)
6. Configurer RLS sur toutes les tables

Pour rendre un QCM officiel (attribution XP) :
```sql
UPDATE quiz_sets
SET is_official = true, official_published = true, difficulty = 2
WHERE id = '<uuid>';
```

---

## Lancer le projet en développement

```bash
npm install
cp .env.example .env.local
# Remplir .env.local avec les variables Supabase
npm run dev
```

App disponible sur `http://localhost:3000`.
