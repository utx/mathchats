#!/usr/bin/env bash
# Build the epub and the website into dist/.
#   dist/mathchats.epub   the book
#   dist/site/            the website (preview with: python3 -m http.server -d dist/site)
set -euo pipefail
cd "$(dirname "$0")/.."

REPO="${GITHUB_REPOSITORY:-utx/mathchats}"
BRANCH="${SITE_BRANCH:-main}"

shopt -s nullglob
chats=(chats/*.md)
if [ ${#chats[@]} -eq 0 ]; then
  echo "No chats found in chats/" >&2
  exit 1
fi

rm -rf dist
mkdir -p dist/site/chats

pandoc "${chats[@]}" \
  --from markdown \
  --metadata-file book/metadata.yaml \
  --lua-filter book/chat-numbers.lua \
  --css book/epub.css \
  --split-level 1 \
  --toc --toc-depth 1 \
  --output dist/mathchats.epub

cp -r site/. dist/site/
cp "${chats[@]}" dist/site/chats/
cp dist/mathchats.epub dist/site/
python3 scripts/manifest.py "$REPO" "$BRANCH" book/metadata.yaml "${chats[@]}" > dist/site/chats.json

echo "Built dist/mathchats.epub and dist/site/ (${#chats[@]} chats)"
