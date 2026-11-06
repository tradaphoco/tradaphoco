// Trà Đá Phố Cổ 3D – máy chủ nhiều người chơi, KHÔNG cần thư viện ngoài (Node >= 18)
// Chạy: node server.js  → mở http://localhost:8080 ; trang quản trị: http://localhost:8080/admin
// Bản 6.2: lưu dữ liệu lâu dài (Upstash Redis miễn phí hoặc file), báo cáo người chơi, trang quản trị, thống kê sử dụng.
"use strict";
const http = require("http"), fs = require("fs"), path = require("path"), crypto = require("crypto"), zlib = require("zlib");
const Lib = require("./public/js/room.js"), { Room } = Lib;

const PORT = process.env.PORT || 8080;
const MAX_CONN = Number(process.env.MAX_CONN || 600), MAX_PER_IP = Number(process.env.MAX_PER_IP || 6);
const ORIGINS = (process.env.ALLOWED_ORIGIN || "").split(",").map(s => s.trim().replace(/\/$/, "")).filter(Boolean);
const ADMIN_KEY = process.env.ADMIN_KEY || process.env.STATS_KEY || "";
const UP_URL = (process.env.UPSTASH_REDIS_REST_URL || "").replace(/\/$/, ""), UP_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";
const PUBLIC = path.join(__dirname, "public"), DATA = path.join(__dirname, "data"), ADMIN_HTML = path.join(__dirname, "admin", "index.html");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".webmanifest": "application/manifest+json", ".txt": "text/plain; charset=utf-8",
  ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".ogg": "audio/ogg", ".wav": "audio/wav", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".glb": "model/gltf-binary", ".ktx2": "image/ktx2" };
const GZ = new Set([".html", ".js", ".css", ".webmanifest", ".json", ".svg", ".txt", ".glb"]), gzCache = new Map();

/* ---------- Lưu trữ lâu dài: Upstash Redis (qua HTTPS) nếu có cấu hình, nếu không thì file trong data/ ---------- */
const Store = {
  kind: UP_URL && UP_TOKEN ? "upstash" : "file",
  async get(k, def) {
    try {
      if (this.kind === "upstash") { const r = await fetch(UP_URL + "/get/tdpc:" + k, { headers: { Authorization: "Bearer " + UP_TOKEN } }); const j = await r.json(); return j.result ? JSON.parse(j.result) : def; }
      return JSON.parse(fs.readFileSync(path.join(DATA, k + ".json"), "utf8"));
    } catch (e) { return def; }
  },
  async set(k, v) {
    try {
      const s = JSON.stringify(v);
      if (this.kind === "upstash") { await fetch(UP_URL + "/set/tdpc:" + k, { method: "POST", headers: { Authorization: "Bearer " + UP_TOKEN }, body: s }); return; }
      fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(path.join(DATA, k + ".json"), s);
    } catch (e) { M.errors++; note("lưu " + k + " lỗi: " + e.message); }
  }
};
const DB = { gb: [], reports: [], bans: {}, blocked: [], stats: { days: {} }, salt: "" };
const dirty = new Set(); const mark = k => dirty.add(k);
async function flush() { const ks = [...dirty]; dirty.clear(); for (const k of ks) await Store.set(k, DB[k]); }
setInterval(flush, 20000);
for (const sig of ["SIGTERM", "SIGINT"]) process.on(sig, async () => { await flush(); process.exit(0); });

/* ---------- Số liệu theo dõi ---------- */
const M = { start: Date.now(), conns: 0, peak: 0, msgs: 0, rejected: 0, errors: 0, msgWin: [], log: [] };
function note(s) { M.log.push(new Date().toISOString().slice(11, 19) + " " + s); if (M.log.length > 80) M.log.shift(); }
setInterval(() => { M.msgWin.push(M.msgs); M.msgs = 0; if (M.msgWin.length > 60) M.msgWin.shift(); }, 1000);
const today = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10); // ngày theo giờ Hà Nội
function day() { const d = today(), D = DB.stats.days; if (!D[d]) { D[d] = { visitors: 0, sessions: 0, secs: 0, peak: 0, reports: 0, ev: {}, stamps: {}, seen: [] };
    const ks = Object.keys(D).sort(); while (ks.length > 90) delete D[ks.shift()]; } return D[d]; }
function statEv(k, v) { const d = day(); d.ev[k] = (d.ev[k] || 0) + 1; if (k === "stamp" && v) d.stamps[v] = (d.stamps[v] || 0) + 1; mark("stats"); }
const hashIp = ip => crypto.createHash("sha256").update(DB.salt + "|" + ip).digest("hex").slice(0, 16);

/* ---------- Thời tiết Hà Nội thật (Open-Meteo, không cần khoá) ---------- */
let WX = null;
async function fetchWx() {
  try { const r = await fetch("https://api.open-meteo.com/v1/forecast?latitude=21.0285&longitude=105.8542&current=temperature_2m,weather_code,is_day,wind_speed_10m&timezone=Asia%2FBangkok");
    const j = await r.json(), c = j.current; WX = { temp: Math.round(c.temperature_2m), code: c.weather_code, wind: c.wind_speed_10m, ts: Date.now() };
    for (const room of rooms.values()) room.bc({ t: "wx", v: WX }); } catch (e) { M.errors++; note("thời tiết lỗi: " + e.message); }
}
setTimeout(fetchWx, 2000); setInterval(fetchWx, 10 * 60 * 1000);

/* ---------- Web ---------- */
function json(res, code, obj, cors) { const h = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }; if (cors) h["access-control-allow-origin"] = cors; res.writeHead(code, h); res.end(JSON.stringify(obj)); }
function body(req) { return new Promise(res => { let b = ""; req.on("data", d => { b += d; if (b.length > 20000) req.destroy(); }); req.on("end", () => { try { res(JSON.parse(b || "{}")); } catch (e) { res({}); } }); }); }
const adminOk = k => ADMIN_KEY && typeof k === "string" && k.length === ADMIN_KEY.length && crypto.timingSafeEqual(Buffer.from(k), Buffer.from(ADMIN_KEY));
const adminFails = new Map();
const server = http.createServer(async (req, res) => {
  let url; try { url = decodeURIComponent((req.url || "/").split("?")[0]); } catch (e) { url = "/"; }
  const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  if (url === "/health") return json(res, 200, { ok: true, online: clients.size, rooms: rooms.size, store: Store.kind }, "*");
  if (url === "/admin" || url === "/admin/") { fs.readFile(ADMIN_HTML, (e, d) => { if (e) { res.writeHead(404); return res.end("Thiếu admin/index.html"); } res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-frame-options": "DENY" }); res.end(d); }); return; }
  if (url.startsWith("/api/admin/")) {
    if (!ADMIN_KEY) return json(res, 403, { error: "Chưa đặt biến môi trường ADMIN_KEY trên máy chủ." });
    const f = adminFails.get(ip) || { n: 0, t: 0 }; if (f.n >= 8 && Date.now() - f.t < 15 * 60e3) return json(res, 429, { error: "Sai khoá quá nhiều lần. Thử lại sau 15 phút." });
    const b = req.method === "POST" ? await body(req) : {}; const key = b.key || new URL(req.url, "http://x").searchParams.get("key");
    if (!adminOk(key)) { adminFails.set(ip, { n: f.n + 1, t: Date.now() }); return json(res, 403, { error: "Sai khoá quản trị." }); }
    adminFails.delete(ip);
    if (url === "/api/admin/state") return json(res, 200, adminState());
    if (url === "/api/admin/act" && req.method === "POST") { try { const r = adminAct(b); note("quản trị: " + b.op); return json(res, 200, r); } catch (e) { return json(res, 400, { error: e.message }); } }
    return json(res, 404, { error: "Không có" });
  }
  if (url === "/stats") return json(res, 403, { error: "Đã chuyển sang trang /admin" });
  if (url === "/") url = "/index.html";
  const file = path.normalize(path.join(PUBLIC, url)), ext = path.extname(file).toLowerCase();
  const nf = () => { res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }); res.end("Không có gì ở đây cả."); };
  if (!file.startsWith(PUBLIC + path.sep) || !TYPES[ext]) return nf();
  fs.stat(file, (err, st) => { if (err || !st.isFile()) return nf();
    const head = { "content-type": TYPES[ext], "cache-control": ext === ".html" || url === "/sw.js" ? "no-cache" : "public, max-age=3600", "x-content-type-options": "nosniff", "vary": "accept-encoding" };
    if (GZ.has(ext) && /\bgzip\b/.test(req.headers["accept-encoding"] || "")) {
      const c = gzCache.get(file); if (c && c.mtime === st.mtimeMs) { res.writeHead(200, Object.assign(head, { "content-encoding": "gzip", "content-length": c.buf.length })); return res.end(c.buf); }
      return fs.readFile(file, (e, data) => { if (e) return nf(); const buf = zlib.gzipSync(data, { level: 9 }); gzCache.set(file, { mtime: st.mtimeMs, buf }); res.writeHead(200, Object.assign(head, { "content-encoding": "gzip", "content-length": buf.length })); res.end(buf); }); }
    res.writeHead(200, Object.assign(head, { "content-length": st.size })); fs.createReadStream(file).pipe(res); });
});

/* ---------- Quản trị ---------- */
function adminState() {
  const mps = M.msgWin.length ? M.msgWin.reduce((a, b) => a + b, 0) / M.msgWin.length : 0, days = {};
  for (const [d, v] of Object.entries(DB.stats.days)) { const { seen, ...rest } = v; days[d] = rest; }
  return { store: Store.kind, uptimeMin: Math.round((Date.now() - M.start) / 60000), online: clients.size, peak: M.peak, errors: M.errors, msgsPerSec: Math.round(mps * 10) / 10,
    memoryMB: Math.round(process.memoryUsage().rss / 1048576), weather: WX,
    rooms: [...rooms.values()].map(r => ({ room: r.id, npcs: r.npcs.size, order: r.order.st, players: r.list().map(p => { const c = byPid.get(p.id); return Object.assign(p, { ip: c ? c.ipHash : "" }); }) })),
    reports: DB.reports.slice(-100).reverse(), bans: DB.bans, blocked: DB.blocked, gb: DB.gb.slice(-40).reverse(), days, recent: M.log.slice(-30) };
}
function findPlayer(pid) { const c = byPid.get(Number(pid)); if (!c || !c.room) throw new Error("Người chơi đã rời quán."); return c; }
function adminAct(b) {
  switch (b.op) {
    case "hideName": { const c = findPlayer(b.pid); c.room.forceName(c.pid); return { ok: true }; }
    case "kick": { const c = findPlayer(b.pid); send(c, JSON.stringify({ t: "notice", text: "Bạn đã bị mời rời quán vì vi phạm nội quy." })); setTimeout(() => kill(c), 300); return { ok: true }; }
    case "ban": { const h = b.ip || findPlayer(b.pid).ipHash, days = Math.max(1, Math.min(365, Number(b.days) || 7)); DB.bans[h] = { until: Date.now() + days * 864e5, why: String(b.why || "").slice(0, 100) }; mark("bans");
      for (const c of clients) if (c.ipHash === h) { send(c, JSON.stringify({ t: "notice", text: "Bạn đã bị tạm khoá " + days + " ngày vì vi phạm nội quy." })); setTimeout(() => kill(c), 300); } return { ok: true }; }
    case "unban": delete DB.bans[b.ip]; mark("bans"); return { ok: true };
    case "block": { const k = Lib.keyOf(b.word || ""); if (k.length < 2) throw new Error("Từ quá ngắn."); if (!DB.blocked.includes(k)) DB.blocked.push(k); Lib.EXTRA_BLOCK.add(k); mark("blocked"); return { ok: true }; }
    case "unblock": DB.blocked = DB.blocked.filter(w => w !== b.word); Lib.EXTRA_BLOCK.delete(b.word); mark("blocked"); return { ok: true };
    case "resolve": { const r = DB.reports.find(x => x.id === b.id); if (r) { r.done = String(b.result || "Đã xem"); mark("reports"); } return { ok: true }; }
    case "delGb": DB.gb = DB.gb.filter(e => e.ts !== Number(b.ts)); for (const r of rooms.values()) r.gb = DB.gb; mark("gb"); return { ok: true };
    case "announce": { const text = String(b.text || "").slice(0, 200).trim(); if (!text) throw new Error("Chưa có nội dung."); const s = JSON.stringify({ t: "notice", text, from: "admin" }); for (const c of clients) if (c.room) send(c, s); return { ok: true, sent: clients.size }; }
  }
  throw new Error("Thao tác không hợp lệ.");
}

/* ---------- Phòng ---------- */
const rooms = new Map(), clients = new Set(), ipCount = new Map(), byPid = new Map(); let nextPid = 1;
function makeRoom() { let id = 1; while (rooms.has(id)) id++;
  const room = new Room(id, (to, obj, except) => { const s = JSON.stringify(obj); for (const c of room.clients) { if (to === null ? c.pid !== except : c.pid === to) send(c, s); } }, {
    gb: DB.gb, gbSave: l => { DB.gb = l; mark("gb"); }, onEvent: statEv,
    onReport: r => { const tc = r.target ? byPid.get(r.target) : null, bc = byPid.get(r.by);
      DB.reports.push(Object.assign({ id: crypto.randomBytes(5).toString("hex"), ts: Date.now(), ip: tc ? tc.ipHash : "", byIp: bc ? bc.ipHash : "" }, r)); if (DB.reports.length > 500) DB.reports.splice(0, DB.reports.length - 500);
      day().reports++; mark("reports"); mark("stats"); note("báo cáo: " + r.name + " (" + r.reason + ")");
      // tự ẩn tên khi một tên bị từ 3 người khác nhau báo cáo trong 30 phút
      if (tc && r.target) { const recent = new Set(DB.reports.filter(x => x.ip === tc.ipHash && Date.now() - x.ts < 30 * 60e3).map(x => x.byIp)); if (recent.size >= 3) { room.forceName(r.target, "Tên của bạn bị nhiều người báo cáo nên tạm thời được ẩn."); note("tự ẩn tên " + r.name); } } } });
  room.clients = new Set(); rooms.set(id, room); note("mở quán số " + id); return room; }
function findRoom() { for (const r of [...rooms.values()].sort((a, b) => a.id - b.id)) if (r.size < 15) return r; return makeRoom(); }
setInterval(() => { for (const r of rooms.values()) { try { r.tick(1); } catch (e) { M.errors++; note("lỗi tick: " + e.message); } } }, 1000);

function onMessage(c, text) { let m; try { m = JSON.parse(text); } catch (e) { return; } if (!m || typeof m.t !== "string") return;
  const now = Date.now(); if (now - c.winStart > 1000) { c.winStart = now; c.winCount = 0; } if (++c.winCount > 12) return; M.msgs++;
  if (m.t === "hello" && !c.room) { if (WX) send(c, JSON.stringify({ t: "wx", v: WX })); const room = findRoom(); c.pid = nextPid++; room.clients.add(c); c.room = room; byPid.set(c.pid, c);
    if (!room.join(c.pid, m)) { room.clients.delete(c); c.room = null; return kill(c); }
    const d = day(); d.sessions++; if (!d.seen.includes(c.ipHash)) { d.seen.push(c.ipHash); d.visitors++; } d.peak = Math.max(d.peak, clients.size); mark("stats"); return; }
  if (c.room) { try { c.room.msg(c.pid, m); } catch (e) { M.errors++; note("lỗi xử lý: " + e.message); } } }
function onClose(c) { if (c.closed) return; c.closed = true; clients.delete(c); const n = (ipCount.get(c.ip) || 1) - 1; n > 0 ? ipCount.set(c.ip, n) : ipCount.delete(c.ip);
  if (c.pid) { byPid.delete(c.pid); day().secs += Math.round((Date.now() - c.t0) / 1000); mark("stats"); }
  if (c.room) { c.room.clients.delete(c); c.room.leave(c.pid); if (c.room.size === 0) { rooms.delete(c.room.id); note("đóng quán số " + c.room.id); } } }

/* ---------- WebSocket tối giản (RFC 6455) ---------- */
server.on("upgrade", (req, socket) => {
  const url = (req.url || "").split("?")[0], key = req.headers["sec-websocket-key"], ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  const origin = (req.headers.origin || "").replace(/\/$/, ""), sameHost = origin && origin.replace(/^https?:\/\//, "") === req.headers.host;
  if (url !== "/ws" || !key || String(req.headers.upgrade).toLowerCase() !== "websocket") return socket.destroy();
  if (ORIGINS.length && !sameHost && !ORIGINS.includes(origin)) { M.rejected++; note("chặn origin " + origin); return socket.destroy(); }
  const ipHash = hashIp(ip), ban = DB.bans[ipHash];
  if (ban && ban.until > Date.now()) { M.rejected++; socket.end("HTTP/1.1 403 Forbidden\r\n\r\n"); return; }
  if (clients.size >= MAX_CONN || (ipCount.get(ip) || 0) >= MAX_PER_IP) { M.rejected++; socket.end("HTTP/1.1 503 Service Unavailable\r\n\r\n"); return; }
  const accept = crypto.createHash("sha1").update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest("base64");
  socket.write("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: " + accept + "\r\n\r\n"); socket.setNoDelay(true);
  const c = { socket, ip, ipHash, t0: Date.now(), buf: Buffer.alloc(0), alive: true, room: null, winStart: 0, winCount: 0, closed: false };
  clients.add(c); ipCount.set(ip, (ipCount.get(ip) || 0) + 1); M.conns++; M.peak = Math.max(M.peak, clients.size);
  socket.on("data", d => { c.buf = Buffer.concat([c.buf, d]); if (c.buf.length > 8192) return kill(c); parse(c); });
  socket.on("close", () => onClose(c)); socket.on("error", () => onClose(c));
});
function parse(c) { while (c.buf.length >= 2) { const b0 = c.buf[0], b1 = c.buf[1], fin = b0 & 0x80, op = b0 & 0x0f, masked = b1 & 0x80; let len = b1 & 0x7f, off = 2;
    if (len === 126) { if (c.buf.length < 4) return; len = c.buf.readUInt16BE(2); off = 4; } else if (len === 127) return kill(c);
    if (!masked || len > 2048) return kill(c); if (c.buf.length < off + 4 + len) return;
    const mask = c.buf.subarray(off, off + 4), data = Buffer.allocUnsafe(len); for (let i = 0; i < len; i++) data[i] = c.buf[off + 4 + i] ^ mask[i & 3]; c.buf = c.buf.subarray(off + 4 + len);
    if (!fin || op === 0) return kill(c); if (op === 1) onMessage(c, data.toString("utf8")); else if (op === 8) return kill(c); else if (op === 9) frame(c, 0x8a, data); else if (op === 10) c.alive = true; } }
function frame(c, opcode, payload) { if (c.closed || c.socket.destroyed) return; const len = payload.length;
  const head = len < 126 ? Buffer.from([opcode, len]) : len < 65536 ? Buffer.from([opcode, 126, len >> 8, len & 255]) : null; if (!head) return; c.socket.write(Buffer.concat([head, payload])); }
function send(c, str) { frame(c, 0x81, Buffer.from(str, "utf8")); }
function kill(c) { try { c.socket.write(Buffer.from([0x88, 0])); } catch (e) { } c.socket.destroy(); onClose(c); }
setInterval(() => { for (const c of clients) { if (!c.alive) { kill(c); continue; } c.alive = false; frame(c, 0x89, Buffer.alloc(0)); } }, 25000);
setInterval(() => console.log(`[theo dõi] online=${clients.size} quán=${rooms.size} đỉnh=${M.peak} lỗi=${M.errors} lưu=${Store.kind}`), 5 * 60 * 1000);
process.on("uncaughtException", e => { M.errors++; note("uncaught: " + e.message); console.error(e); });

(async () => {
  for (const k of ["gb", "reports", "bans", "blocked", "stats"]) DB[k] = await Store.get(k, DB[k]);
  DB.salt = await Store.get("salt", ""); if (!DB.salt) { DB.salt = crypto.randomBytes(16).toString("hex"); await Store.set("salt", DB.salt); }
  if (!DB.stats.days) DB.stats = { days: {} }; for (const w of DB.blocked) Lib.EXTRA_BLOCK.add(w);
  for (const [h, b] of Object.entries(DB.bans)) if (b.until < Date.now()) delete DB.bans[h];
  server.listen(PORT, () => console.log("Trà Đá Phố Cổ 3D đang mở ở cổng " + PORT + " · lưu dữ liệu: " + (Store.kind === "upstash" ? "Upstash Redis" : "file data/ (sẽ mất khi Render khởi động lại)") + (ADMIN_KEY ? "" : " · CHƯA đặt ADMIN_KEY")));
})();
