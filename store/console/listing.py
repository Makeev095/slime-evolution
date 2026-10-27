# Тексты карточки игры для консоли Яндекс Игр (ru / en / tr). Лимиты консоли: название 50, SEO 160, об игре 1000, коротко 70, как играть 1000.
import json
L = {
 'ru': {
  'name': 'Слайм: Эволюция',
  'seo': 'Слайм: Эволюция — бесплатный кликер онлайн. Тапай слайма, копи желе, покупай улучшения и эволюционируй от капельки до Бога слаймов.',
  'about': """Слайм: Эволюция — яркий кликер, в котором крошечная капелька желе вырастает в могучего Бога слаймов.

Тапай по слайму и собирай желе. Покупай помощников: капельницы, червячков, грибные фермы, лаборатории, вулканы, замки слаймов, драконов, ракеты, порталы и даже чёрные дыры — желе будет капать само, пока ты в игре.

Накопил достаточно — слайм эволюционирует: рыцарь, маг, дракон, космонавт и, наконец, Бог слаймов. Каждая стадия меняет мир вокруг, увеличивает доход и дарит кристаллы.

Лови золотые пузыри за бонусы, включай ярость, чтобы тапать втрое сильнее, забирай ежедневные награды и смотри видео за ускорение x2. Перерождайся, получай эссенцию и навсегда увеличивай доход.

Играй бесплатно, без регистрации, на телефоне и компьютере. Игра на русском, английском и турецком языках.""",
  'short': 'Тапай слайма, копи желе и эволюционируй!',
  'how': """1. Тапай по слайму — каждый тап приносит желе.
2. Во вкладке «Улучшения» покупай силу тапа и помощников: они добывают желе сами, пока ты в игре.
3. Копи желе — слайм эволюционирует, увеличивает доход и дарит кристаллы.
4. Лови золотые пузыри и тапай быстро: включится ярость, и тапы станут втрое сильнее.
5. Кристаллы трать во вкладке «Кристаллы»: перемотка времени, турбо и другие бонусы.
6. Во вкладке «Рождение» перерождайся: прогресс забега сбросится, но ты получишь эссенцию и постоянный бонус к доходу.
Управление: касание или клик мышью, на компьютере работает и пробел."""},
 'en': {
  'name': 'Slime Evolution',
  'seo': 'Slime Evolution is a free online clicker. Tap the slime, collect jelly, buy upgrades and evolve from a tiny droplet into the Slime God.',
  'about': """Slime Evolution is a colorful clicker where a tiny droplet of jelly grows into the mighty Slime God.

Tap the slime to collect jelly. Buy helpers: drippers, little worms, mushroom farms, laboratories, volcanoes, slime castles, dragons, rockets, portals and even black holes. They produce jelly on their own while you are playing.

Collect enough jelly and your slime evolves: knight, wizard, dragon, astronaut and finally the Slime God. Every stage changes the world around you, boosts your income and rewards you with crystals.

Catch golden bubbles for bonuses, trigger frenzy to make your taps three times stronger, claim daily rewards and watch a video for an x2 boost. Be reborn, earn essence and increase your income forever.

Play for free, no registration, on your phone or computer. The game is available in Russian, English and Turkish.""",
  'short': 'Tap the slime, collect jelly and evolve!',
  'how': """1. Tap the slime - every tap gives you jelly.
2. In the Upgrades tab buy tap power and helpers: they collect jelly on their own while you are playing.
3. Collect jelly - your slime evolves, boosts your income and gives you crystals.
4. Catch golden bubbles and tap fast to start frenzy: your taps become three times stronger.
5. Spend crystals in the Crystals tab on time warps, turbo and other bonuses.
6. In the Rebirth tab you can be reborn: your run progress resets, but you get essence and a permanent income bonus.
Controls: touch or mouse click; on desktop the space bar works too."""},
 'tr': {
  'name': 'Slime Evrimi',
  'seo': 'Slime Evrimi ücretsiz bir online tıklama oyunudur. Slime’a dokun, jöle topla, geliştirmeler satın al ve küçük bir damladan Slime Tanrısı’na evrimleş.',
  'about': """Slime Evrimi, minik bir jöle damlasının güçlü Slime Tanrısı’na dönüştüğü renkli bir tıklama oyunudur.

Slime’a dokunarak jöle topla. Yardımcılar satın al: damlatıcılar, solucanlar, mantar çiftlikleri, laboratuvarlar, yanardağlar, slime kaleleri, ejderhalar, roketler, portallar ve hatta kara delikler. Sen oyundayken onlar kendiliğinden jöle üretir.

Yeterince jöle biriktirdiğinde slime evrimleşir: şövalye, büyücü, ejderha, astronot ve sonunda Slime Tanrısı. Her aşama dünyayı değiştirir, gelirini artırır ve kristal kazandırır.

Bonus için altın baloncukları yakala, dokunuşlarını üç kat güçlendiren çılgınlık modunu başlat, günlük ödülleri al ve x2 hızlandırma için video izle. Yeniden doğ, öz kazan ve gelirini kalıcı olarak artır.

Ücretsiz, kayıt olmadan, telefonda ve bilgisayarda oyna. Oyun Rusça, İngilizce ve Türkçe dillerinde sunulur.""",
  'short': 'Slime’a dokun, jöle topla ve evrimleş!',
  'how': """1. Slime’a dokun: her dokunuş jöle kazandırır.
2. Geliştirmeler sekmesinden dokunuş gücünü ve yardımcıları satın al: sen oyundayken jöleyi kendileri toplar.
3. Jöle biriktir: slime evrimleşir, gelirini artırır ve kristal verir.
4. Altın baloncukları yakala ve hızlı dokun: çılgınlık başlar ve dokunuşların üç kat güçlenir.
5. Kristalleri Kristaller sekmesinde zaman atlama, turbo ve diğer bonuslara harca.
6. Yeniden doğuş sekmesinde yeniden doğabilirsin: ilerleme sıfırlanır ama öz ve kalıcı gelir bonusu kazanırsın.
Kontroller: dokunma veya fare tıklaması; bilgisayarda boşluk tuşu da çalışır."""}
}
KEYWORDS = 'кликер, слайм, эволюция, желе, тапалка, айдл, симулятор, clicker, slime, idle, jelly'
for k, v in L.items():
    print(k, {f: len(t) for f, t in v.items()})
print('keywords', len(KEYWORDS))
json.dump({'langs': L, 'keywords': KEYWORDS}, open('listing.json', 'w'), ensure_ascii=False, indent=1)
