// Нижняя панель: вкладки «Улучшения» / «Кристаллы» / «Рождение», прокручиваемый список, покупка кликом по всей строке.
import { CONFIG, GENS, t, lname } from '../config.js';
import * as Eco from '../economy.js';
import { fmt, fmtTime } from '../format.js';
import { makeText } from '../ui.js';

export const PANEL = { TOP: 618, TABS_Y: 652, LIST_Y: 688, LIST_H: 312, ROW_H: 86 };
const MODES = [1, 10, 100, 0]; // 0 = «макс.»

export class UpgradePanel {
  constructor(scene, host) {
    this.scene = scene;
    this.host = host;
    this.tab = 0;
    this.modeIdx = 0;
    this.scroll = [0, 0];
    this.vel = 0;
    this.drag = null;
    this.hold = null;
    this.lastToastAt = 0;
    const { TOP, TABS_Y, LIST_Y, LIST_H } = PANEL;

    this.root = scene.add.container(0, 0).setDepth(20);
    this.root.add(scene.add.image(300, TOP, 'sheet').setOrigin(0.5, 0).setDisplaySize(6000, 3000));

    // --- вкладки ---
    this.tabs = [];
    const names = ['upgrades', 'crystals', 'rebirth'];
    const xs = [86, 236, 386];
    names.forEach((key, i) => {
      const c = scene.add.container(xs[i], TABS_Y);
      const img = scene.add.image(0, 0, 'tab').setDisplaySize(142, 48);
      const tx = makeText(scene, 0, -2, t(key), 21, '#ffffff', { sw: 4, shadow: false });
      if (tx.width > 126) tx.setScale(126 / tx.width);
      const dot = scene.add.image(58, -18, 'dot').setDisplaySize(22, 22).setVisible(false);
      c.add([img, tx, dot]);
      c.setSize(142, 48).setInteractive({ useHandCursor: true });
      c.on('pointerup', () => { if (this.tab !== i) { this.host.sfx('click'); this.setTab(i); } });
      this.root.add(c);
      this.tabs.push({ c, img, dot });
    });

    // кнопка количества покупки (x1 / x10 / x100 / MAX)
    this.modeBtn = scene.add.container(530, TABS_Y);
    this.modeImg = scene.add.image(0, 0, 'btn_blue').setDisplaySize(96, 52);
    this.modeTxt = makeText(scene, 0, -3, 'x1', 24, '#ffffff', { sw: 4, shadow: false });
    this.modeBtn.add([this.modeImg, this.modeTxt]);
    this.modeBtn.setSize(96, 52).setInteractive({ useHandCursor: true });
    this.modeBtn.on('pointerup', () => {
      this.modeIdx = (this.modeIdx + 1) % MODES.length;
      this.modeTxt.setText(MODES[this.modeIdx] === 0 ? t('maxBuy') : 'x' + MODES[this.modeIdx]);
      this.modeTxt.setScale(1); if (this.modeTxt.width > 80) this.modeTxt.setScale(80 / this.modeTxt.width);
      this.host.sfx('click');
      this.refresh(true);
    });
    this.root.add(this.modeBtn);

    // --- списки ---
    this.lists = [scene.add.container(0, LIST_Y), scene.add.container(0, LIST_Y)];
    this.rows = [[], []];
    this.listH = LIST_H;
    this.maskG = scene.make.graphics({ x: 0, y: 0, add: false });
    this.maskG.fillStyle(0xffffff, 1); this.maskG.fillRect(0, LIST_Y, 600, LIST_H);
    this.mask = this.maskG.createGeometryMask();
    this.lists.forEach((l) => { l.setMask(this.mask); this.root.add(l); });

    this._addRow(0, 'tap', 0);
    GENS.forEach((G, i) => this._addRow(0, 'gen', i));
    ['video', 'warp1', 'warp8', 'turbo', 'shop'].forEach((id, i) => this._addRow(1, id, i));

    // --- вкладка «Рождение» ---
    this.rb = scene.add.container(0, 0);
    this.rbTitle = makeText(scene, 300, LIST_Y + 22, t('rebirthTitle'), 30, '#ffe27a', { sw: 5 });
    this.rbDesc = makeText(scene, 300, LIST_Y + 88, t('rebirthDesc'), 18, '#e6dcff', { wrap: 520, sw: 3, shadow: false });
    this.rbEss = makeText(scene, 300, LIST_Y + 160, '', 24, '#ffffff', { sw: 4 });
    this.rbGain = makeText(scene, 300, LIST_Y + 196, '', 24, '#7dff9a', { sw: 4 });
    this.rbBtn = scene.add.container(300, LIST_Y + 262);
    this.rbBtnImg = scene.add.image(0, 0, 'btn_purple').setDisplaySize(420, 72);
    this.rbBtnTxt = makeText(scene, 0, -3, '', 26, '#ffffff', { sw: 5 });
    this.rbBtn.add([this.rbBtnImg, this.rbBtnTxt]);
    this.rbBtn.setSize(420, 72).setInteractive({ useHandCursor: true });
    this.rbBtn.on('pointerup', () => this.host.requestRebirth());
    this.rb.add([this.rbTitle, this.rbDesc, this.rbEss, this.rbGain, this.rbBtn]);
    this.root.add(this.rb);

    // --- зона ввода для прокрутки/покупок ---
    this.zone = scene.add.zone(300, LIST_Y + LIST_H / 2, 600, LIST_H).setInteractive();
    this.root.add(this.zone);
    this.zone.on('pointerdown', (p) => this._down(p));
    scene.input.on('pointermove', (p) => this._move(p));
    scene.input.on('pointerup', (p) => this._up(p));
    scene.input.on('wheel', (p, o, dx, dy) => {
      if (this.tab > 1) return;
      if (p.worldY >= LIST_Y - 20) this._scrollBy(dy * 0.7);
    });

    this.setTab(0);
  }

  get mode() { return MODES[this.modeIdx]; }

  // На высоких экранах (телефоны) список растягивается до самого низа окна
  setListHeight(h) {
    h = Math.max(PANEL.LIST_H, Math.round(h));
    if (h === this.listH) return;
    this.listH = h;
    this.maskG.clear(); this.maskG.fillStyle(0xffffff, 1); this.maskG.fillRect(0, PANEL.LIST_Y, 600, h);
    this.zone.setPosition(300, PANEL.LIST_Y + h / 2).setSize(600, h);
    this._scrollBy(0);
  }

  // ---------- Построение строки ----------
  _addRow(tab, kind, idx) {
    const s = this.scene;
    const n = this.rows[tab].length;
    const c = s.add.container(300, n * PANEL.ROW_H + PANEL.ROW_H / 2);
    const bg = s.add.image(0, 0, 'row').setDisplaySize(560, 80);
    const iconKey = kind === 'tap' ? 'e_tap' : kind === 'gen' ? 'g' + idx
      : kind === 'video' ? 'e_video' : kind === 'turbo' ? 'e_rocket' : kind === 'shop' ? 'e_cart' : 'e_clock';
    const icon = s.add.image(-236, 0, iconKey).setDisplaySize(54, 54);
    const lock = s.add.image(-236, 0, 'lock').setDisplaySize(34, 34).setVisible(false);
    const title = makeText(s, -198, -16, '', 24, '#ffffff', { ox: 0, sw: 4, shadow: false });
    const sub = makeText(s, -198, 14, '', 17, '#d6ccff', { ox: 0, sw: 3, shadow: false });
    const btn = s.add.image(190, 0, 'btn_green').setDisplaySize(170, 58);
    const bIcon = s.add.image(0, -2, 'gel').setDisplaySize(28, 28);
    const bTxt = makeText(s, 0, -4, '', 23, '#ffffff', { sw: 4, shadow: false });
    c.add([bg, icon, lock, title, sub, btn, bIcon, bTxt]);
    this.lists[tab].add(c);
    const row = { tab, kind, idx, c, bg, icon, lock, title, sub, btn, bIcon, bTxt, cache: {}, y: n };
    this.rows[tab].push(row);
    return row;
  }

  _fit(tx, max) {
    tx.setScale(1);
    if (tx.width > max) tx.setScale(max / tx.width);
  }
  _set(row, key, tx, val, max) {
    if (row.cache[key] === val) return;
    row.cache[key] = val;
    tx.setText(val);
    if (max) this._fit(tx, max);
  }
  _setTex(row, key, img, tex) {
    if (row.cache[key] === tex) return;
    row.cache[key] = tex;
    img.setTexture(tex);
  }
  _layoutBtn(row, text, withIcon, icon) {
    const key = text + '|' + withIcon + '|' + icon;
    if (row.cache.bl === key) return;
    row.cache.bl = key;
    row.bTxt.setText(text);
    this._fit(row.bTxt, withIcon ? 120 : 150);
    const tw = row.bTxt.width * row.bTxt.scaleX;
    if (withIcon) {
      row.bIcon.setTexture(icon).setVisible(true);
      const total = tw + 32;
      row.bTxt.setX(190 - total / 2 + tw / 2);
      row.bIcon.setX(190 - total / 2 + tw + 4 + 14);
    } else {
      row.bIcon.setVisible(false);
      row.bTxt.setX(190);
    }
  }

  // ---------- Актуализация ----------
  refresh(force = false) {
    const d = this.host.d;
    const now = Date.now();
    let affordable = false;
    if (this.tab === 0 || force) {
      for (const row of this.rows[0]) {
        if (row.kind === 'tap') affordable = this._updTap(row, d) || affordable;
        else affordable = this._updGen(row, d) || affordable;
      }
    } else {
      // вкладка скрыта — считаем только индикатор доступности
      affordable = Eco.tapCost(d.tapLevel) <= d.gel || GENS.some((G, i) => this._genUnlocked(d, i) && Eco.genCost(i, d.gens[i]) <= d.gel);
    }
    if (this.tab === 1 || force) for (const row of this.rows[1]) this._updGemRow(row, d, now);
    const gain = Eco.essenceGain(d.runGel);
    this.tabs[0].dot.setVisible(affordable);
    this.tabs[1].dot.setVisible(this.host.gemVideoReady(now));
    this.tabs[2].dot.setVisible(gain >= 1 && d.runGel >= 0);
    if (this.tab === 2) this._updRebirth(d, gain);
  }

  _genUnlocked(d, i) { return d.gens[i] > 0 || d.allTime >= GENS[i].baseCost * 0.5; }

  _amount(owned, lvlBased, d, i) {
    const m = this.mode;
    if (m) return m;
    const mx = lvlBased ? Eco.tapMax(d.tapLevel, d.gel, 1000) : Eco.genMax(i, owned, d.gel, 1000);
    return Math.max(1, mx);
  }

  _updTap(row, d) {
    const n = this._amount(d.tapLevel, true, d);
    const cost = Eco.tapCost(d.tapLevel, n);
    const ok = d.gel >= cost;
    this._set(row, 't', row.title, t('tapPower') + '  ' + t('level', { n: d.tapLevel }), 270);
    const lvl2 = d.tapLevel + 1;
    const next = ((1 + lvl2) * Math.pow(2, Math.floor(lvl2 / CONFIG.eco.tap.doubleEvery)));
    const cur = ((1 + d.tapLevel) * Math.pow(2, Math.floor(d.tapLevel / CONFIG.eco.tap.doubleEvery)));
    const gainPct = Math.round((next / cur - 1) * 100);
    this._set(row, 's', row.sub, t('tapPowerDesc', { n: fmt(Eco.tapBaseValue(d)) }) + (gainPct > 0 ? '  (+' + gainPct + '%)' : ''), 270);
    this._styleRow(row, ok, cost, n, 'gel');
    return ok;
  }

  _updGen(row, d) {
    const i = row.idx, G = GENS[i], owned = d.gens[i];
    const unlocked = this._genUnlocked(d, i);
    row.lock.setVisible(false);
    if (!unlocked) {
      this._set(row, 't', row.title, '???', 270);
      this._set(row, 's', row.sub, t('locked', { n: fmt(Math.ceil(G.baseCost * 0.5)) }), 270);
      row.icon.setTintFill(0x14082e).setAlpha(0.9);
      this._setTex(row, 'bg', row.bg, 'row_off');
      row.btn.setVisible(false); row.bIcon.setVisible(false); row.bTxt.setVisible(false);
      row.cache.bl = null;
      row.unlocked = false;
      return false;
    }
    row.unlocked = true;
    row.icon.clearTint().setAlpha(1);
    row.btn.setVisible(true); row.bTxt.setVisible(true);
    const n = this._amount(owned, false, d, i);
    const cost = Eco.genCost(i, owned, n);
    const ok = d.gel >= cost;
    this._set(row, 't', row.title, lname(G) + (owned ? '  ×' + owned : ''), 270);
    const unit = G.baseCps * Eco.milestoneMult(owned) * Eco.permMult(d);
    const nm = Eco.nextMilestone(owned);
    this._set(row, 's', row.sub, t('perSec', { n: fmt(unit) }) + (nm ? '  •  ' + t('milestone', { n: nm }) : ''), 270);
    this._styleRow(row, ok, cost, n, 'gel');
    return ok;
  }

  _styleRow(row, ok, cost, n, currency) {
    row.bTxt.setVisible(true);
    this._setTex(row, 'btn', row.btn, ok ? 'btn_green' : 'btn_grey');
    const hi = ok && this.host.hintRow(row);
    this._setTex(row, 'bg', row.bg, hi ? 'row_hi' : ok ? 'row' : 'row_off');
    this._layoutBtn(row, (n > 1 ? 'x' + n + ' ' : '') + fmt(cost), true, currency);
    row.ok = ok;
    row.n = n;
    row.cost = cost;
  }

  _updGemRow(row, d, now) {
    const E = CONFIG.eco;
    row.unlocked = true;
    row.icon.clearTint().setAlpha(1);
    row.lock.setVisible(false);
    row.btn.setVisible(true); row.bTxt.setVisible(true);
    if (row.kind === 'video') {
      const wait = Math.max(0, d.gemVideoAt - now);
      const ok = wait === 0;
      this._set(row, 't', row.title, t('gemVideo', { n: E.gemVideo.gems }), 270);
      this._set(row, 's', row.sub, t('gemVideoDesc'), 270);
      this._setTex(row, 'btn', row.btn, ok ? 'btn_gold' : 'btn_grey');
      this._setTex(row, 'bg', row.bg, ok ? 'row' : 'row_off');
      this._layoutBtn(row, ok ? t('free') : fmtTime(wait / 1000), ok, 'ic_video');
      row.ok = ok;
    } else if (row.kind === 'shop') {
      this._set(row, 't', row.title, t('shopBtn'), 270);
      this._set(row, 's', row.sub, t('shopDesc'), 270);
      this._setTex(row, 'btn', row.btn, 'btn_gold');
      this._setTex(row, 'bg', row.bg, 'row');
      this._layoutBtn(row, t('shop'), false);
      row.ok = true;
    } else {
      const it = E.gemShop.find((x) => x.id === row.kind);
      const ok = d.gems >= it.cost;
      if (row.kind === 'turbo') {
        this._set(row, 't', row.title, t('turbo'), 270);
        this._set(row, 's', row.sub, t('turboDesc'), 270);
      } else {
        this._set(row, 't', row.title, t('warp', { h: it.hours }), 270);
        this._set(row, 's', row.sub, t('warpDesc', { h: it.hours }), 270);
      }
      this._setTex(row, 'btn', row.btn, ok ? 'btn_green' : 'btn_grey');
      this._setTex(row, 'bg', row.bg, ok ? 'row' : 'row_off');
      this._layoutBtn(row, String(it.cost), true, 'gem');
      row.ok = ok; row.cost = it.cost;
    }
  }

  _updRebirth(d, gain) {
    const ess = d.essence;
    const bonus = Math.round(ess * CONFIG.eco.essence.perPoint * 100);
    this.rbEss.setText(t('essence', { n: ess }) + (bonus ? '  (+' + bonus + '%)' : ''));
    if (gain >= 1) {
      this.rbGain.setText(t('essenceGain', { n: gain })).setColor('#7dff9a');
      this.rbBtnImg.setTexture('btn_purple');
      this.rbBtnTxt.setText(t('rebirthBtn') + '  +' + gain);
    } else {
      this.rbGain.setText(t('rebirthLock', { n: fmt(Eco.essenceNeed(d.runGel)) })).setColor('#ffd0d0');
      this.rbBtnImg.setTexture('btn_grey');
      this.rbBtnTxt.setText(t('rebirthBtn'));
    }
    this._fit(this.rbGain, 520);
  }

  // ---------- Вкладки и прокрутка ----------
  setTab(i) {
    this.tab = i;
    this.vel = 0;
    this.tabs.forEach((tb, k) => tb.img.setTexture(k === i ? 'tab_on' : 'tab'));
    this.lists[0].setVisible(i === 0);
    this.lists[1].setVisible(i === 1);
    this.rb.setVisible(i === 2);
    this.modeBtn.setVisible(i === 0);
    this.zone.input.enabled = i < 2;
    this.refresh(true);
    this._applyScroll();
  }

  _max() {
    if (this.tab > 1) return 0;
    return Math.max(0, this.rows[this.tab].length * PANEL.ROW_H - this.listH + 8);
  }
  _scrollBy(dy) {
    this.scroll[this.tab] = Phaser.Math.Clamp(this.scroll[this.tab] + dy, 0, this._max());
    this._applyScroll();
  }
  _applyScroll() {
    if (this.tab > 1) return;
    this.lists[this.tab].y = PANEL.LIST_Y - this.scroll[this.tab];
  }

  update(dt) {
    if (this.drag === null && Math.abs(this.vel) > 5) {
      this._scrollBy(this.vel * dt);
      this.vel *= Math.pow(0.0025, dt);
    } else if (this.drag === null) this.vel = 0;
    if (this.hold && this.drag && !this.drag.moved) {
      const tnow = this.scene.time.now;
      if (tnow >= this.hold.next) {
        this.hold.next = tnow + Math.max(55, this.hold.gap);
        this.hold.gap *= 0.93;
        this.drag.held = true;
        this._buyAt(this.drag.sx, this.drag.sy, true);
      }
    }
  }

  // ---------- Ввод ----------
  _down(p) {
    this.drag = { sx: p.worldX, sy: p.worldY, ly: p.worldY, moved: false, t: this.scene.time.now };
    this.vel = 0;
    // удержание: быстрая серия покупок (после небольшой паузы)
    this.hold = this.tab === 0 ? { next: this.scene.time.now + 420, gap: 150 } : null;
  }
  _move(p) {
    if (!this.drag) return;
    const dy = p.worldY - this.drag.ly;
    if (!this.drag.moved && Math.abs(p.worldY - this.drag.sy) > 10) this.drag.moved = true;
    if (this.drag.moved) {
      this._scrollBy(-dy);
      const dtSec = Math.max(0.008, this.scene.game.loop.delta / 1000);
      this.vel = (-dy / dtSec) * 0.5 + this.vel * 0.5;
    }
    this.drag.ly = p.worldY;
  }
  _up(p) {
    const dr = this.drag;
    this.drag = null; this.hold = null;
    if (!dr) return;
    if (!dr.moved && !dr.held) { this.vel = 0; this._buyAt(dr.sx, dr.sy, false); }
  }

  _rowAt(x, y) {
    const rel = y - PANEL.LIST_Y + this.scroll[this.tab];
    if (rel < 0 || x < 10 || x > 590) return null;
    const idx = Math.floor(rel / PANEL.ROW_H);
    return this.rows[this.tab][idx] || null;
  }

  _buyAt(x, y, repeat) {
    const row = this._rowAt(x, y);
    if (!row) return;
    const h = this.host;
    if (this.tab === 0) {
      if (row.kind === 'gen' && !row.unlocked) { if (!repeat) { h.sfx('denied', 0.4); this._shake(row); } return; }
      const n = row.n || 1;
      const ok = row.kind === 'tap' ? h.buyTap(n) : h.buyGen(row.idx, n);
      if (ok) { this._pulse(row); this.refresh(true); }
      else if (!repeat) { this._shake(row); h.notEnough('gel'); }
    } else {
      if (row.kind === 'video') h.watchGemVideo();
      else if (row.kind === 'shop') h.openShop();
      else h.buyGemItem(row.kind, row);
      this.refresh(true);
    }
  }

  _pulse(row) {
    this.scene.tweens.killTweensOf(row.c);
    row.c.setScale(1);
    this.scene.tweens.add({ targets: row.c, scaleX: 1.03, scaleY: 1.06, duration: 70, yoyo: true });
  }
  _shake(row) {
    this.scene.tweens.killTweensOf(row.c);
    row.c.x = 300;
    this.scene.tweens.add({ targets: row.c, x: 308, duration: 40, yoyo: true, repeat: 2, onComplete: () => { row.c.x = 300; } });
  }
}
