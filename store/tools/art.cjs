// Иконка 512x512, обложки 800x470 (ru/en/tr) и иконки покупок 256x256 для Яндекс Игр.
// Берёт готовые текстуры слаймов прямо из игры, остальное рисует HTML/CSS.
//   NODE_PATH=/tmp/promo/node_modules node store/tools/art.cjs
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { launch } = require('../../tests/lib.cjs');

const ROOT = path.resolve(__dirname, '..');
const FONT = 'data:font/woff2;base64,' + fs.readFileSync(path.join(ROOT, '..', 'fonts', 'Nunito.woff2')).toString('base64');
const TEXT = {
  ru: { t1: 'СЛАЙМ:', t2: 'ЭВОЛЮЦИЯ', sub: 'Тапай, копи желе, эволюционируй!' },
  en: { t1: 'SLIME', t2: 'EVOLUTION', sub: 'Tap, collect jelly, evolve!' },
  tr: { t1: 'SLIME', t2: 'EVRİMİ', sub: 'Dokun, jöle topla, evrimleş!' }
};
const css = `@font-face{font-family:Nunito;src:url(${FONT}) format('woff2');font-weight:100 1000}
*{margin:0;padding:0;box-sizing:border-box}body{font-family:Nunito,sans-serif;overflow:hidden;position:relative}
.stroke{-webkit-text-stroke:0;paint-order:stroke fill}
img{position:absolute}`;

(async () => {
  // текстуры из игры
  const g = await launch(540, 960, { storage: { v: 1, intro: true, lang: 'ru', lastDaily: null } });
  const tex = await g.page.evaluate(() => {
    const out = {}, game = window.__game;
    const get = (k) => game.textures.get(k).getSourceImage().toDataURL('image/png');
    for (let s = 0; s < 7; s++) { out['s' + s] = get('slime' + s + '_1'); out['n' + s] = get('slime' + s + '_0'); }
    out.gem = get('gem'); out.gel = get('gel'); out.gold = get('gold'); out.spark = get('spark');
    return out;
  });
  await g.browser.close();

  const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
  const page = await browser.newPage();
  const shot = async (w, h, html, file) => {
    await page.setViewport({ width: w, height: h });
    await page.setContent(`<style>${css}</style>${html}`);
    await page.evaluate(() => document.fonts.ready);
    await new Promise((r) => setTimeout(r, 150));
    await page.screenshot({ path: file, omitBackground: false });
    console.log('wrote', file);
  };
  const out = (f) => path.join(ROOT, f);
  fs.mkdirSync(out('iap-icons'), { recursive: true });

  const sparkles = (n, w, h, seedv) => {
    let s = seedv, html = '';
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < n; i++) html += `<i style="position:absolute;left:${rnd() * w}px;top:${rnd() * h}px;width:${3 + rnd() * 5}px;height:${3 + rnd() * 5}px;border-radius:50%;background:#fff;opacity:${0.35 + rnd() * 0.5};box-shadow:0 0 8px #fff"></i>`;
    return html;
  };

  // текст с обводкой: нижний слой — толстая обводка, верхний — градиентная заливка
  const fancy = (text, size, x, y, c1, c2) => `<div style="position:absolute;left:${x}px;top:${y}px;font-weight:1000;font-size:${size}px;line-height:1;white-space:nowrap;filter:drop-shadow(0 6px 0 rgba(40,10,90,.6))">
    <div style="-webkit-text-stroke:${Math.round(size / 7)}px #2b1372;color:#2b1372">${text}</div>
    <div style="position:absolute;left:0;top:0;background:linear-gradient(${c1},${c2});-webkit-background-clip:text;color:transparent">${text}</div></div>`;

  // ---------- иконка 512x512 ----------
  await shot(512, 512, `<body style="width:512px;height:512px;background:radial-gradient(circle at 50% 40%,#ffb878 0%,#ff7aa8 38%,#7a35c9 75%,#2a1170 100%)">
    <div style="position:absolute;left:56px;top:56px;width:400px;height:400px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.75),rgba(255,255,255,0) 68%)"></div>
    ${sparkles(26, 512, 512, 7)}
    <img src="${tex.gel}" style="left:372px;top:44px;width:90px;height:90px;transform:rotate(14deg);filter:drop-shadow(0 6px 8px rgba(0,0,0,.35))">
    <img src="${tex.s3}" style="left:28px;top:92px;width:150px;height:150px;transform:rotate(-12deg);opacity:.95;filter:drop-shadow(0 8px 10px rgba(0,0,0,.35))">
    <img src="${tex.s2}" style="left:62px;top:70px;width:388px;height:388px;filter:drop-shadow(0 16px 18px rgba(40,10,90,.55))">
    <div style="position:absolute;left:132px;top:456px;width:248px;height:22px;border-radius:50%;background:rgba(30,0,70,.4);filter:blur(7px)"></div>
  </body>`, out('icon-512x512.png'));

  // ---------- обложки 800x470 ----------
  for (const [lang, T] of Object.entries(TEXT)) {
    const chain = [[1, 530, 330, 120], [2, 600, 210, 140], [3, 520, 78, 150], [4, 700, 305, 160], [6, 668, 70, 190]];
    await shot(800, 470, `<body style="width:800px;height:470px;background:linear-gradient(160deg,#ff9f6e 0%,#d8559e 38%,#5a2ab5 72%,#25106a 100%)">
      <div style="position:absolute;left:430px;top:40px;width:420px;height:420px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.55),rgba(255,255,255,0) 70%)"></div>
      ${sparkles(34, 800, 470, 11)}
      <img src="${tex.s5}" style="left:552px;top:336px;width:120px;height:120px;filter:drop-shadow(0 8px 8px rgba(30,0,70,.5))">
      <img src="${tex.s2}" style="left:520px;top:210px;width:120px;height:120px;transform:rotate(-8deg);filter:drop-shadow(0 8px 8px rgba(30,0,70,.5))">
      <img src="${tex.s4}" style="left:628px;top:236px;width:160px;height:160px;transform:rotate(6deg);filter:drop-shadow(0 8px 8px rgba(30,0,70,.5))">
      <img src="${tex.s6}" style="left:566px;top:14px;width:214px;height:214px;filter:drop-shadow(0 10px 12px rgba(30,0,70,.55))">
      <img src="${tex.s3}" style="left:660px;top:370px;width:110px;height:110px;transform:rotate(-6deg);filter:drop-shadow(0 8px 8px rgba(30,0,70,.5))">
      <img src="${tex.s1}" style="left:470px;top:380px;width:80px;height:80px;filter:drop-shadow(0 6px 6px rgba(30,0,70,.5))">
      ${fancy(T.t1, lang === 'ru' ? 92 : 104, 34, 70, '#ffffff', '#ffffff')}
      ${fancy(T.t2, T.t2.length >= 9 ? 62 : T.t2.length >= 8 ? 66 : 92, 34, 70 + (lang === 'ru' ? 100 : 108), '#fff7ae', '#ffa11f')}
      <div style="position:absolute;left:36px;top:326px;width:400px;font-size:28px;font-weight:900;color:#fff;line-height:1.15;text-shadow:0 3px 0 rgba(40,10,90,.7)">${T.sub}</div>
    </body>`, out(`cover-800x470-${lang}.png`));
  }
  fs.copyFileSync(out('cover-800x470-ru.png'), out('cover-800x470.png'));

  // ---------- иконки покупок 256x256 ----------
  const base = (inner) => `<body style="width:256px;height:256px;background:transparent">
    <div style="position:absolute;inset:0;border-radius:52px;background:radial-gradient(circle at 50% 38%,#6d3fd0 0%,#2c1580 70%,#1a0c52 100%)"></div>
    <div style="position:absolute;inset:0;border-radius:52px;background:radial-gradient(circle,rgba(255,220,120,.45),rgba(255,220,120,0) 62%)"></div>${inner}</body>`;
  const gem = (x, y, s) => `<img src="${tex.gem}" style="left:${x - s / 2}px;top:${y - s / 2}px;width:${s}px;height:${s}px;filter:drop-shadow(0 6px 6px rgba(0,0,0,.4))">`;
  const icons = {
    gems_100: gem(128, 128, 150),
    gems_550: gem(86, 158, 100) + gem(170, 158, 100) + gem(128, 96, 112),
    gems_1800: [[62, 176], [128, 188], [194, 176], [92, 128], [164, 128], [128, 70]].map(([a, b], i) => gem(a, b, i > 2 ? 90 : 96)).join('') + gem(128, 130, 70),
    x2_forever: `<img src="${tex.gel}" style="left:22px;top:24px;width:70px;height:70px;transform:rotate(-12deg)">
      <div style="position:absolute;left:0;top:44px;width:256px;text-align:center;font-weight:1000;font-size:150px;line-height:1;background:linear-gradient(#fff6a8,#ff9a1f);-webkit-background-clip:text;color:transparent;filter:drop-shadow(0 6px 0 rgba(0,0,0,.45))">x2</div>
      <div style="position:absolute;left:0;top:176px;width:256px;text-align:center;font-weight:1000;font-size:62px;line-height:1;color:#9dffb0;text-shadow:0 4px 0 rgba(0,0,0,.45)">∞</div>`,
    no_ads: `<div style="position:absolute;left:46px;top:46px;width:164px;height:164px;border-radius:50%;border:16px solid #ff5a5a;background:rgba(255,255,255,.1);box-shadow:0 6px 0 rgba(0,0,0,.35)"></div>
      <div style="position:absolute;left:0;top:92px;width:256px;text-align:center;font-weight:1000;font-size:70px;line-height:1;color:#fff;text-shadow:0 4px 0 rgba(0,0,0,.45)">ADS</div>
      <div style="position:absolute;left:44px;top:117px;width:168px;height:16px;border-radius:8px;background:#ff5a5a;transform:rotate(-45deg);box-shadow:0 3px 0 rgba(0,0,0,.4)"></div>`,
    default_icon: gem(128, 128, 150)
  };
  for (const [k, html] of Object.entries(icons)) {
    await page.setViewport({ width: 256, height: 256 });
    await page.setContent(`<style>${css}</style>${base(html)}`);
    await page.evaluate(() => document.fonts.ready);
    await new Promise((r) => setTimeout(r, 120));
    await page.screenshot({ path: out(`iap-icons/${k}.png`), omitBackground: true });
    console.log('wrote', k);
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
