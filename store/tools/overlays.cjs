// Надписи для видео (прозрачные PNG) и финальная заставка рекламного ролика, на трёх языках.
//   NODE_PATH=/tmp/promo/node_modules node store/tools/overlays.cjs <outDir>
// Горизонталь 1920x1080: игра 1920x930 + шапка 150px. Вертикаль 1080x1920: игра 1080x1620 + шапка 150px + подвал 150px.
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = process.argv[2] || '/tmp/vid/ov';
fs.mkdirSync(OUT, { recursive: true });
const FONT = 'data:font/woff2;base64,' + fs.readFileSync(path.join(ROOT, 'fonts', 'Nunito.woff2')).toString('base64');
const ICON = 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'store', 'icon-512x512.png')).toString('base64');

const TITLE = { ru: 'Слайм: Эволюция', en: 'Slime Evolution', tr: 'Slime Evrimi' };
const PROMO = {
  ru: [['Тапай слайма!', 'Каждое касание — желе'], ['Эволюционируй!', 'Рыцарь, маг, дракон, космонавт…'], ['Кристаллы и бонусы', 'Перемотка, турбо и подарки'], ['Лови золотые пузыри', 'Ярость делает тапы x3'], [TITLE.ru, 'Играй бесплатно в Яндекс Играх']],
  en: [['Tap the slime!', 'Every touch makes jelly'], ['Evolve!', 'Knight, wizard, dragon, astronaut…'], ['Crystals and boosts', 'Time warp, turbo and gifts'], ['Catch golden bubbles', 'Frenzy makes taps x3'], [TITLE.en, 'Play free on Yandex Games']],
  tr: [["Slime'a dokun!", 'Her dokunuş jöle kazandırır'], ['Evrimleş!', 'Şövalye, büyücü, ejderha, astronot…'], ['Kristaller ve bonuslar', 'Zaman atlama, turbo ve hediyeler'], ['Altın baloncukları yakala', 'Çılgınlıkta dokunuşlar x3'], [TITLE.tr, "Yandex Games'te ücretsiz oyna"]]
};
const AD = {
  ru: [['Тапай и копи желе', 'Каждое касание — желе'], ['Эволюционируй!', 'От капельки до Бога слаймов'], ['Лови золотые пузыри', 'Ярость, бонусы и подарки']],
  en: [['Tap and collect jelly', 'Every touch makes jelly'], ['Evolve!', 'From a droplet to the Slime God'], ['Catch golden bubbles', 'Frenzy, bonuses and gifts']],
  tr: [['Dokun ve jöle topla', 'Her dokunuş jöle kazandırır'], ['Evrimleş!', "Damladan Slime Tanrısı'na"], ['Altın baloncukları yakala', 'Çılgınlık, bonuslar ve hediyeler']]
};
const CTA = { ru: ['Играй бесплатно', 'ИГРАТЬ'], en: ['Play for free', 'PLAY'], tr: ['Ücretsiz oyna', 'OYNA'] };

const css = `@font-face{font-family:Nunito;src:url(${FONT}) format('woff2');font-weight:100 1000}
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:transparent;font-family:Nunito,sans-serif;color:#fff}
.t{font-weight:1000;line-height:1.05;text-align:center;background:linear-gradient(#fff7ae,#ffa11f);-webkit-background-clip:text;color:transparent;filter:drop-shadow(0 4px 0 #1e0f50) drop-shadow(0 0 14px rgba(0,0,0,.45))}
.f{font-weight:800;text-align:center;color:#d9ccff;text-shadow:0 3px 0 rgba(0,0,0,.55)}`;

(async () => {
  const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
  const page = await browser.newPage();
  const render = async (w, h, html, file, opaque) => {
    await page.setViewport({ width: w, height: h });
    await page.setContent(`<style>${css}</style>${html}`);
    await page.evaluate(() => document.fonts.ready);
    await new Promise((r) => setTimeout(r, 80));
    await page.screenshot({ path: path.join(OUT, file), omitBackground: !opaque });
  };
  const hdr = (t, f, sz) => `<div style="position:absolute;left:0;top:0;width:100%;height:150px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px"><div class="t" style="font-size:${sz}px">${t}</div><div class="f" style="font-size:${Math.round(sz * 0.5)}px">${f}</div></div>`;
  for (const lang of ['ru', 'en', 'tr']) {
    const sets = [['promo', PROMO[lang]], ['ad', AD[lang]]];
    for (const [kind, segs] of sets) {
      for (let i = 0; i < segs.length; i++) {
        const [t, f] = segs[i];
        const last = kind === 'promo' && i === segs.length - 1;
        const pre = kind === 'promo' ? '' : 'ad_';
        // горизонталь: заголовок и подпись в шапке
        await render(1920, 1080, hdr(t, f, last ? 74 : 64), `${pre}ov_${lang}_h_${i}.png`);
        // вертикаль: заголовок в шапке, подпись в подвале
        await render(1080, 1920, `<div style="position:absolute;left:0;top:0;width:100%;height:150px;display:flex;align-items:center;justify-content:center;padding:0 30px"><div class="t" style="font-size:${t.length > 20 ? 58 : 66}px">${t}</div></div>
          <div style="position:absolute;left:0;top:1770px;width:100%;height:150px;display:flex;align-items:center;justify-content:center;padding:0 40px"><div class="f" style="font-size:44px">${f}</div></div>`, `${pre}ov_${lang}_v_${i}.png`);
      }
    }
    // финальная заставка рекламы
    const card = (w, h, vertical) => `<style>body{width:${w}px;height:${h}px;background:radial-gradient(circle at 50% 42%,#7a3fd8 0%,#3a1a96 50%,#170a45 100%);display:flex;flex-direction:${vertical ? 'column' : 'row'};align-items:center;justify-content:center;gap:${vertical ? 60 : 90}px;overflow:hidden;position:relative}
      .glow{position:absolute;width:1000px;height:1000px;border-radius:50%;background:radial-gradient(circle,rgba(255,200,90,.38),transparent 65%);left:50%;top:${vertical ? '36%' : '50%'};transform:translate(-50%,-50%)}
      img{width:${vertical ? 520 : 440}px;height:${vertical ? 520 : 440}px;border-radius:110px;box-shadow:0 0 90px rgba(255,190,80,.6);position:relative}
      .badge{display:inline-block;margin-top:34px;padding:16px 56px;border-radius:70px;background:linear-gradient(#4de27a,#1fa84a);color:#fff;font-weight:1000;font-size:${vertical ? 64 : 54}px;text-shadow:0 3px 0 rgba(0,0,0,.35);box-shadow:0 9px 0 #146f31}</style>
      <div class="glow"></div><img src="${ICON}"><div style="position:relative;text-align:center">
      <div class="t" style="font-size:${vertical ? 104 : 92}px">${TITLE[lang].replace(' ', '<br>').replace(': ', ':<br>')}</div>
      <div class="f" style="font-size:${vertical ? 54 : 46}px;margin-top:26px">${CTA[lang][0]}</div>
      <div><span class="badge">${CTA[lang][1]}</span></div></div>`;
    await render(1920, 1080, card(1920, 1080, false), `ec_${lang}_h.png`, true);
    await render(1080, 1920, card(1080, 1920, true), `ec_${lang}_v.png`, true);
    console.log('overlays', lang);
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
