#!/usr/bin/env python3
"""Проверка callback биллинга VK Play по официальному алгоритму подписи."""
import hashlib
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from urllib.parse import urlencode

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "vkplay"))

os.environ.setdefault("VKPLAY_SECRET", "supersecret")
os.environ["VKPLAY_BILLING_DB"] = str(Path(tempfile.gettempdir()) / "vkplay-billing-test.sqlite")

from callback import handle_billing, sign_of  # noqa: E402


class SignTests(unittest.TestCase):
    def test_official_example_concatenation(self):
        params = {
            "merchant_param": "{}",
            "sum": "120.5",
            "tid": "51aa3c7d-a32b-45ec-973e-10e6e9f70851",
            "uid": "596343600",
        }
        raw = "merchant_param={}sum=120.5tid=51aa3c7d-a32b-45ec-973e-10e6e9f70851uid=596343600supersecret"
        self.assertEqual(sign_of(params, "supersecret"), hashlib.md5(raw.encode()).hexdigest())

    def test_ok_and_replay_tid(self):
        Path(os.environ["VKPLAY_BILLING_DB"]).unlink(missing_ok=True)
        merchant = json.dumps({"amount": 99, "currency": "RUB", "item_id": "gems_100"}, separators=(",", ":"))
        q = {
            "uid": "1",
            "sum": "99",
            "tid": "tid-unique-1",
            "merchant_param": merchant,
        }
        q["sign"] = sign_of(q, "supersecret")
        code, body = handle_billing(q, "supersecret")
        self.assertEqual(code, 200)
        self.assertEqual(body, {"status": "ok"})
        code2, body2 = handle_billing(q, "supersecret")
        self.assertEqual(body2, {"status": "ok"})

    def test_bad_sign(self):
        q = {"uid": "1", "sum": "99", "tid": "x", "merchant_param": "{}", "sign": "deadbeef"}
        code, body = handle_billing(q, "supersecret")
        self.assertEqual(body["status"], "error")
        self.assertEqual(body["errcode"], 5001)

    def test_missing_param(self):
        code, body = handle_billing({"uid": "1"}, "supersecret")
        self.assertEqual(body["errcode"], 2000)

    def test_price_mismatch(self):
        merchant = json.dumps({"amount": 1, "currency": "RUB", "item_id": "gems_100"})
        q = {"uid": "1", "sum": "1", "tid": "bad-price", "merchant_param": merchant}
        q["sign"] = sign_of(q, "supersecret")
        code, body = handle_billing(q, "supersecret")
        self.assertEqual(body["errcode"], 2000)


if __name__ == "__main__":
    unittest.main()
