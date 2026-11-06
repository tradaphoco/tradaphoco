/* Trà Đá Phố Cổ — vòng lặp game, camera, điều khiển, đồng bộ quán, cử chỉ, cờ tướng, mùa, thời tiết, tên tự đặt */
(() => {
"use strict";
/* ============ CẤU HÌNH ============
   Không sửa ở đây. Mọi cấu hình nằm trong public/js/config.js (địa chỉ máy chủ, nhạc có bản quyền). */
const CFG = window.TDPC_CONFIG || {};
const DEFAULT_SERVER = (typeof CFG.server === "string" && /^wss?:\/\//.test(CFG.server)) ? CFG.server.trim() : "";
const LICENSED_TRACKS = Array.isArray(CFG.tracks) ? CFG.tracks : [];

const qs = new URLSearchParams(location.search), STILL = qs.has("still");
const WS_URL = qs.get("server") || DEFAULT_SERVER || (location.protocol.startsWith("http") && !/sg-host\.com$/.test(location.hostname) ? (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/ws" : "");
const $ = id => document.getElementById(id), ri = n => Math.floor(Math.random() * n), pick = a => a[ri(a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } } };
const { Room, valid, GB, cleanName } = RoomLib;

const NOUNS = ["Hoa Sữa", "Lá Sấu", "Gánh Hoa", "Tàu Điện", "Mái Ngói", "Cốm Vòng", "Tháp Rùa", "Cửa Ô", "Hồ Gươm", "Phố Cổ", "Gió Heo May", "Cốc Đá", "Kem Que", "Chiều Thu"];
const DESCS = ["Ngồi Lâu", "Tan Chậm", "Lơ Đãng", "Hay Gật Gù", "Không Vội", "Ngắm Phố", "Đi Ngang", "Thảnh Thơi", "Còn Ấm", "Cuối Ngày", "Chưa Về", "Lặng Im", "Biết Chờ", "Mới Đến"];
const SHIRTS = ["#e8d9b0", "#6d8fb3", "#c2554a", "#f2f2ee", "#4f7a5a", "#d9a24a", "#7d6aa8", "#2f3b4c", "#b7c4cf", "#9a5b3c"].map(hex);
const PANTS = ["#2f3440", "#4b4038", "#5a6b7d", "#1f2a36", "#6b5d4f"].map(hex), SKINS = ["#e9c39b", "#d9a87c", "#f0cfaa", "#c99569"].map(hex), HAIRS = ["#211a16", "#9a958d"].map(hex);
const HATS = ["none", "none", "none", "coi", "cap", "non"], COATS = ["#3a3f4a", "#5a4a3a", "#7a2a2a", "#2f4a3a", "#8a8a8a", "#2b3550", "#6b5a7a"].map(hex), SCARVES = ["#c8382f", "#e9b949", "#e8e2cf", "#2f74c0", "#8a2a3a"].map(hex);
const nameOf = n => NOUNS[n[0]] + " " + DESCS[n[1]], randName = () => [ri(14), ri(14)];
const randLook = () => ({ s: ri(10), p: ri(5), k: ri(4), h: Math.random() < .25 ? 1 : 0, a: ri(6) });
const lookOf = l => ({ shirt: SHIRTS[l.s], pants: PANTS[l.p], skin: SKINS[l.k], hair: HAIRS[l.h], hat: HATS[l.a] });
const LINES = ["Hà Nội vội làm gì. Đá còn chưa tan.", "Cứ ngồi đấy. Phố tự đi qua.", "Một cốc trà đá, một khoảng lặng giữa phố cổ.", "Tàu điện leng keng, nghe như chuyện ngày xưa.", "Ngồi lâu cũng được, cô không đuổi đâu.", "Hướng dương cắn từng hạt, chuyện gỡ từng chút.", "Người lạ ngồi cạnh cũng đang nghĩ chuyện riêng.", "Chẳng cần nói gì. Ngồi là đủ."];
const LINES_DONG = ["Gió mùa về, cốc trà nóng ấm tay.", "Mùi ngô nướng bay khắp phố.", "Hà Nội vào đông, ai cũng khăn quàng cổ."], LINES_TET = ["Phố treo cờ, nhà nhà đón Tết.", "Mua cành đào chưa?", "Năm mới bình an nhé!"];

/* ---------- Giờ, mùa, thời tiết Hà Nội ---------- */
function hanoi() { try { const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false }).formatToParts(new Date()), g = t => +p.find(x => x.type === t).value;
    return { y: g("year"), m: g("month"), d: g("day"), h: g("hour") % 24 }; } catch (e) { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate(), h: d.getHours() }; } }
const TET = { 2027: [2, 6], 2028: [1, 26], 2029: [2, 13], 2030: [2, 3], 2031: [1, 23] };
function autoSeason() { const n = hanoi(), today = Date.UTC(n.y, n.m - 1, n.d);
  for (const y of [n.y, n.y + 1]) { const t = TET[y]; if (!t) continue; const td = Date.UTC(y, t[0] - 1, t[1]), diff = (today - td) / 864e5; if (diff >= -14 && diff <= 10) return "tet"; }
  if ((n.m === 11 && n.d >= 15) || n.m === 12 || n.m <= 2) return "dong"; return "thuong"; }
let seasonMode = store.get("tdpc_season", "auto"), season = "thuong", timeMode = 0, wxMode = store.get("tdpc_wx", "auto"), WX = null, raining = false, wet = 0;
const isRainCode = c => (c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95;
const wxText = c => c === undefined ? "" : c <= 1 ? "trời quang" : c <= 3 ? "nhiều mây" : c <= 48 ? "sương mù" : c <= 57 ? "mưa phùn" : c <= 67 ? "mưa" : c <= 82 ? "mưa rào" : "dông";
function fetchWxDirect() { fetch("https://api.open-meteo.com/v1/forecast?latitude=21.0285&longitude=105.8542&current=temperature_2m,weather_code&timezone=Asia%2FBangkok").then(r => r.json()).then(j => setWx({ temp: Math.round(j.current.temperature_2m), code: j.current.weather_code })).catch(() => { }); }
function setWx(v) { WX = v; updateWeather(); }
function updateWeather() { raining = wxMode === "rain" || (wxMode === "auto" && WX && isRainCode(WX.code)); Snd.setRain(raining);
  $("wxChip").textContent = WX ? "Hà Nội " + WX.temp + "°C · " + wxText(WX.code) : ""; $("bWeather").textContent = "Trời: " + ({ auto: "Theo Hà Nội", dry: "Hanh", rain: "Mưa phùn" })[wxMode]; }
function updateSeason() { season = seasonMode === "auto" ? autoSeason() : seasonMode; Passport.season = season;
  if (R) R.meshes.forEach(m => { if (m.season) m.hidden = m.season !== season; }); $("bSeason").textContent = "Mùa: " + ({ auto: "Tự động", thuong: "Thường", dong: "Đông", tet: "Tết" })[seasonMode] + (seasonMode === "auto" ? " (" + ({ thuong: "thường", dong: "đông", tet: "Tết" })[season] + ")" : ""); }

/* ---------- Đồ hoạ: mức chất lượng và tự điều chỉnh độ phân giải ---------- */
const cv = $("c"), lbl = $("lbl"), lctx = lbl.getContext("2d");
let R = null, W = null, dpr = 1;
function autoTier() { const mob = matchMedia("(pointer: coarse)").matches || /Android|iPhone|iPad/i.test(navigator.userAgent), cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 4;
  if (!mob) return cores >= 4 ? "high" : "mid"; return cores >= 8 && mem >= 6 ? "mid" : "low"; }
let qPref = store.get("tdpc_q3", "auto"); if (!["auto", "low", "mid", "high"].includes(qPref)) qPref = "auto";
let tier = qPref === "auto" ? autoTier() : qPref, scale = 1;
const perf = { acc: 0, n: 0, fps: 60, warm: 3, lowT: 0, highT: 0 };
function resize() { dpr = Math.min(QUALITY[tier].maxDpr, window.devicePixelRatio || 1) * scale; cv.width = Math.max(64, Math.round(innerWidth * dpr)); cv.height = Math.max(64, Math.round(innerHeight * dpr)); lbl.width = cv.width; lbl.height = cv.height; }
addEventListener("resize", resize); resize();
function applyTier(t) { tier = t; scale = 1; if (R) R.setQuality(tier); resize(); setQ(); perf.warm = 2; }
function adapt(dt) { // giữ khung hình mượt: hạ độ phân giải trước, rồi mới hạ mức đồ hoạ
  if (document.hidden || STILL) return; perf.acc += dt; perf.n++; if (perf.acc < 1) return;
  perf.fps = perf.n / perf.acc; perf.acc = 0; perf.n = 0; if (perf.warm > 0) { perf.warm--; return; }
  if (perf.fps < 40) { perf.lowT++; perf.highT = 0; } else if (perf.fps > 57) { perf.highT++; perf.lowT = 0; } else { perf.lowT = 0; perf.highT = 0; }
  if (perf.lowT >= 2) { perf.lowT = 0; if (scale > .7) { scale = Math.max(.7, scale - .15); resize(); } else if (qPref === "auto" && tier !== "low") applyTier(tier === "high" ? "mid" : "low"); }
  if (perf.highT >= 5 && scale < 1) { perf.highT = 0; scale = Math.min(1, scale + .1); resize(); } }
function groundY(x, z) { if (x < BRIDGE_X) return 0; if (x >= 204 && x < 214) return 0; if (x >= 214) return WALK_Y; if (x >= LANE.x0 && x <= LANE.x1 && (z > SZ || z < NZ)) return WALK_Y; return (z <= CURB_N || z >= CURB_S) ? WALK_Y : 0; }
function clampWalk(x, z, px, pz) { if (valid(x, z)) return [x, z]; if (valid(x, pz)) return [x, pz]; if (valid(px, z)) return [px, z]; return [px, pz]; }
function nearestValid(x, z) { x = clamp(x, -139, 221); if (valid(x, z)) return [x, z]; if (x < BRIDGE_X) return [x, clamp(z, -4.4, 4.4)]; if (x >= 204) return [x, clamp(z, -79, 79)];
  if (Math.abs(x) < 3.4) return [x, clamp(z, -1.5, 1.5)]; return [x, clamp(z, -8.5, 7.9)]; }
const inLaneOut = (x, z) => x >= LANE.x0 && x <= LANE.x1 && (z > 7.9 || z < -8.5);
function route(px, pz, x, z) { const pts = []; let cx = px, cz = pz;
  if (inLaneOut(cx, cz) && !inLaneOut(x, z)) { cz = cz > 0 ? 6 : -6; cx = LANE.cx; pts.push({ x: cx, z: cz }); }
  if (cx < BRIDGE_X && x >= BRIDGE_X) { cx = BRIDGE_X + 1; cz = clamp(cz, -4, 4); pts.push({ x: cx, z: cz }); }
  if ((cx < -3.4 && x > -3.4) || (cx > 3.4 && x < 3.4)) { const s = cx < 0 ? -1 : 1; pts.push({ x: s * 4.2, z: 0 }, { x: -s * 4.2, z: 0 }); cx = -s * 4.2; cz = 0; }
  if (x < BRIDGE_X && cx >= BRIDGE_X) pts.push({ x: BRIDGE_X + 1, z: clamp(cz, -4, 4) });
  if (inLaneOut(x, z) && !inLaneOut(cx, cz)) pts.push({ x: LANE.cx, z: z > 0 ? 6 : -6 });
  pts.push({ x, z }); return pts; }

/* ---------- Tên người chơi ---------- */
let myNameIdx = store.get("tdpc_name", null) || randName(), myLook = store.get("tdpc_look", null) || randLook(), myNick = store.get("tdpc_nick", "");
const muted = new Set(store.get("tdpc_mute", []));
const isMuted = nm => muted.has(String(nm).toLowerCase());
function toggleMute(nm) { const k = String(nm).toLowerCase(); if (muted.has(k)) muted.delete(k); else muted.add(k); store.set("tdpc_mute", [...muted].slice(-200)); }
const shown = p => (p.kind === "real" && isMuted(p.name)) ? "Khách (đã ẩn tên)" : p.name;
function suggestName() { return nameOf(randName()); }

/* ---------- Người ---------- */
function makePerson(kind, nameIdx, look, nm) { return { kind, nameIdx, name: nm || nameOf(nameIdx), look: lookOf(look), seed: Math.random(), x: 0, z: 0, face: 0, state: "stand", stool: null, path: [], phase: Math.random() * 6, action: null, cup: 1, speed: 1.3 + Math.random() * .3 }; }
function winterLook(p) { if (!p.wlook) { const r = mulberry(Math.floor(p.seed * 1e6)); p.wlook = Object.assign({}, p.look, { shirt: COATS[Math.floor(r() * COATS.length)], coat: true, sleeve: "long", scarf: r() < .7 ? SCARVES[Math.floor(r() * SCARVES.length)] : null });
    if (p.look.hat === "none" && r() < .35) { p.wlook.hat = "len"; p.wlook.hatC = SCARVES[Math.floor(r() * SCARVES.length)]; } } return p.wlook; }
let player = null, ME = null, seller = null, aiPerson = null; const people = new Map(), ghosts = [], shellsFalling = []; let extras = [], walkers = [], vehicles = [];
const allPeople = () => { const a = [...people.values(), ...ghosts]; if (player) a.push(player); return a; };
const getP = id => id === ME ? player : people.get(id);
const realCount = () => [...people.values()].filter(p => p.kind === "real").length + (player ? 1 : 0);
const crowdCount = () => W.stools.filter(s => s.occ).length;
function walkTo(p, x, z, fast) { [x, z] = nearestValid(x, z); p.state = "walk"; p.path = route(p.x, p.z, x, z); p.fast = fast === undefined ? Math.hypot(p.x - x, p.z - z) > 20 : fast; p.action = null; }
function standUp(p) { if (p.stool) { if (p.stool.occ === p) p.stool.occ = null; p.stool = null; } const q = seller.queue.indexOf(p); if (q >= 0) seller.queue.splice(q, 1);
  if (p.state === "sit") { p.state = "stand"; p.x += Math.sin(p.face) * .55; p.z += Math.cos(p.face) * .55; } }
function sendTo(p, s) { if (s.occ && s.occ !== p) { const o = s.occ; standUp(o); }
  if (p.stool && p.stool !== s) p.stool.occ = null; if (p.chess !== undefined) leaveChessLocal(p); p.stool = s; s.occ = p; p.action = null;
  p.state = "walk"; const pts = route(p.x, p.z, s.x + Math.sin(s.face) * .55, s.z + Math.cos(s.face) * .55); pts.push({ x: s.x, z: s.z }); p.path = pts; p.fast = Math.hypot(p.x - s.x, p.z - s.z) > 20; }
function placeSitting(p, s) { p.stool = s; s.occ = p; p.x = s.x; p.z = s.z; p.face = s.face; p.state = "sit"; p.path = []; }
const claimable = s => !s.occ || s.occ.kind === "npc" || s.occ === player;
function edgeX(x) { return x + (Math.random() < .5 ? -40 : 40); }

/* ---------- Động tác ---------- */
const DUR = { sip: 1.8, seed: .8, nod: 1.0, wave: 1.6, cheers: 1.4, offer: 1.4 };
const stats = { cups: 0, seeds: 0, nods: 0, sat: 0, totalCups: store.get("tdvh_cups", 0), totalSeeds: store.get("tdvh_seeds", 0) };
function doAction(p, type) { if (p.action) return false; if ((type === "sip" || type === "seed" || type === "nod") && p.state !== "sit") return false; if (type === "sip" && p.cup <= .01) return false; p.action = { type, t: 0, fired: false }; return true; }
function fireAction(p, type) {
  if (type === "sip") { p.cup = Math.max(0, p.cup - .2); if (p === player) Snd.clink(); else Snd.clinkAt([p.x, 1, p.z], p.kind === "real" ? .8 : .35); if (p.cup <= .01 && !seller.queue.includes(p) && p.stool) seller.queue.push(p); }
  if (type === "seed") { const s = p.stool; if (!s) return; for (let i = 0; i < 2; i++) shellsFalling.push({ x: p.x + Math.sin(p.face) * .2, y: 1.15, z: p.z + Math.cos(p.face) * .2, vx: (Math.random() - .5) * .8, vz: (Math.random() - .5) * .8, vy: .3, s, ry: Math.random() * 6 });
    if (p === player) { Snd.crack(); stats.seeds++; stats.totalSeeds++; store.set("tdvh_seeds", stats.totalSeeds); } }
  if (type === "nod") { if (p.kind === "real") Snd.nod(); if (p === player) stats.nods++; } }

/* ---------- Thông báo, bong bóng chữ ---------- */
let toastTimer = 0; function say(msg) { const t = $("toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 4500); }
let infoTimer = 0; function showInfo(l) { $("infoStreet").textContent = l.k; $("infoTitle").textContent = l.t; $("infoText").textContent = l.d; $("info").classList.add("show"); clearTimeout(infoTimer); infoTimer = setTimeout(hideInfo, 12000); }
function hideInfo() { $("info").classList.remove("show"); } $("infoClose").addEventListener("click", hideInfo);
let bubbles = []; function bubble(who, text, dur) { if (!who || (who.kind === "real" && isMuted(who.name))) return; bubbles = bubbles.filter(b => b.who !== who); bubbles.push({ who, text, until: performance.now() / 1000 + dur }); }

/* ---------- Kết nối: máy chủ thật hoặc "quán" chạy ngay trong trình duyệt ---------- */
let mode = "offline", localRoom = null, roomAcc = 0, timeOff = 0;
const net = { ws: null, room: 0, want: false, tries: 0, ever: false };
function send(o) { if (mode === "online" || mode === "reconnecting") { if (net.ws && net.ws.readyState === 1) net.ws.send(JSON.stringify(o)); } else if (localRoom) localRoom.msg(ME, o); }
const hello = () => ({ t: "hello", n: myNameIdx, l: myLook, nm: myNick || undefined });
function startLocal() { mode = "offline"; net.want = false; ME = 1;
  localRoom = new Room(1, (to, obj, ex) => { if ((to === null && ex !== ME) || to === ME) Promise.resolve().then(() => handle(obj)); }, { gb: store.get("tdpc_gb", []), gbSave: g => store.set("tdpc_gb", g) });
  localRoom.join(ME, hello()); setMode(); }
function connect() { let ws; try { ws = new WebSocket(WS_URL); } catch (e) { return fallback(); }
  net.ws = ws; const to = setTimeout(() => { if (ws.readyState !== 1) ws.close(); }, 7000);
  ws.onopen = () => { clearTimeout(to); ws.send(JSON.stringify(hello())); };
  ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (_) { return; } handle(m); };
  ws.onclose = () => { clearTimeout(to); net.ws = null;
    if (!net.ever) { fallback(); return; }
    if (net.want) { mode = "reconnecting"; setMode(); net.tries++; say("Mất sóng… đang nối lại."); if (net.tries > 4) { say("Không nối lại được. Bạn chuyển sang ngồi một mình."); resetWorld(); startLocal(); return; } setTimeout(connect, Math.min(15000, 1500 * net.tries)); } }; }
function fallback() { say("Chưa kết nối được quán chung (máy chủ có thể đang khởi động). Tạm ngồi một mình nhé."); resetWorld(); startLocal(); }
function resetWorld() { people.forEach(p => { if (p.stool) p.stool.occ = null; }); people.clear(); if (player && player.stool) { player.stool.occ = null; player.stool = null; player.state = "stand"; }
  seller.queue.length = 0; chessState = null; aiPerson = null; }
function setMode() { const el = $("mode"); if (mode === "online") { el.className = "chip on"; el.textContent = "Quán số " + net.room + " · " + realCount() + " người thật"; }
  else if (mode === "reconnecting") { el.className = "chip"; el.textContent = "Đang nối lại…"; } else if (mode === "connecting") { el.className = "chip"; el.textContent = "Đang tìm quán…"; } else { el.className = "chip"; el.textContent = "Ngồi một mình"; } }
function addPerson(d, arrive) { if (d.id === ME) return; const p = makePerson(d.npc ? "npc" : "real", d.n, d.l, d.nm); p.id = d.id; people.set(d.id, p);
  if (d.s !== null && d.s !== undefined && W.stools[d.s]) { if (arrive) { p.x = edgeX(W.stall.x); p.z = -5.4; sendTo(p, W.stools[d.s]); } else placeSitting(p, W.stools[d.s]); }
  else { const x = typeof d.x === "number" ? d.x : 70, z = typeof d.z === "number" ? d.z : -5.5; if (arrive) { p.x = edgeX(x); p.z = -5.4; walkTo(p, x, z); } else { p.x = x; p.z = z; } } return p; }
function setMyName(nm) { player.name = nm || nameOf(myNameIdx); $("myName").textContent = player.name; }
function handle(m) {
  if (m.t === "welcome") { ME = m.id; timeOff = m.now - Date.now(); if (mode !== "offline") { mode = "online"; net.room = m.room; net.ever = true; net.tries = 0; }
    if (m.you) { if (m.you.rejected) { setTimeout(() => say("Tên “" + myNick + "” chưa dùng được: " + m.you.rejected + " Bạn tạm dùng tên ngẫu nhiên, đổi lại trong ☰."), 600); myNick = ""; store.set("tdpc_nick", ""); }
      setMyName(m.you.nm); if (m.you.nm && myNick && m.you.nm !== myNick) setTimeout(() => say("Trong quán đã có người tên “" + myNick + "”, bạn sẽ hiện là “" + m.you.nm + "”."), 900); }
    people.clear(); m.players.forEach(d => addPerson(d, false)); order.tgt = m.order.k; order.k = m.order.k; order.again = m.order.again; tram = m.tram; train = m.train;
    applyChess(m.chess); UI.onGb(m.gb, true); setMode(); ready(); if (player && player.stool) send({ t: "sit", s: player.stool.i });
    if (mode === "online") { const n = m.players.filter(p => !p.npc).length; say(n ? "Quán số " + m.room + " đang có " + n + " người. Kiếm ghế mà ngồi." : "Quán số " + m.room + " chưa có ai. Bạn là khách đầu tiên."); } }
  else if (m.t === "join") { if (!people.has(m.p.id) && m.p.id !== ME) { addPerson(m.p, true); if (!m.p.npc) Snd.join(); } setMode(); }
  else if (m.t === "leave") { const p = people.get(m.id); if (p) { people.delete(m.id); standUp(p); if (p.chess !== undefined) leaveChessLocal(p); p.leaving = true; p.state = "walk"; p.path = [{ x: p.x, z: p.z > 0 ? 5.4 : -5.4 }, { x: edgeX(p.x), z: p.z > 0 ? 5.4 : -5.4 }]; ghosts.push(p); } setMode(); }
  else if (m.t === "sit") { const s = W.stools[m.s], p = getP(m.id); if (!s || !p) return; if (s.occ && s.occ !== p) { if (s.occ === player) say("Ghế của bạn vừa có người khác ngồi. Kiếm ghế khác nhé."); standUp(s.occ); } sendTo(p, s); }
  else if (m.t === "go") { const p = people.get(m.id); if (p) { standUp(p); if (p.chess !== undefined) leaveChessLocal(p); walkTo(p, m.x, m.z); } }
  else if (m.t === "deny") { pendingAct = null; say("Có người nhanh tay hơn. Ghế đó có chủ rồi."); }
  else if (m.t === "act") { const p = getP(m.id); if (p) doAction(p, m.a); }
  else if (m.t === "name") { const p = getP(m.id); if (!p) return; const old = p.name;
    if (m.id === ME) { myNick = m.nm || ""; store.set("tdpc_nick", myNick); setMyName(m.nm); UI.renameResult(true, "Đã đổi tên thành “" + player.name + "”."); say("Bạn đã đổi tên thành “" + player.name + "”."); }
    else { p.name = m.nm || nameOf(p.nameIdx); if (Math.hypot(p.x - player.x, p.z - player.z) < 20 && !isMuted(p.name) && !isMuted(old)) bubble(p, "Giờ mình tên là “" + p.name + "”", 3.5); } }
  else if (m.t === "renameFail") UI.renameResult(false, m.reason);
  else if (m.t === "order") onOrder(m);
  else if (m.t === "tram") tram = m.v; else if (m.t === "train") { train = m.v; train.horn = false; }
  else if (m.t === "ges") onGesture(m); else if (m.t === "cheers2") onCheers2(m);
  else if (m.t === "chess") applyChess(m.c);
  else if (m.t === "gb") { UI.onGb([m.e], false); const name = m.e.nm || nameOf(m.e.n); const who = [...people.values(), player].find(p => p && p.name === name); if (who) bubble(who, "✍ " + GB[m.e.i], 5); }
  else if (m.t === "wx") setWx(m.v);
}
function requestSit(s) { if (!player || s.occ === player) return; if (!claimable(s)) { say("Ghế này có người ngồi rồi."); return; } send({ t: "sit", s: s.i }); }
function goPlayer(x, z) { [x, z] = nearestValid(x, z); standUp(player); if (player.chess !== undefined) send({ t: "chess", op: "leave" }); walkTo(player, x, z); pendingAct = null; send({ t: "go", x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10 }); }

/* ---------- Cử chỉ ---------- */
const GES_TXT = { tea: ["🍵 Mời trà", "mời bạn trà"], cheers: ["🥂 Cụng ly nhé!", "muốn cụng ly với bạn"], wave: ["👋 Chào!", "vẫy chào bạn"], thanks: ["🙏 Cảm ơn nhé!", "cảm ơn bạn"], seat: ["🪑 Mời ngồi", "nhường ghế cho bạn"] };
function onGesture(m) { const a = getP(m.id), b = getP(m.to); if (!a) return; const tx = GES_TXT[m.g]; if (!tx) return; bubble(a, tx[0], 3.2);
  if (m.g === "tea") { doAction(a, "offer"); setTimeout(() => { if (b && b.state === "sit") { b.cup = 1; Snd.clinkAt([b.x, 1, b.z], 1); } }, 800); }
  else if (m.g === "cheers") doAction(a, "cheers"); else if (m.g === "wave") doAction(a, "wave"); else if (m.g === "thanks") doAction(a, "nod");
  if (b) a.face = Math.atan2(b.x - a.x, b.z - a.z);
  if (b === player && a !== player && !(a.kind === "real" && isMuted(a.name))) say(shown(a) + " " + tx[1] + "."); }
function onCheers2(m) { const a = getP(m.a), b = getP(m.b); [a, b].forEach(p => { if (p) { p.action = null; doAction(p, "cheers"); bubble(p, "🥂 Dzô!", 2.5); } });
  if (a && b) { Snd.clinkAt([(a.x + b.x) / 2, 1.2, (a.z + b.z) / 2], 1.5); sparks.push({ x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, t: 0 }); }
  if (a === player || b === player) say("Cụng ly với " + shown(a === player ? b : a) + "!"); }
let sparks = [];
const gm = $("gmenu"); let gTarget = null;
function openGesture(p, sx, sy) { gTarget = p; $("gmName").textContent = shown(p) + (p.kind === "real" ? " ●" : "");
  $("gSeat").hidden = !(player.state === "sit" && player.stool && p.kind === "real" && p.state !== "sit");
  $("gMute").hidden = p.kind !== "real"; $("gMute").textContent = isMuted(p.name) ? "👁 Hiện tên" : "🙈 Ẩn tên";
  gm.style.left = clamp(sx / dpr - 110, 8, innerWidth - 228) + "px"; gm.style.top = clamp(sy / dpr - 150, 60, innerHeight - 260) + "px"; gm.classList.add("show"); }
function closeGesture() { gm.classList.remove("show"); gTarget = null; }
gm.querySelectorAll("[data-g]").forEach(b => b.addEventListener("click", () => { if (gTarget) send({ t: "ges", g: b.dataset.g, to: gTarget.id }); closeGesture(); }));
$("gMute").addEventListener("click", () => { if (gTarget) { toggleMute(gTarget.name); say(isMuted(gTarget.name) ? "Đã ẩn tên người này trên máy của bạn." : "Đã hiện lại tên."); bubbles = bubbles.filter(b => b.who !== gTarget); } closeGesture(); });
$("gClose").addEventListener("click", closeGesture);

/* ---------- Cờ tướng ---------- */
let chessState = null;
function leaveChessLocal(p) { p.chess = undefined; p.hold = null; if (p.state === "sit" && !p.stool) { p.state = "stand"; p.x += .6; } }
function applyChess(c) { if (!c) return; const prev = chessState; chessState = Object.assign({}, c, { board: c.b.split(",") });
  for (const p of allPeople()) if (p.chess !== undefined && c.seats[p.chess] !== (p === player ? ME : p.id)) leaveChessLocal(p);
  c.seats.forEach((id, i) => { if (!id) return; let p; if (id === "ai") { if (!aiPerson) { aiPerson = makePerson("extra", [0, 0], { s: 3, p: 0, k: 1, h: 1, a: 0 }); aiPerson.name = "Ông cụ đánh cờ"; aiPerson.look.beard = true; } p = aiPerson; } else p = getP(id);
    if (!p) return; const st = W.chess.seats[i]; if (p.stool) { if (p.stool.occ === p) p.stool.occ = null; p.stool = null; } p.chess = i; p.hold = "chess"; p.x = st.x; p.z = st.z; p.face = st.face; p.state = "sit"; p.path = []; });
  if (aiPerson && !c.seats.includes("ai")) aiPerson = null;
  if (prev && c.last && (!prev.last || prev.last.join() !== c.last.join())) Snd.piece();
  UI.onChess(chessState, ME); }

/* ---------- Trật tự vỉa hè: công an phường & dân phòng ---------- */
const UNI = { ca: { shirt: hex("#64713f"), pants: hex("#2f3a26"), skin: SKINS[1], hair: HAIRS[0], hat: "kepi", hatC: hex("#55633a"), board: hex("#b3261e"), badge: hex("#e6c34a"), belt: hex("#3a2a1c"), sleeve: "long" },
  dp: { shirt: hex("#2f6fb0"), pants: hex("#24324a"), skin: SKINS[0], hair: HAIRS[0], hat: "dpcap", hatC: hex("#24508a"), band: hex("#c62828"), belt: hex("#222222") } };
const MSG1 = "Quán đang đông khách. Đề nghị bà con kê ghế gọn vào phía trong, chừa lối đi cho người đi bộ, không lấn ra lòng đường. Xin cảm ơn!", MSG2 = "Quán vẫn đông, bà con nhớ giữ lối đi thông thoáng giúp nhé. Cảm ơn bà con!";
const MEGA_SY = [["u", 200, 205, .22], ["i", 205, 200, .24], ["u", 200, 205, .22], ["i", 205, 185, .36], ["ê", 190, 192, .2], ["i", 195, 190, .2], ["a", 200, 200, .2], ["o", 190, 190, .22], ["ê", 200, 195, .2], ["ê", 195, 195, .2], ["o", 190, 192, .2], ["a", 186, 170, .45]];
const THANK_SY = [["a", 230, 240, .2], ["ơ", 240, 230, .22], ["a", 225, 225, .2], ["o", 220, 220, .2], ["o", 225, 200, .4]], ROAD_SY = [["a", 240, 250, .2], ["ơ", 250, 280, .28], ["i", 230, 230, .2], ["ê", 240, 240, .2], ["a", 240, 210, .4]];
const RAO = { banhmi: { txt: "Ai bánh mì nóng giòn đây…", sy: [["a", 230, 240, .32], ["a", 265, 300, .3], ["i", 250, 205, .28], ["o", 240, 240, .28], ["o", 220, 205, .28], ["ơ", 265, 205, 1.1]] },
  xoi: { txt: "Xôi lạc, xôi ngô nóng đây…", sy: [["o", 240, 240, .28], ["a", 215, 185, .3], ["o", 240, 240, .28], ["o", 235, 230, .28], ["ơ", 260, 205, 1.0]] },
  hoa: { txt: "Hoa tươi đây… ai mua hoa không?", sy: [["o", 230, 240, .3], ["ư", 240, 240, .28], ["ơ", 255, 210, .7], ["a", 230, 240, .25], ["o", 250, 285, .6]] },
  qua: { txt: "Cam, quýt ngọt đây…", sy: [["a", 240, 245, .32], ["i", 270, 300, .32], ["o", 215, 190, .3], ["ơ", 265, 205, 1.0]] },
  ngo: { txt: "Ngô nướng, khoai nướng nóng đây…", sy: [["o", 240, 240, .3], ["ư", 220, 200, .3], ["a", 240, 240, .28], ["ư", 220, 200, .3], ["o", 245, 245, .28], ["ơ", 265, 205, 1.0]] } };
let officers = [], roadT = 0, roadCd = 10;
const order = { st: "idle", k: 0, tgt: 0, again: false, glow: 0 };
const ROUTE = [[14, 4.9], [196, 4.9], [196, -4.35], [14, -4.35]];
function makeOfficers() { const ca = makePerson("officer", [0, 0], randLook()), dp = makePerson("officer", [0, 0], randLook());
  ca.look = UNI.ca; ca.name = "Công an phường"; ca.role = "ca"; dp.look = UNI.dp; dp.name = "Dân phòng"; dp.role = "dp"; ca.x = 40; ca.z = 4.9; ca.wp = 1; dp.x = 38.9; dp.z = 4.9; officers = [ca, dp]; }
function patrolStep() { const [ca, dp] = officers; if (order.st !== "idle") return;
  if (ca.state !== "walk") { const w = ROUTE[ca.wp]; ca.wp = (ca.wp + 1) % ROUTE.length; ca.speed = 1.05; ca.path = [{ x: w[0], z: w[1] }]; ca.state = "walk"; ca.hold = null; ca.fast = false; }
  const dx = ca.x - dp.x, dz = ca.z - dp.z, d = Math.hypot(dx, dz); if (d > 1.3) { dp.path = [{ x: ca.x - dx / d * 1.1, z: ca.z - dz / d * 1.1 }]; dp.state = "walk"; dp.speed = d > 3 ? 2.2 : 1.15; dp.fast = false; } }
function onOrder(m) { const [ca, dp] = officers, sx = W.stall.x; order.again = !!m.again;
  if (m.st === "coming" || (m.st === "announce" && order.st !== "coming")) { for (const o of officers) { if (Math.abs(o.x - sx) > 24) { o.x = sx + (o.x < sx ? -22 : 22); o.z = -4.35; }
      o.path = [{ x: o.x, z: -4.35 }, { x: sx + (o === ca ? -.7 : .9), z: -4.3 }]; o.state = "walk"; o.speed = 2.3; o.fast = false; } }
  if (m.st === "announce") { for (const o of officers) { o.x = sx + (o === ca ? -.7 : .9); o.z = -4.3; o.state = "stand"; o.path = []; o.face = Math.PI; } ca.hold = "loa";
    bubble(ca, "Thông báo: " + (order.again ? MSG2 : MSG1), 9); Snd.voiceAt([ca.x, 1.7, ca.z], MEGA_SY, { mega: true, vol: .8, ref: 5, vib: 2 });
    if (player && Math.hypot(player.x - ca.x, player.z - ca.z) < 45) showNotice(order.again); }
  if (m.st === "thanks") { hideNotice(); ca.hold = null; bubble(dp, "Cảm ơn bà con đã hợp tác!", 3.5); Snd.voiceAt([dp.x, 1.7, dp.z], THANK_SY, { vol: .5 });
    if (m.k === 1 && !m.again) { order.glow = 5; if (m.by === ME) { say("Cảm ơn bạn! Vỉa hè đã thông thoáng."); Passport.award("vanminh"); }
      else if (m.by) { const p = getP(m.by); say((p ? shown(p) : "Một vị khách") + " đã kê ghế gọn giúp cả quán. Cảm ơn!"); } else say("Cô bán hàng kê gọn ghế vào sát tường, chừa lối đi cho người đi bộ."); } }
  if (m.st === "idle") ca.hold = null;
  order.st = m.st; order.tgt = m.k; }
function roadStep(dt) { roadCd -= dt; if (!player || !readied) return;
  if (player.x > -100 && player.x < 203 && Math.abs(player.z) < 3.8 && Math.abs(player.x) > 4 && player.state !== "sit") roadT += dt; else roadT = 0;
  if (roadT > 5 && roadCd <= 0) { const o = officers.find(q => Math.hypot(q.x - player.x, q.z - player.z) < 25); if (o) { roadCd = 45; bubble(o, "Bạn ơi, đi lên vỉa hè cho an toàn nhé!", 4); Snd.voiceAt([o.x, 1.7, o.z], ROAD_SY, { vol: .5 }); } } }
function showNotice(again) { $("noticeText").textContent = again ? MSG2 : MSG1; $("nYes").textContent = again ? "Đã rõ, cảm ơn anh!" : "Kê ghế gọn lại"; $("nLater").hidden = !!again; hideInfo(); $("notice").classList.add("show"); }
function hideNotice() { $("notice").classList.remove("show"); }
$("nYes").addEventListener("click", () => { if (!order.again) send({ t: "compact" }); hideNotice(); });
$("nLater").addEventListener("click", hideNotice);

/* ---------- Điều khiển ---------- */
let pendingAct = null, calm = false;
function setCalm(v) { calm = v; document.body.classList.toggle("calm", v); $("a4").classList.toggle("on", v); if (v) { hideInfo(); UI.closePanels(); } }
function playerAct(type) { if (!player) return;
  if (player.state !== "sit") { if (!player.stool && player.chess === undefined) { const fs = W.stools.filter(s => claimable(s)); if (!fs.length) { say("Hết ghế rồi. Chờ chút nhé."); return; }
      fs.sort((a, b) => (a.occ ? 1 : 0) - (b.occ ? 1 : 0) || Math.hypot(a.x - player.x, a.z - player.z) - Math.hypot(b.x - player.x, b.z - player.z)); requestSit(fs[0]); } pendingAct = type; return; }
  if (type === "sip" && player.cup <= .01) { say("Cốc cạn rồi. Cô đang rót thêm…"); return; }
  if (doAction(player, type)) send({ t: "act", a: type }); }
$("a1").addEventListener("click", () => playerAct("sip")); $("a2").addEventListener("click", () => playerAct("seed")); $("a3").addEventListener("click", () => playerAct("nod")); $("a4").addEventListener("click", () => setCalm(!calm));
$("bSound").addEventListener("click", e => { Snd.init(); Snd.cityOn = !Snd.cityOn; Snd.setCity(); e.currentTarget.textContent = "Tiếng phố: " + (Snd.cityOn ? "Bật" : "Tắt"); });
$("bWeather").addEventListener("click", () => { wxMode = { auto: "dry", dry: "rain", rain: "auto" }[wxMode]; store.set("tdpc_wx", wxMode); updateWeather(); });
$("bSeason").addEventListener("click", () => { seasonMode = { auto: "thuong", thuong: "dong", dong: "tet", tet: "auto" }[seasonMode]; store.set("tdpc_season", seasonMode); updateSeason(); });
const TIMES = ["auto", "sang", "chieu", "toi"], TLABEL = { auto: "Theo Hà Nội", sang: "Sáng", chieu: "Chiều", toi: "Tối" };
$("bTime").addEventListener("click", e => { timeMode = (timeMode + 1) % 4; e.currentTarget.textContent = "Giờ: " + TLABEL[TIMES[timeMode]]; });
function setQ() { $("bQ").textContent = "Đồ hoạ: " + (qPref === "auto" ? "Tự động · " + QUALITY[tier].name : QUALITY[tier].name) + (started && !STILL ? " · " + Math.round(perf.fps) + " khung/giây" : "") + (scale < 1 ? " · " + Math.round(scale * 100) + "%" : ""); }
$("bQ").addEventListener("click", () => { qPref = { auto: "low", low: "mid", mid: "high", high: "auto" }[qPref]; store.set("tdpc_q3", qPref); applyTier(qPref === "auto" ? autoTier() : qPref); });

/* ---------- Ô nhập tên ở màn hình mở đầu ---------- */
const nickIn = $("nickIn"), nickMsg = $("nickMsg");
nickIn.value = myNick; nickIn.placeholder = "Ví dụ: " + nameOf(myNameIdx);
function checkNick(show) { const v = nickIn.value.trim(); if (!v) { if (show) { nickMsg.textContent = "Để trống thì bạn dùng tên ngẫu nhiên “" + nameOf(myNameIdx) + "”."; nickMsg.className = "note"; } return { ok: true, name: "" }; }
  const r = cleanName(v); if (show) { nickMsg.textContent = r.ok ? "✓ Tên dùng được" : r.reason; nickMsg.className = "note " + (r.ok ? "good" : "bad"); } return r; }
nickIn.addEventListener("input", () => checkNick(true));
nickIn.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); $("startOnline").disabled ? $("startSolo").click() : $("startOnline").click(); } });
$("reroll").addEventListener("click", () => { nickIn.value = suggestName(); checkNick(true); nickIn.focus(); });
checkNick(true);
if (!WS_URL) { $("startOnline").disabled = true; $("onlineNote").textContent = "Chế độ nhiều người cần địa chỉ máy chủ: điền dòng server trong js/config.js hoặc thêm ?server=wss://… vào đường link."; }

/* ---------- Camera ---------- */
const cam = { yaw: .55, pitch: .28, dist: innerWidth < innerHeight ? 8.5 : 6.5, target: [76, 1.2, -6], eye: [0, 0, 0], vp: null, fov: 55 * Math.PI / 180 };
function updateCam(dt) {
  if (player) { const ty = groundY(player.x, player.z) + (player.state === "sit" ? .9 : 1.45), k = Math.min(1, dt * 4); cam.target[0] = lerp(cam.target[0], player.x, k); cam.target[1] = lerp(cam.target[1], ty, k); cam.target[2] = lerp(cam.target[2], player.z, k); }
  if (calm) { cam.yaw += dt * .06; cam.pitch = lerp(cam.pitch, .12, dt * .3); cam.dist = lerp(cam.dist, 9, dt * .3); }
  const t = cam.target, cp = Math.cos(cam.pitch); let d = cam.dist; const dir = [Math.sin(cam.yaw) * cp, Math.sin(cam.pitch), Math.cos(cam.yaw) * cp];
  if (inLaneOut(t[0], t[2]) || (t[0] >= LANE.x0 - .5 && t[0] <= LANE.x1 + .5 && Math.abs(t[2]) > 6)) { if (dir[0] > 0) d = Math.min(d, (LANE.x1 - .6 - t[0]) / dir[0]); else if (dir[0] < 0) d = Math.min(d, (LANE.x0 + .6 - t[0]) / dir[0]); }
  else if (t[0] > BRIDGE_X && t[0] < 203) { if (dir[2] > 0) d = Math.min(d, (SZ - .9 - t[2]) / dir[2]); else if (dir[2] < 0) d = Math.min(d, (NZ + .9 - t[2]) / dir[2]); }
  d = Math.max(.8, d); cam.eye = [t[0] + dir[0] * d, Math.max(.35, t[1] + dir[1] * d), t[2] + dir[2] * d];
  const asp = cv.width / cv.height; cam.proj = M4.persp(asp < .8 ? 72 * Math.PI / 180 : cam.fov, asp, .1, 1200); cam.view = M4.lookAt(cam.eye, t, [0, 1, 0]); cam.vp = M4.mul(new Float32Array(16), cam.proj, cam.view); }
function project(x, y, z) { const m = cam.vp, cx = m[0] * x + m[4] * y + m[8] * z + m[12], cy = m[1] * x + m[5] * y + m[9] * z + m[13], w = m[3] * x + m[7] * y + m[11] * z + m[15]; if (w <= .1) return null; return [(cx / w * .5 + .5) * cv.width, (1 - (cy / w * .5 + .5)) * cv.height, w]; }
function rayAt(px, py) { const inv = M4.inv(cam.vp), nx = px / cv.width * 2 - 1, ny = 1 - py / cv.height * 2;
  const un = z => { const x = inv[0] * nx + inv[4] * ny + inv[8] * z + inv[12], y = inv[1] * nx + inv[5] * ny + inv[9] * z + inv[13], zz = inv[2] * nx + inv[6] * ny + inv[10] * z + inv[14], w = inv[3] * nx + inv[7] * ny + inv[11] * z + inv[15]; return [x / w, y / w, zz / w]; };
  const a = un(-1), b = un(1), d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l = Math.hypot(...d); return { o: a, d: [d[0] / l, d[1] / l, d[2] / l] }; }
function rayBox(r, b) { let t0 = 0, t1 = 1e9; const mn = [b.x0, 0, b.z0], mx = [b.x1, Math.max(b.h, .01), b.z1];
  for (let k = 0; k < 3; k++) { if (Math.abs(r.d[k]) < 1e-8) { if (r.o[k] < mn[k] || r.o[k] > mx[k]) return -1; continue; } let a = (mn[k] - r.o[k]) / r.d[k], c = (mx[k] - r.o[k]) / r.d[k]; if (a > c) [a, c] = [c, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, c); if (t0 > t1) return -1; } return t0; }
let marker = null;
function pick3D(px, py) { if (!player) return; closeGesture();
  let bp = null, bd = 40 * dpr; for (const p of [...people.values(), aiPerson]) { if (!p || p.leaving) continue; const pr = project(p.x, groundY(p.x, p.z) + (p.state === "sit" ? .8 : 1.2), p.z); if (!pr) continue; const d = Math.hypot(pr[0] - px, pr[1] - py); if (d < bd) { bd = d; bp = p; } }
  if (bp && bp !== aiPerson && Math.hypot(bp.x - player.x, bp.z - player.z) < 7) { openGesture(bp, px, py); return; }
  let best = null; bd = 42 * dpr; W.stools.forEach(s => { const p = project(s.x, WALK_Y + .35, s.z); if (!p) return; const d = Math.hypot(p[0] - px, p[1] - py); if (d < bd) { bd = d; best = s; } });
  if (best) { hideInfo(); pendingAct = null; requestSit(best); return; }
  const r = rayAt(px, py); let tb = 1e9, hb = null; W.blocks.forEach(b => { const t = rayBox(r, b); if (t >= 0 && t < tb) { tb = t; hb = b; } });
  const tg = r.d[1] < -1e-4 ? (WALK_Y * .5 - r.o[1]) / r.d[1] : 1e9;
  if (hb && (tb < tg || hb.lm === "chess")) { const hx = r.o[0] + r.d[0] * tb, hz = r.o[2] + r.d[2] * tb;
    if (hb.lm === "chess") { UI.openChess(); if (Math.hypot(player.x - W.chess.x, player.z - W.chess.z) > 4) goPlayer(W.chess.x - 1.2, -5.6); return; }
    if (hb.lm && W.landmarks[hb.lm]) showInfo(W.landmarks[hb.lm]); else hideInfo();
    if (hb.water) goPlayer(219.5, hz); else if (hb.lm === "gate") goPlayer(5, hz); else if (hb.lm === "longbien") goPlayer(-110, 0); else if (hb.lm === "duongtau") goPlayer(LANE.x0 + .6, hz);
    else goPlayer(hx, hz < 0 ? hz + 1.5 : hz - 1.5); return; }
  if (tg < 500) { hideInfo(); const gx = r.o[0] + r.d[0] * tg, gz = r.o[2] + r.d[2] * tg; goPlayer(gx, gz); marker = { x: gx, z: gz, t: 0 }; } }
const keys = new Set();
addEventListener("keydown", e => { if (!started) return; if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if (UI.modalOpen()) { if (e.key === "Escape") UI.closePanels(); return; } const k = e.key.toLowerCase(); keys.add(k);
  if (e.key === "Escape") { UI.closePanels(); hideInfo(); closeGesture(); if (calm) setCalm(false); }
  else if (k === "1") playerAct("sip"); else if (k === "2") playerAct("seed"); else if (k === "3") playerAct("nod"); else if (k === "4") setCalm(!calm);
  else if (k === "m") UI.toggle("radio"); else if (k === "g") UI.toggle("places"); else if (k === "p") UI.toggle("passport"); else if (k === "c") UI.openPostcard(); else if (k === "l") UI.toggle("gbook"); else if (k === "n") UI.toggle("rename");
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault(); });
addEventListener("keyup", e => keys.delete(e.key.toLowerCase())); addEventListener("blur", () => keys.clear());
const pts = new Map(); let pinch = 0, downInfo = null;
cv.addEventListener("pointerdown", e => { try { cv.setPointerCapture(e.pointerId); } catch (_) { } pts.set(e.pointerId, [e.clientX, e.clientY]); if (pts.size === 1) downInfo = { x: e.clientX, y: e.clientY, moved: false }; else { if (downInfo) downInfo.moved = true; const a = [...pts.values()]; pinch = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]); } });
cv.addEventListener("pointermove", e => { if (!pts.has(e.pointerId)) return; const prev = pts.get(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
  if (pts.size === 2) { const a = [...pts.values()], d = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]); if (pinch) cam.dist = clamp(cam.dist * pinch / d, 1.5, 60); pinch = d; return; }
  const dx = e.clientX - prev[0], dy = e.clientY - prev[1]; if (downInfo && Math.hypot(e.clientX - downInfo.x, e.clientY - downInfo.y) > 7) downInfo.moved = true;
  if (downInfo && downInfo.moved) { cam.yaw -= dx * .006; cam.pitch = clamp(cam.pitch + dy * .005, -.15, 1.35); if (calm) setCalm(false); } });
const pend = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = 0;
  if (pts.size === 0 && downInfo && !downInfo.moved && started && e.type === "pointerup") { if (calm) setCalm(false); else if (UI.anyOpen()) UI.closePanels(); else pick3D(e.clientX * dpr, e.clientY * dpr); }
  if (pts.size === 0) downInfo = null; };
cv.addEventListener("pointerup", pend); cv.addEventListener("pointercancel", pend);
cv.addEventListener("wheel", e => { e.preventDefault(); cam.dist = clamp(cam.dist * Math.exp(e.deltaY * .0012), 1.5, 60); }, { passive: false });

/* ---------- Bắt đầu ---------- */
let started = false, readied = false;
function begin(online) { const r = checkNick(true); if (!r.ok) { nickIn.focus(); return; } myNick = r.name; store.set("tdpc_nick", myNick);
  Snd.init(); store.set("tdpc_name", myNameIdx); store.set("tdpc_look", myLook); $("intro").classList.add("gone"); $("loading").classList.remove("gone");
  $("loadText").textContent = online ? "Đang tìm quán còn ghế… (máy chủ miễn phí có thể mất tới 1 phút để thức dậy)" : "Cô bán hàng đang lau ghế…";
  player = makePerson("me", myNameIdx, myLook, myNick); player.x = 70 + Math.random() * 4; player.z = -5.2; player.face = Math.PI * .5; $("myName").textContent = player.name;
  cam.target = [player.x, 1.4, player.z]; started = true; perf.warm = 3; if (online) { mode = "connecting"; net.want = true; setMode(); connect(); } else startLocal(); }
function ready() { if (readied) return; readied = true; $("loading").classList.add("gone"); $("hud").classList.remove("hidden"); setMode();
  setTimeout(() => { if (!$("toast").classList.contains("show")) say("Chạm ghế để ngồi · chạm người bên cạnh để mời trà, cụng ly · Mở “Hộ chiếu” để dạo đủ 10 địa danh"); }, 1500); }
$("startOnline").addEventListener("click", () => begin(true)); $("startSolo").addEventListener("click", () => begin(false));

/* ---------- Xe, tàu, gánh hàng ---------- */
let tram = null, train = null, trainBell = 0;
function spawnVehicle(anywhere) { const dir = Math.random() < .5 ? 1 : -1, r = Math.random(), type = r < .7 ? "moto" : r < .85 ? "cyclo" : "bike", cx = cam.target[0];
  let x = anywhere ? cx + (Math.random() - .5) * 120 : cx - dir * (75 + Math.random() * 25); x = clamp(x, -470, 203);
  const v = { type, dir, x, lane: dir * (1.5 + Math.random() * 1.6), speed: type === "moto" ? 6 + Math.random() * 4 : type === "cyclo" ? 2.4 : 3.6, v: 0, seed: Math.random(), phase: 0,
    color: hex(pick(["#c8382f", "#1f1f1f", "#e8e8e8", "#2f74c0", "#7a7f87", "#8a2a3a", "#d9d2c0"])), cargo: season === "tet" && Math.random() < .35 ? "dao" : pick(["none", "none", "none", "boxes", "flowers", "gas"]), rider: lookOf(randLook()), pass: null, hood: hex(pick(["#2f4a3a", "#7a2a22", "#2b3550"])) };
  v.v = v.speed; if (type === "moto") { v.rider.hat = "helmet"; v.rider.helmet = hex(pick(["#f2c230", "#c8382f", "#ffffff", "#2f74c0", "#222222", "#e98fb0"])); if (Math.random() < .35 && v.cargo === "none") { v.pass = lookOf(randLook()); v.pass.hat = "helmet"; v.pass.helmet = hex(pick(["#ffffff", "#f2c230"])); } }
  if (type === "cyclo") { v.rider.hat = "non"; v.pass = lookOf(randLook()); } if (type === "bike") { v.rider.hat = "non"; v.rider.shirt = hex(pick(["#f2f2ee", "#e8d9b0", "#c96b8a"])); }
  if (season === "dong") { v.rider = Object.assign({}, v.rider, { shirt: pick(COATS), coat: true, sleeve: "long" }); if (v.pass) v.pass = Object.assign({}, v.pass, { shirt: pick(COATS), coat: true, sleeve: "long" }); }
  vehicles.push(v); if (type !== "moto" && Math.random() < .5 && started) setTimeout(() => Snd.ringAt([v.x, 1, v.lane], .8), 400); }
function spawnWalker() { const dir = Math.random() < .5 ? 1 : -1, p = makePerson("extra", [0, 0], randLook()); p.look.hat = "non"; p.look.shirt = hex(pick(["#e8d9b0", "#b7c4cf", "#c96b8a", "#f2f2ee"]));
  p.x = cam.target[0] - dir * 60; p.z = dir * 3.3; p.face = dir > 0 ? Math.PI / 2 : -Math.PI / 2; p.dir = dir; p.state = "walk"; p.carry = season === "dong" && Math.random() < .5 ? "ngo" : season === "tet" ? pick(["hoa", "qua"]) : pick(["hoa", "qua", "banhmi", "xoi", "banhmi"]); p.raoT = 1 + Math.random() * 4; walkers.push(p); }
function trainCars() { const out = []; if (!train) return out; const el = (Date.now() + timeOff - train.at) / 1000, head = (train.dir > 0 ? -150 : 150) + train.dir * 7 * el; let off = 0;
  for (let i = 0; i < 6; i++) { const L = i === 0 ? 14 : 15; out.push({ i, z: head - train.dir * (off + L / 2), L }); off += L + .4; } return out; }
function tramX() { if (!tram) return null; const el = (Date.now() + timeOff - tram.at) / 1000; return (tram.dir > 0 ? -100 : 204) + tram.dir * 4.2 * el; }

/* ---------- Môi trường ---------- */
function phase() { const m = TIMES[timeMode]; if (m !== "auto") return m; const h = hanoi().h; return h >= 5 && h < 11 ? "sang" : h >= 11 && h < 17 ? "chieu" : "toi"; }
const N3 = v => { const l = Math.hypot(...v); return v.map(x => x / l); };
const PRESET = { sang: { sun: N3([-.55, .62, .56]), sunC: [3.0, 2.75, 2.35], sky: [.42, .52, .7], gnd: [.26, .23, .2], fog: [.62, .7, .8], fogD: .0048, zen: [.22, .42, .85], hor: [.78, .84, .9], expo: .82, night: 0, cloud: .35 },
  chieu: { sun: N3([.72, .34, .6]), sunC: [3.4, 2.2, 1.25], sky: [.45, .42, .5], gnd: [.3, .22, .16], fog: [.86, .64, .47], fogD: .0052, zen: [.26, .36, .72], hor: [1.05, .72, .46], expo: .8, night: 0, cloud: .45 },
  toi: { sun: N3([-.35, .8, .45]), sunC: [.09, .1, .17], sky: [.05, .055, .09], gnd: [.03, .026, .022], fog: [.025, .03, .05], fogD: .011, zen: [.004, .006, .02], hor: [.045, .045, .08], expo: 1.25, night: 1, cloud: .3 } };
let env = null;
function makeEnv(t) { const P = PRESET[phase()], mixv = (a, b, k) => a.map((x, i) => x + (b[i] - x) * k), cold = season === "dong" ? .45 : 0, gray = Math.min(1, wet + cold);
  const grayFog = P.night ? [.04, .045, .06] : [.55, .58, .62], graySky = P.night ? [.03, .035, .05] : [.36, .38, .42];
  const e = { sunDir: P.sun, sunC: P.sunC.map(x => x * (1 - .75 * wet - .3 * cold)), sky: mixv(P.sky, graySky, gray * .8), gnd: P.gnd, fog: mixv(P.fog, grayFog, gray * .85), fogD: P.fogD * (1 + wet * 1.6 + cold * 1.2),
    zen: mixv(P.zen, graySky, gray * .9), hor: mixv(P.hor, grayFog, gray * .9), expo: P.expo, night: P.night, cloud: lerp(P.cloud, 1, gray), wet, wind: 1 + wet + cold, time: t, shadows: true, shadowSize: 42, lights: [] };
  const Ls = [...W.lights, ...(W.seasonLights[season] || [])];
  if (P.night || wet > .5) { const t2 = cam.target, k = P.night ? 1 : .25; e.lights = Ls.map(l => [l, (l.p[0] - t2[0]) ** 2 + (l.p[2] - t2[2]) ** 2]).sort((a, b) => a[1] - b[1]).slice(0, 16).map(a => ({ p: a[0].p, r: a[0].r, c: a[0].c.map(x => x * k) })); }
  else if (W.seasonLights[season]) e.lights = W.seasonLights[season].filter(l => Math.abs(l.p[0] - cam.target[0]) < 30).map(l => ({ p: l.p, r: l.r, c: l.c.map(x => x * .5) }));
  return e; }

/* ---------- Cập nhật ---------- */
let engT = 0, vehT = .5, honkT = 8, lineT = 55, walkT = 6, goT = 0, smokeT = 0; const smoke = [];
function stepPerson(p, dt) {
  if (p.state === "walk") { const tg = p.path[0]; if (!tg) { p.state = p.leaving ? "gone" : (p.stool && p.stool.occ === p ? "sit" : "stand"); return; }
    const dx = tg.x - p.x, dz = tg.z - p.z, d = Math.hypot(dx, dz), sp = (p.fast ? 5.2 : (p === player ? 2.2 : p.speed)) * dt;
    p.phase += dt * (p.fast ? 13 : 8.5); let df = Math.atan2(dx, dz) - p.face; df = Math.atan2(Math.sin(df), Math.cos(df)); p.face += df * Math.min(1, dt * 10);
    if (d <= sp) { p.x = tg.x; p.z = tg.z; p.path.shift();
      if (!p.path.length) { if (p.leaving) p.state = "gone"; else if (p.stool && p.stool.occ === p) { p.state = "sit"; p.face = p.stool.face;
          if (p === player && pendingAct) { const a = pendingAct; pendingAct = null; setTimeout(() => { if (doAction(player, a)) send({ t: "act", a }); }, 300); } } else { p.state = "stand"; p.fast = false; } } }
    else { p.x += dx / d * sp; p.z += dz / d * sp; } }
  if (p.action) { p.action.t += dt; const a = p.action; if (!a.fired && a.t >= DUR[a.type] * .55) { a.fired = true; fireAction(p, a.type); } if (a.t >= DUR[a.type]) p.action = null; } }
function update(dt, t) {
  if (player && started) { let fx = 0, fz = 0; if (keys.has("w") || keys.has("arrowup")) fz -= 1; if (keys.has("s") || keys.has("arrowdown")) fz += 1; if (keys.has("a")) fx -= 1; if (keys.has("d")) fx += 1;
    if (keys.has("arrowleft")) cam.yaw += dt * 1.6; if (keys.has("arrowright")) cam.yaw -= dt * 1.6;
    if (fx || fz) { if (player.chess !== undefined) send({ t: "chess", op: "leave" }); standUp(player); const sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw), mx = fz * sy + fx * cy, mz = fz * cy - fx * sy, l = Math.hypot(mx, mz), run = keys.has("shift"), sp = (run ? 5.2 : 2.4) * dt;
      const [nx, nz] = clampWalk(player.x + mx / l * sp, player.z + mz / l * sp, player.x, player.z); player.x = nx; player.z = nz; player.state = "walkkey"; player.path = []; player.phase += dt * (run ? 13 : 8.5);
      let df = Math.atan2(mx, mz) - player.face; df = Math.atan2(Math.sin(df), Math.cos(df)); player.face += df * Math.min(1, dt * 12);
      goT -= dt; if (goT <= 0) { goT = .5; send({ t: "go", x: Math.round(player.x * 10) / 10, z: Math.round(player.z * 10) / 10 }); } }
    else if (player.state === "walkkey") { player.state = "stand"; send({ t: "go", x: Math.round(player.x * 10) / 10, z: Math.round(player.z * 10) / 10 }); } }
  if (localRoom) { roomAcc += dt; while (roomAcc >= 1) { roomAcc -= 1; localRoom.tick(1); } }
  allPeople().forEach(p => stepPerson(p, dt)); if (player && player.state === "sit") stats.sat += dt;
  for (let i = ghosts.length - 1; i >= 0; i--) if (ghosts[i].state === "gone") ghosts.splice(i, 1);
  officers.forEach(o => stepPerson(o, dt)); patrolStep(); roadStep(dt); if (order.glow > 0) order.glow -= dt;
  order.k += clamp(order.tgt - order.k, -dt / 1.6, dt / 1.6);
  { const k = order.k * order.k * (3 - 2 * order.k); for (const s of W.stools) { s.x = lerp(s.bx, s.cx, k); s.z = lerp(s.bz, s.cz, k); s.face = Math.atan2(W.stall.x - s.x, W.stall.z - s.z); if (s.occ && s.occ.state === "sit") { s.occ.x = s.x; s.occ.z = s.z; s.occ.face = s.face; } } }
  if (player && readied) Passport.check(player.x, player.z, dt);
  const cars = trainCars(); let zMin = 1e9, zMax = -1e9; cars.forEach(c => { zMin = Math.min(zMin, c.z - c.L / 2); zMax = Math.max(zMax, c.z + c.L / 2); });
  const crossing = cars.length && zMin < 30 && zMax > -30;
  if (train && cars.length) { const head = cars[0].z; if (!train.horn && Math.abs(head) < 90 && Math.abs(head) > 20) { train.horn = true; Snd.hornAt([LANE.cx, 3, head]); } if (zMin > 160 || zMax < -160) train = null; }
  if (crossing) { trainBell -= dt; if (trainBell <= 0) { trainBell = .7; Snd.bellAt([LANE.x0 - .5, 2.7, CURB_N - .6]); }
    if (player && Math.abs(player.x - LANE.cx) < 1.6 && player.z > zMin - 25 && player.z < zMax + 25) { player.x = player.x < LANE.cx ? LANE.x0 + .5 : LANE.x1 - .5; player.state = "stand"; player.path = []; say("Tàu đến! Đứng sát vào lề, giữ khoảng cách an toàn."); } }
  vehT -= dt; if (vehT <= 0) { vehT = .7 + Math.random() * 1.6; if (vehicles.length < 26) spawnVehicle(false); }
  for (const v of vehicles) { let target = v.speed;
    for (const p of [player, ...people.values(), ...officers]) { if (!p) continue; const ahead = (p.x - v.x) * v.dir; if (ahead > 0 && ahead < 7 && Math.abs(p.z - v.lane) < 1.1) { target = Math.min(target, 1); if (!v.honked && p === player) { v.honked = true; Snd.honkAt([v.x, 1, v.lane], 1.2); } } }
    if (crossing) { const a = (LANE.cx - v.x) * v.dir; if (a > 3 && a < 12) target = 0; }
    v.v = lerp(v.v, target, dt * 2); v.x += v.v * v.dir * dt; v.phase += dt * v.v * 2.2; }
  for (let i = vehicles.length - 1; i >= 0; i--) { const v = vehicles[i]; if (v.x < -480 || v.x > 204 || Math.abs(v.x - cam.target[0]) > 140) vehicles.splice(i, 1); }
  walkT -= dt; if (walkT <= 0) { walkT = 14 + Math.random() * 20; if (walkers.length < 4) spawnWalker(); }
  walkers.forEach(w => { w.x += w.dir * 1.05 * dt; w.phase += dt * 6.5; w.raoT -= dt; if (w.raoT <= 0) { w.raoT = 8 + Math.random() * 7; const r = RAO[w.carry]; if (r && started && Snd.dist([w.x, 0, w.z]) < 45) { Snd.voiceAt([w.x, 1.6, w.z], r.sy, { vol: .6, vib: 6 }); bubble(w, r.txt, 3.6); } } });
  for (let i = walkers.length - 1; i >= 0; i--) if (Math.abs(walkers[i].x - cam.target[0]) > 90 || walkers[i].x > 203 || walkers[i].x < -99) walkers.splice(i, 1);
  const tx = tramX(); if (tram && tx !== null) { if (!tram.rang && Math.abs(tx - cam.target[0]) < 60) { tram.rang = true; if (started) Snd.tramAt([tx + tram.dir * 4.8, 2.6, 0]); } if (tx < -102 || tx > 206) tram = null; }
  if (started) { honkT -= dt; if (honkT <= 0) { honkT = 6 + Math.random() * 16; const near = vehicles.filter(v => Math.abs(v.x - Snd.lis[0]) < 60); if (near.length) { const v = pick(near); v.type === "moto" ? Snd.honkAt([v.x, 1, v.lane], 1) : Snd.ringAt([v.x, 1, v.lane], 1); } } }
  if (seller.pour > 0) { seller.pour += dt / 1.6; if (seller.pour >= 1) { seller.pour = 0; const p = seller.queue.shift(); if (p && p.state === "sit") { p.cup = 1; if (p === player) { stats.cups++; stats.totalCups++; store.set("tdvh_cups", stats.totalCups); } } } }
  else if (seller.queue.length) { seller.pour = .001; if (seller.queue[0] === player || Math.random() < .3) Snd.pourAt([W.stall.x, 1, W.stall.z]); }
  for (let i = shellsFalling.length - 1; i >= 0; i--) { const s = shellsFalling[i]; s.vy -= 9 * dt; s.x += s.vx * dt; s.z += s.vz * dt; s.y += s.vy * dt; if (s.y <= WALK_Y + .01) { s.s.shells.push([s.x - s.s.x, s.z - s.s.z, s.ry]); if (s.s.shells.length > 60) s.s.shells.shift(); shellsFalling.splice(i, 1); } }
  if (season === "dong") { smokeT -= dt; if (smokeT <= 0) { smokeT = .25; smoke.push({ x: W.corn.x + (Math.random() - .5) * .2, y: .8, z: W.corn.z, t: 0 }); } }
  for (let i = smoke.length - 1; i >= 0; i--) { const s = smoke[i]; s.t += dt; s.y += dt * .6; s.x += dt * .15; if (s.t > 3.5) smoke.splice(i, 1); }
  sparks = sparks.filter(s => (s.t += dt) < 1.2);
  wet = lerp(wet, raining ? 1 : 0, dt * .25);
  engT -= dt; if (engT <= 0 && started) { engT = .1; const L = Snd.lis, d2 = v => (v.x - L[0]) ** 2 + (v.lane - L[2]) ** 2;
    const list = vehicles.filter(v => Math.abs(v.x - L[0]) < 50).sort((a, b) => d2(a) - d2(b)).slice(0, 5).map(v => ({ p: [v.x, .7, v.lane], v: v.v, moto: v.type === "moto" }));
    const tc = cars.length ? [LANE.cx, 1.5, clamp(L[2], zMin, zMax)] : null; Snd.updateEngines(list, tx !== null && tram ? [tx, 1.2, 0] : null, tc); Snd.zoneTick(.1, crowdCount(), phase() === "sang", season === "dong"); }
  bubbles = bubbles.filter(b => b.until > performance.now() / 1000);
  if (readied && player && player.state === "sit") { lineT -= dt; if (lineT <= 0) { lineT = 55 + Math.random() * 40; say(pick(season === "dong" ? [...LINES, ...LINES_DONG] : season === "tet" ? [...LINES, ...LINES_TET] : LINES)); } }
  if (marker) { marker.t += dt; if (marker.t > 1.2) marker = null; } }

/* ---------- Vẽ ---------- */
const parts = new Parts(), stoolCache = {}; let glows = [];
function lookFor(p) { return season === "dong" && !p.role && p.kind !== "officer" ? winterLook(p) : p.look; }
function drawPerson(p, t) { parts.a.length = 0; const pose = p.state === "sit" ? "sit" : (p.state === "walk" || p.state === "walkkey") ? "walk" : "stand";
  const act = p.action ? { type: p.action.type, k: p.action.t / DUR[p.action.type] } : null, nod = act && act.type === "nod" ? Math.abs(Math.sin(act.k * Math.PI * 2)) : 0;
  personParts(parts, { look: lookFor(p), pose, phase: p.phase, act, nod, hold: p.hold || (pose === "sit" ? "cup" : null), cup: p.cup, carry: p.carry, t, seed: p.seed, lookUp: calm && p === player ? 1 : 0 });
  const gy = groundY(p.x, p.z); parts.emit(R, M4.trs(p.x, gy, p.z, p.face, 1, 1, 1));
  if (p === player || p.kind === "real") R.inst("cyl", M4.trs(p.x, gy + .005, p.z, 0, .9, .01, .9), p === player ? [1, .85, .4] : [.5, .9, .55], env.night ? .6 : .3); }
function drawVehicle(v, night) { parts.a.length = 0; if (v.type === "moto") motoParts(parts, v, night); else if (v.type === "cyclo") cycloParts(parts, v, night); else bikeParts(parts, v);
  let lane = v.lane; if (Math.abs(v.x) < 6) lane *= .45; const Wm = M4.trs(v.x, 0, lane, v.dir > 0 ? Math.PI / 2 : -Math.PI / 2, 1, 1, 1); parts.emit(R, Wm);
  for (const r of vehicleRiders(v)) { parts.a.length = 0; personParts(parts, { look: r.look, pose: r.pose, phase: v.phase }); parts.emit(R, mm(Wm, T(r.dx, r.dy, r.dz))); }
  if (night && v.type === "moto") { const p = M4.tp(Wm, 0, .98, .62); glows.push(p[0], p[1], p[2], 1, .95, .8, 2.2); } }
const rainBuf = new Float32Array(900 * 6); let rainInit = false;
function drawRain(dt) { if (wet < .05) return null; const c = cam.eye, n = Math.floor(900 * clamp(wet, 0, 1));
  if (!rainInit) { for (let i = 0; i < 900; i++) { rainBuf[i * 6] = c[0] + (Math.random() - .5) * 30; rainBuf[i * 6 + 1] = Math.random() * 14; rainBuf[i * 6 + 2] = c[2] + (Math.random() - .5) * 30; } rainInit = true; }
  for (let i = 0; i < n; i++) { const o = i * 6; rainBuf[o + 1] -= 11 * dt; rainBuf[o] += .6 * dt;
    if (rainBuf[o + 1] < 0 || Math.abs(rainBuf[o] - c[0]) > 16 || Math.abs(rainBuf[o + 2] - c[2]) > 16) { rainBuf[o] = c[0] + (Math.random() - .5) * 30; rainBuf[o + 1] = 6 + Math.random() * 10; rainBuf[o + 2] = c[2] + (Math.random() - .5) * 30; }
    rainBuf[o + 3] = rainBuf[o] - .03; rainBuf[o + 4] = rainBuf[o + 1] + .45; rainBuf[o + 5] = rainBuf[o + 2]; } return rainBuf.subarray(0, n * 6); }
function rr(x, y, w, h, r) { lctx.beginPath(); lctx.moveTo(x + r, y); lctx.arcTo(x + w, y, x + w, y + h, r); lctx.arcTo(x + w, y + h, x, y + h, r); lctx.arcTo(x, y + h, x, y, r); lctx.arcTo(x, y, x + w, y, r); lctx.closePath(); }
function drawLabels() { lctx.clearRect(0, 0, lbl.width, lbl.height); if (!readied || UI.hideLabels) return; const fs = Math.round(12 * dpr); lctx.textAlign = "center"; lctx.textBaseline = "middle";
  if (!calm) for (const [n, x, z] of W.places) { const d = Math.hypot(x - cam.target[0], z - cam.target[2]); if (d > 60 || d < 4) continue; const p = project(x, 5.2, z); if (!p) continue;
    lctx.globalAlpha = clamp((60 - d) / 20, 0, 1) * .9; lctx.font = "700 " + Math.round(13 * dpr) + "px Georgia, serif"; const w = lctx.measureText(n).width + 18 * dpr; lctx.fillStyle = "rgba(155,44,36,.92)"; rr(p[0] - w / 2, p[1] - 12 * dpr, w, 24 * dpr, 12 * dpr); lctx.fill(); lctx.fillStyle = "#fff"; lctx.fillText(n, p[0], p[1] + dpr); }
  for (const p of [...allPeople(), ...officers, aiPerson]) { if (!p || p.leaving) continue; const d = Math.hypot(p.x - cam.target[0], p.z - cam.target[2]); let a = 1;
    if (p.kind === "npc" || p === aiPerson) { a = clamp((7 - d) / 3, 0, 1) * .75; if (p.action && d < 12) a = .75; } else if (p.role) a = clamp((35 - d) / 10, 0, 1); else a = clamp((40 - d) / 10, 0, 1); if (a <= 0) continue;
    const pr = project(p.x, groundY(p.x, p.z) + (p.state === "sit" ? 1.32 : 2.0), p.z); if (!pr) continue;
    const txt = (p.kind === "real" ? "● " : p.role === "ca" ? "★ " : "") + shown(p); lctx.font = (p === player ? "700 " + (fs + 1) : "600 " + (fs - 1)) + "px system-ui, sans-serif";
    const w = lctx.measureText(txt).width + 14 * dpr, h = 20 * dpr; lctx.globalAlpha = a; lctx.fillStyle = p === player ? "rgba(255,226,150,.96)" : p.kind === "real" ? "rgba(214,238,206,.95)" : p.role === "ca" ? "rgba(85,99,58,.95)" : p.role === "dp" ? "rgba(36,80,138,.95)" : "rgba(255,255,255,.85)";
    rr(pr[0] - w / 2, pr[1] - h / 2, w, h, h / 2); lctx.fill(); lctx.fillStyle = p.role ? "#fff" : "#2b2420"; lctx.fillText(txt, pr[0], pr[1] + dpr); }
  lctx.globalAlpha = 1;
  for (const b of bubbles) { const p = b.who, d = Math.hypot(p.x - cam.target[0], p.z - cam.target[2]); if (d > 45) continue; const pr = project(p.x, groundY(p.x, p.z) + (p.state === "sit" ? 1.6 : 2.45), p.z); if (!pr) continue;
    lctx.font = "600 " + fs + "px system-ui, sans-serif"; const maxW = 240 * dpr, words = b.text.split(" "), lines = []; let ln = ""; for (const wd of words) { const tst = ln ? ln + " " + wd : wd; if (lctx.measureText(tst).width > maxW && ln) { lines.push(ln); ln = wd; } else ln = tst; } if (ln) lines.push(ln);
    const lh = fs * 1.3, bw = Math.max(...lines.map(l => lctx.measureText(l).width)) + 22 * dpr, bh = lines.length * lh + 14 * dpr, bx = clamp(pr[0] - bw / 2, 6, lbl.width - bw - 6), by = pr[1] - bh - 10 * dpr;
    lctx.fillStyle = p.role ? "#eef4ff" : "#fffaf0"; lctx.strokeStyle = p.role === "ca" ? "#55633a" : p.role === "dp" ? "#24508a" : "#b98a52"; lctx.lineWidth = 2 * dpr; rr(bx, by, bw, bh, 10 * dpr); lctx.fill(); lctx.stroke();
    lctx.beginPath(); lctx.moveTo(pr[0] - 7 * dpr, by + bh - 1); lctx.lineTo(pr[0], by + bh + 9 * dpr); lctx.lineTo(pr[0] + 7 * dpr, by + bh - 1); lctx.closePath(); lctx.fill(); lctx.fillStyle = "#2a2320"; lines.forEach((l, i) => lctx.fillText(l, bx + bw / 2, by + 7 * dpr + lh * (i + .5))); } }
function drawChessPieces() { if (!chessState) return; const ch = W.chess, y = WALK_Y + .35;
  chessState.board.forEach((pc, i) => { if (!pc) return; const r = (i / 9) | 0, c = i % 9, x = ch.x - .36 + .72 * (.1 + .1 * c), z = ch.z - .4 + .8 * ((.1 + .1 * r) / 1.0909), red = pc === pc.toUpperCase();
    R.inst("cyl", M4.trs(x, y, z, 0, .056, .014, .056), [.93, .86, .7]); R.inst("cyl", M4.trs(x, y + .014, z, 0, .036, .002, .036), red ? [.75, .12, .1] : [.1, .1, .1]); }); }
function render(dt, t) { env = makeEnv(t); updateCam(dt); const night = env.night > .5; glows = [];
  if (night || wet > .5) { for (const g of W.glows) if (Math.abs(g[0] - cam.target[0]) < 120) glows.push(...g); for (const g of (W.seasonGlows[season] || [])) if (Math.abs(g[0] - cam.target[0]) < 120) glows.push(...g); }
  else if (season === "dong") for (const g of W.seasonGlows.dong) glows.push(g[0], g[1], g[2], g[3] * .5, g[4] * .5, g[5] * .5, g[6]);
  const near = x => Math.abs(x - cam.target[0]) < 110;
  for (const p of allPeople()) if (near(p.x)) drawPerson(p, t);
  for (const e of extras) if (near(e.x) && (!e.season || e.season === season)) drawPerson(e, t);
  for (const w of walkers) drawPerson(w, t); for (const o of officers) if (near(o.x)) drawPerson(o, t); if (aiPerson) drawPerson(aiPerson, t);
  parts.a.length = 0; personParts(parts, { look: lookFor(seller), pose: "sit", act: seller.pour > 0 ? { type: "pour", k: seller.pour } : null, hold: "pour" }); parts.emit(R, M4.trs(seller.x, WALK_Y, seller.z, seller.face, 1, 1, 1));
  for (const s of W.stools) { const key = s.color.join(); if (!stoolCache[key]) { stoolCache[key] = new Parts(); stoolParts(stoolCache[key], s.color); } stoolCache[key].emit(R, M4.trs(s.x, WALK_Y, s.z, s.face, 1, 1, 1));
    for (const sh of s.shells) R.inst("box", M4.trs(s.x + sh[0], WALK_Y + .008, s.z + sh[1], sh[2], .012, .006, .006), [.17, .15, .13]); }
  for (const s of shellsFalling) R.inst("box", M4.trs(s.x, s.y, s.z, s.ry, .012, .006, .006), [.17, .15, .13]);
  if (order.glow > 0) R.inst("box", M4.trs(W.stall.x, WALK_Y + .004, -4.95, 0, 10, .006, 1.4), [.3, .85, .5], (.5 + .5 * Math.sin(t * 6)) * Math.min(1, order.glow / 1.5) * .5);
  if (marker) { const k = marker.t / 1.2; R.inst("cyl", M4.trs(marker.x, groundY(marker.x, marker.z) + .01, marker.z, 0, .3 + k * .5, .01, .3 + k * .5), [1, .85, .4], 1 - k); }
  drawChessPieces();
  for (const s of smoke) { const k = s.t / 3.5, r = .12 + k * .35; R.inst("sph", M4.trs(s.x, s.y, s.z, 0, r, r * .8, r), [.75 - k * .2, .75 - k * .2, .75 - k * .2]); }
  for (const s of sparks) for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28, r = s.t * .9; glows.push(s.x + Math.cos(a) * r, 1.4 + s.t * .6, s.z + Math.sin(a) * r, 1, .85, .4, 1.2 * (1 - s.t / 1.2)); }
  for (const v of vehicles) drawVehicle(v, night);
  const tx = tramX(); if (tram && tx !== null) { parts.a.length = 0; tramParts(parts, tram, night); parts.emit(R, M4.trs(tx, 0, 0, tram.dir > 0 ? Math.PI / 2 : -Math.PI / 2, 1, 1, 1)); }
  const cars = trainCars(); for (const c of cars) { if (Math.abs(c.z - cam.target[2]) > 220 && Math.abs(LANE.cx - cam.target[0]) > 200) continue; parts.a.length = 0; trainCarParts(parts, c.i, night); parts.emit(R, M4.trs(LANE.cx, .26, c.z, train.dir > 0 ? 0 : Math.PI, 1, 1, 1));
    if (c.i === 0 && night) glows.push(LANE.cx, 1.3, c.z + train.dir * 7.2, 1, .95, .8, 4); }
  const crossingNow = cars.length && cars.some(c => Math.abs(c.z) < 40);
  if (crossingNow && Math.sin(t * 9) > 0) for (const b of W.barriers) glows.push(b.x, 2.75, b.z, 1, .1, .05, 2.2);
  for (const b of W.barriers) R.inst("box", mm(M4.trs(b.x, 1.05, b.z, 0, 1, 1, 1), mm(M4.rotZ(crossingNow ? 0 : Math.PI / 2.2), M4.trs(b.x < LANE.cx ? 1.6 : -1.6, 0, 0, 0, 3.2, .08, .08))), [.85, .15, .1]);
  R.render(cam, env, glows.length ? new Float32Array(glows) : null, drawRain(dt)); drawLabels();
  if (captureCb) { const f = captureCb; captureCb = null; f(cv, lbl); } }
let captureCb = null, hudT = 0, qT = 0;
function refreshHUD() { if (mode === "online") setMode(); $("sCups").textContent = "Cốc trà: " + stats.cups; $("sSeeds").textContent = "Hạt: " + stats.seeds; $("sNods").textContent = "Gật đầu: " + stats.nods;
  const s = Math.floor(stats.sat); $("sTime").textContent = "Đã ngồi: " + Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); const hint = $("hint"), sitting = player && player.state === "sit";
  if (!sitting) { hint.textContent = player && (player.state === "walk" || player.state === "walkkey") ? "Đang đi…" : "Chạm ghế để ngồi · chạm người gần bạn để mời trà"; hint.style.opacity = 1; } else hint.style.opacity = 0;
  ["a1", "a2", "a3"].forEach(id => $(id).style.opacity = sitting ? 1 : .6); if (++qT % 4 === 0) setQ(); }
function renderPlaces() { const pl = $("placeList"); pl.textContent = "";
  W.places.forEach(([n, x, z]) => { const st = STAMPS.find(q => q.t === n), ok = st && Passport.has(st.id), b = document.createElement("button"); b.type = "button"; b.className = "trk";
    const ic = document.createElement("span"); ic.className = "ic"; ic.textContent = ok ? "✓" : "➜"; if (ok) ic.style.background = "#2f6e3a"; const s2 = document.createElement("span"); s2.className = "tt";
    const bb = document.createElement("b"); bb.textContent = n; const sm = document.createElement("small"); sm.textContent = st ? (ok ? "Đã có dấu" : "Chưa có dấu") : "Ghé chơi"; s2.append(bb, sm); b.append(ic, s2);
    b.addEventListener("click", () => { UI.closePanels(); if (player) goPlayer(x, z); }); pl.append(b); }); }

/* ---------- Khởi động (chờ Three.js nạp xong) ---------- */
function boot() {
  try { R = new Renderer(cv); R.setQuality(tier); } catch (e) { console.error(e); $("bootLoad").querySelector("span").textContent = "Trình duyệt này chưa hỗ trợ WebGL2 nên không chạy được bản 3D. Hãy thử Chrome, Edge, Safari 15+ hoặc Firefox mới."; $("intro").classList.add("gone"); return; }
  cv.addEventListener("webglcontextlost", () => say("Trình duyệt tạm mất kết nối đồ hoạ, đang khôi phục…"));
  cv.addEventListener("webglcontextrestored", () => { R.onRestore(); say("Đã khôi phục đồ hoạ."); });
  primitives(R); W = buildWorld(R);
  const pb = new Builder(), pp = new Parts(); for (const b of W.parked) { pp.a.length = 0; motoParts(pp, { color: hex(b.col), cargo: "none", seed: .3 }, false); pp.bake(pb, M4.trs(b.x, WALK_Y, b.z, b.ry, 1, 1, 1)); }
  stoolGeo(pb, W.seller.x, W.seller.z, 0, hex("#2f74c0")); R.addMesh(pb, { spec: .2 });
  seller = { x: W.seller.x, z: W.seller.z, face: 0, seed: .42, look: { shirt: hex("#c96b8a"), pants: hex("#3a3330"), skin: hex("#d9a87c"), hair: hex("#8f8a83"), hat: "none" }, pour: 0, queue: [] };
  extras = W.extras.map(e => { const p = makePerson("extra", [0, 0], randLook()); p.x = e.x; p.z = e.z; p.face = e.face; p.season = e.season;
    if (e.kind === "vendor" || e.kind === "flower") { p.state = "sit"; p.look.hat = "non"; p.hold = "none"; } else if (e.kind === "coffee") { p.state = "sit"; p.hold = "coffee"; } else if (e.kind === "ice") { p.state = "stand"; p.hold = "ice"; }
    else if (e.kind === "corn") { p.state = "sit"; p.hold = "fan"; p.look.hat = "len"; p.look.hatC = hex("#7a2a2a"); } else p.state = "stand"; return p; });
  makeOfficers(); for (let i = 0; i < 14; i++) spawnVehicle(true);
  Radio.init(LICENSED_TRACKS); updateSeason(); updateWeather(); setQ(); if (wxMode === "auto" && !WX) fetchWxDirect(); setInterval(() => { if (mode !== "online") fetchWxDirect(); updateSeason(); }, 10 * 60 * 1000);
  Passport.init((st, done) => { Snd.stamp(); if (!st.bonus) setTimeout(() => showInfo({ k: "Hộ chiếu · " + st.k, t: st.t, d: st.story }), 900); renderPlaces();
    if (done) setTimeout(() => say("Đủ " + NEED + " dấu rồi! Mở Hộ chiếu để tải giấy chứng nhận “người phố cổ”."), 3200); });
  renderPlaces(); $("bootLoad").classList.add("gone");
  window.G = { send, get me() { return ME; }, get chess() { return chessState; }, nameOf, say, get player() { return player; }, getP, capture(cb) { captureCb = cb; }, get mode() { return mode; }, GB, get season() { return season; },
    nameById(id) { if (id === "ai") return "Ông cụ (máy)"; const p = getP(id); return p ? shown(p) : "Người chơi"; },
    get myNick() { return myNick; }, isMuted, suggestName, rename(v) { send({ t: "rename", nm: v || null }); } };
  if (qs.has("debug")) window.__dbg = { R, get W() { return W; }, cam, get P() { return player; }, order, get officers() { return officers; }, crowd: crowdCount, Passport, get people() { return people; }, get room() { return localRoom; },
    setTime(i) { timeMode = i; }, rain(v) { wxMode = v ? "rain" : "dry"; updateWeather(); wet = v ? 1 : 0; }, season(s) { seasonMode = s; updateSeason(); }, go: goPlayer, get chess() { return chessState; }, train(d) { train = { dir: d || 1, at: Date.now() + timeOff - 15000 }; },
    setQ(t) { qPref = t; applyTier(t); }, get perf() { return { fps: perf.fps, scale, tier }; } };
  let last = performance.now();
  function frame(now) { const dt = Math.min(.05, (now - last) / 1000), rawDt = (now - last) / 1000; last = now; const t = now / 1000;
    update(dt, t); if (!STILL || window.__snap || captureCb) { render(dt, t); if (window.__snap) { const f = window.__snap; window.__snap = null; f(); } } else updateCam(dt);
    if (started) adapt(Math.min(rawDt, .5));
    if (player) Snd.setListener([player.x, groundY(player.x, player.z) + (player.state === "sit" ? 1.1 : 1.6), player.z], [-Math.sin(cam.yaw), 0, -Math.cos(cam.yaw)]);
    hudT -= dt; if (hudT <= 0) { hudT = .25; refreshHUD(); } requestAnimationFrame(frame); }
  updateCam(0); requestAnimationFrame(frame);
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost") && !qs.has("debug")) navigator.serviceWorker.register("sw.js").catch(() => { });
}
if (window.THREE) setTimeout(boot, 0);
else { addEventListener("three-ready", () => setTimeout(boot, 0), { once: true });
  setTimeout(() => { if (!window.THREE) $("bootLoad").querySelector("span").textContent = "Không tải được thư viện đồ hoạ (js/vendor/three.module.min.js). Kiểm tra file đã được tải lên đầy đủ chưa, rồi tải lại trang."; }, 30000); }
})();
