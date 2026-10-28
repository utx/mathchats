// Walk and Talk Maths: read the chats, edit them, and save edits back to GitHub.
// Routes: #/  #/chat/<slug>  #/edit/<slug>  #/new  #/settings

const app = document.getElementById("app");
const TOKEN_KEY = "mathchats.token";
const DRAFT_PREFIX = "mathchats.draft:";

let book = null;

// ---------- small helpers ----------

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function store(key, value) {
  try {
    if (value === undefined || value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch (e) { /* storage unavailable: drafts just won't persist */ }
}
function recall(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}

const token = () => recall(TOKEN_KEY) || "";

// Straight quotes, "..." and " -- " to typographic ones, matching what pandoc does for the epub.
function smarten(md) {
  return md
    .replace(/(^|[\s(\[{—-])"/gm, "$1“")
    .replace(/"/g, "”")
    .replace(/(^|[\s(\[{—-])'/gm, "$1‘")
    .replace(/'/g, "’")
    .replace(/\.\.\./g, "…")
    .replace(/ -- /g, " — ");
}

// Render a chat's markdown; the "For the grown-ups" section (first ## heading onwards) goes in an aside.
function renderChat(md) {
  const div = document.createElement("div");
  div.className = "chat";
  div.innerHTML = marked.parse(smarten(md));
  const h2 = div.querySelector("h2");
  if (h2) {
    const aside = document.createElement("aside");
    div.insertBefore(aside, h2);
    while (aside.nextSibling) aside.appendChild(aside.nextSibling);
  }
  return div;
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function utf8ToBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function base64ToUtf8(b64) {
  const bin = atob(b64.replace(/\s/g, ""));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

// ---------- GitHub ----------

// The repo is worked out from the Pages address (owner.github.io/repo); anywhere else it's this one.
const REPO = location.hostname.endsWith(".github.io")
  ? `${location.hostname.split(".")[0]}/${location.pathname.split("/")[1]}`
  : "utx/mathchats";

// Reads and saves use the repo's default branch, which is the branch GitHub Pages publishes.
const gh = {
  url(path) {
    const encoded = path.split("/").map(encodeURIComponent).join("/");
    return `https://api.github.com/repos/${REPO}/contents/${encoded}`;
  },
  headers() {
    const h = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
    if (token()) h.Authorization = `Bearer ${token()}`;
    return h;
  },
  async request(path, options = {}) {
    const res = await fetch(this.url(path), { headers: this.headers(), cache: "no-store", ...options });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(await explain(res));
    return res.json();
  },
  list(dir) {
    return this.request(dir);
  },
  async get(path) {
    const json = await this.request(path);
    return json && { text: base64ToUtf8(json.content), sha: json.sha };
  },
  async put(path, text, sha, message) {
    const body = { message, content: utf8ToBase64(text) };
    if (sha) body.sha = sha;
    const json = await this.request(path, { method: "PUT", body: JSON.stringify(body) });
    return json.content.sha;
  },
  editUrl(path) {
    return `https://github.com/${REPO}/edit/${book.branch}/${path}`;
  },
  newFileUrl(path, text) {
    const [dir, name] = [path.slice(0, path.lastIndexOf("/")), path.slice(path.lastIndexOf("/") + 1)];
    return `https://github.com/${REPO}/new/${book.branch}/${dir}?filename=${encodeURIComponent(name)}&value=${encodeURIComponent(text)}`;
  },
};

const EPUB_URL = `https://github.com/${REPO}/releases/download/book/mathchats.epub`;

async function explain(res) {
  let detail = "";
  try { detail = (await res.json()).message || ""; } catch (e) { /* not JSON */ }
  if (res.status === 401) return "GitHub didn't accept the token. Check it in Settings.";
  if (res.status === 403 && /rate limit/i.test(detail))
    return "GitHub's limit for visitors without a token has been reached for the hour. Add a token in Settings, or try again later.";
  if (res.status === 403) return `GitHub refused (403): ${detail || "the token may not have Contents write access to this repo."}`;
  if (res.status === 409) return "This chat changed on GitHub since you opened it. Copy your text somewhere safe, reload, and reapply your changes.";
  return `GitHub error ${res.status}${detail ? ": " + detail : ""}`;
}

// ---------- data ----------

// The book: title and subtitle from book/metadata.yaml, chats from whatever is in chats/ on GitHub right now.
async function loadBook() {
  const meta = await fetch("book/metadata.yaml", { cache: "no-cache" }).then((r) => (r.ok ? r.text() : ""));
  const field = (name) => (meta.match(new RegExp(`^${name}:\\s*(.+)$`, "m")) || [, ""])[1].trim().replace(/^["']|["']$/g, "");

  const files = ((await gh.list("chats")) || [])
    .filter((f) => f.type === "file" && f.name.endsWith(".md"))
    .sort((a, b) => a.name.localeCompare(b.name));
  const branch = files.length
    ? files[0].html_url.slice(files[0].html_url.indexOf("/blob/") + 6, files[0].html_url.lastIndexOf(`/${files[0].path}`))
    : "main";

  const chats = await Promise.all(
    files.map(async (f) => {
      const slug = f.name.replace(/\.md$/, "");
      const chat = await loadChat(slug);
      const text = chat ? chat.text : "";
      return {
        slug,
        title: (text.match(/^# (.+)$/m) || [, slug])[1].trim(),
        teaser: (text.match(/^\*([^*\n]+)\*\s*$/m) || [, ""])[1].trim(),
      };
    })
  );

  book = { title: field("title") || "Walk and Talk Maths", subtitle: field("subtitle"), branch, chats };
  document.getElementById("brand").textContent = book.title;
}

const chatIndex = (slug) => book.chats.findIndex((c) => c.slug === slug);
const pathFor = (slug) => `chats/${slug}.md`;

// Latest text for a chat: from GitHub if we have a token (so it includes edits made moments ago),
// else the copy GitHub Pages is serving, which catches up a minute or so after each save.
async function loadChat(slug) {
  if (token()) {
    const remote = await gh.get(pathFor(slug));
    if (remote) return remote;
  }
  const res = await fetch(pathFor(slug), { cache: "no-cache" });
  if (!res.ok) return null;
  return { text: await res.text(), sha: null };
}

// ---------- views ----------

function viewHome() {
  const items = book.chats
    .map(
      (c, i) => `
      <li><a href="#/chat/${esc(c.slug)}">
        <div class="eyebrow">Chat ${i + 1}</div>
        <div class="chat-title">${esc(smarten(c.title))}</div>
        ${c.teaser ? `<div class="chat-teaser">${esc(smarten(c.teaser))}</div>` : ""}
      </a></li>`
    )
    .join("");
  app.innerHTML = `
    <section class="hero">
      <h1>${esc(book.title || "Walk and Talk Maths")}</h1>
      <p>${esc(book.subtitle || "")}</p>
      <div class="actions">
        <a class="btn primary" href="${EPUB_URL}">Download the epub</a>
        <a class="btn" href="#/new">Start a new chat</a>
      </div>
    </section>
    <ul class="chat-list">${items || "<li>No chats yet.</li>"}</ul>`;
}

async function viewChat(slug) {
  const i = chatIndex(slug);
  const chat = await loadChat(slug);
  if (!chat) return viewMissing();
  const prev = book.chats[i - 1];
  const next = book.chats[i + 1];
  app.innerHTML = `
    <div class="chat-tools"><a class="btn" href="#/edit/${esc(slug)}">Edit</a></div>
    ${i >= 0 ? `<div class="eyebrow">Chat ${i + 1}</div>` : ""}
    <div id="chat"></div>
    ${prev || next ? `<nav class="pager">
      ${prev ? `<a href="#/chat/${esc(prev.slug)}"><span class="eyebrow">Previous</span><br>${esc(prev.title)}</a>` : ""}
      ${next ? `<a class="next" href="#/chat/${esc(next.slug)}"><span class="eyebrow">Next</span><br>${esc(next.title)}</a>` : ""}
    </nav>` : ""}`;
  document.getElementById("chat").replaceWith(renderChat(chat.text));
  if (i >= 0) document.title = `${book.chats[i].title} · ${book.title}`;
}

async function viewEdit(slug) {
  app.classList.add("wide");
  const path = pathFor(slug);
  const draftKey = DRAFT_PREFIX + path;
  const draft = recall(draftKey);

  let original = "";
  let sha = null;
  let loadError = "";
  try {
    const chat = await loadChat(slug);
    if (chat) ({ text: original, sha } = chat);
  } catch (e) {
    loadError = e.message;
  }
  const isNew = !sha && chatIndex(slug) < 0;
  if (isNew && !draft && !loadError) return viewMissing();

  app.innerHTML = `
    <div class="editor-bar">
      <a class="btn" href="${isNew ? "#/" : `#/chat/${esc(slug)}`}">&larr; Back</a>
      <span class="path">${esc(path)}${isNew ? " (new)" : ""}</span>
      <a class="btn" id="on-github" target="_blank" rel="noopener">Open on GitHub</a>
      <button class="btn" id="discard" hidden>Discard draft</button>
    </div>
    <div class="editor-bar">
      <input class="commit-msg" id="msg" placeholder="What did you change? (optional)">
      <button class="btn primary" id="save">Save to GitHub</button>
    </div>
    <div class="status" id="status"></div>
    <div class="pane-tabs">
      <button class="btn" data-show="write">Write</button>
      <button class="btn" data-show="preview">Preview</button>
    </div>
    <div class="panes" data-show="write">
      <textarea id="text" spellcheck="true" aria-label="Chat text (markdown)"></textarea>
      <div class="preview" id="preview"></div>
    </div>`;

  const textarea = document.getElementById("text");
  const preview = document.getElementById("preview");
  const status = document.getElementById("status");
  const saveBtn = document.getElementById("save");
  const discardBtn = document.getElementById("discard");
  const onGithub = document.getElementById("on-github");

  const setStatus = (msg, kind = "") => {
    status.className = `status ${kind}`;
    status.innerHTML = msg;
  };
  const refresh = () => {
    preview.replaceChildren(renderChat(textarea.value));
    const dirty = textarea.value !== original;
    discardBtn.hidden = !dirty;
    onGithub.href = sha || !isNew ? gh.editUrl(path) : gh.newFileUrl(path, textarea.value);
    return dirty;
  };

  textarea.value = draft ?? original;
  refresh();
  if (loadError) setStatus(esc(loadError), "err");
  else if (draft && draft !== original && !isNew) setStatus("Restored your unsaved draft from this browser.");
  if (!token() && !loadError) {
    setStatus(
      `To save from here, add a GitHub token in <a href="#/settings">Settings</a>. ` +
        `Or use <b>Open on GitHub</b> and paste your text there.`
    );
  }

  textarea.addEventListener("input", () => {
    store(draftKey, (refresh() || isNew) ? textarea.value : null);
  });

  discardBtn.addEventListener("click", () => {
    if (!confirm("Throw away your changes?")) return;
    store(draftKey, null);
    if (isNew) return (location.hash = "#/");
    textarea.value = original;
    refresh();
    setStatus("");
  });

  document.querySelectorAll(".pane-tabs .btn").forEach((b) =>
    b.addEventListener("click", () => (document.querySelector(".panes").dataset.show = b.dataset.show))
  );

  saveBtn.addEventListener("click", async () => {
    if (!token()) return (location.hash = "#/settings");
    if (!textarea.value.trim()) return setStatus("There's nothing to save.", "err");
    const title = (textarea.value.match(/^# (.+)$/m) || [, slug])[1].trim();
    const message = document.getElementById("msg").value.trim() || `${isNew && !sha ? "Add" : "Edit"} chat: ${title}`;
    saveBtn.disabled = true;
    setStatus("Saving...");
    try {
      sha = await gh.put(path, textarea.value, sha, message);
      original = textarea.value;
      store(draftKey, null);
      refresh();
      await loadBook().catch(() => {}); // pick up a new chat or changed title for the list
      setStatus(`Saved to GitHub. The website and epub will rebuild in a minute or two.`, "ok");
    } catch (e) {
      setStatus(esc(e.message), "err");
    } finally {
      saveBtn.disabled = false;
    }
  });

  window.onbeforeunload = () => (textarea.value !== original ? true : undefined);
}

function viewNew() {
  const nextNumber =
    book.chats.reduce((max, c) => Math.max(max, parseInt(c.slug, 10) || 0), 0) + 1;
  app.innerHTML = `
    <h1 class="page-title">Start a new chat</h1>
    <form class="form" id="new-form">
      <label>Title
        <input name="title" required placeholder="e.g. Hilbert's Hotel">
      </label>
      <label>Teaser <span class="hint">One line that sets up the question.</span>
        <input name="teaser" placeholder="e.g. A hotel with infinitely many rooms is full. Can it fit one more guest?">
      </label>
      <div><button class="btn primary">Start writing</button></div>
    </form>`;
  document.getElementById("new-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const title = data.get("title").trim();
    const teaser = data.get("teaser").trim();
    const slug = `${String(nextNumber).padStart(2, "0")}-${slugify(title) || "chat"}`;
    const text =
      `# ${title}\n\n` +
      (teaser ? `*${teaser}*\n\n` : "") +
      `"Start the chat here. Each thing you say gets its own paragraph in quotes."\n\n` +
      `"Ask questions and leave room for them to answer."\n\n` +
      `## For the grown-ups\n\nA little background for the parent: where the idea comes from and where to take it next.\n`;
    store(DRAFT_PREFIX + pathFor(slug), text);
    location.hash = `#/edit/${slug}`;
  });
}

function viewSettings() {
  const has = !!token();
  app.innerHTML = `
    <h1 class="page-title">Settings</h1>
    <form class="form" id="settings-form">
      <label>GitHub token
        <input name="token" type="password" autocomplete="off" value="${esc(token())}" placeholder="github_pat_...">
        <span class="hint">Kept only in this browser. Saves go to <b>${esc(REPO)}</b> on branch <b>${esc(book.branch)}</b>.</span>
      </label>
      <div class="actions" style="margin:0">
        <button class="btn primary">Save token</button>
        ${has ? `<button class="btn" type="button" id="forget">Forget token</button>` : ""}
      </div>
      <div class="status" id="status"></div>
    </form>
    <div class="note">
      <b>Making a token</b>
      <ol>
        <li>On GitHub, go to <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">Settings &rarr; Developer settings &rarr; Fine-grained tokens &rarr; Generate new token</a>.</li>
        <li>Under <i>Repository access</i>, choose <i>Only select repositories</i> and pick <b>${esc(REPO)}</b>.</li>
        <li>Under <i>Permissions &rarr; Repository permissions</i>, set <b>Contents</b> to <i>Read and write</i>.</li>
        <li>Generate it, copy it, and paste it above.</li>
      </ol>
    </div>`;
  const status = document.getElementById("status");
  document.getElementById("settings-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    store(TOKEN_KEY, new FormData(e.target).get("token").trim() || null);
    if (!token()) return viewSettings();
    status.className = "status";
    status.textContent = "Checking...";
    try {
      await gh.get("README.md");
      status.className = "status ok";
      status.textContent = "Token works. You can now save edits from the editor.";
    } catch (err) {
      status.className = "status err";
      status.textContent = err.message;
    }
  });
  document.getElementById("forget")?.addEventListener("click", () => {
    store(TOKEN_KEY, null);
    viewSettings();
  });
}

function viewMissing() {
  app.innerHTML = `<h1 class="page-title">Chat not found</h1><p><a href="#/">Back to all chats</a></p>`;
}

// ---------- router ----------

async function route() {
  window.onbeforeunload = null;
  app.classList.remove("wide");
  document.title = book?.title || "Walk and Talk Maths";
  const [, page, slug] = (location.hash.replace(/^#\/?/, "/") || "/").split("/");
  try {
    if (page === "chat" && slug) await viewChat(decodeURIComponent(slug));
    else if (page === "edit" && slug) await viewEdit(decodeURIComponent(slug));
    else if (page === "new") viewNew();
    else if (page === "settings") viewSettings();
    else viewHome();
  } catch (e) {
    app.innerHTML = `<p class="status err">${esc(e.message)}</p>`;
  }
  window.scrollTo(0, 0);
}

// Leaving the editor with unsaved changes is fine: they're kept as a draft in this browser.
window.addEventListener("hashchange", route);

loadBook()
  .then(route)
  .catch((e) => (app.innerHTML = `<p class="status err">${esc(e.message)}</p>`));
