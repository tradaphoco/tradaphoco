/* Trà Đá Phố Cổ — dựng phố: vân mặt tiền, nhà ống, địa danh, cây, dây điện, Hồ Gươm,
   chợ Đồng Xuân, phố đường tàu, cầu Long Biên, trang trí theo mùa (đông, Tết).
   Bản 6.1: cây sấu, cột đèn, tủ trà đá và ghế nhựa dùng mô hình 3D nếu đã nạp được (public/models/*.glb),
   nếu không thì tự quay về hình khối cũ. */
"use strict";
const PX = 26, NZ = -9, SZ = 8.5, CURB_N = -4, CURB_S = 4, WALK_Y = 0.15;
const LANE = { x0: -57.6, x1: -50.4, cx: -54 }, BRIDGE_X = -100;
let _R3 = null; // bộ vẽ, để các hàm bên ngoài buildWorld (stoolGeo) đặt được mô hình

class Atlas {
  constructor(W, H, k) { this.W = W; this.H = H; this.k = k;
    this.cv = document.createElement("canvas"); this.cv.width = W; this.cv.height = H; this.c = this.cv.getContext("2d");
    this.ecv = document.createElement("canvas"); this.ecv.width = W * k; this.ecv.height = H * k; this.e = this.ecv.getContext("2d");
    this.c.fillStyle = "#888"; this.c.fillRect(0, 0, W, H); this.e.fillStyle = "#000"; this.e.fillRect(0, 0, W * k, H * k); this.x = 6; this.y = 6; this.rowH = 0; }
  alloc(pw, ph) { pw = Math.ceil(pw); ph = Math.ceil(ph);
    if (this.x + pw + 6 > this.W) { this.x = 6; this.y += this.rowH + 10; this.rowH = 0; }
    if (this.y + ph + 6 > this.H) { console.warn("atlas đầy"); return { x: 0, y: 0, w: 8, h: 8, uv: [0, 0, 8 / this.W, 8 / this.H] }; }
    const r = { x: this.x, y: this.y, w: pw, h: ph }; this.x += pw + 10; this.rowH = Math.max(this.rowH, ph);
    r.uv = [(r.x + .5) / this.W, (r.y + .5) / this.H, (r.x + r.w - .5) / this.W, (r.y + r.h - .5) / this.H]; return r; }
  begin(r, ppm) { const s = ppm || PX; this.c.setTransform(s, 0, 0, s, r.x, r.y); this.e.setTransform(s * this.k, 0, 0, s * this.k, r.x * this.k, r.y * this.k); this.cur = { r, s }; }
  end() { this.c.setTransform(1, 0, 0, 1, 0, 0); this.e.setTransform(1, 0, 0, 1, 0, 0); }
  text(str, x, y, size, color, o) { o = o || {}; const { r, s } = this.cur, ctxs = o.em ? [[this.e, this.k]] : [[this.c, 1]];
    for (const [cx, k] of ctxs) { cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0);
      cx.font = (o.weight || "700") + " " + Math.max(4, size * s * k) + "px " + (o.font || "Georgia, 'Times New Roman', serif");
      cx.textAlign = o.align || "center"; cx.textBaseline = "middle"; cx.fillStyle = color;
      const px = (r.x + x * s) * k, py = (r.y + y * s) * k; if (o.maxW) cx.fillText(str, px, py, o.maxW * s * k); else cx.fillText(str, px, py); cx.restore(); } }
}
function shadeHex(h, a) { const n = parseInt(h.slice(1), 16); const f = v => Math.max(0, Math.min(255, Math.round(v + a))); return "#" + ((1 << 24) + (f(n >> 16) << 16) + (f(n >> 8 & 255) << 8) + f(n & 255)).toString(16).slice(1); }
function makeCanvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
function noise(ctx, w, h, n, cols, a0, a1, rmax, rnd) { for (let i = 0; i < n; i++) { ctx.globalAlpha = a0 + rnd() * (a1 - a0); ctx.fillStyle = cols[Math.floor(rnd() * cols.length)]; ctx.beginPath(); ctx.arc(rnd() * w, rnd() * h, rnd() * rmax + .5, 0, 7); ctx.fill(); } ctx.globalAlpha = 1; }
function texSidewalk() { const c = makeCanvas(512, 512), x = c.getContext("2d"), r = mulberry(4), t = 128;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const base = r() < .5 ? [176, 160, 150] : [160, 150, 146], v = (r() - .5) * 18;
    x.fillStyle = `rgb(${base[0] + v},${base[1] + v},${base[2] + v})`; x.fillRect(i * t, j * t, t, t);
    for (let k = 0; k < 140; k++) { x.fillStyle = ["#e9e2d8", "#6b625c", "#a4542f", "#3a3633"][Math.floor(r() * 4)]; x.globalAlpha = .55; x.fillRect(i * t + r() * t, j * t + r() * t, 2 + r() * 3, 2 + r() * 3); } x.globalAlpha = 1;
    if ((i + j) % 2 === 0) { x.strokeStyle = "rgba(0,0,0,.10)"; x.lineWidth = 6; for (let s = 1; s < 4; s++) { x.beginPath(); x.moveTo(i * t + s * t / 4, j * t + 14); x.lineTo(i * t + s * t / 4, j * t + t - 14); x.stroke(); } } }
  x.strokeStyle = "#5e5752"; x.lineWidth = 3; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * t, 0); x.lineTo(i * t, 512); x.stroke(); x.beginPath(); x.moveTo(0, i * t); x.lineTo(512, i * t); x.stroke(); }
  noise(x, 512, 512, 60, ["#2e2a26", "#4a4038"], .04, .14, 26, r); return c; }
function texAsphalt() { const c = makeCanvas(512, 512), x = c.getContext("2d"), r = mulberry(9);
  x.fillStyle = "#4a4a4c"; x.fillRect(0, 0, 512, 512); for (let i = 0; i < 9000; i++) { const g = 50 + r() * 50; x.fillStyle = `rgb(${g},${g},${g + 2})`; x.fillRect(r() * 512, r() * 512, 1.5, 1.5); }
  noise(x, 512, 512, 50, ["#3a3a3c", "#56565a", "#2f2f30"], .1, .3, 40, r);
  x.strokeStyle = "rgba(20,20,20,.5)"; x.lineWidth = 2; for (let i = 0; i < 6; i++) { x.beginPath(); let px = r() * 512, py = r() * 512; x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += (r() - .5) * 60; py += (r() - .5) * 60; x.lineTo(px, py); } x.stroke(); }
  x.fillStyle = "rgba(235,232,220,.85)"; x.fillRect(0, 250, 224, 12); x.fillStyle = "rgba(235,232,220,.6)"; x.fillRect(0, 4, 512, 6); x.fillRect(0, 502, 512, 6); return c; }
function texRoof() { const c = makeCanvas(256, 256), x = c.getContext("2d"), r = mulberry(13); x.fillStyle = "#7d3e2a"; x.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 16; row++) for (let col = 0; col < 12; col++) { const px = col * 21.3, py = row * 16, v = (r() - .5) * 30, g = x.createLinearGradient(px, 0, px + 21, 0);
    g.addColorStop(0, `rgb(${110 + v},${50 + v / 2},32)`); g.addColorStop(.5, `rgb(${160 + v},${80 + v / 2},52)`); g.addColorStop(1, `rgb(${100 + v},${46 + v / 2},30)`);
    x.fillStyle = g; x.beginPath(); x.ellipse(px + 10.6, py + 8, 10, 9, 0, 0, 7); x.fill(); x.fillStyle = "rgba(0,0,0,.25)"; x.fillRect(px, py + 14, 21, 2); }
  noise(x, 256, 256, 70, ["#4f6a36", "#3f5a2e", "#2c2a22"], .15, .45, 14, r); return c; }
function texStone() { const c = makeCanvas(256, 256), x = c.getContext("2d"), r = mulberry(17); x.fillStyle = "#8f877a"; x.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 8; row++) for (let col = 0; col < 6; col++) { const off = row % 2 ? 25 : 0, v = (r() - .5) * 26; x.fillStyle = `rgb(${150 + v},${140 + v},${122 + v})`; x.fillRect(col * 51 + off - 25, row * 32 + 2, 49, 29); }
  noise(x, 256, 256, 120, ["#4f5f38", "#3c3a30", "#6a6a50"], .08, .35, 12, r); return c; }

const FACADE_COLS = ["#e0b25a", "#d9a441", "#ead7a1", "#efe3c4", "#d9a5a0", "#bfcfa8", "#b9c9d3", "#d9d6cc", "#c98a63", "#e6c27a", "#d8b98c"];
const SHUTTER_COLS = ["#3f6e52", "#2f5e5a", "#4f6b3a", "#6b4a32", "#3e5a72"];
const GUILDS = [["HÀNG MÃ", "Đồ lễ · Đèn lồng"], ["HÀNG BẠC", "Vàng bạc · Trang sức"], ["THUỐC BẮC", "Lãn Ông · Dược liệu"], ["LỤA HÀNG ĐÀO", "Vải · Lụa tơ tằm"], ["TẠP HOÁ", "Bánh kẹo · Đồ khô"],
  ["ĐỒ THIẾC", "Hàng Thiếc · Gò hàn"], ["Ô MAI", "Ô mai · Mứt · Chè"], ["TRANH PHỐ", "Tranh sơn dầu"], ["NÓN LÁ", "Nón · Mũ · Quạt"], ["GỐM SỨ", "Bát Tràng"], ["ĐÈN LỒNG", "Lồng đèn"], ["BÚN CHẢ", "Bún chả · Nem cua bể"],
  ["BÁNH CUỐN", "Bánh cuốn Thanh Trì"], ["HÀNG GIẤY", "Giấy · Văn phòng phẩm"], ["CẮT TÓC", "Gội đầu · Cạo râu"], ["SỬA XE", "Vá săm · Thay dầu"], ["HÀNG ĐƯỜNG", "Mứt Tết · Kẹo lạc"]];
const SIGN_COLS = [["#a8322a", "#f6d77a"], ["#1d3f7a", "#ffffff"], ["#f1c232", "#7a1d14"], ["#5b3a24", "#f1d27a"], ["#14532d", "#fef3c7"], ["#7a1d40", "#ffe4ef"]];

function paintFacade(A, r, H, rnd) {
  const c = A.c, e = A.e, w = H.w, h = H.h; A.begin(r);
  c.fillStyle = H.color; c.fillRect(-.3, -.3, w + .6, h + .6);
  if (H.style === "modern") { c.strokeStyle = "rgba(255,255,255,.18)"; c.lineWidth = .02; for (let y = .3; y < h - H.gh; y += .3) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } }
  for (let i = 0; i < 18; i++) { c.globalAlpha = .05 + rnd() * .08; c.fillStyle = rnd() < .5 ? "#3d3426" : "#4e5a33"; c.beginPath(); c.ellipse(rnd() * w, rnd() * h, .3 + rnd() * 1.4, .4 + rnd() * 2, 0, 0, 7); c.fill(); }
  c.globalAlpha = 1; const gT = c.createLinearGradient(0, 0, 0, 1.2); gT.addColorStop(0, "rgba(40,45,25,.35)"); gT.addColorStop(1, "rgba(40,45,25,0)"); c.fillStyle = gT; c.fillRect(0, 0, w, 1.2);
  for (let i = 0; i < 14; i++) { const x = rnd() * w, y = rnd() * (h - H.gh), l = .5 + rnd() * 2.5, g = c.createLinearGradient(0, y, 0, y + l); g.addColorStop(0, "rgba(50,40,25,.16)"); g.addColorStop(1, "rgba(50,40,25,0)"); c.fillStyle = g; c.fillRect(x, y, .05 + rnd() * .12, l); }
  c.fillStyle = shadeHex(H.color, 14); c.fillRect(0, 0, w, .35); c.fillStyle = "rgba(0,0,0,.18)"; c.fillRect(0, .35, w, .06);
  if (H.parapetText) A.text(H.parapetText, w / 2, .2, .26, "#7a5a32", { maxW: w - .4 });
  for (let f = 0; f < H.up; f++) { const y0 = .45 + f * H.fh, lit = H.lit[f], bays = H.bays, bw = Math.min(1.25, w / bays - .55), gap = (w - bays * bw) / (bays + 1);
    for (let b = 0; b < bays; b++) { const x = gap + b * (bw + gap), dh = 2.35, dy = y0 + H.fh - dh - .15, open = H.open[(f * 4 + b) % H.open.length], col = H.style === "colonial";
      c.fillStyle = shadeHex(H.color, 18); if (col) { c.beginPath(); c.moveTo(x - .14, dy + dh); c.lineTo(x - .14, dy + bw / 2); c.arc(x + bw / 2, dy + bw / 2, bw / 2 + .14, Math.PI, 0); c.lineTo(x + bw + .14, dy + dh); c.fill(); } else c.fillRect(x - .1, dy - .1, bw + .2, dh + .1);
      const hole = () => { c.beginPath(); if (col) { c.moveTo(x, dy + dh); c.lineTo(x, dy + bw / 2); c.arc(x + bw / 2, dy + bw / 2, bw / 2, Math.PI, 0); c.lineTo(x + bw, dy + dh); c.closePath(); } else c.rect(x, dy, bw, dh); };
      hole(); c.fillStyle = "#1f1b18"; c.fill(); const top = col ? bw / 2 : 0;
      if (open || H.style === "modern") { c.save(); hole(); c.clip(); c.fillStyle = lit ? "#5a4026" : "#2a2420"; c.fillRect(x, dy, bw, dh);
        c.fillStyle = H.curtain; c.globalAlpha = .7; c.fillRect(x + bw * .05, dy, bw * .25, dh); c.fillRect(x + bw * .7, dy, bw * .25, dh); c.globalAlpha = 1;
        if (H.style === "modern") { c.fillStyle = "rgba(150,190,210,.35)"; c.fillRect(x, dy, bw, dh); } c.restore();
        if (lit) { e.fillStyle = "#c98236"; e.fillRect(x, dy + top, bw, dh - top); e.fillStyle = "#ffcf7a"; e.fillRect(x + bw * .3, dy + dh * .3, bw * .4, dh * .5); } }
      if (H.style !== "modern") { const lv = (sx, sw) => { c.fillStyle = H.shutter; c.fillRect(sx, dy + top, sw, dh - top); c.fillStyle = "rgba(0,0,0,.28)"; for (let ly = dy + top + .06; ly < dy + dh - .05; ly += .09) c.fillRect(sx + .04, ly, sw - .08, .035); };
        if (open) { lv(x - bw * .45 - .05, bw * .42); lv(x + bw + .08, bw * .42); } else { lv(x, bw / 2 - .02); lv(x + bw / 2 + .02, bw / 2 - .02); if (lit) { e.fillStyle = "#6a3d16"; e.fillRect(x, dy + top, bw, dh - top); } }
        if (col) { c.fillStyle = H.shutter; c.beginPath(); c.arc(x + bw / 2, dy + bw / 2, bw / 2, Math.PI, 0); c.fill(); c.strokeStyle = "rgba(0,0,0,.4)"; c.lineWidth = .03; for (let k = 1; k < 6; k++) { const a = Math.PI + k / 6 * Math.PI; c.beginPath(); c.moveTo(x + bw / 2, dy + bw / 2); c.lineTo(x + bw / 2 + Math.cos(a) * bw / 2, dy + bw / 2 + Math.sin(a) * bw / 2); c.stroke(); } } }
      const g = c.createLinearGradient(0, dy + dh, 0, dy + dh + 1.1); g.addColorStop(0, "rgba(40,30,20,.22)"); g.addColorStop(1, "rgba(40,30,20,0)"); c.fillStyle = g; c.fillRect(x, dy + dh, bw, 1.1); }
    c.fillStyle = shadeHex(H.color, 10); c.fillRect(0, y0 + H.fh - .12, w, .12); c.fillStyle = "rgba(0,0,0,.2)"; c.fillRect(0, y0 + H.fh, w, .05); }
  const gy = h - H.gh, ow = w - .5; c.fillStyle = shadeHex(H.color, -25); c.fillRect(0, gy, w, H.gh);
  if (H.shopShut) { c.fillStyle = "#8f9498"; c.fillRect(.25, gy + 1.0, ow, H.gh - 1.0); c.fillStyle = "rgba(0,0,0,.18)"; for (let y = gy + 1.05; y < h; y += .07) c.fillRect(.25, y, ow, .025); }
  else { c.fillStyle = "#2b231d"; c.fillRect(.25, gy + 1.0, ow, H.gh - 1.0); const sg = c.createLinearGradient(0, gy + 1, 0, h); sg.addColorStop(0, "#5a4635"); sg.addColorStop(1, "#2a2019"); c.fillStyle = sg; c.fillRect(.4, gy + 1.15, ow - .3, H.gh - 1.2);
    for (let s = 0; s < 4; s++) { const sy = gy + 1.5 + s * .55; c.fillStyle = "#6b4a30"; c.fillRect(.45, sy, ow - .4, .05);
      for (let k = 0; k < 14; k++) { c.fillStyle = H.goods[Math.floor(rnd() * H.goods.length)]; const gw = .1 + rnd() * .22, gh = .15 + rnd() * .3; c.fillRect(.5 + rnd() * (ow - .7), sy - gh, gw, gh); } }
    if (H.hanging) for (let k = 0; k < Math.floor(ow / .5); k++) { c.fillStyle = H.hanging[k % H.hanging.length]; c.beginPath(); c.ellipse(.6 + k * .5, gy + 1.45, .16, .22, 0, 0, 7); c.fill(); }
    e.fillStyle = "#2e1c0c"; e.fillRect(.25, gy + 1.0, ow, H.gh - 1.0); e.fillStyle = "#6a4219"; e.fillRect(.6, gy + 1.1, ow - .7, .35); e.fillStyle = "#3d2510"; e.fillRect(.45, h - .6, ow - .4, .5); }
  if (H.sign) { const [bg, fg] = H.sign.col, fs = Math.min(.42, (w - .6) / (H.sign.t.length * .5)); c.fillStyle = bg; c.fillRect(.15, gy + .1, w - .3, .82); c.strokeStyle = shadeHex(fg, -30); c.lineWidth = .04; c.strokeRect(.24, gy + .17, w - .48, .68);
    A.text(H.sign.t, w / 2, gy + .44, fs, fg, { maxW: w - .6 }); A.text(H.sign.s, w / 2, gy + .74, .17, fg, { font: "system-ui, sans-serif", weight: "600", maxW: w - .8 });
    if (H.sign.led) { e.strokeStyle = "#ff3b2a"; e.lineWidth = .06; e.strokeRect(.2, gy + .14, w - .4, .74); } A.text(H.sign.t, w / 2, gy + .44, fs, fg, { em: true, maxW: w - .6 }); }
  c.fillStyle = "#1f4e9c"; c.fillRect(w - .55, gy - .45, .4, .28); A.text(String(H.no), w - .35, gy - .31, .17, "#fff", { font: "system-ui, sans-serif" });
  A.end(); }
function paintWall(A, r, col, rnd) { A.begin(r, r.w / 4); const c = A.c; c.fillStyle = col; c.fillRect(-.2, -.2, 4.4, 4.4); for (let i = 0; i < 20; i++) { c.globalAlpha = .06 + rnd() * .08; c.fillStyle = rnd() < .5 ? "#3d3426" : "#4e5a33"; c.beginPath(); c.ellipse(rnd() * 4, rnd() * 4, .3 + rnd(), .3 + rnd() * 1.5, 0, 0, 7); c.fill(); } c.globalAlpha = 1; A.end(); }
function paintTower(A, r, rnd) { const w = r.w / 10, h = r.h / 10; A.begin(r, 10); const c = A.c, e = A.e; c.fillStyle = "#c9c0ad"; c.fillRect(-.5, -.5, w + 1, h + 1);
  for (let y = 1; y < h - 1; y += 3) for (let x = .6; x < w - 1; x += 1.8) { c.fillStyle = "#3a4048"; c.fillRect(x, y, 1, 1.6); c.fillStyle = "#cfd3cf"; c.fillRect(x - .1, y + 1.6, 1.2, .25); if (rnd() < .35) { e.fillStyle = rnd() < .5 ? "#d9c08a" : "#b0c8d8"; e.fillRect(x, y, 1, 1.6); } } A.end(); }
function paintStripes(A, r, a, b) { A.begin(r, r.w / 2); const c = A.c; for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? a : b; c.fillRect(i * .25, -.2, .25, 2.4); } A.end(); }
function paintVSign(A, r, txt, bg, fg) { A.begin(r, r.w / .6); const c = A.c; c.fillStyle = bg; c.fillRect(-.1, -.1, .8, 2.4); c.strokeStyle = fg; c.lineWidth = .03; c.strokeRect(.05, .05, .5, 2.1);
  const ch = txt.split(" "), st = 1.8 / Math.max(1, ch.length - 1 || 1); ch.forEach((w, i) => { const fs = Math.min(.22, .5 / Math.max(2, w.length * .55)); A.text(w, .3, .3 + i * st, fs, fg, { maxW: .52 }); A.text(w, .3, .3 + i * st, fs, fg, { em: true, maxW: .52 }); }); A.end(); }
function paintPlaque(A, r, txt, bg, fg, sub) { const w = r.w / 60, h = r.h / 60; A.begin(r, 60); const c = A.c; c.fillStyle = bg; c.fillRect(-.1, -.1, w + .2, h + .2); c.strokeStyle = fg; c.lineWidth = .03; c.strokeRect(.05, .05, w - .1, h - .1);
  A.text(txt, w / 2, sub ? h * .4 : h / 2, h * (sub ? .38 : .5), fg, { maxW: w - .15 }); if (sub) A.text(sub, w / 2, h * .76, h * .2, fg, { font: "system-ui,sans-serif", maxW: w - .15 }); A.end(); }
function paintFlag(A, r) { A.begin(r, r.w / 1.5); const c = A.c; c.fillStyle = "#da251d"; c.fillRect(-.1, -.1, 1.7, 1.2); c.fillStyle = "#ffcd00"; c.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? .12 : .3; c.lineTo(.75 + Math.cos(a) * rr, .5 + Math.sin(a) * rr); } c.closePath(); c.fill(); A.end(); }
function paintXQ(A, r) { A.begin(r, r.w / 1.0); const c = A.c; c.fillStyle = "#e9c98f"; c.fillRect(-.05, -.05, 1.1, 1.2); c.strokeStyle = "#5a3a1c"; c.lineWidth = .006;
  const X = i => .1 + i * .1, Y = j => .1 + j * .1;
  for (let j = 0; j < 10; j++) { c.beginPath(); c.moveTo(X(0), Y(j)); c.lineTo(X(8), Y(j)); c.stroke(); }
  for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(X(i), Y(0)); c.lineTo(X(i), Y(4)); c.moveTo(X(i), Y(5)); c.lineTo(X(i), Y(9)); c.stroke(); }
  c.beginPath(); c.moveTo(X(0), Y(4)); c.lineTo(X(0), Y(5)); c.moveTo(X(8), Y(4)); c.lineTo(X(8), Y(5)); c.moveTo(X(3), Y(0)); c.lineTo(X(5), Y(2)); c.moveTo(X(5), Y(0)); c.lineTo(X(3), Y(2)); c.moveTo(X(3), Y(7)); c.lineTo(X(5), Y(9)); c.moveTo(X(5), Y(7)); c.lineTo(X(3), Y(9)); c.stroke();
  A.text("SỞ HÀ      HÁN GIỚI", .5, .55, .045, "#5a3a1c"); A.end(); }

function buildWorld(R) {
  _R3 = R;
  const useModel = (name, x, y, z, ry, s, col, em) => !!(R.hasModel && R.hasModel(name) && R.addStatic(name, M4.trs(x, y, z, ry || 0, s || 1, s || 1, s || 1), col || [1, 1, 1], em || 0));
  const rnd = mulberry(20240), A = new Atlas(4096, 4096, .25);
  const T = { side: R.tex(texSidewalk(), true), road: R.tex(texAsphalt(), true), roof: R.tex(texRoof(), true), stone: R.tex(texStone(), true) };
  const mk = () => new Builder();
  const B = { atlas: mk(), plain: mk(), side: mk(), road: mk(), roof: mk(), stone: mk(), water: mk(), foliage: mk() };
  const S = { dong: mk(), tet: mk(), tetA: mk() };
  const W = { lights: [], glows: [], stools: [], landmarks: {}, blocks: [], extras: [], parked: [], seasonLights: { dong: [], tet: [] }, seasonGlows: { dong: [], tet: [] } };
  const C = h => hex(h);
  let XF = null; const xfP = p => XF ? M4.tp(XF, p[0], p[1], p[2]) : p;
  const withAll = (m, fn) => { const all = [...Object.values(B), ...Object.values(S)], olds = all.map(b => b.m); all.forEach(b => b.m = m); XF = m; fn(); all.forEach((b, i) => b.m = olds[i]); XF = null; };
  const wallSlots = FACADE_COLS.map(col => { const r = A.alloc(104, 104); paintWall(A, r, col, rnd); return r.uv; });
  const towerSlots = [0, 1, 2].map(() => { const r = A.alloc(220, 330); paintTower(A, r, rnd); return r.uv; });
  const awnings = [["#b8322a", "#f4efe6"], ["#2f5e5a", "#efe3c4"], ["#c9973f", "#fff7e0"], ["#1d3f7a", "#ffffff"]].map(([a, b]) => { const r = A.alloc(60, 60); paintStripes(A, r, a, b); return r.uv; });
  const flagUV = (() => { const r = A.alloc(90, 60); paintFlag(A, r); return r.uv; })();
  const xqUV = (() => { const r = A.alloc(220, 240); paintXQ(A, r); return r.uv; })();
  W.xqUV = xqUV;

  const X0 = BRIDGE_X, X1 = 214;
  B.road.quad([X0, 0, CURB_S], [X1, 0, CURB_S], [X1, 0, CURB_N], [X0, 0, CURB_N], [1, 1, 1], [X0 / 8, 0, X1 / 8, 1]);
  B.road.quad([204, 0, 70], [214, 0, 70], [214, 0, -70], [204, 0, -70], [1, 1, 1], [0, -8, 1.25, 9]);
  const walk = (x0, x1, z0, z1) => B.side.quad([x0, WALK_Y, z1], [x1, WALK_Y, z1], [x1, WALK_Y, z0], [x0, WALK_Y, z0], [1, 1, 1], [x0 / 1.6, z0 / 1.6, x1 / 1.6, z1 / 1.6]);
  walk(X0, 204, NZ - .2, CURB_N); walk(X0, 204, CURB_S, SZ + .2);
  const kerb = (x0, x1, z0, z1) => B.plain.box(x0, 0, z0, x1, WALK_Y + .01, z1, C("#a9a59c"));
  kerb(X0, 204, CURB_N - .02, CURB_N + .18); kerb(X0, 204, CURB_S - .18, CURB_S + .02);
  walk(214, 222, -90, 90); walk(195, 204, -90, NZ - .2); walk(195, 204, SZ + .2, 90); kerb(213.8, 214.2, -90, 90);
  B.stone.box(221.5, -1.2, -90, 222.4, WALK_Y + .25, 90, C("#b8b0a0"), { world: true, ws: 2 });
  B.water.quad([222, -.35, 90], [520, -.35, 90], [520, -.35, -90], [222, -.35, -90], C("#356b58"));
  { const g = (x0, x1, z0, z1) => B.plain.quad([x0, -.05, z1], [x1, -.05, z1], [x1, -.05, z0], [x0, -.05, z0], C("#5a5a52")); // nền đất, chừa chỗ cho mặt hồ và sông Hồng
    g(BRIDGE_X - 14, 222, -200, 200); g(222, 700, 90, 200); g(222, 700, -200, -90); }
  for (const sgn of [-1, 1]) { const za = sgn > 0 ? SZ + .2 : -80, zb = sgn > 0 ? 80 : NZ - .2; walk(LANE.x0, LANE.x1, za, zb); }

  let no = 2;
  function house(x0, x1, side, o) {
    o = o || {}; const w = x1 - x0, up = o.up !== undefined ? o.up : 1 + Math.floor(rnd() * 3.4), gh = 3.6, fh = 3.2, h = gh + up * fh + .45;
    const style = o.style || (rnd() < .45 ? "colonial" : rnd() < .55 ? "old" : "modern"), color = o.color || FACADE_COLS[Math.floor(rnd() * FACADE_COLS.length)];
    const guild = GUILDS[Math.floor(rnd() * GUILDS.length)], sc = SIGN_COLS[Math.floor(rnd() * SIGN_COLS.length)];
    const H = { w, h, up, gh, fh, style, color, shutter: SHUTTER_COLS[Math.floor(rnd() * SHUTTER_COLS.length)], bays: Math.max(1, Math.min(3, Math.floor(w / 1.9))), lit: [], open: [],
      curtain: ["#c9b28a", "#a8433a", "#e9e2cf", "#5a7a8a"][Math.floor(rnd() * 4)], sign: o.sign === null ? null : (o.sign || { t: guild[0], s: guild[1], col: sc, led: rnd() < .4 }), no,
      shopShut: o.shut !== undefined ? o.shut : rnd() < .18, goods: ["#c8382f", "#e9b949", "#3f6e72", "#e7d6b0", "#9a5b3c", "#f4efe6", "#2f5e8a", "#d97b2b"], hanging: null,
      parapetText: o.parapetText || (style === "colonial" && rnd() < .3 ? String(1920 + Math.floor(rnd() * 25)) : null) };
    no += 2; if (H.sign && (H.sign.t === "HÀNG MÃ" || H.sign.t === "ĐÈN LỒNG")) H.hanging = ["#c8382f", "#e0a62a", "#c8382f", "#7a2a8a"];
    for (let f = 0; f < up; f++) { H.lit.push(rnd() < .5); for (let b = 0; b < 4; b++) H.open.push(rnd() < .45); }
    Object.assign(H, o.H || {}); const r = A.alloc(w * PX, h * PX); paintFacade(A, r, H, rnd);
    const ci = FACADE_COLS.indexOf(color), wall = wallSlots[ci >= 0 ? ci : 0], N = side === "N", zf = N ? NZ : SZ, depth = o.depth || 14;
    const zA = Math.min(zf, N ? zf - depth : zf + depth), zB = Math.max(zf, N ? zf - depth : zf + depth), faces = { f: wall, b: wall, l: wall, r: wall, t: wall, d: false };
    if (N) faces.f = r.uv; else faces.b = r.uv; B.atlas.box(x0, 0, zA, x1, h, zB, [1, 1, 1], { faces });
    { const a = xfP([x0, 0, zA]), b = xfP([x1, h, zB]); W.blocks.push({ x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]), z0: Math.min(a[2], b[2]), z1: Math.max(a[2], b[2]), h, lm: o.lm }); }
    const s = N ? 1 : -1, zF = zf, lite = C(shadeHex(color, 16));
    for (let f = 0; f < up; f++) { const yb = gh + (up - 1 - f) * fh; B.plain.box(x0, yb - .14, Math.min(zF, zF + s * .22), x1, yb, Math.max(zF, zF + s * .22), lite);
      if (style !== "modern" ? rnd() < .75 : rnd() < .5) { const d = style === "colonial" ? .75 : 1.0, bx0 = x0 + .15, bx1 = x1 - .15, z1 = zF + s * d;
        B.plain.box(bx0, yb - .02, Math.min(zF, z1), bx1, yb + .14, Math.max(zF, z1), lite); const ironC = C(style === "modern" ? "#d6d3cb" : "#2a2a28");
        if (style === "modern") B.plain.box(bx0, yb + .14, Math.min(z1, z1 - s * .1), bx1, yb + 1.0, Math.max(z1, z1 - s * .1), C(shadeHex(color, 8)));
        else { const rail = (ax, az, bx, bz) => { B.plain.box(Math.min(ax, bx) - .02, yb + .98, Math.min(az, bz) - .02, Math.max(ax, bx) + .02, yb + 1.04, Math.max(az, bz) + .02, ironC);
            const L = Math.hypot(bx - ax, bz - az), n = Math.floor(L / .13); for (let k = 0; k <= n; k++) { const t = k / n, px = ax + (bx - ax) * t, pz = az + (bz - az) * t; B.plain.box(px - .012, yb + .14, pz - .012, px + .012, yb + .98, pz + .012, ironC); } };
          rail(bx0, z1, bx1, z1); rail(bx0, zF, bx0, z1); rail(bx1, zF, bx1, z1); }
        if (rnd() < .55) { const fc = rnd() < .6 ? "#d63a7a" : rnd() < .5 ? "#e8732a" : "#f3e7e9";
          for (let k = 0; k < 6 + rnd() * 8; k++) B.foliage.sphere(bx0 + .2 + rnd() * (bx1 - bx0 - .4), yb + .9 + rnd() * .5, z1 - s * (.15 + rnd() * .2), .22 + rnd() * .2, .18 + rnd() * .15, .2, C(rnd() < .55 ? fc : "#3f7a35"), 6, { wind: .6 });
          for (let k = 0; k < 4; k++) B.foliage.sphere(bx0 + .3 + rnd() * (bx1 - bx0 - .6), yb - .2 - rnd() * .4, z1 + s * .05, .12, .4, .1, C(fc), 5, { wind: 1 }); }
        if (rnd() < .25) { const px = (bx0 + bx1) / 2; for (let k = 0; k < 4; k++) B.plain.box(px - .9 + k * .45, yb + .5, Math.min(z1, z1 - s * .05), px - .6 + k * .45, yb + 1.0, Math.max(z1, z1 - s * .05), C(["#e9e2cf", "#8a3a3a", "#3e5a72", "#f2c230"][k])); }
        if (f === 0 && rnd() < .5) { const fx = x0 + .4; S.tetA.box(fx, yb + .2, Math.min(z1, z1 + s * .02), fx + .9, yb + .8, Math.max(z1, z1 + s * .02), [1, 1, 1], { faces: { f: flagUV, b: flagUV, l: false, r: false, t: false, d: false } }); }
      }
      if (rnd() < .3) { const ax = x0 + .3 + rnd() * (w - 1.2), ay = yb + 1.6; B.plain.box(ax, ay, Math.min(zF, zF + s * .32), ax + .8, ay + .55, Math.max(zF, zF + s * .32), C("#e7e7e2")); } }
    if (style === "old" || (style === "colonial" && rnd() < .5)) { const ry = h, d = 5, zBack = N ? zf - depth : zf + depth;
      const pA = [x0 - .1, ry - .1, zF + s * .45], pB = [x1 + .1, ry - .1, zF + s * .45], pC = [x1 + .1, ry + 2.2, zF - s * d], pD = [x0 - .1, ry + 2.2, zF - s * d];
      if (N) B.roof.quad(pA, pB, pC, pD, [1, 1, 1], [0, 0, w / 2, 2.6]); else B.roof.quad(pB, pA, pD, pC, [1, 1, 1], [0, 0, w / 2, 2.6]);
      B.plain.box(x0 - .1, ry + 2.15, Math.min(zF - s * d, zF - s * (d + .3)), x1 + .1, ry + 2.35, Math.max(zF - s * d, zF - s * (d + .3)), C("#6e3624"));
      const pE = [x0 - .1, ry + 2.2, zF - s * d], pF = [x1 + .1, ry + 2.2, zF - s * d], pG = [x1 + .1, ry - .1, zBack], pH = [x0 - .1, ry - .1, zBack];
      if (N) B.roof.quad(pH, pG, pF, pE, [1, 1, 1], [0, 0, w / 2, 4]); else B.roof.quad(pG, pH, pE, pF, [1, 1, 1], [0, 0, w / 2, 4]); }
    else { B.plain.box(x0, h, Math.min(zF, zF - s * .2), x1, h + .9, Math.max(zF, zF - s * .2), C(shadeHex(color, 6)));
      if (rnd() < .7) { const tx = x0 + .6 + rnd() * Math.max(.1, w - 2.2), tz = zF - s * (2 + rnd() * 5); B.plain.box(tx, h, tz - .5, tx + 1.4, h + .5, tz + .5, C("#6b6b66"));
        B.plain.with(M4.mul(new Float32Array(16), M4.trs(tx, h + 1.05, tz, 0, 1, 1, 1), M4.rotZ(Math.PI / 2)), () => B.plain.cyl(0, -.05, 0, .55, 1.5, 14, C("#d8dcdf"))); }
      if (rnd() < .6) for (let k = 0; k < 3; k++) B.foliage.sphere(x0 + .5 + rnd() * (w - 1), h + 1.2, zF - s * (.6 + rnd()), .4, .5, .4, C("#3f7a35"), 6, { wind: .5 }); }
    if (!H.shopShut && rnd() < .4) { const aw = awnings[Math.floor(rnd() * awnings.length)], y1 = gh - .05, y2 = gh - .7, d = 1.3;
      const a = [x0 + .1, y2, zF + s * d], b = [x1 - .1, y2, zF + s * d], c2 = [x1 - .1, y1, zF + s * .05], d2 = [x0 + .1, y1, zF + s * .05];
      if (N) B.atlas.quad(a, b, c2, d2, [1, 1, 1], aw); else B.atlas.quad(b, a, d2, c2, [1, 1, 1], aw); }
    if (H.sign && rnd() < .45) { const rv = A.alloc(32, 118); paintVSign(A, rv, H.sign.t.split(" ").slice(0, 3).join(" "), H.sign.col[0], H.sign.col[1]); const sx = rnd() < .5 ? x0 + .15 : x1 - .15, yy = gh + .3;
      B.atlas.box(sx - .05, yy, Math.min(zF + s * .2, zF + s * .8), sx + .05, yy + 2.2, Math.max(zF + s * .2, zF + s * .8), [1, 1, 1], { faces: { l: rv.uv, r: rv.uv, f: false, b: false, t: false, d: false } }); }
    if (!H.shopShut && rnd() < .7) for (const cx of [x0 + .32, x1 - .32]) S.tet.box(cx - .12, 1.2, Math.min(zF, zF + s * .04), cx + .12, 3.1, Math.max(zF, zF + s * .04), C("#c8251d"));
    if (!H.shopShut) W.lights.push({ p: xfP([(x0 + x1) / 2, 2.2, zF + s * 1.4]), c: [1.6, 1.0, .5], r: 6.5 });
    if (H.sign && H.sign.led) W.glows.push([...xfP([(x0 + x1) / 2, gh - .3, zF + s * .1]), 1, .25, .15, 1.6]);
    return H;
  }
  function row(side, x0, x1, skip) { let x = x0; while (x < x1 - 2.5) { let w = 3.6 + rnd() * 2.6; if (x1 - x - w < 3.2) w = x1 - x; const s = skip && skip.find(k => x < k[1] && x + w > k[0]);
      if (s) { if (x < s[0] - 3) house(x, s[0], side); x = s[1]; continue; } house(x, x + w, side); x += w; } }

  house(18, 34, "N", { up: 1, style: "colonial", color: "#ece2c8", sign: { t: "CHỢ HÀNG BÈ", s: "Rau · Hoa · Đồ khô · Đồ lễ", col: ["#a8322a", "#f6d77a"] }, parapetText: "CHỢ", lm: "market", H: { bays: 6, open: [1, 0, 1, 0, 1, 0], lit: [1] } });
  house(44, 50, "S", { up: 2, style: "old", color: "#d9a441", sign: { t: "PHỞ GIA TRUYỀN", s: "Bát Đàn · Phở bò tái nạm", col: ["#a8322a", "#fff6dc"], led: true }, lm: "pho", shut: false, H: { goods: ["#f4efe6", "#d8dcdf", "#7a2a22"] } });
  house(108, 113, "S", { up: 2, style: "colonial", color: "#e8c98a", sign: { t: "CÀ PHÊ GIẢNG", s: "Cà phê trứng · từ 1946", col: ["#4a2f22", "#f4e3c3"] }, lm: "giang", shut: false });
  house(126, 131, "N", { up: 2, style: "old", color: "#c9a46a", sign: { t: "CHẢ CÁ LÃ VỌNG", s: "Chả cá · Bún · Thì là", col: ["#1d1714", "#e8c46a"] }, lm: "lavong", shut: false });
  house(160, 172, "N", { up: 1, style: "colonial", color: "#f1e6cf", sign: { t: "KEM TRÀNG TIỀN", s: "Kem que · Kem ốc quế · Kem cốc", col: ["#b8322a", "#ffffff"], led: true }, lm: "kem", shut: false, parapetText: "TRÀNG TIỀN", H: { bays: 5, goods: ["#f4efe6", "#9fd18a", "#e9c13a", "#d8a0a0"] } });
  house(-44, -12, "N", { up: 3, style: "colonial", color: "#e9cf98", sign: { t: "CHỢ ĐỒNG XUÂN", s: "Chợ đầu mối lớn nhất phố cổ · 1889", col: ["#7a1d14", "#f6d77a"], led: true }, lm: "dongxuan", shut: false, depth: 24, parapetText: "ĐỒNG XUÂN", H: { bays: 12, open: [1, 1, 0, 1], lit: [1, 1, 1] } });
  { const hDX = 3.6 + 3 * 3.2 + .45; [[-36.5, 5, 3.2], [-28, 7.5, 5], [-19.5, 5, 3.2]].forEach(([cx, hw, hh]) => { const col = C("#efd9a6"), z = NZ + .02;
      B.plain.tri([cx - hw, hDX, z], [cx + hw, hDX, z], [cx, hDX + hh, z], col); B.plain.box(cx - hw, hDX - .1, NZ - 6, cx + hw, hDX + .05, NZ, col);
      B.roof.quad([cx - hw - .3, hDX, z + .3], [cx, hDX + hh + .2, z + .3], [cx, hDX + hh + .2, NZ - 6], [cx - hw - .3, hDX, NZ - 6], [1, 1, 1], [0, 0, 3, 3]);
      B.roof.quad([cx, hDX + hh + .2, z + .3], [cx + hw + .3, hDX, z + .3], [cx + hw + .3, hDX, NZ - 6], [cx, hDX + hh + .2, NZ - 6], [1, 1, 1], [0, 0, 3, 3]);
      B.plain.cyl(cx, hDX + hh * .45, z + .03, hh * .22, .02, 18, C("#7a1d14"), { cap: true }); });
    const pr = A.alloc(260, 60); paintPlaque(A, pr, "ĐỒNG XUÂN", "#7a1d14", "#f6d77a", "1889"); B.atlas.quad([-31.5, hDX + 1.2, NZ + .06], [-24.5, hDX + 1.2, NZ + .06], [-24.5, hDX + 2.8, NZ + .06], [-31.5, hDX + 2.8, NZ + .06], [1, 1, 1], pr.uv); }
  row("N", -96, -5, [[-58, -50], [-44, -12]]); row("S", -96, -5, [[-58, -50]]);
  row("N", 6, 196, [[18, 34], [126, 131], [160, 172]]); row("S", 6, 196, [[44, 50], [108, 113]]);
  withAll(M4.trs(LANE.x0 + 9, 0, 0, Math.PI / 2, 1, 1, 1), () => { row("N", -70, -23.5); row("N", 23.5, 70); });
  withAll(M4.trs(LANE.x1 - 9, 0, 0, -Math.PI / 2, 1, 1, 1), () => { row("N", -70, -23.5); row("N", 23.5, 70); });
  for (let z = 12; z < 60; z += 5 + rnd() * 2) { const h = 8 + rnd() * 6, rr = A.alloc(5 * PX, h * PX);
    paintFacade(A, rr, { w: 5, h, up: Math.round((h - 4) / 3.2), gh: 3.6, fh: 3.2, style: "colonial", color: FACADE_COLS[Math.floor(rnd() * 11)], shutter: "#3f6e52", bays: 2, lit: [1, 0, 1, 0], open: [1, 0, 1, 0, 0, 1, 1, 0], curtain: "#c9b28a", sign: null, no: 1, shopShut: rnd() < .3, goods: ["#c8382f", "#e9b949"] }, rnd);
    B.atlas.box(186, 0, z, 196, h, z + 5, [1, 1, 1], { faces: { r: rr.uv, l: wallSlots[2], f: wallSlots[2], b: wallSlots[2], t: wallSlots[2], d: false } });
    B.atlas.box(186, 0, -z - 5, 196, h, -z, [1, 1, 1], { faces: { r: rr.uv, l: wallSlots[3], f: wallSlots[3], b: wallSlots[3], t: wallSlots[3], d: false } }); }
  for (let x = -96; x < 196; x += 9 + rnd() * 8) for (const N of [true, false]) { if (rnd() < .25 || (x > -76 && x < -36)) continue; const h = 14 + rnd() * 14, w = 8 + rnd() * 8, z0 = N ? NZ - 18 - rnd() * 10 : SZ + 18 + rnd() * 10, t = towerSlots[Math.floor(rnd() * 3)];
    B.atlas.box(x, 0, N ? z0 - 12 : z0, x + w, h, N ? z0 : z0 + 12, [1, 1, 1], { faces: { f: t, b: t, l: t, r: t, t: wallSlots[7], d: false } }); }

  (function gate() { const St = B.stone, col = [1, 1, 1], gw = 3.4;
    St.box(-3.2, 0, -12, 3.2, 6.6, -gw / 2 - .2, col, { world: true, ws: 2 }); St.box(-3.2, 0, gw / 2 + .2, 3.2, 6.6, 12, col, { world: true, ws: 2 }); St.box(-3.2, 4.6, -gw / 2 - .2, 3.2, 6.6, gw / 2 + .2, col, { world: true, ws: 2 });
    for (let k = 0; k < 14; k++) { const a0 = k / 14 * Math.PI, a1 = (k + 1) / 14 * Math.PI, r = gw / 2 + .2, y = 3.3, z0 = -Math.cos(a0) * r, z1 = -Math.cos(a1) * r, y0 = y + Math.sin(a0) * r, y1 = y + Math.sin(a1) * r;
      St.quad([-3.2, y0, z0], [3.2, y0, z0], [3.2, y1, z1], [-3.2, y1, z1], col, [0, 0, 3.2, .4]); St.box(-3.2, Math.max(y0, y1), Math.min(z0, z1), 3.2, 4.62, Math.max(z0, z1), col, { world: true, ws: 2, faces: { f: false, b: false } }); }
    St.box(-3.4, 6.6, -12.2, 3.4, 6.85, 12.2, C("#9a917f"), { world: true, ws: 2 }); St.box(-2.3, 6.85, -5.5, 2.3, 9.3, 5.5, C("#d8cfb4"), { world: true, ws: 2 });
    for (const sx of [-1, 1]) B.plain.with(M4.mul(new Float32Array(16), M4.trs(sx * 2.32, 8.0, 0, 0, 1, 1, 1), M4.rotZ(Math.PI / 2)), () => { for (const zz of [-3, 0, 3]) B.plain.cyl(0, -.02, zz, .4, .04, 16, C("#2b221c")); });
    const tier = (y, hx, hz, rise, over) => { const Rf = B.roof, c2 = [1, 1, 1];
      Rf.quad([-hx - over, y, -hz - over], [-hx - over, y, hz + over], [0, y + rise, hz * .55], [0, y + rise, -hz * .55], c2, [0, 0, hz, 2]); Rf.quad([hx + over, y, hz + over], [hx + over, y, -hz - over], [0, y + rise, -hz * .55], [0, y + rise, hz * .55], c2, [0, 0, hz, 2]);
      Rf.quad([-hx - over, y, hz + over], [hx + over, y, hz + over], [0, y + rise, hz * .55], [0, y + rise, hz * .55], c2, [0, 0, hx, 2]); Rf.quad([hx + over, y, -hz - over], [-hx - over, y, -hz - over], [0, y + rise, -hz * .55], [0, y + rise, -hz * .55], c2, [0, 0, hx, 2]);
      B.plain.box(-.2, y + rise - .05, -hz * .58, .2, y + rise + .25, hz * .58, C("#4b3a2e"));
      for (const sz of [-1, 1]) for (const sx of [-1, 1]) B.plain.rod([sx * (hx + over), y, sz * (hz + over)], [sx * (hx + over + .35), y + .55, sz * (hz + over + .35)], .09, C("#4b3a2e")); };
    tier(9.3, 2.3, 5.5, 1.5, .9); St.box(-1.4, 10.4, -2.6, 1.4, 11.8, 2.6, C("#d8cfb4"), { world: true, ws: 2 }); tier(11.8, 1.4, 2.6, 1.2, .7);
    const pr = A.alloc(200, 46); paintPlaque(A, pr, "Ô QUAN CHƯỞNG", "#efe3c4", "#3a2a1a", "Cửa Đông Hà");
    B.atlas.quad([3.22, 5.2, -1.85], [3.22, 5.2, 1.85], [3.22, 6.05, 1.85], [3.22, 6.05, -1.85], [1, 1, 1], pr.uv); B.atlas.quad([-3.22, 5.2, 1.85], [-3.22, 5.2, -1.85], [-3.22, 6.05, -1.85], [-3.22, 6.05, 1.85], [1, 1, 1], pr.uv);
    for (let k = 0; k < 40; k++) { const z = (rnd() - .5) * 22, y = 4 + rnd() * 2.6; if (Math.abs(z) < 2.2 && y < 4.8) continue; B.foliage.sphere(3.25 * (rnd() < .5 ? 1 : -1), y, z, .1, .35 + rnd() * .5, .3, C(rnd() < .5 ? "#3f5f2e" : "#56743a"), 5, { wind: .3 }); }
    W.blocks.push({ x0: -3.2, x1: 3.2, z0: -12, z1: 12, h: 12, lm: "gate" }); })();

  function tree(x, z, h, s) { s = s || 1; const tr = C("#5f4a3a");
    B.plain.cyl(x, 0, z, .22 * s, h * .6, 8, tr, { r2: .15 * s }); B.plain.rod([x, h * .45, z], [x + .9 * s, h * .75, z + .4], .1 * s, tr); B.plain.rod([x, h * .5, z], [x - .8 * s, h * .8, z - .5], .1 * s, tr);
    for (let k = 0; k < Math.round(10 * s); k++) { const a = rnd() * 6.28, rr = rnd() * 2.2 * s; B.foliage.sphere(x + Math.cos(a) * rr, h * .62 + rnd() * h * .45, z + Math.sin(a) * rr, (1.1 + rnd() * .9) * s, (.8 + rnd() * .6) * s, (1.1 + rnd() * .9) * s, C(["#3f7a35", "#4b8f42", "#36692f", "#5a9a45", "#6f9a3a"][Math.floor(rnd() * 5)]), 7, { wind: .7 }); } }
  function sau(x, z) {
    if (!useModel("sau", x, 0, z, rnd() * 6.283, (11 + rnd() * 3) / 11)) { tree(x, z, 11 + rnd() * 3, 1.5); B.plain.cyl(x, 0, z, .36, 1.3, 10, C("#efeee8"), { cap: false }); }
    B.plain.box(x - .7, 0, z - .7, x + .7, WALK_Y + .08, z + .7, C("#8e8a82")); }
  function willow(x, z) { B.plain.cyl(x, 0, z, .25, 4.5, 8, C("#4f4034"), { r2: .18 }); const col = C("#7da35a"), col2 = C("#6f9a4e");
    for (let k = 0; k < 12; k++) { const a = rnd() * 6.28, rr = rnd() * 1.6; B.foliage.sphere(x + Math.cos(a) * rr, 5.2 + rnd() * 1.2, z + Math.sin(a) * rr, 1.3, .8, 1.3, k % 2 ? col : col2, 9, { wind: .6 }); }
    for (let k = 0; k < 90; k++) { const a = rnd() * 6.28, rr = .8 + rnd() * 2.2, px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr; B.foliage.box(px - .016, 1.6 + rnd() * 2.2, pz - .016, px + .016, 5.4 + rnd() * .5, pz + .016, k % 3 ? col : col2, { wind: 1.4 }); } }
  function lamp(x, z, ax) { const g = C("#24382c");
    const lx = x + (ax === "x" ? .45 : 0), lz = z + (ax === "x" ? 0 : (z < 0 ? .45 : -.45));
    if (!useModel("lamp", x, 0, z, ax === "x" ? Math.PI / 2 : (z < 0 ? 0 : Math.PI), 1, null, 1)) {
      B.plain.cyl(x, 0, z, .2, .7, 10, g, { r2: .12 }); B.plain.cyl(x, .7, z, .07, 3.4, 8, g);
      B.plain.rod([x, 3.9, z], [lx, 4.0, lz], .05, g); B.plain.cyl(lx, 3.95, lz, .2, .1, 8, g); B.plain.cyl(lx, 4.05, lz, .14, .4, 8, C("#f6e7b8"), { em: 1 }); B.plain.cyl(lx, 4.45, lz, .24, .25, 8, g, { r2: .02 }); }
    W.lights.push({ p: [lx, 3.9, lz], c: [2.4, 1.8, 1.0], r: 13 }); W.glows.push([lx, 3.95, lz, 1, .78, .45, 5]); }

  (function lake() { const tx = 258, tz = 14; B.foliage.sphere(tx, -.6, tz, 9, 1.2, 6, C("#4f7a3a"), 12);
    for (let k = 0; k < 5; k++) tree(tx + 4 + rnd() * 3, tz - 4 + k * 2, 4 + rnd() * 3, .8);
    const St = B.stone, tc = C("#e2d6b8");
    const tier = (y, hw, hd, hh) => { St.box(tx - hw, y, tz - hd, tx + hw, y + hh, tz + hd, tc, { world: true, ws: 2 }); B.plain.box(tx - hw - .25, y + hh, tz - hd - .25, tx + hw + .25, y + hh + .22, tz + hd + .25, C("#6a5440"));
      const n = Math.max(1, Math.round(hw / .8)); for (let k = 0; k < n; k++) { const ax = tx - hw + (k + .5) * (2 * hw / n); for (const sz of [-1, 1]) { B.plain.box(ax - .22, y + .15, tz + sz * (hd + .01) - .01, ax + .22, y + hh * .7, tz + sz * (hd + .01) + .01, C("#3a342c")); B.plain.cyl(ax, y + hh * .7 - .01, tz + sz * (hd + .02), .22, .01, 8, C("#3a342c")); } } };
    tier(.4, 2.6, 1.9, 2.6); tier(3.22, 1.9, 1.4, 2.0); tier(5.44, 1.3, 1.0, 1.6);
    for (const [a, b] of [[[-1.5, 1.2], [1.5, 1.2]], [[1.5, -1.2], [-1.5, -1.2]], [[-1.5, -1.2], [-1.5, 1.2]], [[1.5, 1.2], [1.5, -1.2]]]) B.roof.quad([tx + a[0], 7.26, tz + a[1]], [tx + b[0], 7.26, tz + b[1]], [tx, 8.4, tz], [tx, 8.4, tz], [1, 1, 1], [0, 0, 2, 1]);
    W.lights.push({ p: [tx, 4, tz + 4], c: [1.4, 1.1, .6], r: 12 }); W.glows.push([tx, 4, tz, 1, .8, .4, 9]);
    const ix = 246, iz = -34; B.foliage.sphere(ix, -.5, iz, 10, 1.1, 7, C("#4f7a3a"), 12); for (let k = 0; k < 8; k++) tree(ix - 6 + rnd() * 12, iz - 5 + rnd() * 9, 5 + rnd() * 4, 1);
    B.plain.box(ix - 3, .4, iz - 2, ix + 3, 3.2, iz + 2, C("#d9c99f"));
    for (const [y, w, d] of [[3.2, 3.8, 2.8], [4.4, 2.6, 1.9]]) { B.roof.quad([ix - w, y, iz + d], [ix + w, y, iz + d], [ix + w * .6, y + 1.1, iz], [ix - w * .6, y + 1.1, iz], [1, 1, 1], [0, 0, 3, 1]); B.roof.quad([ix + w, y, iz - d], [ix - w, y, iz - d], [ix - w * .6, y + 1.1, iz], [ix + w * .6, y + 1.1, iz], [1, 1, 1], [0, 0, 3, 1]); if (y < 4) B.plain.box(ix - 1.8, y, iz - 1.2, ix + 1.8, y + 1.2, iz + 1.2, C("#d9c99f")); }
    const red = C("#c23b2b"), p0 = [222.4, .3, -26], p1 = [ix - 3, .4, iz + 1]; let prev = null;
    for (let k = 0; k <= 18; k++) { const t = k / 18, x = p0[0] + (p1[0] - p0[0]) * t, z = p0[2] + (p1[2] - p0[2]) * t, y = .35 + Math.sin(t * Math.PI) * 2.0;
      if (prev) { const L = Math.hypot(x - prev[0], z - prev[2]), ang = Math.atan2(z - prev[2], x - prev[0]), pitch = Math.atan2(y - prev[1], L);
        B.plain.with(M4.mul(new Float32Array(16), M4.trs((x + prev[0]) / 2, (y + prev[1]) / 2, (z + prev[2]) / 2, -ang, 1, 1, 1), M4.rotZ(pitch)), () => B.plain.box(-L / 2 - .02, -.12, -1.1, L / 2 + .02, .05, 1.1, red));
        for (const sd of [-1, 1]) { const nx = -Math.sin(ang) * sd * 1.05, nz = Math.cos(ang) * sd * 1.05; B.plain.rod([prev[0] + nx, prev[1] + .9, prev[2] + nz], [x + nx, y + .9, z + nz], .05, red); B.plain.rod([x + nx, y, z + nz], [x + nx, y + .9, z + nz], .06, red); } }
      prev = [x, y, z]; }
    for (let k = 0; k < 10; k++) { const t = k / 9; W.glows.push([p0[0] + (p1[0] - p0[0]) * t, .4 + Math.sin(t * Math.PI) * 2 + 1.05, p0[2] + (p1[2] - p0[2]) * t, 1, .3, .2, 2.2]); }
    W.lights.push({ p: [234, 2.5, -30], c: [1.6, .5, .3], r: 10 });
    B.plain.box(221.2, 0, -28.5, 221.6, 4, -28.1, red); B.plain.box(221.2, 0, -23.9, 221.6, 4, -23.5, red); B.roof.quad([221, 4, -29.2], [221, 4, -22.8], [221.4, 4.8, -24.2], [221.4, 4.8, -27.8], [1, 1, 1], [0, 0, 3, 1]);
    const iron = C("#2c332c"); for (let z = -88; z < 88; z += 2) { if (z > -29 && z < -23) continue; B.plain.box(221.6, WALK_Y, z, 221.75, WALK_Y + .9, z + .06, iron); B.plain.box(221.6, WALK_Y + .85, z, 221.75, WALK_Y + .9, z + 2, iron); B.plain.box(221.6, WALK_Y + .35, z, 221.75, WALK_Y + .38, z + 2, iron); }
    for (let z = -80; z < 80; z += 13) { if (Math.abs(z + 26) < 6 || (z > -12 && z < 4)) continue; willow(218.6, z + rnd() * 3); }
    for (let z = -70; z < 70; z += 17) B.plain.box(216, WALK_Y, z, 216.5, WALK_Y + .45, z + 1.6, C("#9a9488"));
    for (let z = -84; z < 84; z += 18) lamp(214.6, z, "x");
    for (let k = 0; k < 60; k++) tree(480 + rnd() * 10, -90 + k * 3, 6 + rnd() * 5, 1.3);
    for (let x = 230; x < 470; x += 10 + rnd() * 8) for (const zs of [-1, 1]) { tree(x, zs * (84 + rnd() * 6), 6 + rnd() * 5, 1.3); if (rnd() < .6) B.atlas.box(x, 0, zs > 0 ? 96 : -110, x + 10, 10 + rnd() * 16, zs > 0 ? 110 : -96, [1, 1, 1], { faces: { f: towerSlots[0], b: towerSlots[1], l: towerSlots[2], r: towerSlots[0], t: wallSlots[7], d: false } }); }
    W.blocks.push({ x0: 222, x1: 520, z0: -90, z1: 90, h: 0, lm: "lake", water: true }); })();

  (function rail() { const rc = C("#6d6f72"), sl = C("#5a4a3a"), bal = C("#5f5a55");
    B.plain.box(LANE.cx - 1.4, 0, -80, LANE.cx + 1.4, .1, NZ - .2, bal); B.plain.box(LANE.cx - 1.4, 0, SZ + .2, LANE.cx + 1.4, .1, 80, bal);
    for (let z = -80; z < 80; z += .65) { const onStreet = z > NZ - .2 && z < SZ + .2; B.plain.box(LANE.cx - 1.1, onStreet ? 0 : .1, z, LANE.cx + 1.1, (onStreet ? .02 : .18), z + .24, onStreet ? C("#3a3a3a") : sl); }
    for (const dx of [-.72, .72]) B.plain.box(LANE.cx + dx - .04, 0, -80, LANE.cx + dx + .04, .26, 80, rc);
    W.barriers = []; for (const [bx, bz] of [[LANE.x0 - .5, CURB_N - .6], [LANE.x1 + .5, CURB_S + .6]]) { B.plain.box(bx - .12, 0, bz - .12, bx + .12, 1.1, bz + .12, C("#333")); B.plain.cyl(bx, 1.1, bz, .1, 1.6, 8, C("#e8e8e8")); B.plain.sphere(bx, 2.75, bz, .14, .14, .14, C("#601010"), 8); W.barriers.push({ x: bx, z: bz }); }
    for (const sx of [LANE.x0 + .8, LANE.x1 - .8]) for (let z = 26; z < 60; z += 3.2) { B.plain.box(sx - .25, WALK_Y, z - .25, sx + .25, WALK_Y + .4, z + .25, C("#6b4a30")); stoolGeo(B.plain, sx, z + .55, Math.PI, C(rnd() < .5 ? "#2f74c0" : "#c8382f")); stoolGeo(B.plain, sx, z - .55, 0, C("#2f74c0")); }
    const pr = A.alloc(220, 50); paintPlaque(A, pr, "CÀ PHÊ ĐƯỜNG TÀU", "#1d3f7a", "#ffffff", "Giữ khoảng cách an toàn khi tàu chạy qua");
    B.plain.box(LANE.x0 - .1, 2.6, 23.4, LANE.x0 + .02, 3.6, 27.6, C("#1d3f7a")); B.atlas.quad([LANE.x0 + .03, 2.62, 27.5], [LANE.x0 + .03, 2.62, 23.5], [LANE.x0 + .03, 3.58, 23.5], [LANE.x0 + .03, 3.58, 27.5], [1, 1, 1], pr.uv);
    W.lights.push({ p: [LANE.cx, 3, 32], c: [1.8, 1.2, .6], r: 10 }); W.lights.push({ p: [LANE.cx, 3, -32], c: [1.8, 1.2, .6], r: 10 });
    for (let z = 24; z < 64; z += 4) for (const zs of [-1, 1]) for (const s of [-1, 1]) { const p = [LANE.cx + s * 3.2, 3.2, zs * z]; B.plain.sphere(p[0], p[1], p[2], .1, .12, .1, C("#ffe7a8"), 6, { em: 1.2 }); if (s > 0) W.glows.push([...p, 1, .8, .45, 1.6]); }
    W.blocks.push({ x0: LANE.x0, x1: LANE.x1, z0: 18, z1: 70, h: .3, lm: "duongtau" }); })();

  (function longbien() { const rust = C("#4c4036"), deck = C("#56524c");
    B.plain.box(-480, -.6, -5.4, BRIDGE_X, 0, 5.4, deck); B.road.quad([-480, .01, 4.6], [BRIDGE_X, .01, 4.6], [BRIDGE_X, .01, -4.6], [-480, .01, -4.6], [1, 1, 1], [0, 0, 47, 1]);
    for (const sz of [-1, 1]) B.plain.box(-480, 0, sz * 5.4 - .06, BRIDGE_X, 1.05, sz * 5.4 + .06, C("#3a3a36"));
    B.water.quad([-1200, -9, 400], [BRIDGE_X - 14, -9, 400], [BRIDGE_X - 14, -9, -400], [-1200, -9, -400], C("#7a6a4a"));
    B.plain.box(BRIDGE_X - 14, -9, -200, BRIDGE_X, 0, 200, C("#6d6a52"));
    for (let k = 0; k < 8; k++) B.foliage.sphere(-260 - k * 70, -8.6, (k % 2 ? 1 : -1) * (60 + rnd() * 120), 30 + rnd() * 25, 1.6, 14 + rnd() * 10, C(k % 3 ? "#8a8a4f" : "#6f8a4a"), 10);
    for (let i = 0; i < 6; i++) { const xa = BRIDGE_X - 8 - i * 62, xb = xa - 62;
      B.stone.box(xa - 2, -14, -6.4, xa + .5, -.6, 6.4, C("#a69a85"), { world: true, ws: 2 });
      for (const sz of [-1, 1]) { const z = sz * 5.7, top = t => 3.6 + 4.6 * Math.sin(Math.PI * t); let pv = null;
        for (let k = 0; k <= 16; k++) { const t = k / 16, x = xa + (xb - xa) * t, p = [x, top(t), z]; if (pv) B.plain.rod(pv, p, .14, rust, 5); B.plain.rod([x, 0, z], p, .07, rust, 4);
          if (k < 16) { const x2 = xa + (xb - xa) * (k + 1) / 16; B.plain.rod([x, 0, z], [x2, top((k + 1) / 16), z], .045, rust, 4); B.plain.rod([x, top(t), z], [x2, 0, z], .045, rust, 4); } pv = p; }
        B.plain.rod([xa, 0, z], [xb, 0, z], .16, rust, 5); }
      for (let k = 1; k < 16; k += 2) { const t = k / 16, x = xa + (xb - xa) * t, y = 3.6 + 4.6 * Math.sin(Math.PI * t); B.plain.rod([x, y, -5.7], [x, y, 5.7], .05, rust, 4); } }
    const pr = A.alloc(240, 56); paintPlaque(A, pr, "CẦU LONG BIÊN", "#efe3c4", "#3a2a1a", "1902");
    for (const sz of [-1, 1]) B.plain.box(BRIDGE_X - .5, 0, sz * 5.9 - .4, BRIDGE_X + .3, 5.6, sz * 5.9 + .4, C("#8a7f6c"));
    B.plain.box(BRIDGE_X - .5, 5.2, -6.3, BRIDGE_X + .3, 6.4, 6.3, C("#8a7f6c")); B.atlas.quad([BRIDGE_X + .31, 5.25, -3.2], [BRIDGE_X + .31, 5.25, 3.2], [BRIDGE_X + .31, 6.35, 3.2], [BRIDGE_X + .31, 6.35, -3.2], [1, 1, 1], pr.uv);
    for (let x = BRIDGE_X - 10; x > -470; x -= 30) for (const sz of [-1, 1]) lampBridge(x, sz * 5.2);
    W.blocks.push({ x0: -480, x1: BRIDGE_X, z0: -6, z1: 6, h: 8, lm: "longbien" }); })();
  function lampBridge(x, z) { const g = C("#24382c"); B.plain.cyl(x, 0, z, .06, 3.6, 6, g); B.plain.sphere(x, 3.7, z, .16, .2, .16, C("#f6e7b8"), 8, { em: 1 }); W.lights.push({ p: [x, 3.5, z], c: [2, 1.5, .8], r: 10 }); W.glows.push([x, 3.7, z, 1, .78, .45, 3.5]); }

  [-80, -34, -8, 10, 48, 96, 140, 182].forEach(x => sau(x, -5)); [-86, -64, -24, 24, 60, 118, 152, 190].forEach(x => sau(x, 5.1));
  [-70, -20, 38, 88, 128, 178].forEach(x => lamp(x, -4.6)); [-40, 12, 70, 108, 156, 198].forEach(x => lamp(x, 4.6));
  const poles = []; [-90, -66, -40, -14, 30, 64, 104, 146, 186].forEach(x => { const g = C("#9a958c"); B.plain.box(x - .16, 0, CURB_N - .9, x + .16, 9.5, CURB_N - .58, g);
    for (const y of [7.6, 8.4, 9.1]) B.plain.box(x - .1, y, CURB_N - 1.8, x + .1, y + .12, CURB_N + .3, C("#6f6a63")); B.plain.box(x - .45, 5.4, CURB_N - 1.1, x + .45, 6.6, CURB_N - .9, C("#7d7a72"));
    for (let k = 0; k < 5; k++) B.plain.sphere(x + (rnd() - .5) * .5, 6.8 + k * .18, CURB_N - .74, .26, .1, .22, C("#151515"), 6); poles.push(x); });
  const L = [];
  for (let i = 0; i < poles.length - 1; i++) { const a = poles[i], b = poles[i + 1]; if (a < 0 && b > 0) continue;
    for (let k = 0; k < 9; k++) { const y0 = 7.6 + (k % 3) * .7, zA = CURB_N - 1.7 + (k / 9) * 1.9, sag = .8 + rnd() * 1.4; let pv = null;
      for (let s = 0; s <= 14; s++) { const t = s / 14, x = a + (b - a) * t, y = y0 - Math.sin(t * Math.PI) * sag, z = zA + Math.sin(t * Math.PI) * .2; if (pv) L.push(...pv, x, y, z); pv = [x, y, z]; } } }
  for (const x of poles) { for (let k = 0; k < 7; k++) { const yt = 3.6 + rnd() * 5, tx = x + (rnd() - .5) * 14, sag = .3 + rnd() * .5; let pv = null;
      for (let s = 0; s <= 8; s++) { const t = s / 8, X = x + (tx - x) * t, Y = 7.8 + (yt - 7.8) * t - Math.sin(t * Math.PI) * sag, Z = CURB_N - .8 + (NZ + .2 - (CURB_N - .8)) * t; if (pv) L.push(...pv, X, Y, Z); pv = [X, Y, Z]; } }
    for (let k = 0; k < 4; k++) { let pv = null; const sag = 1 + rnd(); for (let s = 0; s <= 12; s++) { const t = s / 12, Z = CURB_N - .8 + (SZ + .3 - (CURB_N - .8)) * t, Y = 8.2 - Math.sin(t * Math.PI) * sag - t * (2 + k * .6); if (pv) L.push(...pv, x + t * 1.2, Y, Z); pv = [x + t * 1.2, Y, Z]; } }
    for (let k = 0; k < 30; k++) { const a = rnd() * 6.28, r = .2 + rnd() * .3, y = 6.9 + rnd() * .8; L.push(x + Math.cos(a) * r, y, CURB_N - .75 + Math.sin(a) * .2, x + Math.cos(a + 2) * r, y + .1, CURB_N - .75 + Math.sin(a + 2) * .2); } }
  R.addLines(L, [.07, .07, .07, 1]);

  const SC = { x: 76, z: -7.6 };
  (function stall() { const P = B.plain, wood = C("#7a4e2e");
    if (!useModel("stall", SC.x, WALK_Y, SC.z, 0, 1)) { // tủ trà, ấm, phích, cốc, thùng đá
      P.box(SC.x - .6, WALK_Y, SC.z - .38, SC.x + .6, WALK_Y + .62, SC.z + .38, wood); P.box(SC.x - .52, WALK_Y + .22, SC.z + .381, SC.x + .52, WALK_Y + .56, SC.z + .39, C("#c9d6d6"));
      for (let k = 0; k < 5; k++) P.box(SC.x - .45 + k * .19, WALK_Y + .26, SC.z + .1, SC.x - .33 + k * .19, WALK_Y + .5, SC.z + .3, C(["#d8a24a", "#3a2a1a", "#e2d1a8", "#c8382f", "#6f4a2a"][k]));
      P.cyl(SC.x - .38, WALK_Y + .62, SC.z - .05, .12, .36, 12, C("#c8862a")); P.cyl(SC.x - .38, WALK_Y + .98, SC.z - .05, .13, .05, 12, C("#c8382f"));
      P.cyl(SC.x - .08, WALK_Y + .62, SC.z - .1, .08, .42, 12, C("#c8382f")); P.cyl(SC.x - .08, WALK_Y + 1.04, SC.z - .1, .05, .05, 8, C("#7a1d14"));
      P.cyl(SC.x + .14, WALK_Y + .62, SC.z, .07, .22, 10, C("#e9dcc0")); P.cyl(SC.x + .32, WALK_Y + .62, SC.z, .07, .22, 10, C("#5a3a20"));
      for (let k = 0; k < 6; k++) P.cyl(SC.x + .1 + (k % 3) * .1, WALK_Y + .62, SC.z + .22 + Math.floor(k / 3) * .09, .035, .08, 8, C("#f2efe2"));
      P.box(SC.x + .75, WALK_Y, SC.z - .3, SC.x + 1.25, WALK_Y + .45, SC.z + .15, C("#f4f4f1")); }
    P.box(SC.x - .9, WALK_Y + .3, NZ + .02, SC.x + 1.1, WALK_Y + 1.0, NZ + .05, C("#8a5a35"));
    const pr = A.alloc(120, 48); paintPlaque(A, pr, "TRÀ ĐÁ", "#2a2a2a", "#f6e7b8", "Hướng dương · Kẹo lạc · Thuốc lào");
    B.atlas.quad([SC.x - .85, WALK_Y + .32, NZ + .06], [SC.x + 1.05, WALK_Y + .32, NZ + .06], [SC.x + 1.05, WALK_Y + .98, NZ + .06], [SC.x - .85, WALK_Y + .98, NZ + .06], [1, 1, 1], pr.uv);
    P.rod([SC.x - .2, 3.2, NZ + .05], [SC.x + .2, 2.5, SC.z + .3], .01, C("#111")); P.sphere(SC.x + .2, 2.42, SC.z + .3, .07, .09, .07, C("#fff3c4"), 8, { em: 1.2 });
    W.lights.push({ p: [SC.x + .2, 2.3, SC.z + .4], c: [2.6, 1.7, .8], r: 7 }); W.glows.push([SC.x + .2, 2.42, SC.z + .3, 1, .8, .45, 3.2]);
    W.seller = { x: SC.x + .25, z: SC.z - .9, face: 0 }; W.stall = SC; })();
  const ring = (r, angs) => angs.map(a => { const t = a * Math.PI / 180; return [SC.x + Math.cos(t) * r, SC.z + Math.sin(t) * r]; });
  [...ring(1.7, [18, 50, 82, 114, 146, 172]), ...ring(2.9, [-4, 18, 40, 62, 84, 106, 128, 150, 172])].forEach(([x, z], i) => {
    const s = { i, x, z, face: Math.atan2(SC.x - x, SC.z - z), color: i % 3 === 1 ? C("#c8382f") : C("#2f74c0"), occ: null, shells: [] };
    s.bx = x; s.bz = z; s.cx = SC.x + (x - SC.x) * 1.25; s.cz = SC.z + (z - SC.z) * .55; W.stools.push(s); });
  W.chess = { x: 85, z: -7.3, seats: [{ x: 85, z: -6.45, face: Math.PI }, { x: 85, z: -8.15, face: 0 }] };
  { const ch = W.chess, P = B.plain; P.box(ch.x - .38, WALK_Y, ch.z - .42, ch.x + .38, WALK_Y + .34, ch.z + .42, C("#6b4a30"));
    B.atlas.quad([ch.x - .36, WALK_Y + .345, ch.z + .4], [ch.x + .36, WALK_Y + .345, ch.z + .4], [ch.x + .36, WALK_Y + .345, ch.z - .4], [ch.x - .36, WALK_Y + .345, ch.z - .4], [1, 1, 1], xqUV);
    ch.seats.forEach(s => stoolGeo(P, s.x, s.z, s.face, C("#c8382f"))); W.blocks.push({ x0: ch.x - .5, x1: ch.x + .5, z0: ch.z - .5, z1: ch.z + .5, h: .5, lm: "chess" }); }
  [[22, -6.5], [26, -5.8], [30, -6.6]].forEach(([x, z], k) => { W.extras.push({ kind: "vendor", x, z, face: 0 }); metGeo(B.plain, B.foliage, x + .6, z + .3, k); stoolGeo(B.plain, x, z, 0, C("#c8382f")); });
  [[-38, -6.6], [-30, -6.2], [-22, -6.6], [-16, -6.3]].forEach(([x, z], k) => { W.extras.push({ kind: "vendor", x, z, face: 0 }); metGeo(B.plain, B.foliage, x + .6, z + .3, k + 1); stoolGeo(B.plain, x, z, 0, C("#2f74c0")); });
  for (let k = 0; k < 6; k++) W.extras.push({ kind: "queue", x: 51.5 + k * .75, z: 7.0, face: -Math.PI / 2 });
  for (let k = 0; k < 2; k++) { stoolGeo(B.plain, 110 + k * 1.3, 6.6, Math.PI, C("#2f74c0")); W.extras.push({ kind: "coffee", x: 110 + k * 1.3, z: 6.6, face: Math.PI }); }
  B.plain.box(110.3, WALK_Y, 5.9, 110.9, WALK_Y + .32, 6.3, C("#8a5a35"));
  for (let k = 0; k < 3; k++) W.extras.push({ kind: "ice", x: 163 + k * 2.3, z: -7.4 + (k % 2) * .5, face: (k - 1) * .6 });
  for (let k = 0; k < 4; k++) W.extras.push({ kind: "coffee", x: LANE.x0 + .8, z: 26.55 + k * 3.2, face: Math.PI });
  for (let k = 0; k < 2; k++) W.extras.push({ kind: "ice", x: BRIDGE_X - 12 - k * 1.4, z: 3.6, face: -Math.PI / 2 + .4 });
  for (const lx of [126.6, 130.4]) { B.plain.rod([lx, 3.5, NZ + .3], [lx, 3.1, NZ + .3], .01, C("#222")); B.plain.sphere(lx, 2.75, NZ + .3, .28, .36, .28, C("#d4321f"), 10, { em: .8 }); W.glows.push([lx, 2.75, NZ + .3, 1, .25, .12, 3.5]); }
  W.lights.push({ p: [128.5, 2.5, NZ + 1.2], c: [2.2, .6, .3], r: 7 });
  for (let x = -94; x < 196; x += 2 + rnd() * 6) { const N = rnd() < .5; if ((N && x > 66 && x < 92) || (!N && x > 42 && x < 56) || (x > 16 && x < 36 && N) || Math.abs(x) < 5 || (x > -60 && x < -47) || (N && x > -46 && x < -10) || (!N && x > 87 && x < 97) || (!N && x > -48 && x < -10)) continue;
    W.parked.push({ x, z: N ? NZ + 1.0 + rnd() * .5 : SZ - 1.0 - rnd() * .5, ry: (N ? -1 : 1) * (Math.PI / 2 + (rnd() - .5) * .5), col: ["#c8382f", "#1f1f1f", "#e8e8e8", "#2f74c0", "#7a7f87", "#8a2a3a"][Math.floor(rnd() * 6)] }); }

  { const D = S.dong, bx = 92, bz = 7.2; D.cyl(bx, WALK_Y, bz, .32, .45, 12, C("#3a3632")); D.cyl(bx, WALK_Y + .45, bz, .34, .04, 12, C("#2a2622"));
    for (let k = 0; k < 6; k++) D.sphere(bx - .2 + k * .08, WALK_Y + .53, bz + (k % 2 ? .08 : -.08), .035, .035, .13, C(k % 2 ? "#e2b53a" : "#7a3a2a"), 6);
    D.cyl(bx, WALK_Y + .43, bz, .28, .02, 12, C("#ff6a1a"), { em: 2 }); stoolGeo(D, bx + .7, bz, -Math.PI / 2, C("#2f74c0"), true);
    W.seasonLights.dong.push({ p: [bx, .9, bz], c: [3, 1.2, .3], r: 5 }); W.seasonGlows.dong.push([bx, .7, bz, 1, .45, .1, 2.4]); W.corn = { x: bx, z: bz };
    W.extras.push({ kind: "corn", x: bx + .7, z: bz, face: -Math.PI / 2, season: "dong" }); }

  { const T2 = S.tet, TA = S.tetA, pot = C("#8a4a2a");
    const dao = (x, z, s) => { T2.cyl(x, WALK_Y, z, .22 * s, .35 * s, 10, pot); T2.rod([x, WALK_Y + .3 * s, z], [x + .2 * s, WALK_Y + 1.6 * s, z], .04 * s, C("#4a3328"));
      T2.rod([x + .1 * s, WALK_Y + 1 * s, z], [x - .4 * s, WALK_Y + 1.7 * s, z + .2], .03 * s, C("#4a3328")); for (let k = 0; k < 14; k++) T2.sphere(x + (rnd() - .4) * .9 * s, WALK_Y + (1.1 + rnd() * .8) * s, z + (rnd() - .5) * .5 * s, .1 * s, .08 * s, .1 * s, C(rnd() < .7 ? "#f2a0b8" : "#e86e94"), 5, { wind: .6 }); };
    const quat = (x, z, s) => { T2.cyl(x, WALK_Y, z, .24 * s, .35 * s, 10, C("#c79a3a")); T2.sphere(x, WALK_Y + (.95) * s, z, .45 * s, .55 * s, .45 * s, C("#2f6a2a"), 10, { wind: .3 });
      for (let k = 0; k < 16; k++) { const a = rnd() * 6.28, h = rnd(); T2.sphere(x + Math.cos(a) * .44 * s, WALK_Y + (.6 + h * .75) * s, z + Math.sin(a) * .44 * s, .05 * s, .05 * s, .05 * s, C("#f08a1a"), 5); } };
    for (let x = -46; x < -12; x += 1.6) { if (rnd() < .5) dao(x, 6.6 + rnd() * .8, .9 + rnd() * .4); else quat(x, 6.8 + rnd() * .6, .9 + rnd() * .3); }
    for (let x = -46; x < -12; x += 6) W.extras.push({ kind: "flower", x: x + 1, z: 5.4, face: Math.PI, season: "tet" });
    for (const [x, z] of [[73, NZ + .7], [79.5, NZ + .7], [44.3, SZ - .6], [49.7, SZ - .6], [-28, NZ + .8], [158, NZ + .7], [173, NZ + .7]]) (Math.round(x) % 2 ? dao : quat)(x, z, 1);
    const pr = A.alloc(400, 50); paintPlaque(A, pr, "CHÚC MỪNG NĂM MỚI · XUÂN ĐINH MÙI 2027", "#c8251d", "#ffd84a");
    const pr2 = A.alloc(300, 50); paintPlaque(A, pr2, "CHỢ HOA HÀNG LƯỢC", "#c8251d", "#ffd84a", "Đào · Quất · Hoa Tết");
    for (const x of [-66, 30, 104, 186]) { TA.quad([x - 6, 5.6, 0], [x + 6, 5.6, 0], [x + 6, 6.6, 0], [x - 6, 6.6, 0], [1, 1, 1], pr.uv); TA.quad([x + 6, 5.6, 0], [x - 6, 5.6, 0], [x - 6, 6.6, 0], [x + 6, 6.6, 0], [1, 1, 1], pr.uv); }
    TA.quad([-34, 3.2, SZ - .5], [-24, 3.2, SZ - .5], [-24, 4.0, SZ - .5], [-34, 4.0, SZ - .5], [1, 1, 1], pr2.uv); TA.quad([-24, 3.2, SZ - .5], [-34, 3.2, SZ - .5], [-34, 4.0, SZ - .5], [-24, 4.0, SZ - .5], [1, 1, 1], pr2.uv);
    T2.box(-34.1, 0, SZ - .55, -33.9, 4.0, SZ - .45, C("#7a1d14")); T2.box(-24.1, 0, SZ - .55, -23.9, 4.0, SZ - .45, C("#7a1d14"));
    for (let x = -90; x < 196; x += 14) { for (let k = 0; k < 7; k++) { const z = -3.6 + k * 1.2, y = 6.3 - Math.sin(k / 6 * Math.PI) * .5; T2.sphere(x, y, z, .16, .2, .16, C("#d4321f"), 8, { em: .9 }); if (k % 3 === 0) W.seasonGlows.tet.push([x, y, z, 1, .25, .12, 1.4]); } }
    W.tetMarket = { x: -29, z: 6.5 }; }

  W.landmarks = {
    gate: { k: "Cửa ô cổ", t: "Ô Quan Chưởng", d: "Cửa ô duy nhất của kinh thành Thăng Long xưa còn giữ được đến nay. Tường gạch rêu phong, xe máy vẫn ngày ngày luồn qua cổng." },
    market: { k: "Phố Hàng Bè", t: "Chợ Hàng Bè", d: "Chợ nhỏ nép trong lòng phố cổ, bán rau, hoa, đồ khô và đồ lễ. Sáng sớm là lúc đông vui nhất." },
    pho: { k: "Phố Bát Đàn", t: "Phở Bát Đàn", d: "Quán phở gia truyền nổi tiếng với cảnh xếp hàng: khách tự gọi, tự trả tiền rồi tự bưng bát." },
    giang: { k: "Phố Nguyễn Hữu Huân", t: "Cà phê Giảng", d: "Cái tên gắn với món cà phê trứng của Hà Nội: lớp kem trứng đánh bông phủ trên cà phê đậm." },
    lavong: { k: "Phố Chả Cá", t: "Chả cá Lã Vọng", d: "Cá nướng vàng, đảo trên chảo mỡ với thì là, hành, ăn cùng bún, lạc rang và mắm tôm." },
    kem: { k: "Phố Tràng Tiền", t: "Kem Tràng Tiền", d: "Hiệu kem lâu đời trên phố Tràng Tiền. Mua xong đứng ăn ngay trên vỉa hè là đúng điệu." },
    lake: { k: "Trung tâm Hà Nội", t: "Hồ Gươm", d: "Tháp Rùa giữa hồ, cầu Thê Húc sơn đỏ dẫn vào đền Ngọc Sơn. Sáng sớm quanh hồ là người tập thể dục." },
    dongxuan: { k: "Phố Đồng Xuân", t: "Chợ Đồng Xuân", d: "Chợ lớn nhất khu phố cổ, mặt tiền ba đầu hồi quen thuộc. Bên trong bán đủ thứ, từ vải vóc tới đồ khô." },
    duongtau: { k: "Phố đường tàu", t: "Phố đường tàu", d: "Đường ray chạy sát mái hiên nhà dân. Khi tàu tới, hãy đứng sát vào lề và giữ khoảng cách an toàn." },
    longbien: { k: "Bắc qua sông Hồng", t: "Cầu Long Biên", d: "Cây cầu thép khánh thành năm 1902. Đường sắt chạy ở giữa, xe máy và xe đạp đi ở hai bên." },
    chess: { k: "Vỉa hè", t: "Bàn cờ tướng", d: "Chạm vào bàn cờ để ngồi đánh cờ với người khác hoặc với máy. Ai cũng có thể đứng xem." }
  };
  W.places = [["Cầu Long Biên", -106, 0], ["Phố đường tàu", -54, 14], ["Chợ Đồng Xuân", -28, -5.6], ["Ô Quan Chưởng", 6, -5.5], ["Chợ Hàng Bè", 26, -5.2], ["Phở Bát Đàn", 47, 5.4], ["Quán trà đá", 74, -5.0], ["Bàn cờ tướng", 85, -5.4], ["Cà phê Giảng", 110, 5.4], ["Chả cá Lã Vọng", 128.5, -5.4], ["Kem Tràng Tiền", 166, -5.4], ["Hồ Gươm", 218, -10]];

  const atlasTex = R.tex(A.cv, false), emTex = R.tex(A.ecv, false);
  R.addMesh(B.atlas, { tex: atlasTex, em: emTex, spec: .05 }); R.addMesh(B.plain, { spec: .08 }); R.addMesh(B.foliage, { spec: .02 });
  R.addMesh(B.side, { tex: T.side, spec: .06, ground: true }); R.addMesh(B.road, { tex: T.road, spec: .08, ground: true }); R.addMesh(B.roof, { tex: T.roof, spec: .05 });
  R.addMesh(B.stone, { tex: T.stone, spec: .03 }); R.addMesh(B.water, { spec: .03, water: true, noShadow: true });
  R.addMesh(S.dong, { spec: .08, season: "dong" }); R.addMesh(S.tet, { spec: .08, season: "tet" }); R.addMesh(S.tetA, { tex: atlasTex, em: emTex, spec: .05, season: "tet" });
  return W;
}
function stoolGeo(P, x, z, face, col, noModel) {
  if (!noModel && _R3 && _R3.hasModel && _R3.hasModel("stool")) { _R3.addStatic("stool", M4.trs(x, WALK_Y, z, face, 1, 1, 1), col, 0); return; }
  P.with(M4.trs(x, WALK_Y, z, face, 1, 1, 1), () => { const h = .3; P.box(-.17, h - .035, -.17, .17, h, .17, col);
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) P.rod([sx * .15, h - .03, sz * .15], [sx * .19, 0, sz * .19], .022, col, 5);
    P.box(-.17, .1, -.17, .17, .12, .17, col.map(v => v * .85), { faces: { t: false, d: false } }); }); }
function metGeo(P, F, x, z, k) { const wood = hex("#8a6a3a"); for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) P.rod([x + sx * .25, WALK_Y, z + sz * .25], [x + sx * .3, WALK_Y + .45, z + sz * .3], .02, wood, 4);
  P.cyl(x, WALK_Y + .45, z, .5, .04, 18, hex("#b48a4f")); const r = mulberry(k * 7 + 3), cols = [["#f08a24", "#e9a43a", "#4f8a3a"], ["#5f9e3f", "#7cc04e", "#4b8f42"], ["#e63946", "#ffb703", "#ffffff", "#f28482", "#c77dff"]][k % 3];
  for (let i = 0; i < 22; i++) { const a = r() * 6.28, rr = r() * .38; F.sphere(x + Math.cos(a) * rr, WALK_Y + .53 + r() * .06, z + Math.sin(a) * rr, .06, .05, .06, hex(cols[Math.floor(r() * cols.length)]), 6); } }
