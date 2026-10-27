import { createGameConfig } from './config.js';
import { BootScene } from './scenes/BootScene.js';
import { PlayScene } from './scenes/PlayScene.js';
import { ShopScene } from './scenes/ShopScene.js';

// Шрифт должен быть загружен до создания текстов, иначе они нарисуются запасным шрифтом
const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(r, ms))]);
const fontReady = document.fonts && document.fonts.load
  ? withTimeout(Promise.all([document.fonts.load('900 24px Nunito'), document.fonts.load('700 24px Nunito')]), 3000)
  : Promise.resolve();

fontReady.catch(() => {}).then(() => {
  const game = new Phaser.Game(createGameConfig([BootScene, PlayScene, ShopScene]));
  if (location.search.includes('debug')) window.__game = game; // только для отладки: index.html?debug
});
