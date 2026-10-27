#!/bin/sh
# Собирает slime-evolution.zip для загрузки в консоль Яндекс Игр (index.html в корне архива, Phaser — локально).
set -e
cd "$(dirname "$0")"

PHASER_URL="https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js"
mkdir -p vendor
[ -s vendor/phaser.min.js ] || curl -sfL "$PHASER_URL" -o vendor/phaser.min.js

rm -rf dist slime-evolution.zip
mkdir -p dist
cp -R src dist/src
cp -R fonts dist/fonts
cp vendor/phaser.min.js dist/phaser.min.js
sed "s#$PHASER_URL#phaser.min.js#" index.html > dist/index.html

(cd dist && zip -qr ../slime-evolution.zip .)
echo "OK: $(pwd)/slime-evolution.zip ($(du -h slime-evolution.zip | cut -f1))"
