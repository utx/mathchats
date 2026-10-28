# Walk and Talk Maths

A book of short, fun maths conversations between a parent and child, the kind you have walking to school or home from sport. Each chapter is called a **chat**. The book is published as an epub, and there's a website (GitHub Pages) for reading and editing.

## Adding a chat

When the user gives a topic (or a rough draft), add it as a new file in `chats/`:

- First pull the latest from GitHub. The website saves edits as commits straight to the default branch, so the repo may have changed since your checkout.
- Name it `NN-slug.md`, numbered after the highest existing chat: `02-hilberts-hotel.md`. The number sets the order in the book.
- Run `./scripts/build.sh` to check the epub still builds.
- Commit and push.

Before writing, read the existing chats in `chats/`. The user edits chats from the website, so the current files are the best guide to the voice they want. If a chat has been edited since you wrote it, learn from what they changed.

## Shape of a chat

```markdown
# Title

*One-line teaser that sets up the question.*

"First thing the parent says."

"Next thing the parent says."

## For the grown-ups

Short background for the parent.
```

- `# Title`: the chat's name. The build adds "Chat N:" in the epub, so don't number it.
- The italic teaser line comes straight after the title. The website shows it in the list of chats.
- The chat is the **parent's side** of the conversation. Each thing the parent says is its own paragraph, in straight double quotes. The child's answers are implied by the questions; don't write them in.
- `## For the grown-ups` is the only `##` heading, and always last. 2-4 short paragraphs: where the idea comes from (names, dates), the proper maths name for it, and a follow-up topic. Facts here must be accurate.
- Use straight quotes `"` and `'` in the files. Pandoc and the website turn them into curly quotes.

## Voice

- Spoken, casual and warm. Australian English: "maths", "reckon", "times it by itself".
- It happens on a walk, so nothing that needs paper or a picture. Numbers small enough to do in your head, or things you can see on the way.
- Lots of questions that leave room for the child to think: "Think about it...", "What do you reckon?"
- Build up in small steps from something the child already knows to the surprise.
- Short: about 300-600 words of chat, a few minutes of walking.
- End on an open question or a "weird, isn't it?" moment, not a lecture.
- When the user supplies their own draft, keep their wording and rhythm. Polish lightly (typos, consistent quoting, a missing step) and tell them what you changed.

## Repo layout

- `chats/` the chats, one markdown file each
- `book/metadata.yaml` book title, subtitle, author, language
- `book/epub.css`, `book/chat-numbers.lua` epub styling and "Chat N:" numbering
- `index.html`, `site/` the website. GitHub Pages serves it straight from the default branch, with no build step. It lists `chats/` through the GitHub API and saves edits back through the API.
- `scripts/build.sh` builds `dist/mathchats.epub`
- `.github/workflows/publish.yml` builds the epub on every push. On the default branch it replaces `mathchats.epub` on the `book` release, which the website links to.
