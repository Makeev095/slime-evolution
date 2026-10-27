// Галерея состояний для визуальной проверки: node tests/gallery.cjs <W> <H> <outDir> [stages|ui]
const { launch, sleep, clickDesign } = require('./lib.cjs');
const fs = require('fs');

const STAGE_AT = [0, 300, 2e4, 1e6, 6e7, 4e9, 5e12];
function seed(stage, extra = {}) {
  const now = new Date();
  const key = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  const idx = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
  const scale = Math.max(1, STAGE_AT[stage]);
  return Object.assign({
    v: 1, gel: scale * 0.6, runGel: scale * 1.2, allTime: scale * 1.2, gems: 42, taps: 500,
    gens: [30, 22, 14, 9, 5, 3, 1, 0, 0, 0, 0, 0].map((n, i) => (i <= stage + 2 ? n : 0)), tapLevel: 8 + stage * 4, essence: 0, rebirths: 0,
    boostUntil: 0, boostMult: 2, goldUntil: 0, stormUntil: 0, lastSeen: Date.now(), giftAt: 0, gemVideoAt: 0,
    seenStage: stage, lastDaily: { key, idx, day: 3 }, dailyStreak: 3, intro: true, sound: true, noAds: false, x2: false, tokens: [], updatedAt: Date.now()
  }, extra);
}

(async () => {
  const [W, H, OUT, WHAT] = [Number(process.argv[2] || 540), Number(process.argv[3] || 960), process.argv[4] || '/tmp/slime', process.argv[5] || 'stages'];
  fs.mkdirSync(OUT, { recursive: true });
  const mobile = H > W;

  if (WHAT === 'stages') {
    for (let s = 0; s < 7; s++) {
      const { browser, page, errors } = await launch(W, H, { storage: seed(s), mobile: false });
      await sleep(900);
      for (let i = 0; i < 5; i++) { await clickDesign(page, 300, 420); await sleep(60); }
      await sleep(250);
      await page.screenshot({ path: `${OUT}/stage${s}.png` });
      if (errors.length) console.log('stage', s, errors.join('\n'));
      await browser.close();
    }
  }
  if (WHAT === 'ui') {
    const { browser, page, errors } = await launch(W, H, { storage: seed(2, { runGel: 3e8, gems: 120, boostUntil: Date.now() + 95000 }), mobile: false });
    await sleep(900);
    const shot = async (name, wait = 700) => { await sleep(wait); await page.screenshot({ path: `${OUT}/ui_${name}.png` }); };
    const closeModal = async () => { await page.evaluate(() => { const s = window.__slime.scene; if (s.modal && s.modal.close) s.modal.close(); }); await sleep(500); };
    await shot('main');
    await page.evaluate(() => window.__slime.scene.panel.setTab(1)); await shot('crystals', 300);
    await page.evaluate(() => window.__slime.scene.panel.setTab(2)); await shot('rebirth', 300);
    await page.evaluate(() => window.__slime.scene.panel.setTab(0));
    await page.evaluate(() => window.__slime.scene.spawnGolden()); await shot('golden', 2500);
    await page.evaluate(() => window.__slime.scene.removeGolden());
    await page.evaluate(() => { const s = window.__slime.scene; s.queueModal(() => s.openDailyModal({ day: 3, streak: 3, claimable: true })); }); await shot('daily');
    await page.evaluate(() => { const s = window.__slime.scene; s.dailyPending = false; }); await closeModal();
    await page.evaluate(() => { const s = window.__slime.scene; s.queueModal(() => s.openEvolutionModal(3, 15)); }); await shot('evolution', 1400);
    await closeModal(); await sleep(600);
    await page.evaluate(() => window.__slime.scene.openShop()); await shot('shop', 1200);
    console.log('errors', errors.join('\n') || 'none');
    await browser.close();
  }
  console.log('done');
})().catch((e) => { console.error(e); process.exit(1); });
