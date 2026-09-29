# 💄 Makeup Planner

Planning de contenu makeup : calendrier, pipeline de production, rappels, produits, idées.
Appli web installable sur téléphone (PWA), données dans Supabase, hébergée sur GitHub Pages.

## Ce que fait l'appli

Un **makeup** (le look, réalisé une fois, avec sa photo et ses produits) contient des **publications** :
🎬 tuto, 📸 photo ou 🎥 vidéo. Chaque publication a sa propre date et sa propre étape.
Une publication sans date est **en réserve** : parfaite pour combler un jour vide entre deux tutos.

- **Accueil** : 🚨 urgents (J-1 / J-2), aujourd'hui, en retard, jours vides de la semaine
  (touche un jour pour y placer une publication en réserve), photos & vidéos prêtes à caser
- **Calendrier** : vue mois des publications (■ tuto, ● photo / vidéo, couleur = étape)
- **Pipeline** : À faire → Réalisé → Montage → Prêt → Publié, par publication
- **Recherche** : makeups filtrés par couleur, marque, type (makeup / unboxing / swatch, avec tuto / photo / vidéo) et collab
- **Produits** : marque, produit, nom, couleur, PR / offert
- **Idées** : noter des looks, puis « → Planifier » pour les transformer en makeup

## Installation (une seule fois)

### 1. Supabase

1. Crée un compte sur <https://supabase.com> puis un **nouveau projet** (région Europe).
2. Menu **SQL Editor** → **New query** → colle tout le contenu de [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
   (Si tu avais déjà lancé une ancienne version de `schema.sql`, lance plutôt les migrations
   dans l'ordre : [`migration_002_publications.sql`](supabase/migration_002_publications.sql)
   puis [`migration_003_photos.sql`](supabase/migration_003_photos.sql).)
3. Menu **Authentication** → **Users** → **Add user** → **Create new user** : ton email + un mot de passe
   (coche « Auto Confirm User »). C'est avec ça que tu te connecteras.
4. Menu **Authentication** → **Sign In / Providers** → désactive **Allow new users to sign up**
   (comme ça personne d'autre ne peut créer de compte).
5. Menu **Project Settings** → **API** (ou **Data API** / **API Keys**) : note l'**URL du projet** et la clé **publishable**.

### 2. En local (sur l'ordi)

```bash
cp .env.example .env.local   # puis remplis les 2 valeurs
npm install
npm run dev
```

### 3. GitHub

1. Crée un dépôt sur GitHub (ex : `makeup-planner`) et pousse ce dossier :
   ```bash
   git init && git add . && git commit -m "Makeup Planner"
   git branch -M main
   git remote add origin https://github.com/Jun080/makeup-planner.git
   git push -u origin main
   ```
2. Dans le dépôt : **Settings** → **Secrets and variables** → **Actions** → **New repository secret**, ajoute :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
3. **Settings** → **Pages** → Source : **GitHub Actions**.
4. Onglet **Actions** → relance « Déployer sur GitHub Pages » si besoin.
   L'appli sera sur `https://Jun080.github.io/makeup-planner/`.

> La clé *publishable* peut être publique : ce sont les règles de sécurité Supabase (RLS, dans `schema.sql`)
> qui garantissent que personne d'autre que toi ne voit tes données.

### 4. Sur le téléphone

- **iPhone** : ouvre le lien dans **Safari** → bouton Partager → **Sur l'écran d'accueil**.
- **Android** : ouvre le lien dans **Chrome** → menu ⋮ → **Installer l'application**.

Puis touche 🔔 en haut de l'appli pour autoriser les rappels.

## À savoir sur les rappels

Les rappels (aujourd'hui, J-1, J-2, retards) s'affichent sur l'accueil et en notification
**quand tu ouvres l'appli** (une fois par jour). Une notification qui arrive toute seule, appli fermée,
demande un petit serveur de push (Supabase Edge Function + tâche planifiée) — possible dans une V2.
