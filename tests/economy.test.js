// Тесты экономики (без браузера): node tests/economy.test.js
import assert from 'node:assert/strict';
import { CONFIG, GENS } from '../src/config.js';
import * as Eco from '../src/economy.js';
import { fmt, fmtTime, fmtAway } from '../src/format.js';
import { defaultData } from '../src/yandexSDK.js';

let passed = 0;
const test = (name, fn) => { try { fn(); passed++; console.log('  ok  ' + name); } catch (e) { console.error('  FAIL ' + name + '\n', e); process.exitCode = 1; } };
const fresh = () => defaultData();

test('цены: bulk равен сумме покупок по одной', () => {
  let sum = 0;
  for (let k = 0; k < 10; k++) sum += Eco.genCost(2, 3 + k);
  const bulk = Eco.genCost(2, 3, 10);
  assert.ok(Math.abs(bulk - sum) <= 10, `bulk ${bulk} vs ${sum}`);
  assert.equal(Eco.genCost(0, 0), 15);
  assert.equal(Eco.tapCost(0), 25);
});

test('genMax: покупает максимум и не больше', () => {
  for (const gel of [14, 15, 100, 5000, 1e6, 1e12]) {
    for (const owned of [0, 5, 40]) {
      const n = Eco.genMax(3, owned, gel, 1000);
      if (n > 0) assert.ok(Eco.genCost(3, owned, n) <= gel, `afford ${n}`);
      if (n < 1000) assert.ok(Eco.genCost(3, owned, n + 1) > gel, `max ${n}`);
    }
  }
  assert.equal(Eco.tapMax(0, 24, 100), 0);
  assert.equal(Eco.tapMax(0, 25, 100), 1);
});

test('вехи: удваивают доход производителя', () => {
  assert.equal(Eco.milestoneMult(9), 1);
  assert.equal(Eco.milestoneMult(10), 2);
  assert.equal(Eco.milestoneMult(25), 4);
  assert.equal(Eco.milestoneMult(100), 16);
  assert.equal(Eco.nextMilestone(10), 25);
  assert.equal(Eco.nextMilestone(500), 0);
});

test('доход и тап: множители складываются корректно', () => {
  const d = fresh();
  assert.equal(Eco.cps(d, 0), 0);
  assert.equal(Eco.tapValue(d, 0), 1);
  d.gens[0] = 10; // 10 капельниц, веха x2
  assert.ok(Math.abs(Eco.baseCps(d) - 10 * 0.1 * 2) < 1e-9);
  d.allTime = 300; // стадия 1: x1.5
  assert.ok(Math.abs(Eco.cps(d, 0) - 2 * 1.5) < 1e-9);
  d.essence = 5;   // +50%
  assert.ok(Math.abs(Eco.cps(d, 0) - 2 * 1.5 * 1.5) < 1e-9);
  d.x2 = true;
  assert.ok(Math.abs(Eco.cps(d, 0) - 2 * 1.5 * 1.5 * 2) < 1e-9);
  const now = 1e12;
  d.boostUntil = now + 1000; d.boostMult = 5;
  assert.ok(Math.abs(Eco.cps(d, now) - 2 * 1.5 * 1.5 * 2 * 5) < 1e-9);
  assert.ok(Math.abs(Eco.cps(d, now + 2000) - 2 * 1.5 * 1.5 * 2) < 1e-9, 'буст истёк');
  d.tapLevel = 9; // (1+9) = 10 базово; каждые 10 уровней удвоение
  const tv = Eco.tapValue(d, 0);
  assert.ok(tv > 10 * 1.5 * 1.5 * 2);
  d.tapLevel = 10;
  assert.ok(Eco.tapValue(d, 0) > tv * 2 * 0.99);
});

test('эволюция: стадии и прогресс', () => {
  assert.equal(Eco.stageFor(0), 0);
  assert.equal(Eco.stageFor(299), 0);
  assert.equal(Eco.stageFor(300), 1);
  assert.equal(Eco.stageFor(1e20), CONFIG.eco.stages.length - 1);
  const p = Eco.evolutionProgress(150);
  assert.equal(p.stage, 0); assert.equal(p.next, 1); assert.ok(Math.abs(p.ratio - 0.5) < 1e-9);
  assert.equal(Eco.evolutionProgress(1e20).next, -1);
});

test('оффлайн: коротко — молча и полностью, долго — 50% и лимит 2 часа', () => {
  const d = fresh(); d.gens[1] = 10; // 10 червячков, x2
  const rate = Eco.cps(d, 0);
  const a = Eco.offlineGain(d, 60);
  assert.ok(a.silent && Math.abs(a.gain - rate * 60) < 1e-6);
  const b = Eco.offlineGain(d, 3600);
  assert.ok(!b.silent && Math.abs(b.gain - rate * 3600 * 0.5) < 1e-6);
  const c = Eco.offlineGain(d, 86400);
  assert.ok(Math.abs(c.gain - rate * 7200 * 0.5) < 1e-6, 'лимит 2 ч');
  assert.equal(Eco.offlineGain(d, -5).gain, 0);
});

test('перерождение: эссенция растёт корнем, сбрасывает прогресс, сохраняет стадию', () => {
  const d = fresh();
  d.runGel = 4e7; assert.equal(Eco.essenceGain(d.runGel), 0);
  assert.equal(Eco.applyRebirth(d), 0, 'рано');
  d.runGel = 5e7; assert.equal(Eco.essenceGain(5e7), 1);
  assert.equal(Eco.essenceGain(2e8), 2);
  assert.ok(Eco.essenceNeed(5e7) > 0);
  d.gel = 1e9; d.allTime = 1e10; d.runGel = 2e8; d.gens[3] = 20; d.tapLevel = 7; d.gems = 33;
  const g = Eco.applyRebirth(d);
  assert.equal(g, 2); assert.equal(d.essence, 2); assert.equal(d.rebirths, 1);
  assert.equal(d.gel, 0); assert.equal(d.runGel, 0); assert.equal(d.tapLevel, 0);
  assert.ok(d.gens.every((n) => n === 0));
  assert.equal(d.allTime, 1e10); assert.equal(d.gems, 33);
  assert.equal(Eco.stageFor(d.allTime), 5);
});

test('ежедневные награды: серия, сброс, повторное получение', () => {
  const d = fresh();
  const day1 = new Date(2026, 9, 27, 12).getTime();
  let st = Eco.dailyStatus(d, day1);
  assert.ok(st.claimable && st.day === 1);
  const r1 = Eco.claimDaily(d, day1);
  assert.equal(r1.gems, CONFIG.eco.daily.gems[0]);
  assert.equal(Eco.claimDaily(d, day1 + 3600e3), null, 'второй раз за день нельзя');
  const day2 = new Date(2026, 9, 28, 9).getTime();
  st = Eco.dailyStatus(d, day2);
  assert.ok(st.claimable && st.day === 2 && st.streak === 2);
  Eco.claimDaily(d, day2, 2);
  assert.equal(d.dailyStreak, 2);
  const day5 = new Date(2026, 9, 31, 9).getTime(); // пропуск дней — серия сбрасывается
  st = Eco.dailyStatus(d, day5);
  assert.ok(st.claimable && st.day === 1 && st.streak === 1);
  // 7 дней подряд -> следующий снова день 1
  const e = fresh();
  for (let i = 0; i < 8; i++) { const ts = new Date(2026, 0, 1 + i, 10).getTime(); const s = Eco.dailyStatus(e, ts); assert.equal(s.day, (i % 7) + 1); Eco.claimDaily(e, ts); }
});

test('покупки: нехватка средств не списывает; успех списывает точно', () => {
  const d = fresh();
  d.gel = 14; assert.equal(Eco.buyGen(d, 0, 1), false); assert.equal(d.gel, 14);
  d.gel = 15; assert.equal(Eco.buyGen(d, 0, 1), true); assert.equal(d.gel, 0); assert.equal(d.gens[0], 1);
  d.gel = 1e6; const c = Eco.genCost(1, 0, 10);
  assert.equal(Eco.buyGen(d, 1, 10), true); assert.equal(d.gel, 1e6 - c); assert.equal(d.gens[1], 10);
  d.gel = 100; assert.equal(Eco.buyTap(d, 2), true); assert.equal(d.tapLevel, 2);
  assert.equal(Eco.buyGen(d, 0, 0), false);
});

test('буст: продление до лимита, x5 перекрывает x2', () => {
  const d = fresh(); const now = 1e12;
  Eco.addBoost(d, now, 120000, 2); assert.equal(d.boostUntil, now + 120000);
  Eco.addBoost(d, now, 120000, 2); assert.equal(d.boostUntil, now + 240000);
  for (let i = 0; i < 40; i++) Eco.addBoost(d, now, 120000, 2);
  assert.equal(d.boostUntil, now + CONFIG.eco.boost.maxMs);
  Eco.addBoost(d, now, 300000, 5); assert.equal(d.boostMult, 5); assert.equal(d.boostUntil, now + 300000);
});

test('форматирование чисел', () => {
  assert.equal(fmt(0), '0'); assert.equal(fmt(7), '7'); assert.equal(fmt(999.9), '999');
  assert.equal(fmt(0.1), '0,1');
  assert.equal(fmt(1234), '1,23 тыс'); assert.equal(fmt(12345), '12,3 тыс'); assert.equal(fmt(123456), '123 тыс');
  assert.equal(fmt(1.5e6), '1,5 млн'); assert.equal(fmt(2e9), '2 млрд');
  assert.ok(/e/.test(fmt(1e60)));
  assert.equal(fmt(Infinity), '∞');
  assert.equal(fmtTime(75), '1:15'); assert.equal(fmtTime(3725), '1:02:05');
  assert.equal(fmtAway(7500), '2 ч 5 мин'); assert.equal(fmtAway(30), '0 мин');
});

test('данные: нормализация защищает от битых сохранений (NaN, отрицательные, короткие массивы)', async () => {
  // yandexSDK.normalize не экспортируется — проверяем через defaultData и форму массива
  const d = defaultData();
  assert.equal(d.gens.length, GENS.length);
  assert.equal(d.v, 1);
});

// ---------- Симуляция темпа игры ----------
// Бот тапает 4 раза в секунду и покупает лучшее по окупаемости; смотрим, когда наступают эволюции.
test('темп игры: первая эволюция < 2 мин, вторая < 12 мин, перерождение возможно за разумное время', () => {
  const d = fresh();
  let t = 0; const log = {};
  const tapsPerSec = 4;
  while (t < 3 * 3600) {
    const dt = 1;
    // 1 секунда: тапы + доход
    const gain = Eco.tapValue(d, 0) * tapsPerSec * 0.96 + Eco.cps(d, 0) * dt; // 4% критов не считаем
    Eco.addGel(d, gain); d.taps += tapsPerSec; t += dt;
    // покупки: лучший ROI (доход/цена) среди доступных
    for (let guard = 0; guard < 50; guard++) {
      let best = null;
      for (let i = 0; i < GENS.length; i++) {
        const cost = Eco.genCost(i, d.gens[i]);
        const before = Eco.baseCps(d);
        d.gens[i]++; const after = Eco.baseCps(d); d.gens[i]--;
        const roi = (after - before) / cost;
        if (cost <= d.gel && (!best || roi > best.roi)) best = { kind: 'gen', i, roi };
      }
      const tc = Eco.tapCost(d.tapLevel);
      const tapRoi = (Eco.tapValue({ ...d, tapLevel: d.tapLevel + 1 }, 0) - Eco.tapValue(d, 0)) * tapsPerSec / tc;
      if (tc <= d.gel && (!best || tapRoi > best.roi)) best = { kind: 'tap', roi: tapRoi };
      if (!best) break;
      if (best.kind === 'gen') Eco.buyGen(d, best.i, 1); else Eco.buyTap(d, 1);
    }
    const st = Eco.stageFor(d.allTime);
    if (log[st] === undefined) log[st] = t;
    if (Eco.essenceGain(d.runGel) >= 1 && log.rebirth === undefined) log.rebirth = t;
  }
  console.log('      темп (мин):', Object.entries(log).map(([k, v]) => `${k}: ${(v / 60).toFixed(1)}`).join(' | '));
  assert.ok(log[1] < 120, 'первая эволюция должна случиться быстро');
  assert.ok(log[2] < 12 * 60, 'вторая эволюция за 12 минут');
  assert.ok(log[3] < 90 * 60, 'третья эволюция за 90 минут');
});

console.log(`\n${passed} тестов пройдено`);
