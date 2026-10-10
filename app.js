/* Haiku Salon - Supabase edition
 * Database tables expected: rooms, participants, haikus, likes
 */
const db = () => window.haikuSupabase;
const app = () => document.getElementById("app");
let currentUser = null;
let currentRoom = null;
let currentParticipant = null;
let roomParticipants = [];
let roomHaikus = [];
let roomLikes = [];
let busy = false;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function initials(name) { return [...String(name || "？")][0] || "？"; }
function nowLabel(value) {
  const d = value ? new Date(value) : new Date();
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function go(screen, id = "") { location.hash = id ? `/${screen}/${id}` : `/${screen}`; }
function parseRoute() {
  const parts = location.hash.replace(/^#\/?/, "").split("/");
  return { screen: parts[0] || "home", id: parts[1] || "" };
}
function layout(content, cls = "") { return `<div class="screen ${cls}">${content}</div>`; }
function button(text, cls = "primary", action = "") {
  return `<button class="${cls}" ${action ? `onclick="${action}"` : ""}>${text}</button>`;
}
function showMessage(message, isError = true) {
  const old = document.getElementById("app-message");
  if (old) old.remove();
  document.body.insertAdjacentHTML("beforeend", `<div id="app-message" class="toast ${isError ? "toast-error" : ""}" role="status">${escapeHtml(message)}</div>`);
  setTimeout(() => document.getElementById("app-message")?.remove(), 4500);
}
function setBusy(value) {
  busy = value;
  document.querySelectorAll("button").forEach(b => { b.disabled = value; });
}
function friendlyError(error) {
  console.error(error);
  const message = error?.message || String(error);
  if (/Invalid API key/i.test(message)) return "SupabaseのPublishable keyを確認してください。";
  if (/Failed to fetch/i.test(message)) return "Supabaseに接続できません。Project URLとネットワークを確認してください。";
  if (/row-level security|permission denied/i.test(message)) return "データベースのアクセス制御で拒否されました。設定済みのRLSポリシーを確認してください。";
  if (/duplicate key/i.test(message)) return "すでに参加済みのようです。画面を更新してお試しください。";
  return `処理に失敗しました：${message}`;
}
async function ensureSession() {
  const { data, error } = await db().auth.getSession();
  if (error) throw error;
  if (data.session) {
    currentUser = data.session.user;
    return currentUser;
  }
  const { data: signed, error: signError } = await db().auth.signInAnonymously();
  if (signError) throw signError;
  currentUser = signed.user;
  return currentUser;
}
async function runSafely(fn) {
  if (busy) return;
  setBusy(true);
  try { await fn(); }
  catch (error) { showMessage(friendlyError(error)); }
  finally { setBusy(false); }
}

function renderHome() {
  document.title = "Haiku Salon";
  app().innerHTML = layout(`
    <section class="hero">
      <div class="hero-copy"><h1 class="brand">Haiku Salon</h1><p>俳句を、置いておこう。</p></div>
      <div><div class="landscape" aria-hidden="true"></div>
        <div class="actions">
          ${button("＋　部屋をつくる", "primary", "go('create')")}
          <button class="secondary" onclick="go('join')">🔗　部屋に参加する</button>
          <div class="muted" style="text-align:center">友人から届いたURLからも直接参加できます</div>
        </div>
      </div>
    </section>`);
}
function renderCreate() {
  app().innerHTML = layout(`<div class="topbar"><button class="back" onclick="go('home')">‹　戻る</button></div>
    <h1 class="page-title">新しい部屋を作る</h1><p class="muted">部屋の名前と、あなたの名前を入力してください。</p>
    <form class="form-card" onsubmit="event.preventDefault(); createRoom();">
      <div class="field"><label for="roomName">部屋の名前</label><input id="roomName" maxlength="30" placeholder="例）いつもの俳句" required></div>
      <div class="field"><label for="userName">あなたの名前</label><input id="userName" maxlength="20" placeholder="例）山田" required></div>
      <button class="primary" type="submit">部屋を作る</button>
    </form>`);
}
async function createRoom() {
  await runSafely(async () => {
    const roomName = document.getElementById("roomName")?.value.trim() || "いつもの俳句";
    const userName = document.getElementById("userName")?.value.trim() || "名無し";
    const { data: room, error: roomError } = await db().from("rooms")
      .insert({ name: roomName, created_by: currentUser.id }).select("id,name,created_at").single();
    if (roomError) throw roomError;
    const { data: participant, error: participantError } = await db().from("participants")
      .insert({ room_id: room.id, user_id: currentUser.id, display_name: userName })
      .select("id,room_id,user_id,display_name").single();
    if (participantError) throw participantError;
    currentRoom = room; currentParticipant = participant;
    go("created", room.id);
  });
}
function renderCreated(roomId) {
  if (!currentRoom || currentRoom.id !== roomId) { go("room", roomId); return; }
  const url = `${location.origin}${location.pathname}#/room/${currentRoom.id}`;
  app().innerHTML = layout(`<div style="text-align:center;padding-top:10vh"><div style="font-size:3rem;color:var(--accent)">✓</div>
    <h1 class="page-title">部屋ができました</h1><div class="form-card"><h2 class="brand" style="font-size:1.25rem">${escapeHtml(currentRoom.name)}</h2>
    <div class="share-box"><div class="muted">友人にこのURLを送ってください</div><div class="share-url"><input id="shareUrl" readonly value="${escapeHtml(url)}"><button class="copy" onclick="copyUrl()">コピー</button></div></div>
    ${button("部屋へ", "primary", `go('room','${roomId}')`)}</div></div>`);
}
async function copyUrl() {
  const input = document.getElementById("shareUrl");
  try { await navigator.clipboard.writeText(input.value); const btn = document.querySelector(".copy"); if (btn) btn.textContent = "コピー済み"; }
  catch { input.select(); document.execCommand("copy"); showMessage("URLをコピーしました", false); }
}
function renderJoin(roomId = "") {
  app().innerHTML = layout(`<div class="topbar"><button class="back" onclick="go('home')">‹　戻る</button></div>
    <h1 class="page-title">部屋に参加する</h1><p class="muted">友人から共有されたURLまたは部屋IDを入力してください。</p>
    <form class="form-card" onsubmit="event.preventDefault(); joinRoom();">
      <div class="field"><label for="roomAddress">部屋のURLまたはID</label><input id="roomAddress" value="${escapeHtml(roomId)}" placeholder="共有URLを貼り付け" required></div>
      <div class="field"><label for="joinName">あなたの名前</label><input id="joinName" maxlength="20" placeholder="例）山田" required></div>
      <button class="primary" type="submit">参加する</button>
      <div class="notice">このURLを知っている人は参加できます。URLは信頼できる友人にだけ共有してください。</div>
    </form>`);
}
function extractRoomId(value) {
  const raw = value.trim();
  const match = raw.match(/#\/?room\/([0-9a-f-]{36})/i);
  if (match) return match[1];
  return raw.replace(/^\s+|\s+$/g, "");
}
async function joinRoom() {
  await runSafely(async () => {
    const raw = document.getElementById("roomAddress")?.value || "";
    const roomId = extractRoomId(raw);
    const userName = document.getElementById("joinName")?.value.trim() || "名無し";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(roomId)) {
      throw new Error("部屋のURLまたはIDが正しくありません。部屋を作った人から共有URLを送ってもらってください。");
    }
    // 同じ匿名ユーザーが同じ部屋に戻る場合は既存参加者を再利用する。
    const { data: existing, error: findError } = await db().from("participants")
      .select("id,room_id,user_id,display_name").eq("room_id", roomId).eq("user_id", currentUser.id).maybeSingle();
    if (findError) throw findError;
    let participant = existing;
    if (!participant) {
      const { data, error } = await db().from("participants")
        .insert({ room_id: roomId, user_id: currentUser.id, display_name: userName })
        .select("id,room_id,user_id,display_name").single();
      if (error) throw error;
      participant = data;
    } else if (participant.display_name !== userName) {
      const { data, error } = await db().from("participants").update({ display_name: userName })
        .eq("id", participant.id).select("id,room_id,user_id,display_name").single();
      if (error) throw error;
      participant = data;
    }
    go("room", roomId);
  });
}
async function loadRoom(roomId) {
  const { data: participant, error: participantError } = await db().from("participants")
    .select("id,room_id,user_id,display_name").eq("room_id", roomId).eq("user_id", currentUser.id).maybeSingle();
  if (participantError) throw participantError;
  if (!participant) { currentRoom = null; currentParticipant = null; renderJoin(roomId); return false; }
  const { data: room, error: roomError } = await db().from("rooms")
    .select("id,name,created_at,created_by").eq("id", roomId).single();
  if (roomError) throw roomError;
  const { data: participants, error: peopleError } = await db().from("participants")
    .select("id,display_name,created_at").eq("room_id", roomId).order("created_at", { ascending: true });
  if (peopleError) throw peopleError;
  const { data: haikus, error: haikuError } = await db().from("haikus")
    .select("id,room_id,participant_id,parent_haiku_id,body,created_at").eq("room_id", roomId).order("created_at", { ascending: true });
  if (haikuError) throw haikuError;
  const { data: likes, error: likesError } = await db().from("likes").select("haiku_id,participant_id");
  if (likesError) throw likesError;
  currentRoom = room; currentParticipant = participant; roomParticipants = participants || []; roomLikes = likes || [];
  roomHaikus = (haikus || []).map(h => {
    const author = roomParticipants.find(p => p.id === h.participant_id);
    const likesForHaiku = roomLikes.filter(l => l.haiku_id === h.id);
    return { ...h, author: author?.display_name || "名無し", time: nowLabel(h.created_at), likes: likesForHaiku.length,
      liked: likesForHaiku.some(l => l.participant_id === currentParticipant.id), parentId: h.parent_haiku_id };
  });
  return true;
}
async function renderRoom(roomId) {
  if (!roomId) { go("home"); return; }
  try {
    const loaded = await loadRoom(roomId);
    if (!loaded) return;
    document.title = `${currentRoom.name} - Haiku Salon`;
    const haikus = roomHaikus.filter(h => !h.parentId).slice().reverse();
    app().innerHTML = layout(`<header class="room-header"><div class="topbar"><div><div class="room-title"><h1>${escapeHtml(currentRoom.name)}</h1><span class="chevron">⌄</span></div><div class="room-meta">${roomParticipants.length}人が参加中</div></div>
      <button class="icon-button" onclick="showParticipants()" aria-label="参加者">♧</button></div></header>
      <section class="feed">${haikus.length ? haikus.map(renderHaikuCard).join("") : `<div class="form-card" style="text-align:center"><div class="brand" style="font-size:1.2rem">まだ俳句がありません。</div><p class="muted">思いついたら、最初の一句を置いてみましょう。</p></div>`}</section>
      <button class="fab" onclick="go('post','${roomId}')">＋　俳句を投稿する</button>`);
  } catch (error) { app().innerHTML = layout(`<div class="topbar"><button class="back" onclick="go('home')">‹　ホームへ</button></div><h1 class="page-title">部屋を開けませんでした</h1><p class="notice">${escapeHtml(friendlyError(error))}</p>`); }
}
function renderHaikuCard(h) {
  const replyCount = roomHaikus.filter(x => x.parentId === h.id).length;
  return `<article class="haiku-card"><div class="author-row"><span class="avatar">${escapeHtml(initials(h.author))}</span><span>${escapeHtml(h.author)}</span><span>·</span><span>${escapeHtml(h.time)}</span></div>
    <div class="haiku-text">${escapeHtml(h.body)}</div><div class="signature">― ${escapeHtml(h.author)}</div><div class="card-actions">
    <button class="small-action ${h.liked ? "liked" : ""}" onclick="toggleLike('${h.id}')">${h.liked ? "♥" : "♡"} ${h.likes}</button>
    <button class="small-action" onclick="go('detail','${h.id}')">↪ ${replyCount}</button></div></article>`;
}
async function toggleLike(id) {
  await runSafely(async () => {
    const existing = roomLikes.find(l => l.haiku_id === id && l.participant_id === currentParticipant.id);
    if (existing) {
      const { error } = await db().from("likes").delete().eq("haiku_id", id).eq("participant_id", currentParticipant.id);
      if (error) throw error;
    } else {
      const { error } = await db().from("likes").insert({ haiku_id: id, participant_id: currentParticipant.id });
      if (error) throw error;
    }
    await renderRoom(currentRoom.id);
  });
}
function renderPost(roomId) {
  app().innerHTML = layout(`<div class="topbar"><button class="back" onclick="go('room','${roomId}')">‹　戻る</button></div><h1 class="page-title">俳句を投稿する</h1><p class="muted">形式は自由。三行でなくても大丈夫です。</p>
    <form class="form-card" onsubmit="event.preventDefault(); postHaiku('${roomId}');"><div class="field"><textarea id="haikuBody" maxlength="200" placeholder="ここに俳句を入力してください" required></textarea><div class="counter"><span id="count">0</span> / 200</div></div><button class="primary" type="submit">投稿する</button></form>`);
  document.getElementById("haikuBody").addEventListener("input", e => { document.getElementById("count").textContent = e.target.value.length; });
}
async function postHaiku(roomId) {
  await runSafely(async () => {
    const body = document.getElementById("haikuBody")?.value.trim();
    if (!body) return;
    const { error } = await db().from("haikus").insert({ room_id: roomId, participant_id: currentParticipant.id, body, parent_haiku_id: null });
    if (error) throw error;
    go("room", roomId);
  });
}
function renderDetail(id) {
  const h = roomHaikus.find(x => x.id === id);
  if (!h) { showMessage("俳句が見つかりませんでした"); go("room", currentRoom?.id); return; }
  const replies = roomHaikus.filter(x => x.parentId === h.id);
  app().innerHTML = layout(`<div class="topbar"><button class="back" onclick="go('room','${currentRoom.id}')">‹　戻る</button></div>
    <article class="haiku-card detail-card"><div class="author-row"><span class="avatar">${escapeHtml(initials(h.author))}</span><span>${escapeHtml(h.author)}</span><span>·</span><span>${escapeHtml(h.time)}</span></div>
      <div class="haiku-text">${escapeHtml(h.body)}</div><div class="signature">― ${escapeHtml(h.author)}</div><div class="card-actions"><button class="small-action ${h.liked ? "liked" : ""}" onclick="toggleLike('${h.id}')">${h.liked ? "♥" : "♡"} ${h.likes}</button></div></article>
    ${button("返句する", "primary", `go('reply','${h.id}')`)}<section class="reply-section"><h2 class="reply-heading">返句 ${replies.length || ""}</h2>
    ${replies.length ? replies.map(r => `<article class="reply-card"><div class="author-row"><span class="avatar">${escapeHtml(initials(r.author))}</span><span>${escapeHtml(r.author)}</span><span>·</span><span>${escapeHtml(r.time)}</span></div><div class="haiku-text">${escapeHtml(r.body)}</div><div class="signature">― ${escapeHtml(r.author)}</div></article>`).join("") : `<p class="muted">まだ返句はありません。</p>`}</section>`);
}
function renderReply(parentId) {
  const parent = roomHaikus.find(x => x.id === parentId);
  if (!parent) { go("room", currentRoom.id); return; }
  app().innerHTML = layout(`<div class="topbar"><button class="back" onclick="go('detail','${parentId}')">‹　戻る</button></div><h1 class="page-title">返句する</h1>
    <article class="reply-card" style="margin-top:18px"><div class="muted">元の俳句</div><div class="haiku-text">${escapeHtml(parent.body)}</div><div class="signature">― ${escapeHtml(parent.author)}</div></article>
    <form class="form-card" onsubmit="event.preventDefault(); postReply('${parentId}');"><div class="field"><label for="replyBody">あなたの返句</label><textarea id="replyBody" maxlength="200" placeholder="ここに返句を入力してください" required></textarea><div class="counter"><span id="replyCount">0</span> / 200</div></div><button class="primary" type="submit">返句する</button></form>`);
  document.getElementById("replyBody").addEventListener("input", e => { document.getElementById("replyCount").textContent = e.target.value.length; });
}
async function postReply(parentId) {
  await runSafely(async () => {
    const body = document.getElementById("replyBody")?.value.trim();
    if (!body) return;
    const parent = roomHaikus.find(h => h.id === parentId);
    if (!parent) throw new Error("元の俳句が見つかりませんでした。");
    const { error } = await db().from("haikus").insert({ room_id: currentRoom.id, participant_id: currentParticipant.id, parent_haiku_id: parentId, body });
    if (error) throw error;
    go("detail", parentId);
  });
}
function showParticipants() {
  document.getElementById("modal")?.remove();
  document.body.insertAdjacentHTML("beforeend", `<div class="modal-backdrop" id="modal" onclick="closeModal(event)"><section class="sheet" onclick="event.stopPropagation()"><div class="sheet-header"><h2>参加者</h2><button class="icon-button" onclick="closeModal()">×</button></div>
    ${roomParticipants.map(p => `<div class="participant"><span class="avatar">${escapeHtml(initials(p.display_name))}</span><span>${escapeHtml(p.display_name)}${p.id === currentParticipant?.id ? "（あなた）" : ""}</span></div>`).join("")}</section></div>`);
}
function closeModal(event) { if (!event || event.target?.id === "modal") document.getElementById("modal")?.remove(); }
async function render() {
  const { screen, id } = parseRoute();
  try {
    if (!currentUser) await ensureSession();
    switch (screen) {
      case "home": renderHome(); break;
      case "create": renderCreate(); break;
      case "created": renderCreated(id); break;
      case "join": renderJoin(id); break;
      case "room": await renderRoom(id); break;
      case "post":
        if (await loadRoom(id)) renderPost(id);
        break;
      case "detail":
      case "reply": {
        // 詳細・返句URLには俳句IDが入るため、所属する部屋を特定する。
        const { data: haiku, error } = await db().from("haikus").select("room_id").eq("id", id).single();
        if (error) throw error;
        if (await loadRoom(haiku.room_id)) {
          if (screen === "detail") renderDetail(id); else renderReply(id);
        }
        break;
      }
      default: renderHome();
    }
  } catch (error) {
    app().innerHTML = layout(`<h1 class="page-title">Haiku Salonを開けませんでした</h1><p class="notice">${escapeHtml(friendlyError(error))}</p><button class="secondary" onclick="go('home')">ホームへ戻る</button>`);
  }
}
window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", render);
