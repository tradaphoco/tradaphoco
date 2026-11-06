/* Trà Đá Phố Cổ — "quán": luật đồng bộ chung cho mọi người trong một phòng.
   Máy chủ chạy file này cho chế độ nhiều người; trình duyệt chạy chính file này khi ngồi một mình,
   nên hai chế độ hành xử giống hệt nhau.
   Bản 6.2: thêm báo cáo người chơi, ghi nhận sự kiện (thống kê), và các thao tác quản trị (ẩn tên). */
(function (root) {
  "use strict";
  const XQ = (typeof module !== "undefined" && module.exports) ? require("./xiangqi.js") : root.XQ;
  const CAP = 15, LIM = { n: 14, d: 14, s: 10, p: 5, k: 4, h: 2, a: 6 };
  const ACTS = new Set(["sip", "seed", "nod"]), GES = new Set(["tea", "cheers", "wave", "seat"]);
  const EVS = new Set(["stamp", "tut", "tut_skip", "cert", "photo", "chess_ai", "solo"]);
  const REASONS = ["Tên thô tục", "Tên giả danh", "Quấy rối", "Khác"];
  const GB = ["Hà Nội mùa này đẹp lắm.", "Trà đá vẫn ngon như ngày xưa.", "Lần đầu ghé phố cổ, sẽ quay lại!", "Nhớ Hà Nội quá.", "Chúc cô bán hàng đắt khách.", "Ai đi Hồ Gươm cùng không?",
    "Gió mùa về rồi, mặc ấm nhé.", "Bình yên là ngồi đây.", "Cảm ơn mọi người đã ghé quán.", "Hẹn gặp lại ở phố cổ.", "Chúc mừng năm mới!", "Kê ghế gọn, phố thêm xinh."];

  const NAME_MIN = 2, NAME_MAX = 20, RENAME_GAP = 60;
  const strip = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase();
  const LEET = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i" };
  const deleet = s => s.replace(/[013457@$!]/g, c => LEET[c]);
  const BAD_EXACT = new Set(["đéo", "địt", "đụ", "lồn", "buồi", "cặc", "đĩ", "cứt", "đm", "đmm", "đcm", "đkm"]);
  const BAD_TOKEN = new Set(["dm", "dmm", "dcm", "dkm", "dit", "vcl", "vkl", "vl", "cc", "cl", "clgt", "lon", "buoi", "cak", "loz", "sex", "fuck", "fck", "shit", "bitch", "cunt", "dick", "porn", "nigga", "nigger", "slut", "whore"]);
  const BAD_SUB = ["ditme", "ditmay", "dumay", "dume", "dmay", "vailon", "vailoz", "occho", "concho", "chomay", "fuck", "shit", "bitch", "nigg", "porn", "pussy", "asshole", "motherf", "clgt", "dmm", "dcm", "dkm", "vcl", "vkl"];
  const RESERVED = ["congan", "canhsat", "danphong", "admin", "quantri", "moderator", "hethong", "system", "police", "cobanhang", "ongcu", "trada", "tradaphoco"];
  const EXTRA_BLOCK = new Set(); // danh sách chặn thêm do quản trị viên đặt (máy chủ nạp vào)
  const keyOf = s => deleet(strip(String(s))).replace(/[^a-z0-9]/g, "");
  function cleanName(raw) {
    if (typeof raw !== "string") return { ok: false, reason: "Tên không hợp lệ." };
    let s = raw.normalize("NFC").replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, "").replace(/\s+/g, " ").trim();
    const len = Array.from(s).length;
    if (len < NAME_MIN) return { ok: false, reason: "Tên cần ít nhất " + NAME_MIN + " ký tự." };
    if (len > NAME_MAX) return { ok: false, reason: "Tên tối đa " + NAME_MAX + " ký tự." };
    if (!/^[\p{L}\p{M}\p{N} .'\-]+$/u.test(s)) return { ok: false, reason: "Chỉ dùng chữ, số, khoảng trắng và dấu . ' -" };
    if (!/\p{L}/u.test(s)) return { ok: false, reason: "Tên cần có ít nhất một chữ cái." };
    if (/(.)\1{3,}/u.test(s)) return { ok: false, reason: "Không lặp một ký tự quá 3 lần liền nhau." };
    const low = s.toLowerCase(), plain = deleet(strip(s)), joined = plain.replace(/[^a-z]/g, "");
    const toks = low.split(/[\s.'\-]+/).filter(Boolean), ptoks = plain.split(/[^a-z0-9]+/).filter(Boolean);
    if (toks.some(t => BAD_EXACT.has(t)) || ptoks.some(t => BAD_TOKEN.has(t)) || BAD_SUB.some(w => joined.includes(w)))
      return { ok: false, reason: "Tên có từ ngữ không phù hợp. Bạn chọn tên khác nhé." };
    if (RESERVED.some(w => joined.includes(w))) return { ok: false, reason: "Tên này trùng với nhân vật trong game. Bạn chọn tên khác nhé." };
    if (EXTRA_BLOCK.size && [...EXTRA_BLOCK].some(w => w && keyOf(s).includes(w))) return { ok: false, reason: "Tên này không được phép dùng. Bạn chọn tên khác nhé." };
    return { ok: true, name: s };
  }

  function valid(x, z) { if (!isFinite(x) || !isFinite(z)) return false;
    if (x >= -57.6 && x <= -50.4 && z >= -70 && z <= 70) return true;
    if (x >= -140 && x < -100) return z >= -4.5 && z <= 4.5;
    if (x >= -100 && x < 204) { if (Math.abs(x) < 3.4) return Math.abs(z) <= 1.6; return z >= -8.6 && z <= 8; }
    if (x >= 204 && x <= 221.2) return z >= -80 && z <= 80; return false; }
  const int = (v, max) => Number.isInteger(v) && v >= 0 && v < max, R = Math.random;
  const randName = () => [Math.floor(R() * 14), Math.floor(R() * 14)], randLook = () => ({ s: Math.floor(R() * 10), p: Math.floor(R() * 5), k: Math.floor(R() * 4), h: R() < .25 ? 1 : 0, a: Math.floor(R() * 6) });

  class Room {
    constructor(id, out, opt) { opt = opt || {}; this.id = id; this.out = out; this.opt = opt; this.players = new Map(); this.npcs = new Map(); this.stools = new Array(CAP).fill(null);
      this.order = { st: "idle", t: 0, cd: 45, k: 0, low: 0, again: false }; this.tramT = 15 + R() * 20; this.trainT = 40 + R() * 40; this.npcT = 1; this.busyPh = R() * 6.28;
      this.nid = 1; this.t = 0; this.q = []; this.gb = opt.gb || []; this.gbSave = opt.gbSave || null; this.tram = null; this.train = null;
      this.chess = { g: XQ.newGame(), seats: [null, null] }; this.seedNpcs(5); }
    get size() { return this.players.size; }
    bc(o, ex) { this.out(null, o, ex); }
    pub(p) { return { id: p.id, n: p.n, nm: p.nm || null, l: p.l, s: p.s, x: p.x, z: p.z, npc: !!p.npc }; }
    who(id) { return this.players.get(id) || this.npcs.get(id); }
    later(dt, fn) { this.q.push({ t: this.t + dt, fn }); }
    uniqName(nm, selfId) { const taken = new Set([...this.players.values()].filter(p => p.id !== selfId && p.nm).map(p => p.nm.toLowerCase()));
      if (!taken.has(nm.toLowerCase())) return nm; for (let k = 2; k < 100; k++) { const base = Array.from(nm).slice(0, NAME_MAX - String(k).length - 1).join("").trim(), c = base + " " + k; if (!taken.has(c.toLowerCase())) return c; } return nm; }
    chessState() { const c = this.chess; return { b: c.g.b.join(","), turn: c.g.turn, last: c.g.last, status: c.g.status, winner: c.g.winner, check: c.g.check, seats: c.seats }; }
    seedNpcs(n) { for (let i = 0; i < n; i++) this.spawnNpc(true); }
    spawnNpc(quiet) { const free = []; this.stools.forEach((o, i) => { if (o === null) free.push(i); }); if (free.length < 2) return;
      const s = free[Math.floor(R() * free.length)], np = { id: "n" + this.nid++, n: randName(), l: randLook(), s, x: 0, z: 0, npc: true, t: 0, stay: 70 + R() * 140, next: 2 + R() * 6 };
      this.npcs.set(np.id, np); this.stools[s] = np.id; if (!quiet) this.bc({ t: "join", p: this.pub(np) }); }
    removeNpc(id) { const np = this.npcs.get(id); if (!np) return; if (np.s !== null && this.stools[np.s] === id) this.stools[np.s] = null; this.npcs.delete(id); this.bc({ t: "leave", id }); }
    join(id, m) { const n = Array.isArray(m.n) ? m.n : [], l = m.l || {}; if (!int(n[0], LIM.n) || !int(n[1], LIM.d)) return false; const look = {};
      for (const k of ["s", "p", "k", "h", "a"]) { if (!int(l[k], LIM[k])) return false; look[k] = l[k]; }
      let nm = null, rejected = null; if (m.nm !== undefined && m.nm !== null && m.nm !== "") { const r = cleanName(m.nm); if (r.ok) nm = this.uniqName(r.name, id); else rejected = r.reason; }
      const p = { id, n: [n[0], n[1]], nm, l: look, s: null, x: 70, z: -5.5, gbT: -999, renT: -999, repT: [], cheer: null, since: Date.now() };
      const all = [...this.players.values(), ...this.npcs.values()].map(q => this.pub(q));
      this.out(id, { t: "welcome", id, room: this.id, now: Date.now(), you: { nm, rejected }, players: all, order: { st: this.order.st, k: this.order.k, again: this.order.again }, chess: this.chessState(), gb: this.gb.slice(-20), tram: this.tram, train: this.train });
      this.players.set(id, p); this.bc({ t: "join", p: this.pub(p) }, id); return true; }
    leave(id) { const p = this.players.get(id); if (!p) return; if (p.s !== null && this.stools[p.s] === id) this.stools[p.s] = null; this.players.delete(id); this.leaveChess(id, true); this.bc({ t: "leave", id }); }
    freeSeat(p) { if (p.s !== null && this.stools[p.s] === p.id) this.stools[p.s] = null; p.s = null; }
    leaveChess(id, quiet) { const c = this.chess, i = c.seats.indexOf(id); if (i < 0) return; c.seats[i] = null;
      if (c.g.status === "play" && c.g.n > 0 && c.seats[1 - i] && c.seats[1 - i] !== "ai") { c.g.status = "over"; c.g.winner = i === 0 ? "b" : "r"; }
      if (c.seats[1 - i] === "ai" || (!c.seats[0] && !c.seats[1])) { c.seats = [null, null]; c.g = XQ.newGame(); } this.bc({ t: "chess", c: this.chessState() }); }
    aiTurn() { const c = this.chess, ai = c.seats.indexOf("ai"); if (ai < 0 || c.g.status !== "play") return; const s = ai === 0 ? "r" : "b"; if (c.g.turn !== s) return;
      this.later(1.2 + R(), () => { if (c.seats[ai] !== "ai" || c.g.turn !== s || c.g.status !== "play") return; const m = XQ.aiMove(c.g.b, s); if (m && XQ.move(c.g, s, m[0], m[1])) this.bc({ t: "chess", c: this.chessState() }); }); }
    forceName(id, why) { const p = this.players.get(id); if (!p) return false; p.nm = null; p.renT = this.t + 600; this.bc({ t: "name", id, nm: null });
      this.out(id, { t: "notice", text: why || "Tên của bạn đã được quản trị viên ẩn vì không phù hợp. Bạn đang dùng tên ngẫu nhiên." }); return true; }
    list() { return [...this.players.values()].map(p => ({ id: p.id, nm: p.nm, n: p.n, s: p.s, since: p.since })); }
    msg(id, m) { const p = this.players.get(id); if (!p || !m || typeof m.t !== "string") return;
      if (m.t === "sit") { if (!int(m.s, CAP)) return; const occ = this.stools[m.s];
        if (occ !== null && occ !== id) { if (this.npcs.has(occ)) this.removeNpc(occ); else return this.out(id, { t: "deny", s: m.s }); }
        this.leaveChess(id); this.freeSeat(p); this.stools[m.s] = id; p.s = m.s; this.bc({ t: "sit", id, s: m.s }); }
      else if (m.t === "go") { if (typeof m.x !== "number" || typeof m.z !== "number" || !valid(m.x, m.z)) return; this.freeSeat(p); this.leaveChess(id);
        p.x = Math.round(m.x * 10) / 10; p.z = Math.round(m.z * 10) / 10; this.bc({ t: "go", id, x: p.x, z: p.z }, id); }
      else if (m.t === "act") { if (!ACTS.has(m.a) || (p.s === null && this.chess.seats.indexOf(id) < 0)) return; this.bc({ t: "act", id, a: m.a }, id); }
      else if (m.t === "rename") { const wait = Math.ceil(RENAME_GAP - (this.t - p.renT));
        if (wait > 0) return this.out(id, { t: "renameFail", reason: "Đợi " + wait + " giây nữa rồi đổi tên nhé." });
        if (m.nm === null || m.nm === "") { p.renT = this.t; p.nm = null; return this.bc({ t: "name", id, nm: null }); }
        const r = cleanName(m.nm); if (!r.ok) return this.out(id, { t: "renameFail", reason: r.reason });
        p.renT = this.t; p.nm = this.uniqName(r.name, id); this.bc({ t: "name", id, nm: p.nm }); }
      else if (m.t === "report") {
        if (typeof m.name !== "string" || m.name.length > 40) return; p.repT = p.repT.filter(t => this.t - t < 600); if (p.repT.length >= 5) return this.out(id, { t: "notice", text: "Bạn đã gửi nhiều báo cáo. Đợi một lúc rồi gửi tiếp nhé." });
        p.repT.push(this.t); const tg = [...this.players.values()].find(q => q.id !== id && q.nm && q.nm === m.name) || null;
        if (this.opt.onReport) this.opt.onReport({ room: this.id, by: id, byName: p.nm, target: tg ? tg.id : null, name: m.name, reason: REASONS.includes(m.reason) ? m.reason : "Khác" });
        this.out(id, { t: "notice", text: "Đã gửi báo cáo. Cảm ơn bạn đã giúp quán văn minh hơn." }); }
      else if (m.t === "ev") { if (EVS.has(m.k) && this.opt.onEvent) this.opt.onEvent(m.k, typeof m.v === "string" ? m.v.slice(0, 20) : null); }
      else if (m.t === "compact") { if (this.order.st === "announce" && !this.order.again) this.compact(id); }
      else if (m.t === "ges") { if (!GES.has(m.g)) return; const tg = this.who(m.to); if (!tg || m.to === id) return;
        if (m.g === "seat") { if (p.s === null || tg.npc || tg.s !== null) return; const s = p.s; p.s = null; this.stools[s] = tg.id; tg.s = s; this.leaveChess(tg.id);
          this.bc({ t: "ges", id, to: tg.id, g: "seat" }); this.bc({ t: "sit", id: tg.id, s }); return; }
        this.bc({ t: "ges", id, to: tg.id, g: m.g });
        if (m.g === "cheers") { p.cheer = { to: tg.id, t: this.t }; const go = () => this.bc({ t: "cheers2", a: id, b: tg.id }); if (tg.npc) this.later(1, go); else if (tg.cheer && tg.cheer.to === id && this.t - tg.cheer.t < 6) go(); }
        else if (tg.npc) this.later(1 + R(), () => { if (this.npcs.has(tg.id)) this.bc({ t: "ges", id: tg.id, to: id, g: m.g === "tea" ? "thanks" : "wave" }); }); }
      else if (m.t === "gb") { if (!int(m.i, GB.length) || this.t - p.gbT < 45) return; p.gbT = this.t; const e = { n: p.n, nm: p.nm || null, i: m.i, ts: Date.now() };
        this.gb.push(e); if (this.gb.length > 40) this.gb.splice(0, this.gb.length - 40); if (this.gbSave) this.gbSave(this.gb); this.bc({ t: "gb", e }); }
      else if (m.t === "chess") { const c = this.chess, mine = c.seats.indexOf(id);
        if (m.op === "sit") { if (!int(m.seat, 2) || mine >= 0) return; const cur = c.seats[m.seat]; if (cur && cur !== "ai") return;
          this.freeSeat(p); c.seats[m.seat] = id; if (cur === "ai") { c.g = XQ.newGame(); } this.bc({ t: "chess", c: this.chessState() }); this.aiTurn(); }
        else if (m.op === "ai") { if (mine < 0 || c.seats[1 - mine]) return; c.seats[1 - mine] = "ai"; c.g = XQ.newGame(); this.bc({ t: "chess", c: this.chessState() }); this.aiTurn(); }
        else if (m.op === "move") { if (mine < 0 || !int(m.f, 90) || !int(m.to, 90)) return; if (XQ.move(c.g, mine === 0 ? "r" : "b", m.f, m.to)) { this.bc({ t: "chess", c: this.chessState() }); this.aiTurn(); } }
        else if (m.op === "leave") this.leaveChess(id);
        else if (m.op === "reset") { if (mine < 0 || (c.g.status === "play" && c.g.n > 0 && c.seats[1 - mine] && c.seats[1 - mine] !== "ai")) return; c.g = XQ.newGame(); this.bc({ t: "chess", c: this.chessState() }); this.aiTurn(); } } }
    compact(by) { const o = this.order; o.k = 1; o.st = "thanks"; o.t = 0; this.bc({ t: "order", st: "thanks", k: 1, by, again: false }); }
    tick(dt) { this.t += dt; for (let i = this.q.length - 1; i >= 0; i--) if (this.q[i].t <= this.t) { const f = this.q[i].fn; this.q.splice(i, 1); f(); }
      const busy = .5 + .5 * Math.sin(this.t * 2 * Math.PI / 420 + this.busyPh), target = Math.max(0, Math.min(12, Math.round(3 + 9 * busy) - this.players.size));
      this.npcT -= dt; if (this.npcT <= 0) { this.npcT = 3 + R() * 5; if (this.npcs.size < target) this.spawnNpc(false); else if (this.npcs.size > target + 1) { const first = this.npcs.keys().next().value; this.removeNpc(first); } }
      for (const np of [...this.npcs.values()]) { np.t += dt; np.next -= dt;
        if (np.next <= 0) { np.next = 3 + R() * 6; const r = R(); this.bc({ t: "act", id: np.id, a: r < .45 ? "sip" : r < .85 ? "seed" : "nod" }); }
        if (np.t > np.stay) this.removeNpc(np.id); }
      const o = this.order, crowd = this.stools.filter(v => v !== null).length; o.cd -= dt;
      if (o.st === "idle" && crowd >= 10 && o.cd <= 0) { o.st = "coming"; o.t = 0; o.again = o.k === 1; this.bc({ t: "order", st: "coming", k: o.k, again: o.again }); }
      else if (o.st === "coming") { o.t += dt; if (o.t >= 12) { o.st = "announce"; o.t = 0; this.bc({ t: "order", st: "announce", k: o.k, again: o.again }); } }
      else if (o.st === "announce") { o.t += dt; if (o.again && o.t >= 9) { o.st = "thanks"; o.t = 0; this.bc({ t: "order", st: "thanks", k: o.k, by: null, again: true }); } else if (!o.again && o.t >= 16) this.compact(0); }
      else if (o.st === "thanks") { o.t += dt; if (o.t >= 4) { o.st = "idle"; o.cd = 240; this.bc({ t: "order", st: "idle", k: o.k }); } }
      if (o.k === 1) { o.low = crowd <= 6 ? o.low + dt : 0; if (o.low > 90) { o.k = 0; o.low = 0; this.bc({ t: "order", st: o.st, k: 0 }); } }
      this.tramT -= dt; if (this.tramT <= 0) { this.tramT = 60 + R() * 60; this.tram = { dir: R() < .5 ? 1 : -1, at: Date.now() }; this.bc({ t: "tram", v: this.tram }); }
      this.trainT -= dt; if (this.trainT <= 0) { this.trainT = 150 + R() * 120; this.train = { dir: R() < .5 ? 1 : -1, at: Date.now() }; this.bc({ t: "train", v: this.train }); }
      if (this.tram && Date.now() - this.tram.at > 90000) this.tram = null; if (this.train && Date.now() - this.train.at > 60000) this.train = null; }
  }
  const API = { Room, valid, GB, CAP, cleanName, NAME_MAX, REASONS, EXTRA_BLOCK, keyOf };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else root.RoomLib = API;
})(typeof self !== "undefined" ? self : this);
