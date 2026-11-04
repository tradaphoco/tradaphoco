/* Trà Đá Phố Cổ 3D — vòng lặp game, camera, điều khiển, người chơi thật & khách vãng lai */
(() => {
"use strict";
/* ============ CẤU HÌNH ============
   DEFAULT_SERVER: địa chỉ wss nếu trang game đặt ở nơi khác máy chủ (để trống nếu chạy bằng server.js).
   LICENSED_TRACKS: bài hát bạn ĐÃ CÓ QUYỀN phát công khai, đặt trong public/music/, ví dụ
     { title: "Tên bài", artist: "Ca sĩ · Tác giả", src: "music/ten-bai.mp3" }                     */
const DEFAULT_SERVER = "";
const STILL = new URLSearchParams(location.search).has("still"); // chỉ dùng khi kiểm thử
const LICENSED_TRACKS = [];

const qs = new URLSearchParams(location.search);
const WS_URL = qs.get("server") || DEFAULT_SERVER || (location.protocol.startsWith("http") ? (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/ws" : "");
const $ = id => document.getElementById(id);
const ri = n => Math.floor(Math.random() * n), pick = a => a[ri(a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } } };

/* ---------- Danh sách dùng chung với server (giữ nguyên độ dài) ---------- */
const NOUNS = ["Hoa Sữa", "Lá Sấu", "Gánh Hoa", "Tàu Điện", "Mái Ngói", "Cốm Vòng", "Tháp Rùa", "Cửa Ô", "Hồ Gươm", "Phố Cổ", "Gió Heo May", "Cốc Đá", "Kem Que", "Chiều Thu"];
const DESCS = ["Ngồi Lâu", "Tan Chậm", "Lơ Đãng", "Hay Gật Gù", "Không Vội", "Ngắm Phố", "Đi Ngang", "Thảnh Thơi", "Còn Ấm", "Cuối Ngày", "Chưa Về", "Lặng Im", "Biết Chờ", "Mới Đến"];
const SHIRTS = ["#e8d9b0", "#6d8fb3", "#c2554a", "#f2f2ee", "#4f7a5a", "#d9a24a", "#7d6aa8", "#2f3b4c", "#b7c4cf", "#9a5b3c"].map(hex);
const PANTS = ["#2f3440", "#4b4038", "#5a6b7d", "#1f2a36", "#6b5d4f"].map(hex);
const SKINS = ["#e9c39b", "#d9a87c", "#f0cfaa", "#c99569"].map(hex);
const HAIRS = ["#211a16", "#9a958d"].map(hex);
const HATS = ["none", "none", "none", "coi", "cap", "non"];
const nameOf = n => NOUNS[n[0]] + " " + DESCS[n[1]];
const randName = () => [ri(NOUNS.length), ri(DESCS.length)];
const randLook = () => ({ s: ri(SHIRTS.length), p: ri(PANTS.length), k: ri(SKINS.length), h: Math.random() < .25 ? 1 : 0, a: ri(HATS.length) });
const lookOf = l => ({ shirt: SHIRTS[l.s], pants: PANTS[l.p], skin: SKINS[l.k], hair: HAIRS[l.h], hat: HATS[l.a] });
const LINES = ["Hà Nội vội làm gì. Đá còn chưa tan.", "Gió heo may về rồi, ngồi thêm chút nữa.", "Cứ ngồi đấy. Phố tự đi qua.", "Một cốc trà đá, một khoảng lặng giữa phố cổ.", "Tàu điện leng keng, nghe như chuyện ngày xưa.", "Ngồi lâu cũng được, cô không đuổi đâu.", "Hướng dương cắn từng hạt, chuyện gỡ từng chút.", "Người lạ ngồi cạnh cũng đang nghĩ chuyện riêng.", "Mùi hoa sữa lẫn vào khói phở đầu phố.", "Chẳng cần nói gì. Ngồi là đủ."];

/* ---------- Khởi tạo đồ hoạ ---------- */
const cv = $("c"), lbl = $("lbl"), lctx = lbl.getContext("2d");
let R = null, W = null, quality = store.get("tdpc_q", matchMedia("(max-width: 700px)").matches ? "low" : "high");
let dpr = 1;
function resize() { dpr = Math.min(quality === "high" ? 1.75 : 1, window.devicePixelRatio || 1); cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr); lbl.width = cv.width; lbl.height = cv.height; }
addEventListener("resize", resize); resize();

function groundY(x, z) { if (x >= 204 && x < 214) return 0; if (x >= 214) return WALK_Y; return (z <= CURB_N || z >= CURB_S) ? WALK_Y : 0; }
function clampWalk(x, z) {
  x = clamp(x, 4, 221);
  if (x < 204) z = clamp(z, NZ + .45, SZ - .45); else z = clamp(z, -80, 80);
  if (x > 221.2) x = 221.2; return [x, z];
}

/* ---------- Người ---------- */
let myNameIdx = randName(), myLook = randLook();
function makePerson(kind, nameIdx, look) {
  return { kind, nameIdx, name: nameOf(nameIdx), look: lookOf(look), x: 0, z: 0, face: 0, state: "stand", stool: null, path: [], phase: Math.random() * 6, action: null, cup: 1,
    timer: 0, next: 2 + Math.random() * 4, leaving: false, stay: 45 + Math.random() * 75, speed: 1.3 + Math.random() * .3 };
}
let player = null; const npcs = [], remotes = new Map(), shellsFalling = [];
let seller = null, extras = [];
const allPeople = () => { const a = npcs.slice(); remotes.forEach(p => a.push(p)); if (player) a.push(player); return a; };
const realCount = () => remotes.size + (player ? 1 : 0);

function walkTo(p, x, z, fast) {
  [x, z] = clampWalk(x, z); p.state = "walk"; p.path = [];
  // đi vòng theo vỉa hè cho tự nhiên khi cần sang đường
  p.path.push({ x, z }); p.fast = !!fast; p.action = null;
}
function evictNPC(n) { if (n.stool) { n.stool.occ = null; n.stool = null; } n.leaving = true; n.action = null; const q = seller.queue.indexOf(n); if (q >= 0) seller.queue.splice(q, 1);
  n.state = "walk"; n.path = [{ x: n.x, z: -5.4 }, { x: n.x + (Math.random() < .5 ? -45 : 45), z: -5.4 }]; }
function sendTo(p, s) { if (s.occ && s.occ !== p) { if (s.occ.kind === "npc") evictNPC(s.occ); else return false; }
  if (p.stool && p.stool !== s) p.stool.occ = null; p.stool = s; s.occ = p; p.state = "walk"; p.action = null;
  p.path = [{ x: s.x + Math.sin(s.face) * .55, z: s.z + Math.cos(s.face) * .55 }, { x: s.x, z: s.z }]; p.fast = Math.hypot(p.x - s.x, p.z - s.z) > 20; return true; }
function placeSitting(p, s) { if (s.occ && s.occ !== p && s.occ.kind === "npc") evictNPC(s.occ); p.stool = s; s.occ = p; p.x = s.x; p.z = s.z; p.face = s.face; p.state = "sit"; p.path = []; }
function standUp(p) { if (p.stool) { p.stool.occ = null; p.stool = null; } const q = seller.queue.indexOf(p); if (q >= 0) seller.queue.splice(q, 1); if (p.state === "sit") { p.state = "stand"; p.x += Math.sin(p.face) * .5; p.z += Math.cos(p.face) * .5; } }
const claimable = s => !s.occ || s.occ.kind === "npc" || s.occ === player;
function spawnNPC() { const fs = W.stools.filter(s => !s.occ); if (fs.length < 3) return; const p = makePerson("npc", randName(), randLook()); p.x = W.stall.x + (Math.random() < .5 ? -45 : 45); p.z = -5.4;
  const s = pick(fs); p.path = [{ x: s.x, z: -5.4 }]; sendTo(p, s); p.path.unshift({ x: s.x + Math.sin(s.face) * .6, z: -5.4 }); npcs.push(p); }
function npcTarget() { return mode === "online" ? Math.max(0, 6 - realCount()) : 10; }

/* ---------- Động tác ---------- */
const DUR = { sip: 1.8, seed: .8, nod: 1.0 };
const stats = { cups: 0, seeds: 0, nods: 0, sat: 0, totalCups: store.get("tdvh_cups", 0), totalSeeds: store.get("tdvh_seeds", 0) };
function doAction(p, type) { if (p.state !== "sit" || p.action) return false; if (type === "sip" && p.cup <= .01) return false; p.action = { type, t: 0, fired: false }; return true; }
function fireAction(p, type) {
  if (type === "sip") { p.cup = Math.max(0, p.cup - .2); if (p === player) Snd.clink(); else Snd.clinkAt([p.x, 1, p.z], p.kind === "real" ? .8 : .35); if (p.cup <= .01 && !seller.queue.includes(p)) seller.queue.push(p); }
  if (type === "seed") { const s = p.stool; if (!s) return; for (let i = 0; i < 2; i++) shellsFalling.push({ x: p.x + Math.sin(p.face) * .2, y: 1.15, z: p.z + Math.cos(p.face) * .2, vx: (Math.random() - .5) * .8, vz: (Math.random() - .5) * .8, vy: .3, s, ry: Math.random() * 6 });
    if (p === player) { Snd.crack(); stats.seeds++; stats.totalSeeds++; store.set("tdvh_seeds", stats.totalSeeds); if (stats.seeds % 100 === 0) say(stats.seeds + " hạt rồi đấy. Phố cổ vẫn thế."); } }
  if (type === "nod") { if (p.kind === "real") Snd.nod();
    if (p === player) { stats.nods++; let best = null, bd = 4; npcs.forEach(n => { if (n.state === "sit") { const d = Math.hypot(n.x - p.x, n.z - p.z); if (d < bd) { bd = d; best = n; } } });
      if (best && Math.random() < .85) setTimeout(() => { if (best.state === "sit" && !best.action) doAction(best, "nod"); }, 500 + Math.random() * 900); } }
}

/* ---------- Thông báo ---------- */
let toastTimer = 0; function say(msg) { const t = $("toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 4500); }
let infoTimer = 0; function showInfo(l) { $("infoStreet").textContent = l.k; $("infoTitle").textContent = l.t; $("infoText").textContent = l.d; $("info").classList.add("show"); clearTimeout(infoTimer); infoTimer = setTimeout(hideInfo, 12000); }
function hideInfo() { $("info").classList.remove("show"); }
$("infoClose").addEventListener("click", hideInfo);

/* ---------- Mạng ---------- */
let mode = "offline";
const net = { ws: null, id: null, room: 0, want: false, tries: 0, ever: false };
function wsSend(o) { if (net.ws && net.ws.readyState === 1) net.ws.send(JSON.stringify(o)); }
function clearRemotes() { remotes.forEach(p => { if (p.stool) p.stool.occ = null; const q = seller.queue.indexOf(p); if (q >= 0) seller.queue.splice(q, 1); }); remotes.clear(); }
function addRemote(d, arrive) { const p = makePerson("real", d.n, d.l); p.id = d.id; remotes.set(d.id, p);
  if (d.s !== null && d.s !== undefined && W.stools[d.s]) { if (arrive) { p.x = W.stall.x + (Math.random() < .5 ? -30 : 30); p.z = -5.4; sendTo(p, W.stools[d.s]); } else placeSitting(p, W.stools[d.s]); }
  else { const x = typeof d.x === "number" ? d.x : 70, z = typeof d.z === "number" ? d.z : -5.5; if (arrive) { p.x = x + (Math.random() < .5 ? -25 : 25); p.z = -5.4; walkTo(p, x, z); } else { p.x = x; p.z = z; } } return p; }
function connect() { let ws; try { ws = new WebSocket(WS_URL); } catch (e) { return goOffline("Không mở được kết nối. Bạn đang ngồi một mình."); }
  net.ws = ws; const to = setTimeout(() => { if (ws.readyState !== 1) ws.close(); }, 6000);
  ws.onopen = () => { clearTimeout(to); ws.send(JSON.stringify({ t: "hello", n: myNameIdx, l: myLook })); };
  ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (_) { return; } handle(m); };
  ws.onclose = () => { clearTimeout(to); net.ws = null; clearRemotes();
    if (!net.ever) { goOffline("Chưa kết nối được quán chung. Tạm ngồi một mình nhé."); return; }
    if (net.want) { mode = "reconnecting"; setMode(); net.tries++; say("Mất sóng… đang nối lại."); setTimeout(connect, Math.min(15000, 1500 * net.tries)); } }; }
function handle(m) {
  if (m.t === "welcome") { net.id = m.id; net.room = m.room; net.ever = true; net.tries = 0; mode = "online"; m.players.forEach(d => addRemote(d, false)); setMode(); ready();
    if (player && player.stool) wsSend({ t: "sit", s: player.stool.i }); const n = m.players.length;
    say(n ? "Quán số " + m.room + " đang có " + n + " người. Kiếm ghế mà ngồi." : "Quán số " + m.room + " chưa có ai. Bạn là khách đầu tiên."); }
  else if (m.t === "join") { if (!remotes.has(m.p.id)) { addRemote(m.p, true); Snd.join(); } setMode(); }
  else if (m.t === "leave") { const p = remotes.get(m.id); if (p) { remotes.delete(m.id); standUp(p); p.kind = "ghost"; p.leaving = true; p.state = "walk"; p.path = [{ x: p.x, z: -5.4 }, { x: p.x + (Math.random() < .5 ? -45 : 45), z: -5.4 }]; npcs.push(p); } setMode(); }
  else if (m.t === "sit") { const s = W.stools[m.s]; if (!s) return;
    if (m.id === net.id) { if (s.occ && s.occ !== player && s.occ.kind === "real") return; sendTo(player, s); }
    else { const p = remotes.get(m.id); if (!p) return; if (s.occ === player) { standUp(player); say("Có người vừa ngồi vào ghế này. Bạn kiếm ghế khác nhé."); } sendTo(p, s); } }
  else if (m.t === "go") { const p = remotes.get(m.id); if (p) { standUp(p); walkTo(p, m.x, m.z, Math.hypot(p.x - m.x, p.z - m.z) > 15); } }
  else if (m.t === "deny") { pendingAct = null; say("Có người nhanh tay hơn. Ghế đó có chủ rồi."); if (player.stool && player.stool.i === m.s) standUp(player); }
  else if (m.t === "act") { const p = remotes.get(m.id); if (p) doAction(p, m.a); }
}
function goOffline(msg) { mode = "offline"; net.want = false; setMode(); ready(); if (msg) say(msg); }
function setMode() { const el = $("mode");
  if (mode === "online") { el.className = "chip on"; el.textContent = "Quán số " + net.room + " · " + realCount() + " người thật"; }
  else if (mode === "reconnecting") { el.className = "chip"; el.textContent = "Đang nối lại…"; }
  else { el.className = "chip"; el.textContent = "Ngồi một mình"; } }
function requestSit(s) { if (!player || s.occ === player) return; if (!claimable(s)) { say("Ghế này có người ngồi rồi."); return; }
  if (mode === "online") wsSend({ t: "sit", s: s.i }); else if (mode === "offline") sendTo(player, s); }
function goPlayer(x, z, fast) { [x, z] = clampWalk(x, z); standUp(player); walkTo(player, x, z, fast); pendingAct = null; if (mode === "online") wsSend({ t: "go", x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10 }); }

/* ---------- Điều khiển ---------- */
let pendingAct = null, calm = false;
function setCalm(v) { calm = v; document.body.classList.toggle("calm", v); $("a4").classList.toggle("on", v); if (v) { hideInfo(); toggleRadio(false); togglePlaces(false); togglePass(false); } }
function playerAct(type) { if (!player) return;
  if (player.state !== "sit") { if (!player.stool) { const fs = W.stools.filter(s => claimable(s)); if (!fs.length) { say("Hết ghế rồi. Chờ chút nhé."); return; }
      fs.sort((a, b) => (a.occ ? 1 : 0) - (b.occ ? 1 : 0) || Math.hypot(a.x - player.x, a.z - player.z) - Math.hypot(b.x - player.x, b.z - player.z)); requestSit(fs[0]); } pendingAct = type; return; }
  if (type === "sip" && player.cup <= .01) { say("Cốc cạn rồi. Cô đang rót thêm…"); return; }
  if (doAction(player, type) && mode === "online") wsSend({ t: "act", a: type }); }
$("a1").addEventListener("click", () => playerAct("sip")); $("a2").addEventListener("click", () => playerAct("seed")); $("a3").addEventListener("click", () => playerAct("nod")); $("a4").addEventListener("click", () => setCalm(!calm));
$("bSound").addEventListener("click", e => { Snd.init(); Snd.cityOn = !Snd.cityOn; Snd.setCity(); e.currentTarget.textContent = "Tiếng phố: " + (Snd.cityOn ? "Bật" : "Tắt"); e.currentTarget.setAttribute("aria-pressed", Snd.cityOn); });
let raining = false, wet = 0; $("bWeather").addEventListener("click", e => { raining = !raining; e.currentTarget.textContent = "Trời: " + (raining ? "Mưa phùn" : "Hanh"); Snd.setRain(raining); });
const TIMES = ["auto", "sang", "chieu", "toi"], TLABEL = { auto: "Thật", sang: "Sáng", chieu: "Chiều", toi: "Tối" }; let timeMode = 0;
$("bTime").addEventListener("click", e => { timeMode = (timeMode + 1) % TIMES.length; e.currentTarget.textContent = "Giờ: " + TLABEL[TIMES[timeMode]]; });
function setQ() { $("bQ").textContent = "Đồ hoạ: " + (quality === "high" ? "Cao" : "Nhẹ"); }
$("bQ").addEventListener("click", () => { quality = quality === "high" ? "low" : "high"; store.set("tdpc_q", quality); setQ(); resize(); }); setQ();
$("bHelp").addEventListener("click", () => { $("guide").classList.remove("gone"); $("closeGuide").focus(); });
$("closeGuide").addEventListener("click", () => $("guide").classList.add("gone"));
$("introName").textContent = nameOf(myNameIdx);
$("reroll").addEventListener("click", () => { myNameIdx = randName(); myLook = randLook(); $("introName").textContent = nameOf(myNameIdx); });
if (!WS_URL) { $("startOnline").disabled = true; $("onlineNote").textContent = "Chế độ nhiều người cần mở trang qua máy chủ (xem README) hoặc thêm ?server=wss://… vào đường link."; }
function toggleRadio(v) { const r = $("radio"), show = v === undefined ? !r.classList.contains("show") : v; r.classList.toggle("show", show); $("bMusic").setAttribute("aria-expanded", show); if (show) { togglePlaces(false); togglePass(false); Radio.render(); Snd.init(); } }
function togglePlaces(v) { const r = $("places"), show = v === undefined ? !r.classList.contains("show") : v; r.classList.toggle("show", show); $("bPlaces").setAttribute("aria-expanded", show); if (show) { toggleRadio(false); togglePass(false); } }
$("bMusic").addEventListener("click", () => toggleRadio()); $("np").addEventListener("click", () => toggleRadio(true)); $("radioClose").addEventListener("click", () => toggleRadio(false));
function togglePass(v) { const r = $("passport"), show = v === undefined ? !r.classList.contains("show") : v; r.classList.toggle("show", show); $("bPass").setAttribute("aria-expanded", show); if (show) { toggleRadio(false); togglePlaces(false); Passport.render(); } }
$("bPass").addEventListener("click", () => togglePass()); $("passClose").addEventListener("click", () => togglePass(false));
$("bPlaces").addEventListener("click", () => togglePlaces()); $("placesClose").addEventListener("click", () => togglePlaces(false));

/* ---------- Camera ---------- */
const cam = { yaw: .55, pitch: .28, dist: innerWidth < innerHeight ? 8.5 : 6.5, target: [76, 1.2, -6], eye: [0, 0, 0], vp: null, view: null, proj: null, fov: 55 * Math.PI / 180 };
function updateCam(dt) {
  if (player) { const ty = groundY(player.x, player.z) + (player.state === "sit" ? .9 : 1.45); cam.target[0] = lerp(cam.target[0], player.x, Math.min(1, dt * 4)); cam.target[1] = lerp(cam.target[1], ty, Math.min(1, dt * 4)); cam.target[2] = lerp(cam.target[2], player.z, Math.min(1, dt * 4)); }
  if (calm) { cam.yaw += dt * .06; cam.pitch = lerp(cam.pitch, .12, dt * .3); cam.dist = lerp(cam.dist, 9, dt * .3); }
  const t = cam.target, cp = Math.cos(cam.pitch); let d = cam.dist;
  const dir = [Math.sin(cam.yaw) * cp, Math.sin(cam.pitch), Math.cos(cam.yaw) * cp];
  if (t[0] < 203) { // không cho camera chui vào nhà
    if (dir[2] > 0) d = Math.min(d, (SZ - .9 - t[2]) / dir[2]); else if (dir[2] < 0) d = Math.min(d, (NZ + .9 - t[2]) / dir[2]); }
  d = Math.max(.8, d);
  cam.eye = [t[0] + dir[0] * d, Math.max(.35, t[1] + dir[1] * d), t[2] + dir[2] * d];
  const asp = cv.width / cv.height; cam.proj = M4.persp(asp < .8 ? 72 * Math.PI / 180 : cam.fov, asp, .1, 900); cam.view = M4.lookAt(cam.eye, t, [0, 1, 0]); cam.vp = M4.mul(new Float32Array(16), cam.proj, cam.view);
}
function project(x, y, z) { const m = cam.vp; const cx = m[0] * x + m[4] * y + m[8] * z + m[12], cy = m[1] * x + m[5] * y + m[9] * z + m[13], w = m[3] * x + m[7] * y + m[11] * z + m[15]; if (w <= .1) return null; return [(cx / w * .5 + .5) * cv.width, (1 - (cy / w * .5 + .5)) * cv.height, w]; }
function rayAt(px, py) { const inv = M4.inv(cam.vp), nx = px / cv.width * 2 - 1, ny = 1 - py / cv.height * 2;
  const un = (z) => { const x = inv[0] * nx + inv[4] * ny + inv[8] * z + inv[12], y = inv[1] * nx + inv[5] * ny + inv[9] * z + inv[13], zz = inv[2] * nx + inv[6] * ny + inv[10] * z + inv[14], w = inv[3] * nx + inv[7] * ny + inv[11] * z + inv[15]; return [x / w, y / w, zz / w]; };
  const a = un(-1), b = un(1), d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l = Math.hypot(...d); return { o: a, d: [d[0] / l, d[1] / l, d[2] / l] }; }
function rayBox(r, b) { let t0 = 0, t1 = 1e9; const mn = [b.x0, 0, b.z0], mx = [b.x1, Math.max(b.h, .01), b.z1];
  for (let k = 0; k < 3; k++) { if (Math.abs(r.d[k]) < 1e-8) { if (r.o[k] < mn[k] || r.o[k] > mx[k]) return -1; continue; } let a = (mn[k] - r.o[k]) / r.d[k], c = (mx[k] - r.o[k]) / r.d[k]; if (a > c) [a, c] = [c, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, c); if (t0 > t1) return -1; } return t0; }
function pick3D(px, py) {
  if (!player) return;
  let best = null, bd = 42 * dpr; W.stools.forEach(s => { const p = project(s.x, WALK_Y + .35, s.z); if (!p) return; const d = Math.hypot(p[0] - px, p[1] - py); if (d < bd) { bd = d; best = s; } });
  if (best) { hideInfo(); pendingAct = null; requestSit(best); return; }
  const r = rayAt(px, py); let tb = 1e9, hb = null; W.blocks.forEach(b => { const t = rayBox(r, b); if (t >= 0 && t < tb) { tb = t; hb = b; } });
  const tg = r.d[1] < -1e-4 ? (WALK_Y * .5 - r.o[1]) / r.d[1] : 1e9;
  if (hb && tb < tg) { const hx = r.o[0] + r.d[0] * tb, hz = r.o[2] + r.d[2] * tb;
    if (hb.lm && W.landmarks[hb.lm]) showInfo(W.landmarks[hb.lm]); else hideInfo();
    if (hb.water) goPlayer(219.5, hz, true); else if (hb.lm === "gate") goPlayer(5, hz); else goPlayer(clamp(hx, hb.x0 + .5, hb.x1 - .5), hz < 0 ? NZ + .8 : SZ - .8, Math.abs(hx - player.x) > 20); return; }
  if (tg < 400) { hideInfo(); const gx = r.o[0] + r.d[0] * tg, gz = r.o[2] + r.d[2] * tg; goPlayer(gx, gz, Math.hypot(gx - player.x, gz - player.z) > 20); marker = { x: gx, z: gz, t: 0 }; }
}
let marker = null;
const keys = new Set();
addEventListener("keydown", e => { if (!started) return; if (e.target && (e.target.tagName === "INPUT")) return;
  if (!$("guide").classList.contains("gone")) { if (e.key === "Escape") $("guide").classList.add("gone"); return; }
  const k = e.key.toLowerCase(); keys.add(k);
  if (e.key === "Escape") { toggleRadio(false); togglePlaces(false); togglePass(false); hideInfo(); if (calm) setCalm(false); }
  else if (k === "1") playerAct("sip"); else if (k === "2") playerAct("seed"); else if (k === "3") playerAct("nod"); else if (k === "4") setCalm(!calm);
  else if (k === "m") toggleRadio(); else if (k === "g") togglePlaces(); else if (k === "p") togglePass();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault(); });
addEventListener("keyup", e => keys.delete(e.key.toLowerCase()));
addEventListener("blur", () => keys.clear());
const pts = new Map(); let pinch = 0, downInfo = null;
cv.addEventListener("pointerdown", e => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); if (pts.size === 1) downInfo = { x: e.clientX, y: e.clientY, moved: false, t: performance.now() }; else { downInfo && (downInfo.moved = true); const a = [...pts.values()]; pinch = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]); } });
cv.addEventListener("pointermove", e => { if (!pts.has(e.pointerId)) return; const prev = pts.get(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
  if (pts.size === 2) { const a = [...pts.values()], d = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]); if (pinch) cam.dist = clamp(cam.dist * pinch / d, 1.5, 40); pinch = d; return; }
  const dx = e.clientX - prev[0], dy = e.clientY - prev[1]; if (downInfo && Math.hypot(e.clientX - downInfo.x, e.clientY - downInfo.y) > 7) downInfo.moved = true;
  if (downInfo && downInfo.moved) { cam.yaw -= dx * .006; cam.pitch = clamp(cam.pitch + dy * .005, -.15, 1.35); if (calm) setCalm(false); } });
const pend = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = 0; if (pts.size === 0 && downInfo && !downInfo.moved && started && e.type === "pointerup") {
    if (calm) { setCalm(false); downInfo = null; return; } if ($("radio").classList.contains("show") || $("places").classList.contains("show") || $("passport").classList.contains("show")) { toggleRadio(false); togglePlaces(false); togglePass(false); downInfo = null; return; }
    pick3D(e.clientX * dpr, e.clientY * dpr); } if (pts.size === 0) downInfo = null; };
cv.addEventListener("pointerup", pend); cv.addEventListener("pointercancel", pend);
cv.addEventListener("wheel", e => { e.preventDefault(); cam.dist = clamp(cam.dist * Math.exp(e.deltaY * .0012), 1.5, 40); }, { passive: false });

/* ---------- Bắt đầu ---------- */
let started = false, readied = false;
function begin(online) { Snd.init(); $("intro").classList.add("gone"); $("loadText").textContent = online ? "Đang tìm quán còn ghế…" : "Cô bán hàng đang lau ghế…"; $("loading").classList.remove("gone");
  player = makePerson("me", myNameIdx, myLook); player.x = 70 + Math.random() * 4; player.z = -5.2; player.face = Math.PI * .5; $("myName").textContent = player.name;
  cam.target = [player.x, 1.4, player.z]; started = true;
  if (online) { mode = "connecting"; net.want = true; connect(); } else setTimeout(() => goOffline(), 700); }
function ready() { if (readied) return; readied = true; $("loading").classList.add("gone"); $("hud").classList.remove("hidden"); setMode();
  setTimeout(() => { if (!$("toast").classList.contains("show")) say("Chạm ghế nhựa để ngồi · Mở “Hộ chiếu” và ghé đủ 7 địa danh · Đeo tai nghe để nghe âm thanh 3D"); }, 1500);
  setTimeout(() => { if (!Radio.now) say("Bấm ♫ Nhạc để mở đài phố cổ."); }, 14000); }
$("startOnline").addEventListener("click", () => begin(true)); $("startSolo").addEventListener("click", () => begin(false));

/* ---------- Xe cộ & gánh hàng ---------- */
const vehicles = []; let tram = null; const walkers = [];
function spawnVehicle(anywhere) {
  const dir = Math.random() < .5 ? 1 : -1, r = Math.random(), type = r < .7 ? "moto" : r < .85 ? "cyclo" : "bike";
  const cx = cam.target[0]; let x = anywhere ? cx + (Math.random() - .5) * 120 : cx - dir * (75 + Math.random() * 25); x = clamp(x, -70, 203);
  const v = { type, dir, x, lane: dir * (1.5 + Math.random() * 1.6), speed: type === "moto" ? 6 + Math.random() * 4 : type === "cyclo" ? 2.4 : 3.6, v: 0, seed: Math.random(), phase: 0,
    color: hex(pick(["#c8382f", "#1f1f1f", "#e8e8e8", "#2f74c0", "#7a7f87", "#8a2a3a", "#d9d2c0"])), cargo: pick(["none", "none", "none", "boxes", "flowers", "gas"]),
    rider: lookOf(randLook()), pass: null, hood: hex(pick(["#2f4a3a", "#7a2a22", "#2b3550"])) };
  v.v = v.speed; if (type === "moto") { v.rider.hat = "helmet"; v.rider.helmet = hex(pick(["#f2c230", "#c8382f", "#ffffff", "#2f74c0", "#222222", "#e98fb0"])); if (Math.random() < .35 && v.cargo === "none") { v.pass = lookOf(randLook()); v.pass.hat = "helmet"; v.pass.helmet = hex(pick(["#ffffff", "#f2c230", "#e98fb0"])); } }
  if (type === "cyclo") { v.rider.hat = "non"; v.pass = lookOf(randLook()); v.pass.hat = Math.random() < .5 ? "cap" : "none"; }
  if (type === "bike") { v.rider.hat = "non"; v.rider.shirt = hex(pick(["#f2f2ee", "#e8d9b0", "#c96b8a"])); }
  vehicles.push(v); if (type !== "moto" && Math.random() < .5 && started) setTimeout(() => Snd.ringAt([v.x, 1, v.lane], .8), 400);
}
function spawnWalker() { const dir = Math.random() < .5 ? 1 : -1, p = makePerson("extra", [0, 0], randLook()); p.look.hat = "non"; p.look.shirt = hex(pick(["#e8d9b0", "#b7c4cf", "#c96b8a", "#f2f2ee"]));
  p.x = cam.target[0] - dir * 60; p.z = (dir > 0 ? 1 : -1) * 3.3; p.face = dir > 0 ? Math.PI / 2 : -Math.PI / 2; p.dir = dir; p.state = "walk"; p.carry = pick(["hoa", "qua", "banhmi", "xoi", "banhmi"]); p.raoT = 1 + Math.random() * 4; walkers.push(p); }
function spawnTram() { const dir = Math.random() < .5 ? 1 : -1; tram = { dir, x: clamp(cam.target[0] - dir * 90, -70, 200), v: 4.2, rang: false }; }

/* ---------- Môi trường ---------- */
function phase() { const m = TIMES[timeMode]; if (m !== "auto") return m; const h = new Date().getHours(); return h >= 5 && h < 11 ? "sang" : h >= 11 && h < 17 ? "chieu" : "toi"; }
const N3 = v => { const l = Math.hypot(...v); return v.map(x => x / l); };
const PRESET = {
  sang: { sun: N3([-.55, .62, .56]), sunC: [3.0, 2.75, 2.35], sky: [.42, .52, .7], gnd: [.26, .23, .2], fog: [.62, .7, .8], fogD: .0048, zen: [.22, .42, .85], hor: [.78, .84, .9], expo: .82, night: 0, cloud: .35 },
  chieu: { sun: N3([.72, .34, .6]), sunC: [3.4, 2.2, 1.25], sky: [.45, .42, .5], gnd: [.3, .22, .16], fog: [.86, .64, .47], fogD: .0052, zen: [.26, .36, .72], hor: [1.05, .72, .46], expo: .8, night: 0, cloud: .45 },
  toi: { sun: N3([-.35, .8, .45]), sunC: [.09, .1, .17], sky: [.05, .055, .09], gnd: [.03, .026, .022], fog: [.025, .03, .05], fogD: .011, zen: [.004, .006, .02], hor: [.045, .045, .08], expo: 1.25, night: 1, cloud: .3 }
};
let env = null;
function makeEnv(t) {
  const P = PRESET[phase()], rain = wet;
  const mixv = (a, b, k) => a.map((x, i) => x + (b[i] - x) * k);
  const grayFog = P.night ? [.04, .045, .06] : [.5, .53, .57], graySky = P.night ? [.03, .035, .05] : [.34, .36, .4];
  const e = { sunDir: P.sun, sunC: P.sunC.map(x => x * (1 - .75 * rain)), sky: mixv(P.sky, graySky, rain * .8), gnd: P.gnd, fog: mixv(P.fog, grayFog, rain * .85), fogD: P.fogD * (1 + rain * 1.6),
    zen: mixv(P.zen, graySky, rain * .9), hor: mixv(P.hor, grayFog, rain * .9), expo: P.expo, night: P.night, cloud: lerp(P.cloud, 1, rain), wet: rain, wind: 1 + rain, time: t, shadows: quality === "high", shadowSize: 42, lights: [] };
  const ac = x => { x *= e.expo; return Math.pow(Math.min(1, (x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14)), 1 / 2.2); };
  e.fogOut = e.fog.map(ac);
  if (P.night || rain > .5) { const t2 = cam.target, Ls = W.lights.map(l => [l, (l.p[0] - t2[0]) ** 2 + (l.p[2] - t2[2]) ** 2]).sort((a, b) => a[1] - b[1]).slice(0, 16).map(a => a[0]);
    const k = P.night ? 1 : .25; e.lights = Ls.map(l => ({ p: l.p, r: l.r, c: l.c.map(x => x * k) })); }
  return e;
}

/* ---------- Cập nhật ---------- */
let engT = 0, spawnT = 3, vehT = .5, honkT = 8, lineT = 55, walkT = 6, tramT = 25, goT = 0;
function stepPerson(p, dt) {
  if (p.state === "walk") { const tg = p.path[0]; if (!tg) { p.state = p.leaving ? "gone" : (p.stool ? "sit" : "stand"); return; }
    const dx = tg.x - p.x, dz = tg.z - p.z, d = Math.hypot(dx, dz), sp = (p.fast ? 5.2 : (p === player ? 2.2 : p.speed)) * dt;
    p.phase += dt * (p.fast ? 13 : 8.5); const want = Math.atan2(dx, dz); let df = want - p.face; df = Math.atan2(Math.sin(df), Math.cos(df)); p.face += df * Math.min(1, dt * 10);
    if (d <= sp) { p.x = tg.x; p.z = tg.z; p.path.shift();
      if (!p.path.length) { if (p.leaving) p.state = "gone"; else if (p.stool && p.stool.occ === p) { p.state = "sit"; p.face = p.stool.face;
          if (p === player && pendingAct) { const a = pendingAct; pendingAct = null; setTimeout(() => { if (doAction(player, a) && mode === "online") wsSend({ t: "act", a }); }, 300); } }
        else { p.state = "stand"; p.fast = false; } } }
    else { p.x += dx / d * sp; p.z += dz / d * sp; } }
  if (p.action) { p.action.t += dt; const a = p.action; if (!a.fired && a.t >= DUR[a.type] * .55) { a.fired = true; fireAction(p, a.type); } if (a.t >= DUR[a.type]) p.action = null; }
  if (p.kind === "npc" && p.state === "sit") { p.timer += dt; p.next -= dt;
    if (p.next <= 0) { p.next = 3 + Math.random() * 6; const r = Math.random(); doAction(p, r < .45 && p.cup > .01 ? "sip" : r < .85 ? "seed" : "nod"); }
    if ((p.timer > p.stay || npcs.filter(n => n.kind === "npc" && !n.leaving).length > npcTarget() + 1) && !p.action) evictNPC(p); }
}
function update(dt, t) {
  // điều khiển bằng phím WASD
  if (player && started) { let fx = 0, fz = 0; if (keys.has("w") || keys.has("arrowup")) fz -= 1; if (keys.has("s") || keys.has("arrowdown")) fz += 1; if (keys.has("a")) fx -= 1; if (keys.has("d")) fx += 1;
    if (keys.has("arrowleft")) cam.yaw += dt * 1.6; if (keys.has("arrowright")) cam.yaw -= dt * 1.6;
    if (fx || fz) { standUp(player); const sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw), mx = fz * sy + fx * cy, mz = fz * cy - fx * sy, l = Math.hypot(mx, mz), run = keys.has("shift"), sp = (run ? 5.2 : 2.4) * dt;
      const [nx, nz] = clampWalk(player.x + mx / l * sp, player.z + mz / l * sp); player.x = nx; player.z = nz; player.state = "walkkey"; player.path = []; player.phase += dt * (run ? 13 : 8.5);
      let df = Math.atan2(mx, mz) - player.face; df = Math.atan2(Math.sin(df), Math.cos(df)); player.face += df * Math.min(1, dt * 12);
      goT -= dt; if (goT <= 0 && mode === "online") { goT = .5; wsSend({ t: "go", x: Math.round(player.x * 10) / 10, z: Math.round(player.z * 10) / 10 }); } }
    else if (player.state === "walkkey") { player.state = "stand"; if (mode === "online") wsSend({ t: "go", x: Math.round(player.x * 10) / 10, z: Math.round(player.z * 10) / 10 }); } }
  allPeople().forEach(p => stepPerson(p, dt)); if (player && player.state === "sit") stats.sat += dt;
  for (let i = npcs.length - 1; i >= 0; i--) if (npcs[i].state === "gone") npcs.splice(i, 1);
  spawnT -= dt; if (spawnT <= 0) { spawnT = 8 + Math.random() * 12; if (npcs.filter(n => n.kind === "npc" && !n.leaving).length < npcTarget()) spawnNPC(); }
  // xe
  vehT -= dt; if (vehT <= 0) { vehT = .7 + Math.random() * 1.6; if (vehicles.length < 26) spawnVehicle(false); }
  for (const v of vehicles) { let target = v.speed;
    for (const p of [player, ...remotes.values(), ...officers]) { if (!p) continue; const ahead = (p.x - v.x) * v.dir; if (ahead > 0 && ahead < 7 && Math.abs(p.z - v.lane) < 1.1) { target = Math.min(target, 1); if (!v.honked && p === player) { v.honked = true; Snd.honkAt([v.x, 1, v.lane], 1.2); } } }
    v.v = lerp(v.v, target, dt * 2); v.x += v.v * v.dir * dt; v.phase += dt * v.v * 2.2; }
  for (let i = vehicles.length - 1; i >= 0; i--) { const v = vehicles[i]; if (v.x < -72 || v.x > 204 || Math.abs(v.x - cam.target[0]) > 130) vehicles.splice(i, 1); }
  walkT -= dt; if (walkT <= 0) { walkT = 14 + Math.random() * 20; if (walkers.length < 4) spawnWalker(); }
  walkers.forEach(w => { w.x += w.dir * 1.05 * dt; w.phase += dt * 6.5; w.raoT -= dt;
    if (w.raoT <= 0) { w.raoT = 8 + Math.random() * 7; const r = RAO[w.carry]; if (r && started && Snd.dist([w.x, 0, w.z]) < 45) { Snd.voiceAt([w.x, 1.6, w.z], r.sy, { vol: .6, vib: 6 }); bubble(w, r.txt, 3.6); } } }); for (let i = walkers.length - 1; i >= 0; i--) if (Math.abs(walkers[i].x - cam.target[0]) > 90 || walkers[i].x > 203) walkers.splice(i, 1);
  tramT -= dt; if (!tram && tramT <= 0) { spawnTram(); tramT = 50 + Math.random() * 50; }
  if (tram) { tram.x += tram.v * tram.dir * dt; const d = Math.abs(tram.x - cam.target[0]); if (!tram.rang && d < 60) { tram.rang = true; if (started) Snd.tramAt([tram.x + tram.dir * 4.8, 2.6, 0]); } if (tram.x < -75 || tram.x > 204 || d > 140) tram = null; }
  if (started) { honkT -= dt; if (honkT <= 0) { honkT = 6 + Math.random() * 16; const near = vehicles.filter(v => Math.abs(v.x - Snd.lis[0]) < 60); if (near.length) { const v = pick(near); v.type === "moto" ? Snd.honkAt([v.x, 1, v.lane], 1) : Snd.ringAt([v.x, 1, v.lane], 1); } } }
  // công an phường, dân phòng, trật tự vỉa hè
  officers.forEach(o => stepPerson(o, dt)); if (officers.length) { patrolStep(dt); orderStep(dt); roadStep(dt); }
  { const k = order.k * order.k * (3 - 2 * order.k); for (const s of W.stools) { s.x = lerp(s.bx, s.cx, k); s.z = lerp(s.bz, s.cz, k); s.face = Math.atan2(W.stall.x - s.x, W.stall.z - s.z);
      if (s.occ && s.occ.state === "sit") { s.occ.x = s.x; s.occ.z = s.z; s.occ.face = s.face; } } }
  if (player && readied) Passport.check(player.x, player.z, dt);
  engT -= dt; if (engT <= 0 && started) { engT = .1; const L = Snd.lis, d2 = v => (v.x - L[0]) ** 2 + (v.lane - L[2]) ** 2;
    const list = vehicles.filter(v => Math.abs(v.x - L[0]) < 50).sort((a, b) => d2(a) - d2(b)).slice(0, 5).map(v => ({ p: [v.x, .7, v.lane], v: v.v, moto: v.type === "moto" }));
    Snd.updateEngines(list, tram ? [tram.x, 1.2, 0] : null); Snd.zoneTick(.1, crowdCount(), phase() === "sang"); }
  bubbles = bubbles.filter(b => b.until > performance.now() / 1000);
  // rót trà
  if (seller.pour > 0) { seller.pour += dt / 1.6; if (seller.pour >= 1) { seller.pour = 0; seller.action = null; const p = seller.queue.shift(); if (p && p.state === "sit") { p.cup = 1;
      if (p === player) { stats.cups++; stats.totalCups++; store.set("tdvh_cups", stats.totalCups); if (stats.cups % 5 === 0) say(stats.cups + " cốc rồi. Cô nhớ mặt bạn rồi đấy."); } } } }
  else if (seller.queue.length) { seller.pour = .001; if (seller.queue[0] === player || Math.random() < .3) Snd.pourAt([W.stall.x, 1, W.stall.z]); }
  for (let i = shellsFalling.length - 1; i >= 0; i--) { const s = shellsFalling[i]; s.vy -= 9 * dt; s.x += s.vx * dt; s.z += s.vz * dt; s.y += s.vy * dt; if (s.y <= WALK_Y + .01) { s.y = WALK_Y + .01; s.s.shells.push([s.x, s.z, s.ry]); if (s.s.shells.length > 60) s.s.shells.shift(); shellsFalling.splice(i, 1); } }
  wet = lerp(wet, raining ? 1 : 0, dt * .25);
  if (readied && player && player.state === "sit") { lineT -= dt; if (lineT <= 0) { lineT = 55 + Math.random() * 40; say(pick(LINES)); } }
  if (marker) { marker.t += dt; if (marker.t > 1.2) marker = null; }
}

/* ---------- Công an phường & dân phòng ---------- */
const UNI = {
  ca: { shirt: hex("#64713f"), pants: hex("#2f3a26"), skin: SKINS[1], hair: HAIRS[0], hat: "kepi", hatC: hex("#55633a"), board: hex("#b3261e"), badge: hex("#e6c34a"), belt: hex("#3a2a1c"), sleeve: "long" },
  dp: { shirt: hex("#2f6fb0"), pants: hex("#24324a"), skin: SKINS[0], hair: HAIRS[0], hat: "dpcap", hatC: hex("#24508a"), band: hex("#c62828"), belt: hex("#222222") }
};
const MSG1 = "Quán đang đông khách. Đề nghị bà con kê ghế gọn vào phía trong, chừa lối đi cho người đi bộ, không lấn ra lòng đường. Xin cảm ơn!";
const MSG2 = "Quán vẫn đông, bà con nhớ giữ lối đi thông thoáng giúp nhé. Cảm ơn bà con!";
const MEGA_SY = [["u", 200, 205, .22], ["i", 205, 200, .24], ["u", 200, 205, .22], ["i", 205, 185, .36], ["ê", 190, 192, .2], ["i", 195, 190, .2], ["a", 200, 200, .2], ["o", 190, 190, .22], ["ê", 200, 195, .2], ["ê", 195, 195, .2], ["o", 190, 192, .2], ["a", 186, 170, .45]];
const THANK_SY = [["a", 230, 240, .2], ["ơ", 240, 230, .22], ["a", 225, 225, .2], ["o", 220, 220, .2], ["o", 225, 200, .4]];
const ROAD_SY = [["a", 240, 250, .2], ["ơ", 250, 280, .28], ["i", 230, 230, .2], ["ê", 240, 240, .2], ["i", 230, 230, .2], ["a", 240, 210, .4]];
const RAO = {
  banhmi: { txt: "Ai bánh mì nóng giòn đây…", sy: [["a", 230, 240, .32], ["a", 265, 300, .3], ["i", 250, 205, .28], ["o", 240, 240, .28], ["o", 220, 205, .28], ["ơ", 265, 205, 1.1]] },
  xoi: { txt: "Xôi lạc, xôi ngô nóng đây…", sy: [["o", 240, 240, .28], ["a", 215, 185, .3], ["o", 240, 240, .28], ["o", 235, 230, .28], ["o", 245, 245, .28], ["ơ", 260, 205, 1.0]] },
  hoa: { txt: "Hoa tươi đây… ai mua hoa không?", sy: [["o", 230, 240, .3], ["ư", 240, 240, .28], ["ơ", 255, 210, .7], ["a", 230, 240, .25], ["u", 225, 225, .25], ["o", 230, 240, .28], ["o", 250, 285, .6]] },
  qua: { txt: "Cam, quýt ngọt đây…", sy: [["a", 240, 245, .32], ["i", 270, 300, .32], ["o", 215, 190, .3], ["ơ", 265, 205, 1.0]] }
};
let officers = [], bubbles = [], roadT = 0, roadCd = 10;
const order = { st: "idle", t: 0, cd: 25, k: 0, tgt: 0, low: 0, glow: 0, again: false };
const ROUTE = [[14, 4.9], [196, 4.9], [196, -4.35], [14, -4.35]];
function bubble(who, text, dur) { bubbles = bubbles.filter(b => b.who !== who); bubbles.push({ who, text, until: performance.now() / 1000 + dur }); }
function crowdCount() { return W.stools.filter(s => s.occ).length; }
function makeOfficers() {
  const ca = makePerson("officer", [0, 0], randLook()), dp = makePerson("officer", [0, 0], randLook());
  ca.look = UNI.ca; ca.name = "Công an phường"; ca.role = "ca"; dp.look = UNI.dp; dp.name = "Dân phòng"; dp.role = "dp";
  ca.x = 40; ca.z = 4.9; ca.wp = 1; dp.x = 38.9; dp.z = 4.9; officers = [ca, dp];
}
function patrolStep(dt) {
  const [ca, dp] = officers; if (order.st !== "idle") return;
  if (ca.state !== "walk") { const w = ROUTE[ca.wp]; ca.wp = (ca.wp + 1) % ROUTE.length; ca.speed = 1.05; ca.path = [{ x: w[0], z: w[1] }]; ca.state = "walk"; ca.hold = null; }
  const dx = ca.x - dp.x, dz = ca.z - dp.z, d = Math.hypot(dx, dz);
  if (d > 1.3) { dp.path = [{ x: ca.x - dx / d * 1.1, z: ca.z - dz / d * 1.1 }]; dp.state = "walk"; dp.speed = d > 3 ? 2.2 : 1.15; }
}
function orderStep(dt) {
  const n = crowdCount(), [ca, dp] = officers; order.cd -= dt;
  if (order.st === "idle" && n >= 10 && order.cd <= 0) {
    order.st = "coming"; order.t = 0; order.again = order.tgt === 1; const sx = W.stall.x;
    for (const o of officers) if (Math.abs(o.x - sx) > 24) { o.x = sx + (o.x < sx ? -22 : 22) + (o === dp ? -1 : 0); o.z = -4.35; o.path = []; }
    ca.path = [{ x: ca.x, z: -4.35 }, { x: sx - .7, z: -4.3 }]; dp.path = [{ x: dp.x, z: -4.35 }, { x: sx + .9, z: -4.3 }];
    ca.state = dp.state = "walk"; ca.speed = dp.speed = 2.3; ca.fast = dp.fast = false;
  }
  if (order.st === "coming") { order.t += dt;
    if (order.t > 45) { ca.x = W.stall.x - .7; dp.x = W.stall.x + .9; ca.z = dp.z = -4.3; ca.state = dp.state = "stand"; ca.path = []; dp.path = []; }
    if (ca.state === "stand" && dp.state === "stand") { order.st = "announce"; order.t = 0; ca.face = dp.face = Math.PI; ca.hold = "loa";
      bubble(ca, "Thông báo: " + (order.again ? MSG2 : MSG1), 9); Snd.voiceAt([ca.x, 1.7, ca.z], MEGA_SY, { mega: true, vol: .8, ref: 5, vib: 2 });
      if (player && Math.hypot(player.x - ca.x, player.z - ca.z) < 45) showNotice(order.again); } }
  if (order.st === "announce") { order.t += dt;
    if (!order.again && order.t > 16) compact("seller");
    if (order.again && order.t > 9) { hideNotice(); thanks(); } }
  if (order.st === "thanks") { order.t += dt; if (order.t > 3.5) { order.st = "idle"; order.cd = 240; ca.hold = null; } }
  if (order.tgt === 1) { if (n <= 6) order.low += dt; else order.low = 0; if (order.low > 90) { order.tgt = 0; order.low = 0; } }
  order.k += clamp(order.tgt - order.k, -dt / 1.6, dt / 1.6); if (order.glow > 0) order.glow -= dt;
}
function compact(by) {
  if (order.tgt === 1 && order.st !== "announce") return; order.tgt = 1; order.glow = 5; hideNotice();
  if (by === "player") { say("Cảm ơn bạn! Vỉa hè đã thông thoáng."); Passport.award("vanminh"); } else say("Cô bán hàng kê gọn ghế vào sát tường, chừa lối đi cho người đi bộ.");
  if (order.st === "announce") thanks();
}
function thanks() { const [ca, dp] = officers; order.st = "thanks"; order.t = 0; ca.hold = null; bubble(dp, "Cảm ơn bà con đã hợp tác!", 3.5); Snd.voiceAt([dp.x, 1.7, dp.z], THANK_SY, { vol: .5 }); }
function roadStep(dt) {
  roadCd -= dt; if (!player || !readied) return;
  if (player.x < 203 && Math.abs(player.z) < 3.8 && player.state !== "sit") roadT += dt; else roadT = 0;
  if (roadT > 5 && roadCd <= 0) { const o = officers.find(q => Math.hypot(q.x - player.x, q.z - player.z) < 25);
    if (o) { roadCd = 45; bubble(o, "Bạn ơi, đi lên vỉa hè cho an toàn nhé!", 4); Snd.voiceAt([o.x, 1.7, o.z], ROAD_SY, { vol: .5 }); } }
}
function showNotice(again) { $("noticeText").textContent = again ? MSG2 : MSG1; $("nYes").textContent = again ? "Đã rõ, cảm ơn anh!" : "Kê ghế gọn lại"; $("nLater").hidden = !!again; hideInfo(); $("notice").classList.add("show"); }
function hideNotice() { $("notice").classList.remove("show"); }
$("nYes").addEventListener("click", () => { if (order.again) { hideNotice(); if (order.st === "announce") thanks(); } else compact("player"); });
$("nLater").addEventListener("click", () => { hideNotice(); compact("seller"); });

/* ---------- Vẽ ---------- */
const parts = new Parts();
function drawPerson(p, t) {
  parts.a.length = 0;
  let pose = p.state === "sit" ? "sit" : (p.state === "walk" || p.state === "walkkey") ? "walk" : "stand";
  const act = p.action ? { type: p.action.type, k: p.action.t / DUR[p.action.type] } : null;
  const nod = act && act.type === "nod" ? Math.abs(Math.sin(act.k * Math.PI * 2)) : 0;
  personParts(parts, { look: p.look, pose, phase: p.phase, act, nod, hold: p.hold || (pose === "sit" ? "cup" : null), cup: p.cup, carry: p.carry, t, seed: p.seed, lookUp: calm && p === player ? 1 : 0 });
  const gy = groundY(p.x, p.z); parts.emit(R, M4.trs(p.x, gy, p.z, p.face, 1, 1, 1));
  if (p === player || p.kind === "real") R.inst("cyl", M4.trs(p.x, gy + .005, p.z, 0, .9, .01, .9), p === player ? [1, .85, .4] : [.5, .9, .55], env.night ? .6 : .3);
}
function drawVehicle(v, night) {
  parts.a.length = 0;
  if (v.type === "moto") motoParts(parts, v, night); else if (v.type === "cyclo") cycloParts(parts, v, night); else bikeParts(parts, v);
  let lane = v.lane; if (Math.abs(v.x) < 6) lane *= .45;
  const Wm = M4.trs(v.x, 0, lane, v.dir > 0 ? Math.PI / 2 : -Math.PI / 2, 1, 1, 1); parts.emit(R, Wm);
  for (const r of vehicleRiders(v)) { parts.a.length = 0; personParts(parts, { look: r.look, pose: r.pose, phase: v.phase, act: null }); parts.emit(R, mm(Wm, T(r.dx, r.dy, r.dz))); }
  if (night && v.type === "moto") { const p = M4.tp(Wm, 0, .98, .62); glows.push(p[0], p[1], p[2], 1, .95, .8, 2.2); const q = M4.tp(Wm, 0, .62, -.68); glows.push(q[0], q[1], q[2], 1, .15, .1, .9); }
}
let glows = []; const stoolCache = {};
const rainBuf = new Float32Array(900 * 6); let rainInit = false;
function drawRain(dt) { if (wet < .05) return null; const c = cam.eye, n = Math.floor(900 * clamp(wet, 0, 1));
  if (!rainInit) { for (let i = 0; i < 900; i++) { rainBuf[i * 6] = c[0] + (Math.random() - .5) * 30; rainBuf[i * 6 + 1] = Math.random() * 14; rainBuf[i * 6 + 2] = c[2] + (Math.random() - .5) * 30; } rainInit = true; }
  for (let i = 0; i < n; i++) { const o = i * 6; rainBuf[o + 1] -= 11 * dt; rainBuf[o] += .6 * dt;
    if (rainBuf[o + 1] < 0 || Math.abs(rainBuf[o] - c[0]) > 16 || Math.abs(rainBuf[o + 2] - c[2]) > 16) { rainBuf[o] = c[0] + (Math.random() - .5) * 30; rainBuf[o + 1] = 6 + Math.random() * 10; rainBuf[o + 2] = c[2] + (Math.random() - .5) * 30; }
    rainBuf[o + 3] = rainBuf[o] - .03; rainBuf[o + 4] = rainBuf[o + 1] + .45; rainBuf[o + 5] = rainBuf[o + 2]; }
  return rainBuf.subarray(0, n * 6); }
function drawLabels() {
  lctx.clearRect(0, 0, lbl.width, lbl.height); if (!readied) return;
  const fs = Math.round(12 * dpr); lctx.textAlign = "center"; lctx.textBaseline = "middle";
  const rr = (x, y, w, h, r) => { lctx.beginPath(); lctx.moveTo(x + r, y); lctx.arcTo(x + w, y, x + w, y + h, r); lctx.arcTo(x + w, y + h, x, y + h, r); lctx.arcTo(x, y + h, x, y, r); lctx.arcTo(x, y, x + w, y, r); lctx.closePath(); };
  if (!calm) for (const [n, x, z] of W.places) { const d = Math.hypot(x - cam.target[0], z - cam.target[2]); if (d > 60 || d < 4) continue; const p = project(x, 5.2, z); if (!p) continue;
    lctx.globalAlpha = clamp((60 - d) / 20, 0, 1) * .9; lctx.font = "700 " + Math.round(13 * dpr) + "px Georgia, serif"; const w = lctx.measureText(n).width + 18 * dpr;
    lctx.fillStyle = "rgba(155,44,36,.92)"; rr(p[0] - w / 2, p[1] - 12 * dpr, w, 24 * dpr, 12 * dpr); lctx.fill(); lctx.fillStyle = "#fff"; lctx.fillText(n, p[0], p[1] + dpr); }
  for (const p of allPeople()) { if (p.kind === "ghost") continue; let a = 1;
    const d = Math.hypot(p.x - cam.target[0], p.z - cam.target[2]); if (p.kind === "npc") { a = clamp((7 - d) / 3, 0, 1) * .75; if (p.action && p.action.type === "nod" && d < 12) a = .75; if (a <= 0) continue; } else a = clamp((40 - d) / 10, 0, 1); if (a <= 0) continue;
    const hy = groundY(p.x, p.z) + (p.state === "sit" ? 1.32 : 1.95); const pr = project(p.x, hy, p.z); if (!pr) continue;
    const txt = (p.kind === "real" ? "● " : "") + p.name; lctx.font = (p === player ? "700 " : "600 ") + (p === player ? fs + 1 : fs - 1) + "px system-ui, sans-serif";
    const w = lctx.measureText(txt).width + 14 * dpr, h = 20 * dpr; lctx.globalAlpha = a;
    lctx.fillStyle = p === player ? "rgba(255,226,150,.96)" : p.kind === "real" ? "rgba(214,238,206,.95)" : "rgba(255,255,255,.85)"; rr(pr[0] - w / 2, pr[1] - h / 2, w, h, h / 2); lctx.fill();
    lctx.fillStyle = "#2b2420"; lctx.fillText(txt, pr[0], pr[1] + dpr); }
  for (const o of officers) { const d = Math.hypot(o.x - cam.target[0], o.z - cam.target[2]); const a = clamp((35 - d) / 10, 0, 1); if (a <= 0) continue;
    const pr = project(o.x, groundY(o.x, o.z) + 2.05, o.z); if (!pr) continue; const txt = (o.role === "ca" ? "★ " : "") + o.name; lctx.font = "700 " + (fs - 1) + "px system-ui, sans-serif";
    const w = lctx.measureText(txt).width + 14 * dpr, h = 20 * dpr; lctx.globalAlpha = a; lctx.fillStyle = o.role === "ca" ? "rgba(85,99,58,.95)" : "rgba(36,80,138,.95)"; rr(pr[0] - w / 2, pr[1] - h / 2, w, h, h / 2); lctx.fill();
    lctx.fillStyle = "#fff"; lctx.fillText(txt, pr[0], pr[1] + dpr); }
  lctx.globalAlpha = 1;
  for (const b of bubbles) { const p = b.who, d = Math.hypot(p.x - cam.target[0], p.z - cam.target[2]); if (d > 45) continue;
    const pr = project(p.x, groundY(p.x, p.z) + (p.state === "sit" ? 1.6 : 2.45), p.z); if (!pr) continue;
    lctx.font = "600 " + (fs) + "px system-ui, sans-serif"; const maxW = 240 * dpr, words = b.text.split(" "), lines = []; let ln = "";
    for (const wd of words) { const tst = ln ? ln + " " + wd : wd; if (lctx.measureText(tst).width > maxW && ln) { lines.push(ln); ln = wd; } else ln = tst; } if (ln) lines.push(ln);
    const lh = fs * 1.3, bw = Math.max(...lines.map(l => lctx.measureText(l).width)) + 22 * dpr, bh = lines.length * lh + 14 * dpr, bx = clamp(pr[0] - bw / 2, 6, lbl.width - bw - 6), by = pr[1] - bh - 10 * dpr;
    const off = p.role ? "#eef4ff" : "#fffaf0"; lctx.fillStyle = off; lctx.strokeStyle = p.role === "ca" ? "#55633a" : p.role === "dp" ? "#24508a" : "#b98a52"; lctx.lineWidth = 2 * dpr;
    rr(bx, by, bw, bh, 10 * dpr); lctx.fill(); lctx.stroke(); lctx.beginPath(); lctx.moveTo(pr[0] - 7 * dpr, by + bh - 1); lctx.lineTo(pr[0], by + bh + 9 * dpr); lctx.lineTo(pr[0] + 7 * dpr, by + bh - 1); lctx.closePath(); lctx.fill();
    lctx.fillStyle = "#2a2320"; lines.forEach((l, i) => lctx.fillText(l, bx + bw / 2, by + 7 * dpr + lh * (i + .5))); }
}
function render(dt, t) {
  env = makeEnv(t); updateCam(dt);
  const night = env.night > .5; glows = []; if (night || wet > .5) for (const g of W.glows) { if (Math.abs(g[0] - cam.target[0]) < 120) glows.push(...g); }
  const near = x => Math.abs(x - cam.target[0]) < 110;
  for (const p of allPeople()) if (near(p.x)) drawPerson(p, t);
  for (const e of extras) if (near(e.x)) drawPerson(e, t);
  for (const w of walkers) drawPerson(w, t);
  for (const o of officers) if (near(o.x)) drawPerson(o, t);
  for (const s of W.stools) { const key = s.color.join(); if (!stoolCache[key]) { const P = new Parts(); stoolParts(P, s.color); stoolCache[key] = P; } stoolCache[key].emit(R, M4.trs(s.x, WALK_Y, s.z, s.face, 1, 1, 1)); }
  if (order.glow > 0) R.inst("box", M4.trs(W.stall.x, WALK_Y + .004, -4.95, 0, 10, .006, 1.4), [.3, .85, .5], (.5 + .5 * Math.sin(t * 6)) * Math.min(1, order.glow / 1.5) * .5);
  if (player) Snd.setListener([player.x, groundY(player.x, player.z) + (player.state === "sit" ? 1.1 : 1.6), player.z], [-Math.sin(cam.yaw), 0, -Math.cos(cam.yaw)]);
  // người bán hàng
  seller.action = seller.pour > 0 ? { type: "pour", t: seller.pour * 1.6 } : null; parts.a.length = 0;
  personParts(parts, { look: seller.look, pose: "sit", phase: 0, act: seller.pour > 0 ? { type: "pour", k: seller.pour } : null, hold: "pour" }); parts.emit(R, M4.trs(seller.x, WALK_Y, seller.z, seller.face, 1, 1, 1));
  for (const v of vehicles) drawVehicle(v, night);
  if (tram) { parts.a.length = 0; tramParts(parts, tram, night); parts.emit(R, M4.trs(tram.x, 0, 0, tram.dir > 0 ? Math.PI / 2 : -Math.PI / 2, 1, 1, 1)); if (night) { glows.push(tram.x + 4.9 * tram.dir, 1, .7, 1, .95, .8, 3, tram.x + 4.9 * tram.dir, 1, -.7, 1, .95, .8, 3); } }
  for (const s of W.stools) for (const sh of s.shells) R.inst("box", M4.trs(sh[0], WALK_Y + .008, sh[1], sh[2], .012, .006, .006), [.17, .15, .13]);
  for (const s of shellsFalling) R.inst("box", M4.trs(s.x, s.y, s.z, s.ry, .012, .006, .006), [.17, .15, .13]);
  if (marker) { const k = marker.t / 1.2; R.inst("cyl", M4.trs(marker.x, groundY(marker.x, marker.z) + .01, marker.z, 0, .3 + k * .5, .01, .3 + k * .5), [1, .85, .4], 1 - k); }
  R.render(cam, env, glows.length ? new Float32Array(glows) : null, drawRain(dt));
  drawLabels();
}

let hudT = 0;
function refreshHUD() { if (mode === "online") setMode();
  $("sCups").textContent = "Cốc trà: " + stats.cups; $("sSeeds").textContent = "Hạt: " + stats.seeds; $("sNods").textContent = "Gật đầu: " + stats.nods;
  const s = Math.floor(stats.sat); $("sTime").textContent = "Đã ngồi: " + Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  const hint = $("hint"), sitting = player && player.state === "sit";
  if (!sitting) { hint.textContent = player && (player.state === "walk" || player.state === "walkkey") ? "Đang đi…" : "Chạm ghế nhựa để ngồi · chạm mặt đường để đi"; hint.style.opacity = 1; } else hint.style.opacity = 0;
  ["a1", "a2", "a3"].forEach(id => $(id).style.opacity = sitting ? 1 : .6); }

function renderPlaces() { const pl = $("placeList"); pl.textContent = "";
  W.places.forEach(([n, x, z]) => { const st = STAMPS.find(q => q.t === n), ok = st && Passport.has(st.id);
    const b = document.createElement("button"); b.type = "button"; b.className = "trk"; const ic = document.createElement("span"); ic.className = "ic"; ic.textContent = ok ? "✓" : "➜"; if (ok) ic.style.background = "#2f6e3a";
    const s2 = document.createElement("span"); s2.className = "tt"; const bb = document.createElement("b"); bb.textContent = n; const sm = document.createElement("small"); sm.textContent = st ? (ok ? "Đã có dấu" : "Chưa có dấu") : "Quán của bạn"; s2.append(bb, sm); b.append(ic, s2);
    b.addEventListener("click", () => { togglePlaces(false); if (!player) return; goPlayer(x, z, true); const lmk = Object.values(W.landmarks).find(l => l.t === n); if (lmk && !st) setTimeout(() => showInfo(lmk), 600); }); pl.append(b); }); }

/* ---------- Khởi động ---------- */
function boot() {
  try { R = new Renderer(cv); } catch (e) { console.error(e); $("loadText").textContent = "Trình duyệt này chưa hỗ trợ WebGL2 nên không chạy được bản 3D. Hãy thử Chrome, Edge, Safari 15+ hoặc Firefox mới."; $("loading").classList.remove("gone"); $("intro").classList.add("gone"); return; }
  primitives(R); W = buildWorld(R); if (qs.has("debug")) window.__dbg = { get remotes() { return [...remotes.values()].map(p => [p.name, Math.round(p.x), Math.round(p.z), p.state, JSON.stringify(p.path)]); }, get mode() { return mode; }, go: (x, z) => goPlayer(x, z), R, get W() { return W; }, cam, get P() { return player; }, order, get officers() { return officers; }, crowd: () => crowdCount(), Passport, fillCrowd(n) { for (const s of W.stools) { if (crowdCount() >= n) break; if (!s.occ) { const p = makePerson("npc", randName(), randLook()); placeSitting(p, s); p.stay = 999; npcs.push(p); } } },  setTime(i) { timeMode = i; }, rain(v) { raining = v; wet = v ? 1 : 0; } };
  const pb = new Builder(); const pp = new Parts();
  for (const b of W.parked) { pp.a.length = 0; motoParts(pp, { color: hex(b.col), cargo: "none", seed: .3 }, false); pp.bake(pb, M4.trs(b.x, WALK_Y, b.z, b.ry, 1, 1, 1)); }
  stoolGeo(pb, W.seller.x, W.seller.z, 0, hex("#2f74c0"));
  R.addMesh(pb, { spec: .2 });
  seller = { x: W.seller.x, z: W.seller.z, face: 0, look: { shirt: hex("#c96b8a"), pants: hex("#3a3330"), skin: hex("#d9a87c"), hair: hex("#8f8a83"), hat: "none" }, pour: 0, queue: [] };
  extras = W.extras.map(e => { const p = makePerson("extra", [0, 0], randLook()); p.x = e.x; p.z = e.z; p.face = e.face; p.seed = Math.random();
    if (e.kind === "vendor") { p.state = "sit"; p.look.hat = "non"; p.hold = "none"; } else if (e.kind === "coffee") { p.state = "sit"; p.hold = "coffee"; } else if (e.kind === "ice") { p.state = "stand"; p.hold = "ice"; } else p.state = "stand";
    if (e.kind === "vendor") { const s = { x: e.x, z: e.z, face: 0 }; } return p; });
  W.extras.filter(e => e.kind === "vendor").forEach(e => stoolGeo(pb, e.x, e.z, 0, hex("#c8382f")));
  for (let i = 0; i < 5; i++) { const fs = W.stools.filter(s => !s.occ); const p = makePerson("npc", randName(), randLook()); placeSitting(p, pick(fs)); p.cup = pick([1, .8, .6, .4]); npcs.push(p); }
  for (let i = 0; i < 14; i++) spawnVehicle(true);
  Radio.init(LICENSED_TRACKS);
  $("bootLoad").classList.add("gone");
  makeOfficers();
  Passport.init((st, done) => { Snd.stamp(); if (!st.bonus) setTimeout(() => showInfo({ k: "Hộ chiếu · " + st.k, t: st.t, d: st.story }), 900); renderPlaces();
    if (done) setTimeout(() => say("Đủ 7 dấu rồi! Mở Hộ chiếu để tải giấy chứng nhận “người phố cổ”."), 3200); });
  renderPlaces();
  let last = performance.now();
  function frame(now) { const dt = Math.min(.05, (now - last) / 1000); last = now; const t = now / 1000;
    update(dt, t); if (!STILL || window.__snap) { render(dt, t); if (window.__snap) { const f = window.__snap; window.__snap = null; f(); } } else updateCam(dt); hudT -= dt; if (hudT <= 0) { hudT = .25; refreshHUD(); } requestAnimationFrame(frame); }
  updateCam(0); requestAnimationFrame(frame);
}
setTimeout(boot, 30);
})();
