// Форматирование больших чисел и времени.
import { getLang } from './config.js';

const SUF_RU = ['', ' тыс', ' млн', ' млрд', ' трлн', ' квдр', ' квнт', ' скст', ' спт', ' окт', ' нон', ' дец'];
const SUF_TR = ['', ' bin', ' Mn', ' Mr', ' Tn', ' Kt', ' Kn', ' Sks', ' Spt', ' Okt', ' Non', ' Des'];
const SUF_EN = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

function trim(x, digits) {
  // 3 значащие цифры: 1.23 / 12.3 / 123
  const s = x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(digits > 1 ? 1 : 0) : x.toFixed(digits > 1 ? 2 : 1);
  const out = s.indexOf('.') >= 0 ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
  return getLang() === 'en' ? out : out.replace('.', ',');
}

export function fmt(n) {
  if (!isFinite(n)) return '∞';
  if (n < 0) return '-' + fmt(-n);
  if (n < 1000) {
    if (n < 10 && Math.abs(n - Math.round(n)) > 1e-9) return trim(n, 1);
    return String(Math.floor(n + 1e-9));
  }
  const lang = getLang();
  const sufs = lang === 'ru' ? SUF_RU : lang === 'tr' ? SUF_TR : SUF_EN;
  const tier = Math.floor(Math.log10(n) / 3);
  if (tier >= sufs.length) {
    const e = Math.floor(Math.log10(n));
    return (n / Math.pow(10, e)).toFixed(2) + 'e' + e;
  }
  return trim(n / Math.pow(1000, tier), 3) + sufs[tier];
}

// Целое число с разделителями разрядов: 1800 -> «1 800» / «1,800» / «1.800»
export function fmtInt(n) {
  const lang = getLang();
  const group = lang === 'ru' ? '\u00a0' : lang === 'tr' ? '.' : ',';
  return String(Math.floor(Math.max(0, n) + 1e-6)).replace(/\B(?=(\d{3})+(?!\d))/g, group);
}

// Счётчик желе в шапке: до 100 тысяч — с двумя знаками после запятой (видно, как «капает» в реальном времени),
// до миллиарда — целое с разделителями разрядов, дальше — сокращение (млн, млрд…).
export function fmtGel(n) {
  if (!isFinite(n)) return '∞';
  if (n < 0) n = 0;
  if (n >= 1e9) return fmt(n);
  const lang = getLang();
  const group = lang === 'ru' ? '\u00a0' : lang === 'tr' ? '.' : ',';
  const dec = lang === 'en' ? '.' : ',';
  const withGroups = (int) => String(int).replace(/\B(?=(\d{3})+(?!\d))/g, group);
  if (n >= 1e5) return withGroups(Math.floor(n + 1e-6));
  const cents = Math.floor(n * 100 + 1e-6);          // отбрасываем, а не округляем: число не «перепрыгивает» вперёд
  const int = Math.floor(cents / 100), frac = String(cents % 100).padStart(2, '0');
  return withGroups(int) + dec + frac;
}

// 3725 -> «1:02:05», 75 -> «1:15»
export function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const p = (v) => String(v).padStart(2, '0');
  return h > 0 ? h + ':' + p(m) + ':' + p(s) : m + ':' + p(s);
}

// Человеческая длительность для «тебя не было»: 2 ч 5 мин
export function fmtAway(sec) {
  sec = Math.max(0, Math.floor(sec));
  const lang = getLang();
  const U = lang === 'ru' ? [' д', ' ч', ' мин'] : lang === 'tr' ? [' g', ' sa', ' dk'] : [' d', ' h', ' min'];
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
  const parts = [];
  if (d) parts.push(d + U[0]);
  if (h) parts.push(h + U[1]);
  if (m || !parts.length) parts.push(m + U[2]);
  return parts.slice(0, 2).join(' ');
}
