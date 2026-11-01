---
name: apercu
description: Vérifie un changement sur une préversion Vercel (branche « apercu ») plutôt que par un build local, qui manque de mémoire sur ce PC. À utiliser avant de livrer un changement visible, ou quand next build plante en local.
---
# Vérifier sur une préversion Vercel

Le PC n'a que 7,7 Go de RAM et `next build` y plante. On fait donc construire Vercel sur une branche de test, et on ne pousse sur main que ce qui marche.

1. **Pousser** sur la branche de test : `git push -f origin HEAD:apercu`. Toujours cette même branche, pour que l'adresse ne change pas et que le navigateur garde sa connexion.
2. **Suivre le build** avec le connecteur Vercel : `list_deployments` (projectId `prj_X92S6qSvIKOfeQQgtt4V6NZA5K7G`, teamId `team_jgQiHW7eJETyk8LzramlHiMU`, `sha` du commit).
   - Un build dure 3 à 5 min. Tant que l'état est BUILDING ou QUEUED, revérifier environ toutes les minutes.
   - ERROR : lire l'erreur avec `list_deployment_events`, corriger, repousser.
3. **Ouvrir** l'adresse fixe https://cfa-hub-git-apercu-krownys-projects.vercel.app.
   - Elle est protégée par Vercel Authentication. `get_access_to_vercel_url` sur cette adresse donne un lien de partage valable 23 h : l'ouvrir dans le navigateur intégré.
   - Pour une page publique ou une route API, `web_fetch_vercel_url` suffit.
4. **Pages connectées** : la connexion Google se fait sur cette adresse. Si le navigateur intégré n'est pas connecté, demander à l'utilisateur de se connecter lui-même. Ne jamais saisir ses identifiants.
5. **Regarder** :
   - captures sur ordinateur et sur téléphone (resize_window) ;
   - console et réseau ;
   - thème nuit si le changement le touche.
6. **Attention** : la préversion utilise la VRAIE base Supabase, avec les mêmes variables que la production. Pendant la vérification, ne joue pas de série, ne réponds à aucune question et n'enregistre rien : on regarde seulement.
7. **Livrer** : si tout est bon, `git push origin HEAD:main`, puis suivre le skill « livrer » à partir de l'étape 5 (vérifier le déploiement).

Prérequis côté utilisateur, à faire une seule fois : ajouter `https://cfa-hub-git-apercu-krownys-projects.vercel.app/**` dans Supabase → Authentication → URL Configuration → Redirect URLs. Sans ça, la connexion Google renvoie vers la production.
