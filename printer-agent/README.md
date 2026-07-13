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
