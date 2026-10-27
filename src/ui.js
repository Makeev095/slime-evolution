// Общие UI-хелперы: процедурные текстуры, текст, кнопки, эффекты, адаптивная камера.

import { DESIGN, GENS } from './config.js';
import { Sfx } from './audio.js';
import {
  makeCanvas, rr, shade, drawSlime, SLIME_SIZE, drawGelIcon, drawGemIcon, drawGoldenBubble, drawGiftIcon,
  drawEmoji, drawLock, drawSky, STAGE_ART
} from './art.js';

export const FONT = 'Nunito, "Trebuchet MS", "Segoe UI", Arial, sans-serif';
const TAU = Math.PI * 2;

// ---------- Адаптивность ----------
// Весь игровой мир живёт в координатах 600x1000. Камера масштабирует и центрирует его
// при любом размере окна (portrait / landscape) — без перезагрузки.
export function fitCamera(scene, transparent = false) {
  const apply = () => {
    const cam = scene.cameras.main;
    const w = scene.scale.width;
    const h = scene.scale.height;
    cam.setSize(w, h);
    cam.setZoom(Math.min(w / DESIGN.W, h / DESIGN.H));
    cam.centerOn(DESIGN.W / 2, DESIGN.H / 2);
  };
  scene.cameras.main.setBackgroundColor(transparent ? 'rgba(0,0,0,0)' : '#1a1040');
  apply();
  scene.scale.on('resize', apply);
  scene.events.once('shutdown', () => scene.scale.off('resize', apply));
}

// ---------- Генерация всех текстур (списком задач — для прогресс-бара) ----------
export const BTN_KINDS = {
  green:  ['#9bff7a', '#19a64a', '#0b5d28'],
  blue:   ['#86dcff', '#1a73e8', '#0b3d91'],
  gold:   ['#ffe58a', '#f5a100', '#a15c00'],
  red:    ['#ff9a9a', '#e5383b', '#8a1114'],
  purple: ['#d6a8ff', '#8a42e0', '#4a1a8c'],
  pink:   ['#ffb3dc', '#ec4899', '#9d1f5c'],
  dark:   ['#6a5ca8', '#352a74', '#1a1445'],
  grey:   ['#8a86a8', '#575278', '#2e2a48']
};

export function buildTextureJobs(scene) {
  const jobs = [];
  const put = (key, cv) => { if (scene.textures.exists(key)) scene.textures.remove(key); scene.textures.addCanvas(key, cv); };

  jobs.push(() => { // свечение / частица
    const [cv, ctx] = makeCanvas(64, 64);
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    put('spark', cv);
  });
  jobs.push(() => { // ударная волна
    const [cv, ctx] = makeCanvas(256, 256);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 12; ctx.shadowColor = '#fff'; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(128, 128, 100, 0, TAU); ctx.stroke();
    put('ring', cv);
  });
  jobs.push(() => { // мягкая тень под слаймом
    const [cv, ctx] = makeCanvas(256, 64);
    const g = ctx.createRadialGradient(128, 32, 4, 128, 32, 128);
    g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save(); ctx.scale(1, 0.25); ctx.translate(0, 96); ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256); ctx.restore();
    put('shadow', cv);
  });

  // иконки
  const icon = (key, size, draw) => jobs.push(() => { const [cv, ctx] = makeCanvas(size, size); draw(ctx, size); put(key, cv); });
  icon('gel', 96, drawGelIcon);
  icon('gem', 96, drawGemIcon);
  icon('gold', 160, drawGoldenBubble);
  icon('gift', 112, drawGiftIcon);
  icon('lock', 64, drawLock);
  icon('dot', 32, (ctx, s) => {
    ctx.fillStyle = '#ff3b4e'; ctx.beginPath(); ctx.arc(16, 16, 13, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
  });
  GENS.forEach((G, i) => icon('g' + i, 96, (ctx, s) => drawEmoji(ctx, s, G.emoji)));
  icon('e_cart', 96, (ctx, s) => drawEmoji(ctx, s, '🛒'));
  icon('e_clock', 96, (ctx, s) => drawEmoji(ctx, s, '⏩'));
  icon('e_rocket', 96, (ctx, s) => drawEmoji(ctx, s, '🚀'));
  icon('e_tap', 96, (ctx, s) => drawEmoji(ctx, s, '👆'));
  icon('e_sparkle', 96, (ctx, s) => drawEmoji(ctx, s, '✨'));
  icon('e_video', 96, (ctx, s) => drawEmoji(ctx, s, '🎬'));
  icon('e_noads', 96, (ctx, s) => {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(30, 22); ctx.lineTo(78, 48); ctx.lineTo(30, 74); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ff4d4d'; ctx.lineWidth = 10; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(48, 48, 40, 0, TAU); ctx.moveTo(20, 20); ctx.lineTo(76, 76); ctx.stroke();
  });
  // флаги для выбора языка (круглые)
  const flag = (key, draw) => icon(key, 96, (ctx, s) => {
    ctx.save(); ctx.beginPath(); ctx.arc(48, 48, 44, 0, TAU); ctx.clip();
    draw(ctx);
    ctx.restore();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(48, 48, 44, 0, TAU); ctx.stroke();
  });
  flag('flag_ru', (ctx) => {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 96, 32);
    ctx.fillStyle = '#1c57a5'; ctx.fillRect(0, 32, 96, 32);
    ctx.fillStyle = '#d52b1e'; ctx.fillRect(0, 64, 96, 32);
  });
  flag('flag_en', (ctx) => {
    ctx.fillStyle = '#012169'; ctx.fillRect(0, 0, 96, 96);
    ctx.lineCap = 'butt';
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 18;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(96, 96); ctx.moveTo(96, 0); ctx.lineTo(0, 96); ctx.stroke();
    ctx.strokeStyle = '#c8102e'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(96, 96); ctx.moveTo(96, 0); ctx.lineTo(0, 96); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(38, 0, 20, 96); ctx.fillRect(0, 38, 96, 20);
    ctx.fillStyle = '#c8102e'; ctx.fillRect(42, 0, 12, 96); ctx.fillRect(0, 42, 96, 12);
  });
  flag('flag_tr', (ctx) => {
    ctx.fillStyle = '#e30a17'; ctx.fillRect(0, 0, 96, 96);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(38, 48, 25, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e30a17'; ctx.beginPath(); ctx.arc(46, 48, 20, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 5 : 12, a = -Math.PI / 2 + (i * Math.PI) / 5; ctx.lineTo(64 + Math.cos(a) * r, 48 + Math.sin(a) * r); }
    ctx.closePath(); ctx.fill();
  });
  icon('e_x2', 96, (ctx, s) => {
    ctx.font = 'bold 66px "Trebuchet MS",Arial,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 9; ctx.strokeStyle = '#7a3d00'; ctx.strokeText('x2', 48, 52);
    ctx.fillStyle = '#ffe14d'; ctx.fillText('x2', 48, 52);
  });

  // фоны неба по стадиям
  for (let s = 0; s < STAGE_ART.length; s++) jobs.push(() => { const [cv, ctx] = makeCanvas(8, 512); drawSky(ctx, 512, s); put('sky' + s, cv); });

  // слаймы всех стадий (обычное и «довольное» лицо)
  for (let s = 0; s < STAGE_ART.length; s++) jobs.push(() => {
    for (const happy of [0, 1]) {
      const [cv, ctx] = makeCanvas(SLIME_SIZE, SLIME_SIZE);
      drawSlime(ctx, s, !!happy);
      put('slime' + s + '_' + happy, cv);
    }
  });

  // кнопки
  Object.keys(BTN_KINDS).forEach((k) => jobs.push(() => {
    const [top, bot, edge] = BTN_KINDS[k];
    const W = 640, H = 168;
    const [cv, ctx] = makeCanvas(W, H);
    rr(ctx, 6, 22, W - 12, H - 28, 64); ctx.fillStyle = edge; ctx.fill();
    rr(ctx, 6, 6, W - 12, H - 36, 64);
    const g = ctx.createLinearGradient(0, 6, 0, H - 30);
    g.addColorStop(0, top); g.addColorStop(1, bot);
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); rr(ctx, 6, 6, W - 12, H - 36, 64); ctx.clip();
    const gl = ctx.createLinearGradient(0, 6, 0, 80);
    gl.addColorStop(0, 'rgba(255,255,255,0.5)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gl; ctx.fillRect(0, 6, W, 74);
    ctx.restore();
    rr(ctx, 6, 6, W - 12, H - 36, 64); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 4; ctx.stroke();
    put('btn_' + k, cv);
  }));

  // круглая кнопка + иконки звука
  jobs.push(() => {
    const [cv, ctx] = makeCanvas(160, 160);
    const g = ctx.createLinearGradient(0, 0, 0, 160);
    g.addColorStop(0, '#7a63d6'); g.addColorStop(1, '#31236f');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(80, 80, 74, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(200,190,255,0.8)'; ctx.lineWidth = 6; ctx.stroke();
    put('rbtn', cv);
  });
  const sIcon = (key, draw) => jobs.push(() => {
    const [cv, ctx] = makeCanvas(128, 128);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    draw(ctx); put(key, cv);
  });
  const speaker = (ctx) => { ctx.beginPath(); ctx.moveTo(18, 48); ctx.lineTo(42, 48); ctx.lineTo(70, 24); ctx.lineTo(70, 104); ctx.lineTo(42, 80); ctx.lineTo(18, 80); ctx.closePath(); ctx.fill(); };
  sIcon('ic_snd_on', (ctx) => { speaker(ctx); ctx.beginPath(); ctx.arc(70, 64, 22, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(70, 64, 40, -0.9, 0.9); ctx.stroke(); });
  sIcon('ic_snd_off', (ctx) => { speaker(ctx); ctx.strokeStyle = '#ff6b6b'; ctx.beginPath(); ctx.moveTo(86, 46); ctx.lineTo(116, 82); ctx.moveTo(116, 46); ctx.lineTo(86, 82); ctx.stroke(); });
  sIcon('ic_video', (ctx) => { ctx.beginPath(); ctx.moveTo(34, 20); ctx.lineTo(104, 64); ctx.lineTo(34, 108); ctx.closePath(); ctx.fill(); ctx.stroke(); });

  // панели
  jobs.push(() => { // модальное окно
    const [cv, ctx] = makeCanvas(600, 760);
    rr(ctx, 8, 8, 584, 744, 64);
    const g = ctx.createLinearGradient(0, 0, 0, 760);
    g.addColorStop(0, '#5a3fb8'); g.addColorStop(1, '#251769');
    ctx.fillStyle = g; ctx.fill();
    ctx.shadowColor = '#ff9ae8'; ctx.shadowBlur = 16;
    ctx.strokeStyle = 'rgba(255,170,240,0.85)'; ctx.lineWidth = 5; ctx.stroke();
    put('panel', cv);
  });
  jobs.push(() => { // нижний лист (с запасом вниз для высоких экранов)
    const [cv, ctx] = makeCanvas(64, 512);
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#3b2a8c'); g.addColorStop(1, '#1c1250');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 512);
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(0, 0, 64, 5);
    put('sheet', cv);
  });
  const rowTex = (key, top, bot, stroke, alpha = 1) => jobs.push(() => {
    const [cv, ctx] = makeCanvas(568, 104);
    rr(ctx, 3, 3, 562, 98, 28);
    const g = ctx.createLinearGradient(0, 0, 0, 104);
    g.addColorStop(0, top); g.addColorStop(1, bot);
    ctx.globalAlpha = alpha; ctx.fillStyle = g; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke();
    put(key, cv);
  });
  rowTex('row', '#4d3ba3', '#2f2275', 'rgba(190,170,255,0.45)');
  rowTex('row_off', '#3a2f78', '#271e57', 'rgba(150,140,200,0.25)');
  rowTex('row_hi', '#6c53d0', '#3d2c96', '#ffe14d');
  jobs.push(() => { // вкладки
    for (const [key, a, b] of [['tab', '#4b3aa3', '#32257a'], ['tab_on', '#9a6bff', '#6a3fd6']]) {
      const [cv, ctx] = makeCanvas(200, 64);
      rr(ctx, 3, 3, 194, 70, 22);
      const g = ctx.createLinearGradient(0, 0, 0, 64);
      g.addColorStop(0, a); g.addColorStop(1, b);
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3; ctx.stroke();
      put(key, cv);
    }
  });
  jobs.push(() => { // плашка валюты
    const [cv, ctx] = makeCanvas(220, 64);
    rr(ctx, 3, 3, 214, 58, 29);
    ctx.fillStyle = 'rgba(20,10,60,0.62)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 3; ctx.stroke();
    put('pill', cv);
  });

  return jobs;
}

// ---------- Текст ----------
export function makeText(scene, x, y, str, size, color = '#ffffff', o = {}) {
  const tx = scene.add.text(x, y, str, {
    fontFamily: FONT,
    fontSize: size + 'px',
    fontStyle: '900',
    color,
    stroke: o.stroke || '#1b1048',
    strokeThickness: o.sw !== undefined ? o.sw : Math.max(3, Math.round(size / 8)),
    align: o.align || 'center',
    wordWrap: o.wrap ? { width: o.wrap } : undefined
  });
  tx.setOrigin(o.ox !== undefined ? o.ox : 0.5, o.oy !== undefined ? o.oy : 0.5);
  tx.setResolution(2);
  if (o.shadow !== false) tx.setShadow(0, 3, '#000000', 6, false, true);
  return tx;
}

export function gradientText(tx, top, bottom) {
  const g = tx.context.createLinearGradient(0, 0, 0, tx.height);
  g.addColorStop(0, top); g.addColorStop(1, bottom);
  tx.setFill(g);
  return tx;
}

// ---------- Кнопки ----------
export function makeButton(scene, x, y, label, kind, onClick, o = {}) {
  const w = o.w || 340, h = o.h || 88, size = o.size || 34;
  const c = scene.add.container(x, y);
  const body = scene.add.container(0, 0);
  const img = scene.add.image(0, 0, 'btn_' + kind).setDisplaySize(w, h);
  const tx = makeText(scene, 0, -h * 0.05, label, size);
  body.add([img, tx]);
  let ico = null;
  if (o.icon) { ico = scene.add.image(0, -h * 0.05, o.icon).setDisplaySize(h * 0.5, h * 0.5); body.add(ico); }
  c.add(body);

  // раскладка: [иконка][текст] по центру кнопки, текст ужимается под ширину
  const fit = () => {
    tx.setScale(1);
    const gap = ico ? 8 : 0, iw = ico ? h * 0.5 : 0;
    const max = w - 40 - iw - gap;
    if (tx.width > max) tx.setScale(max / tx.width);
    const total = tx.width * tx.scaleX + iw + gap;
    if (ico) {
      const left = -total / 2;
      if (o.iconRight) { tx.setX(left + (tx.width * tx.scaleX) / 2); ico.setX(left + tx.width * tx.scaleX + gap + iw / 2); }
      else { ico.setX(left + iw / 2); tx.setX(left + iw + gap + (tx.width * tx.scaleX) / 2); }
    }
  };
  fit();

  c.setSize(w, h).setInteractive({ useHandCursor: true });
  let enabled = true, pressed = false;
  const release = () => scene.tweens.add({ targets: c, scale: 1, duration: 90, ease: 'Back.Out' });
  c.on('pointerdown', () => {
    if (!enabled) return;
    pressed = true;
    scene.tweens.add({ targets: c, scale: 0.93, duration: 70 });
  });
  c.on('pointerup', () => {
    if (!pressed) return;
    pressed = false; release();
    if (enabled) { Sfx.play(scene, 'click', { volume: 0.6 }); onClick(); }
  });
  c.on('pointerout', () => { if (pressed) { pressed = false; release(); } });

  if (o.pulse) scene.tweens.add({ targets: body, scale: 1.05, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

  c.setLabel = (s) => { tx.setText(s); fit(); return c; };
  c.setEnabled = (v) => { enabled = v; body.setAlpha(v ? 1 : 0.5); return c; };
  c.body = body;
  return c;
}

export function makeRoundButton(scene, x, y, iconKey, onClick, size = 72) {
  const c = scene.add.container(x, y);
  const base = scene.add.image(0, 0, 'rbtn').setDisplaySize(size, size);
  const ic = scene.add.image(0, 0, iconKey).setDisplaySize(size * 0.52, size * 0.52);
  c.add([base, ic]);
  c.setSize(size, size).setInteractive({ useHandCursor: true });
  let pressed = false;
  c.on('pointerdown', () => { pressed = true; scene.tweens.add({ targets: c, scale: 0.9, duration: 70 }); });
  c.on('pointerup', () => {
    if (!pressed) return;
    pressed = false; scene.tweens.add({ targets: c, scale: 1, duration: 90, ease: 'Back.Out' });
    Sfx.play(scene, 'click', { volume: 0.6 }); onClick();
  });
  c.on('pointerout', () => { pressed = false; c.setScale(1); });
  c.setIcon = (k) => { ic.setTexture(k); return c; };
  return c;
}

// ---------- Эффекты ----------
export function burst(scene, x, y, tint, count = 18, o = {}) {
  const em = scene.add.particles(x, y, 'spark', {
    speed: { min: 60, max: o.speed || 280 },
    angle: { min: o.a0 === undefined ? 0 : o.a0, max: o.a1 === undefined ? 360 : o.a1 },
    lifespan: { min: 350, max: 750 },
    scale: { start: o.scale || 0.55, end: 0 },
    alpha: { start: 1, end: 0 },
    gravityY: o.gravity === undefined ? 220 : o.gravity,
    tint,
    blendMode: 'ADD',
    emitting: false
  }).setDepth(o.depth || 30);
  em.explode(count);
  scene.time.delayedCall(950, () => em.destroy());
}

export function shock(scene, x, y, tint, size, depth = 29) {
  const r = scene.add.image(x, y, 'ring').setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth).setDisplaySize(size * 0.3, size * 0.3);
  scene.tweens.add({ targets: r, displayWidth: size * 1.6, displayHeight: size * 1.6, alpha: 0, duration: 420, ease: 'Cubic.Out', onComplete: () => r.destroy() });
}

export function floatText(scene, x, y, str, color = '#ffffff', size = 34, depth = 60) {
  const tx = makeText(scene, x, y, str, size, color).setDepth(depth);
  scene.tweens.add({ targets: tx, y: y - 90, alpha: 0, scale: 1.25, duration: 900, ease: 'Cubic.Out', onComplete: () => tx.destroy() });
  return tx;
}

export function toast(scene, str, y = 540) {
  const tx = makeText(scene, DESIGN.W / 2, y, str, 28, '#ffffff', { wrap: 520 }).setDepth(400);
  scene.tweens.add({ targets: tx, alpha: 0, y: y - 50, delay: 1100, duration: 500, onComplete: () => tx.destroy() });
  return tx;
}
