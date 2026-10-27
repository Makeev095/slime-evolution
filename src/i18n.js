// Локализация: русский, английский, турецкий. Язык берётся из Яндекс SDK (environment.i18n.lang),
// игрок может сменить его кнопкой с флагом. Без зависимостей — модуль работает и в Node (тесты).

const I18N = {
  ru: {
    loading: 'Загрузка', tapHint: 'Тапай по слайму!', perSec: '{n}/сек',
    upgrades: 'Улучшения', crystals: 'Кристаллы', rebirth: 'Рождение',
    tapPower: 'Сила тапа', tapPowerDesc: '+{n} желе за тап', level: 'Ур. {n}', owned: 'Есть: {n}',
    locked: 'Продолжай копить желе…', milestone: 'x2 на {n}', buy: 'КУПИТЬ', maxBuy: 'МАКС', noMoney: 'Не хватает желе', noGems: 'Не хватает кристаллов',
    stage: 'Стадия', evolveTo: 'Эволюция: {name}', nextStage: 'до «{name}»', maxStage: 'Максимальная стадия!',
    evolution: 'ЭВОЛЮЦИЯ!', evolvedInto: 'Ты стал: {name}', bonusAll: 'Весь доход x{n}', claim: 'ЗАБРАТЬ', claimX2: 'x2 ЗА ВИДЕО',
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
    paused: 'Пауза: желе капает, только пока ты в игре. Нажми на экран!', gameTitle: 'СЛАЙМ: ЭВОЛЮЦИЯ', language: 'Язык', tabNew: 'Новое', gelPerTap: '+{n}', soundOn: 'Звук', maxed: 'МАКС'
  },
  en: {
    loading: 'Loading', tapHint: 'Tap the slime!', perSec: '{n}/sec',
    upgrades: 'Upgrades', crystals: 'Crystals', rebirth: 'Rebirth',
    tapPower: 'Tap power', tapPowerDesc: '+{n} jelly per tap', level: 'Lv. {n}', owned: 'Owned: {n}',
    locked: 'Keep collecting jelly…', milestone: 'x2 at {n}', buy: 'BUY', maxBuy: 'MAX', noMoney: 'Not enough jelly', noGems: 'Not enough crystals',
    stage: 'Stage', evolveTo: 'Evolution: {name}', nextStage: 'to "{name}"', maxStage: 'Max stage reached!',
    evolution: 'EVOLUTION!', evolvedInto: 'You became: {name}', bonusAll: 'All income x{n}', claim: 'CLAIM', claimX2: 'x2 FOR VIDEO',
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
    paused: 'Paused: jelly only drips while you are in the game. Tap the screen!', gameTitle: 'SLIME EVOLUTION', language: 'Language', tabNew: 'New', gelPerTap: '+{n}', soundOn: 'Sound', maxed: 'MAX'
  },
  tr: {
    loading: 'Yükleniyor', tapHint: "Slime'a dokun!", perSec: '{n}/sn',
    upgrades: 'Geliştirmeler', crystals: 'Kristaller', rebirth: 'Yeniden doğuş',
    tapPower: 'Dokunuş gücü', tapPowerDesc: 'Dokunuş başına +{n} jöle', level: 'Sv. {n}', owned: 'Sahip: {n}',
    locked: 'Jöle toplamaya devam et…', milestone: '{n} adette x2', buy: 'AL', maxBuy: 'MAKS', noMoney: 'Yeterli jöle yok', noGems: 'Yeterli kristal yok',
    stage: 'Aşama', evolveTo: 'Evrim: {name}', nextStage: '«{name}» aşamasına', maxStage: 'Son aşamaya ulaştın!',
    evolution: 'EVRİM!', evolvedInto: 'Artık sen: {name}', bonusAll: 'Tüm gelir x{n}', claim: 'AL', claimX2: 'VİDEOYLA x2',
    dailyTitle: 'Günlük hediye', dailyDay: '{n}. gün', dailyStreak: 'Her gün gel — ödüller büyüyor!',
    boost: 'x2', boostName: 'Hızlandırma', boostActive: 'x{n}  {t}', watchAd: 'VİDEO', gift: 'HEDİYE', giftWait: '{t}',
    free: 'ÜCRETSİZ', golden: 'Altın balon!', frenzy: 'ÖFKE!', combo: 'KOMBO',
    goldLucky: 'Şans! +{n}', goldFrenzy: 'Altın hücum x7!', goldStorm: 'Dokunuş fırtınası x10!', goldGems: '+{n} kristal!',
    gemVideo: '+{n} kristal', gemVideoDesc: 'Kısa bir video izle', warp: '{h} saat ileri sar', warpDesc: '{h} saatlik geliri hemen al',
    turbo: 'Turbo x5', turboDesc: '5 dakika boyunca gelir ve dokunuşlar x5', shopBtn: 'Kristal satın al', shopDesc: 'Kristaller ve kalıcı bonuslar',
    rebirthTitle: 'Yeniden doğuş', rebirthDesc: 'Baştan başla ve öz kazan: her puan kalıcı olarak %10 gelir verir. Aşama ve kristaller korunur.',
    essence: 'Öz: {n}', essenceGain: 'Kazanacağın: +{n}', rebirthBtn: 'YENİDEN DOĞ', rebirthLock: 'Bu hayatta {n} jöle daha topla',
    rebirthConfirm: '+{n} öz için jöle ve geliştirmeler sıfırlansın mı?', rebirthDone: 'Yeniden doğdun! +{n} öz', yes: 'EVET', no: 'HAYIR',
    shop: 'MAĞAZA', gemsN: '{n} kristal', noAds: 'Reklamsız', noAdsDesc: 'Eylemler arasında video yok',
    x2Forever: 'Gelir x2 kalıcı', x2Desc: 'Tüm gelir ve dokunuşlar ikiye katlanır', ownedShort: 'ALINDI', close: 'KAPAT',
    payUnavailable: 'Satın alma şu an kullanılamıyor', purchased: 'Satın aldığın için teşekkürler!', purchaseFail: 'Satın alma başarısız', shopLoading: 'Ürünler yükleniyor…',
    adFail: 'Video şu an kullanılamıyor', adSoon: 'Video {n} sn sonra…', ok: 'TAMAM', thanks: 'Teşekkürler!',
    paused: 'Duraklatıldı: jöle sadece oyundayken birikir. Ekrana dokun!', gameTitle: 'SLIME EVRİMİ', language: 'Dil', tabNew: 'Yeni', gelPerTap: '+{n}', soundOn: 'Ses', maxed: 'MAKS'
  }
};

export const LANGS = ['ru', 'en', 'tr'];
export const LANG_NAMES = { ru: 'Русский', en: 'English', tr: 'Türkçe' };
const RU_GROUP = ['ru', 'be', 'kk', 'uk', 'uz', 'hy', 'az', 'ka', 'tg', 'ky', 'tk'];

let currentLang = 'ru';
// Принимает код языка SDK/браузера ('ru', 'tr-TR', 'en_US'…) и выбирает один из поддерживаемых
export function setLang(code) {
  code = String(code || 'ru').toLowerCase().slice(0, 2);
  currentLang = RU_GROUP.includes(code) ? 'ru' : code === 'tr' ? 'tr' : 'en';
  return currentLang;
}
export function getLang() { return currentLang; }
export function t(key, vars) {
  let s = (I18N[currentLang] && I18N[currentLang][key]) || I18N.en[key] || I18N.ru[key] || key;
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
}
// Название из объекта вида { ru, en, tr }
export function lname(obj) { return obj[currentLang] || obj.en; }
export const hasKey = (lang, key) => !!(I18N[lang] && I18N[lang][key]);
export const allKeys = (lang) => Object.keys(I18N[lang] || {});
