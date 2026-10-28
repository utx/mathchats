# Walk and Talk Maths

Fun maths chats for the walk to school. Each chapter (a **chat**) is a short conversation a parent can have with their child about a maths idea: on the way to school, home from sport, wherever.

- Chats live in [`chats/`](chats/) as plain markdown, one file per chat.
- Every push builds an **epub** of the whole book.
- The **website** (GitHub Pages) lets you read the chats, edit them, and save your edits straight back here.

## Adding a chat

- **Ask Claude:** give it a topic (or a rough draft) and it adds the chat following [`CLAUDE.md`](CLAUDE.md).
- **On the website:** click *New chat*.
- **By hand:** add `chats/NN-slug.md`, numbered after the last chat. See [`CLAUDE.md`](CLAUDE.md) for the format.

## Editing on the website

Open a chat and click **Edit**. You get the text on the left and a live preview on the right. Your unsaved changes are kept in your browser as a draft.

To save from the website, add a GitHub token once under **Settings** (it stays in your browser):

1. Go to [GitHub → Settings → Developer settings → Fine-grained tokens → Generate new token](https://github.com/settings/personal-access-tokens/new).
2. *Repository access:* **Only select repositories** → this repo.
3. *Permissions → Repository permissions:* **Contents** → **Read and write**.
4. Generate, copy, and paste it into the website's Settings page.

Each save is a commit to the default branch, which rebuilds the website and epub in a minute or two. Without a token, **Open on GitHub** takes you to GitHub's own editor instead.

## Getting the epub

- From the website: **Download the epub** on the home page.
- From GitHub: open the latest run under **Actions → Build book and website** and download the `mathchats-epub` artifact.
- Locally: `./scripts/build.sh` (needs [pandoc](https://pandoc.org/installing.html) and Python 3) writes `dist/mathchats.epub`.

Book title, subtitle and author are set in [`book/metadata.yaml`](book/metadata.yaml).

## Previewing the website locally

```bash
./scripts/build.sh
```

```bash
python3 -m http.server -d dist/site
```

Then open http://localhost:8000.

## One-time setup: turn on GitHub Pages

In the repo on GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**. The next push to the default branch publishes the site at `https://<owner>.github.io/<repo>/`.
