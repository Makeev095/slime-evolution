// Быстрый визуальный прогон: node tests/smoke.cjs <W> <H> <outDir>
const { launch, sleep, clickDesign } = require('./lib.cjs');
const fs = require('fs');

(async () => {
  const [W, H, OUT] = [Number(process.argv[2] || 540), Number(process.argv[3] || 960), process.argv[4] || '/tmp/slime'];
  fs.mkdirSync(OUT, { recursive: true });
  const { browser, page, errors } = await launch(W, H);
  await sleep(800);
  await page.screenshot({ path: OUT + '/s1_start.png' });
  for (let i = 0; i < 12; i++) { await clickDesign(page, 300 + (i % 3) * 20, 420); await sleep(90); }
  await sleep(400);
  await page.screenshot({ path: OUT + '/s2_tapped.png' });
  const st = await page.evaluate(() => ({ gel: window.__slime.scene.d.gel, taps: window.__slime.scene.d.taps, mode: window.__slime.YandexSDK.mode }));
  console.log('state', JSON.stringify(st));
  console.log('errors', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
