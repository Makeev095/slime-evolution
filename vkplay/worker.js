/**
 * HTTPS callback биллинга VK Play (Cloudflare Worker).
 * Спека: https://documentation.vkplay.ru/f2p_vkp/f2pb_billing_vkp
 *
 * GET uid,sum,tid,merchant_param,sign → {status:ok}
 * Секрет: кабинет → Системные свойства → «Секрет для API игр» → wrangler secret put VKPLAY_SECRET
 *
 * SubtleCrypto не умеет MD5 — считаем его сами, как в callback.py.
 */
const PRICES = {
  gems_100: { RUB: 99, USD: 1.26, EUR: 1.12 },
  gems_550: { RUB: 499, USD: 6.3, EUR: 5.61 },
  gems_1800: { RUB: 1490, USD: 18.9, EUR: 16.83 },
  x2_forever: { RUB: 649, USD: 8.36, EUR: 7.44 },
  no_ads: { RUB: 329, USD: 4.16, EUR: 3.7 },
};

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...CORS },
  });
}

function corsOk() {
  return new Response(null, { status: 204, headers: CORS });
}

function uidOk(uid) {
  return /^\d{1,20}$/.test(String(uid || ""));
}

async function handleSave(request, env, url) {
  if (request.method === "GET") {
    const uid = url.searchParams.get("uid") || "";
    if (!uidOk(uid)) return json({ status: "error", errmsg: "uid" }, 400);
    if (!env.PURCHASES) return json({ status: "ok", save: null });
    const raw = await env.PURCHASES.get(`save:${uid}`);
    if (!raw) return json({ status: "ok", save: null });
    try {
      return json({ status: "ok", save: JSON.parse(raw) });
    } catch {
      return json({ status: "ok", save: null });
    }
  }
  if (request.method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ status: "error", errmsg: "json" }, 400);
    }
    const uid = String((body && body.uid) || "");
    const save = body && body.save;
    if (!uidOk(uid) || !save || typeof save !== "object") return json({ status: "error", errmsg: "uid" }, 400);
    const payload = JSON.stringify(save);
    if (payload.length > 80000) return json({ status: "error", errmsg: "too large" }, 400);
    if (env.PURCHASES) await env.PURCHASES.put(`save:${uid}`, payload);
    return json({ status: "ok" });
  }
  return json({ status: "error", errcode: 2000, errmsg: "GET/POST only" }, 405);
}

function md5(str) {
  function cmn(q, a, b, x, s, t) {
    a = (((a + q) | 0) + ((x + t) | 0)) | 0;
    return (((a << s) | (a >>> (32 - s))) + b) | 0;
  }
  function ff(a, b, c, d, x, s, t) {
    return cmn((b & c) | (~b & d), a, b, x, s, t);
  }
  function gg(a, b, c, d, x, s, t) {
    return cmn((b & d) | (c & ~d), a, b, x, s, t);
  }
  function hh(a, b, c, d, x, s, t) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }
  function ii(a, b, c, d, x, s, t) {
    return cmn(c ^ (b | ~d), a, b, x, s, t);
  }
  function bytes(s) {
    const out = [];
    for (let i = 0; i < s.length; i++) {
      let c = s.charCodeAt(i);
      if (c < 128) out.push(c);
      else if (c < 2048) out.push((c >> 6) | 192, (c & 63) | 128);
      else if (c >= 0xd800 && c <= 0xdbff) {
        c = 0x10000 + (((c & 0x3ff) << 10) | (s.charCodeAt(++i) & 0x3ff));
        out.push((c >> 18) | 240, ((c >> 12) & 63) | 128, ((c >> 6) & 63) | 128, (c & 63) | 128);
      } else out.push((c >> 12) | 224, ((c >> 6) & 63) | 128, (c & 63) | 128);
    }
    return out;
  }
  const msg = bytes(str);
  const len = msg.length;
  msg.push(0x80);
  while ((msg.length + 8) % 64 !== 0) msg.push(0);
  const bits = len * 8;
  for (let i = 0; i < 8; i++) msg.push((bits / Math.pow(2, i * 8)) & 0xff);

  let a = 1732584193,
    b = -271733879,
    c = -1732584194,
    d = 271733878;
  for (let i = 0; i < msg.length; i += 64) {
    const x = [];
    for (let j = 0; j < 16; j++) {
      x[j] =
        msg[i + j * 4] |
        (msg[i + j * 4 + 1] << 8) |
        (msg[i + j * 4 + 2] << 16) |
        (msg[i + j * 4 + 3] << 24);
    }
    const oa = a,
      ob = b,
      oc = c,
      od = d;
    a = ff(a, b, c, d, x[0], 7, -680876936);
    d = ff(d, a, b, c, x[1], 12, -389564586);
    c = ff(c, d, a, b, x[2], 17, 606105819);
    b = ff(b, c, d, a, x[3], 22, -1044525330);
    a = ff(a, b, c, d, x[4], 7, -176418897);
    d = ff(d, a, b, c, x[5], 12, 1200080426);
    c = ff(c, d, a, b, x[6], 17, -1473231341);
    b = ff(b, c, d, a, x[7], 22, -45705983);
    a = ff(a, b, c, d, x[8], 7, 1770035416);
    d = ff(d, a, b, c, x[9], 12, -1958414417);
    c = ff(c, d, a, b, x[10], 17, -42063);
    b = ff(b, c, d, a, x[11], 22, -1990404162);
    a = ff(a, b, c, d, x[12], 7, 1804603682);
    d = ff(d, a, b, c, x[13], 12, -40341101);
    c = ff(c, d, a, b, x[14], 17, -1502002290);
    b = ff(b, c, d, a, x[15], 22, 1236535329);
    a = gg(a, b, c, d, x[1], 5, -165796510);
    d = gg(d, a, b, c, x[6], 9, -1069501632);
    c = gg(c, d, a, b, x[11], 14, 643717713);
    b = gg(b, c, d, a, x[0], 20, -373897302);
    a = gg(a, b, c, d, x[5], 5, -701558691);
    d = gg(d, a, b, c, x[10], 9, 38016083);
    c = gg(c, d, a, b, x[15], 14, -660478335);
    b = gg(b, c, d, a, x[4], 20, -405537848);
    a = gg(a, b, c, d, x[9], 5, 568446438);
    d = gg(d, a, b, c, x[14], 9, -1019803690);
    c = gg(c, d, a, b, x[3], 14, -187363961);
    b = gg(b, c, d, a, x[8], 20, 1163531501);
    a = gg(a, b, c, d, x[13], 5, -1444681467);
    d = gg(d, a, b, c, x[2], 9, -51403784);
    c = gg(c, d, a, b, x[7], 14, 1735328473);
    b = gg(b, c, d, a, x[12], 20, -1926607734);
    a = hh(a, b, c, d, x[5], 4, -378558);
    d = hh(d, a, b, c, x[8], 11, -2022574463);
    c = hh(c, d, a, b, x[11], 16, 1839030562);
    b = hh(b, c, d, a, x[14], 23, -35309556);
    a = hh(a, b, c, d, x[1], 4, -1530992060);
    d = hh(d, a, b, c, x[4], 11, 1272893353);
    c = hh(c, d, a, b, x[7], 16, -155497632);
    b = hh(b, c, d, a, x[10], 23, -1094730640);
    a = hh(a, b, c, d, x[13], 4, 681279174);
    d = hh(d, a, b, c, x[0], 11, -358537222);
    c = hh(c, d, a, b, x[3], 16, -722521979);
    b = hh(b, c, d, a, x[6], 23, 76029189);
    a = hh(a, b, c, d, x[9], 4, -640364487);
    d = hh(d, a, b, c, x[12], 11, -421815835);
    c = hh(c, d, a, b, x[15], 16, 530742520);
    b = hh(b, c, d, a, x[2], 23, -995338651);
    a = ii(a, b, c, d, x[0], 6, -198630844);
    d = ii(d, a, b, c, x[7], 10, 1126891415);
    c = ii(c, d, a, b, x[14], 15, -1416354905);
    b = ii(b, c, d, a, x[5], 21, -57434055);
    a = ii(a, b, c, d, x[12], 6, 1700485571);
    d = ii(d, a, b, c, x[3], 10, -1894986606);
    c = ii(c, d, a, b, x[10], 15, -1051523);
    b = ii(b, c, d, a, x[1], 21, -2054922799);
    a = ii(a, b, c, d, x[8], 6, 1873313359);
    d = ii(d, a, b, c, x[15], 10, -30611744);
    c = ii(c, d, a, b, x[6], 15, -1560198380);
    b = ii(b, c, d, a, x[13], 21, 1309151649);
    a = ii(a, b, c, d, x[4], 6, -145523070);
    d = ii(d, a, b, c, x[11], 10, -1120210379);
    c = ii(c, d, a, b, x[2], 15, 718787259);
    b = ii(b, c, d, a, x[9], 21, -343485551);
    a = (a + oa) | 0;
    b = (b + ob) | 0;
    c = (c + oc) | 0;
    d = (d + od) | 0;
  }
  function hex(n) {
    let s = "";
    for (let i = 0; i < 4; i++) s += ((n >> (i * 8)) & 0xff).toString(16).padStart(2, "0");
    return s;
  }
  return hex(a) + hex(b) + hex(c) + hex(d);
}

export function signOf(params, secret) {
  const keys = Object.keys(params)
    .filter((k) => k !== "sign")
    .sort();
  return md5(keys.map((k) => `${k}=${params[k]}`).join("") + secret);
}

function priceOk(itemId, currency, amount) {
  const table = PRICES[itemId];
  if (!table) return false;
  const expected = table[(currency || "RUB").toUpperCase()];
  if (expected == null) return false;
  return Math.abs(Number(amount) - Number(expected)) < 0.02;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return corsOk();
    if (url.pathname === "/health") return json({ status: "ok", service: "vkplay-billing" });
    if (url.pathname === "/save") return handleSave(request, env, url);
    if (request.method !== "GET") return json({ status: "error", errcode: 2000, errmsg: "GET only" });
    const secret = env.VKPLAY_SECRET || "";
    if (!secret) return json({ status: "error", errcode: 5001, errmsg: "secret not configured" });

    const q = Object.fromEntries(url.searchParams.entries());
    for (const k of ["uid", "sum", "tid", "merchant_param", "sign"]) {
      if (!(k in q)) return json({ status: "error", errcode: 2000, errmsg: "Parameter error" });
    }
    if (signOf(q, secret) !== q.sign) {
      return json({ status: "error", errcode: 5001, errmsg: "Incorrect signature" });
    }

    let merchant = {};
    try {
      merchant = JSON.parse(q.merchant_param || "{}");
    } catch {
      merchant = {};
    }
    const itemId = String(merchant.item_id || merchant.sku || "");
    const currency = String(merchant.original_currency || merchant.currency || "RUB");
    const amount = merchant.original_amount ?? merchant.amount;
    if (itemId && amount != null && !priceOk(itemId, currency, amount)) {
      return json({ status: "error", errcode: 2000, errmsg: "sum mismatch" });
    }

    if (env.PURCHASES) {
      const seen = await env.PURCHASES.get(`tid:${q.tid}`);
      if (seen) return json({ status: "ok" });
      await env.PURCHASES.put(
        `tid:${q.tid}`,
        JSON.stringify({ uid: q.uid, sum: q.sum, itemId, at: Date.now() }),
      );
    }
    return json({ status: "ok" });
  },
};
