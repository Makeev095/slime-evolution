import { DESIGN, t, getLang } from '../config.js';
import { YandexSDK } from '../yandexSDK.js';
import { Sfx } from '../audio.js';
import { fitCamera, makeText, buildTextureJobs, gradientText } from '../ui.js';

const nextFrame = () => new Promise((r) => setTimeout(r, 0));

// Прелоадер: инициализирует Yandex SDK, загружает сохранения, процедурно рисует графику и звук.
export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  create() {
    fitCamera(this);
    const { W } = DESIGN;
    this.target = 0;
    this.shown = 0;
    this.finished = false;
    this.leaving = false;

    this.add.rectangle(W / 2, 500, 6000, 6000, 0x1a1040);
    this.blob = this.add.graphics();
    this.bar = this.add.graphics();
    this.title = makeText(this, W / 2, 190, 'SLIME EVOLUTION', 56, '#ffffff', { sw: 9 });
    gradientText(this.title, '#b9ffb0', '#2fd16a');
    this.status = makeText(this, W / 2, 700, t('loading') + '…', 26, '#cbbfff');
    this.percent = makeText(this, W / 2, 655, '0%', 30, '#ffffff');

    this.bootstrap().catch((e) => {
      console.error('[Boot] failed', e);
      this.status.setText('Error: ' + (e && e.message ? e.message : e));
    });
  }

  async bootstrap() {
    const jobs = buildTextureJobs(this);
    // вес: SDK=3, сохранения=2, каждая текстура=1, аудио=3
    const total = 3 + 2 + jobs.length + 3;
    let done = 0;
    const step = (w) => { done += w; this.target = Math.min(1, done / total); };

    await YandexSDK.init(this.game);
    this.title.setText(getLang() === 'ru' ? 'СЛАЙМ: ЭВОЛЮЦИЯ' : 'SLIME EVOLUTION');
    gradientText(this.title, '#b9ffb0', '#2fd16a');
    this.status.setText(t('loading') + '…');
    step(3);

    await YandexSDK.loadData();
    await YandexSDK.restorePurchases(); // подхватываем недообработанные покупки
    step(2);

    for (const job of jobs) {
      job();
      step(1);
      await nextFrame();
    }

    Sfx.init(this.game);
    YandexSDK.applyAudioState();
    step(3);
    this.finished = true;
  }

  update(time, delta) {
    this.shown += (this.target - this.shown) * Math.min(1, delta * 0.008);
    this.drawBlob(time);
    this.drawBar();
    this.percent.setText(Math.round(this.shown * 100) + '%');
    if (this.finished && this.shown > 0.985 && !this.leaving) {
      this.leaving = true;
      this.cameras.main.fadeOut(250, 26, 16, 64);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('PlayScene'));
    }
  }

  // Прыгающий зелёный слайм, пока всё грузится
  drawBlob(time) {
    const g = this.blob;
    const cx = DESIGN.W / 2, baseY = 520;
    const p = (time % 900) / 900;
    const jump = Math.abs(Math.sin(p * Math.PI)) * 90;
    const sq = p < 0.08 || p > 0.92 ? 0.82 : 1 + (jump / 90) * 0.1;
    const w = 170 * (2 - sq), h = 140 * sq;
    g.clear();
    g.fillStyle(0x000000, 0.25); g.fillEllipse(cx, baseY + 8, 150 - jump * 0.5, 26);
    g.fillStyle(0x2fd16a, 1); g.fillEllipse(cx, baseY - jump - h / 2 + 10, w, h);
    g.fillStyle(0x9bffb5, 0.7); g.fillEllipse(cx - w * 0.2, baseY - jump - h * 0.75, w * 0.22, h * 0.2);
    g.fillStyle(0xffffff, 1); g.fillCircle(cx - 30, baseY - jump - h * 0.52, 14); g.fillCircle(cx + 30, baseY - jump - h * 0.52, 14);
    g.fillStyle(0x1b1340, 1); g.fillCircle(cx - 27, baseY - jump - h * 0.5, 7); g.fillCircle(cx + 33, baseY - jump - h * 0.5, 7);
  }

  drawBar() {
    const g = this.bar;
    const w = 420, h = 28, x = DESIGN.W / 2 - w / 2, y = 600;
    g.clear();
    g.fillStyle(0x140a38, 1); g.fillRoundedRect(x, y, w, h, 14);
    g.lineStyle(3, 0x6a58b8, 1); g.strokeRoundedRect(x, y, w, h, 14);
    const fw = Math.max(h, w * this.shown);
    g.fillStyle(0x34d17a, 1); g.fillRoundedRect(x, y, fw, h, 14);
    g.fillStyle(0xd6ffe4, 0.55); g.fillRoundedRect(x + 5, y + 4, Math.max(4, fw - 10), 8, 4);
  }
}
