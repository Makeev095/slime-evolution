// Процедурная графика: слаймы всех стадий, иконки, фоны. Всё рисуется на canvas при загрузке — файлов-картинок нет.

import { GENS } from './config.js';

const TAU = Math.PI * 2;

export function makeCanvas(w, h) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  return [cv, cv.getContext('2d')];
}

function rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function shade(h, amt, alpha = 1) {
  const [r, g, b] = rgb(h);
  const target = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  const m = (v) => Math.round((target - v) * p + v);
  return `rgba(${m(r)},${m(g)},${m(b)},${alpha})`;
}
export function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function star(ctx, cx, cy, ro, ri, n = 5, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n;
    const r = i % 2 ? ri : ro;
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
}

// ---------- Слаймы ----------
export const STAGE_ART = [
  { base: '#5ee0ff', w: 190, h: 235, drop: true },
  { base: '#6df06a', w: 250, h: 205 },
  { base: '#79b8ff', w: 268, h: 215 },
  { base: '#b985ff', w: 280, h: 220 },
  { base: '#ff7d4f', w: 296, h: 232 },
  { base: '#3fe3cf', w: 296, h: 236 },
  { base: '#ffd84a', w: 306, h: 244 }
];
export const SLIME_SIZE = 440;

function bodyPath(ctx, cx, bottom, w, h, drop) {
  const top = bottom - h;
  ctx.beginPath();
  if (drop) {
    ctx.moveTo(cx, top);
    ctx.bezierCurveTo(cx + w * 0.1, top + h * 0.25, cx + w * 0.5, bottom - h * 0.52, cx + w * 0.5, bottom - h * 0.27);
    ctx.bezierCurveTo(cx + w * 0.5, bottom + 2, cx + w * 0.22, bottom, cx, bottom);
    ctx.bezierCurveTo(cx - w * 0.22, bottom, cx - w * 0.5, bottom + 2, cx - w * 0.5, bottom - h * 0.27);
    ctx.bezierCurveTo(cx - w * 0.5, bottom - h * 0.52, cx - w * 0.1, top + h * 0.25, cx, top);
  } else {
    const l = cx - w / 2, r = cx + w / 2;
    ctx.moveTo(l, bottom - h * 0.25);
    ctx.bezierCurveTo(l - w * 0.02, top + h * 0.22, cx - w * 0.34, top, cx, top);
    ctx.bezierCurveTo(cx + w * 0.34, top, r + w * 0.02, top + h * 0.22, r, bottom - h * 0.25);
    ctx.bezierCurveTo(r, bottom + 2, r - w * 0.08, bottom, r - w * 0.22, bottom);
    ctx.lineTo(l + w * 0.22, bottom);
    ctx.bezierCurveTo(l + w * 0.08, bottom, l, bottom + 2, l, bottom - h * 0.25);
  }
  ctx.closePath();
}

function drawFace(ctx, cx, faceY, w, happy, stage) {
  const ex = w * 0.19, er = w * 0.078;
  const dark = '#1b1340';
  if (happy) {
    ctx.strokeStyle = dark; ctx.lineWidth = w * 0.03; ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + s * ex - er, faceY + er * 0.5);
      ctx.lineTo(cx + s * ex, faceY - er * 0.5);
      ctx.lineTo(cx + s * ex + er, faceY + er * 0.5);
      ctx.stroke();
    }
    // открытый рот
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.ellipse(cx, faceY + w * 0.15, w * 0.1, w * 0.085, 0, 0, Math.PI, false); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff6b8a';
    ctx.beginPath(); ctx.ellipse(cx, faceY + w * 0.2, w * 0.055, w * 0.03, 0, 0, Math.PI, false); ctx.fill();
  } else {
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(cx + s * ex, faceY, er * 1.1, er * 1.3, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = dark;
      ctx.beginPath(); ctx.ellipse(cx + s * ex + s * -er * 0.1, faceY + er * 0.15, er * 0.72, er * 0.95, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(cx + s * ex - er * 0.3, faceY - er * 0.25, er * 0.28, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = dark; ctx.lineWidth = w * 0.026; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, faceY + w * 0.085, w * 0.075, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  }
  // румянец
  ctx.fillStyle = 'rgba(255,90,140,0.4)';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + s * w * 0.31, faceY + w * 0.1, w * 0.06, w * 0.04, 0, 0, TAU); ctx.fill(); }
}

export function drawSlime(ctx, stage, happy) {
  const A = STAGE_ART[stage];
  const cx = SLIME_SIZE / 2, bottom = SLIME_SIZE - 40;
  const { w, h } = A;
  const top = bottom - h;
  const base = A.base;
  ctx.clearRect(0, 0, SLIME_SIZE, SLIME_SIZE);

  // --- детали за телом ---
  if (stage === 6) { // лучи сияния
    ctx.save(); ctx.translate(cx, bottom - h * 0.5);
    for (let i = 0; i < 14; i++) {
      ctx.rotate(TAU / 14);
      const g = ctx.createLinearGradient(0, 0, 0, -210);
      g.addColorStop(0, 'rgba(255,240,150,0.55)'); g.addColorStop(1, 'rgba(255,240,150,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(0, -210); ctx.lineTo(9, 0); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  if (stage === 4 || stage === 6) { // крылья
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(cx + s * w * 0.42, bottom - h * 0.62); ctx.scale(s, 1);
      const col = stage === 4 ? '#b3261e' : '#fffbe6';
      const edge = stage === 4 ? '#6e120d' : '#e8c35a';
      ctx.fillStyle = col; ctx.strokeStyle = edge; ctx.lineWidth = 5; ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(70, -90, 118, -70);
      ctx.quadraticCurveTo(100, -40, 112, -14);
      ctx.quadraticCurveTo(90, -22, 84, 8);
      ctx.quadraticCurveTo(62, -6, 52, 30);
      ctx.quadraticCurveTo(26, 12, 0, 28);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }
  if (stage === 4) { // шипы на спине
    ctx.fillStyle = '#7a1d12';
    for (let i = -2; i <= 2; i++) {
      const x = cx + i * w * 0.15, y = top + h * (0.04 + Math.abs(i) * 0.07);
      ctx.beginPath(); ctx.moveTo(x - 15, y + 14); ctx.lineTo(x, y - 24); ctx.lineTo(x + 15, y + 14); ctx.closePath(); ctx.fill();
    }
  }

  // --- тело ---
  bodyPath(ctx, cx, bottom, w, h, A.drop);
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, shade(base, 0.35)); g.addColorStop(0.55, base); g.addColorStop(1, shade(base, -0.38));
  ctx.fillStyle = g; ctx.fill();
  ctx.save();
  bodyPath(ctx, cx, bottom, w, h, A.drop); ctx.clip();
  // внутреннее свечение снизу, пузырьки
  const gl = ctx.createRadialGradient(cx, bottom, 10, cx, bottom, w * 0.7);
  gl.addColorStop(0, shade(base, 0.55, 0.55)); gl.addColorStop(1, shade(base, 0.55, 0));
  ctx.fillStyle = gl; ctx.fillRect(0, 0, SLIME_SIZE, SLIME_SIZE);
  ctx.fillStyle = shade(base, 0.6, 0.35);
  [[0.24, 0.8, 0.045], [0.33, 0.9, 0.028], [0.78, 0.76, 0.04], [0.7, 0.88, 0.022]].forEach(([fx, fy, fr]) => {
    ctx.beginPath(); ctx.arc(cx - w / 2 + w * fx, top + h * fy, w * fr, 0, TAU); ctx.fill();
  });
  if (stage === 4) { // светлое «пузико»
    ctx.fillStyle = 'rgba(255,225,160,0.55)';
    ctx.beginPath(); ctx.ellipse(cx, bottom - h * 0.14, w * 0.26, h * 0.17, 0, 0, TAU); ctx.fill();
  }
  if (stage === 5) { // звёздочки на теле
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    [[0.2, 0.7, 7], [0.82, 0.62, 9], [0.62, 0.9, 6]].forEach(([fx, fy, r]) => { star(ctx, cx - w / 2 + w * fx, top + h * fy, r, r * 0.42); ctx.fill(); });
  }
  ctx.restore();
  bodyPath(ctx, cx, bottom, w, h, A.drop);
  ctx.strokeStyle = shade(base, -0.45, 0.85); ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.stroke();
  // блик
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.save(); ctx.translate(cx - w * 0.2, top + h * 0.2); ctx.rotate(-0.55);
  ctx.beginPath(); ctx.ellipse(0, 0, w * 0.075, h * 0.12, 0, 0, TAU); ctx.fill(); ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath(); ctx.arc(cx - w * 0.3, top + h * 0.45, w * 0.022, 0, TAU); ctx.fill();

  // --- лицо ---
  drawFace(ctx, cx, A.drop ? top + h * 0.6 : top + h * 0.5, A.drop ? w * 0.95 : w, happy, stage);

  // --- аксессуары спереди ---
  if (stage === 2) { // шлем рыцаря
    const hy = top + h * 0.34;
    ctx.fillStyle = '#d63a3a'; // плюмаж
    ctx.beginPath(); ctx.ellipse(cx, top - 4, 17, 38, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#7a1414'; ctx.lineWidth = 4; ctx.stroke();
    const mg = ctx.createLinearGradient(cx - w * 0.36, 0, cx + w * 0.36, 0);
    mg.addColorStop(0, '#8e99ab'); mg.addColorStop(0.45, '#f1f5fb'); mg.addColorStop(1, '#7b8699');
    ctx.fillStyle = mg;
    ctx.beginPath(); ctx.ellipse(cx, hy, w * 0.37, h * 0.31, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#4a5365'; ctx.lineWidth = 5; ctx.stroke();
    ctx.fillStyle = '#4a5365'; ctx.fillRect(cx - w * 0.37, hy - 2, w * 0.74, 12);
    ctx.fillStyle = '#c9d2e0'; ctx.fillRect(cx - 4, top + h * 0.06, 8, h * 0.26);
  }
  if (stage === 3) { // шляпа мага
    const hy = top + h * 0.2;
    const tipX = cx + w * 0.1, tipY = top - h * 0.62;
    ctx.fillStyle = '#3b2a8f';
    ctx.beginPath(); ctx.moveTo(cx - w * 0.3, hy); ctx.quadraticCurveTo(cx - w * 0.1, tipY + 60, tipX - 6, tipY);
    ctx.quadraticCurveTo(tipX + 30, tipY - 4, tipX + 20, tipY + 24);
    ctx.quadraticCurveTo(cx + w * 0.16, tipY + 80, cx + w * 0.3, hy); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#1f1560'; ctx.lineWidth = 5; ctx.stroke();
    ctx.fillStyle = '#4b37b5';
    ctx.beginPath(); ctx.ellipse(cx, hy + 2, w * 0.43, 20, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd84a'; ctx.fillRect(cx - w * 0.285, hy - 20, w * 0.57, 14);
    ctx.fillStyle = '#ffe98a';
    star(ctx, cx - 6, hy - 78, 11, 4.6); ctx.fill();
    star(ctx, cx + 22, hy - 120, 8, 3.4); ctx.fill();
  }
  if (stage === 4) { // рожки
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#fff1cf'; ctx.strokeStyle = '#a9842f'; ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx + s * w * 0.12, top + h * 0.1);
      ctx.quadraticCurveTo(cx + s * w * 0.3, top - 8, cx + s * w * 0.3, top - 52);
      ctx.quadraticCurveTo(cx + s * w * 0.38, top - 6, cx + s * w * 0.36, top + h * 0.2);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  if (stage === 5) { // шлем космонавта
    const fy = top + h * 0.5, R = w * 0.43;
    ctx.fillStyle = 'rgba(190,235,255,0.2)';
    ctx.beginPath(); ctx.ellipse(cx, fy, R, R * 0.95, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#e8f2ff'; ctx.lineWidth = 12;
    ctx.beginPath(); ctx.ellipse(cx, fy, R, R * 0.95, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#9db4d6'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(cx, fy, R + 6, R * 0.95 + 6, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(cx, fy, R * 0.8, R * 0.76, 0, Math.PI * 1.15, Math.PI * 1.45); ctx.stroke();
    ctx.strokeStyle = '#9db4d6'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(cx + R * 0.55, fy - R * 0.85); ctx.lineTo(cx + R * 0.8, fy - R * 1.35); ctx.stroke();
    ctx.fillStyle = '#ff5b5b'; ctx.beginPath(); ctx.arc(cx + R * 0.8, fy - R * 1.38, 10, 0, TAU); ctx.fill();
  }
  if (stage === 6) { // нимб и корона
    ctx.shadowColor = '#fff3a0'; ctx.shadowBlur = 24;
    ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 11;
    ctx.beginPath(); ctx.ellipse(cx, top - 24, w * 0.27, 15, 0, 0, TAU); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffd23a'; ctx.strokeStyle = '#a56a00'; ctx.lineWidth = 4; ctx.lineJoin = 'round';
    const cy = top + h * 0.08;
    ctx.beginPath(); ctx.moveTo(cx - 52, cy + 30); ctx.lineTo(cx - 58, cy - 20); ctx.lineTo(cx - 26, cy + 4); ctx.lineTo(cx, cy - 34);
    ctx.lineTo(cx + 26, cy + 4); ctx.lineTo(cx + 58, cy - 20); ctx.lineTo(cx + 52, cy + 30); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff4d6d'; ctx.beginPath(); ctx.arc(cx, cy + 14, 8, 0, TAU); ctx.fill();
  }
}

// ---------- Иконки ----------
export function drawGelIcon(ctx, s) {
  const c = s / 2;
  ctx.beginPath();
  ctx.moveTo(c, s * 0.06);
  ctx.bezierCurveTo(c + s * 0.08, s * 0.28, s * 0.88, s * 0.44, s * 0.88, s * 0.64);
  ctx.bezierCurveTo(s * 0.88, s * 0.9, s * 0.68, s * 0.96, c, s * 0.96);
  ctx.bezierCurveTo(s * 0.32, s * 0.96, s * 0.12, s * 0.9, s * 0.12, s * 0.64);
  ctx.bezierCurveTo(s * 0.12, s * 0.44, c - s * 0.08, s * 0.28, c, s * 0.06);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 0, 0, s);
  g.addColorStop(0, '#9af3ff'); g.addColorStop(0.6, '#2fc8f5'); g.addColorStop(1, '#1480c9');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = '#0c5a96'; ctx.lineWidth = s * 0.05; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath(); ctx.ellipse(s * 0.36, s * 0.55, s * 0.07, s * 0.14, 0.35, 0, TAU); ctx.fill();
}

export function drawGemIcon(ctx, s) {
  const p = (x, y) => [s * x, s * y];
  const pts = [p(0.5, 0.06), p(0.88, 0.34), p(0.5, 0.95), p(0.12, 0.34)];
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
  const g = ctx.createLinearGradient(0, 0, s, s);
  g.addColorStop(0, '#d6fbff'); g.addColorStop(0.5, '#4dd2ff'); g.addColorStop(1, '#a24dff');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = '#2b3a9e'; ctx.lineWidth = s * 0.05; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = s * 0.025;
  ctx.beginPath(); ctx.moveTo(s * 0.12, s * 0.34); ctx.lineTo(s * 0.88, s * 0.34);
  ctx.moveTo(s * 0.36, s * 0.34); ctx.lineTo(s * 0.5, s * 0.95); ctx.moveTo(s * 0.64, s * 0.34); ctx.lineTo(s * 0.5, s * 0.95);
  ctx.moveTo(s * 0.36, s * 0.34); ctx.lineTo(s * 0.5, s * 0.06); ctx.moveTo(s * 0.64, s * 0.34); ctx.lineTo(s * 0.5, s * 0.06); ctx.stroke();
}

export function drawGoldenBubble(ctx, s) {
  const c = s / 2, R = s * 0.46;
  const g = ctx.createRadialGradient(c - R * 0.3, c - R * 0.35, R * 0.1, c, c, R);
  g.addColorStop(0, '#fffbe0'); g.addColorStop(0.5, '#ffd23a'); g.addColorStop(1, '#d98a00');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c, c, R, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#a56300'; ctx.lineWidth = s * 0.04; ctx.stroke();
  ctx.fillStyle = '#fff6b0'; ctx.strokeStyle = '#b8750a'; ctx.lineWidth = s * 0.025;
  star(ctx, c, c + s * 0.01, R * 0.55, R * 0.24); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath(); ctx.ellipse(c - R * 0.45, c - R * 0.5, R * 0.14, R * 0.08, -0.7, 0, TAU); ctx.fill();
}

export function drawGiftIcon(ctx, s) {
  const x = s * 0.14, w = s * 0.72;
  ctx.lineJoin = 'round';
  ctx.fillStyle = '#ff5fa2'; ctx.strokeStyle = '#8a1c55'; ctx.lineWidth = s * 0.04;
  rr(ctx, x, s * 0.42, w, s * 0.5, s * 0.06); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ff86bb'; rr(ctx, x - s * 0.03, s * 0.3, w + s * 0.06, s * 0.17, s * 0.05); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffe14d';
  ctx.fillRect(s * 0.455, s * 0.3, s * 0.09, s * 0.62);
  ctx.strokeStyle = '#d99a00'; ctx.lineWidth = s * 0.03;
  ctx.beginPath(); ctx.ellipse(s * 0.38, s * 0.24, s * 0.12, s * 0.07, -0.5, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(s * 0.62, s * 0.24, s * 0.12, s * 0.07, 0.5, 0, TAU); ctx.stroke();
}

export function drawEmoji(ctx, s, emoji) {
  ctx.font = `${Math.floor(s * 0.78)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(emoji, s / 2, s / 2 + s * 0.05);
}

export function drawLock(ctx, s) {
  ctx.fillStyle = '#e8ecf6'; ctx.strokeStyle = '#e8ecf6'; ctx.lineWidth = s * 0.1; ctx.lineCap = 'round';
  rr(ctx, s * 0.22, s * 0.44, s * 0.56, s * 0.42, s * 0.07); ctx.fill();
  ctx.beginPath(); ctx.arc(s / 2, s * 0.42, s * 0.17, Math.PI, 0); ctx.stroke();
  ctx.fillStyle = '#3a3f66'; ctx.beginPath(); ctx.arc(s / 2, s * 0.62, s * 0.06, 0, TAU); ctx.fill();
}

// ---------- Фоны по стадиям ----------
const SKY = [
  ['#2a2d78', '#6a4fc4'], // пещера
  ['#6ed3ff', '#c4f5a8'], // луг
  ['#ff9a6b', '#7a5cc8'], // закат у замка
  ['#24104f', '#8a3fd6'], // волшебная ночь
  ['#2e0b18', '#ff6a2e'], // вулкан
  ['#04061c', '#2b2a7a'], // космос
  ['#ffe9a8', '#ff9fd8']  // небеса
];
export const SKY_COLORS = SKY;

// Вертикальный градиент, «растянутый» так, что на экране виден ровно в зоне дизайна 1000px (см. PlayScene.addSky)
export function drawSky(ctx, h, stage) {
  const [a, b] = SKY[stage];
  ctx.fillStyle = a; ctx.fillRect(0, 0, 8, h * 0.4);
  const g = ctx.createLinearGradient(0, h * 0.4, 0, h * 0.6);
  g.addColorStop(0, a); g.addColorStop(1, b);
  ctx.fillStyle = g; ctx.fillRect(0, h * 0.4, 8, h * 0.2);
  ctx.fillStyle = b; ctx.fillRect(0, h * 0.6, 8, h * 0.4);
}

// Декор фона (Phaser Graphics в координатах дизайна 600x1000, с запасом по ширине для широких экранов)
export function buildDecor(scene, stage) {
  const g = scene.add.graphics();
  let seed = stage * 7919 + 17;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const X0 = -900, X1 = 1500;
  const ell = (x, y, w, h, col, a = 1) => { g.fillStyle(col, a); g.fillEllipse(x, y, w, h); };
  const cloud = (x, y, s, a = 0.85, col = 0xffffff) => {
    ell(x, y, 120 * s, 44 * s, col, a); ell(x - 30 * s, y - 14 * s, 60 * s, 46 * s, col, a); ell(x + 22 * s, y - 20 * s, 70 * s, 54 * s, col, a);
  };
  const glow = (x, y, r, col, a = 0.2) => { for (let k = 4; k >= 1; k--) { g.fillStyle(col, a * 0.35); g.fillCircle(x, y, r * k / 4); } };
  const stars = (n, yMax, col = 0xffffff) => {
    for (let i = 0; i < n; i++) { g.fillStyle(col, 0.35 + rnd() * 0.6); g.fillCircle(X0 + rnd() * (X1 - X0), -400 + rnd() * (yMax + 400), 0.8 + rnd() * 2.2); }
  };

  switch (stage) {
    case 0: { // кристальная пещера
      for (let x = X0; x < X1; x += 70 + rnd() * 50) { // сталактиты
        const h = 60 + rnd() * 150;
        g.fillStyle(0x1b1b55, 1); g.fillTriangle(x, -400, x + 60, -400, x + 30, h);
        g.fillStyle(0x2c2c7d, 1); g.fillTriangle(x + 30, -400, x + 60, -400, x + 30, h);
      }
      for (let i = 0; i < 9; i++) { // светящиеся кристаллы
        const x = X0 + rnd() * (X1 - X0), y = 330 + rnd() * 230, s = 14 + rnd() * 22;
        const col = [0x7df3ff, 0xff7ee8, 0xa98bff][i % 3];
        glow(x, y, s * 2.6, col, 0.5);
        g.fillStyle(col, 0.9); g.fillTriangle(x, y - s * 1.6, x - s * 0.6, y, x + s * 0.6, y);
        g.fillStyle(0xffffff, 0.5); g.fillTriangle(x, y - s * 1.6, x - s * 0.1, y, x + s * 0.6, y);
      }
      ell(300, 760, 1700, 380, 0x3a2a8c, 1);
      break;
    }
    case 1: { // солнечный луг
      glow(100, 130, 150, 0xfff2a0, 0.5);
      g.fillStyle(0xffe14d, 1); g.fillCircle(100, 130, 52);
      cloud(380, 150, 1.1); cloud(560, 260, 0.8); cloud(-120, 280, 1); cloud(820, 120, 1);
      ell(80, 700, 900, 360, 0x62c95b, 1); ell(560, 720, 900, 340, 0x52b84c, 1); ell(-420, 700, 700, 300, 0x58c154, 1); ell(1000, 700, 800, 320, 0x62c95b, 1);
      for (let i = 0; i < 18; i++) { // цветочки
        const x = X0 + rnd() * (X1 - X0), y = 560 + rnd() * 50;
        g.fillStyle([0xff6fb0, 0xffffff, 0xffe14d][i % 3], 1); g.fillCircle(x, y, 5);
      }
      break;
    }
    case 2: { // закат, замок
      glow(450, 400, 200, 0xffd27a, 0.6);
      g.fillStyle(0xfff0b8, 0.9); g.fillCircle(450, 400, 64);
      g.fillStyle(0x4a3a8c, 1); g.fillTriangle(-300, 620, 100, 330, 520, 620); g.fillTriangle(250, 620, 700, 300, 1200, 620);
      g.fillStyle(0x35286e, 1); // замок
      g.fillRect(90, 410, 140, 150); g.fillRect(70, 360, 44, 200); g.fillRect(206, 360, 44, 200); g.fillRect(138, 330, 44, 230);
      g.fillTriangle(66, 360, 118, 360, 92, 312); g.fillTriangle(202, 360, 254, 360, 228, 312); g.fillTriangle(134, 330, 186, 330, 160, 276);
      g.fillStyle(0xffd27a, 0.95); g.fillRect(150, 400, 12, 22); g.fillRect(100, 450, 10, 18); g.fillRect(208, 450, 10, 18);
      cloud(520, 160, 1, 0.55, 0xffc8e8); cloud(-100, 220, 1.1, 0.5, 0xffc8e8); cloud(900, 260, 1, 0.5, 0xffc8e8);
      ell(300, 760, 1700, 320, 0x2c2260, 1);
      break;
    }
    case 3: { // волшебная ночь
      stars(120, 600);
      glow(470, 190, 150, 0xfff3c4, 0.45); g.fillStyle(0xfff3c4, 1); g.fillCircle(470, 190, 56);
      g.fillStyle(0x24104f, 1); g.fillCircle(490, 178, 50);
      g.fillStyle(0xfff3c4, 0.0);
      g.fillStyle(0x180a3a, 1); // башни
      [[60, 130, 360], [180, 100, 410], [440, 110, 390], [560, 90, 430]].forEach(([x, w, y]) => {
        g.fillRect(x, y, w * 0.5, 700 - y); g.fillTriangle(x - 6, y, x + w * 0.5 + 6, y, x + w * 0.25, y - 70);
        g.fillStyle(0xffe27a, 0.9); g.fillRect(x + w * 0.2, y + 40, 9, 16); g.fillStyle(0x180a3a, 1);
      });
      for (let i = 0; i < 7; i++) { // парящие кристаллы
        const x = X0 + rnd() * (X1 - X0), y = 120 + rnd() * 420, s = 10 + rnd() * 14;
        glow(x, y, s * 2.4, 0xff7ee8, 0.5);
        g.fillStyle(0xd78bff, 1); g.fillTriangle(x, y - s * 1.5, x - s, y, x + s, y); g.fillTriangle(x, y + s * 1.5, x - s, y, x + s, y);
      }
      ell(300, 780, 1700, 330, 0x2b1465, 1);
      break;
    }
    case 4: { // вулкан
      g.fillStyle(0x240a14, 1); g.fillTriangle(-200, 640, 300, 200, 800, 640);
      g.fillStyle(0x34101c, 1); g.fillTriangle(300, 200, 800, 640, 420, 640);
      glow(300, 204, 200, 0xff5a1a, 0.4);
      ell(300, 204, 88, 18, 0xff8a2a, 1); ell(300, 202, 52, 9, 0xffd23a, 1);
      g.fillStyle(0xff7a2e, 0.95); // потоки лавы по склонам
      g.fillTriangle(262, 208, 278, 210, 236, 360); g.fillTriangle(322, 210, 338, 208, 372, 330); g.fillTriangle(292, 212, 306, 212, 296, 300);
      g.fillStyle(0x1a0710, 1); g.fillTriangle(-500, 640, -100, 360, 360, 640); g.fillTriangle(560, 640, 980, 380, 1500, 640);
      ell(300, 770, 1700, 340, 0x16050c, 1);
      for (let i = 0; i < 6; i++) { const x = X0 + rnd() * (X1 - X0); g.fillStyle(0xff7a2e, 0.85); g.fillRect(x, 640 + rnd() * 50, 70 + rnd() * 90, 5); }
      break;
    }
    case 5: { // космос
      stars(220, 700);
      glow(130, 220, 230, 0x7a3cff, 0.45); glow(520, 420, 260, 0x23c6ff, 0.35);
      g.fillStyle(0xff9a4d, 1); g.fillCircle(470, 150, 62); g.fillStyle(0xffc487, 1); g.fillCircle(455, 136, 30);
      g.lineStyle(7, 0xffe0a8, 0.9); g.strokeEllipse(470, 154, 190, 40);
      g.fillStyle(0x4d9bff, 1); g.fillCircle(80, 480, 38); g.fillStyle(0x8cd0ff, 0.9); g.fillCircle(70, 470, 15);
      g.fillStyle(0xdde6ff, 1); g.fillCircle(160, 90, 18);
      break;
    }
    default: { // небеса
      g.fillStyle(0xffffff, 0.18);
      for (let i = -3; i < 10; i++) g.fillTriangle(300, -100, 300 + (i - 3) * 190 - 40, 700, 300 + (i - 3) * 190 + 40, 700);
      stars(70, 500, 0xfff8cf);
      cloud(100, 200, 1.4, 0.9); cloud(520, 120, 1.1, 0.9); cloud(-200, 400, 1.3, 0.85); cloud(840, 330, 1.5, 0.85); cloud(300, 520, 1.6, 0.9);
      ell(300, 780, 1800, 340, 0xffffff, 0.95); ell(-200, 740, 800, 300, 0xfff0f8, 1); ell(800, 740, 800, 300, 0xfff0f8, 1);
    }
  }
  return g;
}

// Эмодзи производителей/иконок для списка
export function genEmoji(i) { return GENS[i].emoji; }
