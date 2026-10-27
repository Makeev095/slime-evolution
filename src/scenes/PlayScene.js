import { CONFIG, DESIGN, GENS, LANGS, LANG_NAMES, getLang, t, lname } from '../config.js';
import { YandexSDK } from '../yandexSDK.js';
import { Sfx } from '../audio.js';
import * as Eco from '../economy.js';
import { fmt, fmtGel, fmtTime, fmtAway } from '../format.js';
import { buildDecor, SLIME_SIZE } from '../art.js';
import { makeText, gradientText, makeButton, makeRoundButton, burst, shock, floatText, toast } from '../ui.js';
import { UpgradePanel, PANEL } from '../ui/UpgradePanel.js';
import { openModal } from '../ui/Modal.js';

const E = CONFIG.eco;

// Фоновые частицы по стадиям: [tint[], speedY min, max]
const AMBIENT = [
  { tint: [0x7df3ff, 0xff7ee8, 0xffffff], sy: [-45, -15] },
  { tint: [0xfff7b0, 0xffffff, 0xcaffc0], sy: [10, 30] },
  { tint: [0xffd27a, 0xffb0e0, 0xffffff], sy: [-25, -8] },
  { tint: [0xd78bff, 0x8ad8ff, 0xffffff], sy: [-40, -12] },
  { tint: [0xff8a2a, 0xffd23a, 0xff5a1a], sy: [-120, -50] },
  { tint: [0xffffff, 0xaad4ff, 0xffe9b0], sy: [-6, 6] },
  { tint: [0xfff3a0, 0xffffff, 0xffc0f0], sy: [14, 38] }
];

const SLIME_X = 300, SLIME_BOTTOM = 528, SLIME_SCALE = 0.92;

export class PlayScene extends Phaser.Scene {
  constructor() { super('PlayScene'); }

  create() {
    this.setupCameras();
    this.d = YandexSDK.data;
    const d = this.d;
    const now = Date.now();

    // --- состояние рантайма ---
    this.modal = null;
    this.modalQueue = [];
    this.shopOpen = false;
    this.cpsCache = 0;
    this.dirty = true;
    this.lastTick = now;
    this.lastTapAt = 0;
    this.combo = 0;
    this.frenzyUntil = 0;
    this.squash = 0; this.squashV = 0;
    this.happyUntil = 0;
    this.shownGel = d.gel;
    this.nextBlink = 0; this.nextPulse = 0;
    this.textTimer = 0; this.slowTimer = 0; this.saveTimer = 0; this.adTimer = 0; this.stageTimer = 0;
    this.floatCount = 0;
    this.countdown = null;
    this.goldenAt = now + E.golden.firstMs;
    this.golden = null;
    this.lastToastAt = 0;
    this.dailyChecked = 0;
    this.shownStage = Eco.stageFor(d.allTime);
    d.seenStage = Math.max(d.seenStage, 0);
    if (d.seenStage > this.shownStage) d.seenStage = this.shownStage;

    this.buildBackground(this.shownStage);
    this.buildSlime();
    this.buildHud();
    this._buildingPanel = true;
    this.panel = new UpgradePanel(this, this);
    this._buildingPanel = false;
    this.panelObjs = this.collectObjs(this.panel.root, []);
    const layout = () => this.layoutCameras();
    layout();
    this.scale.on('resize', layout);
    this.events.once('shutdown', () => this.scale.off('resize', layout));

    // --- ввод ---
    this.input.keyboard.on('keydown-SPACE', () => this.tapSlime(SLIME_X, SLIME_BOTTOM - 130, true));
    this.input.keyboard.on('keydown-ENTER', () => this.tapSlime(SLIME_X, SLIME_BOTTOM - 130, true));
    this.input.once('pointerdown', () => { Sfx.startMusic(this.game); });
    // «Игрок в игре»: вкладка видима и окно в фокусе. Иначе желе не капает, реклама и бонусы не появляются.
    this.away = document.hidden;
    const leave = () => { this.away = true; };
    const comeBack = () => { if (!document.hidden && this.away) { this.away = false; this.lastTick = Date.now(); } };
    document.addEventListener('visibilitychange', this._onVis = () => {
      if (document.hidden) { leave(); this.persist(true); YandexSDK.gameplayStop(); } else comeBack();
    });
    window.addEventListener('blur', this._onBlur = leave);
    window.addEventListener('focus', this._onFocus = comeBack);
    window.addEventListener('pagehide', this._onHide = () => this.persist(true));
    this.input.on('pointerdown', comeBack);
    this.input.keyboard.on('keydown', comeBack);
    this.events.once('shutdown', () => {
      document.removeEventListener('visibilitychange', this._onVis);
      window.removeEventListener('blur', this._onBlur);
      window.removeEventListener('focus', this._onFocus);
      window.removeEventListener('pagehide', this._onHide);
    });

    // покупки, оформленные в магазине, сразу отражаются в игре
    YandexSDK.onGrant = (prod) => { this.dirty = true; this.panel.refresh(true); this.refreshHud(true); };

    // --- старт: ежедневная награда. Дохода «пока тебя не было» нет — желе капает только пока игрок в игре ---
    this.checkEvolution(true);
    this.pumpModals();

    this.refreshHud(true);
    this.panel.refresh(true);
    YandexSDK.gameReady();   // платформа узнаёт, что игра загружена и можно играть
    YandexSDK.gameplayStart();

    if (location.search.includes('debug')) window.__slime = { scene: this, YandexSDK, CONFIG, Eco, Sfx };
  }

  // =====================================================================
  //  КАМЕРЫ И РАСКЛАДКА
  //  Узкий экран (телефон): весь мир 600x1000 в одной камере, магазин внизу.
  //  Широкий экран (компьютер, планшет): слева магазин на своей камере (крупные карточки), справа слайм на главной камере.
  // =====================================================================
  setupCameras() {
    this.mainCam = this.cameras.main;
    this.mainCam.setBackgroundColor('#1a1040');
    this.panelCam = this.cameras.add(0, 0, 10, 10, false, 'panel');
    this.panelCam.setBackgroundColor('#3b2a8c').setVisible(false);
    this.wide = false;
    this.laidOut = false;
    this._buildingPanel = false;
    this.panelObjs = [];
    // всё, что создаётся не магазином, левая камера не рисует
    const hook = (go) => { if (!this._buildingPanel) this.panelCam.ignore(go); };
    this.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, hook);
    this.events.once('shutdown', () => this.events.off(Phaser.Scenes.Events.ADDED_TO_SCENE, hook));
  }
  collectObjs(go, out) {
    out.push(go);
    if (go.list) go.list.forEach((ch) => this.collectObjs(ch, out));
    return out;
  }
  setCamFilter(objs, cam, hide) {
    for (const o of objs) { if (hide) o.cameraFilter |= cam.id; else o.cameraFilter &= ~cam.id; }
  }
  layoutCameras() {
    const w = this.scale.width, h = this.scale.height;
    const wide = w / h >= 1.2;
    const P = PANEL;
    if (wide !== this.wide || !this.laidOut) {
      this.setCamFilter(this.panelObjs, this.mainCam, wide);
      this.panelCam.setVisible(wide);
      this.wide = wide; this.laidOut = true;
    }
    const mc = this.mainCam;
    if (!wide) {
      mc.setViewport(0, 0, w, h);
      const z = Math.min(w / DESIGN.W, h / DESIGN.H);
      mc.setZoom(z); mc.centerOn(DESIGN.W / 2, DESIGN.H / 2);
      this.visTop = DESIGN.H / 2 - h / (2 * z);
      this.visBottom = DESIGN.H / 2 + h / (2 * z);
      this.panel.setListHeight(this.visBottom - P.LIST_Y - 4);
    } else {
      const pw = Math.round(w * 0.5), vw = w - pw;
      const pc = this.panelCam;
      pc.setViewport(0, 0, pw, h);
      const zp = Math.min(pw / DESIGN.W, h / 720);
      const y0 = P.TOP - 2;
      pc.setZoom(zp); pc.centerOn(DESIGN.W / 2, y0 + h / (2 * zp));
      mc.setViewport(pw, 0, vw, h);
      const z = Math.min(vw / DESIGN.W, h / 640);
      mc.setZoom(z); mc.centerOn(DESIGN.W / 2, h / (2 * z));
      this.visTop = 0;
      this.visBottom = h / z;
      this.panel.setListHeight(h / zp - (P.LIST_Y - y0) - 4);
    }
  }
  // экранные координаты указателя -> мировые координаты камеры
  toWorld(cam, p) {
    return {
      x: cam.scrollX + cam.width / 2 + (p.x - cam.x - cam.width / 2) / cam.zoom,
      y: cam.scrollY + cam.height / 2 + (p.y - cam.y - cam.height / 2) / cam.zoom
    };
  }
  // указатель над областью магазина? (на широком экране это левая половина)
  inPanel(p) { return !this.wide || p.x < this.panelCam.width; }
  panelWorld(p) { return this.toWorld(this.wide ? this.panelCam : this.mainCam, p); }
  uiLocked() { return !!(this.modal || this.shopOpen || YandexSDK.busy); }

  // =====================================================================
  //  ФОН
  // =====================================================================
  buildBackground(stage) {
    this.sky = this.add.image(300, 500, 'sky' + stage).setDisplaySize(5000, 5000).setDepth(-30);
    this.decor = buildDecor(this, stage).setDepth(-25);
    this.makeAmbient(stage);
  }

  makeAmbient(stage) {
    if (this.ambient) this.ambient.destroy();
    const A = AMBIENT[stage];
    this.ambient = this.add.particles(0, 0, 'spark', {
      x: { min: -400, max: 1000 }, y: { min: -200, max: 1150 },
      lifespan: { min: 2500, max: 6000 }, frequency: 90, quantity: 1,
      speedY: { min: A.sy[0], max: A.sy[1] }, speedX: { min: -8, max: 8 },
      scale: { min: 0.05, max: stage === 4 ? 0.14 : 0.22 },
      alpha: { values: [0, 0.85, 0] }, tint: A.tint, blendMode: 'ADD'
    }).setDepth(-20);
  }

  changeStageVisuals(stage, animate) {
    const oldSky = this.sky, oldDecor = this.decor;
    this.sky = this.add.image(300, 500, 'sky' + stage).setDisplaySize(5000, 5000).setDepth(-29).setAlpha(animate ? 0 : 1);
    this.decor = buildDecor(this, stage).setDepth(-24).setAlpha(animate ? 0 : 1);
    if (animate) {
      this.tweens.add({
        targets: [this.sky, this.decor], alpha: 1, duration: 900,
        onComplete: () => { oldSky.destroy(); oldDecor.destroy(); this.sky.setDepth(-30); this.decor.setDepth(-25); }
      });
    } else { oldSky.destroy(); oldDecor.destroy(); }
    this.makeAmbient(stage);
    this.shownStage = stage;
    this.setSlimeTexture(true);
  }

  // =====================================================================
  //  СЛАЙМ
  // =====================================================================
  buildSlime() {
    this.aura = this.add.image(SLIME_X, SLIME_BOTTOM - 120, 'spark').setTint(0xff7a3a).setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(520, 520).setAlpha(0).setDepth(3);
    this.shadow = this.add.image(SLIME_X, SLIME_BOTTOM + 6, 'shadow').setDisplaySize(330, 82).setDepth(4);
    this.slime = this.add.image(SLIME_X, SLIME_BOTTOM, 'slime0_0').setOrigin(0.5, 400 / SLIME_SIZE).setDepth(5);
    this.setSlimeTexture(true);

    this.hit = this.add.zone(SLIME_X, SLIME_BOTTOM - 150, 400, 360).setInteractive({ useHandCursor: true }).setDepth(6);
    this.hit.on('pointerdown', (p) => { const w = this.toWorld(this.mainCam, p); this.tapSlime(w.x, w.y, false); });

    // выбрасываемые капли
    this.drops = this.add.particles(0, 0, 'gel', {
      speed: { min: 120, max: 380 }, angle: { min: 215, max: 325 }, gravityY: 900,
      lifespan: { min: 450, max: 850 }, scale: { start: 0.32, end: 0.1 }, alpha: { start: 1, end: 0 }, emitting: false
    }).setDepth(8);
    this.sparks = this.add.particles(0, 0, 'spark', {
      speed: { min: 80, max: 300 }, angle: { min: 0, max: 360 }, lifespan: { min: 300, max: 600 },
      scale: { start: 0.5, end: 0 }, alpha: { start: 1, end: 0 }, blendMode: 'ADD', emitting: false, tint: [0xfff7a0, 0xffffff, 0x9af3ff]
    }).setDepth(9);

    // подсказка для новичка
    this.hand = this.add.image(SLIME_X + 70, SLIME_BOTTOM - 110, 'e_tap').setDisplaySize(86, 86).setDepth(12).setVisible(false);
    this.handText = makeText(this, SLIME_X, SLIME_BOTTOM - 290, t('tapHint'), 38, '#ffffff', { sw: 7 }).setDepth(12).setVisible(false);
    if (!this.d.intro) {
      this.hand.setVisible(true); this.handText.setVisible(true);
      this.tweens.add({ targets: this.hand, y: SLIME_BOTTOM - 80, x: SLIME_X + 40, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.tweens.add({ targets: this.handText, scale: 1.08, duration: 550, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
  }

  setSlimeTexture(force = false) {
    const key = 'slime' + this.shownStage + '_' + (this.isHappy() ? 1 : 0);
    if (force || this.slime.texture.key !== key) this.slime.setTexture(key);
  }
  isHappy() { return this.time.now < this.happyUntil || this.isFrenzy(); }
  isFrenzy() { return Date.now() < this.frenzyUntil; }

  tapSlime(px, py, kbd) {
    if (this.modal || this.shopOpen || YandexSDK.busy) return;
    const d = this.d;
    const now = Date.now();
    this.cancelCountdown();
    this.lastTapAt = now;

    // комбо / ярость
    const F = E.frenzy;
    if (!this.isFrenzy()) {
      this.combo = Math.min(1, this.combo + F.perTap);
      if (this.combo >= 1) this.startFrenzy();
    }
    const frenzyMult = this.isFrenzy() ? F.tapMult : 1;

    let gain = Eco.tapValue(d, now, frenzyMult);
    const crit = Math.random() < 0.04;
    if (crit) gain *= 5;
    Eco.addGel(d, gain);
    d.taps++;
    this.dirty = true;

    // отклик
    this.squashV += crit ? 9 : 6;
    this.happyUntil = this.time.now + 160;
    this.setSlimeTexture();
    const comboLevel = this.isFrenzy() ? 1 : this.combo;
    Sfx.tap(this, comboLevel);
    if (crit) { this.sfx('gem', 0.5); shock(this, SLIME_X, SLIME_BOTTOM - 110, 0xffe14d, 260); }
    this.drops.explode(crit ? 12 : 4, px, py);
    this.sparks.explode(crit ? 10 : 2, px, py);
    if (this.floatCount < 14) {
      this.floatCount++;
      const fx = px + Phaser.Math.Between(-40, 40);
      const tx = makeText(this, fx, py - 20, '+' + fmt(gain), crit ? 52 : 34, crit ? '#ffe14d' : '#ffffff').setDepth(60);
      this.tweens.add({
        targets: tx, y: py - (crit ? 190 : 130), alpha: 0, scale: crit ? 1.35 : 1.15, duration: crit ? 1000 : 750, ease: 'Cubic.Out',
        onComplete: () => { tx.destroy(); this.floatCount--; }
      });
    }
    this.tweens.killTweensOf(this.gelPunch); this.gelPunch.setScale(1.0);
    this.tweens.add({ targets: this.gelPunch, scale: 1.1, duration: 55, yoyo: true });
    if (navigator.vibrate && !kbd) { try { navigator.vibrate(crit ? 25 : 6); } catch (e) { /* не везде доступно */ } }

    if (!d.intro && d.taps >= 6) {
      d.intro = true;
      this.dailyChecked = Date.now() - 45000; // ежедневный подарок — через ~15 с после первых тапов
      this.hand.setVisible(false); this.handText.setVisible(false);
      this.tweens.killTweensOf(this.hand); this.tweens.killTweensOf(this.handText);
    }
    this.checkEvolution();
  }

  startFrenzy() {
    this.frenzyUntil = Date.now() + E.frenzy.durationMs;
    this.combo = 1;
    this.sfx('frenzy', 0.7);
    shock(this, SLIME_X, SLIME_BOTTOM - 120, 0xff7a3a, 420);
    this.cameras.main.shake(180, 0.004);
    this.frenzyLabel.setVisible(true);
    this.setSlimeTexture();
  }

  // =====================================================================
  //  HUD
  // =====================================================================
  buildHud() {
    const d = this.d;
    // счётчик желе
    this.gelPunch = this.add.container(300, 82).setDepth(30);
    this.gelTxt = makeText(this, 0, 0, '0', 58, '#ffffff', { ox: 0, sw: 9 });
    this.gelIcon = this.add.image(-100, 0, 'gel').setDisplaySize(62, 62);
    this.gelPunch.add([this.gelIcon, this.gelTxt]);
    this.cpsTxt = makeText(this, 300, 134, '', 26, '#bff6ff', { sw: 5 }).setDepth(30);

    // кристаллы
    this.gemPill = this.add.container(98, 36).setDepth(30);
    this.gemPill.add(this.add.image(0, 0, 'pill').setDisplaySize(166, 52));
    this.gemPill.add(this.add.image(-54, 0, 'gem').setDisplaySize(36, 36));
    this.gemTxt = makeText(this, -28, -2, '0', 26, '#ffffff', { ox: 0, sw: 5, shadow: false });
    this.gemPill.add(this.gemTxt);
    this.gemPill.setSize(166, 52).setInteractive({ useHandCursor: true });
    this.gemPill.on('pointerup', () => { this.sfx('click'); this.panel.setTab(1); });

    // звук
    this.sndBtn = makeRoundButton(this, 560, 38, this.d.sound ? 'ic_snd_on' : 'ic_snd_off', () => {
      YandexSDK.setSound(!this.d.sound);
      this.sndBtn.setIcon(this.d.sound ? 'ic_snd_on' : 'ic_snd_off');
      if (this.d.sound) Sfx.startMusic(this.game);
    }, 56).setDepth(30);

    // язык (флаг текущего языка → окно выбора)
    this.langBtn = makeRoundButton(this, 492, 38, 'flag_' + getLang(), () => this.openLanguageModal(), 56).setDepth(30);
    this.langBtn.list[1].setDisplaySize(46, 46);

    // кнопка ускорения x2
    this.boostBtn = this.sideButton(534, 196, 'e_x2', () => this.onBoostClick());
    this.boostGlow = this.add.image(534, 196, 'spark').setTint(0x7dff9a).setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(170, 170).setAlpha(0).setDepth(28);
    // подарок за видео
    this.giftBtn = this.sideButton(66, 196, 'gift', () => this.onGiftClick());

    // индикатор ярости и комбо
    this.comboBar = this.add.graphics().setDepth(14);
    this.frenzyLabel = makeText(this, SLIME_X, 196, t('frenzy') + ' x' + E.frenzy.tapMult, 24, '#ffb36b', { sw: 6 }).setDepth(15).setVisible(false);

    // эволюция
    this.evoBar = this.add.graphics().setDepth(14);
    this.evoLeft = makeText(this, 40, 596, '', 17, '#ffffff', { ox: 0, sw: 4, shadow: false }).setDepth(15);
    this.evoRight = makeText(this, 560, 596, '', 17, '#ffffff', { ox: 1, sw: 4, shadow: false }).setDepth(15);
    this.evoMid = makeText(this, 300, 596, '', 17, '#ffffff', { sw: 4, shadow: false }).setDepth(15);
    this.evoCache = '';

    // пауза: игрок не в игре — желе не капает
    this.pauseBanner = makeText(this, 300, 340, t('paused'), 36, '#ffffff', { wrap: 500, sw: 8 }).setDepth(190).setVisible(false);

    // предупреждение о рекламе
    this.adBanner = makeText(this, 300, 250, '', 34, '#ffffff', { sw: 8 }).setDepth(200).setVisible(false);
  }

  sideButton(x, y, icon, onClick) {
    const c = this.add.container(x, y).setDepth(30);
    const base = this.add.image(0, 0, 'rbtn').setDisplaySize(88, 88);
    const ic = this.add.image(0, -2, icon).setDisplaySize(54, 54);
    const label = makeText(this, 0, 56, '', 20, '#ffffff', { sw: 5 });
    c.add([base, ic, label]);
    c.setSize(100, 100).setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => this.tweens.add({ targets: c, scale: 0.9, duration: 60 }));
    c.on('pointerup', () => { this.tweens.add({ targets: c, scale: 1, duration: 90, ease: 'Back.Out' }); this.sfx('click', 0.6); onClick(); });
    c.on('pointerout', () => c.setScale(1));
    c.base = base; c.label = label; c.icon = ic;
    return c;
  }

  refreshHud(force = false) {
    const d = this.d, now = Date.now();
    // счётчик
    const txt = fmtGel(this.shownGel);
    if (force || this.gelTxt.text !== txt) {
      this.gelTxt.setText(txt).setScale(1);
      if (this.gelTxt.width > 380) this.gelTxt.setScale(380 / this.gelTxt.width);
      const total = 62 + 10 + this.gelTxt.width * this.gelTxt.scaleX;
      this.gelIcon.setX(-total / 2 + 31);
      this.gelTxt.setX(-total / 2 + 72);
    }
    this.cpsTxt.setText(t('perSec', { n: fmt(this.cpsCache) }));
    const gt = fmt(d.gems);
    if (this.gemTxt.text !== gt) { this.gemTxt.setText(gt); this.gemTxt.setScale(1); if (this.gemTxt.width > 86) this.gemTxt.setScale(86 / this.gemTxt.width); }

    // ускорение
    const boostLeft = d.boostUntil - now;
    if (boostLeft > 0) {
      this.boostBtn.label.setText('x' + d.boostMult + ' ' + fmtTime(boostLeft / 1000)).setColor('#9dff9a');
      this.boostGlow.setAlpha(0.35 + Math.sin(now / 250) * 0.15);
    } else {
      this.boostBtn.label.setText(t('watchAd')).setColor('#ffffff');
      this.boostGlow.setAlpha(0);
    }
    // подарок
    const giftLeft = d.giftAt - now;
    if (giftLeft > 0) { this.giftBtn.label.setText(fmtTime(giftLeft / 1000)).setColor('#d6ccff'); this.giftBtn.base.setAlpha(0.7); this.giftBtn.icon.setAlpha(0.6); }
    else { this.giftBtn.label.setText(t('gift')).setColor('#ffe27a'); this.giftBtn.base.setAlpha(1); this.giftBtn.icon.setAlpha(1); }
    this.giftReady = giftLeft <= 0;

    // эволюция
    const pr = Eco.evolutionProgress(d.allTime);
    const key = pr.stage + ':' + Math.round(pr.ratio * 1000);
    if (force || key !== this.evoCache) {
      this.evoCache = key;
      const g = this.evoBar; g.clear();
      const x = 30, y = 584, w = 540, h = 24;
      g.fillStyle(0x140a38, 0.85); g.fillRoundedRect(x, y, w, h, 12);
      const fw = Math.max(h, w * pr.ratio);
      if (pr.ratio > 0 || pr.next < 0) {
        g.fillStyle(0x34d17a, 1); g.fillRoundedRect(x, y, fw, h, 12);
        g.fillStyle(0xffffff, 0.35); g.fillRoundedRect(x + 5, y + 4, Math.max(6, fw - 10), 7, 4);
      }
      g.lineStyle(3, 0xc9b8ff, 0.7); g.strokeRoundedRect(x, y, w, h, 12);
      const cur = lname(E.stages[pr.stage]);
      this.evoLeft.setText(cur);
      if (pr.next >= 0) {
        this.evoRight.setText(lname(E.stages[pr.next]));
        const pct = Math.min(99.9, Math.floor(pr.ratio * 1000) / 10).toFixed(1);
        this.evoMid.setText((getLang() === 'en' ? pct : pct.replace('.', ',')) + '%');
      } else { this.evoRight.setText(''); this.evoMid.setText(t('maxStage')); }
    }
  }

  drawCombo() {
    const g = this.comboBar; g.clear();
    const fr = this.isFrenzy();
    const v = fr ? Math.max(0, (this.frenzyUntil - Date.now()) / E.frenzy.durationMs) : this.combo;
    if (v <= 0.01 && !fr) { this.frenzyLabel.setVisible(false); return; }
    const w = 300, h = 14, x = 300 - w / 2, y = SLIME_BOTTOM + 30;
    g.fillStyle(0x140a38, 0.8); g.fillRoundedRect(x, y, w, h, 7);
    g.fillStyle(fr ? 0xff7a3a : 0xffd23a, 1); g.fillRoundedRect(x, y, Math.max(h, w * v), h, 7);
    g.lineStyle(2, 0xffffff, 0.6); g.strokeRoundedRect(x, y, w, h, 7);
    this.frenzyLabel.setVisible(fr);
    if (fr) this.frenzyLabel.setScale(1 + Math.sin(Date.now() / 90) * 0.06);
  }

  // =====================================================================
  //  ИГРОВОЙ ЦИКЛ
  // =====================================================================
  update(time, delta) {
    const d = this.d;
    const now = Date.now();
    let dt = (now - this.lastTick) / 1000;
    this.lastTick = now;
    if (dt < 0) dt = 0;

    if (this.dirty) { this.cpsCache = Eco.cps(d, now); this.dirty = false; }
    // истечение временных эффектов меняет доход

    // Начисляем только за реальное время игры: вкладка видима и окно в фокусе. Пауза на рекламе, сон устройства — не в счёт:
    // длинный разрыв между кадрами засчитывается максимум как 1 секунда.
    const present = !this.away && !document.hidden;
    if (present && dt > 0 && this.cpsCache > 0) { Eco.addGel(d, this.cpsCache * Math.min(dt, 1)); }
    this.pauseBanner.setVisible(this.away && !document.hidden);

    // анимация числа
    const diff = d.gel - this.shownGel;
    this.shownGel += diff * Math.min(1, delta * 0.02);
    if (Math.abs(diff) < Math.max(0.5, d.gel * 0.0005)) this.shownGel = d.gel;

    // пружина слайма
    const dts = Math.min(delta / 1000, 0.05);
    this.squashV += (-90 * this.squash - 9 * this.squashV) * dts;
    this.squash += this.squashV * dts;
    this.squash = Phaser.Math.Clamp(this.squash, -0.7, 1.1);
    const breath = Math.sin(time / 520) * 0.018;
    const sc = SLIME_SCALE;
    this.slime.setScale(sc * (1 + 0.16 * this.squash - breath * 0.6), sc * (1 - 0.2 * this.squash + breath));
    this.shadow.setScale(0.9 * (1 + 0.1 * this.squash) * 1, 0.9);
    if (this.time.now > this.happyUntil && !this.isFrenzy()) this.setSlimeTexture();
    // моргание («хихиканье») и пассивные «пульсы» дохода — слайм живой, даже если игрок не тапает
    if (time > this.nextBlink) {
      this.nextBlink = time + Phaser.Math.Between(2600, 5200);
      if (!this.isFrenzy() && !this.modal) { this.happyUntil = this.time.now + 140; this.setSlimeTexture(); }
    }
    if (this.cpsCache > 0 && time > this.nextPulse && !this.modal && !this.shopOpen && this.floatCount < 10) {
      this.nextPulse = time + 1600;
      this.floatCount++;
      const px = SLIME_X + Phaser.Math.Between(-120, 120);
      const tx = makeText(this, px, SLIME_BOTTOM - 210, '+' + fmt(this.cpsCache * 1.6), 24, '#bff6ff', { sw: 5 }).setDepth(40).setAlpha(0.85);
      this.tweens.add({ targets: tx, y: tx.y - 70, alpha: 0, duration: 1300, ease: 'Sine.Out', onComplete: () => { tx.destroy(); this.floatCount--; } });
    }
    // аура ярости
    this.aura.setAlpha(this.isFrenzy() ? 0.45 + Math.sin(time / 80) * 0.15 : this.aura.alpha * 0.9);

    // комбо затухает
    if (!this.isFrenzy() && this.combo > 0 && now - this.lastTapAt > E.frenzy.holdMs) this.combo = Math.max(0, this.combo - E.frenzy.decayPerSec * (delta / 1000));
    this.drawCombo();

    // редкие тики
    this.textTimer += delta;
    if (this.textTimer > 50) { this.textTimer = 0; this.refreshHud(); }
    this.slowTimer += delta;
    if (this.slowTimer > 250) { this.slowTimer = 0; this.dirty = true; this.panel.refresh(); this.checkEvolution(); }
    this.saveTimer += delta;
    if (this.saveTimer > 5000) { this.saveTimer = 0; this.persist(false); }
    this.adTimer += delta;
    if (this.adTimer > 400) { this.adTimer = 0; this.adTick(); this.goldenTick(); this.dailyTick(); this.syncGameplay(); }

    this.panel.update(dts);
  }

  persist(important) {
    YandexSDK.save(important);
    if (important) YandexSDK.flushCloud();
  }

  // =====================================================================
  //  ПОКУПКИ
  // =====================================================================
  sfx(key, vol = 0.7) { Sfx.play(this, key, { volume: vol }); }

  hintRow(row) {
    const d = this.d;
    if (d.gens[0] === 0 && d.tapLevel === 0) return row.kind === 'gen' && row.idx === 0;
    if (d.tapLevel === 0 && d.gens[0] > 0 && d.taps < 400) return row.kind === 'tap';
    return false;
  }

  notEnough(kind) {
    const now = performance.now();
    this.sfx('denied', 0.5);
    if (now - this.lastToastAt < 900) return;
    this.lastToastAt = now;
    toast(this, t(kind === 'gems' ? 'noGems' : 'noMoney'), 590);
  }

  buyGen(i, n) {
    const d = this.d;
    const before = Eco.milestoneMult(d.gens[i]);
    if (!Eco.buyGen(d, i, n)) return false;
    this.dirty = true;
    this.sfx('buy', 0.6);
    this.floatAtSlime('-' + fmt(this.panel.rows[0][i + 1].cost), '#ffd0d0', 28);
    if (Eco.milestoneMult(d.gens[i]) > before) {
      this.sfx('gem', 0.6);
      toast(this, lname(GENS[i]) + ': x2!', 560);
      burst(this, 300, 700, [0xffe14d, 0xffffff], 18, { depth: 80 });
    }
    this.persist(false);
    return true;
  }

  buyTap(n) {
    const d = this.d;
    const cost = Eco.tapCost(d.tapLevel, n);
    if (!Eco.buyTap(d, n)) return false;
    this.dirty = true;
    this.sfx('buy', 0.6);
    this.floatAtSlime('-' + fmt(cost), '#ffd0d0', 28);
    this.squashV += 4;
    this.persist(false);
    return true;
  }

  floatAtSlime(str, color, size) { floatText(this, SLIME_X + Phaser.Math.Between(-60, 60), SLIME_BOTTOM - 250, str, color, size, 50); }

  gemVideoReady(now) { return this.d.gemVideoAt <= now && YandexSDK.canShowRewarded(); }

  buyGemItem(kind, row) {
    const d = this.d, now = Date.now();
    const it = E.gemShop.find((x) => x.id === kind);
    if (!it) return;
    if (d.gems < it.cost) { this.notEnough('gems'); return; }
    d.gems -= it.cost;
    if (kind === 'turbo') {
      Eco.addBoost(d, now, E.boost.gemMs, E.boost.gemMult);
      this.dirty = true;
      toast(this, t('turbo') + '!', 560);
    } else {
      const gain = Math.max(Eco.cps(d, 0) * 3600 * it.hours, Eco.tapBaseValue(d) * 50);
      Eco.addGel(d, gain);
      toast(this, '+' + fmt(gain), 560);
    }
    this.sfx('buy', 0.7); this.sfx('gem', 0.4);
    this.persist(true);
  }

  openShop() {
    if (this.shopOpen || this.modal) return;
    this.shopOpen = true;
    this.input.enabled = false;
    this.persist(true);
    this.scene.launch('ShopScene', { parent: 'PlayScene' });
  }
  onShopClosed() {
    this.shopOpen = false;
    this.input.enabled = true;
    this.dirty = true;
    this.lastTick = Date.now(); // время в магазине уже было начислено в update
    this.refreshHud(true);
    this.panel.refresh(true);
    this.persist(true);
  }

  // =====================================================================
  //  РЕКЛАМА
  // =====================================================================
  failAd() { toast(this, t('adFail'), 560); this.sfx('denied', 0.4); }

  async rewarded(fn) {
    if (!YandexSDK.canShowRewarded()) { this.failAd(); return false; }
    this.cancelCountdown();
    YandexSDK.gameplayStop();
    const ok = await YandexSDK.showRewarded(fn);   // награда выдаётся только внутри onRewarded
    YandexSDK.gameplayStart();
    this.lastTick = Date.now();
    this.refreshHud(true); this.panel.refresh(true);
    if (!ok) this.failAd();
    return ok;
  }

  onBoostClick() {
    this.rewarded(() => {
      Eco.addBoost(this.d, Date.now(), E.boost.adMs, E.boost.mult);
      this.dirty = true;
      this.sfx('gold_get', 0.6);
      toast(this, t('boostName') + ' x2!', 560);
      this.persist(true);
    });
  }

  onGiftClick() {
    const d = this.d;
    if (Date.now() < d.giftAt) { this.sfx('denied', 0.4); return; }
    this.rewarded(() => {
      const gain = Math.max(Eco.cps(d, 0) * E.gift.minutes * 60, Eco.tapBaseValue(d) * 100, 50);
      Eco.addGel(d, gain);
      d.giftAt = Date.now() + E.gift.cooldownMs;
      this.sfx('gold_get', 0.7);
      burst(this, 300, 400, [0xffe14d, 0xffffff, 0xff9ae8], 28, { depth: 80 });
      floatText(this, 300, 330, '+' + fmt(gain), '#ffe14d', 54, 90);
      this.persist(true);
    });
  }

  watchGemVideo() {
    const d = this.d;
    if (d.gemVideoAt > Date.now()) { this.sfx('denied', 0.4); return; }
    this.rewarded(() => {
      d.gems += E.gemVideo.gems;
      d.gemVideoAt = Date.now() + E.gemVideo.cooldownMs;
      this.sfx('gem', 0.8);
      toast(this, t('goldGems', { n: E.gemVideo.gems }), 560);
      this.persist(true);
    });
  }

  // Межстраничная реклама только в «безопасные» моменты: игрок не тапает, нет окон, прошло ≥ 2 минут
  adTick() {
    if (this.away) { this.cancelCountdown(); return; }
    if (this.countdown || this.modal || this.shopOpen) return;
    if (!YandexSDK.canShowInterstitial()) return;
    if (Date.now() - this.lastTapAt < CONFIG.ads.idleBeforeAdMs) return;
    this.startCountdown();
  }
  startCountdown() {
    let n = CONFIG.ads.countdownSec;
    this.adBanner.setVisible(true).setText(t('adSoon', { n }));
    this.countdown = this.time.addEvent({
      delay: 1000, repeat: n - 1,
      callback: () => {
        n--;
        if (n > 0) { this.adBanner.setText(t('adSoon', { n })); return; }
        this.cancelCountdown();
        this.showInterstitialNow();
      }
    });
  }
  cancelCountdown() {
    if (!this.countdown) return;
    this.countdown.remove(false); this.countdown = null;
    this.adBanner.setVisible(false);
  }
  async showInterstitialNow() {
    if (this.modal || this.shopOpen || !YandexSDK.canShowInterstitial()) return;
    YandexSDK.gameplayStop();
    await YandexSDK.showInterstitial();
    YandexSDK.gameplayStart();
    this.lastTick = Date.now();
  }
  // Естественные паузы: после закрытия окна эволюции / рождения / подарка
  afterNaturalPause() {
    this.time.delayedCall(700, () => { if (!this.modal && !this.shopOpen) this.showInterstitialNow(); });
  }

  syncGameplay() {
    const active = !this.modal && !this.shopOpen && !YandexSDK.busy && !document.hidden && !this.away;
    if (active) YandexSDK.gameplayStart(); else YandexSDK.gameplayStop();
  }

  // =====================================================================
  //  ЗОЛОТОЙ ПУЗЫРЬ
  // =====================================================================
  goldenTick() {
    const now = Date.now();
    if (this.golden || this.modal || this.shopOpen || this.away) return;
    if (now < this.goldenAt) return;
    this.spawnGolden();
  }
  spawnGolden() {
    const fromLeft = Math.random() < 0.5;
    const y0 = Phaser.Math.Between(190, 400);
    const g = this.add.image(fromLeft ? -80 : 680, y0, 'gold').setDisplaySize(104, 104).setDepth(40);
    g.setInteractive({ useHandCursor: true });
    this.golden = g;
    g.glow = this.add.image(g.x, g.y, 'spark').setTint(0xffe27a).setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(190, 190).setDepth(39).setAlpha(0.7);
    this.sfx('gold_spawn', 0.7);
    const dir = fromLeft ? 1 : -1;
    const life = E.golden.lifeMs;
    this.tweens.add({
      targets: g, x: fromLeft ? 680 : -80, duration: life, ease: 'Linear',
      onUpdate: (tw, tg) => { tg.y = y0 + Math.sin(tg.x / 55) * 40; g.glow.setPosition(tg.x, tg.y); g.setAngle(Math.sin(tg.x / 40) * 10); },
      onComplete: () => this.removeGolden(false)
    });
    this.tweens.add({ targets: g, scale: g.scale * 1.12, duration: 420, yoyo: true, repeat: -1 });
    g.once('pointerdown', () => this.collectGolden());
  }
  removeGolden(collected) {
    if (!this.golden) return;
    const g = this.golden;
    this.golden = null;
    this.tweens.killTweensOf(g);
    g.glow.destroy(); g.destroy();
    this.goldenAt = Date.now() + Phaser.Math.Between(E.golden.minMs, E.golden.maxMs);
  }
  collectGolden() {
    if (!this.golden || this.modal || this.shopOpen) return;
    const g = this.golden;
    const x = g.x, y = g.y;
    const d = this.d, now = Date.now();
    this.sfx('gold_get', 0.8);
    burst(this, x, y, [0xffe14d, 0xffffff, 0xffb347], 26, { depth: 90 });
    shock(this, x, y, 0xffe14d, 240, 90);
    this.removeGolden(true);

    const r = Math.random();
    let msg, big = '';
    if (r < 0.5) {
      const gain = Math.max(Eco.cps(d, 0) * 180, Eco.tapBaseValue(d) * 60, 25);
      Eco.addGel(d, gain);
      msg = t('goldLucky', { n: fmt(gain) });
    } else if (r < 0.72) {
      d.goldUntil = now + 30000; this.dirty = true;
      msg = t('goldFrenzy');
    } else if (r < 0.9) {
      d.stormUntil = now + 15000; this.dirty = true;
      msg = t('goldStorm');
    } else {
      const gems = 2 + Math.floor(Math.random() * 3);
      d.gems += gems;
      msg = t('goldGems', { n: gems });
      this.sfx('gem', 0.8);
    }
    const tx = makeText(this, 300, Math.max(210, y), msg, 38, '#ffe14d', { sw: 8, wrap: 520 }).setDepth(95);
    this.tweens.add({ targets: tx, y: tx.y - 90, alpha: 0, duration: 1500, delay: 500, onComplete: () => tx.destroy() });
    this.persist(true);
  }

  // =====================================================================
  //  ЭВОЛЮЦИЯ
  // =====================================================================
  checkEvolution(silent = false) {
    const d = this.d;
    const st = Eco.stageFor(d.allTime);
    if (st <= d.seenStage) return;
    let gems = 0;
    for (let s = d.seenStage + 1; s <= st; s++) gems += E.stages[s].gems;
    const from = d.seenStage;
    d.seenStage = st;
    d.gems += gems;
    this.dirty = true;
    this.persist(true);
    if (silent && from === 0 && this.shownStage >= st) return;
    this.queueModal(() => this.openEvolutionModal(st, gems));
  }

  openEvolutionModal(stage, gems) {
    // превращение происходит прямо на глазах, потом показываем окно
    this.sfx('evolve', 0.9);
    this.cameras.main.flash(500, 255, 255, 255);
    shock(this, SLIME_X, SLIME_BOTTOM - 120, 0xffffff, 520, 100);
    burst(this, SLIME_X, SLIME_BOTTOM - 140, [0xffe14d, 0xffffff, 0xff9ae8, 0x9af3ff], 60, { speed: 520, gravity: 120, depth: 100 });
    this.changeStageVisuals(stage, true);
    this.squashV += 10;

    const newMult = E.stages[stage].mult;
    return openModal(this, {
      h: 780, title: t('evolution'), titleColors: ['#fffbb0', '#ffb02e'],
      build: (c) => {
        const glow = this.add.image(0, -70, 'spark').setTint(0xfff2a0).setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(480, 480).setAlpha(0.8);
        const img = this.add.image(0, -60, 'slime' + stage + '_0').setDisplaySize(310, 310);
        this.tweens.add({ targets: img, scaleY: img.scaleY * 1.04, scaleX: img.scaleX * 0.98, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
        const name = makeText(this, 0, -262, t('evolvedInto', { name: lname(E.stages[stage]) }), 30, '#ffffff', { sw: 6 });
        if (name.width > 480) name.setScale(480 / name.width);
        const bonus = makeText(this, 0, 138, t('bonusAll', { n: newMult }), 26, '#7dff9a', { sw: 5 });
        const gtx = makeText(this, 0, 92, '+' + gems, 38, '#ffffff', { ox: 0, sw: 6 });
        const gem = this.add.image(0, 92, 'gem').setDisplaySize(46, 46);
        const tw = 46 + 10 + gtx.width;
        gem.setX(-tw / 2 + 23); gtx.setX(-tw / 2 + 56);
        c.add([glow, img, name, bonus, gem, gtx]);
        c.sendToBack(glow);
      },
      buttons: [
        { label: t('claim'), kind: 'green', size: 32 },
        { label: t('claimX2'), kind: 'gold', icon: 'ic_video', size: 26, keepOpen: true, onClick: (h) => this.rewarded(() => { this.d.gems += gems; this.sfx('gem', 0.8); toast(this, t('goldGems', { n: gems }), 560); this.persist(true); }).then((ok) => { if (ok) h.close(); }) }
      ],
      onClose: () => this.onModalClosed(true)
    });
  }

  // =====================================================================
  //  ОКНА: очередь
  // =====================================================================
  queueModal(openFn) { this.modalQueue.push(openFn); this.pumpModals(); }
  pumpModals() {
    if (this.modal || !this.modalQueue.length) return;
    const fn = this.modalQueue.shift();
    this.modal = true; // резервируем до создания окна
    const h = fn();
    this.modal = h || null;
    if (!h) this.pumpModals();
    this.dirty = true;
  }
  onModalClosed(natural) {
    this.modal = null;
    this.lastTick = Date.now();
    this.refreshHud(true);
    this.panel.refresh(true);
    if (this.modalQueue.length) this.time.delayedCall(250, () => this.pumpModals());
    else if (natural) this.afterNaturalPause();
  }

  // ---------- ежедневные награды ----------
  // Окно показывается, когда игрок уже освоился (intro пройдено) и нет других окон; проверка раз в минуту
  dailyTick() {
    const now = Date.now();
    if (this.modal || this.dailyPending || !this.d.intro || this.away) return;
    if (now - this.dailyChecked < 60000) return;
    this.dailyChecked = now;
    const st = Eco.dailyStatus(this.d, now);
    if (!st.claimable) return;
    this.dailyPending = true;
    this.queueModal(() => this.openDailyModal(st));
  }

  openDailyModal(st) {
    const d = this.d;
    this.dailyPending = true;
    // «новичку» не показываем окно до первых тапов, чтобы оно не перекрывало подсказку
    const reward = Eco.dailyReward(d, st.day, Date.now());
    return openModal(this, {
      h: 760, title: t('dailyTitle'),
      build: (c) => {
        c.add(makeText(this, 0, -250, t('dailyStreak'), 20, '#e6dcff', { wrap: 470, sw: 4, shadow: false }));
        for (let i = 1; i <= 7; i++) {
          const col = (i - 1) % 4, rowN = Math.floor((i - 1) / 4);
          const per = rowN === 0 ? 4 : 3;
          const cx = (col - (per - 1) / 2) * 118, cy = -150 + rowN * 150;
          const isToday = i === st.day, done = i < st.day;
          const card = this.add.image(cx, cy, isToday ? 'row_hi' : 'row').setDisplaySize(108, 128);
          if (done) card.setAlpha(0.55);
          c.add(card);
          c.add(makeText(this, cx, cy - 46, t('dailyDay', { n: i }), 17, '#ffffff', { sw: 3, shadow: false }));
          c.add(this.add.image(cx, cy - 6, 'gem').setDisplaySize(40, 40));
          c.add(makeText(this, cx, cy + 32, '+' + E.daily.gems[i - 1], 24, '#7df3ff', { sw: 4 }));
          c.add(makeText(this, cx, cy + 56, '+' + fmtAway(E.daily.gelMinutes[i - 1] * 60), 14, '#cfc6ff', { sw: 2, shadow: false }));
          if (done) c.add(makeText(this, cx, cy - 6, '✓', 54, '#7dff9a', { sw: 6 }));
        }
        const gv = makeText(this, 0, 122, '+' + fmt(reward.gel), 30, '#ffffff', { ox: 0, sw: 6 });
        const gm = makeText(this, 0, 122, '+' + reward.gems, 30, '#7df3ff', { ox: 0, sw: 6 });
        const totalW = 40 + 8 + gv.width + 40 + 40 + 8 + gm.width;
        let x = -totalW / 2;
        c.add(this.add.image(x + 20, 122, 'gel').setDisplaySize(40, 40)); gv.setX(x + 48); x += 48 + gv.width + 40;
        c.add(this.add.image(x + 20, 122, 'gem').setDisplaySize(40, 40)); gm.setX(x + 48);
        c.add([gv, gm]);
      },
      buttons: [
        { label: t('claim'), kind: 'green', onClick: () => { Eco.claimDaily(d, Date.now(), 1); this.sfx('gem', 0.9); this.dirty = true; this.persist(true); } },
        { label: t('claimX2'), kind: 'gold', icon: 'ic_video', size: 26, keepOpen: true,
          onClick: (h) => this.rewarded(() => { Eco.claimDaily(d, Date.now(), 2); this.sfx('gem', 0.9); this.dirty = true; this.persist(true); }).then((ok) => { if (ok) h.close(); }) }
      ],
      onClose: () => { this.dailyPending = false; this.onModalClosed(false); }
    });
  }

  // ---------- перерождение ----------
  openLanguageModal() {
    if (this.modal || this.shopOpen || YandexSDK.busy) return;
    const cur = getLang();
    this.queueModal(() => openModal(this, {
      h: 520, title: t('language'), titleColors: ['#c6f3ff', '#4db8ff'],
      buttons: [
        ...LANGS.map((code) => ({
          label: LANG_NAMES[code], kind: code === cur ? 'green' : 'blue', icon: 'flag_' + code, w: 420, h: 84, size: 32,
          onClick: () => this.changeLanguage(code)
        })),
        { label: t('close'), kind: 'dark', w: 260, h: 64, size: 26, onClick: () => {} }
      ],
      onClose: () => this.onModalClosed(false)
    }));
  }
  // Смена языка: сохраняем выбор и перезапускаем сцену, чтобы все надписи перестроились
  changeLanguage(code) {
    if (code === getLang()) return;
    YandexSDK.setUserLang(code);
    this.persist(true);
    this.time.delayedCall(260, () => this.scene.restart());
  }

  requestRebirth() {
    const d = this.d;
    const gain = Eco.essenceGain(d.runGel);
    if (this.modal) return;
    if (gain < 1) { this.notEnough('gel'); return; }
    this.queueModal(() => openModal(this, {
      h: 560, title: t('rebirthTitle'), titleColors: ['#f0d6ff', '#c07bff'],
      build: (c) => {
        c.add(this.add.image(0, -112, 'e_sparkle').setDisplaySize(84, 84));
        c.add(makeText(this, 0, -12, t('rebirthConfirm', { n: gain }), 25, '#ffffff', { wrap: 470, sw: 5 }));
      },
      buttons: [
        { label: t('yes'), kind: 'purple', w: 260, onClick: () => this.doRebirth() },
        { label: t('no'), kind: 'dark', w: 260, h: 70, size: 28, onClick: () => {} }
      ],
      onClose: () => this.onModalClosed(false)
    }));
  }
  doRebirth() {
    const d = this.d;
    const gain = Eco.applyRebirth(d);
    if (!gain) return;
    this.sfx('rebirth', 0.9);
    this.cameras.main.flash(600, 220, 180, 255);
    burst(this, SLIME_X, SLIME_BOTTOM - 120, [0xd78bff, 0xffffff, 0xff9ae8], 50, { speed: 500, gravity: 100, depth: 100 });
    this.shownGel = 0;
    this.dirty = true;
    this.panel.scroll = [0, 0];
    this.panel.setTab(0);
    toast(this, t('rebirthDone', { n: gain }), 560);
    this.persist(true);
    this.time.delayedCall(900, () => this.afterNaturalPause());
  }
}
