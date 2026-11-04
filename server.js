// Trà Đá Phố Cổ 3D – máy chủ nhiều người chơi, KHÔNG cần thư viện ngoài (Node >= 18)
// Chạy: node server.js  → mở http://localhost:8080
"use strict";
const http = require("http"), fs = require("fs"), path = require("path"), crypto = require("crypto");

const PORT = process.env.PORT || 8080;
const ROOM_CAP = 15;                                   // = số ghế nhựa trong quán
const MAX_CONN = Number(process.env.MAX_CONN || 600);
const MAX_PER_IP = Number(process.env.MAX_PER_IP || 6);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "";
const LIM = { n: 14, d: 14, s: 10, p: 5, k: 4, h: 2, a: 6 }; // khớp với danh sách trong js/game.js
const ACTS = new Set(["sip", "seed", "nod"]);
// khu vực được đi lại: phố (x 4..204, z -8.6..8) và bờ hồ (x 204..221, z -80..80)
const inArea = (x, z) => (x >= 4 && x < 204 && z >= -8.6 && z <= 8) || (x >= 204 && x <= 221 && z >= -80 && z <= 80);
const PUBLIC = path.join(__dirname, "public");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".ogg": "audio/ogg", ".wav": "audio/wav", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml" };

const server = http.createServer((req, res) => {
  let url; try { url = decodeURIComponent((req.url || "/").split("?")[0]); } catch (e) { url = "/"; }
  if (url === "/health") { res.writeHead(200, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: true, online: clients.size, rooms: rooms.size })); }
  if (url === "/") url = "/index.html";
  const file = path.normalize(path.join(PUBLIC, url)), ext = path.extname(file).toLowerCase();
  const nf = () => { res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }); res.end("Không có gì ở đây cả."); };
  if (!file.startsWith(PUBLIC + path.sep) || !TYPES[ext]) return nf();
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return nf();
    res.writeHead(200, { "content-type": TYPES[ext], "content-length": st.size, "cache-control": ext === ".html" ? "no-cache" : "public, max-age=3600", "x-content-type-options": "nosniff" });
    fs.createReadStream(file).pipe(res);
  });
});

/* ---------- Phòng (quán) ---------- */
const rooms = new Map(), clients = new Set(), ipCount = new Map();
let nextPid = 1;
function findRoom() {
  for (const r of [...rooms.values()].sort((a, b) => a.id - b.id)) if (r.players.size < ROOM_CAP) return r;
  let id = 1; while (rooms.has(id)) id++;
  const r = { id, players: new Map() }; rooms.set(id, r); return r;
}
const pub = c => ({ id: c.pid, n: c.name, l: c.look, s: c.stool, x: c.x, z: c.z });
function broadcast(room, obj, except) { const s = JSON.stringify(obj); for (const c of room.players.values()) if (c !== except) send(c, s); }
const int = (v, max) => Number.isInteger(v) && v >= 0 && v < max;
const num = (v, a, b) => typeof v === "number" && isFinite(v) && v >= a && v <= b;

function onMessage(c, text) {
  let m; try { m = JSON.parse(text); } catch (e) { return; }
  if (!m || typeof m.t !== "string") return;
  const now = Date.now();
  if (now - c.winStart > 1000) { c.winStart = now; c.winCount = 0; }
  if (++c.winCount > 10) return;                       // tối đa 10 tin/giây

  if (m.t === "hello" && !c.room) {
    const n = Array.isArray(m.n) ? m.n : [], l = m.l || {};
    if (!int(n[0], LIM.n) || !int(n[1], LIM.d)) return kill(c);
    const look = {};
    for (const k of ["s", "p", "k", "h", "a"]) { if (!int(l[k], LIM[k])) return kill(c); look[k] = l[k]; }
    c.name = [n[0], n[1]]; c.look = look; c.pid = nextPid++; c.stool = null; c.x = 70; c.z = -5.5;
    const room = findRoom(); c.room = room;
    send(c, JSON.stringify({ t: "welcome", id: c.pid, room: room.id, players: [...room.players.values()].map(pub) }));
    room.players.set(c.pid, c);
    broadcast(room, { t: "join", p: pub(c) }, c);
    return;
  }
  if (!c.room) return;
  if (m.t === "sit") {
    if (!int(m.s, ROOM_CAP)) return;
    for (const o of c.room.players.values()) if (o !== c && o.stool === m.s) return send(c, JSON.stringify({ t: "deny", s: m.s }));
    c.stool = m.s;
    broadcast(c.room, { t: "sit", id: c.pid, s: m.s });
  } else if (m.t === "go") {
    if (!num(m.x, -100, 400) || !num(m.z, -100, 100) || !inArea(m.x, m.z)) return;
    c.stool = null; c.x = Math.round(m.x * 10) / 10; c.z = Math.round(m.z * 10) / 10;
    broadcast(c.room, { t: "go", id: c.pid, x: c.x, z: c.z }, c);
  } else if (m.t === "act") {
    if (!ACTS.has(m.a) || c.stool === null) return;
    broadcast(c.room, { t: "act", id: c.pid, a: m.a }, c);
  }
}
function onClose(c) {
  if (c.closed) return; c.closed = true; clients.delete(c);
  const n = (ipCount.get(c.ip) || 1) - 1; n > 0 ? ipCount.set(c.ip, n) : ipCount.delete(c.ip);
  if (c.room) { c.room.players.delete(c.pid); broadcast(c.room, { t: "leave", id: c.pid }); if (c.room.players.size === 0) rooms.delete(c.room.id); }
}

/* ---------- WebSocket tối giản (RFC 6455) ---------- */
server.on("upgrade", (req, socket) => {
  const url = (req.url || "").split("?")[0], key = req.headers["sec-websocket-key"];
  const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  if (url !== "/ws" || !key || String(req.headers.upgrade).toLowerCase() !== "websocket") return socket.destroy();
  if (ALLOWED_ORIGIN && req.headers.origin !== ALLOWED_ORIGIN) return socket.destroy();
  if (clients.size >= MAX_CONN || (ipCount.get(ip) || 0) >= MAX_PER_IP) { socket.end("HTTP/1.1 503 Service Unavailable\r\n\r\n"); return; }
  const accept = crypto.createHash("sha1").update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest("base64");
  socket.write("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: " + accept + "\r\n\r\n");
  socket.setNoDelay(true);
  const c = { socket, ip, buf: Buffer.alloc(0), alive: true, room: null, winStart: 0, winCount: 0, closed: false };
  clients.add(c); ipCount.set(ip, (ipCount.get(ip) || 0) + 1);
  socket.on("data", d => { c.buf = Buffer.concat([c.buf, d]); if (c.buf.length > 8192) return kill(c); parse(c); });
  socket.on("close", () => onClose(c)); socket.on("error", () => onClose(c));
});
function parse(c) {
  while (c.buf.length >= 2) {
    const b0 = c.buf[0], b1 = c.buf[1], fin = b0 & 0x80, op = b0 & 0x0f, masked = b1 & 0x80;
    let len = b1 & 0x7f, off = 2;
    if (len === 126) { if (c.buf.length < 4) return; len = c.buf.readUInt16BE(2); off = 4; }
    else if (len === 127) return kill(c);
    if (!masked || len > 2048) return kill(c);
    if (c.buf.length < off + 4 + len) return;
    const mask = c.buf.subarray(off, off + 4), data = Buffer.allocUnsafe(len);
    for (let i = 0; i < len; i++) data[i] = c.buf[off + 4 + i] ^ mask[i & 3];
    c.buf = c.buf.subarray(off + 4 + len);
    if (!fin || op === 0) return kill(c);
    if (op === 1) onMessage(c, data.toString("utf8"));
    else if (op === 8) return kill(c);
    else if (op === 9) frame(c, 0x8a, data);
    else if (op === 10) c.alive = true;
  }
}
function frame(c, opcode, payload) {
  if (c.closed || c.socket.destroyed) return;
  const len = payload.length;
  const head = len < 126 ? Buffer.from([opcode, len]) : Buffer.from([opcode, 126, len >> 8, len & 255]);
  c.socket.write(Buffer.concat([head, payload]));
}
function send(c, str) { frame(c, 0x81, Buffer.from(str, "utf8")); }
function kill(c) { try { c.socket.write(Buffer.from([0x88, 0])); } catch (e) {} c.socket.destroy(); onClose(c); }
setInterval(() => { for (const c of clients) { if (!c.alive) { kill(c); continue; } c.alive = false; frame(c, 0x89, Buffer.alloc(0)); } }, 25000);

server.listen(PORT, () => console.log("Trà Đá Phố Cổ 3D đang mở ở cổng " + PORT));
