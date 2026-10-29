# Carnet d'hiver 2026-27

Carnet de préparation du voyage : départ le 9 novembre 2026 depuis Paris, retour fin décembre 2026 ou fin février / début mars 2027.

Repris de l'artifact Claude : https://claude.ai/artifact/2NmSGna6xpKLGgH6Lm7g8K

## Ouvrir

Double-clique sur `index.html` : la page s'ouvre dans ton navigateur. Une connexion internet est nécessaire pour les polices et la carte.

## Structure

- `index.html` : la page (en-tête, filtres, vues Liste / Carte / Ma sélection, enchaînements, exclusions, sources)
- `css/style.css` : les styles (clair et sombre)
- `js/data.js` : **les données des pays** (`D` fiches, `X` course et visa, `VD` obtention des visas). C'est ici qu'on ajoute ou corrige un pays.
- `js/app.js` : filtres, carte (d3 + fond de carte echarts), sélection et notes

## Notes et sélection

Sans Supabase, les notes, liens et « Ma liste » sont gardés dans le navigateur (localStorage). Utilise **Exporter mes notes** pour les sauvegarder dans un fichier `.json`, et **Importer** pour les recharger (autre navigateur, autre ordinateur).

## À vérifier avant de réserver

La situation sécuritaire date du 29/10/2026. Vérifie la fiche France Diplomatie de chaque pays et inscris-toi sur Ariane.

## Mise en ligne (téléphone + notes synchronisées)

Le site est hébergé sur **GitHub Pages**, les notes sont gardées dans **Supabase**.

### 1. Supabase (les notes)
1. Sur https://supabase.com/dashboard, crée un projet (région Europe).
2. *SQL Editor* : colle le contenu de `supabase/schema.sql`, puis *Run*.
3. *Project Settings > API* : copie la **Project URL** et la clé **publishable** (ou *anon*) dans `js/config.js`. Jamais la clé *secret* / *service_role*.
4. *Authentication > URL Configuration* : mets l'adresse GitHub Pages du site dans *Site URL* et *Redirect URLs*.
5. Après ta première connexion, *Authentication > Sign In / Providers* : désactive *Allow new users to sign up* pour que personne d'autre ne crée de compte.

### 2. GitHub Pages (le site)
1. Crée un dépôt `voyage-2026` sur GitHub et envoie-y ce dossier.
2. *Settings > Pages* : source « Deploy from a branch », branche `main`, dossier `/ (root)`.
3. Le site est disponible à `https://<ton-pseudo>.github.io/voyage-2026/`. Ouvre-le sur ton téléphone et ajoute-le à l'écran d'accueil.

Sur chaque appareil, saisis ton e-mail dans « Synchroniser mes notes », puis ouvre le lien reçu **sur ce même appareil**.
