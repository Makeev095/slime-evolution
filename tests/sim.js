// Симуляция темпа игры активным игроком (тапает 4 раза/сек, покупает лучшее по окупаемости, перерождается когда выгодно).
// Запуск: node tests/sim.js [часов=30]. Печатает время (в минутах активной игры) ключевых событий.
import { GENS, CONFIG } from '../src/config.js';
import * as Eco from '../src/economy.js';
import { defaultData } from '../src/yandexSDK.js';

export function simulate(hours = 30, { tapsPerSec = 4, log = true } = {}) {
  const d = defaultData();
  const ev = {};
  const mark = (k, t) => { if (ev[k] === undefined) ev[k] = t / 60; };
  let t = 0;
  while (t < hours * 3600) {
    const dt = t < 600 ? 1 : 5;
    const gain = (Eco.tapValue(d, 0) * tapsPerSec * 0.96) * dt + Eco.cps(d, 0) * dt;
    Eco.addGel(d, gain); d.taps += tapsPerSec * dt; t += dt;
    for (let guard = 0; guard < 80; guard++) {
      let best = null;
      const before = Eco.baseCps(d);
      for (let i = 0; i < GENS.length; i++) {
        const cost = Eco.genCost(i, d.gens[i]);
        if (cost > d.gel) continue;
        d.gens[i]++; const after = Eco.baseCps(d); d.gens[i]--;
        const roi = (after - before) / cost;
        if (!best || roi > best.roi) best = { kind: 'gen', i, roi };
      }
      const tc = Eco.tapCost(d.tapLevel);
      const tapRoi = (Eco.tapValue({ ...d, tapLevel: d.tapLevel + 1 }, 0) - Eco.tapValue(d, 0)) * tapsPerSec / tc;
      if (tc <= d.gel && (!best || tapRoi > best.roi)) best = { kind: 'tap', roi: tapRoi };
      if (!best) break;
      if (best.kind === 'gen') { Eco.buyGen(d, best.i, 1); mark('first_' + GENS[best.i].id, t); } else Eco.buyTap(d, 1);
    }
    mark('stage' + Eco.stageFor(d.allTime), t);
    for (let i = 0; i < GENS.length; i++) if (d.allTime >= GENS[i].baseCost * 0.5) mark('open_' + GENS[i].id, t);
    // перерождение, когда множитель вырастет минимум вдвое
    const g = Eco.essenceGain(d.runGel);
    if (g >= 1 && (1 + 0.1 * (d.essence + g)) / (1 + 0.1 * d.essence) >= 2) { Eco.applyRebirth(d); d.rebirths; mark('rebirth' + d.rebirths, t); }
  }
  if (log) {
    console.log(Object.entries(ev).map(([k, v]) => `${k}: ${v < 120 ? v.toFixed(1) + 'м' : (v / 60).toFixed(1) + 'ч'}`).join('\n'));
    console.log('rebirths', d.rebirths, 'essence', d.essence, 'allTime', d.allTime.toExponential(2));
  }
  return { ev, d };
}

if (process.argv[1] && process.argv[1].endsWith('sim.js')) simulate(Number(process.argv[2] || 30));
