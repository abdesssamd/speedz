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

import base64
import json
import logging
import os
import sys
import threading
import time
from collections import deque
from logging.handlers import RotatingFileHandler
from pathlib import Path

import requests

AGENT_VERSION = "2.0.0"

try:
    import win32print
except ImportError:  # pragma: no cover
    win32print = None

try:
    import win32crypt  # DPAPI : chiffrement du token au repos
except ImportError:  # pragma: no cover
    win32crypt = None

try:
    import winsound
except ImportError:  # pragma: no cover
    winsound = None

# WebSocket temps reel (optionnel : accelere la reception des commandes).
try:
    import websocket  # paquet "websocket-client"
except Exception:  # pragma: no cover
    websocket = None

# Pillow est optionnel : utilise seulement pour l'impression d'un logo (raster).
try:
    from PIL import Image
except Exception:  # pragma: no cover
    Image = None

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


# ─── Chiffrement du token au repos (Windows DPAPI) ───────────────────────────
# CryptProtectData lie le secret au compte Windows : un config.json volé et
# ouvert sur une autre machine ne donne pas le token en clair.
def encrypt_token(plain):
    if not plain or win32crypt is None:
        return None
    try:
        blob = win32crypt.CryptProtectData(plain.encode("utf-8"), "SpeedZ", None, None, None, 0)
        return base64.b64encode(blob).decode("ascii")
    except Exception:
        return None


def decrypt_token(enc):
    if not enc or win32crypt is None:
        return None
    try:
        blob = base64.b64decode(enc)
        _desc, data = win32crypt.CryptUnprotectData(blob, None, None, None, 0)
        return data.decode("utf-8")
    except Exception:
        return None


def resolve_token(config):
    """Retourne le token en clair : depuis api_token_enc (DPAPI) si present,
    sinon depuis api_token (clair, retro-compat)."""
    enc = config.get("api_token_enc")
    if enc:
        clear = decrypt_token(enc)
        if clear:
            return clear
    return config.get("api_token", "")


def setup_logging():
    # Rotation : 512 Ko x 3 fichiers -> le journal ne grossit plus indefiniment.
    handler = RotatingFileHandler(
        LOG_PATH, maxBytes=512 * 1024, backupCount=3, encoding="utf-8"
    )
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    root = logging.getLogger()
    root.setLevel(logging.INFO)
    # Evite les handlers en double si setup_logging est appele plusieurs fois (GUI).
    for existing in list(root.handlers):
        root.removeHandler(existing)
    root.addHandler(handler)


def _line(config):
    return b"-" * int(config.get("paper_columns", 32))


def _txt(value):
    """Encode en CP437 (jeu de caracteres standard des imprimantes thermiques)."""
    return str(value).encode("cp437", errors="replace")


class PrinterAgent:
    def __init__(self, config, status_callback=None):
        self.config = config
        self.session = requests.Session()
        self.token = resolve_token(config)
        self.headers = {"x-api-token": self.token}
        self.base_url = config["api_base_url"].rstrip("/")
        self.last_heartbeat = 0.0
        self.restaurant_name = "SpeedZ"
        # Callback optionnel pour remonter l'activite a une interface (GUI).
        self.status_callback = status_callback
        # Encodage : cp858 gere les accents FR + le symbole euro (defaut). Le
        # codepage ESC/POS correspondant (PC858) est 19 sur la plupart des
        # imprimantes ; ajustable via la config si besoin.
        self.encoding = config.get("encoding", "cp858")
        self.codepage = int(config.get("codepage", 19))
        # Anti-doublon : IDs deja imprimes+accuses dans cette session.
        self.printed_ids = set()
        # Historique des commandes recentes (pour reimpression manuelle).
        self.recent_orders = deque(maxlen=30)
        # Reveil immediat de la boucle de poll (declenche par le WebSocket).
        self.wake = threading.Event()
        self._ws_app = None

    def _txt(self, value):
        """Encode le texte selon le codepage de l'imprimante (accents FR)."""
        try:
            return str(value).encode(self.encoding, errors="replace")
        except Exception:
            return str(value).encode("cp437", errors="replace")

    def _line(self, config=None):
        return b"-" * int(self.config.get("paper_columns", 32))

    def _prelude(self):
        """Initialise l'imprimante et selectionne le codepage (accents)."""
        return INIT + ESC + b"t" + bytes([self.codepage & 0xFF])

    def _notify(self, message):
        logging.info(message)
        if self.status_callback:
            try:
                self.status_callback(message)
            except Exception:
                pass

    # ── API ──────────────────────────────────────────────────────────────────
    def _request(self, method, path, timeout=15):
        """Appel HTTP centralise. Respecte Retry-After sur 429/503 (attend puis
        reessaie une fois), et leve pour les autres erreurs."""
        url = f"{self.base_url}{path}"
        response = self.session.request(method, url, headers=self.headers, timeout=timeout)
        if response.status_code in (429, 503):
            retry_after = response.headers.get("Retry-After")
            wait = 0
            try:
                wait = int(retry_after)
            except (TypeError, ValueError):
                wait = 5
            wait = max(1, min(wait, 60))
            self._notify(f"Serveur occupe (HTTP {response.status_code}), pause {wait}s")
            time.sleep(wait)
            response = self.session.request(method, url, headers=self.headers, timeout=timeout)
        response.raise_for_status()
        return response

    def authenticate(self):
        payload = self._request("POST", "/api/restaurant/printer/auth").json()
        self.restaurant_name = payload.get("restaurant", {}).get("name", "SpeedZ")
        self._notify(f"Connecte au restaurant : {self.restaurant_name}")
        return payload

    def heartbeat(self):
        now = time.time()
        if now - self.last_heartbeat < self.config.get("heartbeat_interval_seconds", 30):
            return
        self._request("POST", "/api/restaurant/printer/heartbeat")
        self.last_heartbeat = now

    def fetch_orders(self):
        return self._request("GET", "/api/restaurant/printer/orders", timeout=20).json()

    def acknowledge_printed(self, order_id):
        self._request("POST", f"/api/restaurant/printer/orders/{order_id}/printed")

    def fetch_qr(self):
        # Requete independante (thread separe de la boucle principale).
        response = requests.get(
            f"{self.base_url}/api/restaurant/printer/qr",
            headers=self.headers,
            timeout=15,
        )
        response.raise_for_status()
        return response.json()

    def fetch_tables(self):
        # Liste des tables + leurs QR (thread separe de la boucle principale).
        response = requests.get(
            f"{self.base_url}/api/restaurant/printer/tables",
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
    def resolve_printer_name(self, role=None):
        """Nom de l'imprimante pour un role donne ('kitchen' / 'receipt').
        Repli sur printer_name puis l'imprimante par defaut Windows."""
        if role == "kitchen":
            name = (self.config.get("kitchen_printer_name") or "").strip()
            if name:
                return name
        if role == "receipt":
            name = (self.config.get("receipt_printer_name") or "").strip()
            if name:
                return name
        name = (self.config.get("printer_name") or "").strip()
        if name:
            return name
        if win32print is not None:
            try:
                return win32print.GetDefaultPrinter()
            except Exception:
                return ""
        return ""

    def printer_status(self, printer_name=None):
        """Retourne (ok: bool, message: str) selon l'etat Windows de l'imprimante.
        Detecte hors-ligne, plus de papier, erreur, bourrage, porte ouverte."""
        if win32print is None:
            return True, "OK"
        name = printer_name or self.resolve_printer_name()
        if not name:
            return False, "Aucune imprimante selectionnee"
        try:
            handle = win32print.OpenPrinter(name)
            try:
                info = win32print.GetPrinter(handle, 2)
            finally:
                win32print.ClosePrinter(handle)
        except Exception as exc:
            return False, f"Imprimante introuvable ({exc})"
        status = info.get("Status", 0)
        flags = [
            (0x00000080, "Hors ligne"),
            (0x00000010, "Plus de papier"),
            (0x00000040, "Bourrage papier"),
            (0x00000002, "Erreur"),
            (0x00400000, "Porte ouverte"),
            (0x00000001, "En pause"),
            (0x00000800, "Sans papier"),
        ]
        problems = [label for bit, label in flags if status & bit]
        if problems:
            return False, " / ".join(problems)
        return True, "Prete"

    def _escpos_raster(self, path):
        """Convertit une image (logo) en raster ESC/POS (GS v 0). Requiert Pillow.
        Retourne b'' si indisponible ou en cas d'erreur (jamais bloquant)."""
        if Image is None or not path:
            return b""
        try:
            img = Image.open(path).convert("L")
            max_w = 384 if int(self.config.get("paper_columns", 32)) <= 32 else 576
            if img.width > max_w:
                img = img.resize((max_w, int(img.height * max_w / img.width)))
            img = img.point(lambda p: 0 if p < 128 else 255, "1")
            w, h = img.width, img.height
            bytes_per_row = (w + 7) // 8
            data = bytearray()
            px = img.load()
            for y in range(h):
                for xb in range(bytes_per_row):
                    byte = 0
                    for bit in range(8):
                        x = xb * 8 + bit
                        if x < w and px[x, y] == 0:
                            byte |= 0x80 >> bit
                    data.append(byte)
            header = GS + b"v0\x00" + bytes([bytes_per_row & 0xFF, (bytes_per_row >> 8) & 0xFF, h & 0xFF, (h >> 8) & 0xFF])
            return ALIGN_CENTER + header + bytes(data) + ALIGN_LEFT + FEED
        except Exception:
            return b""

    def _header(self):
        """En-tete commun : logo optionnel + SpeedZ + nom resto + lignes custom."""
        out = bytearray()
        out += self._prelude()
        out += self._escpos_raster(self.config.get("logo_path"))
        out += ALIGN_CENTER + BOLD_ON + SIZE_DOUBLE
        out += self._txt("SpeedZ") + FEED
        out += SIZE_NORMAL
        out += self._txt(self.restaurant_name) + FEED
        for line in self.config.get("header_lines", []) or []:
            out += self._txt(str(line)) + FEED
        out += BOLD_OFF + ALIGN_LEFT
        return out

    def _footer(self):
        out = bytearray()
        for line in self.config.get("footer_lines", []) or []:
            out += ALIGN_CENTER + self._txt(str(line)) + FEED
        out += ALIGN_LEFT
        out += FEED * int(self.config.get("feed_lines", 4))
        if self.config.get("auto_cut", True):
            out += CUT
        return out

    def _order_meta(self, order):
        out = bytearray()
        out += BOLD_ON + self._txt(f"Commande #{str(order.get('id', ''))[-6:].upper()}") + BOLD_OFF + FEED
        out += self._txt(f"Canal   : {order.get('channel', 'DELIVERY')}") + FEED
        dest = order.get("tableLabel") or order.get("address") or "-"
        out += self._txt(f"Adr/Tbl : {dest}") + FEED
        return out

    # Ticket cuisine : gros caracteres, articles + options, SANS prix.
    def build_kitchen_ticket(self, order):
        out = bytearray()
        out += self._header()
        out += self._line(self.config) + FEED
        out += ALIGN_CENTER + BOLD_ON + SIZE_DOUBLE + self._txt("CUISINE") + SIZE_NORMAL + BOLD_OFF + ALIGN_LEFT + FEED
        out += self._order_meta(order)
        out += self._line(self.config) + FEED
        for item in order.get("items", []):
            qty = item.get("quantity", 1)
            name = item.get("name", "Article")
            out += BOLD_ON + SIZE_DOUBLE + self._txt(f"{qty} x {name}") + SIZE_NORMAL + BOLD_OFF + FEED
            for option in item.get("selectedOptions", []):
                out += self._txt(f"  + {option.get('choiceName')}") + FEED
            if item.get("specialInstructions"):
                out += self._txt(f"  Note: {item['specialInstructions']}") + FEED
        if order.get("notes"):
            out += self._line(self.config) + FEED
            out += self._txt(f"Note: {order.get('notes')}") + FEED
        out += self._footer()
        return bytes(out)

    # Recu client : detail + total + paiement.
    def build_receipt_ticket(self, order):
        out = bytearray()
        out += self._header()
        out += self._line(self.config) + FEED
        out += self._order_meta(order)
        out += self._txt(f"Client  : {order.get('customerName') or '-'}") + FEED
        out += self._txt(f"Tel     : {order.get('customerPhone') or '-'}") + FEED
        out += self._line(self.config) + FEED
        for item in order.get("items", []):
            qty = item.get("quantity", 1)
            name = item.get("name", "Article")
            out += BOLD_ON + self._txt(f"{qty} x {name}") + BOLD_OFF + FEED
            for option in item.get("selectedOptions", []):
                out += self._txt(f"  + {option.get('choiceName')}") + FEED
            if item.get("specialInstructions"):
                out += self._txt(f"  Note: {item['specialInstructions']}") + FEED
        out += self._line(self.config) + FEED
        out += ALIGN_CENTER + BOLD_ON + SIZE_DOUBLE
        out += self._txt(f"TOTAL: {float(order.get('total', 0)):.2f} DA") + FEED
        out += SIZE_NORMAL + BOLD_OFF
        out += self._txt(f"Paiement: {order.get('paymentMethod', 'Cash')}") + FEED
        out += ALIGN_LEFT
        out += self._footer()
        return bytes(out)

    def build_ticket(self, order):
        # Retro-compat : ticket combine (detail + total).
        return self.build_receipt_ticket(order)

    # Retourne les tickets a imprimer sous forme (octets, role). Le role sert au
    # routage vers l'imprimante cuisine ou comptoir en mode double imprimante.
    def tickets_for_order(self, order):
        mode = self.config.get("print_mode", "combined")
        if mode == "kitchen_only":
            return [(self.build_kitchen_ticket(order), "kitchen")]
        if mode == "kitchen_and_receipt":
            return [
                (self.build_kitchen_ticket(order), "kitchen"),
                (self.build_receipt_ticket(order), "receipt"),
            ]
        return [(self.build_receipt_ticket(order), "receipt")]

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

    def build_qr_ticket(self, url, subtitle="Scannez pour commander"):
        out = bytearray()
        out += self._header()
        out += FEED
        out += ALIGN_CENTER + BOLD_ON + self._txt(subtitle) + BOLD_OFF + FEED + FEED
        out += self._escpos_qr(url)
        out += FEED
        out += self._txt(url) + FEED
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

    def print_table_qr(self, label, url):
        ticket = self.build_qr_ticket(url, subtitle=f"TABLE {label}")
        ok = self.send_to_printer(ticket)
        if ok:
            self._notify(f"QR table {label} imprime")
        return ok

    def send_to_printer(self, data_bytes, role=None):
        """Envoie les octets ESC/POS en RAW a l'imprimante (routee selon le role).
        Retourne True si OK."""
        printer_name = self.resolve_printer_name(role)
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
        tickets = self.tickets_for_order(order)
        for attempt in range(1, attempts + 1):
            try:
                if all(self.send_to_printer(data, role) for data, role in tickets):
                    return True
            except Exception as exc:
                logging.warning("Echec impression (essai %s/%s): %s", attempt, attempts, exc)
                time.sleep(2)
        return False

    def reprint_order(self, order):
        """Reimpression manuelle d'une commande (ignore l'anti-doublon)."""
        return self.print_with_retry(order)

    # ── Boucle principale ────────────────────────────────────────────────────
    def _process_orders(self):
        """Recupere et imprime les commandes. Isole du heartbeat : un heartbeat
        en echec ne doit jamais empecher l'impression."""
        orders = self.fetch_orders()
        # Anti-doublon : ignore ce qui a deja ete imprime+accuse cette session
        # (evite un 2e ticket si l'accuse precedent a echoue cote reseau).
        fresh = [o for o in orders if o.get("id") not in self.printed_ids]
        if fresh:
            self.alert_new_order(len(fresh))
        for order in fresh:
            oid = order.get("id")
            # Historise pour la reimpression manuelle (evite les doublons de liste).
            if not any(o.get("id") == oid for o in self.recent_orders):
                self.recent_orders.appendleft(order)
            if self.print_with_retry(order):
                # Marque imprime localement AVANT l'accuse : meme si l'accuse
                # echoue, on ne reimprimera pas dans cette session.
                self.printed_ids.add(oid)
                try:
                    self.acknowledge_printed(oid)
                except Exception as exc:
                    logging.warning("Accuse d'impression differe (#%s): %s", str(oid)[-6:], exc)
                self._notify(f"Commande #{str(oid)[-6:].upper()} imprimee")
            else:
                self._notify(
                    f"ECHEC impression commande #{str(oid)[-6:].upper()} - sera reessayee"
                )

    # ── Verification de version (auto-update) ────────────────────────────────
    def check_update(self):
        """Compare la version locale a celle publiee. Retourne un dict si une
        mise a jour est disponible, sinon None. Best-effort (jamais bloquant)."""
        try:
            resp = requests.get(f"{self.base_url}/api/printer-agent/version", timeout=8)
            resp.raise_for_status()
            data = resp.json()
            latest = str(data.get("version", ""))
            if latest and self._version_tuple(latest) > self._version_tuple(AGENT_VERSION):
                self._notify(f"Mise a jour disponible : v{latest} (vous avez v{AGENT_VERSION})")
                return {"version": latest, "url": data.get("url"), "notes": data.get("notes")}
        except Exception:
            pass
        return None

    @staticmethod
    def _version_tuple(value):
        parts = []
        for chunk in str(value).split("."):
            try:
                parts.append(int(chunk))
            except ValueError:
                parts.append(0)
        return tuple(parts)

    # ── WebSocket temps reel (optionnel) ─────────────────────────────────────
    def start_realtime(self):
        """Ecoute les evenements serveur et reveille la boucle de poll a chaque
        nouvelle commande -> reception quasi instantanee. Best-effort : si le
        paquet websocket-client manque ou que la connexion tombe, le polling
        classique prend le relais."""
        if not self.config.get("use_websocket", True) or websocket is None:
            return
        ws_url = self.base_url.replace("https://", "wss://").replace("http://", "ws://") + "/ws?role=printer"

        def on_message(_ws, message):
            try:
                data = json.loads(message)
            except Exception:
                return
            if str(data.get("type", "")).startswith("order/"):
                # Reveille immediatement la boucle de poll.
                self.wake.set()

        def run():
            while True:
                try:
                    app = websocket.WebSocketApp(ws_url, on_message=on_message)
                    self._ws_app = app
                    app.run_forever(ping_interval=30, ping_timeout=10)
                except Exception:
                    pass
                time.sleep(5)  # reconnexion apres coupure

        threading.Thread(target=run, daemon=True).start()

    def loop(self):
        max_backoff = int(self.config.get("max_backoff_seconds", 60))
        poll = self.config.get("poll_interval_seconds", 5)
        backoff = poll
        connected = False
        self.check_update()
        self.start_realtime()

        while True:
            # (Re)connexion : re-authentifie tant que ce n'est pas etabli.
            if not connected:
                try:
                    self.authenticate()
                    connected = True
                    backoff = poll
                except Exception as exc:
                    self._notify(f"Connexion impossible, nouvel essai dans {backoff}s")
                    logging.warning("Echec authentification: %s", exc)
                    time.sleep(backoff)
                    backoff = min(backoff * 2, max_backoff)
                    continue

            # Heartbeat (best-effort, isole : ne bloque jamais l'impression).
            try:
                self.heartbeat()
            except Exception as exc:
                logging.warning("Heartbeat en echec (ignore): %s", exc)

            # Commandes (isole aussi ; en cas d'erreur reseau on backoff et on
            # tentera une re-auth si ca persiste).
            try:
                self._process_orders()
                backoff = poll
                # Attend jusqu'au prochain poll OU un reveil WebSocket immediat.
                if self.wake.wait(timeout=poll):
                    self.wake.clear()
            except Exception as exc:
                logging.exception("Erreur de polling: %s", exc)
                self._notify(f"Reseau instable, pause {backoff}s")
                time.sleep(backoff)
                backoff = min(backoff * 2, max_backoff)
                # Si l'erreur persiste longtemps, on force une re-authentification.
                if backoff >= max_backoff:
                    connected = False


def main():
    setup_logging()
    config = load_config()
    agent = PrinterAgent(config)
    agent.loop()


if __name__ == "__main__":
    main()
