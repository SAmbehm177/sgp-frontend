# SGP - Front React

Front du Système de Gestion de Projet (React + Vite + Tailwind), consommant l'API Laravel Sanctum.

## Lancer
1. `npm install`
2. Copier `.env.example` en `.env` et ajuster `VITE_API_URL`
3. `npm run dev` (http://localhost:3000)

L'API Laravel doit tourner (`php artisan serve`, port 8000) avec CORS autorisé pour http://localhost:3000.
Le mode simulation (sans backend) s'active dans Paramètres API.

## Déploiement

Définir `VITE_API_URL` dans l'environnement de build de l'hébergeur, avec l'URL publique de l'API
et le préfixe `/api` (par exemple `https://api.example.com/api`), avant de lancer `npm run build`.
La valeur locale `http://localhost:8000/api` de `.env.example` est réservée au développement.

## Tests

`npm test` exécute les tests du client API.
