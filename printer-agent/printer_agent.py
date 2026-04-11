import json
import logging
import os
import sys
import time
from pathlib import Path

import requests

try:
    import win32api
    import win32print
except ImportError:  # pragma: no cover
    win32api = None
    win32print = None


BASE_DIR = Path(__file__).resolve().parent
CONFIG_PATH = Path(os.environ.get("FOODDELYVRY_PRINTER_CONFIG", BASE_DIR / "config.json"))
LOG_PATH = BASE_DIR / "printer-agent.log"


def load_config():
    with open(CONFIG_PATH, "r", encoding="utf-8") as handle:
        return json.load(handle)


def setup_logging():
    logging.basicConfig(
        filename=LOG_PATH,
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )


class PrinterAgent:
    def __init__(self, config):
        self.config = config
        self.session = requests.Session()
        self.headers = {"x-api-token": config["api_token"]}
        self.base_url = config["api_base_url"].rstrip("/")
        self.last_heartbeat = 0.0

    def authenticate(self):
        response = self.session.post(
            f"{self.base_url}/api/restaurant/printer/auth",
            headers=self.headers,
            timeout=15,
        )
        response.raise_for_status()
        payload = response.json()
        logging.info("Authenticated for restaurant %s", payload["restaurant"]["name"])
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

    def format_ticket(self, order):
        lines = [
            "FOODDELYVRY",
            f"Commande: {order['id']}",
            f"Canal: {order.get('channel', 'DELIVERY')}",
            f"Client: {order.get('customerName') or '-'}",
            f"Telephone: {order.get('customerPhone') or '-'}",
            f"Adresse/Table: {order.get('tableLabel') or order.get('address')}",
            "-" * 32,
        ]
        for item in order.get("items", []):
            lines.append(f"{item.get('quantity', 1)} x {item.get('name', 'Article')}")
            for option in item.get("selectedOptions", []):
                lines.append(f"  + {option.get('choiceName')}")
            if item.get("specialInstructions"):
                lines.append(f"  Note: {item['specialInstructions']}")
        lines.extend(
            [
                "-" * 32,
                f"Total: {order.get('total', 0):.2f} EUR",
                f"Paiement: {order.get('paymentMethod', 'Cash')}",
                "",
                "",
            ]
        )
        return "\n".join(lines)

    def send_to_printer(self, content):
        printer_name = self.config.get("printer_name")
        if win32print and win32api and printer_name:
            temp_path = BASE_DIR / "ticket.txt"
            temp_path.write_text(content, encoding="utf-8")
            win32api.ShellExecute(
                0,
                "printto",
                str(temp_path),
                f'"{printer_name}"',
                ".",
                0,
            )
        else:
            fallback_path = BASE_DIR / f"ticket-{int(time.time())}.txt"
            fallback_path.write_text(content, encoding="utf-8")
            logging.info("Ticket written to %s", fallback_path)

    def loop(self):
        self.authenticate()
        while True:
            try:
                self.heartbeat()
                for order in self.fetch_orders():
                    ticket = self.format_ticket(order)
                    self.send_to_printer(ticket)
                    self.acknowledge_printed(order["id"])
                    logging.info("Printed order %s", order["id"])
            except Exception as exc:  # pragma: no cover
                logging.exception("Polling error: %s", exc)
            time.sleep(self.config.get("poll_interval_seconds", 5))


def main():
    setup_logging()
    config = load_config()
    agent = PrinterAgent(config)
    agent.loop()


if __name__ == "__main__":
    main()
