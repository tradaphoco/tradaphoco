/* Trà Đá Phố Cổ — bảng điều khiển: đài nhạc, hộ chiếu, dạo phố, sổ lưu bút, cờ tướng, bưu thiếp, đổi tên, cài ứng dụng */
"use strict";
const UI = (() => {
  const $ = id => document.getElementById(id);
  const PANELS = ["radio", "places", "passport", "gbook", "more", "chessP", "rename"];
  const BTN = { radio: "bMusic", places: "bPlaces", passport: "bPass", more: "bMore" };
  function toggle(id, v) { const el = $(id), show = v === undefined ? !el.classList.contains("show") : v; if (show) PANELS.forEach(p => { if (p !== id) set(p, false); }); set(id, show);
    if (show && id === "radio" && typeof Snd !== "undefined") Snd.init(); if (show && id === "passport" && typeof Passport !== "undefined") Passport.render(); if (show && id === "gbook") renderGb(); if (show && id === "chessP") drawChess();
    if (show && id === "rename") { $("renIn").value = G.myNick || ""; $("renMsg").textContent = ""; setTimeout(() => $("renIn").focus(), 50); } }
  function set(id, show) { const el = $(id); if (!el) return; el.classList.toggle("show", show); if (BTN[id]) $(BTN[id]).setAttribute("aria-expanded", show); }
  function closePanels() { PANELS.forEach(p => set(p, false)); if ($("postcard").classList.contains("show")) closePostcard(); }
  const anyOpen = () => PANELS.some(p => $(p).classList.contains("show")) || $("postcard").classList.contains("show");
  const modalOpen = () => !$("guide").classList.contains("gone") || $("postcard").classList.contains("show");
  Object.entries(BTN).forEach(([p, b]) => $(b).addEventListener("click", () => toggle(p)));
  document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => set(b.dataset.close, false)));
  $("bGbook").addEventListener("click", () => toggle("gbook")); $("bRename").addEventListener("click", () => toggle("rename"));
  $("bHelp").addEventListener("click", () => { closePanels(); $("guide").classList.remove("gone"); $("closeGuide").focus(); });
  $("closeGuide").addEventListener("click", () => $("guide").classList.add("gone"));

  /* --- Sổ lưu bút --- */
  let gb = [], gbLast = 0;
  function ago(ts) { const s = (Date.now() - ts) / 1000; return s < 60 ? "vừa xong" : s < 3600 ? Math.floor(s / 60) + " phút trước" : s < 86400 ? Math.floor(s / 3600) + " giờ trước" : Math.floor(s / 86400) + " ngày trước"; }
  function onGb(list, replace) { if (replace) gb = list.slice(); else gb.push(...list); if (gb.length > 40) gb = gb.slice(-40); if ($("gbook").classList.contains("show")) renderGb(); }
  function renderGb() { const L = $("gbList"); L.textContent = ""; if (!gb.length) { const e = document.createElement("div"); e.className = "empty"; e.textContent = "Chưa có ai viết. Bạn viết dòng đầu tiên nhé."; L.append(e); }
    gb.slice().reverse().forEach(e => { const nm = e.nm || G.nameOf(e.n); if (G.isMuted(nm)) return; const r = document.createElement("div"); r.className = "gbe"; const b = document.createElement("b"); b.textContent = nm; const s = document.createElement("small"); s.textContent = " · " + ago(e.ts);
      const p = document.createElement("p"); p.textContent = "“" + G.GB[e.i] + "”"; r.append(b, s, p); L.append(r); });
    const P = $("gbPick"); if (!P.childElementCount) G.GB.forEach((t, i) => { const b = document.createElement("button"); b.type = "button"; b.className = "chipbtn"; b.textContent = t; b.addEventListener("click", () => writeGb(i)); P.append(b); }); }
  function writeGb(i) { const now = Date.now(); if (now - gbLast < 45000) { $("gbMsg").textContent = "Viết chậm thôi, đợi " + Math.ceil((45000 - (now - gbLast)) / 1000) + " giây nữa nhé."; return; } gbLast = now; G.send({ t: "gb", i }); $("gbMsg").textContent = "Đã ghi vào sổ của quán."; if (typeof Snd !== "undefined") Snd.chime(); }

  /* --- Đổi tên trong lúc chơi --- */
  $("renIn").addEventListener("input", () => { const v = $("renIn").value.trim(); if (!v) { $("renMsg").textContent = "Để trống để dùng tên ngẫu nhiên."; return; } const r = RoomLib.cleanName(v); $("renMsg").textContent = r.ok ? "✓ Dùng được" : r.reason; });
  $("renForm").addEventListener("submit", e => { e.preventDefault(); const v = $("renIn").value.trim(); if (v) { const r = RoomLib.cleanName(v); if (!r.ok) { $("renMsg").textContent = r.reason; return; } }
    G.rename(v); $("renMsg").textContent = "Đang đổi tên…"; });
  $("renSuggest").addEventListener("click", () => { $("renIn").value = G.suggestName(); $("renIn").dispatchEvent(new Event("input")); });

  /* --- Cờ tướng --- */
  const CH = { r: { k: "帥", a: "仕", e: "相", h: "傌", r: "俥", c: "炮", p: "兵" }, b: { k: "將", a: "士", e: "象", h: "馬", r: "車", c: "砲", p: "卒" } };
  let sel = -1, hints = [];
  function openChess() { toggle("chessP", true); }
  function mySeat() { const c = G.chess; return c ? c.seats.indexOf(G.me) : -1; }
  function onChess(c) { const s = mySeat(); if ($("chessP").classList.contains("show")) drawChess(); if (s >= 0 && c.status === "over" && !onChess.done) { onChess.done = true; G.say(c.winner ? (c.winner === (s === 0 ? "r" : "b") ? "Bạn thắng ván cờ!" : "Bạn thua ván này. Làm ván nữa nhé?") : "Ván cờ hoà."); } if (c.status === "play") onChess.done = false; }
  function drawChess() { const c = G.chess, cv = $("xqCanvas"), x = cv.getContext("2d"), W = cv.width, H = cv.height, s = W / 10, flip = mySeat() === 1;
    const P = (r, col) => { const rr = flip ? 9 - r : r, cc = flip ? 8 - col : col; return [s * (cc + 1), s * (rr + 1)]; };
    x.fillStyle = "#e9c98f"; x.fillRect(0, 0, W, H); x.strokeStyle = "#5a3a1c"; x.lineWidth = 1.5;
    for (let r = 0; r < 10; r++) { const [a, y] = P(r, 0), [b] = P(r, 8); x.beginPath(); x.moveTo(a, y); x.lineTo(b, y); x.stroke(); }
    for (let col = 1; col < 8; col++) for (const [r0, r1] of [[0, 4], [5, 9]]) { const [x0, y0] = P(r0, col), [, y1] = P(r1, col); x.beginPath(); x.moveTo(x0, y0); x.lineTo(x0, y1); x.stroke(); }
    for (const col of [0, 8]) { const [x0, y0] = P(0, col), [, y1] = P(9, col); x.beginPath(); x.moveTo(x0, y0); x.lineTo(x0, y1); x.stroke(); }
    for (const [a, b] of [[[0, 3], [2, 5]], [[0, 5], [2, 3]], [[7, 3], [9, 5]], [[7, 5], [9, 3]]]) { const p = P(...a), q = P(...b); x.beginPath(); x.moveTo(...p); x.lineTo(...q); x.stroke(); }
    x.fillStyle = "#5a3a1c"; x.font = "600 " + (s * .38) + "px Georgia, serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("SỞ HÀ          HÁN GIỚI", W / 2, (P(4, 0)[1] + P(5, 0)[1]) / 2);
    if (!c) return; const b = c.board;
    if (c.last) for (const i of c.last) { const [px, py] = P((i / 9) | 0, i % 9); x.fillStyle = "rgba(60,140,200,.35)"; x.beginPath(); x.arc(px, py, s * .46, 0, 7); x.fill(); }
    b.forEach((pc, i) => { if (!pc) return; const [px, py] = P((i / 9) | 0, i % 9), red = pc === pc.toUpperCase();
      x.fillStyle = i === sel ? "#ffe7a0" : "#f6ead0"; x.beginPath(); x.arc(px, py, s * .42, 0, 7); x.fill(); x.lineWidth = 2; x.strokeStyle = red ? "#b3261e" : "#222"; x.stroke(); x.beginPath(); x.arc(px, py, s * .34, 0, 7); x.lineWidth = 1; x.stroke();
      x.fillStyle = red ? "#b3261e" : "#1a1a1a"; x.font = "700 " + (s * .46) + "px 'Noto Serif SC','Songti SC','SimSun',serif"; x.fillText(CH[red ? "r" : "b"][pc.toLowerCase()], px, py + 1); });
    for (const i of hints) { const [px, py] = P((i / 9) | 0, i % 9); x.fillStyle = "rgba(47,110,58,.75)"; x.beginPath(); x.arc(px, py, s * .13, 0, 7); x.fill(); }
    const ms = mySeat(), names = c.seats.map(id => id ? G.nameById(id) : "— trống —");
    $("xqRed").textContent = "Đỏ: " + names[0]; $("xqBlack").textContent = "Đen: " + names[1];
    let st = c.status === "over" ? (c.winner ? (c.winner === "r" ? "Đỏ" : "Đen") + " thắng." : "Hoà.") : "Lượt " + (c.turn === "r" ? "Đỏ" : "Đen") + (c.check ? " · Chiếu tướng!" : "");
    if (ms >= 0 && c.status === "play") st += (c.turn === (ms === 0 ? "r" : "b")) ? " · Đến lượt bạn" : " · Chờ đối thủ";
    if (ms < 0) st += " · Bạn đang xem"; $("xqStatus").textContent = st;
    $("xqSitR").hidden = ms >= 0 || (c.seats[0] && c.seats[0] !== "ai"); $("xqSitB").hidden = ms >= 0 || (c.seats[1] && c.seats[1] !== "ai");
    $("xqAi").hidden = !(ms >= 0 && !c.seats[1 - ms]); $("xqLeave").hidden = ms < 0; $("xqReset").hidden = !(ms >= 0 && (c.status === "over" || !c.seats[1 - ms] || c.seats[1 - ms] === "ai")); }
  $("xqCanvas").addEventListener("click", e => { const c = G.chess, ms = mySeat(); if (!c || ms < 0 || c.status !== "play") return; const side = ms === 0 ? "r" : "b"; if (c.turn !== side) return;
    const cv = $("xqCanvas"), rect = cv.getBoundingClientRect(), s = cv.width / 10, px = (e.clientX - rect.left) * cv.width / rect.width, py = (e.clientY - rect.top) * cv.height / rect.height;
    let col = Math.round(px / s) - 1, r = Math.round(py / s) - 1; if (col < 0 || col > 8 || r < 0 || r > 9) return; if (ms === 1) { col = 8 - col; r = 9 - r; } const i = r * 9 + col;
    if (sel >= 0 && hints.includes(i)) { G.send({ t: "chess", op: "move", f: sel, to: i }); sel = -1; hints = []; drawChess(); return; }
    if (c.board[i] && XQ.side(c.board[i]) === side) { sel = i; hints = XQ.legal(c.board, side).filter(m => m[0] === i).map(m => m[1]); } else { sel = -1; hints = []; } drawChess(); });
  $("xqSitR").addEventListener("click", () => G.send({ t: "chess", op: "sit", seat: 0 })); $("xqSitB").addEventListener("click", () => G.send({ t: "chess", op: "sit", seat: 1 }));
  $("xqAi").addEventListener("click", () => G.send({ t: "chess", op: "ai" })); $("xqLeave").addEventListener("click", () => G.send({ t: "chess", op: "leave" })); $("xqReset").addEventListener("click", () => G.send({ t: "chess", op: "reset" }));

  /* --- Bưu thiếp Hà Nội --- */
  const CAPS = ["Gửi bạn một góc phố cổ", "Hà Nội, một ngày bình yên", "Trà đá vỉa hè, chuyện chẳng cần nói", "Phố cổ, mùa này", "Ngồi chút đã", ""];
  let pcStyle = "co", pcCap = 0, pcName = true, shot = null;
  function openPostcard() { closePanels(); document.body.classList.add("shooting"); UI.hideLabels = !pcName; setTimeout(() => G.capture((cv) => { shot = document.createElement("canvas"); shot.width = cv.width; shot.height = cv.height; shot.getContext("2d").drawImage(cv, 0, 0);
      document.body.classList.remove("shooting"); UI.hideLabels = false; if (typeof Snd !== "undefined") Snd.shutter(); $("postcard").classList.add("show"); compose(); }), 120); }
  function closePostcard() { $("postcard").classList.remove("show"); }
  function sepia(ctx, w, h, amt, sat, warm) { const im = ctx.getImageData(0, 0, w, h), d = im.data;
    for (let i = 0; i < d.length; i += 4) { const r = d[i], g = d[i + 1], b = d[i + 2], l = .3 * r + .59 * g + .11 * b; let R = r + (l - r) * (1 - sat), Gg = g + (l - g) * (1 - sat), B = b + (l - b) * (1 - sat);
      R = R * (1 - amt) + (l * 1.07 + warm) * amt; Gg = Gg * (1 - amt) + (l * .87 + warm * .5) * amt; B = B * (1 - amt) + (l * .68) * amt; d[i] = R > 255 ? 255 : R; d[i + 1] = Gg > 255 ? 255 : Gg; d[i + 2] = B > 255 ? 255 : B; } ctx.putImageData(im, 0, 0); }
  function compose() { if (!shot) return; const out = $("pcCanvas"), W = 1600, H = 1100; out.width = W; out.height = H; const x = out.getContext("2d"), n = new Date(), date = String(n.getDate()).padStart(2, "0") + "." + String(n.getMonth() + 1).padStart(2, "0") + "." + n.getFullYear();
    let px = 60, py = 60, pw = W - 120, ph = H - 120; if (pcStyle === "polaroid") { px = 80; py = 80; pw = W - 160; ph = H - 300; } if (pcStyle === "co") { px = 70; py = 70; pw = W - 140; ph = H - 140; }
    const ar = pw / ph, sw = shot.width, sh = shot.height; let cw = sw, chh = sw / ar; if (chh > sh) { chh = sh; cw = sh * ar; }
    const tmp = document.createElement("canvas"); tmp.width = pw; tmp.height = ph; const t = tmp.getContext("2d"); t.drawImage(shot, (sw - cw) / 2, (sh - chh) / 2, cw, chh, 0, 0, pw, ph);
    if (pcStyle === "co") sepia(t, pw, ph, .6, .7, 18); else if (pcStyle === "phim") sepia(t, pw, ph, .18, 1.1, 12);
    if (pcStyle !== "polaroid") { for (let i = 0; i < 9000; i++) { t.fillStyle = Math.random() < .5 ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.08)"; t.fillRect(Math.random() * pw, Math.random() * ph, 2, 2); }
      const v = t.createRadialGradient(pw / 2, ph / 2, ph * .35, pw / 2, ph / 2, pw * .7); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, pcStyle === "co" ? "rgba(60,35,10,.55)" : "rgba(0,0,0,.45)"); t.fillStyle = v; t.fillRect(0, 0, pw, ph); }
    x.fillStyle = pcStyle === "co" ? "#efe2c4" : pcStyle === "phim" ? "#111" : "#fbfaf6"; x.fillRect(0, 0, W, H);
    if (pcStyle === "co") for (let i = 0; i < 3000; i++) { x.fillStyle = "rgba(120,90,40," + Math.random() * .08 + ")"; x.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
    if (pcStyle === "phim") { x.fillStyle = "#e8e2d0"; for (let i = 0; i < 26; i++) { x.fillRect(30 + i * 61, 18, 30, 22); x.fillRect(30 + i * 61, H - 40, 30, 22); } }
    x.drawImage(tmp, px, py); const cap = CAPS[pcCap], name = $("myName").textContent;
    if (pcStyle === "co") { x.strokeStyle = "#7a5a32"; x.lineWidth = 3; x.strokeRect(px - 12, py - 12, pw + 24, ph + 24);
      x.save(); x.translate(W - 210, 200); x.rotate(-.12); x.fillStyle = "#fbf2dc"; x.fillRect(-80, -100, 160, 190); x.strokeStyle = "#b3261e"; x.lineWidth = 4; x.setLineDash([6, 6]); x.strokeRect(-80, -100, 160, 190); x.setLineDash([]);
      x.fillStyle = "#b3261e"; x.font = "700 30px Georgia, serif"; x.textAlign = "center"; x.fillText("HÀ NỘI", 0, -40); x.font = "italic 20px Georgia, serif"; x.fillText("Phố cổ", 0, -5); x.font = "700 44px Georgia, serif"; x.fillText("☕", 0, 55); x.restore();
      x.save(); x.translate(W - 340, 260); x.globalAlpha = .7; x.strokeStyle = "#2b3550"; x.lineWidth = 4; x.beginPath(); x.arc(0, 0, 70, 0, 7); x.stroke(); x.beginPath(); x.arc(0, 0, 54, 0, 7); x.stroke(); x.fillStyle = "#2b3550"; x.font = "700 18px Georgia, serif"; x.textAlign = "center";
      x.fillText("TRÀ ĐÁ", 0, -12); x.fillText(date, 0, 16); for (let k = 0; k < 4; k++) { x.beginPath(); x.moveTo(75, -24 + k * 16); x.bezierCurveTo(130, -40 + k * 16, 170, -8 + k * 16, 230, -24 + k * 16); x.stroke(); } x.restore(); }
    if (pcStyle === "phim") { x.fillStyle = "#ff9a2e"; x.font = "700 40px 'Courier New', monospace"; x.textAlign = "right"; x.fillText("'" + String(n.getFullYear()).slice(2) + " " + String(n.getMonth() + 1).padStart(2, "0") + " " + String(n.getDate()).padStart(2, "0"), px + pw - 30, py + ph - 30); }
    const capY = pcStyle === "polaroid" ? H - 140 : py + ph - 70; x.textAlign = pcStyle === "polaroid" ? "center" : "left";
    if (cap) { x.font = "italic 600 " + (pcStyle === "polaroid" ? 56 : 52) + "px Georgia, serif"; x.fillStyle = pcStyle === "polaroid" ? "#2a2320" : "#fff"; if (pcStyle !== "polaroid") { x.shadowColor = "rgba(0,0,0,.7)"; x.shadowBlur = 12; } x.fillText(cap, pcStyle === "polaroid" ? W / 2 : px + 40, capY); x.shadowBlur = 0; }
    if (pcName) { x.font = "600 28px system-ui, sans-serif"; x.fillStyle = pcStyle === "polaroid" ? "#6a5a48" : "rgba(255,255,255,.92)"; x.fillText("— " + name + " · Trà Đá Phố Cổ · " + date, pcStyle === "polaroid" ? W / 2 : px + 40, capY + 50); } }
  document.querySelectorAll("[data-pcs]").forEach(b => b.addEventListener("click", () => { pcStyle = b.dataset.pcs; document.querySelectorAll("[data-pcs]").forEach(q => q.classList.toggle("on", q === b)); compose(); }));
  CAPS.forEach((c, i) => { const o = document.createElement("option"); o.value = i; o.textContent = c || "Không ghi chữ"; $("pcCap").append(o); });
  $("pcCap").addEventListener("change", e => { pcCap = +e.target.value; compose(); }); $("pcName").addEventListener("change", e => { pcName = e.target.checked; compose(); });
  $("pcAgain").addEventListener("click", () => { closePostcard(); setTimeout(openPostcard, 200); }); $("pcClose").addEventListener("click", closePostcard);
  $("pcSave").addEventListener("click", () => $("pcCanvas").toBlob(b => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "buu-thiep-ha-noi.jpg"; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }, "image/jpeg", .92));
  $("pcShare").addEventListener("click", () => $("pcCanvas").toBlob(async b => { const f = new File([b], "buu-thiep-ha-noi.jpg", { type: "image/jpeg" });
    try { if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: "Bưu thiếp Hà Nội", text: "Ghé quán trà đá phố cổ với mình: " + location.origin + location.pathname }); else $("pcSave").click(); } catch (e) { } }, "image/jpeg", .92));
  $("bPhoto").addEventListener("click", openPostcard);

  /* --- Cài ứng dụng (PWA) --- */
  let deferred = null; addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred = e; $("bInstall").hidden = false; });
  $("bInstall").addEventListener("click", async () => { if (deferred) { deferred.prompt(); await deferred.userChoice; deferred = null; $("bInstall").hidden = true; } });
  if (/iphone|ipad/i.test(navigator.userAgent) && !navigator.standalone) $("iosHint").hidden = false;
  return { toggle, closePanels, anyOpen, modalOpen, onGb, onChess, openChess, openPostcard, hideLabels: false, renameResult(ok, msg) { $("renMsg").textContent = msg; if (ok) setTimeout(() => set("rename", false), 900); } };
})();
