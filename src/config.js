// Настройки игры, баланс, данные для улучшений и локализация. Никакой зависимости от Phaser —
// модуль можно импортировать и в Node (тесты экономики).

export const DESIGN = { W: 600, H: 1000 }; // логическое «окно» игры; камера масштабирует его под любой экран

export const CONFIG = {
  storageKey: 'slime_evolution_save_v1',

  ads: {
    interstitialIntervalMs: 120000, // межстраничная реклама не чаще раза в 2 минуты
    idleBeforeAdMs: 6000,           // перед рекламой игрок не должен тапать минимум столько
    countdownSec: 3,                // предупреждение «Видео через 3…»
    saveDebounceMs: 2000,           // важные сохранения (покупки, эволюция) уходят в облако быстро
    cloudAutosaveMs: 25000,         // обычный автосейв в облако — редко, чтобы не упереться в лимиты
    devAdDurationMs: 900            // длительность имитации рекламы в локальной разработке
  },

  eco: {
    costGrowth: 1.15,                                         // рост цены производителя
    milestones: [10, 25, 50, 100, 150, 200, 250, 300, 400, 500], // каждое достижение удваивает доход производителя
    tap: { baseCost: 25, growth: 1.38, doubleEvery: 10, cpsShare: 0.03 },
    essence: { divisor: 5e7, perPoint: 0.1 },                 // эссенция перерождения: +10% к доходу за очко
    offline: { capSec: 7200, rate: 0.5, silentSec: 120 },     // оффлайн: до 2 ч, 50%; до 2 минут отсутствия — начисляем молча и полностью
    boost: { adMs: 120000, maxMs: 1800000, mult: 2, gemMult: 5, gemMs: 300000 },
    frenzy: { perTap: 0.065, decayPerSec: 0.45, holdMs: 500, durationMs: 7000, tapMult: 3 },
    gift: { cooldownMs: 240000, minutes: 10 },                // подарок за видео: 10 минут дохода
    golden: { firstMs: 22000, minMs: 45000, maxMs: 90000, lifeMs: 13000 },
    daily: { gems: [3, 5, 8, 12, 16, 22, 40], gelMinutes: [2, 4, 6, 8, 10, 15, 30] },
    gemVideo: { gems: 10, cooldownMs: 180000 },
    gemShop: [
      { id: 'warp1',  cost: 25,  hours: 1 },
      { id: 'warp8',  cost: 160, hours: 8 },
      { id: 'turbo',  cost: 40 }
    ],
    // Стадии эволюции: порог по накопленному за всё время желе, множитель дохода, награда кристаллами
    stages: [
      { at: 0,    mult: 1,   gems: 0,  ru: 'Капелька',    en: 'Droplet' },
      { at: 300,  mult: 1.5, gems: 5,  ru: 'Слайм',       en: 'Slime' },
      { at: 2e4,  mult: 2,   gems: 10, ru: 'Рыцарь',      en: 'Knight' },
      { at: 1e6,  mult: 3,   gems: 15, ru: 'Маг',         en: 'Wizard' },
      { at: 6e7,  mult: 4,   gems: 25, ru: 'Дракон',      en: 'Dragon' },
      { at: 4e9,  mult: 6,   gems: 40, ru: 'Космонавт',   en: 'Astronaut' },
      { at: 3e11, mult: 10,  gems: 75, ru: 'Бог слаймов', en: 'Slime God' }
    ]
  },

  // Внутриигровые покупки. id должны совпадать с товарами в консоли Яндекс Игр.
  shop: {
    products: [
      { id: 'gems_100',   type: 'gems', gems: 100 },
      { id: 'gems_550',   type: 'gems', gems: 550,  badge: '+10%' },
      { id: 'gems_1800',  type: 'gems', gems: 1800, badge: '+20%' },
      { id: 'x2_forever', type: 'x2' },     // непотребляемый: доход x2 навсегда
      { id: 'no_ads',     type: 'noads' }   // непотребляемый: отключает межстраничную рекламу
    ],
    devPrices: { gems_100: '30 Ян', gems_550: '150 Ян', gems_1800: '450 Ян', x2_forever: '199 Ян', no_ads: '99 Ян' },
    maxStoredTokens: 30
  }
};

// Производители (пассивный доход в секунду). Эмодзи старые (Unicode ≤ 9), чтобы рисовались на любых устройствах.
export const GENS = [
  { id: 'drop',     emoji: '💧', baseCost: 15,      baseCps: 0.1,    ru: 'Капельница',      en: 'Dripper' },
  { id: 'worm',     emoji: '🐛', baseCost: 100,     baseCps: 1,      ru: 'Червячок',        en: 'Little worm' },
  { id: 'mushroom', emoji: '🍄', baseCost: 1100,    baseCps: 8,      ru: 'Грибная ферма',   en: 'Mushroom farm' },
  { id: 'lab',      emoji: '⚗️', baseCost: 12000,   baseCps: 47,     ru: 'Лаборатория',     en: 'Laboratory' },
  { id: 'volcano',  emoji: '🌋', baseCost: 130000,  baseCps: 260,    ru: 'Вулкан',          en: 'Volcano' },
  { id: 'castle',   emoji: '🏰', baseCost: 1.4e6,   baseCps: 1400,   ru: 'Замок слаймов',   en: 'Slime castle' },
  { id: 'dragon',   emoji: '🐉', baseCost: 2e7,     baseCps: 7800,   ru: 'Дракон-несушка',  en: 'Egg dragon' },
  { id: 'rocket',   emoji: '🚀', baseCost: 3.3e8,   baseCps: 44000,  ru: 'Ракета',          en: 'Rocket' },
  { id: 'portal',   emoji: '🌀', baseCost: 5.1e9,   baseCps: 2.6e5,  ru: 'Портал',          en: 'Portal' },
  { id: 'planet',   emoji: '🌎', baseCost: 7.5e10,  baseCps: 1.6e6,  ru: 'Планета желе',    en: 'Jelly planet' },
  { id: 'star',     emoji: '⭐', baseCost: 1e12,    baseCps: 1e7,    ru: 'Звезда',          en: 'Star' },
  { id: 'hole',     emoji: '🕳️', baseCost: 1.4e13,  baseCps: 6.5e7,  ru: 'Чёрная дыра',     en: 'Black hole' }
];

// ---------- Локализация ----------
const I18N = {
  ru: {
    loading: 'Загрузка', tapHint: 'Тапай по слайму!', perSec: '{n}/сек',
    upgrades: 'Улучшения', crystals: 'Кристаллы', rebirth: 'Рождение',
    tapPower: 'Сила тапа', tapPowerDesc: '+{n} желе за тап', level: 'Ур. {n}', owned: 'Есть: {n}',
    locked: 'Откроется за {n}', milestone: 'x2 на {n}', buy: 'КУПИТЬ', maxBuy: 'МАКС', noMoney: 'Не хватает желе', noGems: 'Не хватает кристаллов',
    stage: 'Стадия', evolveTo: 'Эволюция: {name}', nextStage: 'до «{name}»', maxStage: 'Максимальная стадия!',
    evolution: 'ЭВОЛЮЦИЯ!', evolvedInto: 'Ты стал: {name}', bonusAll: 'Весь доход x{n}', claim: 'ЗАБРАТЬ', claimX2: 'x2 ЗА ВИДЕО',
    offlineTitle: 'С возвращением!', offlineText: 'Пока тебя не было, слайм накопил', offlineTime: 'Тебя не было: {t}',
    dailyTitle: 'Ежедневный подарок', dailyDay: 'День {n}', dailyStreak: 'Заходи каждый день — награды растут!',
    boost: 'x2', boostName: 'Ускорение', boostActive: 'x{n}  {t}', watchAd: 'ВИДЕО', gift: 'ПОДАРОК', giftWait: '{t}',
    free: 'БЕСПЛАТНО', golden: 'Золотой пузырь!', frenzy: 'ЯРОСТЬ!', combo: 'КОМБО',
    goldLucky: 'Удача! +{n}', goldFrenzy: 'Золотая лихорадка x7!', goldStorm: 'Тап-шторм x10!', goldGems: '+{n} кристаллов!',
    gemVideo: '+{n} кристаллов', gemVideoDesc: 'Посмотри короткое видео', warp: 'Перемотка {h} ч', warpDesc: 'Мгновенно получи доход за {h} ч',
    turbo: 'Турбо x5', turboDesc: 'Доход и тапы x5 на 5 минут', shopBtn: 'Купить кристаллы', shopDesc: 'Кристаллы и вечные бонусы',
    rebirthTitle: 'Перерождение', rebirthDesc: 'Начни заново и получи эссенцию: каждая даёт +10% к доходу навсегда. Стадия и кристаллы сохраняются.',
    essence: 'Эссенция: {n}', essenceGain: 'Получишь: +{n}', rebirthBtn: 'ПЕРЕРОДИТЬСЯ', rebirthLock: 'Накопи ещё {n} желе за это рождение',
    rebirthConfirm: 'Сбросить желе и улучшения ради +{n} эссенции?', rebirthDone: 'Новое рождение! +{n} эссенции', yes: 'ДА', no: 'НЕТ',
    shop: 'МАГАЗИН', gemsN: '{n} кристаллов', noAds: 'Без рекламы', noAdsDesc: 'Без видео между действиями',
    x2Forever: 'Доход x2 навсегда', x2Desc: 'Весь доход и тапы удваиваются', ownedShort: 'КУПЛЕНО', close: 'ЗАКРЫТЬ',
    payUnavailable: 'Покупки сейчас недоступны', purchased: 'Спасибо за покупку!', purchaseFail: 'Покупка не удалась', shopLoading: 'Загрузка товаров…',
    adFail: 'Видео сейчас недоступно', adSoon: 'Видео через {n}…', ok: 'ОК', thanks: 'Спасибо!',
    tabNew: 'Новое', gelPerTap: '+{n}', soundOn: 'Звук', maxed: 'МАКС'
  },
  en: {
    loading: 'Loading', tapHint: 'Tap the slime!', perSec: '{n}/sec',
    upgrades: 'Upgrades', crystals: 'Crystals', rebirth: 'Rebirth',
    tapPower: 'Tap power', tapPowerDesc: '+{n} jelly per tap', level: 'Lv. {n}', owned: 'Owned: {n}',
    locked: 'Unlocks at {n}', milestone: 'x2 at {n}', buy: 'BUY', maxBuy: 'MAX', noMoney: 'Not enough jelly', noGems: 'Not enough crystals',
    stage: 'Stage', evolveTo: 'Evolution: {name}', nextStage: 'to "{name}"', maxStage: 'Max stage reached!',
    evolution: 'EVOLUTION!', evolvedInto: 'You became: {name}', bonusAll: 'All income x{n}', claim: 'CLAIM', claimX2: 'x2 FOR VIDEO',
    offlineTitle: 'Welcome back!', offlineText: 'While you were away, your slime made', offlineTime: 'Away for: {t}',
    dailyTitle: 'Daily gift', dailyDay: 'Day {n}', dailyStreak: 'Come back every day — rewards grow!',
    boost: 'x2', boostName: 'Boost', boostActive: 'x{n}  {t}', watchAd: 'VIDEO', gift: 'GIFT', giftWait: '{t}',
    free: 'FREE', golden: 'Golden bubble!', frenzy: 'FRENZY!', combo: 'COMBO',
    goldLucky: 'Lucky! +{n}', goldFrenzy: 'Golden rush x7!', goldStorm: 'Tap storm x10!', goldGems: '+{n} crystals!',
    gemVideo: '+{n} crystals', gemVideoDesc: 'Watch a short video', warp: 'Time warp {h} h', warpDesc: 'Instantly get {h} h of income',
    turbo: 'Turbo x5', turboDesc: 'Income and taps x5 for 5 minutes', shopBtn: 'Buy crystals', shopDesc: 'Crystals and forever bonuses',
    rebirthTitle: 'Rebirth', rebirthDesc: 'Start over and gain essence: each point gives +10% income forever. Stage and crystals are kept.',
    essence: 'Essence: {n}', essenceGain: 'You will get: +{n}', rebirthBtn: 'REBIRTH', rebirthLock: 'Earn {n} more jelly in this life',
    rebirthConfirm: 'Reset jelly and upgrades for +{n} essence?', rebirthDone: 'Reborn! +{n} essence', yes: 'YES', no: 'NO',
    shop: 'SHOP', gemsN: '{n} crystals', noAds: 'No ads', noAdsDesc: 'No videos between actions',
    x2Forever: 'Income x2 forever', x2Desc: 'All income and taps doubled', ownedShort: 'OWNED', close: 'CLOSE',
    payUnavailable: 'Purchases are unavailable right now', purchased: 'Thank you!', purchaseFail: 'Purchase failed', shopLoading: 'Loading products…',
    adFail: 'Video unavailable right now', adSoon: 'Video in {n}…', ok: 'OK', thanks: 'Thanks!',
    tabNew: 'New', gelPerTap: '+{n}', soundOn: 'Sound', maxed: 'MAX'
  }
};

let currentLang = 'ru';
export function setLang(code) {
  code = String(code || 'ru').toLowerCase().slice(0, 2);
  currentLang = ['ru', 'be', 'kk', 'uk', 'uz', 'hy', 'az', 'ka', 'tg', 'ky', 'tk'].includes(code) ? 'ru' : 'en';
}
export function getLang() { return currentLang; }
export function t(key, vars) {
  let s = (I18N[currentLang] && I18N[currentLang][key]) || I18N.ru[key] || key;
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
}
export function lname(obj) { return obj[currentLang === 'ru' ? 'ru' : 'en']; }

// ---------- Конфигурация Phaser ----------
export function createGameConfig(scenes) {
  return {
    type: Phaser.AUTO, // WebGL, при его отсутствии — Canvas
    parent: 'game-container',
    backgroundColor: '#1a1040',
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
    render: { antialias: true, powerPreference: 'high-performance', roundPixels: false },
    input: { activePointers: 4 },
    disableContextMenu: true,
    banner: false,
    scene: scenes
  };
}
