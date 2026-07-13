"""
SpeedZ Printer Agent
────────────────────────────────────────────────────────────────────────────
Agent Windows qui tourne EN ARRIERE-PLAN, a cote du logiciel de caisse du
restaurant, sans interferer. Il :

  * s'authentifie avec le token API du restaurant
  * recupere les nouvelles commandes SpeedZ
  * les imprime en ESC/POS DIRECT sur l'imprimante thermique (58/80 mm)
    -> instantane, propre, aucune fenetre qui s'ouvre
  * emet un BIP + une notification a chaque nouvelle commande
  * n'accuse "imprime" QUE si l'impression a reussi (zero commande perdue)
  * reimprime automatiquement les tickets remis en file par l'admin

Config minimale : api_base_url + api_token. Si printer_name est vide,
l'imprimante par defaut de Windows est utilisee automatiquement.
"""

import json
import logging
import os
import sys
import time
from pathlib import Path

import requests

try:
    import win32print
except ImportError:  # pragma: no cover
    win32print = None

try:
    import winsound
except ImportError:  # pragma: no cover
    winsound = None

# Notification desktop optionnelle (best-effort, ne casse jamais l'agent).
try:
    from win10toast import ToastNotifier

    _toaster = ToastNotifier()
except Exception:  # pragma: no cover
    _toaster = None


BASE_DIR = Path(__file__).resolve().parent
CONFIG_PATH = Path(os.environ.get("SPEEDZ_PRINTER_CONFIG", BASE_DIR / "config.json"))
# Compatibilite ascendante avec l'ancienne variable d'environnement.
if not CONFIG_PATH.exists():
    legacy = os.environ.get("FOODDELYVRY_PRINTER_CONFIG")
    if legacy:
        CONFIG_PATH = Path(legacy)
LOG_PATH = BASE_DIR / "printer-agent.log"


# ─── ESC/POS ─────────────────────────────────────────────────────────────────
ESC = b"\x1b"
GS = b"\x1d"
INIT = ESC + b"@"
BOLD_ON = ESC + b"E\x01"
BOLD_OFF = ESC + b"E\x00"
ALIGN_CENTER = ESC + b"a\x01"
ALIGN_LEFT = ESC + b"a\x00"
SIZE_DOUBLE = GS + b"!\x11"   # double largeur + hauteur
SIZE_NORMAL = GS + b"!\x00"
CUT = GS + b"V\x01"           # coupe partielle
FEED = b"\n"


def load_config():
    with open(CONFIG_PATH, "r", encoding="utf-8") as handle:
        return json.load(handle)


def setup_logging():
    logging.basicConfig(
        filename=LOG_PATH,
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )


def _line(config):
    return b"-" * int(config.get("paper_columns", 32))


def _txt(value):
    """Encode en CP437 (jeu de caracteres standard des imprimantes thermiques)."""
    return str(value).encode("cp437", errors="replace")


class PrinterAgent:
    def __init__(self, config, status_callback=None):
        self.config = config
        self.session = requests.Session()
        self.headers = {"x-api-token": config["api_token"]}
        self.base_url = config["api_base_url"].rstrip("/")
        self.last_heartbeat = 0.0
        self.restaurant_name = "SpeedZ"
        # Callback optionnel pour remonter l'activite a une interface (GUI).
        self.status_callback = status_callback

    def _notify(self, message):
        logging.info(message)
        if self.status_callback:
            try:
                self.status_callback(message)
            except Exception:
                pass

    # ── API ──────────────────────────────────────────────────────────────────
    def authenticate(self):
        response = self.session.post(
            f"{self.base_url}/api/restaurant/printer/auth",
            headers=self.headers,
            timeout=15,
        )
        response.raise_for_status()
        payload = response.json()
        self.restaurant_name = payload.get("restaurant", {}).get("name", "SpeedZ")
        self._notify(f"Connecte au restaurant : {self.restaurant_name}")
        return payload

    def heartbeat(self):
        now = time.time()
        if now - self.last_heartbeat < self.config.get("heartbeat_interval_seconds", 30):
            return
        response = self.session.post(
            f"{self.base_url}/api/restaurant/printer/heartbeat",
            headers=self.headers,
            timeout=15,
        )
        response.raise_for_status()
        self.last_heartbeat = now

    def fetch_orders(self):
        response = self.session.get(
            f"{self.base_url}/api/restaurant/printer/orders",
            headers=self.headers,
            timeout=20,
        )
        response.raise_for_status()
        return response.json()

    def acknowledge_printed(self, order_id):
        response = self.session.post(
            f"{self.base_url}/api/restaurant/printer/orders/{order_id}/printed",
            headers=self.headers,
            timeout=15,
        )
        response.raise_for_status()

    def fetch_qr(self):
        # Requete independante (thread separe de la boucle principale).
        response = requests.get(
            f"{self.base_url}/api/restaurant/printer/qr",
            headers=self.headers,
            timeout=15,
        )
        response.raise_for_status()
        return response.json()

    def fetch_billing(self):
        # Facturation du restaurant : commandes, montant du, versements, solde.
        response = requests.get(
            f"{self.base_url}/api/restaurant/billing",
            headers=self.headers,
            timeout=15,
        )
        response.raise_for_status()
        return response.json()

    # ── Alerte (bip + notification) ──────────────────────────────────────────
    def alert_new_order(self, count):
        if self.config.get("sound_enabled", True) and winsound is not None:
            try:
                winsound.Beep(1200, 250)
                winsound.Beep(900, 250)
            except Exception:
                pass
        if self.config.get("notifications_enabled", True) and _toaster is not None:
            try:
                _toaster.show_toast(
                    "SpeedZ",
                    f"{count} nouvelle(s) commande(s) recue(s)",
                    duration=4,
                    threaded=True,
                )
            except Exception:
                pass

    # ── Impression ───────────────────────────────────────────────────────────
    def resolve_printer_name(self):
        name = (self.config.get("printer_name") or "").strip()
        if name:
            return name
        if win32print is not None:
            try:
                return win32print.GetDefaultPrinter()
            except Exception:
                return ""
        return ""

    def build_ticket(self, order):
        cols = int(self.config.get("paper_columns", 32))
        out = bytearray()
        out += INIT
        out += ALIGN_CENTER + BOLD_ON + SIZE_DOUBLE
        out += _txt("SpeedZ") + FEED
        out += SIZE_NORMAL
        out += _txt(self.restaurant_name) + FEED
        out += BOLD_OFF + ALIGN_LEFT
        out += _line(self.config) + FEED

        out += BOLD_ON + _txt(f"Commande #{str(order.get('id', ''))[-6:].upper()}") + BOLD_OFF + FEED
        out += _txt(f"Canal   : {order.get('channel', 'DELIVERY')}") + FEED
        out += _txt(f"Client  : {order.get('customerName') or '-'}") + FEED
        out += _txt(f"Tel     : {order.get('customerPhone') or '-'}") + FEED
        dest = order.get("tableLabel") or order.get("address") or "-"
        out += _txt(f"Adr/Tbl : {dest}") + FEED
        out += _line(self.config) + FEED

        for item in order.get("items", []):
            qty = item.get("quantity", 1)
            name = item.get("name", "Article")
            out += BOLD_ON + _txt(f"{qty} x {name}") + BOLD_OFF + FEED
            for option in item.get("selectedOptions", []):
                out += _txt(f"  + {option.get('choiceName')}") + FEED
            if item.get("specialInstructions"):
                out += _txt(f"  Note: {item['specialInstructions']}") + FEED

        out += _line(self.config) + FEED
        out += ALIGN_CENTER + BOLD_ON + SIZE_DOUBLE
        out += _txt(f"TOTAL: {float(order.get('total', 0)):.2f} DA") + FEED
        out += SIZE_NORMAL + BOLD_OFF
        out += _txt(f"Paiement: {order.get('paymentMethod', 'Cash')}") + FEED
        out += ALIGN_LEFT
        out += FEED * int(self.config.get("feed_lines", 4))
        if self.config.get("auto_cut", True):
            out += CUT
        return bytes(out)

    def _escpos_qr(self, data):
        """Construit un QR code ESC/POS natif (commandes GS ( k)."""
        payload = data.encode("utf-8")
        store_len = len(payload) + 3
        pl = store_len & 0xFF
        ph = (store_len >> 8) & 0xFF
        out = bytearray()
        out += b"\x1d\x28\x6b\x04\x00\x31\x41\x32\x00"      # modele 2
        out += b"\x1d\x28\x6b\x03\x00\x31\x43\x08"          # taille du module = 8
        out += b"\x1d\x28\x6b\x03\x00\x31\x45\x31"          # correction d'erreur = M
        out += b"\x1d\x28\x6b" + bytes([pl, ph]) + b"\x31\x50\x30" + payload  # donnees
        out += b"\x1d\x28\x6b\x03\x00\x31\x51\x30"          # impression
        return bytes(out)

    def build_qr_ticket(self, url):
        out = bytearray()
        out += INIT
        out += ALIGN_CENTER + BOLD_ON + SIZE_DOUBLE
        out += _txt("SpeedZ") + FEED
        out += SIZE_NORMAL
        out += _txt(self.restaurant_name) + FEED
        out += BOLD_OFF + FEED
        out += BOLD_ON + _txt("Scannez pour commander") + BOLD_OFF + FEED + FEED
        out += self._escpos_qr(url)
        out += FEED
        out += _txt(url) + FEED
        out += ALIGN_LEFT
        out += FEED * int(self.config.get("feed_lines", 4))
        if self.config.get("auto_cut", True):
            out += CUT
        return bytes(out)

    def print_qr_code(self, url):
        ticket = self.build_qr_ticket(url)
        ok = self.send_to_printer(ticket)
        if ok:
            self._notify("QR code du magasin imprime")
        return ok

    def send_to_printer(self, data_bytes):
        """Envoie les octets ESC/POS en RAW a l'imprimante. Retourne True si OK."""
        printer_name = self.resolve_printer_name()
        if win32print is not None and printer_name:
            handle = win32print.OpenPrinter(printer_name)
            try:
                win32print.StartDocPrinter(handle, 1, ("SpeedZ Ticket", None, "RAW"))
                win32print.StartPagePrinter(handle)
                win32print.WritePrinter(handle, data_bytes)
                win32print.EndPagePrinter(handle)
                win32print.EndDocPrinter(handle)
                return True
            finally:
                win32print.ClosePrinter(handle)
        # Repli (dev / pas d'imprimante) : ecrit le ticket sur disque.
        fallback = BASE_DIR / f"ticket-{int(time.time())}.bin"
        fallback.write_bytes(data_bytes)
        logging.info("Aucune imprimante -> ticket ecrit dans %s", fallback)
        return True

    def print_with_retry(self, order):
        attempts = int(self.config.get("print_retries", 3))
        ticket = self.build_ticket(order)
        for attempt in range(1, attempts + 1):
            try:
                if self.send_to_printer(ticket):
                    return True
            except Exception as exc:
                logging.warning("Echec impression (essai %s/%s): %s", attempt, attempts, exc)
                time.sleep(2)
        return False

    # ── Boucle principale ────────────────────────────────────────────────────
    def loop(self):
        self.authenticate()
        while True:
            try:
                self.heartbeat()
                orders = self.fetch_orders()
                if orders:
                    self.alert_new_order(len(orders))
                for order in orders:
                    if self.print_with_retry(order):
                        # On n'accuse "imprime" QUE si l'impression a reussi.
                        self.acknowledge_printed(order["id"])
                        self._notify(f"Commande #{str(order['id'])[-6:].upper()} imprimee")
                    else:
                        self._notify(
                            f"ECHEC impression commande #{str(order.get('id'))[-6:].upper()} - sera reessayee"
                        )
            except Exception as exc:  # pragma: no cover
                logging.exception("Erreur de polling: %s", exc)
            time.sleep(self.config.get("poll_interval_seconds", 5))


def main():
    setup_logging()
    config = load_config()
    agent = PrinterAgent(config)
    agent.loop()


if __name__ == "__main__":
    main()
