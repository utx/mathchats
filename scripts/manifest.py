"""Write the website's chats.json: book details plus the title and teaser of each chat."""

import json
import pathlib
import re
import sys


def book_title(metadata_path):
    for line in pathlib.Path(metadata_path).read_text(encoding="utf-8").splitlines():
        m = re.match(r"(title|subtitle):\s*(.+)", line)
        if m:
            yield m.group(1), m.group(2).strip().strip("\"'")


def chat_info(path):
    text = path.read_text(encoding="utf-8")
    title = next((l[2:].strip() for l in text.splitlines() if l.startswith("# ")), path.stem)
    teaser = re.search(r"^\*([^*\n]+)\*\s*$", text, re.M)
    return {
        "slug": path.stem,
        "file": path.name,
        "title": title,
        "teaser": teaser.group(1).strip() if teaser else "",
    }


def main():
    repo, branch, metadata, *files = sys.argv[1:]
    manifest = {
        "repo": repo,
        "branch": branch,
        **dict(book_title(metadata)),
        "chats": [chat_info(pathlib.Path(f)) for f in sorted(files)],
    }
    json.dump(manifest, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
