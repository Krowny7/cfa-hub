---
name: livrer
description: Met en ligne le site : vérifie les types, contrôle les pièges, commit, push sur main, puis vérifie le déploiement Vercel. À utiliser quand un changement est terminé et vérifié à l'écran.
---
# Livrer sur main

1. `npm run typecheck`. S'arrêter et corriger à la première erreur.
2. Contrôler ce qui part :
   - `git status` : aucun `.env`, aucun dossier `.next-*`, aucun fichier temporaire ;
   - aucun antislash suivi de 6 caractères hexadécimaux dans les fichiers ajoutés ou modifiés (piège Tailwind) : `git diff --cached -U0 | grep -nE '\\\\[0-9a-fA-F]{6}'` doit être vide.
3. Build : `npm run build` si la mémoire le permet (rien d'autre de lourd ne tourne). S'il plante faute de mémoire alors que tsc passe, continuer : Vercel construit et un build raté n'est pas mis en ligne.
4. Commit en français, court, qui dit ce qui change pour le joueur. Puis `git push origin HEAD:main`.
5. Vérifier le déploiement :
   - MCP Vercel s'il est branché : dernier déploiement de main, état, et log de build si échec ;
   - sinon `curl -s https://api.github.com/repos/Krowny7/cfa-hub/commits/<sha>/status`, contexte « Vercel » (`pending` → réessayer dans 1 à 2 min).
6. Si une migration SQL accompagne le changement : donner à l'utilisateur le nom du fichier à coller dans Supabase, puis vérifier qu'elle est appliquée (MCP Supabase en lecture seule).
7. Annoncer : commit, état du déploiement, ce qui reste à faire côté utilisateur.
