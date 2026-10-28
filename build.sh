#!/usr/bin/env bash
set -euo pipefail

mkdir -p dist
for file in src/main-curriculum.tex src/start-here-reader.tex src/proof-reader-expanded.tex src/proof-reader-deep.tex src/proof-reader-compiled.tex src/workbook.tex src/proof-debugger.tex src/spaced-repetition.tex; do
  base="$(basename "$file" .tex)"
  pdflatex -interaction=nonstopmode -halt-on-error -output-directory dist "$file"
  pdflatex -interaction=nonstopmode -halt-on-error -output-directory dist "$file" >/dev/null
  rm -f "dist/$base.aux" "dist/$base.log" "dist/$base.out" "dist/$base.toc"
done

for book in books/calculus books/linear-algebra books/probability; do
  if [ -x "$book/build.sh" ]; then
    echo "=== Building $book ==="
    (cd "$book" && ./build.sh)
  fi
done
