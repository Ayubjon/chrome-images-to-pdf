#!/usr/bin/env bash
# Builds the ZIP for the Chrome Web Store — runtime files only.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf dist
mkdir -p dist
zip -rq dist/images-to-pdf.zip \
  manifest.json src lib icons _locales \
  -x '*.DS_Store'
echo "Created dist/images-to-pdf.zip"
unzip -l dist/images-to-pdf.zip
