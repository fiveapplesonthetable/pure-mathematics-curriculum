#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p dist
pdflatex -interaction=nonstopmode -halt-on-error -output-directory dist src/main.tex
pdflatex -interaction=nonstopmode -halt-on-error -output-directory dist src/main.tex >/dev/null
pdflatex -interaction=nonstopmode -halt-on-error -output-directory dist src/main.tex >/dev/null
mv -f dist/main.pdf dist/probability-from-the-ground-up.pdf
rm -f dist/main.aux dist/main.log dist/main.out dist/main.toc
echo "Built dist/probability-from-the-ground-up.pdf"
