import { CONFIG, DESIGN, t } from '../config.js';
import { YandexSDK } from '../yandexSDK.js';
import { Sfx } from '../audio.js';
import { fmt } from '../format.js';
import { fitCamera, makeText, gradientText, makeButton, toast, floatText } from '../ui.js';

// Магазин внутриигровых покупок. Открывается поверх игры (scene.launch); игровая сцена продолжает считать доход,
// но её ввод отключён на время открытия магазина.
export class ShopScene extends Phaser.Scene {
  constructor() { super('ShopScene'); }

  init(data) { this.parentKey = (data && data.parent) || 'PlayScene'; }

  create() {
    fitCamera(this, true);
    const { W } = DESIGN;
    this.rows = [];
    this.buying = false;

    this.add.rectangle(W / 2, 500, 6000, 6000, 0x0a0420, 0.8).setInteractive();
    this.add.image(W / 2, 505, 'panel').setDisplaySize(540, 800);

    const title = makeText(this, W / 2, 168, t('shop'), 54, '#ffffff', { sw: 9 });
    gradientText(title, '#fff6a8', '#ff9a1f');

    this.add.image(W / 2 - 62, 226, 'gem').setDisplaySize(38, 38);
    this.gemText = makeText(this, W / 2 - 36, 226, fmt(YandexSDK.data.gems), 30, '#7df3ff', { ox: 0 });

    this.info = makeText(this, W / 2, 500, t('shopLoading'), 28, '#cbbfff', { wrap: 440 });
    this.closeBtn = makeButton(this, W / 2, 868, t('close'), 'dark', () => this.close(), { w: 300, h: 70, size: 28 });
    this.loadCatalog();
  }

  async loadCatalog() {
    if (!YandexSDK.paymentsAvailable) { this.info.setText(t('payUnavailable')); return; }
    let catalog;
    try { catalog = await YandexSDK.getCatalog(); }
    catch (e) { console.warn('[Shop] catalog failed', e); this.info.setText(t('payUnavailable')); return; }
    if (!this.scene.isActive()) return;
    if (!Object.keys(catalog).length) { this.info.setText(t('payUnavailable')); return; }
    // Иконка портальной валюты приходит из SDK (требование 1.13.2) — подгружаем один раз
    const iconUrl = Object.values(catalog).map((c) => c.icon).find(Boolean);
    if (iconUrl && !this.textures.exists('curr_icon')) {
      await new Promise((resolve) => {
        const done = () => { this.load.off('complete', done); this.load.off('loaderror', done); resolve(); };
        this.load.once('complete', done);
        this.load.once('loaderror', done);
        this.load.setCORS && (this.load.crossOrigin = 'anonymous');
        this.load.image('curr_icon', iconUrl);
        this.load.start();
      });
      if (!this.scene.isActive()) return;
    }
    this.hasCurrIcon = this.textures.exists('curr_icon');
    this.info.destroy();

    let y = 320;
    for (const prod of CONFIG.shop.products) {
      const item = catalog[prod.id];
      if (!item) continue; // товар не заведён в консоли — не показываем
      this.addRow(prod, item, y);
      y += 114;
    }
  }

  isOwned(prod) {
    const d = YandexSDK.data;
    return (prod.type === 'noads' && d.noAds) || (prod.type === 'x2' && d.x2);
  }

  addRow(prod, item, y) {
    const W = DESIGN.W;
    this.add.image(W / 2, y, 'row').setDisplaySize(500, 100);
    const iconKey = prod.type === 'noads' ? 'e_noads' : prod.type === 'x2' ? 'e_x2' : 'gem';
    this.add.image(W / 2 - 205, y, iconKey).setDisplaySize(58, 58);
    let name, sub, subColor = '#7dff9a';
    if (prod.type === 'noads') { name = t('noAds'); sub = t('noAdsDesc'); subColor = '#cbbfff'; }
    else if (prod.type === 'x2') { name = t('x2Forever'); sub = t('x2Desc'); subColor = '#cbbfff'; }
    else { name = t('gemsN', { n: fmt(prod.gems) }); sub = prod.badge || ''; }
    const nameTx = makeText(this, W / 2 - 165, y - 16, name, 24, '#ffffff', { ox: 0, sw: 4 });
    if (nameTx.width > 190) nameTx.setScale(190 / nameTx.width);
    const subTx = makeText(this, W / 2 - 165, y + 16, sub, 15, subColor, { ox: 0, sw: 3, shadow: false, wrap: 200, align: 'left' });
    if (subTx.height > 36) subTx.setScale(36 / subTx.height);
    const owned = this.isOwned(prod);
    // цена: число + иконка валюты из SDK; если иконка не загрузилась — «<цена> <код валюты>» как есть
    const withIcon = !owned && this.hasCurrIcon && item.priceValue;
    const btn = makeButton(this, W / 2 + 160, y, owned ? t('ownedShort') : (withIcon ? item.priceValue : item.price), owned ? 'dark' : 'gold',
      () => this.buy(prod, btn), { w: 156, h: 66, size: 22, icon: withIcon ? 'curr_icon' : undefined, iconRight: true });
    if (owned) btn.setEnabled(false);
    this.rows.push({ prod, btn });
  }

  async buy(prod, btn) {
    if (this.buying || YandexSDK.busy) return;
    this.buying = true;
    const ok = await YandexSDK.purchase(prod.id);
    this.buying = false;
    if (!this.scene.isActive()) return;
    this.gemText.setText(fmt(YandexSDK.data.gems));
    if (ok) {
      Sfx.play(this, 'gem');
      toast(this, t('purchased'));
      if (prod.type !== 'gems') btn.setLabel(t('ownedShort')).setEnabled(false);
      else floatText(this, DESIGN.W / 2, 226, '+' + fmt(prod.gems), '#7df3ff', 40);
    } else {
      toast(this, t('purchaseFail'));
    }
  }

  close() {
    if (this.buying) return;
    const parent = this.scene.get(this.parentKey);
    this.scene.stop();
    if (parent && parent.onShopClosed) parent.onShopClosed();
  }
}
