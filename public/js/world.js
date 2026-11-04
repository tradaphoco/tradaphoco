/* Trà Đá Phố Cổ 3D — dựng phố cổ: vân bề mặt vẽ bằng canvas, nhà ống, địa danh, cây sấu, cột điện, Hồ Gươm */
"use strict";
const PX = 28;                        // điểm ảnh / mét trên vân mặt tiền
const NZ = -9, SZ = 8.5;              // mặt tiền dãy phía bắc / phía nam
const CURB_N = -4, CURB_S = 4, WALK_Y = 0.15;

/* ---------- Atlas vân mặt tiền ---------- */
class Atlas {
  constructor(W, H, k) {
    this.W = W; this.H = H; this.k = k;
    this.cv = document.createElement("canvas"); this.cv.width = W; this.cv.height = H; this.c = this.cv.getContext("2d");
    this.ecv = document.createElement("canvas"); this.ecv.width = W * k; this.ecv.height = H * k; this.e = this.ecv.getContext("2d");
    this.c.fillStyle = "#888"; this.c.fillRect(0, 0, W, H); this.e.fillStyle = "#000"; this.e.fillRect(0, 0, W * k, H * k);
    this.x = 6; this.y = 6; this.rowH = 0;
  }
  alloc(pw, ph) {
    pw = Math.ceil(pw); ph = Math.ceil(ph);
    if (this.x + pw + 6 > this.W) { this.x = 6; this.y += this.rowH + 12; this.rowH = 0; }
    if (this.y + ph + 6 > this.H) { console.warn("atlas đầy"); return { x: 0, y: 0, w: 8, h: 8, uv: [0, 0, 8 / this.W, 8 / this.H] }; }
    const r = { x: this.x, y: this.y, w: pw, h: ph }; this.x += pw + 12; this.rowH = Math.max(this.rowH, ph);
    r.uv = [(r.x + .5) / this.W, (r.y + .5) / this.H, (r.x + r.w - .5) / this.W, (r.y + r.h - .5) / this.H]; return r;
  }
  // vẽ trong hệ mét: (0,0) là góc trên-trái ô
  begin(r, ppm) { const s = ppm || PX; this.c.setTransform(s, 0, 0, s, r.x, r.y); this.e.setTransform(s * this.k, 0, 0, s * this.k, r.x * this.k, r.y * this.k); this.cur = { r, s }; }
  end() { this.c.setTransform(1, 0, 0, 1, 0, 0); this.e.setTransform(1, 0, 0, 1, 0, 0); }
  text(str, x, y, size, color, o) { // chữ: toạ độ mét
    o = o || {}; const { r, s } = this.cur; const ctxs = o.em ? [[this.e, this.k]] : [[this.c, 1]];
    if (o.glow) ctxs.push([this.e, this.k]);
    for (const [cx, k] of ctxs) {
      cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0);
      cx.font = (o.weight || "700") + " " + Math.max(4, size * s * k) + "px " + (o.font || "Georgia, 'Times New Roman', serif");
      cx.textAlign = o.align || "center"; cx.textBaseline = "middle"; cx.fillStyle = (cx === this.e && o.glow) ? o.glow : color;
      const px = (r.x + x * s) * k, py = (r.y + y * s) * k;
      if (o.maxW) cx.fillText(str, px, py, o.maxW * s * k); else cx.fillText(str, px, py);
      cx.restore();
    }
  }
}
function shadeHex(h, a) { const n = parseInt(h.slice(1), 16); const f = v => Math.max(0, Math.min(255, Math.round(v + a))); return "#" + ((1 << 24) + (f(n >> 16) << 16) + (f(n >> 8 & 255) << 8) + f(n & 255)).toString(16).slice(1); }

/* ---------- Vân lặp: vỉa hè, nhựa đường, ngói, đá ---------- */
function makeCanvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
function noise(ctx, w, h, n, colA, a0, a1, rmax, rnd) { for (let i = 0; i < n; i++) { ctx.globalAlpha = a0 + rnd() * (a1 - a0); ctx.fillStyle = colA[Math.floor(rnd() * colA.length)]; const r = rnd() * rmax + .5; ctx.beginPath(); ctx.arc(rnd() * w, rnd() * h, r, 0, 7); ctx.fill(); } ctx.globalAlpha = 1; }
function texSidewalk() { // gạch terrazzo 0.4m, 4x4 viên trên 1.6m
  const c = makeCanvas(512, 512), x = c.getContext("2d"), r = mulberry(4), t = 128;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const base = r() < .5 ? [176, 160, 150] : [160, 150, 146]; const v = (r() - .5) * 18;
    x.fillStyle = `rgb(${base[0] + v},${base[1] + v},${base[2] + v})`; x.fillRect(i * t, j * t, t, t);
    x.save(); x.beginPath(); x.rect(i * t, j * t, t, t); x.clip(); noise(x, 512, 512, 0, [], 0, 0, 0, r);
    for (let k = 0; k < 140; k++) { x.fillStyle = ["#e9e2d8", "#6b625c", "#a4542f", "#3a3633"][Math.floor(r() * 4)]; x.globalAlpha = .55; x.fillRect(i * t + r() * t, j * t + r() * t, 2 + r() * 3, 2 + r() * 3); }
    x.globalAlpha = 1;
    // gờ dẫn hướng
    if ((i + j) % 2 === 0) { x.strokeStyle = "rgba(0,0,0,.10)"; x.lineWidth = 6; for (let s = 1; s < 4; s++) { x.beginPath(); x.moveTo(i * t + s * t / 4, j * t + 14); x.lineTo(i * t + s * t / 4, j * t + t - 14); x.stroke(); } }
    x.restore();
  }
  x.strokeStyle = "#5e5752"; x.lineWidth = 3; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * t, 0); x.lineTo(i * t, 512); x.stroke(); x.beginPath(); x.moveTo(0, i * t); x.lineTo(512, i * t); x.stroke(); }
  noise(x, 512, 512, 60, ["#2e2a26", "#4a4038"], .04, .14, 26, r);
  return c;
}
function texAsphalt() { // 8m x 8m, vạch giữa
  const c = makeCanvas(512, 512), x = c.getContext("2d"), r = mulberry(9);
  x.fillStyle = "#4a4a4c"; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) { const g = 50 + r() * 50; x.fillStyle = `rgb(${g},${g},${g + 2})`; x.fillRect(r() * 512, r() * 512, 1.5, 1.5); }
  noise(x, 512, 512, 50, ["#3a3a3c", "#56565a", "#2f2f30"], .1, .3, 40, r);
  x.strokeStyle = "rgba(20,20,20,.5)"; x.lineWidth = 2; for (let i = 0; i < 6; i++) { x.beginPath(); let px = r() * 512, py = r() * 512; x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += (r() - .5) * 60; py += (r() - .5) * 60; x.lineTo(px, py); } x.stroke(); }
  x.fillStyle = "rgba(235,232,220,.85)"; x.fillRect(0, 250, 224, 12); // vạch đứt quãng giữa đường
  x.fillStyle = "rgba(235,232,220,.6)"; x.fillRect(0, 4, 512, 6); x.fillRect(0, 502, 512, 6);
  return c;
}
function texRoof() { // ngói âm dương 2m
  const c = makeCanvas(256, 256), x = c.getContext("2d"), r = mulberry(13);
  x.fillStyle = "#7d3e2a"; x.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 16; row++) for (let col = 0; col < 12; col++) {
    const px = col * 21.3, py = row * 16, v = (r() - .5) * 30;
    const g = x.createLinearGradient(px, 0, px + 21, 0); g.addColorStop(0, `rgb(${110 + v},${50 + v / 2},${32})`); g.addColorStop(.5, `rgb(${160 + v},${80 + v / 2},${52})`); g.addColorStop(1, `rgb(${100 + v},${46 + v / 2},${30})`);
    x.fillStyle = g; x.beginPath(); x.ellipse(px + 10.6, py + 8, 10, 9, 0, 0, 7); x.fill();
    x.fillStyle = "rgba(0,0,0,.25)"; x.fillRect(px, py + 14, 21, 2);
  }
  noise(x, 256, 256, 70, ["#4f6a36", "#3f5a2e", "#2c2a22"], .15, .45, 14, r);
  return c;
}
function texStone() { // gạch đá ô cửa, rêu
  const c = makeCanvas(256, 256), x = c.getContext("2d"), r = mulberry(17);
  x.fillStyle = "#8f877a"; x.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 8; row++) for (let col = 0; col < 5; col++) {
    const off = row % 2 ? 25 : 0, v = (r() - .5) * 26; x.fillStyle = `rgb(${150 + v},${140 + v},${122 + v})`; x.fillRect(col * 51 + off - 25, row * 32 + 2, 49, 29);
  }
  noise(x, 256, 256, 120, ["#4f5f38", "#3c3a30", "#6a6a50"], .08, .35, 12, r);
  const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, "rgba(40,50,30,.0)"); g.addColorStop(1, "rgba(40,50,30,.25)"); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  return c;
}

/* ---------- Bảng màu & tên phố nghề ---------- */
const FACADE_COLS = ["#e0b25a", "#d9a441", "#ead7a1", "#efe3c4", "#d9a5a0", "#bfcfa8", "#b9c9d3", "#d9d6cc", "#c98a63", "#e6c27a", "#d8b98c"];
const SHUTTER_COLS = ["#3f6e52", "#2f5e5a", "#4f6b3a", "#6b4a32", "#3e5a72"];
const GUILDS = [["HÀNG MÃ", "Đồ lễ · Đèn lồng"], ["HÀNG BẠC", "Vàng bạc · Trang sức"], ["THUỐC BẮC", "Lãn Ông · Dược liệu"], ["LỤA HÀNG ĐÀO", "Vải · Lụa tơ tằm"], ["TẠP HOÁ", "Bánh kẹo · Đồ khô"],
  ["ĐỒ THIẾC", "Hàng Thiếc · Gò hàn"], ["Ô MAI", "Ô mai · Mứt · Chè"], ["TRANH PHỐ", "Tranh sơn dầu"], ["NÓN LÁ", "Nón · Mũ · Quạt"], ["GỐM SỨ", "Bát Tràng"], ["ĐÈN LỒNG", "Lồng đèn Hội An"], ["BÚN CHẢ", "Bún chả · Nem cua bể"],
  ["BÁNH CUỐN", "Bánh cuốn Thanh Trì"], ["HÀNG GIẤY", "Giấy · Văn phòng phẩm"], ["CẮT TÓC", "Gội đầu · Cạo râu"], ["SỬA XE", "Vá săm · Thay dầu"], ["HÀNG ĐƯỜNG", "Mứt Tết · Kẹo lạc"]];
const SIGN_COLS = [["#a8322a", "#f6d77a"], ["#1d3f7a", "#ffffff"], ["#f1c232", "#7a1d14"], ["#5b3a24", "#f1d27a"], ["#14532d", "#fef3c7"], ["#7a1d40", "#ffe4ef"]];

/* ---------- Vẽ mặt tiền nhà ống ---------- */
function paintFacade(A, r, H, rnd) {
  const c = A.c, e = A.e, w = H.w, h = H.h;
  A.begin(r);
  c.fillStyle = H.color; c.fillRect(-.3, -.3, w + .6, h + .6);
  if (H.style === "modern") { c.strokeStyle = "rgba(255,255,255,.18)"; c.lineWidth = .02; for (let y = .3; y < h - H.gh; y += .3) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } for (let x = .3; x < w; x += .3) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h - H.gh); c.stroke(); } }
  // vết ố, rêu, nước mưa chảy
  for (let i = 0; i < 18; i++) { c.globalAlpha = .05 + rnd() * .08; c.fillStyle = rnd() < .5 ? "#3d3426" : "#4e5a33"; c.beginPath(); c.ellipse(rnd() * w, rnd() * h, .3 + rnd() * 1.4, .4 + rnd() * 2, 0, 0, 7); c.fill(); }
  c.globalAlpha = 1;
  const gT = c.createLinearGradient(0, 0, 0, 1.2); gT.addColorStop(0, "rgba(40,45,25,.35)"); gT.addColorStop(1, "rgba(40,45,25,0)"); c.fillStyle = gT; c.fillRect(0, 0, w, 1.2);
  for (let i = 0; i < 14; i++) { const x = rnd() * w, y = rnd() * (h - H.gh), l = .5 + rnd() * 2.5; const g = c.createLinearGradient(0, y, 0, y + l); g.addColorStop(0, "rgba(50,40,25,.16)"); g.addColorStop(1, "rgba(50,40,25,0)"); c.fillStyle = g; c.fillRect(x, y, .05 + rnd() * .12, l); }
  // tường hoa / lan can mái
  c.fillStyle = shadeHex(H.color, 14); c.fillRect(0, 0, w, .35); c.fillStyle = "rgba(0,0,0,.18)"; c.fillRect(0, .35, w, .06);
  if (H.parapetText) A.text(H.parapetText, w / 2, .2, .26, "#7a5a32", { maxW: w - .4 });
  // các tầng trên
  for (let f = 0; f < H.up; f++) {
    const y0 = .45 + f * H.fh, lit = H.lit[f];
    const bays = H.bays, bw = Math.min(1.25, w / bays - .55), gap = (w - bays * bw) / (bays + 1);
    for (let b = 0; b < bays; b++) {
      const x = gap + b * (bw + gap), dh = 2.35, dy = y0 + H.fh - dh - .15, open = H.open[f * 4 + b];
      // khung + lòng cửa
      c.fillStyle = shadeHex(H.color, 18); if (H.style === "colonial") { c.beginPath(); c.moveTo(x - .14, dy + dh); c.lineTo(x - .14, dy + bw / 2); c.arc(x + bw / 2, dy + bw / 2, bw / 2 + .14, Math.PI, 0); c.lineTo(x + bw + .14, dy + dh); c.fill(); } else c.fillRect(x - .1, dy - .1, bw + .2, dh + .1);
      const hole = () => { c.beginPath(); if (H.style === "colonial") { c.moveTo(x, dy + dh); c.lineTo(x, dy + bw / 2); c.arc(x + bw / 2, dy + bw / 2, bw / 2, Math.PI, 0); c.lineTo(x + bw, dy + dh); c.closePath(); } else c.rect(x, dy, bw, dh); };
      hole(); c.fillStyle = "#1f1b18"; c.fill();
      if (open || H.style === "modern") {
        c.save(); hole(); c.clip(); c.fillStyle = lit ? "#5a4026" : "#2a2420"; c.fillRect(x, dy, bw, dh);
        c.fillStyle = H.curtain; c.globalAlpha = .7; c.fillRect(x + bw * .05, dy, bw * .25, dh); c.fillRect(x + bw * .7, dy, bw * .25, dh); c.globalAlpha = 1;
        if (H.style === "modern") { c.fillStyle = "rgba(150,190,210,.35)"; c.fillRect(x, dy, bw, dh); c.strokeStyle = "#222"; c.lineWidth = .03; for (let gx = x + .15; gx < x + bw; gx += .15) { c.beginPath(); c.moveTo(gx, dy); c.lineTo(gx, dy + dh); c.stroke(); } }
        c.restore();
        if (lit) { e.fillStyle = H.style === "modern" ? "#e8e4d0" : "#ffb35c"; e.save(); hole(); e.clip && (() => { })(); e.restore();
          e.fillStyle = "#c98236"; e.fillRect(x, dy + (H.style === "colonial" ? bw / 2 : 0), bw, dh - (H.style === "colonial" ? bw / 2 : 0)); e.fillStyle = "#ffcf7a"; e.fillRect(x + bw * .3, dy + dh * .3, bw * .4, dh * .5); }
      }
      if (H.style !== "modern") { // cửa chớp
        const lv = (sx, sw) => { c.fillStyle = H.shutter; c.fillRect(sx, dy + (H.style === "colonial" ? bw / 2 : 0), sw, dh - (H.style === "colonial" ? bw / 2 : 0)); c.fillStyle = "rgba(0,0,0,.28)"; for (let ly = dy + (H.style === "colonial" ? bw / 2 : 0) + .06; ly < dy + dh - .05; ly += .09) c.fillRect(sx + .04, ly, sw - .08, .035); c.fillStyle = "rgba(255,255,255,.12)"; c.fillRect(sx, dy + bw / 2, .03, dh - bw / 2); };
        if (open) { lv(x - bw * .45 - .05, bw * .42); lv(x + bw + .08, bw * .42); }
        else { lv(x, bw / 2 - .02); lv(x + bw / 2 + .02, bw / 2 - .02); if (lit) { e.fillStyle = "#6a3d16"; e.fillRect(x, dy + bw / 2, bw, dh - bw / 2); } }
        if (H.style === "colonial") { c.fillStyle = H.shutter; c.beginPath(); c.arc(x + bw / 2, dy + bw / 2, bw / 2, Math.PI, 0); c.fill(); c.strokeStyle = "rgba(0,0,0,.4)"; c.lineWidth = .03; for (let k = 1; k < 6; k++) { const a = Math.PI + k / 6 * Math.PI; c.beginPath(); c.moveTo(x + bw / 2, dy + bw / 2); c.lineTo(x + bw / 2 + Math.cos(a) * bw / 2, dy + bw / 2 + Math.sin(a) * bw / 2); c.stroke(); } }
      }
      // vệt bẩn dưới bậu cửa
      const g = c.createLinearGradient(0, dy + dh, 0, dy + dh + 1.1); g.addColorStop(0, "rgba(40,30,20,.22)"); g.addColorStop(1, "rgba(40,30,20,0)"); c.fillStyle = g; c.fillRect(x, dy + dh, bw, 1.1);
    }
    // gờ tầng
    c.fillStyle = shadeHex(H.color, 10); c.fillRect(0, y0 + H.fh - .12, w, .12); c.fillStyle = "rgba(0,0,0,.2)"; c.fillRect(0, y0 + H.fh, w, .05);
  }
  // tầng trệt
  const gy = h - H.gh, ow = w - .5;
  c.fillStyle = shadeHex(H.color, -25); c.fillRect(0, gy, w, H.gh);
  if (H.shopShut) { c.fillStyle = "#8f9498"; c.fillRect(.25, gy + 1.0, ow, H.gh - 1.0); c.fillStyle = "rgba(0,0,0,.18)"; for (let y = gy + 1.05; y < h; y += .07) c.fillRect(.25, y, ow, .025); c.fillStyle = "rgba(120,60,20,.25)"; c.fillRect(.25, h - .5, ow, .5); }
  else {
    c.fillStyle = "#2b231d"; c.fillRect(.25, gy + 1.0, ow, H.gh - 1.0);
    const sg = c.createLinearGradient(0, gy + 1, 0, h); sg.addColorStop(0, "#5a4635"); sg.addColorStop(1, "#2a2019"); c.fillStyle = sg; c.fillRect(.4, gy + 1.15, ow - .3, H.gh - 1.2);
    // kệ hàng
    for (let s = 0; s < 4; s++) { const sy = gy + 1.5 + s * .55; c.fillStyle = "#6b4a30"; c.fillRect(.45, sy, ow - .4, .05);
      for (let k = 0; k < 14; k++) { c.fillStyle = H.goods[Math.floor(rnd() * H.goods.length)]; const gw = .1 + rnd() * .22, gh = .15 + rnd() * .3; c.fillRect(.5 + rnd() * (ow - .7), sy - gh, gw, gh); } }
    if (H.hanging) for (let k = 0; k < Math.floor(ow / .5); k++) { const hx = .6 + k * .5; c.fillStyle = H.hanging[k % H.hanging.length]; c.beginPath(); c.ellipse(hx, gy + 1.45, .16, .22, 0, 0, 7); c.fill(); }
    e.fillStyle = "#2e1c0c"; e.fillRect(.25, gy + 1.0, ow, H.gh - 1.0); e.fillStyle = "#6a4219"; e.fillRect(.6, gy + 1.1, ow - .7, .35); e.fillStyle = "#3d2510"; e.fillRect(.45, h - .6, ow - .4, .5);
  }
  // biển hiệu
  if (H.sign) {
    const [bg, fg] = H.sign.col; c.fillStyle = bg; c.fillRect(.15, gy + .1, w - .3, .82); c.strokeStyle = shadeHex(fg, -30); c.lineWidth = .04; c.strokeRect(.24, gy + .17, w - .48, .68);
    A.text(H.sign.t, w / 2, gy + .44, Math.min(.42, (w - .6) / (H.sign.t.length * .5)), fg, { maxW: w - .6 });
    A.text(H.sign.s, w / 2, gy + .74, .17, fg, { font: "system-ui, sans-serif", weight: "600", maxW: w - .8 });
    if (H.sign.led) { e.strokeStyle = "#ff3b2a"; e.lineWidth = .06; e.strokeRect(.2, gy + .14, w - .4, .74); }
    A.text(H.sign.t, w / 2, gy + .44, Math.min(.42, (w - .6) / (H.sign.t.length * .5)), fg, { em: true, maxW: w - .6 });
  }
  // biển số nhà
  c.fillStyle = "#1f4e9c"; c.fillRect(w - .55, gy - .45, .4, .28); A.text(String(H.no), w - .35, gy - .31, .17, "#fff", { font: "system-ui, sans-serif" });
  // công tơ điện, dây
  if (rnd() < .5) { c.fillStyle = "#c9cbc6"; c.fillRect(.05, gy - 1.2, .35, .5); c.strokeStyle = "#222"; c.lineWidth = .02; c.beginPath(); c.moveTo(.22, gy - 1.2); c.lineTo(.22, 0); c.stroke(); }
  A.end();
}

/* ---------- Vẽ các ô vân đặc biệt ---------- */
function paintWall(A, r, col, rnd) { A.begin(r, r.w / 4); const c = A.c; c.fillStyle = col; c.fillRect(-.2, -.2, 4.4, 4.4); for (let i = 0; i < 20; i++) { c.globalAlpha = .06 + rnd() * .08; c.fillStyle = rnd() < .5 ? "#3d3426" : "#4e5a33"; c.beginPath(); c.ellipse(rnd() * 4, rnd() * 4, .3 + rnd(), .3 + rnd() * 1.5, 0, 0, 7); c.fill(); } c.globalAlpha = 1; A.end(); }
function paintTower(A, r, rnd) { // khối nhà cao phía sau
  const w = r.w / 10, h = r.h / 10; A.begin(r, 10); const c = A.c, e = A.e;
  c.fillStyle = "#c9c0ad"; c.fillRect(-.5, -.5, w + 1, h + 1);
  for (let y = 1; y < h - 1; y += 3) for (let x = .6; x < w - 1; x += 1.8) { const lit = rnd() < .35; c.fillStyle = "#3a4048"; c.fillRect(x, y, 1, 1.6); c.fillStyle = "#cfd3cf"; c.fillRect(x - .1, y + 1.6, 1.2, .25); if (lit) { e.fillStyle = rnd() < .5 ? "#d9c08a" : "#b0c8d8"; e.fillRect(x, y, 1, 1.6); } if (rnd() < .3) { c.fillStyle = "#e9e9e4"; c.fillRect(x + 1.05, y + .8, .5, .4); } }
  for (let i = 0; i < 20; i++) { c.globalAlpha = .08; c.fillStyle = "#3d3426"; c.fillRect(rnd() * w, rnd() * h, .2, 2 + rnd() * 4); } c.globalAlpha = 1; A.end();
}
function paintStripes(A, r, a, b) { A.begin(r, r.w / 2); const c = A.c; for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? a : b; c.fillRect(i * .25, -.2, .25, 2.4); } A.end(); }
function paintVSign(A, r, txt, bg, fg) { // biển dọc
  A.begin(r, r.w / .6); const c = A.c; c.fillStyle = bg; c.fillRect(-.1, -.1, .8, 2.4); c.strokeStyle = fg; c.lineWidth = .03; c.strokeRect(.05, .05, .5, 2.1);
  const chars = txt.split(" "); chars.forEach((ch, i) => A.text(ch, .3, .3 + i * (1.8 / Math.max(1, chars.length - 1 || 1)), Math.min(.22, .5 / Math.max(2, ch.length * .55)), fg, { maxW: .52 }));
  chars.forEach((ch, i) => A.text(ch, .3, .3 + i * (1.8 / Math.max(1, chars.length - 1 || 1)), Math.min(.22, .5 / Math.max(2, ch.length * .55)), fg, { em: true, maxW: .52 })); A.end();
}
function paintPlaque(A, r, txt, bg, fg, sub) { const w = r.w / 60, h = r.h / 60; A.begin(r, 60); const c = A.c; c.fillStyle = bg; c.fillRect(-.1, -.1, w + .2, h + .2); c.strokeStyle = fg; c.lineWidth = .03; c.strokeRect(.05, .05, w - .1, h - .1);
  A.text(txt, w / 2, sub ? h * .4 : h / 2, h * (sub ? .38 : .5), fg, { maxW: w - .15 }); if (sub) A.text(sub, w / 2, h * .76, h * .2, fg, { font: "system-ui,sans-serif", maxW: w - .15 }); A.end(); }

/* ---------- Dựng thế giới ---------- */
function buildWorld(R) {
  const rnd = mulberry(20240), A = new Atlas(4096, 4096, .25);
  const T = {
    side: R.tex(texSidewalk(), true), road: R.tex(texAsphalt(), true), roof: R.tex(texRoof(), true), stone: R.tex(texStone(), true)
  };
  const B = { atlas: new Builder(), plain: new Builder(), side: new Builder(), road: new Builder(), roof: new Builder(), stone: new Builder(), water: new Builder(), foliage: new Builder() };
  const W = { lights: [], glows: [], stools: [], landmarks: [], blocks: [], extras: [], parked: [], seats: {} };
  const C = h => hex(h);
  const wallSlots = FACADE_COLS.map(col => { const r = A.alloc(112, 112); paintWall(A, r, col, rnd); return r.uv; });
  const towerSlots = [0, 1, 2].map(() => { const r = A.alloc(240, 360); paintTower(A, r, rnd); return r.uv; });
  const awnings = [["#b8322a", "#f4efe6"], ["#2f5e5a", "#efe3c4"], ["#c9973f", "#fff7e0"], ["#1d3f7a", "#ffffff"]].map(([a, b]) => { const r = A.alloc(64, 64); paintStripes(A, r, a, b); return r.uv; });

  /* --- mặt đất --- */
  const X0 = -70, X1 = 214;
  B.road.quad([X0, 0, CURB_S], [X1, 0, CURB_S], [X1, 0, CURB_N], [X0, 0, CURB_N], [1, 1, 1], [X0 / 8, 0, X1 / 8, 1]);
  B.road.quad([204, 0, 70], [214, 0, 70], [214, 0, -70], [204, 0, -70], [1, 1, 1], [0, -8, 1.25, 9]); // đường ven hồ
  const walk = (x0, x1, z0, z1) => B.side.quad([x0, WALK_Y, z1], [x1, WALK_Y, z1], [x1, WALK_Y, z0], [x0, WALK_Y, z0], [1, 1, 1], [x0 / 1.6, z0 / 1.6, x1 / 1.6, z1 / 1.6]);
  walk(X0, 204, NZ - .2, CURB_N); walk(X0, 204, CURB_S, SZ + .2);
  const kerb = (x0, x1, z0, z1) => B.plain.box(x0, 0, z0, x1, WALK_Y + .01, z1, C("#a9a59c"));
  kerb(X0, 204, CURB_N - .02, CURB_N + .18); kerb(X0, 204, CURB_S - .18, CURB_S + .02);
  // bờ hồ
  walk(214, 222, -90, 90);
  B.side.quad([195, WALK_Y, -90], [204, WALK_Y, -90], [204, WALK_Y, NZ - .2], [195, WALK_Y, NZ - .2], [1, 1, 1], [0, 0, 6, 50]);
  B.side.quad([195, WALK_Y, SZ + .2], [204, WALK_Y, SZ + .2], [204, WALK_Y, 90], [195, WALK_Y, 90], [1, 1, 1], [0, 0, 6, 50]);
  kerb(213.8, 214.2, -90, 90);
  B.stone.box(221.5, -1.2, -90, 222.4, WALK_Y + .25, 90, C("#b8b0a0"), { world: true, ws: 2 });
  B.water.quad([222, -.35, 90], [520, -.35, 90], [520, -.35, -90], [222, -.35, -90], C("#3f8a6a"));
  // nền rất xa
  B.plain.quad([-200, -.05, 200], [700, -.05, 200], [700, -.05, -200], [-200, -.05, -200], C("#5a5a52"));

  /* --- nhà ống --- */
  let no = 2;
  function house(x0, x1, side, o) {
    o = o || {}; const w = x1 - x0, up = o.up !== undefined ? o.up : 1 + Math.floor(rnd() * 3.4), gh = 3.6, fh = 3.2, h = gh + up * fh + .45;
    const style = o.style || (rnd() < .45 ? "colonial" : rnd() < .55 ? "old" : "modern");
    const color = o.color || FACADE_COLS[Math.floor(rnd() * FACADE_COLS.length)];
    const guild = GUILDS[Math.floor(rnd() * GUILDS.length)], sc = SIGN_COLS[Math.floor(rnd() * SIGN_COLS.length)];
    const H = { w, h, up, gh, fh, style, color, shutter: SHUTTER_COLS[Math.floor(rnd() * SHUTTER_COLS.length)], bays: Math.max(1, Math.min(3, Math.floor(w / 1.9))),
      lit: [], open: [], curtain: ["#c9b28a", "#a8433a", "#e9e2cf", "#5a7a8a"][Math.floor(rnd() * 4)],
      sign: o.sign === null ? null : (o.sign || { t: guild[0], s: guild[1], col: sc, led: rnd() < .4 }), no: no, shopShut: o.shut !== undefined ? o.shut : rnd() < .18,
      goods: ["#c8382f", "#e9b949", "#3f6e72", "#e7d6b0", "#9a5b3c", "#f4efe6", "#2f5e8a", "#d97b2b"], hanging: null, parapetText: o.parapetText || (style === "colonial" && rnd() < .3 ? String(1920 + Math.floor(rnd() * 25)) : null) };
    no += 2;
    if (H.sign && (H.sign.t === "HÀNG MÃ" || H.sign.t === "ĐÈN LỒNG")) H.hanging = ["#c8382f", "#e0a62a", "#c8382f", "#7a2a8a"];
    if (H.sign && H.sign.t === "NÓN LÁ") H.hanging = ["#e2cf96"];
    for (let f = 0; f < up; f++) { H.lit.push(rnd() < .5); for (let b = 0; b < 4; b++) H.open.push(rnd() < .45); }
    Object.assign(H, o.H || {});
    const r = A.alloc(w * PX, h * PX); (o.paint || paintFacade)(A, r, H, rnd);
    const wall = wallSlots[FACADE_COLS.indexOf(color) >= 0 ? FACADE_COLS.indexOf(color) : 0];
    const N = side === "N", zf = N ? NZ : SZ, zb = N ? NZ - 14 : SZ + 14, depth = o.depth || 14;
    const zA = Math.min(zf, N ? zf - depth : zf + depth), zB = Math.max(zf, N ? zf - depth : zf + depth);
    const faces = { f: wall, b: wall, l: wall, r: wall, t: wall, d: false }; if (N) faces.f = r.uv; else faces.b = r.uv;
    B.atlas.box(x0, 0, zA, x1, h, zB, [1, 1, 1], { faces });
    W.blocks.push({ x0, x1, z0: zA, z1: zB, h, lm: o.lm });
    const s = N ? 1 : -1, zF = zf; // s: hướng ra đường
    const lite = C(shadeHex(color, 16));
    // gờ tầng + ban công
    for (let f = 0; f < up; f++) {
      const y = h - .45 - f * fh - fh + .0, yb = gh + (up - 1 - f) * fh; // đáy tầng
      B.plain.box(x0, yb - .14, Math.min(zF, zF + s * .22), x1, yb, Math.max(zF, zF + s * .22), lite);
      if (H.style !== "modern" ? rnd() < .75 : rnd() < .5) {
        const d = H.style === "colonial" ? .75 : 1.0, bx0 = x0 + .15, bx1 = x1 - .15, z1 = zF + s * d;
        B.plain.box(bx0, yb - .02, Math.min(zF, z1), bx1, yb + .14, Math.max(zF, z1), lite);
        const ironC = C(H.style === "modern" ? "#d6d3cb" : "#2a2a28");
        if (H.style === "modern") B.plain.box(bx0, yb + .14, Math.min(z1, z1 - s * .1), bx1, yb + 1.0, Math.max(z1, z1 - s * .1), C(shadeHex(color, 8)));
        else { const rail = (ax, az, bx, bz) => { B.plain.box(Math.min(ax, bx) - .02, yb + .98, Math.min(az, bz) - .02, Math.max(ax, bx) + .02, yb + 1.04, Math.max(az, bz) + .02, ironC);
            const L = Math.hypot(bx - ax, bz - az), n = Math.floor(L / .13); for (let k = 0; k <= n; k++) { const t = k / n, px = ax + (bx - ax) * t, pz = az + (bz - az) * t; B.plain.box(px - .012, yb + .14, pz - .012, px + .012, yb + .98, pz + .012, ironC); }
            B.plain.box(Math.min(ax, bx), yb + .4, Math.min(az, bz) - .01, Math.max(ax, bx), yb + .43, Math.max(az, bz) + .01, ironC); };
          rail(bx0, z1, bx1, z1); rail(bx0, zF, bx0, z1); rail(bx1, zF, bx1, z1); }
        if (rnd() < .55) { const flowerC = rnd() < .6 ? "#d63a7a" : rnd() < .5 ? "#e8732a" : "#f3e7e9";
          for (let k = 0; k < 6 + rnd() * 8; k++) { const px = bx0 + .2 + rnd() * (bx1 - bx0 - .4), pz = z1 - s * (.15 + rnd() * .2), py = yb + .9 + rnd() * .5;
            B.foliage.sphere(px, py, pz, .22 + rnd() * .2, .18 + rnd() * .15, .2, C(rnd() < .55 ? flowerC : "#3f7a35"), 6, { wind: .6 }); }
          for (let k = 0; k < 4; k++) { const px = bx0 + .3 + rnd() * (bx1 - bx0 - .6); B.foliage.sphere(px, yb - .2 - rnd() * .4, z1 + s * .05, .12, .4, .1, C(flowerC), 5, { wind: 1 }); }
        }
        if (rnd() < .25) { const px = (bx0 + bx1) / 2; for (let k = 0; k < 4; k++) B.plain.box(px - .9 + k * .45, yb + .5, Math.min(z1, z1 - s * .05), px - .6 + k * .45, yb + 1.0, Math.max(z1, z1 - s * .05), C(["#e9e2cf", "#8a3a3a", "#3e5a72", "#f2c230"][k])); } // quần áo phơi
      }
      if (rnd() < .3) { const ax = x0 + .3 + rnd() * (w - 1.2), ay = yb + 1.6; B.plain.box(ax, ay, Math.min(zF, zF + s * .32), ax + .8, ay + .55, Math.max(zF, zF + s * .32), C("#e7e7e2")); } // cục nóng điều hoà
    }
    // mái
    if (H.style === "old" || (H.style === "colonial" && rnd() < .5)) {
      const ry = h, d = 5, z2 = zF - s * 0 , zr = zF - s * d * -0;
      const pA = [x0 - .1, ry - .1, zF + s * .45], pB = [x1 + .1, ry - .1, zF + s * .45], pC = [x1 + .1, ry + 2.2, zF - s * d], pD = [x0 - .1, ry + 2.2, zF - s * d];
      if (N) B.roof.quad(pA, pB, pC, pD, [1, 1, 1], [0, 0, w / 2, 2.6]); else B.roof.quad(pB, pA, pD, pC, [1, 1, 1], [0, 0, w / 2, 2.6]);
      B.plain.box(x0 - .1, ry + 2.15, Math.min(zF - s * d, zF - s * (d + .3)), x1 + .1, ry + 2.35, Math.max(zF - s * d, zF - s * (d + .3)), C("#6e3624"));
      const zBack = N ? zf - depth : zf + depth; const pE = [x0 - .1, ry + 2.2, zF - s * d], pF = [x1 + .1, ry + 2.2, zF - s * d], pG = [x1 + .1, ry - .1, zBack], pH = [x0 - .1, ry - .1, zBack];
      if (N) B.roof.quad(pH, pG, pF, pE, [1, 1, 1], [0, 0, w / 2, 4]); else B.roof.quad(pG, pH, pE, pF, [1, 1, 1], [0, 0, w / 2, 4]);
    } else {
      B.plain.box(x0, h, Math.min(zF, zF - s * .2), x1, h + .9, Math.max(zF, zF - s * .2), C(shadeHex(color, 6)));
      if (rnd() < .7) { const tx = x0 + .6 + rnd() * Math.max(.1, w - 2.2), tz = zF - s * (2 + rnd() * 5); // bồn nước inox
        B.plain.box(tx, h, tz - .5, tx + 1.4, h + .5, tz + .5, C("#6b6b66"));
        B.plain.with(M4.mul(new Float32Array(16), M4.trs(tx, h + 1.05, tz, 0, 1, 1, 1), M4.rotZ(Math.PI / 2)), () => B.plain.cyl(0, -.05, 0, .55, 1.5, 14, C("#d8dcdf"))); }
      if (rnd() < .5) { const zz = zF - s * (5 + rnd() * 4); B.plain.box(x0 + .2, h + 2.2, Math.min(zz, zz - s * 3), x1 - .2, h + 2.3, Math.max(zz, zz - s * 3), C(rnd() < .5 ? "#6f8fa8" : "#9aa0a0")); // mái tôn
        for (const px of [x0 + .3, x1 - .3]) for (const pz of [zz, zz - s * 3]) B.plain.box(px - .04, h, pz - .04, px + .04, h + 2.2, pz + .04, C("#555")); }
      if (rnd() < .6) for (let k = 0; k < 3; k++) B.foliage.sphere(x0 + .5 + rnd() * (w - 1), h + 1.2, zF - s * (.6 + rnd()), .4, .5, .4, C("#3f7a35"), 6, { wind: .5 });
    }
    // mái hiên sọc
    if (!H.shopShut && rnd() < .4) { const aw = awnings[Math.floor(rnd() * awnings.length)], y1 = gh - .05, y2 = gh - .7, d = 1.3;
      const a = [x0 + .1, y2, zF + s * d], b = [x1 - .1, y2, zF + s * d], c2 = [x1 - .1, y1, zF + s * .05], d2 = [x0 + .1, y1, zF + s * .05];
      if (N) B.atlas.quad(a, b, c2, d2, [1, 1, 1], [aw[0], aw[1], aw[0] + (aw[2] - aw[0]) * Math.min(1, w / 2), aw[3]]); else B.atlas.quad(b, a, d2, c2, [1, 1, 1], aw); }
    // biển dọc
    if (H.sign && rnd() < .45) { const rv = A.alloc(34, 126); const vtxt = H.sign.t.split(" ").slice(0, 3).join(" ");
      paintVSign(A, rv, vtxt, H.sign.col[0], H.sign.col[1]); const sx = rnd() < .5 ? x0 + .15 : x1 - .15, yy = gh + .3;
      B.atlas.box(sx - .05, yy, Math.min(zF + s * .2, zF + s * .8), sx + .05, yy + 2.2, Math.max(zF + s * .2, zF + s * .8), [1, 1, 1], { faces: { l: rv.uv, r: rv.uv, f: false, b: false, t: false, d: false } });
      B.plain.rod([sx, yy + 2.2, zF], [sx, yy + 2.2, zF + s * .8], .02, C("#333")); }
    // ánh sáng cửa hàng ban đêm
    if (!H.shopShut) W.lights.push({ p: [(x0 + x1) / 2, 2.2, zF + s * 1.4], c: [1.6, 1.0, .5], r: 6.5 });
    if (H.sign && H.sign.led) W.glows.push([(x0 + x1) / 2, gh - .3, zF + s * .1, 1, .25, .15, 1.6]);
    return H;
  }
  function row(side, x0, x1, skip) {
    let x = x0; while (x < x1 - 2.5) { let w = 3.6 + rnd() * 2.6; if (x1 - x - w < 3.2) w = x1 - x; const s = skip && skip.find(k => x < k[1] && x + w > k[0]);
      if (s) { if (x < s[0] - 3) { house(x, s[0], side); } x = s[1]; continue; } house(x, x + w, side); x += w; }
  }

  /* --- địa danh --- */
  const LM = {};
  // Chợ Hàng Bè (bắc, x 18..34)
  LM.market = house(18, 34, "N", { up: 1, style: "colonial", color: "#ece2c8", sign: { t: "CHỢ HÀNG BÈ", s: "Rau · Hoa · Đồ khô · Đồ lễ", col: ["#a8322a", "#f6d77a"], led: false }, parapetText: "CHỢ", lm: "market",
    H: { bays: 6, open: [1, 0, 1, 0, 1, 0], lit: [1] } });
  // Phở Bát Đàn (nam)
  LM.pho = house(44, 50, "S", { up: 2, style: "old", color: "#d9a441", sign: { t: "PHỞ GIA TRUYỀN", s: "Bát Đàn · Phở bò tái nạm", col: ["#a8322a", "#fff6dc"], led: true }, lm: "pho", shut: false,
    H: { goods: ["#f4efe6", "#d8dcdf", "#7a2a22"] } });
  LM.giang = house(108, 113, "S", { up: 2, style: "colonial", color: "#e8c98a", sign: { t: "CÀ PHÊ GIẢNG", s: "Cà phê trứng · từ 1946", col: ["#4a2f22", "#f4e3c3"], led: false }, lm: "giang", shut: false });
  LM.lavong = house(126, 131, "N", { up: 2, style: "old", color: "#c9a46a", sign: { t: "CHẢ CÁ LÃ VỌNG", s: "Chả cá · Bún · Thì là", col: ["#1d1714", "#e8c46a"], led: false }, lm: "lavong", shut: false });
  LM.kem = house(160, 172, "N", { up: 1, style: "colonial", color: "#f1e6cf", sign: { t: "KEM TRÀNG TIỀN", s: "Kem que · Kem ốc quế · Kem cốc", col: ["#b8322a", "#ffffff"], led: true }, lm: "kem", shut: false, parapetText: "TRÀNG TIỀN",
    H: { bays: 5, goods: ["#f4efe6", "#9fd18a", "#e9c13a", "#d8a0a0"] } });
  row("N", -66, -5); row("S", -66, -5);
  row("N", 6, 196, [[18, 34], [126, 131], [160, 172]]);
  row("S", 6, 196, [[44, 50], [108, 113]]);
  // nhà góc nhìn ra hồ
  for (let z = 12; z < 60; z += 5 + rnd() * 2) { const h = 8 + rnd() * 6; const rr = A.alloc(5 * PX, h * PX); paintFacade(A, rr, { w: 5, h, up: Math.round((h - 4) / 3.2), gh: 3.6, fh: 3.2, style: "colonial", color: FACADE_COLS[Math.floor(rnd() * 11)], shutter: "#3f6e52", bays: 2, lit: [1, 0, 1, 0], open: [1, 0, 1, 0, 0, 1, 1, 0], curtain: "#c9b28a", sign: null, no: 1, shopShut: rnd() < .3, goods: ["#c8382f", "#e9b949"] }, rnd);
    B.atlas.box(186, 0, z, 196, h, z + 5, [1, 1, 1], { faces: { r: rr.uv, l: wallSlots[2], f: wallSlots[2], b: wallSlots[2], t: wallSlots[2], d: false } });
    B.atlas.box(186, 0, -z - 5, 196, h, -z, [1, 1, 1], { faces: { r: rr.uv, l: wallSlots[3], f: wallSlots[3], b: wallSlots[3], t: wallSlots[3], d: false } }); }
  // khối nhà cao phía sau
  for (let x = -70; x < 196; x += 9 + rnd() * 8) for (const N of [true, false]) { if (rnd() < .25) continue; const h = 14 + rnd() * 14, w = 8 + rnd() * 8, z0 = N ? NZ - 18 - rnd() * 10 : SZ + 18 + rnd() * 10;
    const t = towerSlots[Math.floor(rnd() * 3)]; B.atlas.box(x, 0, N ? z0 - 12 : z0, x + w, h, N ? z0 : z0 + 12, [1, 1, 1], { faces: { f: t, b: t, l: t, r: t, t: wallSlots[7], d: false } });
    if (rnd() < .7) B.plain.with(M4.mul(new Float32Array(16), M4.trs(x + 2, h + .9, N ? z0 - 4 : z0 + 4, 0, 1, 1, 1), M4.rotZ(Math.PI / 2)), () => B.plain.cyl(0, -.7, 0, .6, 1.6, 12, C("#d8dcdf"))); }

  /* --- Ô Quan Chưởng: cổng thành bắc ngang đường --- */
  (function gate() {
    const S = B.stone, col = [1, 1, 1], gw = 3.4;
    S.box(-3.2, 0, -12, 3.2, 6.6, -gw / 2 - .2, col, { world: true, ws: 2 }); S.box(-3.2, 0, gw / 2 + .2, 3.2, 6.6, 12, col, { world: true, ws: 2 });
    S.box(-3.2, 4.6, -gw / 2 - .2, 3.2, 6.6, gw / 2 + .2, col, { world: true, ws: 2 });
    for (let k = 0; k < 14; k++) { const a0 = k / 14 * Math.PI, a1 = (k + 1) / 14 * Math.PI, r = gw / 2 + .2, y = 3.3;
      const z0 = -Math.cos(a0) * r, z1 = -Math.cos(a1) * r, y0 = y + Math.sin(a0) * r, y1 = y + Math.sin(a1) * r;
      S.quad([-3.2, y0, z0], [3.2, y0, z0], [3.2, y1, z1], [-3.2, y1, z1], col, [0, 0, 3.2, .4]); S.box(-3.2, Math.max(y0, y1), Math.min(z0, z1), 3.2, 4.62, Math.max(z0, z1), col, { world: true, ws: 2, faces: { f: false, b: false } }); }
    S.box(-3.4, 6.6, -12.2, 3.4, 6.85, 12.2, C("#9a917f"), { world: true, ws: 2 });
    S.box(-2.3, 6.85, -5.5, 2.3, 9.3, 5.5, C("#d8cfb4"), { world: true, ws: 2 });
    for (const sx of [-1, 1]) for (const zz of [-3, 0, 3]) B.plain.cyl(sx * 2.31, 7.6, zz, .38, .02, 14, C("#3a2e25"), { cap: true });
    for (const sx of [-1, 1]) B.plain.with(M4.mul(new Float32Array(16), M4.trs(sx * 2.32, 8.0, 0, 0, 1, 1, 1), M4.rotZ(Math.PI / 2)), () => { for (const zz of [-3, 0, 3]) B.plain.cyl(0, -.02, zz, .4, .04, 16, C("#2b221c")); });
    const roofTier = (y, hx, hz, rise, over) => { const Rf = B.roof, c2 = [1, 1, 1];
      Rf.quad([-hx - over, y, -hz - over], [-hx - over, y, hz + over], [0, y + rise, hz * .55], [0, y + rise, -hz * .55], c2, [0, 0, hz, 2]);
      Rf.quad([hx + over, y, hz + over], [hx + over, y, -hz - over], [0, y + rise, -hz * .55], [0, y + rise, hz * .55], c2, [0, 0, hz, 2]);
      Rf.quad([-hx - over, y, hz + over], [hx + over, y, hz + over], [0, y + rise, hz * .55], [0, y + rise, hz * .55], c2, [0, 0, hx, 2]);
      Rf.quad([hx + over, y, -hz - over], [-hx - over, y, -hz - over], [0, y + rise, -hz * .55], [0, y + rise, -hz * .55], c2, [0, 0, hx, 2]);
      B.plain.box(-.2, y + rise - .05, -hz * .58, .2, y + rise + .25, hz * .58, C("#4b3a2e"));
      for (const sz of [-1, 1]) for (const sx of [-1, 1]) B.plain.rod([sx * (hx + over), y, sz * (hz + over)], [sx * (hx + over + .35), y + .55, sz * (hz + over + .35)], .09, C("#4b3a2e")); };
    roofTier(9.3, 2.3, 5.5, 1.5, .9);
    S.box(-1.4, 10.4, -2.6, 1.4, 11.8, 2.6, C("#d8cfb4"), { world: true, ws: 2 }); roofTier(11.8, 1.4, 2.6, 1.2, .7);
    const pr = A.alloc(220, 50); paintPlaque(A, pr, "Ô QUAN CHƯỞNG", "#efe3c4", "#3a2a1a", "Cửa Đông Hà · 1749");
    B.atlas.quad([3.22, 5.2, -1.85], [3.22, 5.2, 1.85], [3.22, 6.05, 1.85], [3.22, 6.05, -1.85], [1, 1, 1], pr.uv);
    B.atlas.quad([-3.22, 5.2, 1.85], [-3.22, 5.2, -1.85], [-3.22, 6.05, -1.85], [-3.22, 6.05, 1.85], [1, 1, 1], pr.uv);
    for (let k = 0; k < 40; k++) { const z = (rnd() - .5) * 22, y = 4 + rnd() * 2.6; if (Math.abs(z) < 2.2 && y < 4.8) continue; B.foliage.sphere(3.25 * (rnd() < .5 ? 1 : -1), y, z, .1, .35 + rnd() * .5, .3, C(rnd() < .5 ? "#3f5f2e" : "#56743a"), 5, { wind: .3 }); }
    W.blocks.push({ x0: -3.2, x1: 3.2, z0: -12, z1: 12, h: 12, lm: "gate" });
  })();

  /* --- Hồ Gươm: Tháp Rùa, cầu Thê Húc, đền Ngọc Sơn --- */
  (function lake() {
    const tx = 258, tz = 14; B.foliage.sphere(tx, -.6, tz, 9, 1.2, 6, C("#4f7a3a"), 12);
    for (let k = 0; k < 5; k++) tree(tx + 4 + rnd() * 3, tz - 4 + k * 2, 4 + rnd() * 3, .8);
    const S = B.stone, tc = C("#e2d6b8");
    const tier = (y, hw, hd, hh) => { S.box(tx - hw, y, tz - hd, tx + hw, y + hh, tz + hd, tc, { world: true, ws: 2 });
      B.plain.box(tx - hw - .25, y + hh, tz - hd - .25, tx + hw + .25, y + hh + .22, tz + hd + .25, C("#6a5440"));
      const n = Math.max(1, Math.round(hw / .8)); for (let k = 0; k < n; k++) { const ax = tx - hw + (k + .5) * (2 * hw / n);
        for (const sz of [-1, 1]) { B.plain.box(ax - .22, y + .15, tz + sz * (hd + .01) - .01, ax + .22, y + hh * .7, tz + sz * (hd + .01) + .01, C("#3a342c")); B.plain.cyl(ax, y + hh * .7 - .01, tz + sz * (hd + .02), .22, .01, 8, C("#3a342c")); } } };
    tier(.4, 2.6, 1.9, 2.6); tier(3.22, 1.9, 1.4, 2.0); tier(5.44, 1.3, 1.0, 1.6);
    B.roof.quad([tx - 1.5, 7.26, tz + 1.2], [tx + 1.5, 7.26, tz + 1.2], [tx, 8.4, tz], [tx, 8.4, tz], [1, 1, 1], [0, 0, 2, 1]);
    B.roof.quad([tx + 1.5, 7.26, tz - 1.2], [tx - 1.5, 7.26, tz - 1.2], [tx, 8.4, tz], [tx, 8.4, tz], [1, 1, 1], [0, 0, 2, 1]);
    B.roof.quad([tx - 1.5, 7.26, tz - 1.2], [tx - 1.5, 7.26, tz + 1.2], [tx, 8.4, tz], [tx, 8.4, tz], [1, 1, 1], [0, 0, 2, 1]);
    B.roof.quad([tx + 1.5, 7.26, tz + 1.2], [tx + 1.5, 7.26, tz - 1.2], [tx, 8.4, tz], [tx, 8.4, tz], [1, 1, 1], [0, 0, 2, 1]);
    W.lights.push({ p: [tx, 4, tz + 4], c: [1.4, 1.1, .6], r: 12 }); W.glows.push([tx, 4, tz, 1, .8, .4, 9]);
    // đền Ngọc Sơn + cầu
    const ix = 246, iz = -34; B.foliage.sphere(ix, -.5, iz, 10, 1.1, 7, C("#4f7a3a"), 12);
    for (let k = 0; k < 8; k++) tree(ix - 6 + rnd() * 12, iz - 5 + rnd() * 9, 5 + rnd() * 4, 1);
    B.plain.box(ix - 3, .4, iz - 2, ix + 3, 3.2, iz + 2, C("#d9c99f"));
    for (const [y, w, d] of [[3.2, 3.8, 2.8], [4.4, 2.6, 1.9]]) { B.roof.quad([ix - w, y, iz + d], [ix + w, y, iz + d], [ix + w * .6, y + 1.1, iz], [ix - w * .6, y + 1.1, iz], [1, 1, 1], [0, 0, 3, 1]);
      B.roof.quad([ix + w, y, iz - d], [ix - w, y, iz - d], [ix - w * .6, y + 1.1, iz], [ix + w * .6, y + 1.1, iz], [1, 1, 1], [0, 0, 3, 1]); if (y < 4) B.plain.box(ix - 1.8, y, iz - 1.2, ix + 1.8, y + 1.2, iz + 1.2, C("#d9c99f")); }
    for (let k = -2; k <= 2; k++) B.plain.cyl(ix + k * 1.3, .4, iz + 2.05, .14, 2.8, 8, C("#8e2b22"));
    const red = C("#c23b2b"), p0 = [222.4, .3, -26], p1 = [ix - 3, .4, iz + 1]; const seg = 18; let prev = null;
    for (let k = 0; k <= seg; k++) { const t = k / seg, x = p0[0] + (p1[0] - p0[0]) * t, z = p0[2] + (p1[2] - p0[2]) * t, y = .35 + Math.sin(t * Math.PI) * 2.0;
      if (prev) { const L = Math.hypot(x - prev[0], z - prev[2]), ang = Math.atan2(z - prev[2], x - prev[0]), mx = (x + prev[0]) / 2, mz = (z + prev[2]) / 2, my = (y + prev[1]) / 2, pitch = Math.atan2(y - prev[1], L);
        B.plain.with(M4.mul(new Float32Array(16), M4.trs(mx, my, mz, -ang, 1, 1, 1), M4.rotZ(pitch)), () => { B.plain.box(-L / 2 - .02, -.12, -1.1, L / 2 + .02, .05, 1.1, red); });
        for (const sd of [-1, 1]) { const nx = -Math.sin(ang) * sd * 1.05, nz = Math.cos(ang) * sd * 1.05; B.plain.rod([prev[0] + nx, prev[1] + .9, prev[2] + nz], [x + nx, y + .9, z + nz], .05, red); B.plain.rod([x + nx, y, z + nz], [x + nx, y + .9, z + nz], .06, red); } }
      prev = [x, y, z]; }
    for (let k = 0; k < 10; k++) { const t = k / 9, x = p0[0] + (p1[0] - p0[0]) * t, z = p0[2] + (p1[2] - p0[2]) * t; W.glows.push([x, .4 + Math.sin(t * Math.PI) * 2 + 1.05, z, 1, .3, .2, 2.2]); }
    W.lights.push({ p: [234, 2.5, -30], c: [1.6, .5, .3], r: 10 });
    // cổng Thê Húc bên bờ
    B.plain.box(221.2, 0, -28.5, 221.6, 4, -28.1, red); B.plain.box(221.2, 0, -23.9, 221.6, 4, -23.5, red); B.roof.quad([221, 4, -29.2], [221, 4, -22.8], [221.4, 4.8, -24.2], [221.4, 4.8, -27.8], [1, 1, 1], [0, 0, 3, 1]);
    // lan can bờ hồ, liễu, ghế đá
    const iron = C("#2c332c"); for (let z = -88; z < 88; z += 2) { if (z > -29 && z < -23) continue; B.plain.box(221.6, WALK_Y, z, 221.75, WALK_Y + .9, z + .06, iron); B.plain.box(221.6, WALK_Y + .85, z, 221.75, WALK_Y + .9, z + 2, iron); B.plain.box(221.6, WALK_Y + .35, z, 221.75, WALK_Y + .38, z + 2, iron); }
    for (let z = -80; z < 80; z += 13) { if (Math.abs(z + 26) < 6 || (z > -12 && z < 4)) continue; willow(218.6, z + rnd() * 3); }
    for (let z = -70; z < 70; z += 17) { B.plain.box(216, WALK_Y, z, 216.5, WALK_Y + .45, z + 1.6, C("#9a9488")); }
    for (let z = -84; z < 84; z += 18) lamp(214.6, z, "x");
    // bờ xa
    for (let k = 0; k < 60; k++) { const a = k / 60; const x = 300 + Math.sin(a * 6.28) * 0 + 160 * (k % 2) * .1 + 180, z = -90 + a * 180; tree(x + rnd() * 10, z, 6 + rnd() * 5, 1.3); }
    for (let x = 230; x < 470; x += 10 + rnd() * 8) for (const zs of [-1, 1]) { tree(x, zs * (84 + rnd() * 6), 6 + rnd() * 5, 1.3); if (rnd() < .6) B.atlas.box(x, 0, zs > 0 ? 96 : -110, x + 10, 10 + rnd() * 16, zs > 0 ? 110 : -96, [1, 1, 1], { faces: { f: towerSlots[0], b: towerSlots[1], l: towerSlots[2], r: towerSlots[0], t: wallSlots[7], d: false } }); }
    W.blocks.push({ x0: 222, x1: 520, z0: -90, z1: 90, h: 0, lm: "lake", water: true });
  })();

  /* --- cây sấu, cột điện, đèn đường --- */
  function tree(x, z, h, s) {
    s = s || 1; const tr = C("#5f4a3a");
    B.plain.cyl(x, 0, z, .22 * s, h * .6, 8, tr, { r2: .15 * s }); B.plain.rod([x, h * .45, z], [x + .9 * s, h * .75, z + .4], .1 * s, tr); B.plain.rod([x, h * .5, z], [x - .8 * s, h * .8, z - .5], .1 * s, tr);
    const n = Math.round(10 * s); for (let k = 0; k < n; k++) { const a = rnd() * 6.28, rr = rnd() * 2.2 * s, y = h * .62 + rnd() * h * .45;
      B.foliage.sphere(x + Math.cos(a) * rr, y, z + Math.sin(a) * rr, (1.1 + rnd() * .9) * s, (.8 + rnd() * .6) * s, (1.1 + rnd() * .9) * s, C(["#3f7a35", "#4b8f42", "#36692f", "#5a9a45", "#6f9a3a"][Math.floor(rnd() * 5)]), 7, { wind: .7 }); }
  }
  function sau(x, z) { // cây sấu vỉa hè, gốc quét vôi
    tree(x, z, 11 + rnd() * 3, 1.5); B.plain.cyl(x, 0, z, .36, 1.3, 10, C("#efeee8"), { cap: false });
    B.plain.box(x - .7, 0, z - .7, x + .7, WALK_Y + .08, z + .7, C("#8e8a82"));
  }
  function willow(x, z) {
    B.plain.cyl(x, 0, z, .25, 4.5, 8, C("#4f4034"), { r2: .18 }); const col = C("#7da35a"), col2 = C("#6f9a4e");
    for (let k = 0; k < 12; k++) { const a = rnd() * 6.28, rr = rnd() * 1.6; B.foliage.sphere(x + Math.cos(a) * rr, 5.2 + rnd() * 1.2, z + Math.sin(a) * rr, 1.3, .8, 1.3, k % 2 ? col : col2, 9, { wind: .6 }); }
    for (let k = 0; k < 90; k++) { const a = rnd() * 6.28, rr = .8 + rnd() * 2.2, px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr, top = 5.4 + rnd() * .5, bot = 1.6 + rnd() * 2.2;
      B.foliage.box(px - .016, bot, pz - .016, px + .016, top, pz + .016, k % 3 ? col : col2, { wind: 1.4 }); }
  }
  function lamp(x, z, ax) { // đèn đường cổ màu xanh rêu
    const g = C("#24382c"); B.plain.cyl(x, 0, z, .2, .7, 10, g, { r2: .12 }); B.plain.cyl(x, .7, z, .07, 3.4, 8, g);
    const lx = x + (ax === "x" ? .45 : 0), lz = z + (ax === "x" ? 0 : (z < 0 ? .45 : -.45));
    B.plain.rod([x, 3.9, z], [lx, 4.0, lz], .05, g); B.plain.cyl(lx, 3.95, lz, .2, .1, 8, g); B.plain.cyl(lx, 4.05, lz, .14, .4, 8, C("#f6e7b8"), { em: 1 }); B.plain.cyl(lx, 4.45, lz, .24, .25, 8, g, { r2: .02 });
    W.lights.push({ p: [lx, 3.9, lz], c: [2.4, 1.8, 1.0], r: 13 }); W.glows.push([lx, 4.2, lz, 1, .78, .45, 5]);
  }
  const poles = [];
  [10, 48, 96, 140, 182].forEach(x => sau(x, -5));
  [24, 60, 118, 152, 190].forEach(x => sau(x, 5.1));
  [38, 88, 128, 178].forEach(x => lamp(x, -4.6)); [12, 70, 108, 156, 198].forEach(x => lamp(x, 4.6));
  [-40, -14, 30, 64, 104, 146, 186].forEach(x => { // cột điện bê tông và dây điện chằng chịt
    const g = C("#9a958c"); B.plain.box(x - .16, 0, CURB_N - .9, x + .16, 9.5, CURB_N - .58, g);
    for (const y of [7.6, 8.4, 9.1]) B.plain.box(x - .1, y, CURB_N - 1.8, x + .1, y + .12, CURB_N + .3, C("#6f6a63"));
    B.plain.box(x - .45, 5.4, CURB_N - 1.1, x + .45, 6.6, CURB_N - .9, C("#7d7a72"));
    for (let k = 0; k < 5; k++) B.plain.sphere(x + (rnd() - .5) * .5, 6.8 + k * .18, CURB_N - .74, .26, .1, .22, C("#151515"), 6);
    poles.push(x);
  });
  const L = [];
  for (let i = 0; i < poles.length - 1; i++) { const a = poles[i], b = poles[i + 1];
    for (let k = 0; k < 9; k++) { const y0 = 7.5 + (k % 3) * .7 + .1, zA = CURB_N - 1.7 + (k / 9) * 1.9, sag = .8 + rnd() * 1.4; let pv = null;
      for (let s = 0; s <= 14; s++) { const t = s / 14, x = a + (b - a) * t, y = y0 - Math.sin(t * Math.PI) * sag, z = zA + Math.sin(t * Math.PI) * .2; if (pv) L.push(...pv, x, y, z); pv = [x, y, z]; } } }
  for (const x of poles) for (let k = 0; k < 7; k++) { const zt = NZ + .2, yt = 3.6 + rnd() * 5, tx = x + (rnd() - .5) * 14, sag = .3 + rnd() * .5; let pv = null; // dây vào nhà
    for (let s = 0; s <= 8; s++) { const t = s / 8, X = x + (tx - x) * t, Y = 7.8 + (yt - 7.8) * t - Math.sin(t * Math.PI) * sag, Z = CURB_N - .8 + (zt - (CURB_N - .8)) * t; if (pv) L.push(...pv, X, Y, Z); pv = [X, Y, Z]; } }
  for (const x of poles) for (let k = 0; k < 4; k++) { let pv = null; const sag = 1 + rnd(); for (let s = 0; s <= 12; s++) { const t = s / 12, Z = CURB_N - .8 + (SZ + .3 - (CURB_N - .8)) * t, Y = 8.2 - Math.sin(t * Math.PI) * sag - t * (2 + k * .6); if (pv) L.push(...pv, x + t * 1.2, Y, Z); pv = [x + t * 1.2, Y, Z]; } }
  for (const x of poles) for (let k = 0; k < 30; k++) { const a = rnd() * 6.28, r = .2 + rnd() * .3, y = 6.9 + rnd() * .8; L.push(x + Math.cos(a) * r, y, CURB_N - .75 + Math.sin(a) * .2, x + Math.cos(a + 2) * r, y + .1, CURB_N - .75 + Math.sin(a + 2) * .2); } // búi dây
  R.addLines(L, [.07, .07, .07, 1]);

  /* --- quán trà đá --- */
  const SC = { x: 76, z: -7.6 };
  (function stall() {
    const P = B.plain, wood = C("#7a4e2e");
    P.box(SC.x - .6, WALK_Y, SC.z - .38, SC.x + .6, WALK_Y + .62, SC.z + .38, wood); P.box(SC.x - .52, WALK_Y + .22, SC.z + .381, SC.x + .52, WALK_Y + .56, SC.z + .39, C("#c9d6d6"));
    for (let k = 0; k < 5; k++) P.box(SC.x - .45 + k * .19, WALK_Y + .26, SC.z + .1, SC.x - .33 + k * .19, WALK_Y + .5, SC.z + .3, C(["#d8a24a", "#3a2a1a", "#e2d1a8", "#c8382f", "#6f4a2a"][k]));
    P.cyl(SC.x - .38, WALK_Y + .62, SC.z - .05, .12, .36, 12, C("#c8862a")); P.cyl(SC.x - .38, WALK_Y + .98, SC.z - .05, .13, .05, 12, C("#c8382f")); // bình trà
    P.cyl(SC.x - .08, WALK_Y + .62, SC.z - .1, .08, .42, 12, C("#c8382f")); P.cyl(SC.x - .08, WALK_Y + 1.04, SC.z - .1, .05, .05, 8, C("#7a1d14")); // phích nước
    P.cyl(SC.x + .14, WALK_Y + .62, SC.z, .07, .22, 10, C("#e9dcc0")); P.cyl(SC.x + .14, WALK_Y + .84, SC.z, .075, .03, 10, C("#2f74c0")); // lọ kẹo lạc
    P.cyl(SC.x + .32, WALK_Y + .62, SC.z, .07, .22, 10, C("#5a3a20")); P.cyl(SC.x + .32, WALK_Y + .84, SC.z, .075, .03, 10, C("#2f74c0"));
    for (let k = 0; k < 6; k++) P.cyl(SC.x + .1 + (k % 3) * .1, WALK_Y + .62, SC.z + .22 + Math.floor(k / 3) * .09, .035, .08, 8, C("#f2efe2"));
    P.box(SC.x + .75, WALK_Y, SC.z - .3, SC.x + 1.25, WALK_Y + .45, SC.z + .15, C("#f4f4f1")); // thùng đá
    P.box(SC.x - .9, WALK_Y + .3, NZ + .02, SC.x + 1.1, WALK_Y + 1.0, NZ + .05, C("#8a5a35")); // bảng giá
    const pr = A.alloc(120, 48); paintPlaque(A, pr, "TRÀ ĐÁ", "#2a2a2a", "#f6e7b8", "Hướng dương · Kẹo lạc · Thuốc lào"); B.atlas.quad([SC.x - .85, WALK_Y + .32, NZ + .06], [SC.x + 1.05, WALK_Y + .32, NZ + .06], [SC.x + 1.05, WALK_Y + .98, NZ + .06], [SC.x - .85, WALK_Y + .98, NZ + .06], [1, 1, 1], pr.uv);
    P.rod([SC.x - .2, 3.2, NZ + .05], [SC.x + .2, 2.5, SC.z + .3], .01, C("#111")); P.sphere(SC.x + .2, 2.42, SC.z + .3, .07, .09, .07, C("#fff3c4"), 8, { em: 1.2 });
    W.lights.push({ p: [SC.x + .2, 2.3, SC.z + .4], c: [2.6, 1.7, .8], r: 7 }); W.glows.push([SC.x + .2, 2.42, SC.z + .3, 1, .8, .45, 3.2]);
    P.cyl(SC.x + 1.6, WALK_Y, SC.z - .1, .22, .02, 10, C("#3a3a3a")); P.cyl(SC.x + 1.6, WALK_Y, SC.z - .1, .04, .7, 6, C("#c9b896")); // điếu cày
    W.seller = { x: SC.x + .25, z: SC.z - .9, face: 0 };
    W.stall = SC;
  })();
  // 15 ghế nhựa quanh quán
  const ring = (r, angs) => angs.map(a => { const t = a * Math.PI / 180; return [SC.x + Math.cos(t) * r, SC.z + Math.sin(t) * r]; });
  [...ring(1.7, [18, 50, 82, 114, 146, 172]), ...ring(2.9, [-4, 18, 40, 62, 84, 106, 128, 150, 172])].forEach(([x, z], i) => {
    const face = Math.atan2(SC.x - x, SC.z - z); W.stools.push({ i, x, z, face, color: i % 3 === 1 ? C("#c8382f") : C("#2f74c0"), occ: null, shells: [] });
  });
  // vị trí gốc (bx,bz) và vị trí khi kê gọn sát tường (cx,cz) để chừa lối đi
  W.stools.forEach(s => { s.bx = s.x; s.bz = s.z; s.cx = SC.x + (s.x - SC.x) * 1.25; s.cz = SC.z + (s.z - SC.z) * .55; s.bface = s.face; s.cface = Math.atan2(SC.x - s.cx, SC.z - s.cz); });
  // khách vãng lai ngồi bàn ở các địa danh
  [[22, -6.5], [26, -5.8], [30, -6.6]].forEach(([x, z], k) => { W.extras.push({ kind: "vendor", x, z, face: 0 }); metGeo(B.plain, B.foliage, x + .6, z + .3, k); });
  for (let k = 0; k < 6; k++) W.extras.push({ kind: "queue", x: 51.5 + k * .75, z: 7.0, face: -Math.PI / 2 });
  for (let k = 0; k < 2; k++) { stoolGeo(B.plain, 110 + k * 1.3, 6.6, Math.PI, C("#2f74c0")); W.extras.push({ kind: "coffee", x: 110 + k * 1.3, z: 6.6, face: Math.PI }); }
  B.plain.box(110.3, WALK_Y, 5.9, 110.9, WALK_Y + .32, 6.3, C("#8a5a35"));
  for (let k = 0; k < 3; k++) W.extras.push({ kind: "ice", x: 163 + k * 2.3, z: -7.4 + (k % 2) * .5, face: (k - 1) * .6 });
  for (const lx of [126.6, 130.4]) { B.plain.rod([lx, 3.5, NZ + .3], [lx, 3.1, NZ + .3], .01, C("#222")); B.plain.sphere(lx, 2.75, NZ + .3, .28, .36, .28, C("#d4321f"), 10, { em: .8 }); B.plain.cyl(lx, 3.06, NZ + .3, .14, .06, 8, C("#e0a62a")); W.glows.push([lx, 2.75, NZ + .3, 1, .25, .12, 3.5]); }
  W.lights.push({ p: [128.5, 2.5, NZ + 1.2], c: [2.2, .6, .3], r: 7 });
  // xe máy dựng trên vỉa hè
  for (let x = -60; x < 196; x += 2 + rnd() * 6) { const N = rnd() < .5; if (N && x > 66 && x < 92) continue; if (!N && x > 42 && x < 56) continue; if (x > 16 && x < 36 && N) continue; if (Math.abs(x) < 5) continue;
    const z = N ? NZ + 1.0 + rnd() * .5 : SZ - 1.0 - rnd() * .5; W.parked.push({ x, z, ry: (N ? -1 : 1) * (Math.PI / 2 + (rnd() - .5) * .5), col: ["#c8382f", "#1f1f1f", "#e8e8e8", "#2f74c0", "#7a7f87", "#8a2a3a"][Math.floor(rnd() * 6)] }); }

  /* --- thông tin địa danh --- */
  W.landmarks = {
    gate: { k: "Cửa ô cổ", t: "Ô Quan Chưởng", d: "Cửa ô duy nhất của kinh thành Thăng Long xưa còn giữ được đến nay, nằm ở phía đông khu phố cổ. Tường gạch rêu phong, xe máy vẫn ngày ngày luồn qua cổng." },
    market: { k: "Phố Hàng Bè", t: "Chợ Hàng Bè", d: "Chợ nhỏ nép trong lòng phố cổ, bán rau, hoa, đồ khô và đồ lễ. Sáng sớm là lúc đông vui nhất, người Hà Nội ghé mua mớ rau, bó hoa trước giờ làm." },
    pho: { k: "Phố Bát Đàn", t: "Phở Bát Đàn", d: "Quán phở gia truyền nổi tiếng với cảnh xếp hàng: khách tự gọi, tự trả tiền rồi tự bưng bát. Nước dùng trong, thịt bò thái tay." },
    giang: { k: "Phố Nguyễn Hữu Huân", t: "Cà phê Giảng", d: "Cái tên gắn với món cà phê trứng của Hà Nội: lớp kem trứng đánh bông béo ngậy phủ trên cà phê đậm." },
    lavong: { k: "Phố Chả Cá", t: "Chả cá Lã Vọng", d: "Món chả cá gắn với phố Chả Cá. Cá nướng vàng, đảo trên chảo mỡ với thì là, hành, ăn cùng bún, lạc rang và mắm tôm." },
    kem: { k: "Phố Tràng Tiền", t: "Kem Tràng Tiền", d: "Hiệu kem lâu đời trên phố Tràng Tiền. Kem que, kem ốc quế, mua xong đứng ăn ngay trên vỉa hè là đúng điệu." },
    lake: { k: "Trung tâm Hà Nội", t: "Hồ Gươm", d: "Hồ Hoàn Kiếm giữa lòng thủ đô, có Tháp Rùa giữa hồ và cầu Thê Húc sơn đỏ dẫn vào đền Ngọc Sơn. Sáng sớm, quanh hồ là người tập thể dục và đi dạo." }
  };
  W.places = [["Ô Quan Chưởng", 4, -5.5], ["Chợ Hàng Bè", 26, -5.2], ["Phở Bát Đàn", 47, 5.4], ["Quán trà đá", 74, -5.0], ["Cà phê Giảng", 110, 5.4], ["Chả cá Lã Vọng", 128.5, -5.4], ["Kem Tràng Tiền", 166, -5.4], ["Hồ Gươm", 218, -10]];

  /* --- nạp lên GPU --- */
  const atlasTex = R.tex(A.cv, false), emTex = R.tex(A.ecv, false);
  R.addMesh(B.atlas, { tex: atlasTex, em: emTex, spec: .05 });
  R.addMesh(B.plain, { spec: .08 });
  R.addMesh(B.foliage, { spec: .02 });
  R.addMesh(B.side, { tex: T.side, spec: .06, ground: true });
  R.addMesh(B.road, { tex: T.road, spec: .08, ground: true });
  R.addMesh(B.roof, { tex: T.roof, spec: .05 });
  R.addMesh(B.stone, { tex: T.stone, spec: .03 });
  R.addMesh(B.water, { spec: .03, water: true, noShadow: true });
  return W;
}

/* ---------- Ghế nhựa & mẹt hàng ---------- */
function stoolGeo(P, x, z, face, col) {
  P.with(M4.trs(x, WALK_Y, z, face, 1, 1, 1), () => {
    const h = .3; P.box(-.17, h - .035, -.17, .17, h, .17, col);
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) P.rod([sx * .15, h - .03, sz * .15], [sx * .19, 0, sz * .19], .022, col, 5);
    P.box(-.17, .1, -.17, .17, .12, .17, col.map(v => v * .85), { faces: { t: false, d: false } });
  });
}
function metGeo(P, F, x, z, k) {
  const wood = hex("#8a6a3a"); for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) P.rod([x + sx * .25, WALK_Y, z + sz * .25], [x + sx * .3, WALK_Y + .45, z + sz * .3], .02, wood, 4);
  P.cyl(x, WALK_Y + .45, z, .5, .04, 18, hex("#b48a4f"));
  const r = mulberry(k * 7 + 3), cols = [["#f08a24", "#e9a43a", "#4f8a3a"], ["#5f9e3f", "#7cc04e", "#4b8f42"], ["#e63946", "#ffb703", "#ffffff", "#f28482", "#c77dff"]][k % 3];
  for (let i = 0; i < 22; i++) { const a = r() * 6.28, rr = r() * .38; F.sphere(x + Math.cos(a) * rr, WALK_Y + .53 + r() * .06, z + Math.sin(a) * rr, .06, .05, .06, hex(cols[Math.floor(r() * cols.length)]), 6); }
}
