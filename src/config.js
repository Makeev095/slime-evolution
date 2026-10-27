// Настройки игры, баланс, данные для улучшений и локализация. Никакой зависимости от Phaser —
// модуль можно импортировать и в Node (тесты экономики).

export const DESIGN = { W: 600, H: 1000 }; // логическое «окно» игры; камера масштабирует его под любой экран

export const CONFIG = {
  storageKey: 'slime_evolution_save_v1',

  ads: {
    interstitialIntervalMs: 120000, // межстраничная реклама не чаще раза в 2 минуты...
    // ...но в поздней игре (большой доход, дальние стадии) пауза между роликами короче: так игроку интереснее досматривать финал.
    // Индекс = стадия эволюции.
    intervalByStageMs: [120000, 120000, 120000, 120000, 105000, 90000, 75000],
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
    essence: { divisor: 5e7, power: 0.34, perPoint: 0.1 },     // эссенция = (желе за забег / divisor)^power; +10% к доходу за очко
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
      { at: 0,    mult: 1,   gems: 0,  ru: 'Капелька',    en: 'Droplet', tr: 'Damla' },
      { at: 300,  mult: 1.5, gems: 5,  ru: 'Слайм',       en: 'Slime', tr: 'Slime' },
      { at: 2e4,  mult: 2,   gems: 10, ru: 'Рыцарь',      en: 'Knight', tr: 'Şövalye' },
      { at: 1e6,  mult: 3,   gems: 15, ru: 'Маг',         en: 'Wizard', tr: 'Büyücü' },
      { at: 6e7,  mult: 4,   gems: 25, ru: 'Дракон',      en: 'Dragon', tr: 'Ejderha' },
      { at: 4e9,  mult: 6,   gems: 40, ru: 'Космонавт',   en: 'Astronaut', tr: 'Astronot' },
      { at: 5e12, mult: 10,  gems: 75, ru: 'Бог слаймов', en: 'Slime God', tr: 'Slime Tanrısı' }
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
  { id: 'drop',     emoji: '💧', baseCost: 15,      baseCps: 0.1,    ru: 'Капельница',      en: 'Dripper', tr: 'Damlatıcı' },
  { id: 'worm',     emoji: '🐛', baseCost: 100,     baseCps: 1,      ru: 'Червячок',        en: 'Little worm', tr: 'Solucan' },
  { id: 'mushroom', emoji: '🍄', baseCost: 1100,    baseCps: 8,      ru: 'Грибная ферма',   en: 'Mushroom farm', tr: 'Mantar çiftliği' },
  { id: 'lab',      emoji: '⚗️', baseCost: 12000,   baseCps: 47,     ru: 'Лаборатория',     en: 'Laboratory', tr: 'Laboratuvar' },
  { id: 'volcano',  emoji: '🌋', baseCost: 130000,  baseCps: 260,    ru: 'Вулкан',          en: 'Volcano', tr: 'Yanardağ' },
  { id: 'castle',   emoji: '🏰', baseCost: 1.4e6,   baseCps: 1400,   ru: 'Замок слаймов',   en: 'Slime castle', tr: 'Slime kalesi' },
  { id: 'dragon',   emoji: '🐉', baseCost: 2e7,     baseCps: 7800,   ru: 'Дракон-несушка',  en: 'Egg dragon', tr: 'Yumurtlayan ejderha' },
  { id: 'rocket',   emoji: '🚀', baseCost: 3.3e8,   baseCps: 44000,  ru: 'Ракета',          en: 'Rocket', tr: 'Roket' },
  { id: 'portal',   emoji: '🌀', baseCost: 6e9,     baseCps: 2.6e5,  ru: 'Портал',          en: 'Portal', tr: 'Portal' },
  { id: 'planet',   emoji: '🌎', baseCost: 1.5e11,  baseCps: 1.6e6,  ru: 'Планета желе',    en: 'Jelly planet', tr: 'Jöle gezegeni' },
  { id: 'star',     emoji: '⭐', baseCost: 2e13,    baseCps: 2e7,    ru: 'Звезда',          en: 'Star', tr: 'Yıldız' },
  { id: 'hole',     emoji: '🕳️', baseCost: 6e15,    baseCps: 2e8,    ru: 'Чёрная дыра',     en: 'Black hole', tr: 'Kara delik' }
];

export { LANGS, LANG_NAMES, setLang, getLang, t, lname } from './i18n.js';

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
