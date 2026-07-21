# SpeedZ Printer Agent

Agent Python pour Windows qui tourne **en arrière-plan, à côté du logiciel de
caisse du restaurant**, sans interférer. Il :

- s'authentifie avec le `Token API` du restaurant (reçu par email)
- interroge `GET /api/restaurant/printer/orders`
- **imprime en ESC/POS direct** sur l'imprimante thermique (58/80 mm) — ticket
  instantané et propre, sans ouvrir Notepad
- **émet un bip + une notification** à chaque nouvelle commande
- n'accuse « imprimé » **que si l'impression a réussi** (zéro commande perdue,
  ré-essai automatique)
- réimprime les tickets remis en file par l'admin (bouton « Réimprimer resto »)
- expose un mode service Windows via `windows_service.py`

## Méthode simple (recommandée pour les restaurants) — interface graphique

Le restaurateur n'a **rien à configurer**. Il lance l'application, colle son
token (son « mot de passe » reçu par email) **une seule fois**, choisit son
imprimante, et clique **« Se connecter et démarrer »**. Aux lancements suivants,
la connexion et l'impression démarrent **automatiquement**.

```powershell
pip install -r requirements.txt
python speedz_printer_gui.py
```

### Compiler l'exécutable (`.exe`)

Double-cliquez sur **`build.bat`** — il installe les dépendances et génère les
exécutables dans `dist\` :

- `dist\SpeedZPrinter.exe` → à distribuer aux restaurants (double-clic, coller le token)
- `dist\SpeedZPrinterService.exe` → pour l'installation en service

### Fonctionnalités de l'application

- Connexion par token (enregistré, reconnexion auto ensuite)
- Choix de l'imprimante dans une liste
- Statut « EN LIGNE » + journal des impressions en direct
- Bouton **« 🔳 Imprimer le QR »** — imprime le QR de commande que le restaurant
  peut afficher/partager avec ses clients
- Bouton **« 📊 Mon compte »** — ouvre une fenêtre montrant, directement sur le
  PC de caisse : le nombre de commandes, le plan de facturation, **ce que le
  restaurant doit payer à la plateforme** (commission %, frais ou abonnement),
  ce qu'il a déjà versé, son solde restant, et **« 🔗 Copier le lien du menu »**
  pour le partager à ses clients. (API : `GET /api/restaurant/billing`.)

### Démarrer automatiquement avec Windows (service)

1. Ouvrez **`SpeedZPrinter.exe`** une fois, collez le token, connectez-vous
   (cela crée `config.json`).
2. Faites un clic droit sur **`install_service.bat`** → **« Exécuter en tant
   qu'administrateur »**. Le service démarre et se relancera à chaque démarrage
   du PC, sans ouvrir l'application.
3. Pour retirer le service : **`uninstall_service.bat`** (en administrateur).

> Ne laissez pas l'application **et** le service tourner en même temps
> (risque de double impression). Choisissez l'un ou l'autre.

## Méthode avancée (ligne de commande / serveur)

1. Copier `config.example.json` vers `config.json`
2. Renseigner `api_base_url` et `api_token`.
   `printer_name` peut rester vide → l'imprimante **par défaut** de Windows est
   utilisée automatiquement.
3. Installer les dépendances :

```powershell
pip install -r requirements.txt
```

4. Lancer en mode console :

```powershell
python printer_agent.py
```

## Options de configuration (`config.json`)

| Clé | Défaut | Rôle |
|-----|--------|------|
| `api_base_url` | — | URL du backend SpeedZ |
| `api_token` | — | Token API du restaurant |
| `printer_name` | `""` | Nom de l'imprimante Windows (vide = imprimante par défaut) |
| `paper_columns` | `32` | Largeur du papier (32 = 58 mm, 48 = 80 mm) |
| `sound_enabled` | `true` | Bip à chaque nouvelle commande |
| `notifications_enabled` | `true` | Notification Windows |
| `auto_cut` | `true` | Coupe automatique du ticket |
| `feed_lines` | `4` | Lignes d'avance avant coupe |
| `print_retries` | `3` | Nombre d'essais avant abandon |
| `poll_interval_seconds` | `5` | Fréquence d'interrogation |
| `heartbeat_interval_seconds` | `30` | Fréquence du signal « en ligne » |
| `max_backoff_seconds` | `60` | Plafond du délai de ré-essai en cas de réseau instable / 429 |
| `encoding` | `cp858` | Encodage texte (cp858 gère les accents FR + € ; `cp437` = ancien) |
| `codepage` | `19` | Codepage ESC/POS envoyé à l'imprimante (19 = PC858). À ajuster selon le modèle |
| `print_mode` | `combined` | `combined` (1 ticket détaillé), `kitchen_and_receipt` (ticket cuisine + reçu), `kitchen_only` |
| `header_lines` | `[]` | Lignes libres imprimées en en-tête (ex. adresse, téléphone) |
| `footer_lines` | `[]` | Lignes libres imprimées en pied de ticket (ex. « Merci ! ») |
| `logo_path` | `""` | Chemin d'un logo PNG à imprimer en tête (nécessite `Pillow`) |
| `use_websocket` | `true` | Réception temps réel des commandes (accélère le poll ; nécessite `websocket-client`) |
| `kitchen_printer_name` | `""` | Imprimante dédiée aux tickets **cuisine** (mode double imprimante) |
| `receipt_printer_name` | `""` | Imprimante dédiée aux **reçus** client (mode double imprimante) |
| `api_token_enc` | — | Token chiffré (DPAPI). Généré automatiquement à la place de `api_token` en clair |

### Améliorations de fiabilité (v2)

- **Heartbeat isolé** : un échec du signal « en ligne » ne bloque plus l'impression des commandes.
- **Reconnexion automatique** : ré-authentification avec back-off exponentiel si le réseau tombe.
- **Back-off + `Retry-After`** : en cas de `429`/`503`/timeout, l'agent ralentit puis réaccélère (respecte l'en-tête `Retry-After`).
- **Anti-doublon** : une commande déjà imprimée n'est jamais réimprimée dans la session, même si l'accusé réseau échoue.
- **Rotation des logs** : `printer-agent.log` limité (512 Ko × 3), ne grossit plus indéfiniment.

### Nouveaux boutons GUI

- **🍽 QR par table** — imprime un QR distinct par table (issu du plan de salle de l'espace restaurant).
- **🧪 Test** — imprime un ticket de test (vérifie imprimante + accents) avant le service.

> Pour `logo_path`, installez Pillow : `pip install Pillow`. Sans Pillow, le logo est simplement ignoré (aucun blocage).

### Ergonomie / exploitation (v2)

- **Icône barre des tâches (system tray)** : fermer la fenêtre la **réduit en fond** (l'impression continue) ; l'icône est **verte** (en ligne) ou **rouge** (hors ligne). Menu clic droit : *Afficher* / *Quitter*. (Nécessite `pystray` + `Pillow`.)
- **Démarrage minimisé** : lancé avec `--minimized`, l'agent démarre directement dans le tray.
- **Démarrage automatique avec Windows** : case à cocher qui crée/supprime un raccourci dans `shell:startup` (plus simple que le service).
- **Réimpression manuelle** : liste déroulante des dernières commandes + bouton **Réimprimer**.
- **Statut imprimante en direct** : détection *hors-ligne / plus de papier / bourrage / erreur* avec pastille 🟢/🔴.
- **Token chiffré au repos (DPAPI)** : le token est stocké chiffré (`api_token_enc`), lié au compte Windows — un `config.json` volé n'est pas réutilisable ailleurs. Repli automatique en clair si DPAPI indisponible.
- **Temps réel (WebSocket)** : les nouvelles commandes réveillent immédiatement la boucle → impression quasi instantanée, avec repli sur le polling.
- **Double imprimante** : `kitchen_printer_name` (cuisine) + `receipt_printer_name` (comptoir) ; sinon tout part sur `printer_name`.
- **Auto-update** : au démarrage, l'agent vérifie `GET /api/printer-agent/version` et signale si une version plus récente existe.

> Installer les optionnels : `pip install pystray Pillow websocket-client`. Chacun est facultatif — l'agent fonctionne sans (fonction correspondante simplement désactivée).

## Installation comme service Windows

```powershell
python windows_service.py install
python windows_service.py start
```

## Packaging `.exe`

```powershell
pyinstaller --onefile --name SpeedZPrinterAgent printer_agent.py
pyinstaller --onefile --name SpeedZPrinterService windows_service.py
```
