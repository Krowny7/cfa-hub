# Ranked Lobby (dépôt cfa-hub)

Quiz CFA compétitif façon jeu vidéo : 30 du jour, duels, rangs, ELO.
Next.js 15 (App Router) · React 19 · CSS modules · Supabase · Vercel. Un seul développeur, Théo.
Toujours écrire à l'utilisateur en français.

## Vérifier son travail
- Types : `npm run typecheck`. Le hook Stop (.claude/hooks/typecheck-si-ts.mjs) le relance tout seul en fin de tour si des .ts/.tsx ont changé.
- Machine faible (7,7 Go de RAM) : jamais deux builds en même temps, ni un build pendant un rendu vidéo ou un serveur de captures.
  Pour un changement visible, ne pas lancer next build en local : le vérifier sur une préversion Vercel (skill « apercu », branche apercu).
- Aperçu : serveur de dev « cfa-hub » de .claude/launch.json (port 3000). Regarder la page à l'écran avant de dire « fini ».
- Après un push : vérifier le déploiement. Utiliser le MCP Vercel s'il est branché ; sinon
  `curl -s https://api.github.com/repos/Krowny7/cfa-hub/commits/<sha>/status` (contexte « Vercel »).

## Pièges déjà vécus
- Tailwind v4 lit tous les fichiers suivis par git. Un antislash suivi de 6 caractères hexadécimaux casse tout le CSS en production, sans erreur de build ; un chemin Windows de Temp, de scratchpad ou de Downloads suffit.
  Ne jamais écrire de chemin absolu Windows dans un fichier du dépôt : le passer en argument.
- Tracés d'encre : toujours `<use href>` via InkDefs. Un SVG d'encre recopié en ligne donne des pages de 600 Ko et l'erreur d'hydratation #418.
- Thème nuit : `--noir` devient clair. Une surface qui doit rester sombre prend une couleur fixe (ex. `#1a120b`).
- Une carte lente ne doit pas disparaître : Suspense + squelette, deux essais et filet de 15 s (components/accueil/lobby/plafond.ts).

## Mise en page
- La première partie d'une page (accueil, S'entraîner, S'affronter, Moi) : l'en-tête et le premier bloc dans `.rl-cadre`. Ses dimensions se règlent avec `--cadre-*` en haut de app/globals.css, jamais page par page.

## Direction artistique
Règles dans .claude/rules/da-encre.md, chargées quand on touche aux composants ou aux styles.

## Livraison
- tsc OK et build OK (ou build Vercel) → commit en français, puis push direct sur main sans redemander.
- SQL : écrire un fichier `migration_*.sql` à la racine, puis l'appliquer soi-même avec le connecteur Supabase (`apply_migration`, autorisé par Théo le 2026-11-01), toujours en vérifiant :
  1. Avant : lire l'état de la base avec `execute_sql` en lecture seule, pour savoir ce qui existe déjà et ce qui manque. La migration doit être idempotente (IF NOT EXISTS, CREATE OR REPLACE).
  2. Jamais de DROP TABLE, DELETE, TRUNCATE, ni d'UPDATE massif de données sans l'accord explicite de Théo pour cette migration-là.
  3. Après : revérifier en lecture que tout est en place (fonctions, colonnes, droits), puis le dire à Théo.
- Les textes affichés viennent de lib/voice*.ts. Les questions : énoncés et choix en anglais, explications en français.
