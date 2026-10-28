#!/usr/bin/env bash
# Build the book into dist/mathchats.epub.
set -euo pipefail
cd "$(dirname "$0")/.."

shopt -s nullglob
chats=(chats/*.md)
if [ ${#chats[@]} -eq 0 ]; then
  echo "No chats found in chats/" >&2
  exit 1
fi

mkdir -p dist
pandoc "${chats[@]}" \
  --from markdown \
  --metadata-file book/metadata.yaml \
  --lua-filter book/chat-numbers.lua \
  --css book/epub.css \
  --split-level 1 \
  --toc --toc-depth 1 \
  --output dist/mathchats.epub

echo "Built dist/mathchats.epub (${#chats[@]} chats)"
