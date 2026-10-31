#!/usr/bin/env python3
"""Callback биллинга VK Play: GET uid,sum,tid,merchant_param,sign → {status:ok}.

Секрет: кабинет → Системные свойства → «Секрет для API игр».
Проверки по документации: подпись, уникальность tid, сумма, хранение tid.
"""
from __future__ import annotations

import hashlib
import json
import os
import sqlite3
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

SECRET = os.environ.get("VKPLAY_SECRET", "")
DB = Path(os.environ.get("VKPLAY_BILLING_DB", Path(__file__).with_name("purchases.sqlite")))
PRICES = {
    "gems_100": {"RUB": 99, "USD": 1.26, "EUR": 1.12},
    "gems_550": {"RUB": 499, "USD": 6.30, "EUR": 5.61},
    "gems_1800": {"RUB": 1490, "USD": 18.90, "EUR": 16.83},
    "x2_forever": {"RUB": 649, "USD": 8.36, "EUR": 7.44},
    "no_ads": {"RUB": 329, "USD": 4.16, "EUR": 3.70},
}


def db():
    DB.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB)
    con.execute(
        "CREATE TABLE IF NOT EXISTS payments (tid TEXT PRIMARY KEY, uid TEXT, sum REAL, item_id TEXT, raw TEXT, created DATETIME DEFAULT CURRENT_TIMESTAMP)"
    )
    return con


def sign_of(params: dict) -> str:
    keys = sorted(k for k in params if k != "sign")
    raw = "".join(f"{k}={params[k]}" for k in keys) + SECRET
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


def price_ok(item_id: str, currency: str, amount) -> bool:
    table = PRICES.get(item_id)
    if not table:
        return False
    expected = table.get((currency or "RUB").upper())
    if expected is None:
        return False
    try:
        return abs(float(amount) - float(expected)) < 0.02
    except (TypeError, ValueError):
        return False


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print("[vkplay-billing]", self.address_string(), fmt % args)

    def _send(self, code: int, payload: dict):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        q = {k: v[0] for k, v in parse_qs(urlparse(self.path).query, keep_blank_values=True).items()}
        if not SECRET:
            return self._send(200, {"status": "error", "errcode": 5001, "errmsg": "secret not configured"})
        need = ("uid", "sum", "tid", "merchant_param", "sign")
        if any(k not in q for k in need):
            return self._send(200, {"status": "error", "errcode": 2000, "errmsg": "Parameter error"})
        if sign_of(q) != q["sign"]:
            return self._send(200, {"status": "error", "errcode": 5001, "errmsg": "Incorrect signature"})

        try:
            merchant = json.loads(q["merchant_param"] or "{}")
        except json.JSONDecodeError:
            merchant = {}
        item_id = str(merchant.get("item_id") or merchant.get("sku") or "")
        currency = str(merchant.get("currency") or "RUB")
        if item_id and not price_ok(item_id, currency, merchant.get("amount", q["sum"])):
            return self._send(200, {"status": "error", "errcode": 2000, "errmsg": "sum mismatch"})

        con = db()
        cur = con.execute("SELECT tid FROM payments WHERE tid=?", (q["tid"],))
        if cur.fetchone():
            con.close()
            return self._send(200, {"status": "ok"})
        con.execute(
            "INSERT INTO payments (tid, uid, sum, item_id, raw) VALUES (?,?,?,?,?)",
            (q["tid"], q["uid"], float(q["sum"]), item_id, json.dumps(q, ensure_ascii=False)),
        )
        con.commit()
        con.close()
        return self._send(200, {"status": "ok"})


if __name__ == "__main__":
    host = os.environ.get("VKPLAY_BIND", "0.0.0.0")
    port = int(os.environ.get("PORT", "8788"))
    print(f"VK Play billing callback on http://{host}:{port}/api/billing/")
    ThreadingHTTPServer((host, port), Handler).serve_forever()
