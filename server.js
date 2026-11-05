// Trà Đá Phố Cổ 3D – máy chủ nhiều người chơi, KHÔNG cần thư viện ngoài (Node >= 18)
// Chạy: node server.js  → mở http://localhost:8080
"use strict";
const http = require("http"), fs = require("fs"), path = require("path"), crypto = require("crypto");
const { Room } = require("./public/js/room.js");

const PORT = process.env.PORT || 8080;
const MAX_CONN = Number(process.env.MAX_CONN || 600), MAX_PER_IP = Number(process.env.MAX_PER_IP || 6);
const ORIGINS = (process.env.ALLOWED_ORIGIN || "").split(",").map(s => s.trim().replace(/\/$/, "")).filter(Boolean);
const STATS_KEY = process.env.STATS_KEY || "";
const PUBLIC = path.join(__dirname, "public"), DATA = path.join(__dirname, "data");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".webmanifest": "application/manifest+json",
  ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".ogg": "audio/ogg", ".wav": "audio/wav", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon" };

/* ---------- Số liệu theo dõi ---------- */
const M = { start: Date.now(), conns: 0, peak: 0, msgs: 0, rejected: 0, errors: 0, msgWin: [], log: [] };
function note(s) { M.log.push(new Date().toISOString().slice(11, 19) + " " + s); if (M.log.length > 50) M.log.shift(); }
setInterval(() => { M.msgWin.push(M.msgs); M.msgs = 0; if (M.msgWin.length > 60) M.msgWin.shift(); }, 1000);

/* ---------- Thời tiết Hà Nội thật (Open-Meteo, không cần khoá) ---------- */
let WX = null;
async function fetchWx() {
  try { const r = await fetch("https://api.open-meteo.com/v1/forecast?latitude=21.0285&longitude=105.8542&current=temperature_2m,weather_code,is_day,wind_speed_10m&timezone=Asia%2FBangkok");
    const j = await r.json(), c = j.current; WX = { temp: Math.round(c.temperature_2m), code: c.weather_code, wind: c.wind_speed_10m, ts: Date.now() };
    for (const room of rooms.values()) room.bc({ t: "wx", v: WX }); } catch (e) { M.errors++; note("thời tiết lỗi: " + e.message); }
}
setTimeout(fetchWx, 2000); setInterval(fetchWx, 10 * 60 * 1000);

/* ---------- Sổ lưu bút ---------- */
let GBOOK = []; try { GBOOK = JSON.parse(fs.readFileSync(path.join(DATA, "guestbook.json"), "utf8")); } catch (e) { }
let gbTimer = 0; function saveGb(list) { GBOOK = list; clearTimeout(gbTimer); gbTimer = setTimeout(() => { try { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(path.join(DATA, "guestbook.json"), JSON.stringify(GBOOK)); } catch (e) { } }, 2000); }

/* ---------- Web ---------- */
const server = http.createServer((req, res) => {
  let url; try { url = decodeURIComponent((req.url || "/").split("?")[0]); } catch (e) { url = "/"; }
  if (url === "/health") { res.writeHead(200, { "content-type": "application/json", "access-control-allow-origin": "*" }); return res.end(JSON.stringify({ ok: true, online: clients.size, rooms: rooms.size })); }
  if (url === "/stats") { const key = new URL(req.url, "http://x").searchParams.get("key") || "";
    if (STATS_KEY && key !== STATS_KEY) { res.writeHead(403); return res.end("Cần ?key=..."); }
    const per = [...rooms.values()].map(r => ({ room: r.id, players: r.size, named: [...r.players.values()].filter(p => p.nm).length, npcs: r.npcs.size, seated: r.stools.filter(v => v !== null).length, order: r.order.st, chess: r.chess.seats }));
    const mps = M.msgWin.length ? M.msgWin.reduce((a, b) => a + b, 0) / M.msgWin.length : 0;
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify({ uptimeMin: Math.round((Date.now() - M.start) / 60000), online: clients.size, peak: M.peak, totalConnections: M.conns, rejected: M.rejected, errors: M.errors,
      msgsPerSec: Math.round(mps * 10) / 10, memoryMB: Math.round(process.memoryUsage().rss / 1048576), weather: WX, rooms: per, guestbook: GBOOK.length, recent: M.log.slice(-15) }, null, 2)); }
  if (url === "/") url = "/index.html";
  const file = path.normalize(path.join(PUBLIC, url)), ext = path.extname(file).toLowerCase();
  const nf = () => { res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }); res.end("Không có gì ở đây cả."); };
  if (!file.startsWith(PUBLIC + path.sep) || !TYPES[ext]) return nf();
  fs.stat(file, (err, st) => { if (err || !st.isFile()) return nf();
    res.writeHead(200, { "content-type": TYPES[ext], "content-length": st.size, "cache-control": ext === ".html" || url === "/sw.js" ? "no-cache" : "public, max-age=3600", "x-content-type-options": "nosniff" });
    fs.createReadStream(file).pipe(res); });
});

/* ---------- Phòng ---------- */
const rooms = new Map(), clients = new Set(), ipCount = new Map(); let nextPid = 1;
function makeRoom() { let id = 1; while (rooms.has(id)) id++;
  const room = new Room(id, (to, obj, except) => { const s = JSON.stringify(obj); for (const c of room.clients) { if (to === null ? c.pid !== except : c.pid === to) send(c, s); } }, { gb: GBOOK, gbSave: saveGb });
  room.clients = new Set(); rooms.set(id, room); note("mở quán số " + id); return room; }
function findRoom() { for (const r of [...rooms.values()].sort((a, b) => a.id - b.id)) if (r.size < 15) return r; return makeRoom(); }
setInterval(() => { for (const r of rooms.values()) { try { r.tick(1); } catch (e) { M.errors++; note("lỗi tick: " + e.message); } } }, 1000);

function onMessage(c, text) { let m; try { m = JSON.parse(text); } catch (e) { return; } if (!m || typeof m.t !== "string") return;
  const now = Date.now(); if (now - c.winStart > 1000) { c.winStart = now; c.winCount = 0; } if (++c.winCount > 12) return; M.msgs++;
  if (m.t === "hello" && !c.room) { if (WX) send(c, JSON.stringify({ t: "wx", v: WX })); const room = findRoom(); c.pid = nextPid++; room.clients.add(c); c.room = room;
    if (!room.join(c.pid, m)) { room.clients.delete(c); c.room = null; return kill(c); } return; }
  if (c.room) { try { c.room.msg(c.pid, m); } catch (e) { M.errors++; note("lỗi xử lý: " + e.message); } } }
function onClose(c) { if (c.closed) return; c.closed = true; clients.delete(c); const n = (ipCount.get(c.ip) || 1) - 1; n > 0 ? ipCount.set(c.ip, n) : ipCount.delete(c.ip);
  if (c.room) { c.room.clients.delete(c); c.room.leave(c.pid); if (c.room.size === 0) { rooms.delete(c.room.id); note("đóng quán số " + c.room.id); } } }

/* ---------- WebSocket tối giản (RFC 6455) ---------- */
server.on("upgrade", (req, socket) => {
  const url = (req.url || "").split("?")[0], key = req.headers["sec-websocket-key"], ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  const origin = (req.headers.origin || "").replace(/\/$/, ""), sameHost = origin && origin.replace(/^https?:\/\//, "") === req.headers.host;
  if (url !== "/ws" || !key || String(req.headers.upgrade).toLowerCase() !== "websocket") return socket.destroy();
  if (ORIGINS.length && !sameHost && !ORIGINS.includes(origin)) { M.rejected++; note("chặn origin " + origin); return socket.destroy(); }
  if (clients.size >= MAX_CONN || (ipCount.get(ip) || 0) >= MAX_PER_IP) { M.rejected++; socket.end("HTTP/1.1 503 Service Unavailable\r\n\r\n"); return; }
  const accept = crypto.createHash("sha1").update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest("base64");
  socket.write("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: " + accept + "\r\n\r\n"); socket.setNoDelay(true);
  const c = { socket, ip, buf: Buffer.alloc(0), alive: true, room: null, winStart: 0, winCount: 0, closed: false };
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
setInterval(() => console.log(`[theo dõi] online=${clients.size} quán=${rooms.size} đỉnh=${M.peak} lỗi=${M.errors}`), 5 * 60 * 1000);
process.on("uncaughtException", e => { M.errors++; note("uncaught: " + e.message); console.error(e); });

server.listen(PORT, () => console.log("Trà Đá Phố Cổ 3D đang mở ở cổng " + PORT));
