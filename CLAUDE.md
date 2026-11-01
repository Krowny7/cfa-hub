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
- Une carte lente ne doit pas disparaître : Suspense + squelette, filet de 6 s (components/accueil/lobby/plafond.ts).

## Direction artistique
Règles dans .claude/rules/da-encre.md, chargées quand on touche aux composants ou aux styles.

## Livraison
- tsc OK et build OK (ou build Vercel) → commit en français, puis push direct sur main sans redemander.
- SQL : écrire un fichier `migration_*.sql` à la racine, et l'utilisateur le colle dans Supabase.
  Ne jamais modifier la base soi-même. Le MCP Supabase est en lecture seule : il sert à vérifier qu'une migration est bien appliquée.
- Les textes affichés viennent de lib/voice*.ts. Les questions : énoncés et choix en anglais, explications en français.
