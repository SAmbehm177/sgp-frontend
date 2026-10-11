# SGP - Front React

Front du Système de Gestion de Projet (React + Vite + Tailwind), consommant l'API Laravel Sanctum.

## Lancer
1. `npm install`
2. Copier `.env.example` en `.env` et ajuster `VITE_API_URL`
3. `npm run dev` (http://localhost:3000)

L'API Laravel doit tourner (`php artisan serve`, port 8000) avec CORS autorisé pour http://localhost:3000.
Le mode simulation (sans backend) s'active dans Paramètres API.
