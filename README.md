# Walk and Talk Maths

Fun maths chats for the walk to school. Each chapter (a **chat**) is a short conversation a parent can have with their child about a maths idea: on the way to school, home from sport, wherever.

- Chats live in [`chats/`](chats/) as plain markdown, one file per chat.
- Every push builds an **epub** of the whole book.
- The **website**, https://utx.github.io/mathchats/, lets you read the chats, edit them, and save your edits straight back here.

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

Each save is a commit to the default branch. Everyone sees the change once GitHub Pages republishes, usually within a minute, and the epub rebuilds at the same time. Without a token, **Open on GitHub** takes you to GitHub's own editor instead.

## Getting the epub

- From the website: **Download the epub** on the home page.
- From GitHub: the **book** release always has the latest `mathchats.epub`.
- Locally: `./scripts/build.sh` (needs [pandoc](https://pandoc.org/installing.html)) writes `dist/mathchats.epub`.

Book title, subtitle and author are set in [`book/metadata.yaml`](book/metadata.yaml).

## Previewing the website locally

From the repo folder:

```bash
python3 -m http.server
```

Then open http://localhost:8000. The chat list still comes from GitHub, so new chats show up there once they're pushed.

## How the website is published

GitHub Pages serves the site straight from the repo's default branch (**Settings → Pages → Deploy from a branch**, folder `/ (root)`). There's no build step for the site.
