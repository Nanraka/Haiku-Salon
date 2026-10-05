const STORAGE_KEY = "haiku-salon-demo";

const defaultState = {
  room: {
    id: "7Kx92LmP",
    name: "いつもの俳句",
  },
  me: {
    name: "山田",
  },
  participants: ["山田", "田中", "鈴木", "佐藤", "高橋"],
  haikus: [
    {
      id: "h1",
      author: "山田",
      body: "秋風や\nページをめくる\n音ひとつ",
      time: "10月5日 23:12",
      likes: 3,
      liked: false,
      parentId: null,
    },
    {
      id: "h2",
      author: "田中",
      body: "月明かり\n閉じたページに\n影ひとつ",
      time: "10月6日 07:21",
      likes: 2,
      liked: false,
      parentId: null,
    },
    {
      id: "h3",
      author: "鈴木",
      body: "帰り道\n金木犀を\n追い越せず",
      time: "10月6日 18:03",
      likes: 1,
      liked: false,
      parentId: null,
    },
    {
      id: "h4",
      author: "田中",
      body: "秋風や\nページをめくる\n音ひとつ",
      time: "10月6日 20:14",
      likes: 1,
      liked: false,
      parentId: "h1",
    },
  ]
};

let state = loadState();

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : structuredClone(defaultState);
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function initials(name) {
  return [...name][0] || "？";
}

function nowLabel() {
  const d = new Date();
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function go(screen, id = "") {
  location.hash = id ? `${screen}/${id}` : screen;
}

function parseRoute() {
  const [screen, id] = location.hash.replace(/^#\/?/, "").split("/");
  return { screen: screen || "home", id };
}

function layout(content, cls = "") {
  return `<div class="screen ${cls}">${content}</div>`;
}

function button(text, cls = "primary", action = "") {
  return `<button class="${cls}" ${action ? `onclick="${action}"` : ""}>${text}</button>`;
}

function renderHome() {
  document.title = "Haiku Salon";
  document.getElementById("app").innerHTML = layout(`
    <section class="hero">
      <div class="hero-copy">
        <h1 class="brand">Haiku Salon</h1>
        <p>俳句を、置いておこう。</p>
      </div>
      <div>
        <div class="landscape" aria-hidden="true"></div>
        <div class="actions">
          ${button("＋　部屋をつくる", "primary", "go('create')")}
          <button class="secondary" onclick="go('join')">🔗　部屋に参加する</button>
          <div class="muted" style="text-align:center">友人から届いたURLからも直接参加できます</div>
        </div>
      </div>
    </section>
  `);
}

function renderCreate() {
  document.getElementById("app").innerHTML = layout(`
    <div class="topbar">
      <button class="back" onclick="go('home')">‹　戻る</button>
    </div>
    <h1 class="page-title">新しい部屋を作る</h1>
    <p class="muted">部屋の名前と、あなたの名前を入力してください。</p>

    <div class="form-card">
      <div class="field">
        <label for="roomName">部屋の名前</label>
        <input id="roomName" maxlength="30" placeholder="例）いつもの俳句">
      </div>
      <div class="field">
        <label for="userName">あなたの名前</label>
        <input id="userName" maxlength="20" placeholder="例）山田">
      </div>
      ${button("部屋を作る", "primary", "createRoom()")}
    </div>
  `);
}

function createRoom() {
  const roomName = document.getElementById("roomName").value.trim() || "いつもの俳句";
  const userName = document.getElementById("userName").value.trim() || "名無し";

  state.room = { id: randomRoomId(), name: roomName };
  state.me.name = userName;
  state.participants = [userName];
  state.haikus = [];
  saveState();
  go("created");
}

function randomRoomId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  return Array.from({length: 8}, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function renderCreated() {
  const url = `${location.origin}${location.pathname}#/room/${state.room.id}`;
  document.getElementById("app").innerHTML = layout(`
    <div style="text-align:center; padding-top:10vh">
      <div style="font-size:3rem; color:var(--accent);">✓</div>
      <h1 class="page-title">部屋ができました</h1>

      <div class="form-card">
        <h2 class="brand" style="font-size:1.25rem">${escapeHtml(state.room.name)}</h2>
        <div class="share-box">
          <div class="muted">友人にこのURLを送ってください</div>
          <div class="share-url">
            <input id="shareUrl" readonly value="${escapeHtml(url)}">
            <button class="copy" onclick="copyUrl()">コピー</button>
          </div>
        </div>
        ${button("部屋へ", "primary", "go('room')")}
      </div>
    </div>
  `);
}

function copyUrl() {
  const input = document.getElementById("shareUrl");
  navigator.clipboard?.writeText(input.value);
  const btn = document.querySelector(".copy");
  if (btn) {
    btn.textContent = "コピー済み";
    setTimeout(() => btn.textContent = "コピー", 1300);
  }
}

function renderJoin() {
  document.getElementById("app").innerHTML = layout(`
    <div class="topbar">
      <button class="back" onclick="go('home')">‹　戻る</button>
    </div>
    <h1 class="page-title">部屋に参加する</h1>
    <p class="muted">デモでは、現在の部屋に参加します。</p>
    <div class="form-card">
      <div class="field">
        <label for="joinName">あなたの名前</label>
        <input id="joinName" maxlength="20" placeholder="例）山田">
      </div>
      ${button("参加する", "primary", "joinRoom()")}
      <div class="notice">実際のサービスでは、友人から共有されたURLを開けば、この画面から参加できます。</div>
    </div>
  `);
}

function joinRoom() {
  const name = document.getElementById("joinName").value.trim() || "名無し";
  state.me.name = name;
  if (!state.participants.includes(name)) state.participants.push(name);
  saveState();
  go("room");
}

function renderRoom() {
  const haikus = state.haikus.filter(h => !h.parentId).slice().reverse();

  document.getElementById("app").innerHTML = layout(`
    <header class="room-header">
      <div class="topbar">
        <div>
          <div class="room-title">
            <h1>${escapeHtml(state.room.name)}</h1>
            <span class="chevron">⌄</span>
          </div>
          <div class="room-meta">${state.participants.length}人が参加中</div>
        </div>
        <button class="icon-button" onclick="showParticipants()" aria-label="参加者">♧</button>
      </div>
    </header>

    <section class="feed">
      ${haikus.length ? haikus.map(renderHaikuCard).join("") : `
        <div class="form-card" style="text-align:center">
          <div class="brand" style="font-size:1.2rem">まだ俳句がありません。</div>
          <p class="muted">思いついたら、最初の一句を置いてみましょう。</p>
        </div>
      `}
    </section>

    <button class="fab" onclick="go('post')">＋　俳句を投稿する</button>
  `);
}

function renderHaikuCard(h) {
  const replyCount = state.haikus.filter(x => x.parentId === h.id).length;
  return `
    <article class="haiku-card">
      <div class="author-row">
        <span class="avatar">${escapeHtml(initials(h.author))}</span>
        <span>${escapeHtml(h.author)}</span>
        <span>·</span>
        <span>${escapeHtml(h.time)}</span>
      </div>
      <div class="haiku-text">${escapeHtml(h.body)}</div>
      <div class="signature">― ${escapeHtml(h.author)}</div>
      <div class="card-actions">
        <button class="small-action ${h.liked ? "liked" : ""}" onclick="toggleLike('${h.id}')">
          ${h.liked ? "♥" : "♡"} ${h.likes}
        </button>
        <button class="small-action" onclick="go('detail','${h.id}')">↪ ${replyCount}</button>
      </div>
    </article>
  `;
}

function toggleLike(id) {
  const h = state.haikus.find(x => x.id === id);
  if (!h) return;
  h.liked = !h.liked;
  h.likes += h.liked ? 1 : -1;
  saveState();
  renderRoom();
}

function renderPost() {
  document.getElementById("app").innerHTML = layout(`
    <div class="topbar">
      <button class="back" onclick="go('room')">‹　戻る</button>
    </div>
    <h1 class="page-title">俳句を投稿する</h1>
    <p class="muted">形式は自由。三行でなくても大丈夫です。</p>

    <div class="form-card">
      <div class="field">
        <textarea id="haikuBody" maxlength="200" placeholder="ここに俳句を入力してください"></textarea>
        <div class="counter"><span id="count">0</span> / 200</div>
      </div>
      ${button("投稿する", "primary", "postHaiku()")}
    </div>
  `);

  const textarea = document.getElementById("haikuBody");
  textarea.addEventListener("input", () => {
    document.getElementById("count").textContent = textarea.value.length;
  });
}

function postHaiku() {
  const body = document.getElementById("haikuBody").value.trim();
  if (!body) return;

  state.haikus.push({
    id: "h" + Date.now(),
    author: state.me.name,
    body,
    time: nowLabel(),
    likes: 0,
    liked: false,
    parentId: null,
  });

  saveState();
  go("room");
}

function renderDetail(id) {
  const h = state.haikus.find(x => x.id === id);
  if (!h) return go("room");

  const replies = state.haikus.filter(x => x.parentId === h.id);

  document.getElementById("app").innerHTML = layout(`
    <div class="topbar">
      <button class="back" onclick="go('room')">‹　戻る</button>
    </div>

    <article class="haiku-card detail-card">
      <div class="author-row">
        <span class="avatar">${escapeHtml(initials(h.author))}</span>
        <span>${escapeHtml(h.author)}</span>
        <span>·</span>
        <span>${escapeHtml(h.time)}</span>
      </div>
      <div class="haiku-text">${escapeHtml(h.body)}</div>
      <div class="signature">― ${escapeHtml(h.author)}</div>
      <div class="card-actions">
        <button class="small-action ${h.liked ? "liked" : ""}" onclick="toggleLikeDetail('${h.id}')">
          ${h.liked ? "♥" : "♡"} ${h.likes}
        </button>
      </div>
    </article>

    ${button("返句する", "primary", `go('reply','${h.id}')`)}

    <section class="reply-section">
      <h2 class="reply-heading">返句 ${replies.length ? replies.length : ""}</h2>
      ${replies.length
        ? replies.map(r => `
          <article class="reply-card">
            <div class="author-row">
              <span class="avatar">${escapeHtml(initials(r.author))}</span>
              <span>${escapeHtml(r.author)}</span>
              <span>·</span>
              <span>${escapeHtml(r.time)}</span>
            </div>
            <div class="haiku-text">${escapeHtml(r.body)}</div>
            <div class="signature">― ${escapeHtml(r.author)}</div>
          </article>
        `).join("")
        : `<p class="muted">まだ返句はありません。</p>`
      }
    </section>
  `);
}

function toggleLikeDetail(id) {
  const h = state.haikus.find(x => x.id === id);
  if (!h) return;
  h.liked = !h.liked;
  h.likes += h.liked ? 1 : -1;
  saveState();
  renderDetail(id);
}

function renderReply(parentId) {
  const parent = state.haikus.find(x => x.id === parentId);
  if (!parent) return go("room");

  document.getElementById("app").innerHTML = layout(`
    <div class="topbar">
      <button class="back" onclick="go('detail','${parentId}')">‹　戻る</button>
    </div>
    <h1 class="page-title">返句する</h1>

    <article class="reply-card" style="margin-top:18px">
      <div class="muted">元の俳句</div>
      <div class="haiku-text">${escapeHtml(parent.body)}</div>
      <div class="signature">― ${escapeHtml(parent.author)}</div>
    </article>

    <div class="form-card">
      <div class="field">
        <label for="replyBody">あなたの返句</label>
        <textarea id="replyBody" maxlength="200" placeholder="ここに返句を入力してください"></textarea>
        <div class="counter"><span id="replyCount">0</span> / 200</div>
      </div>
      ${button("返句する", "primary", `postReply('${parentId}')`)}
    </div>
  `);

  const textarea = document.getElementById("replyBody");
  textarea.addEventListener("input", () => {
    document.getElementById("replyCount").textContent = textarea.value.length;
  });
}

function postReply(parentId) {
  const body = document.getElementById("replyBody").value.trim();
  if (!body) return;

  state.haikus.push({
    id: "h" + Date.now(),
    author: state.me.name,
    body,
    time: nowLabel(),
    likes: 0,
    liked: false,
    parentId,
  });

  saveState();
  go("detail", parentId);
}

function showParticipants() {
  const existing = document.getElementById("modal");
  if (existing) existing.remove();

  document.body.insertAdjacentHTML("beforeend", `
    <div class="modal-backdrop" id="modal" onclick="closeModal(event)">
      <section class="sheet" onclick="event.stopPropagation()">
        <div class="sheet-header">
          <h2>参加者</h2>
          <button class="icon-button" onclick="closeModal()">×</button>
        </div>
        ${state.participants.map(name => `
          <div class="participant">
            <span class="avatar">${escapeHtml(initials(name))}</span>
            <span>${escapeHtml(name)}</span>
          </div>
        `).join("")}
      </section>
    </div>
  `);
}

function closeModal(event) {
  if (!event || event.target?.id === "modal") {
    document.getElementById("modal")?.remove();
  }
}

function render() {
  const { screen, id } = parseRoute();

  switch (screen) {
    case "home": renderHome(); break;
    case "create": renderCreate(); break;
    case "created": renderCreated(); break;
    case "join": renderJoin(); break;
    case "room": renderRoom(); break;
    case "post": renderPost(); break;
    case "detail": renderDetail(id); break;
    case "reply": renderReply(id); break;
    default: renderHome();
  }
}

window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", render);
