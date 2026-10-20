#!/usr/bin/env bash
# Run from the project root that contains this pack folder AND your original files (prototype HTML, design PDF, etc.).
# Usage: ./copy_supporting_docs.sh /path/to/original/files
set -euo pipefail
SRC="${1:-.}"
DEST="$(dirname "$0")/supporting_docs"
for f in "Study_Loop_UI_UX_Prototype.html" *.pdf; do
  if compgen -G "$SRC/$f" > /dev/null; then cp -v "$SRC"/$f "$DEST"/; fi
done
echo "Done. supporting_docs now has: $(ls "$DEST" | wc -l) files"
