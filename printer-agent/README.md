# FoodDelyvry Printer Agent

Agent Python pour Windows qui:

- s'authentifie avec le `Token API` recu par email
- interroge `GET /api/restaurant/printer/orders`
- imprime automatiquement les nouvelles commandes
- accuse reception via `POST /api/restaurant/printer/orders/:id/printed`
- expose un mode service Windows via `windows_service.py`

## Installation locale

1. Copier `config.example.json` vers `config.json`
2. Renseigner `api_base_url`, `api_token` et `printer_name`
3. Installer les dependances:

```powershell
pip install -r requirements.txt
```

4. Lancer en mode console:

```powershell
python printer_agent.py
```

## Installation comme service Windows

```powershell
python windows_service.py install
python windows_service.py start
```

## Packaging `.exe`

```powershell
pyinstaller --onefile --name FoodDelyvryPrinterAgent printer_agent.py
pyinstaller --onefile --name FoodDelyvryPrinterService windows_service.py
```
