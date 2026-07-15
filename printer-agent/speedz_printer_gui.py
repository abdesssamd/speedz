"""
SpeedZ - Agent d'impression (interface graphique)
────────────────────────────────────────────────────────────────────────────
Pour le restaurateur : il double-clique, colle son token (son "mot de passe"
recu par email) UNE SEULE FOIS, clique "Se connecter", et l'impression
automatique demarre. Les fois suivantes, la connexion se fait toute seule.

Aucune dependance supplementaire : Tkinter est inclus dans Python.
"""

import json
import queue
import threading
from pathlib import Path

import tkinter as tk
from tkinter import messagebox, scrolledtext, ttk

from printer_agent import CONFIG_PATH, PrinterAgent, setup_logging

try:
    import win32print
except ImportError:  # pragma: no cover
    win32print = None


DEFAULT_SERVER = "https://speedz.microtechdz13.com"
AUTO_PRINTER_LABEL = "Imprimante par defaut de Windows"


def list_printers():
    if win32print is None:
        return []
    try:
        flags = win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS
        return [entry[2] for entry in win32print.EnumPrinters(flags)]
    except Exception:
        return []


class PrinterGUI:
    def __init__(self, root):
        self.root = root
        self.events = queue.Queue()
        self.worker = None
        self.running = False
        self.agent = None
        self.account_win = None
        self.account_menu_url = None

        root.title("SpeedZ - Agent d'impression")
        root.geometry("560x520")
        root.configure(bg="#0F0F12")
        root.minsize(520, 480)

        self._build_ui()
        self._load_saved()
        self.root.after(200, self._drain_events)

    # ── UI ───────────────────────────────────────────────────────────────────
    def _build_ui(self):
        wrap = tk.Frame(self.root, bg="#0F0F12", padx=22, pady=20)
        wrap.pack(fill="both", expand=True)

        tk.Label(wrap, text="SpeedZ", font=("Segoe UI", 22, "bold"), fg="#FF7622", bg="#0F0F12").pack(anchor="w")
        tk.Label(wrap, text="Agent d'impression automatique", font=("Segoe UI", 11), fg="#9CA3AF", bg="#0F0F12").pack(anchor="w", pady=(0, 16))

        # Token (mot de passe)
        tk.Label(wrap, text="Votre token (recu par email)", font=("Segoe UI", 10, "bold"), fg="#F3F4F6", bg="#0F0F12").pack(anchor="w")
        self.token_var = tk.StringVar()
        self.token_entry = tk.Entry(wrap, textvariable=self.token_var, font=("Consolas", 11), show="*", bg="#1A1A20", fg="#FFFFFF", insertbackground="#FFFFFF", relief="flat")
        self.token_entry.pack(fill="x", ipady=8, pady=(4, 2))
        self.show_var = tk.BooleanVar(value=False)
        tk.Checkbutton(wrap, text="Afficher le token", variable=self.show_var, command=self._toggle_token,
                       fg="#9CA3AF", bg="#0F0F12", selectcolor="#1A1A20", activebackground="#0F0F12", activeforeground="#F3F4F6").pack(anchor="w", pady=(0, 12))

        # Imprimante
        tk.Label(wrap, text="Imprimante", font=("Segoe UI", 10, "bold"), fg="#F3F4F6", bg="#0F0F12").pack(anchor="w")
        self.printer_var = tk.StringVar(value=AUTO_PRINTER_LABEL)
        printers = [AUTO_PRINTER_LABEL] + list_printers()
        self.printer_combo = ttk.Combobox(wrap, textvariable=self.printer_var, values=printers, state="readonly")
        self.printer_combo.pack(fill="x", pady=(4, 16))

        # Bouton connexion
        self.connect_btn = tk.Button(wrap, text="Se connecter et demarrer", font=("Segoe UI", 12, "bold"),
                                     bg="#FF7622", fg="#FFFFFF", activebackground="#F36E26", activeforeground="#FFFFFF",
                                     relief="flat", cursor="hand2", command=self._on_connect)
        self.connect_btn.pack(fill="x", ipady=10, pady=(0, 6))

        actions = tk.Frame(wrap, bg="#0F0F12")
        actions.pack(fill="x", pady=(0, 12))
        self.account_btn = tk.Button(actions, text="📊 Mon compte", font=("Segoe UI", 9, "bold"),
                                      bg="#232329", fg="#F3F4F6", activebackground="#2E2E36", activeforeground="#FFFFFF",
                                      relief="flat", cursor="hand2", state="disabled", command=self._on_show_account)
        self.account_btn.pack(side="left")
        self.qr_btn = tk.Button(actions, text="🔳 Imprimer le QR", font=("Segoe UI", 9, "bold"),
                                bg="#232329", fg="#F3F4F6", activebackground="#2E2E36", activeforeground="#FFFFFF",
                                relief="flat", cursor="hand2", state="disabled", command=self._on_print_qr)
        self.qr_btn.pack(side="left", padx=(8, 0))
        self.disconnect_btn = tk.Button(actions, text="Changer de compte", font=("Segoe UI", 9),
                                        bg="#1A1A20", fg="#9CA3AF", activebackground="#232329", activeforeground="#F3F4F6",
                                        relief="flat", cursor="hand2", command=self._on_disconnect)
        self.disconnect_btn.pack(side="right")

        # Statut
        self.status_var = tk.StringVar(value="Non connecte")
        self.status_label = tk.Label(wrap, textvariable=self.status_var, font=("Segoe UI", 11, "bold"), fg="#9CA3AF", bg="#0F0F12")
        self.status_label.pack(anchor="w")

        # Journal
        self.log = scrolledtext.ScrolledText(wrap, height=8, font=("Consolas", 9), bg="#151519", fg="#D1D5DB", relief="flat", state="disabled")
        self.log.pack(fill="both", expand=True, pady=(8, 0))

    def _toggle_token(self):
        self.token_entry.config(show="" if self.show_var.get() else "*")

    def _log(self, message):
        self.log.config(state="normal")
        self.log.insert("end", message + "\n")
        self.log.see("end")
        self.log.config(state="disabled")

    # ── Config ───────────────────────────────────────────────────────────────
    def _load_saved(self):
        if not CONFIG_PATH.exists():
            return
        try:
            cfg = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
        except Exception:
            return
        self.token_var.set(cfg.get("api_token", ""))
        printer = cfg.get("printer_name") or ""
        self.printer_var.set(printer if printer else AUTO_PRINTER_LABEL)
        # Connexion automatique si un token est deja enregistre.
        if cfg.get("api_token"):
            self._log("Token enregistre trouve - connexion automatique...")
            self.root.after(400, self._on_connect)

    def _build_config(self):
        existing = {}
        if CONFIG_PATH.exists():
            try:
                existing = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
            except Exception:
                existing = {}
        printer = self.printer_var.get()
        existing.update({
            "api_base_url": existing.get("api_base_url") or DEFAULT_SERVER,
            "api_token": self.token_var.get().strip(),
            "printer_name": "" if printer == AUTO_PRINTER_LABEL else printer,
        })
        # Valeurs par defaut si absentes.
        existing.setdefault("paper_columns", 32)
        existing.setdefault("poll_interval_seconds", 5)
        existing.setdefault("heartbeat_interval_seconds", 30)
        existing.setdefault("sound_enabled", True)
        existing.setdefault("notifications_enabled", True)
        existing.setdefault("auto_cut", True)
        existing.setdefault("feed_lines", 4)
        existing.setdefault("print_retries", 3)
        return existing

    # ── Connexion ────────────────────────────────────────────────────────────
    def _on_connect(self):
        if self.running:
            return
        token = self.token_var.get().strip()
        if not token:
            messagebox.showwarning("Token manquant", "Collez d'abord votre token recu par email.")
            return

        config = self._build_config()
        try:
            CONFIG_PATH.write_text(json.dumps(config, indent=2), encoding="utf-8")
        except Exception as exc:
            messagebox.showerror("Erreur", f"Impossible d'enregistrer la configuration : {exc}")
            return

        self.running = True
        self.connect_btn.config(state="disabled", text="Connexion...")
        self.status_var.set("Connexion en cours...")
        self.status_label.config(fg="#F59E0B")

        self.worker = threading.Thread(target=self._run_agent, args=(config,), daemon=True)
        self.worker.start()

    def _run_agent(self, config):
        agent = PrinterAgent(config, status_callback=lambda msg: self.events.put(msg))
        self.agent = agent
        try:
            agent.loop()  # authentifie puis boucle indefiniment
        except Exception as exc:
            self.events.put(f"ERREUR: {exc}")
            self.events.put("__DISCONNECTED__")

    def _on_print_qr(self):
        if not self.agent or not self.running:
            messagebox.showinfo("QR code", "Connectez-vous d'abord.")
            return
        self._log("Impression du QR code du magasin...")
        threading.Thread(target=self._print_qr_worker, daemon=True).start()

    def _print_qr_worker(self):
        try:
            data = self.agent.fetch_qr()
            self.agent.print_qr_code(data["url"])
        except Exception as exc:
            self.events.put(f"ERREUR QR: {exc}")

    # ── Mon compte / Facturation ─────────────────────────────────────────────
    def _on_show_account(self):
        if not self.agent or not self.running:
            messagebox.showinfo("Mon compte", "Connectez-vous d'abord.")
            return
        # Fenetre unique : reutilise si deja ouverte.
        if self.account_win and self.account_win.winfo_exists():
            self.account_win.lift()
        else:
            self._build_account_window()
        self.account_status_var.set("Chargement...")
        threading.Thread(target=self._account_worker, daemon=True).start()

    def _account_worker(self):
        try:
            data = self.agent.fetch_billing()
            self.events.put(("account", data))
        except Exception as exc:
            self.events.put(("account_error", str(exc)))

    def _build_account_window(self):
        win = tk.Toplevel(self.root)
        self.account_win = win
        win.title("SpeedZ - Mon compte")
        win.geometry("440x680")
        win.configure(bg="#0F0F12")
        win.minsize(400, 560)

        pad = tk.Frame(win, bg="#0F0F12", padx=20, pady=18)
        pad.pack(fill="both", expand=True)

        tk.Label(pad, text="Mon compte", font=("Segoe UI", 18, "bold"), fg="#FF7622", bg="#0F0F12").pack(anchor="w")
        self.account_status_var = tk.StringVar(value="Chargement...")
        tk.Label(pad, textvariable=self.account_status_var, font=("Segoe UI", 9), fg="#9CA3AF", bg="#0F0F12").pack(anchor="w", pady=(0, 12))

        # Zone d'affichage des chiffres.
        self.account_body = tk.Frame(pad, bg="#0F0F12")
        self.account_body.pack(fill="both", expand=True)

        # Actions bas de fenetre.
        btns = tk.Frame(pad, bg="#0F0F12")
        btns.pack(fill="x", pady=(12, 0))
        tk.Button(btns, text="🔗 Copier le lien du menu", font=("Segoe UI", 9, "bold"),
                  bg="#FF7622", fg="#FFFFFF", activebackground="#F36E26", activeforeground="#FFFFFF",
                  relief="flat", cursor="hand2", command=self._copy_menu_link).pack(side="left")
        tk.Button(btns, text="Actualiser", font=("Segoe UI", 9),
                  bg="#232329", fg="#F3F4F6", activebackground="#2E2E36", activeforeground="#FFFFFF",
                  relief="flat", cursor="hand2", command=self._on_show_account).pack(side="right")

    def _render_account(self, data):
        if not (self.account_win and self.account_win.winfo_exists()):
            return
        for child in self.account_body.winfo_children():
            child.destroy()

        self.account_menu_url = data.get("menuShareUrl")
        self.account_status_var.set(data.get("restaurantName") or "")

        def row(label, value, big=False, color="#F3F4F6"):
            line = tk.Frame(self.account_body, bg="#151519")
            line.pack(fill="x", pady=3, ipady=6, ipadx=10)
            tk.Label(line, text=label, font=("Segoe UI", 10), fg="#9CA3AF", bg="#151519").pack(side="left")
            tk.Label(line, text=value, font=("Segoe UI", 14 if big else 11, "bold"), fg=color, bg="#151519").pack(side="right")

        def money(v):
            try:
                return f"{float(v):,.2f} Da".replace(",", " ")
            except Exception:
                return f"{v} Da"

        row("Plan", data.get("planLabel", "—"))
        row("Commandes (livrees / total)", f"{data.get('deliveredCount', 0)} / {data.get('ordersCount', 0)}")
        row("Chiffre d'affaires livre", money(data.get("grossSales", 0)))
        row("A payer a la plateforme", money(data.get("amountDue", 0)), big=True, color="#FDBA74")
        row("Deja verse", money(data.get("totalPaid", 0)), color="#22C55E")
        balance = data.get("balance", 0)
        row("Solde restant", money(balance), big=True, color="#EF4444" if (balance or 0) > 0 else "#22C55E")

        url = data.get("menuShareUrl")
        if url:
            tk.Label(self.account_body, text="Lien du menu a partager :", font=("Segoe UI", 9, "bold"),
                     fg="#F3F4F6", bg="#0F0F12").pack(anchor="w", pady=(12, 2))
            link = tk.Entry(self.account_body, font=("Consolas", 9), bg="#1A1A20", fg="#93C5FD",
                            relief="flat", readonlybackground="#1A1A20")
            link.insert(0, url)
            link.config(state="readonly")
            link.pack(fill="x", ipady=6)

        # Detail des dernieres commandes.
        orders = data.get("recentOrders") or []
        tk.Label(self.account_body, text=f"Dernieres commandes ({len(orders)})", font=("Segoe UI", 9, "bold"),
                 fg="#F3F4F6", bg="#0F0F12").pack(anchor="w", pady=(14, 2))
        if not orders:
            tk.Label(self.account_body, text="Aucune commande pour le moment.", font=("Segoe UI", 9),
                     fg="#9CA3AF", bg="#0F0F12").pack(anchor="w")
        else:
            listing = scrolledtext.ScrolledText(self.account_body, height=9, font=("Consolas", 8),
                                                bg="#151519", fg="#D1D5DB", relief="flat")
            listing.pack(fill="both", expand=True, pady=(2, 0))
            for order in orders:
                oid = str(order.get("id", ""))[-6:]
                status = order.get("status", "")
                total = money(order.get("total", 0))
                created = str(order.get("createdAt", "")).replace("T", " ")[:16]
                listing.insert("end", f"#{oid}  {status:<12} {total:>12}   {created}\n")
            listing.config(state="disabled")

    def _copy_menu_link(self):
        if not self.account_menu_url:
            messagebox.showinfo("Lien du menu", "Aucun lien de menu disponible pour ce compte.")
            return
        self.root.clipboard_clear()
        self.root.clipboard_append(self.account_menu_url)
        self.account_status_var.set("Lien copie dans le presse-papiers ✓")

    def _on_disconnect(self):
        # Efface le token enregistre ; l'agent s'arrete au prochain lancement.
        if CONFIG_PATH.exists():
            try:
                cfg = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
                cfg["api_token"] = ""
                CONFIG_PATH.write_text(json.dumps(cfg, indent=2), encoding="utf-8")
            except Exception:
                pass
        self.token_var.set("")
        messagebox.showinfo("Deconnexion", "Token efface. Fermez et rouvrez l'application pour changer de compte.")

    # ── Boucle d'evenements (thread-safe) ────────────────────────────────────
    def _drain_events(self):
        try:
            while True:
                msg = self.events.get_nowait()
                # Evenements structures (tuple) : facturation.
                if isinstance(msg, tuple):
                    kind, payload = msg
                    if kind == "account":
                        self._render_account(payload)
                    elif kind == "account_error":
                        self._log(f"ERREUR compte: {payload}")
                        if self.account_win and self.account_win.winfo_exists():
                            self.account_status_var.set(f"Erreur : {payload}")
                    continue
                if msg == "__DISCONNECTED__":
                    self.running = False
                    self.connect_btn.config(state="normal", text="Se connecter et demarrer")
                    self.qr_btn.config(state="disabled")
                    self.account_btn.config(state="disabled")
                    self.status_var.set("Deconnecte - verifiez le token")
                    self.status_label.config(fg="#EF4444")
                    continue
                if msg.startswith("Connecte au restaurant"):
                    self.status_var.set("EN LIGNE - " + msg.split(":", 1)[-1].strip())
                    self.status_label.config(fg="#22C55E")
                    self.connect_btn.config(text="Impression active")
                    self.qr_btn.config(state="normal")
                    self.account_btn.config(state="normal")
                self._log(msg)
        except queue.Empty:
            pass
        self.root.after(200, self._drain_events)


def main():
    setup_logging()
    root = tk.Tk()
    PrinterGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()
