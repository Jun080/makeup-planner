# 💄 Makeup Planner

Planning de contenu makeup : calendrier, pipeline de production, rappels, produits, idées.
Appli web installable sur téléphone (PWA), données dans Supabase, hébergée sur GitHub Pages.

## Ce que fait l'appli

Un **makeup** (le look, réalisé une fois, avec sa photo et ses produits) contient des **publications** :
🎬 tuto, 📸 photo ou 🎥 vidéo. Chaque publication a sa propre date et sa propre étape.
Une publication sans date est **en réserve** : parfaite pour combler un jour vide entre deux tutos.
Un **🎞️ récap** est une publication qui regroupe plusieurs makeups (ex : récap du mois).

- **Accueil** : aujourd'hui, « Plus le temps ? » (dates limites), **Ta semaine** (rêve posté / rêve tourné,
  objectifs 2 tutos + 1 carrousel, puis chaque jour restant avec J-X : posts, tournages, stories), à monter, en retard
  (touche un jour pour y placer une publication en réserve), photos & vidéos prêtes à caser
- **Calendrier** : vue semaine ou mois ; chaque jour affiche les posts, les tournages et les rendez-vous stories
  (sondage Insta le vendredi, annonce du thème le samedi, teaser en fin de carrousel le dimanche)
- **Pipeline** : À faire → Réalisé → Montage → Prêt → Publié, par publication
- **Recherche** : makeups filtrés par couleur, marque, type (makeup / unboxing / swatch, avec tuto / photo / vidéo) et collab
- **Produits** : marque, produit, nom, couleur, PR / offert
- **Idées** : une banque de **thèmes de rêves** (2 sont proposés au sondage de chaque vendredi, le gagnant sort de la liste
  quand le rêve est créé), et des idées de looks à transformer en makeup avec « → Planifier »
- **Insta / TikTok** : le jour J, un bouton par réseau ; l'accueil rappelle un post publié sur un seul des deux
- **Stats** : 2 jours après un post, l'accueil demande vues, abonnés gagnés, enregistrements et partages, pour Insta
  et pour TikTok. L'onglet Stats compare les réseaux, les formats (tuto principal, version graphique, visage entier…)
  et les rêves par abonnés gagnés pour 1 000 vues, sur les deux réseaux ou un seul
- **Rêves** (+ → Nouveau rêve) : 1 rêve = 1 thème = 1 semaine. On tourne la semaine N (lundi tuto principal, mercredi
  tuto graphique, jeudi visage entier, + vendredi version 5 min facultative), on poste la semaine N+1 les mêmes jours, puis le carrousel « tu préfères lequel ? »
  (« tu préfères quel look du dream ? ») le dimanche. Le thème peut rester vide jusqu'au vote : le renseigner renomme les contenus du rêve
- **DA « Dream journal »** : dans chaque contenu, un rappel de la DA, le rêve et la place du makeup dans la semaine, l'accroche à l'écran
  et une description prête à copier (question, appel à s'abonner, produits par marque en bas)
- **Dates limites** : « À poster avant le » sur un contenu (raccourcis Saint-Valentin, Halloween, Noël, Nouvel An).
  L'accueil liste dans « Plus le temps ? » ce qui est trop tard, prévu après la date limite, ou pas prêt à J-3 ;
  un contenu périmé n'est plus proposé pour combler un jour vide ni replacé après sa date limite
- **Séries** (+ → Nouvelle série) : un look à intervalle régulier, ex. calendrier de l'avent ouvert 2 cases
  tous les 2 jours ; crée les tutos datés, un teaser la veille et un récap carrousel « tu préfères lequel ? »

## Installation (une seule fois)

### 1. Supabase

1. Crée un compte sur <https://supabase.com> puis un **nouveau projet** (région Europe).
2. Menu **SQL Editor** → **New query** → colle tout le contenu de [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
   (Si tu avais déjà lancé une ancienne version de `schema.sql`, lance plutôt les migrations
   dans l'ordre : [`migration_002_publications.sql`](supabase/migration_002_publications.sql)
   puis [`migration_003_photos.sql`](supabase/migration_003_photos.sql), [`migration_004_push.sql`](supabase/migration_004_push.sql)
   [`migration_005_recaps.sql`](supabase/migration_005_recaps.sql)
   [`migration_006_abandon.sql`](supabase/migration_006_abandon.sql)
   [`migration_007_da.sql`](supabase/migration_007_da.sql)
   [`migration_008_deadline.sql`](supabase/migration_008_deadline.sql)
   [`migration_009_dreams.sql`](supabase/migration_009_dreams.sql)
   et [`migration_010_stats.sql`](supabase/migration_010_stats.sql).)
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

## Notifications

- **6h30** : seulement ce qui se fait aujourd'hui : à poster (prêt ou pas), à tourner, la story du jour
  (sondage vendredi, annonce samedi, « Demain : Rêve n°X » dimanche, rêve à créer lundi), une date limite à J-3 pas prête.
  Le dimanche, un rappel groupé des stats à noter. Le reste (à monter, réserve, retards) est sur l'accueil
- **20h15** : un post publié aujourd'hui sur un seul réseau, puis ce qui doit être posté demain et si c'est prêt

Fonctionnement : l'Edge Function [`supabase/functions/daily-push`](supabase/functions/daily-push/index.ts)
est appelée toutes les 15 minutes par `pg_cron` et n'envoie qu'à 6h30 et 20h15 (heure de Paris, réglable
en haut du fichier). Si la tâche planifiée tourne encore toutes les heures, passe-la à 15 min dans le SQL Editor :
`select cron.alter_job(jobid, schedule := '*/15 * * * *') from cron.job where command like '%daily-push%';`
Sur iPhone, les notifications ne marchent que dans l'appli **installée sur l'écran d'accueil**.

Mise en place : [`migration_004_push.sql`](supabase/migration_004_push.sql), déploiement de la fonction
(JWT désactivé), secrets `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET`, puis la tâche planifiée
(`secrets/cron.sql`, fichier local non versionné).

## Raccourci iPhone (bouton Action, Siri)

L'Edge Function [`supabase/functions/quick-add`](supabase/functions/quick-add/index.ts) ajoute une idée sans ouvrir l'appli.

Mise en place (une fois) :
1. **Edge Functions** → **Deploy a new function** → nom `quick-add` → colle le fichier → **Deploy**, puis désactive **Verify JWT**.
2. **Edge Functions** → **Secrets** → ajoute `SHORTCUT_TOKEN` : une longue suite de lettres et chiffres inventée (c'est le mot de passe du Raccourci).
3. Dans l'app **Raccourcis** : nouveau raccourci « Idée makeup » avec
   - **Dicter le texte** (ou **Demander une entrée** pour taper)
   - **Obtenir le contenu de l'URL** : `https://<id-du-projet>.supabase.co/functions/v1/quick-add`, méthode **POST**,
     en-tête `x-shortcut-token` = ton jeton, corps **JSON** : `type` = `idee`, `text` = *Texte dicté*
   - **Obtenir la valeur du dictionnaire** `message`, puis **Afficher la notification** avec cette valeur
4. **Réglages** → **Bouton Action** → **Raccourci** → « Idée makeup ».

Types possibles : `idee` (idée de look) et `theme` (thème de rêve). Pour choisir au moment de l'appui, commence le
raccourci par **Choisir dans le menu** et mets un **Obtenir le contenu de l'URL** par choix.
