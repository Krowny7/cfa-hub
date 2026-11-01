---
name: livrer
description: Met en ligne le site : vérifie les types, contrôle les pièges, commit, push sur main, puis vérifie le déploiement Vercel. À utiliser quand un changement est terminé et vérifié à l'écran.
---
# Livrer sur main

1. `npm run typecheck`. S'arrêter et corriger à la première erreur.
2. Contrôler ce qui part :
   - `git status` : aucun `.env`, aucun dossier `.next-*`, aucun fichier temporaire ;
   - aucun antislash suivi de 6 caractères hexadécimaux dans les fichiers ajoutés ou modifiés (piège Tailwind) : `git diff --cached -U0 | grep -nE '\\\\[0-9a-fA-F]{6}'` doit être vide.
3. Build : pour un changement visible, le vérifier d'abord sur une préversion Vercel (skill « apercu »), plutôt que par un build local. Pour un petit changement sans risque, tsc suffit : Vercel construit, et un build raté n'est pas mis en ligne.
4. Commit en français, court, qui dit ce qui change pour le joueur. Puis `git push origin HEAD:main`.
5. Vérifier le déploiement :
   - connecteur Vercel s'il est branché : `list_deployments` avec projectId `prj_X92S6qSvIKOfeQQgtt4V6NZA5K7G` et teamId `team_jgQiHW7eJETyk8LzramlHiMU`, filtré par `sha` ; état READY attendu, sinon lire les événements de build (`list_deployment_events`) ;
   - sinon `curl -s https://api.github.com/repos/Krowny7/cfa-hub/commits/<sha>/status`, contexte « Vercel » (`pending` → réessayer dans 1 à 2 min).
6. Si une migration SQL accompagne le changement : donner à l'utilisateur le nom du fichier à coller dans Supabase, puis vérifier qu'elle est appliquée (MCP Supabase en lecture seule).
7. Annoncer : commit, état du déploiement, ce qui reste à faire côté utilisateur.
