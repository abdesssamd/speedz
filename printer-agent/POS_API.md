# SpeedZ — API d'intégration logiciel de caisse (POS)

Cette API permet à un **logiciel de caisse** de :

1. **Récupérer les commandes en ligne** SpeedZ pour les injecter dans sa liste de commandes.
2. **Synchroniser le menu et les catégories** dans les **deux sens** (caisse ↔ SpeedZ).

> À destination du **développeur du logiciel de caisse**. Aucune modification de
> SpeedZ n'est nécessaire côté client : il suffit d'appeler ces endpoints HTTP.

---

## Authentification

Toutes les requêtes utilisent le **token API du restaurant** (le même que l'agent
d'impression, reçu par email ou fourni par l'administrateur), dans l'en-tête :

```
x-api-token: fdrest_xxxxxxxxxxxxxxxxxxxxxxxx
```

**Base URL (production) :** `https://speedz.microtechdz13.com`

Un token invalide renvoie `401`. Régénérable côté admin (bouton « 🔑 Nouveau token »).

---

## 1. Récupérer les commandes en ligne

```
GET /api/restaurant/orders
```

| Paramètre (query) | Obligatoire | Description |
|-------------------|-------------|-------------|
| `since`  | non | Date ISO 8601. Ne renvoie que les commandes créées **après** cette date. Passez la date de la dernière commande importée pour du polling incrémental. |
| `status` | non | Filtre par statut exact (`Confirmed`, `Preparing`, `OnTheWay`, `Delivered`, `Cancelled`). |
| `limit`  | non | Max de commandes (défaut 100, max 500). |

**Polling recommandé :** toutes les 5–15 s, appeler avec `since` = date `createdAt`
de la dernière commande déjà importée. Dédoublonner par `id` côté caisse.

### Exemple

```bash
curl -H "x-api-token: fdrest_xxx" \
  "https://speedz.microtechdz13.com/api/restaurant/orders?since=2026-07-13T12:00:00Z"
```

### Réponse (200)

```json
[
  {
    "id": "clx123abc",
    "restaurantId": "r_42",
    "restaurantName": "Chez Ali",
    "customerName": "Yacine B.",
    "customerPhone": "0676267612",
    "items": [
      { "id": "m1", "name": "Burger Chef", "quantity": 2, "price": 650,
        "selectedOptions": [{ "groupName": "Sauce", "choiceName": "Algérienne" }],
        "specialInstructions": "Sans oignon" }
    ],
    "subtotal": 1300,
    "deliveryFee": 200,
    "serviceFee": 0,
    "discountAmount": 0,
    "total": 1500,
    "address": "12 rue X, Alger",
    "paymentMethod": "CASH",
    "channel": "DELIVERY",
    "tableLabel": null,
    "status": "Confirmed",
    "notes": null,
    "createdAt": "2026-07-13T12:03:11.000Z"
  }
]
```

> `channel` vaut `DELIVERY` (livraison), `PICKUP` (à emporter) ou `QR_ONSITE`
> (commande sur place via QR). `items` est un tableau JSON (nom, quantité, prix,
> options choisies, note).

---

## 2. Lire le menu SpeedZ (sens **SpeedZ → caisse**)

```
GET /api/restaurant/menu
```

### Réponse (200)

```json
{
  "categories": [
    { "name": "Burgers", "sortOrder": 0, "isActive": true },
    { "name": "Boissons", "sortOrder": 1, "isActive": true }
  ],
  "items": [
    {
      "id": "pos_r42_1007",
      "externalId": "1007",
      "name": "Burger Chef",
      "description": "Pain brioché, steak 150g…",
      "price": 650,
      "category": "Burgers",
      "isAvailable": true,
      "stock": 0,
      "updatedAt": "2026-07-13T11:40:00.000Z"
    }
  ]
}
```

- `externalId` = l'ID produit **de votre caisse** que vous nous avez envoyé (voir §3).
  Il vaut `null` pour un article créé côté SpeedZ (admin) et pas encore lié.
- Utilisez `updatedAt` pour détecter les changements côté SpeedZ.

---

## 3. Pousser le menu de la caisse (sens **caisse → SpeedZ**)

```
POST /api/restaurant/menu/sync
Content-Type: application/json
```

Envoyez **votre** menu. SpeedZ fait un **upsert par `externalId`** (l'ID produit
de votre caisse) : création si inconnu, mise à jour sinon. `deleted: true` retire
l'article. La correspondance `externalId ↔ id SpeedZ` est mémorisée : renvoyez
toujours le même `externalId` pour le même produit.

### Corps de la requête

```json
{
  "categories": [
    { "name": "Burgers", "sortOrder": 0, "isActive": true },
    { "name": "Boissons", "sortOrder": 1 }
  ],
  "items": [
    { "externalId": "1007", "name": "Burger Chef", "description": "…",
      "price": 650, "category": "Burgers", "isAvailable": true, "stock": 12 },
    { "externalId": "1008", "name": "Coca 33cl", "price": 120, "category": "Boissons" },
    { "externalId": "1009", "deleted": true }
  ]
}
```

| Champ item | Obligatoire | Défaut |
|------------|-------------|--------|
| `externalId` | **oui** | — (votre ID produit, string ou number) |
| `name` | oui (sauf si `deleted`) | — |
| `price` | oui (sauf si `deleted`) | — |
| `category` | non | `Divers` |
| `description` | non | `""` |
| `image` | non | `""` (URL) |
| `isAvailable` | non | `true` |
| `stock` | non | `0` |
| `deleted` | non | `false` |

Max **2000 articles** par appel.

### Réponse (200)

```json
{
  "ok": true,
  "created": 2, "updated": 5, "deleted": 1, "categories": 1,
  "mappings": [
    { "externalId": "1007", "id": "pos_r42_1007" },
    { "externalId": "1008", "id": "pos_r42_1008" }
  ]
}
```

`mappings` donne l'ID SpeedZ associé à chacun de vos `externalId` (utile si vous
souhaitez le stocker).

---

## Modèle de synchronisation bidirectionnelle (recommandation)

1. **Au démarrage / périodiquement** : `POST /menu/sync` avec tout votre menu →
   SpeedZ s'aligne sur la caisse (source principale des produits).
2. **Optionnel** : `GET /menu` pour voir ce que SpeedZ contient (ex. articles
   créés côté admin) et les remonter dans la caisse si besoin.
3. **Commandes** : `GET /orders?since=…` en boucle → import dans la caisse.

> Pour éviter les conflits, gardez la **caisse comme source de vérité du menu**
> et ne modifiez les prix que d'un seul côté. La synchro « deux sens » est
> supportée, mais un article modifié des deux côtés suit le **dernier écrit**.

---

## Codes d'erreur

| Code | Sens |
|------|------|
| `401` | Token manquant ou invalide (`x-api-token`). |
| `422` | Corps invalide (voir `errors[]` : `field` + `message`). |
| `404` | Ressource introuvable. |
| `429` | Trop de requêtes (limiteur de débit) — réduisez la fréquence de polling. |

---

## Résumé des endpoints

| Méthode | Endpoint | Sens |
|---------|----------|------|
| GET  | `/api/restaurant/orders` | Commandes en ligne → caisse |
| GET  | `/api/restaurant/menu` | Menu SpeedZ → caisse |
| POST | `/api/restaurant/menu/sync` | Menu caisse → SpeedZ |
| GET  | `/api/restaurant/billing` | Facturation (bonus, déjà utilisé par l'agent) |
| GET  | `/api/restaurant/printer/orders` | Commandes à imprimer (agent d'impression) |
