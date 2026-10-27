// Универсальное модальное окно: затемнение, панель, заголовок, произвольное содержимое и кнопки снизу.
import { DESIGN } from '../config.js';
import { makeText, gradientText, makeButton } from '../ui.js';

// opts: { h, title, titleColors:[top,bottom], build(container, {top, bottom, w}), buttons:[{label, kind, icon, iconRight, pulse, onClick, w, h, size, keepOpen}], depth }
// Контейнер центрирован в (W/2, 500); координаты внутри — относительно центра окна.
export function openModal(scene, opts) {
  const H = opts.h || 620, W = 540;
  const depth = opts.depth || 500;
  const root = scene.add.container(0, 0).setDepth(depth);
  // окно по центру ВИДИМОЙ области (на широком экране она короче 1000) и уменьшается, если не помещается
  const cy = scene.visBottom ? (scene.visTop + scene.visBottom) / 2 : 500;
  const fit = scene.visBottom ? Math.min(1, (scene.visBottom - scene.visTop - 16) / H) : 1;
  const dim = scene.add.rectangle(DESIGN.W / 2, cy, 6000, 6000, 0x0a0420, 0).setInteractive();
  scene.tweens.add({ targets: dim, fillAlpha: 0.78, duration: 180 });
  const c = scene.add.container(DESIGN.W / 2, cy);
  root.add([dim, c]);

  c.add(scene.add.image(0, 0, 'panel').setDisplaySize(W, H));
  const top = -H / 2, bottom = H / 2;
  if (opts.title) {
    const tt = makeText(scene, 0, top + 62, opts.title, 46, '#ffffff', { sw: 8 });
    gradientText(tt, ...(opts.titleColors || ['#fff6a8', '#ff9a1f']));
    if (tt.width > W - 80) tt.setScale((W - 80) / tt.width); // заголовок всегда в одну строку
    c.add(tt);
  }
  if (opts.build) opts.build(c, { top, bottom, w: W });

  const btns = opts.buttons || [];
  let y = bottom - 62;
  const made = [];
  for (let i = btns.length - 1; i >= 0; i--) {
    const b = btns[i];
    const bh = b.h || 84;
    const btn = makeButton(scene, 0, y, b.label, b.kind || 'green', () => {
      if (!b.keepOpen) handle.close();
      if (b.onClick) b.onClick(handle);
    }, { w: b.w || 400, h: bh, size: b.size || 32, icon: b.icon, iconRight: b.iconRight, pulse: b.pulse });
    c.add(btn);
    made[i] = btn;
    y -= bh + 14;
  }

  c.setScale(0.7).setAlpha(0);
  scene.tweens.add({ targets: c, scale: fit, alpha: 1, duration: 260, ease: 'Back.Out' });

  let closed = false;
  const handle = {
    container: c, root, buttons: made,
    close() {
      if (closed) return;
      closed = true;
      scene.tweens.add({
        targets: c, scale: 0.8 * fit, alpha: 0, duration: 160,
        onComplete: () => { root.destroy(); if (opts.onClose) opts.onClose(); }
      });
      scene.tweens.add({ targets: dim, fillAlpha: 0, duration: 160 });
    }
  };
  return handle;
}
