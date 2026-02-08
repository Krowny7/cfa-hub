# Mettre à jour GitHub/Vercel à partir d’un ZIP (workflow simple)

Ce projet est déployé via **Vercel** et se met à jour automatiquement quand on pousse sur GitHub (branche `main`).

Ce document explique comment appliquer un ZIP “fourni par ChatGPT” dans le repo **proprement**, sans casser l’historique Git et sans pousser de secrets.

---

## Règle d’or

✅ **Ne jamais faire `git init` dans un dossier dézippé** puis pousser :  
ça crée un historique “entirely different commit histories”, et GitHub/Vercel deviennent pénibles à maintenir.

✅ Le bon workflow :  
**garder un clone du repo officiel**, puis **copier/appliquer** le contenu du ZIP dedans, puis commit/push.

---

## Prérequis

- Git installé
- Node/npm installés
- Accès au repo GitHub officiel (ex: `Krowny7/cfa-hub`)
- Le projet Vercel est connecté à ce repo (Settings → Git)

---

## 1) Setup (à faire une seule fois)

### 1.1 Cloner le repo dans un dossier stable

```bash
cd "C:\Users\...\Documents\Dossier Code\CFA-HUB"
git clone https://github.com/Krowny7/cfa-hub.git cfa-hub-repo
cd cfa-hub-repo
