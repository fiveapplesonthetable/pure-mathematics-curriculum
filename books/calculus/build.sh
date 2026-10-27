#!/usr/bin/env bash
# Build the full book PDF into dist/.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p dist
# Three passes so the table of contents, cross-references, figures, and
# part/chapter numbers fully settle across this multi-hundred-page book.
pdflatex -interaction=nonstopmode -halt-on-error -output-directory dist src/main.tex
pdflatex -interaction=nonstopmode -halt-on-error -output-directory dist src/main.tex >/dev/null
pdflatex -interaction=nonstopmode -halt-on-error -output-directory dist src/main.tex >/dev/null
mv -f dist/main.pdf dist/calculus-from-the-ground-up.pdf
rm -f dist/main.aux dist/main.log dist/main.out dist/main.toc
echo "Built dist/calculus-from-the-ground-up.pdf"
