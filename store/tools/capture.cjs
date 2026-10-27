// Съёмка материалов для Яндекс Игр: скриншоты и кадры для видео + звук.
// Игра крутится на виртуальных часах: каждый кадр шагаем вручную (game.loop.step), поэтому видео получается ровным
// независимо от скорости компьютера. Звук собираем из тех же синтезированных эффектов через OfflineAudioContext.
//
//   NODE_PATH=/tmp/promo/node_modules node store/tools/capture.cjs shots <ru|en|tr> <outDir>
//   NODE_PATH=/tmp/promo/node_modules node store/tools/capture.cjs video <ru|en|tr> <W> <H> <outDir> [секунд=27]
// Нужны: puppeteer-core, Google Chrome, локальный сервер корня проекта на порту 8781 (python3 -m http.server 8781).
const fs = require('fs');
const path = require('path');
const { launch, sleep } = require('../../tests/lib.cjs');

const STAGE_AT = [0, 300, 2e4, 1e6, 6e7, 4e9, 5e12];

function seed(lang, over = {}) {
  const n = new Date();
  const key = n.getFullYear() * 10000 + (n.getMonth() + 1) * 100 + n.getDate();
  const idx = Math.floor(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) / 86400000);
  return Object.assign({
    v: 1, gel: 0, runGel: 0, allTime: 0, gems: 30, taps: 0, gens: new Array(12).fill(0), tapLevel: 0, essence: 0, rebirths: 0,
    boostUntil: 0, boostMult: 2, goldUntil: 0, stormUntil: 0, giftAt: 0, gemVideoAt: 0, seenStage: 0,
    lastDaily: { key, idx, day: 3 }, dailyStreak: 3, intro: false, sound: true, noAds: false, x2: false, tokens: [], lang, updatedAt: Date.now()
  }, over);
}

// Виртуальные часы: пока не вызван __freeze, время идёт как обычно (нужно для загрузки), потом — только по шагам.
const CLOCK = `(() => {
  const D = Date.now.bind(Date), P = performance.now.bind(performance);
  let frozen = false, d0 = 0, p0 = 0;
  window.__vt = 0;
  window.__freeze = () => { frozen = true; d0 = D(); p0 = P(); window.__vt = 0; };
  Date.now = () => (frozen ? d0 + Math.floor(window.__vt) : D());
  performance.now = () => (frozen ? p0 + window.__vt : P());
})();`;

// Помощники внутри страницы
function installHelpers() {
  const s = () => window.__slime.scene;
  const AT = [0, 300, 2e4, 1e6, 6e7, 4e9, 5e12];
  window.__log = [];
  const Sfx = window.__slime.Sfx;
  Sfx.play = (scene, key, cfg) => { window.__log.push([window.__vt, key, (cfg && cfg.volume) || 1, (cfg && cfg.rate) || 1]); };
  window.__game.loop.sleep();
  window.__freeze();
  window.__frame = (n = 2) => { for (let i = 0; i < n; i++) { window.__vt += 1000 / 60; window.__game.loop.step(performance.now()); } };

  // перенос игрока на нужную стадию: «как будто он играл долго»
  window.__jump = (stage, extra = {}) => {
    const d = s().d, Eco = window.__slime.Eco;
    d.allTime = Math.max(d.allTime, AT[stage] + 1);
    d.runGel = d.allTime;
    d.gens = new Array(12).fill(0).map((_, i) => (i <= stage + 3 ? Math.max(0, 34 + 7 * stage - 6 * i) : 0));
    d.tapLevel = 6 + stage * 5;
    // доход подгоняем так, чтобы следующая эволюция не наступила сама посреди кадра: ~ порог / 1500 в секунду
    const target = (AT[Math.min(stage + 1, 6)] - AT[stage]) / 1500;
    for (let guard = 0; guard < 4000 && Eco.cps(d, Date.now()) > target; guard++) {
      let i = d.gens.length - 1; while (i > 0 && d.gens[i] === 0) i--;
      d.gens[i] = Math.floor(d.gens[i] * 0.85);
    }
    d.gel = Math.max(d.gel, AT[stage] * 0.4 + 40);
    Object.assign(d, extra);
    s().dirty = true;
    s().checkEvolution();
    s().panel.refresh(true);
  };
  window.__closeModal = () => { const sc = s(); if (sc.modal && sc.modal !== true && sc.modal.close) sc.modal.close(); };
  window.__tap = () => { const sc = s(); sc.tapSlime(sc.slime.x + (Math.random() - 0.5) * 140, sc.slime.y - 150 + (Math.random() - 0.5) * 80); };
  window.__buy = () => {
    const sc = s(), d = sc.d, Eco = window.__slime.Eco;
    if (sc.modal || sc.shopOpen) return false;
    for (let i = d.gens.length - 1; i >= 0; i--) {
      if (!sc.panel._genUnlocked(d, i)) continue;
      if (d.gel >= Eco.genCost(i, d.gens[i], 1) && sc.buyGen(i, 1)) return true;
    }
    if (d.gel >= Eco.tapCost(d.tapLevel, 1) && sc.buyTap(1)) return true;
    return false;
  };
  window.__info = () => ({ gel: s().d.gel, all: s().d.allTime, stage: s().shownStage, modal: !!s().modal });
  // звук: музыка + все эффекты по меткам времени
  window.__audio = async (dur) => {
    const game = window.__game, SR = 44100;
    const ctx = new OfflineAudioContext(1, Math.ceil(SR * dur), SR);
    const mus = game.cache.audio.get('music');
    if (mus) {
      const src = ctx.createBufferSource(); src.buffer = mus; src.loop = true;
      const g = ctx.createGain(); g.gain.value = 0.42; src.connect(g); g.connect(ctx.destination); src.start(0);
    }
    for (const [t, key, vol, rate] of window.__log) {
      const b = game.cache.audio.get(key);
      if (!b || t / 1000 >= dur) continue;
      const src = ctx.createBufferSource(); src.buffer = b; src.playbackRate.value = rate || 1;
      const g = ctx.createGain(); g.gain.value = Math.min(1, vol) * 0.9; src.connect(g); g.connect(ctx.destination);
      src.start(t / 1000);
    }
    const buf = await ctx.startRendering();
    const d = buf.getChannelData(0);
    const out = new DataView(new ArrayBuffer(44 + d.length * 2));
    const w = (o, str) => { for (let i = 0; i < str.length; i++) out.setUint8(o + i, str.charCodeAt(i)); };
    w(0, 'RIFF'); out.setUint32(4, 36 + d.length * 2, true); w(8, 'WAVE'); w(12, 'fmt '); out.setUint32(16, 16, true);
    out.setUint16(20, 1, true); out.setUint16(22, 1, true); out.setUint32(24, SR, true); out.setUint32(28, SR * 2, true);
    out.setUint16(32, 2, true); out.setUint16(34, 16, true); w(36, 'data'); out.setUint32(40, d.length * 2, true);
    for (let i = 0; i < d.length; i++) out.setInt16(44 + i * 2, Math.max(-1, Math.min(1, d[i])) * 32767, true);
    let bin = ''; const u8 = new Uint8Array(out.buffer);
    for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(bin);
  };
}

async function boot(W, H, lang, storage) {
  const r = await launch(W, H, { storage: seed(lang, storage), init: CLOCK });
  await r.page.evaluate(installHelpers);
  return r;
}
const ev = (page, fn, ...a) => page.evaluate(fn, ...a);
const step = (page, n) => ev(page, (n) => window.__frame(n), n);

// ---------------------------------------------------------------------------------------------------------------
async function shots(lang, out) {
  fs.mkdirSync(out, { recursive: true });
  const sets = [['desktop', 1920, 1080], ['mobile', 1080, 1920]];
  for (const [kind, W, H] of sets) {
    const { browser, page, errors } = await boot(W, H, lang, { intro: true, taps: 100, gems: 120, gel: 4e5, runGel: 4e5, allTime: 4e5, seenStage: 1 });
    const shot = async (name) => { await page.screenshot({ path: path.join(out, `${kind}_${name}.png`), type: 'png' }); console.log('shot', kind, name); };
    const settle = (n = 50) => step(page, n);
    await settle(30);
    // 1. середина игры: рыцарь, ускорение x2, золотой счёт
    await ev(page, () => { window.__jump(2, { boostUntil: Date.now() + 95000, gems: 120 }); });
    await settle(60); await ev(page, () => window.__closeModal()); await settle(70);
    for (let i = 0; i < 6; i++) { await ev(page, () => window.__tap()); await step(page, 3); }
    await settle(20);
    await shot('1_main');
    // 2. эволюция в мага
    await ev(page, () => { window.__jump(3); });
    await settle(50); await shot('2_evolution');
    await ev(page, () => window.__closeModal()); await settle(80);
    // 3. кристаллы
    await ev(page, () => window.__slime.scene.panel.setTab(1)); await settle(30); await shot('3_crystals');
    // 4. золотой пузырь + ярость
    await ev(page, () => { window.__slime.scene.panel.setTab(0); window.__slime.scene.spawnGolden(); });
    for (let i = 0; i < 60; i++) { await ev(page, (i) => { if (i % 2 === 0) window.__tap(); }, i); await step(page, 2); }
    await step(page, 40); await shot('4_golden_frenzy');
    // 5. позднее: космонавт
    await ev(page, () => { window.__slime.scene.removeGolden(); window.__jump(5); });
    await settle(50); await ev(page, () => window.__closeModal()); await settle(100);
    for (let i = 0; i < 5; i++) { await ev(page, () => window.__tap()); await step(page, 3); }
    await settle(30); await shot('5_astronaut');
    // 6. перерождение
    await ev(page, () => { window.__jump(6); });
    await settle(50); await ev(page, () => window.__closeModal()); await settle(100);
    await ev(page, () => window.__slime.scene.panel.setTab(2)); await settle(40); await shot('6_rebirth');
    if (errors.length) console.log('errors', errors.join('\n'));
    await browser.close();
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Сценарий ролика (секунды): старт с нуля -> покупки -> эволюции -> золотой пузырь и ярость -> поздняя игра -> финал
async function video(lang, W, H, out, secs) {
  fs.mkdirSync(out, { recursive: true });
  const { browser, page, errors } = await boot(W, H, lang, { intro: false });
  const FPS = 30, total = Math.round(secs * FPS);
  const events = [
    [5.0, () => window.__jump(1)],
    [7.3, () => window.__closeModal()],
    [8.6, () => window.__jump(2, { boostUntil: Date.now() + 95000 })],
    [11.0, () => window.__closeModal()],
    [12.2, () => window.__slime.scene.panel.setTab(1)],
    [13.6, () => window.__slime.scene.panel.setTab(0)],
    [14.4, () => window.__slime.scene.spawnGolden()],
    [16.3, () => { const sc = window.__slime.scene; if (sc.golden) sc.collectGolden(); }],
    [17.0, () => window.__slime.scene.startFrenzy()],
    [20.0, () => window.__jump(4)],
    [22.4, () => window.__closeModal()],
    [23.2, () => window.__jump(5)],
    [25.4, () => window.__closeModal()]
  ];
  let ei = 0;
  const t0 = Date.now();
  for (let f = 0; f < total; f++) {
    const t = f / FPS;
    while (ei < events.length && t >= events[ei][0]) { await page.evaluate(events[ei][1]); ei++; }
    // бот: тапает (в ярость — чаще) и покупает
    const rate = t >= 17 && t < 24 ? 2 : 4;
    await page.evaluate((f, rate, t) => {
      if (t >= 0.4 && f % rate === 0) window.__tap();
      if (f % 9 === 4) window.__buy();
    }, f, rate, t);
    await step(page, 2);
    await page.screenshot({ path: path.join(out, 'f' + String(f).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 92 });
    if (f % 90 === 0) console.log('frame', f, '/', total, ((Date.now() - t0) / 1000).toFixed(0) + 's', JSON.stringify(await page.evaluate(() => window.__info())));
  }
  const b64 = await page.evaluate((d) => window.__audio(d), secs);
  fs.writeFileSync(path.join(out, 'audio.wav'), Buffer.from(b64, 'base64'));
  if (errors.length) console.log('errors', errors.join('\n'));
  console.log('done', out);
  await browser.close();
}

(async () => {
  const [mode, lang] = [process.argv[2], process.argv[3]];
  if (mode === 'shots') await shots(lang, process.argv[4]);
  else if (mode === 'video') await video(lang, Number(process.argv[4]), Number(process.argv[5]), process.argv[6], Number(process.argv[7] || 27));
  else console.log('usage: capture.cjs shots <lang> <out> | video <lang> <W> <H> <out> [secs]');
})().catch((e) => { console.error(e); process.exit(1); });
