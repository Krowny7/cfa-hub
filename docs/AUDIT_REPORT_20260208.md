# Audit UI + fonctionnalités — 2026-02-08

## Objectif
- Vérifier que les fonctionnalités exposées à l’utilisateur sont cohérentes (liens, routes, flows auth, pages).
- Détecter les fonctionnalités “fantômes” (code/features générés mais non utilisés).
- Améliorer l’UX mobile, en particulier **Header + navigation**.
- Simplifier et fiabiliser le build/deploy (GitHub/Vercel).

---

## Constats principaux

### 1) Navigation mobile : doublons + place dans le header
**Avant** :
- Sur mobile, le header ouvrait un menu contenant *toutes* les destinations (Library/Flashcards/QCM/Exercises + Challenges + People).
- En parallèle, une **barre inférieure** (bottom nav) donnait déjà accès aux 4 destinations principales.

**Problème** :
- Doublons inutiles + surcharge cognitive.
- Bouton menu en texte => largeur et risque de casse sur petits écrans.

**Fix appliqué** :
- Le menu “drawer” mobile n’affiche plus les 4 destinations de la bottom nav.
  - Il ne garde que les destinations secondaires : **Challenges**, **People** (+ Profile, Settings, Locale, Sign out).
- Bouton menu en **icône hamburger** (label en `sr-only`).

Fichiers :
- `components/Header.tsx`
- `components/MobileNavSheet.tsx`

---

### 2) Fonctionnalités fantômes : NextAuth (non câblé)
**Constat** :
- Des morceaux de code NextAuth existaient, mais il n’y a **pas** de route `app/api/auth/[...nextauth]/route.ts`.
- Le flow réel de login est basé sur **Supabase Auth** (`app/login/page.tsx` + `app/auth/callback/route.ts`).

**Risque** :
- Confusion, maintenance plus difficile, dépendances inutiles, fausses pistes en debug.

**Nettoyage appliqué** :
- Suppression des fichiers NextAuth non utilisés :
  - `app/providers.tsx`
  - `lib/auth.ts`
  - `app/login/ui/LoginForm.tsx`

---

### 3) Fonctionnalités fantômes : Tags & Saved Views
**Constat** :
- La doc mentionne tags/saved views, mais la UI actuelle ne les expose plus.
- Des composants étaient présents mais **non importés** nulle part.

**Nettoyage appliqué** :
- Suppression des composants non utilisés :
  - `components/TagFilterField.tsx`
  - `components/TagMultiSelect.tsx`
  - `components/TagPicker.tsx`
  - `components/EditTagsAction.tsx`
  - `components/SavedViewsBar.tsx`

---

### 4) Diagnostics Supabase : contrat incomplet
**Constat** :
- Le contrat Supabase (`lib/supabase/contract.ts`) ne listait pas certaines tables/RPC réellement utilisées.
- Exemple : `ratings`, `pvp_attempts`, `pvp_rating_events`, `content_translations`, et plusieurs RPC (`get_xp_daily`, `pvp_*`, etc.).

**Impact** :
- La page `/admin/diagnostics` pouvait afficher “OK” alors que la prod casserait sur certaines features.

**Fix appliqué** :
- Contrat mis à jour pour couvrir ce que l’app utilise réellement.

Fichier :
- `lib/supabase/contract.ts`

---

### 5) Build/Deploy : fichiers de base manquants + config Next en doublon
**Constat** :
- Le zip ne contenait pas (ou plus) certains fichiers indispensables au build : `package.json`, `tsconfig.json`, `postcss.config.js`, etc.
- Deux configs Next existaient : `next.config.mjs` (utile) + `next.config.ts` (vide). Selon la résolution, cela peut casser des options.

**Fix appliqué** :
- Ajout des fichiers nécessaires au build :
  - `package.json` (versions alignées sur le lock)
  - `package-lock.json` (copié depuis `node_modules/.package-lock.json`)
  - `tsconfig.json`
  - `tailwind.config.ts`
  - `postcss.config.js`
- Suppression de `next.config.ts` (vide) et conservation de `next.config.mjs`.

---

## Points à vérifier côté prod (non bloquants mais importants)
1) **RPC & SQL** : plusieurs features dépendent de RPC (groupes, traductions, pvp, xp). Vérifier que le SQL de prod inclut bien :
   - `create_group`, `join_group`
   - `upsert_content_translation`
   - `award_quiz_question_xp`
   - `get_xp_daily`, `get_xp_daily_for_user`
   - `pvp_create_challenge`, `pvp_accept_challenge`, `pvp_get_challenge_detail`, `pvp_submit_attempt`
2) **Admin gating** : les routes `/admin/*` s’appuient sur `is_app_admin`. Si le RPC manque, l’accès admin peut être incohérent.
3) **Elo** : la UI masque l’Elo si la table `ratings` est absente (best-effort), mais le PvP en dépend.

---

## Résumé des changements (commit logique)
- UX mobile : suppression doublons nav + menu hamburger.
- Suppression code NextAuth fantôme.
- Suppression tags/saved views fantômes.
- Contrat diagnostics Supabase corrigé.
- Base de build (package/tsconfig/tailwind/postcss) restaurée.
- Suppression `next.config.ts` (vide).
