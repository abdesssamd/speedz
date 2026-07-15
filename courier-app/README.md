# SpeedZ Livreur

Application mobile dédiée aux livreurs SpeedZ (Expo / React Native). Séparée de
l'application client, elle partage le même backend.

## Démarrer

```bash
cd courier-app
npm install
npx expo start
```

En dev, l'app détecte automatiquement l'hôte Metro et cible `http://<hôte>:4000`.
Pour forcer un backend précis : `EXPO_PUBLIC_API_URL=http://192.168.1.10:4000 npx expo start`.
En build (preview/production), l'URL de prod vient de `eas.json` (`EXPO_PUBLIC_API_URL`).

## Fonctionnalités

- **Inscription livreur** : envoie une candidature `COURIER` validée ensuite par l'admin.
- **Connexion** par numéro de téléphone (le compte doit être validé par l'admin).
- **Courses disponibles** : dispatch favoris-d'abord (fenêtre d'exclusivité ~1 min pour
  les livreurs favoris du client) puis ouverture à la zone du restaurant.
- **Flux course** : Prendre → Confirmer (déclenche l'impression au restaurant) →
  Appeler le client → En route → Livrée.
- **Code livreur** = 6 derniers chiffres du téléphone, à partager verbalement aux clients
  pour être ajouté en favori.
- Notifications push (nouvelles courses) et partage de position en direct.

## Endpoints backend utilisés

`/api/courier/auth`, `/api/courier/jobs`, `/api/courier/jobs/:id/accept`,
`/api/courier/jobs/:id/confirm`, `/api/courier/jobs/:id/status`,
`/api/courier/push-token`, `/api/courier/location`, `/api/applications` (type COURIER).
