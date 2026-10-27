// Чистая экономика игры (без Phaser и DOM): цены, доход, эволюция, перерождение, ежедневные награды.
// Все функции принимают объект данных игрока `d` (см. yandexSDK.defaultData) и не мутируют его, если не сказано иное.

import { CONFIG, GENS } from './config.js';

const E = CONFIG.eco;
const LN = Math.log;

// ---------- Геометрические цены ----------
export function geoCost(base, growth, owned, n) {
  return Math.ceil(base * Math.pow(growth, owned) * (Math.pow(growth, n) - 1) / (growth - 1));
}
export function geoMax(base, growth, owned, gel, cap = 1000) {
  const first = base * Math.pow(growth, owned);
  if (gel < first) return 0;
  let n = Math.floor(LN(gel * (growth - 1) / first + 1) / LN(growth));
  n = Math.min(n, cap);
  while (n > 0 && geoCost(base, growth, owned, n) > gel) n--;
  return n;
}

export const genCost = (i, owned, n = 1) => geoCost(GENS[i].baseCost, E.costGrowth, owned, n);
export const genMax = (i, owned, gel, cap) => geoMax(GENS[i].baseCost, E.costGrowth, owned, gel, cap);
export const tapCost = (lvl, n = 1) => geoCost(E.tap.baseCost, E.tap.growth, lvl, n);
export const tapMax = (lvl, gel, cap) => geoMax(E.tap.baseCost, E.tap.growth, lvl, gel, cap);

// ---------- Доход ----------
export function milestoneMult(owned) {
  let c = 0;
  for (const m of E.milestones) if (owned >= m) c++;
  return Math.pow(2, c);
}
export function nextMilestone(owned) {
  for (const m of E.milestones) if (owned < m) return m;
  return 0;
}

export const stageMult = (stage) => E.stages[stage].mult;
export function stageFor(allTime) {
  let s = 0;
  for (let i = 0; i < E.stages.length; i++) if (allTime >= E.stages[i].at) s = i;
  return s;
}

export function genBaseCps(d, i) { return GENS[i].baseCps * d.gens[i] * milestoneMult(d.gens[i]); }
export function baseCps(d) {
  let s = 0;
  for (let i = 0; i < GENS.length; i++) s += genBaseCps(d, i);
  return s;
}

// Постоянный множитель: стадия * эссенция * «x2 навсегда»
export function permMult(d) {
  return stageMult(stageFor(d.allTime)) * (1 + E.essence.perPoint * d.essence) * (d.x2 ? 2 : 1);
}
// Временные эффекты (хранятся в данных как метки времени, поэтому переживают перезагрузку)
export const boostMult = (d, now) => (d.boostUntil > now ? d.boostMult : 1);
export const goldProdMult = (d, now) => (d.goldUntil > now ? 7 : 1);
export const stormMult = (d, now) => (d.stormUntil > now ? 10 : 1);

// Доход в секунду с учётом всех бонусов
export function cps(d, now = 0) {
  return baseCps(d) * permMult(d) * boostMult(d, now) * goldProdMult(d, now);
}

// Желе за один тап. frenzy — множитель «ярости» (1 или E.frenzy.tapMult)
export function tapValue(d, now = 0, frenzy = 1) {
  const lvl = d.tapLevel;
  const base = (1 + lvl) * Math.pow(2, Math.floor(lvl / E.tap.doubleEvery));
  return (base + baseCps(d) * E.tap.cpsShare) * permMult(d) * boostMult(d, now) * frenzy * stormMult(d, now);
}
// Желе за тап без временных бонусов (для подписи в магазине)
export const tapBaseValue = (d) => tapValue(d, 0, 1);

// ---------- Эволюция ----------
// Прогресс до следующей стадии: { stage, next, ratio, need } (next = -1 на последней стадии)
export function evolutionProgress(allTime) {
  const stage = stageFor(allTime);
  if (stage >= E.stages.length - 1) return { stage, next: -1, ratio: 1, need: 0 };
  const from = E.stages[stage].at, to = E.stages[stage + 1].at;
  // Шкала логарифмическая: пороги растут в десятки раз, и при линейной шкале тапы почти не двигали бы полоску
  const f = (x) => Math.log(1 + Math.max(0, x));
  const ratio = Math.max(0, Math.min(1, (f(allTime) - f(from)) / (f(to) - f(from))));
  return { stage, next: stage + 1, ratio, need: to - allTime };
}

// ---------- Перерождение ----------
export const essenceGain = (runGel) => Math.floor(Math.pow(Math.max(0, runGel) / E.essence.divisor, E.essence.power) + 1e-9);
export const essenceNeed = (runGel) => {
  const k = essenceGain(runGel) + 1;
  return Math.max(0, Math.pow(k, 1 / E.essence.power) * E.essence.divisor - runGel);
};
// Применяет перерождение к данным (мутирует d). Возвращает полученную эссенцию.
export function applyRebirth(d) {
  const gain = essenceGain(d.runGel);
  if (gain < 1) return 0;
  d.essence += gain;
  d.rebirths += 1;
  d.gel = 0; d.runGel = 0; d.tapLevel = 0;
  d.gens = GENS.map(() => 0);
  d.boostUntil = 0; d.goldUntil = 0; d.stormUntil = 0;
  return gain;
}

// ---------- Ежедневные награды ----------
export const dayKey = (ms) => {
  const x = new Date(ms);
  return x.getFullYear() * 10000 + (x.getMonth() + 1) * 100 + x.getDate();
};
const dayIndex = (ms) => {
  const x = new Date(ms);
  return Math.floor(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate()) / 86400000);
};
// Что положено игроку сегодня? { claimable, day (1..7), streak }
export function dailyStatus(d, now) {
  if (d.lastDaily && dayKey(now) === d.lastDaily.key) return { claimable: false, day: d.lastDaily.day, streak: d.dailyStreak };
  let streak = 1;
  if (d.lastDaily && d.lastDaily.idx !== undefined && dayIndex(now) - d.lastDaily.idx === 1) streak = d.dailyStreak + 1;
  return { claimable: true, day: ((streak - 1) % 7) + 1, streak };
}
export function dailyReward(d, day, now) {
  const gems = E.daily.gems[day - 1];
  const gel = Math.max(50 * day, cps(d, 0) * 60 * E.daily.gelMinutes[day - 1]);
  return { gems, gel };
}
export function claimDaily(d, now, mult = 1) {
  const st = dailyStatus(d, now);
  if (!st.claimable) return null;
  const r = dailyReward(d, st.day, now);
  d.gel += r.gel * mult; d.runGel += r.gel * mult; d.allTime += r.gel * mult;
  d.gems += r.gems * mult;
  d.dailyStreak = st.streak;
  d.lastDaily = { key: dayKey(now), idx: dayIndex(now), day: st.day };
  return { gel: r.gel * mult, gems: r.gems * mult, day: st.day };
}

// ---------- Покупки внутри игры ----------
// Пытается купить n уровней производителя. Возвращает true при успехе (мутирует d).
export function buyGen(d, i, n) {
  if (n < 1) return false;
  const cost = genCost(i, d.gens[i], n);
  if (d.gel < cost) return false;
  d.gel -= cost; d.gens[i] += n;
  return true;
}
export function buyTap(d, n) {
  if (n < 1) return false;
  const cost = tapCost(d.tapLevel, n);
  if (d.gel < cost) return false;
  d.gel -= cost; d.tapLevel += n;
  return true;
}
export function addGel(d, amount) {
  d.gel += amount; d.runGel += amount; d.allTime += amount;
}
// Продление/установка ускорения. Возвращает новое значение boostUntil.
export function addBoost(d, now, ms, mult) {
  const active = d.boostUntil > now;
  if (active && d.boostMult === mult) d.boostUntil = Math.min(d.boostUntil + ms, now + E.boost.maxMs);
  else if (!active || mult > d.boostMult) { d.boostUntil = now + ms; d.boostMult = mult; }
  else d.boostUntil = Math.min(d.boostUntil + ms, now + E.boost.maxMs);
  return d.boostUntil;
}
