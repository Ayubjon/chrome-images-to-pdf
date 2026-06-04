#!/usr/bin/env bash
# Собирает ZIP для загрузки в Chrome Web Store — только рантайм-файлы.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf dist
mkdir -p dist
zip -rq dist/images-to-pdf.zip \
  manifest.json src lib icons _locales \
  -x '*.DS_Store'
echo "Создан dist/images-to-pdf.zip"
unzip -l dist/images-to-pdf.zip
