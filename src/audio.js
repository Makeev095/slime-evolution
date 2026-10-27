// Процедурный звук: все эффекты и музыка синтезируются в AudioBuffer и кладутся в кэш Phaser.
// Благодаря этому не нужно загружать файлы, а `game.sound.mute` работает для всего звука.

const TAU = Math.PI * 2;
const RATE = 22050;
const semis = (base, s) => base * Math.pow(2, s / 12);

function synth(dur, fn, rate = RATE) {
  const n = Math.floor(dur * rate);
  const d = new Float32Array(n);
  for (let i = 0; i < n; i++) d[i] = fn(i / rate, i);
  return d;
}
const env = (t, attack, decay) => Math.min(1, t / attack) * Math.exp(-t * decay);

export const Sfx = {
  ready: false,
  music: null,
  lastTapAt: 0,

  init(game) {
    const ctx = game.sound && game.sound.context;
    if (!ctx) return; // NoAudio — просто работаем без звука
    const add = (key, data, rate = RATE) => {
      const b = ctx.createBuffer(1, data.length, rate);
      b.getChannelData(0).set(data);
      game.cache.audio.add(key, b);
    };

    // тап по слайму: «буль» — быстрый спад частоты + щелчок
    let ph = 0;
    add('tap', synth(0.13, (t) => {
      ph += TAU * (520 * Math.exp(-t * 26) + 190) / RATE;
      return Math.sin(ph) * env(t, 0.002, 26) * 0.85 + (t < 0.01 ? (Math.random() - 0.5) * 0.25 : 0);
    }));

    // кнопка интерфейса
    add('click', synth(0.07, (t) => Math.sin(TAU * 880 * t) * Math.exp(-t * 40) * 0.5));

    // покупка улучшения: две восходящие ноты
    add('buy', synth(0.32, (t) => {
      const f = t < 0.09 ? 660 : 990;
      const lt = t < 0.09 ? t : t - 0.09;
      return (Math.sin(TAU * f * lt) + 0.3 * Math.sin(TAU * f * 2 * lt)) * env(lt, 0.004, 14) * 0.42;
    }));

    // отказ
    let dp = 0;
    add('denied', synth(0.18, (t) => {
      dp += TAU * (170 - 60 * t) / RATE;
      return (2 / Math.PI) * Math.asin(Math.sin(dp)) * env(t, 0.004, 14) * 0.45;
    }));

    // кристалл / награда
    add('gem', synth(0.45, (t) => {
      const f = t < 0.1 ? 1318.5 : 1760;
      const lt = t < 0.1 ? t : t - 0.1;
      return (Math.sin(TAU * f * lt) + 0.5 * Math.sin(TAU * f * 2.01 * lt)) * env(lt, 0.003, 9) * 0.34;
    }));

    // появление золотого пузыря: мерцающий «дзынь»
    add('gold_spawn', synth(0.7, (t) => {
      let s = 0;
      [1568, 2093, 2637].forEach((f, k) => {
        const tt = t - k * 0.09;
        if (tt > 0) s += Math.sin(TAU * f * tt) * env(tt, 0.003, 8) * 0.22;
      });
      return s;
    }));

    // сбор золотого пузыря: быстрый подъём
    let gp = 0;
    add('gold_get', synth(0.6, (t) => {
      gp += TAU * (500 + 1500 * Math.pow(t / 0.6, 1.4)) / RATE;
      return (Math.sin(gp) + 0.35 * Math.sin(gp * 2)) * Math.sin(Math.PI * Math.min(1, t / 0.6)) * 0.4;
    }));

    // режим «ярость»: нарастающий свист + удар
    let fp = 0;
    add('frenzy', synth(0.6, (t) => {
      fp += TAU * (220 + 900 * t) / RATE;
      return Math.sin(fp) * Math.min(1, t / 0.15) * Math.exp(-Math.max(0, t - 0.3) * 6) * 0.42 +
        (t > 0.3 && t < 0.34 ? (Math.random() - 0.5) * 0.6 : 0);
    }));

    // эволюция: торжественное арпеджио + мерцание
    const arp = [392, 523.25, 659.25, 783.99, 1046.5, 1318.5];
    add('evolve', synth(2.0, (t) => {
      let s = 0;
      for (let k = 0; k < arp.length; k++) {
        const tt = t - k * 0.13;
        if (tt > 0) s += (Math.sin(TAU * arp[k] * tt) + 0.3 * Math.sin(TAU * arp[k] * 2 * tt)) * env(tt, 0.004, 2.6) * 0.22;
      }
      if (t > 0.8) s += Math.sin(TAU * 2093 * t) * Math.sin(TAU * 7 * t) * Math.exp(-(t - 0.8) * 2.5) * 0.08;
      return s;
    }));

    // перерождение: глубокий «вау» и вверх
    let rp = 0;
    add('rebirth', synth(1.2, (t) => {
      rp += TAU * (110 + 700 * Math.pow(t / 1.2, 2)) / RATE;
      return (Math.sin(rp) + 0.4 * Math.sin(rp * 1.5)) * Math.sin(Math.PI * Math.min(1, t / 1.2)) * 0.4;
    }));

    // Фоновая музыка: 16 секунд (8 тактов по 2 с), зацикленная. Лёгкая и бодрая: бас, пэд, арпеджио, колокольчики.
    const MR = 16000;
    const total = 16 * MR;
    const m = new Float32Array(total);
    const C = 261.63;
    const bars = [
      { root: C / 2, tones: [0, 4, 7] },         // C
      { root: C * 0.75, tones: [0, 4, 7] },      // G (ниже)
      { root: C * 0.84, tones: [0, 3, 7] },      // Am
      { root: C * 0.667, tones: [0, 4, 7] },     // F
      { root: C / 2, tones: [0, 4, 7] },         // C
      { root: C * 0.75, tones: [0, 4, 7] },      // G
      { root: C * 0.667, tones: [0, 4, 7] },     // F
      { root: C * 0.75, tones: [0, 4, 7, 10] }   // G7
    ];
    const bell = [0, 2, 4, 7, 9, 12, 9, 7];
    const note = (start, freq, dur, amp, decay, harm = 0.3) => {
      const len = Math.floor(dur * MR);
      for (let i = 0; i < len; i++) {
        const tt = i / MR;
        const e = Math.min(1, tt / 0.004) * Math.exp(-tt * decay);
        m[(start + i) % total] += (Math.sin(TAU * freq * tt) + harm * Math.sin(TAU * freq * 2 * tt)) * e * amp;
      }
    };
    bars.forEach((b, bi) => {
      const s0 = bi * 2 * MR;
      // пэд (мягкий, на весь такт)
      const plen = 2 * MR;
      for (let i = 0; i < plen; i++) {
        const e = Math.pow(Math.sin(Math.PI * i / plen), 0.6);
        const tt = i / MR;
        let s = 0;
        for (const k of b.tones) s += Math.sin(TAU * semis(b.root * 2, k) * tt);
        m[(s0 + i) % total] += s * e * 0.012;
      }
      // бас на 1 и 3 доли
      note(s0, b.root, 0.45, 0.16, 4, 0.15);
      note(s0 + MR, b.root * 1.5, 0.35, 0.1, 5, 0.1);
      // арпеджио восьмыми
      for (let k = 0; k < 8; k++) {
        const tone = b.tones[(k * 2 + (k >> 2)) % b.tones.length];
        note(s0 + Math.floor(k * 0.25 * MR), semis(b.root * 4, tone), 0.5, 0.05, 7);
      }
      // колокольчик-мелодия: по ноте на долю в чётных тактах
      if (bi % 2 === 0) {
        for (let k = 0; k < 4; k++) {
          const sem = bell[(bi * 2 + k) % bell.length];
          note(s0 + Math.floor(k * 0.5 * MR) + Math.floor(0.125 * MR), semis(C * 4, sem), 0.7, 0.035, 5, 0.5);
        }
      }
    });
    // защита от клиппинга: нормализуем до 0.7
    let peak = 0;
    for (let i = 0; i < total; i++) peak = Math.max(peak, Math.abs(m[i]));
    if (peak > 0) for (let i = 0; i < total; i++) m[i] = (m[i] / peak) * 0.7;
    add('music', m, MR);
    this.ready = true;
  },

  play(scene, key, cfg) {
    if (!scene.cache.audio.exists(key)) return;
    scene.sound.play(key, cfg);
  },

  // Тап: не чаще 1 раза в 35 мс, высота растёт вместе с комбо
  tap(scene, combo) {
    const now = performance.now();
    if (now - this.lastTapAt < 35) return;
    this.lastTapAt = now;
    this.play(scene, 'tap', { volume: 0.55, rate: 0.9 + Math.min(0.7, combo * 0.6) + Math.random() * 0.08 });
  },

  startMusic(game) {
    if (this.music || !game.cache.audio.exists('music')) return;
    this.music = game.sound.add('music', { loop: true, volume: 0.5 });
    this.music.play();
  }
};
