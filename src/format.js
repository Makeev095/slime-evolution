// Форматирование больших чисел и времени.
import { getLang } from './config.js';

const SUF_RU = ['', ' тыс', ' млн', ' млрд', ' трлн', ' квдр', ' квнт', ' скст', ' спт', ' окт', ' нон', ' дец'];
const SUF_EN = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

function trim(x, digits) {
  // 3 значащие цифры: 1.23 / 12.3 / 123
  const s = x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(digits > 1 ? 1 : 0) : x.toFixed(digits > 1 ? 2 : 1);
  const out = s.indexOf('.') >= 0 ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
  return getLang() === 'ru' ? out.replace('.', ',') : out;
}

export function fmt(n) {
  if (!isFinite(n)) return '∞';
  if (n < 0) return '-' + fmt(-n);
  if (n < 1000) {
    if (n < 10 && Math.abs(n - Math.round(n)) > 1e-9) return trim(n, 1);
    return String(Math.floor(n + 1e-9));
  }
  const sufs = getLang() === 'ru' ? SUF_RU : SUF_EN;
  const tier = Math.floor(Math.log10(n) / 3);
  if (tier >= sufs.length) {
    const e = Math.floor(Math.log10(n));
    return (n / Math.pow(10, e)).toFixed(2) + 'e' + e;
  }
  return trim(n / Math.pow(1000, tier), 3) + sufs[tier];
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
  const ru = getLang() === 'ru';
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
  const parts = [];
  if (d) parts.push(d + (ru ? ' д' : ' d'));
  if (h) parts.push(h + (ru ? ' ч' : ' h'));
  if (m || !parts.length) parts.push(m + (ru ? ' мин' : ' min'));
  return parts.slice(0, 2).join(' ');
}
