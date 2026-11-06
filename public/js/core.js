/* Trà Đá Phố Cổ — toán ma trận và bộ dựng hình học dùng chung (độc lập với bộ vẽ) */
"use strict";
const M4 = {
  id() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
  mul(o, a, b) { const r = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let i = 0; i < 4; i++) r[c * 4 + i] = a[i] * b[c * 4] + a[4 + i] * b[c * 4 + 1] + a[8 + i] * b[c * 4 + 2] + a[12 + i] * b[c * 4 + 3];
    o.set(r); return o; },
  persp(fovy, asp, n, f) { const t = 1 / Math.tan(fovy / 2), m = new Float32Array(16); m[0] = t / asp; m[5] = t; m[10] = (f + n) / (n - f); m[11] = -1; m[14] = 2 * f * n / (n - f); return m; },
  lookAt(e, c, up) {
    let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2]; let l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
    let xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx; l = Math.hypot(xx, xy, xz) || 1; xx /= l; xy /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx, m = new Float32Array(16);
    m[0] = xx; m[1] = yx; m[2] = zx; m[4] = xy; m[5] = yy; m[6] = zy; m[8] = xz; m[9] = yz; m[10] = zz;
    m[12] = -(xx * e[0] + xy * e[1] + xz * e[2]); m[13] = -(yx * e[0] + yy * e[1] + yz * e[2]); m[14] = -(zx * e[0] + zy * e[1] + zz * e[2]); m[15] = 1; return m;
  },
  inv(a) { const o = new Float32Array(16);
    const b00 = a[0] * a[5] - a[1] * a[4], b01 = a[0] * a[6] - a[2] * a[4], b02 = a[0] * a[7] - a[3] * a[4], b03 = a[1] * a[6] - a[2] * a[5],
      b04 = a[1] * a[7] - a[3] * a[5], b05 = a[2] * a[7] - a[3] * a[6], b06 = a[8] * a[13] - a[9] * a[12], b07 = a[8] * a[14] - a[10] * a[12],
      b08 = a[8] * a[15] - a[11] * a[12], b09 = a[9] * a[14] - a[10] * a[13], b10 = a[9] * a[15] - a[11] * a[13], b11 = a[10] * a[15] - a[11] * a[14];
    let d = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06; if (!d) return M4.id(); d = 1 / d;
    o[0] = (a[5] * b11 - a[6] * b10 + a[7] * b09) * d; o[1] = (a[2] * b10 - a[1] * b11 - a[3] * b09) * d; o[2] = (a[13] * b05 - a[14] * b04 + a[15] * b03) * d; o[3] = (a[10] * b04 - a[9] * b05 - a[11] * b03) * d;
    o[4] = (a[6] * b08 - a[4] * b11 - a[7] * b07) * d; o[5] = (a[0] * b11 - a[2] * b08 + a[3] * b07) * d; o[6] = (a[14] * b02 - a[12] * b05 - a[15] * b01) * d; o[7] = (a[8] * b05 - a[10] * b02 + a[11] * b01) * d;
    o[8] = (a[4] * b10 - a[5] * b08 + a[7] * b06) * d; o[9] = (a[1] * b08 - a[0] * b10 - a[3] * b06) * d; o[10] = (a[12] * b04 - a[13] * b02 + a[15] * b00) * d; o[11] = (a[9] * b02 - a[8] * b04 - a[11] * b00) * d;
    o[12] = (a[5] * b07 - a[4] * b09 - a[6] * b06) * d; o[13] = (a[0] * b09 - a[1] * b07 + a[2] * b06) * d; o[14] = (a[13] * b01 - a[12] * b03 - a[14] * b00) * d; o[15] = (a[8] * b03 - a[9] * b01 + a[10] * b00) * d;
    return o; },
  trs(x, y, z, ry, sx, sy, sz) { const c = Math.cos(ry), s = Math.sin(ry), m = new Float32Array(16); m[0] = c * sx; m[2] = -s * sx; m[5] = sy; m[8] = s * sz; m[10] = c * sz; m[12] = x; m[13] = y; m[14] = z; m[15] = 1; return m; },
  rotX(a) { const m = M4.id(), c = Math.cos(a), s = Math.sin(a); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; },
  rotZ(a) { const m = M4.id(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; },
  tp(m, x, y, z) { return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]]; },
  tv(m, x, y, z) { return [m[0] * x + m[4] * y + m[8] * z, m[1] * x + m[5] * y + m[9] * z, m[2] * x + m[6] * y + m[10] * z]; }
};
function hex(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
function mulberry(s) { return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

class Builder {
  constructor() { this.p = []; this.n = []; this.u = []; this.c = []; this.e = []; this.i = []; this.m = null; }
  get count() { return this.p.length / 3; }
  v(x, y, z, nx, ny, nz, u, vv, col, em, wind) {
    if (this.m) { const P = M4.tp(this.m, x, y, z), N = M4.tv(this.m, nx, ny, nz); x = P[0]; y = P[1]; z = P[2]; const l = Math.hypot(N[0], N[1], N[2]) || 1; nx = N[0] / l; ny = N[1] / l; nz = N[2] / l; }
    this.p.push(x, y, z); this.n.push(nx, ny, nz); this.u.push(u, vv); this.c.push(col[0], col[1], col[2]); this.e.push(em || 0, wind || 0); return this.count - 1;
  }
  with(m, fn) { const old = this.m; this.m = old ? M4.mul(new Float32Array(16), old, m) : m; fn(); this.m = old; }
  quad(a, b, c, d, col, uv, o) {
    o = o || {}; uv = uv || [0, 0, 1, 1];
    const ux = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], vx = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
    let nx = ux[1] * vx[2] - ux[2] * vx[1], ny = ux[2] * vx[0] - ux[0] * vx[2], nz = ux[0] * vx[1] - ux[1] * vx[0]; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const [u0, v0, u1, v1] = uv;
    const i0 = this.v(a[0], a[1], a[2], nx, ny, nz, u0, v1, col, o.em, o.wind), i1 = this.v(b[0], b[1], b[2], nx, ny, nz, u1, v1, col, o.em, o.wind),
      i2 = this.v(c[0], c[1], c[2], nx, ny, nz, u1, v0, col, o.em, o.wind), i3 = this.v(d[0], d[1], d[2], nx, ny, nz, u0, v0, col, o.em, o.wind);
    this.i.push(i0, i1, i2, i0, i2, i3);
  }
  tri(a, b, c, col, o) { o = o || {}; const ux = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], vx = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let nx = ux[1] * vx[2] - ux[2] * vx[1], ny = ux[2] * vx[0] - ux[0] * vx[2], nz = ux[0] * vx[1] - ux[1] * vx[0]; const l = Math.hypot(nx, ny, nz) || 1;
    const i0 = this.v(...a, nx / l, ny / l, nz / l, 0, 1, col, o.em), i1 = this.v(...b, nx / l, ny / l, nz / l, 1, 1, col, o.em), i2 = this.v(...c, nx / l, ny / l, nz / l, .5, 0, col, o.em); this.i.push(i0, i1, i2); }
  box(x0, y0, z0, x1, y1, z1, col, o) {
    o = o || {}; const F = o.faces || {}; const uv = k => (F[k] === undefined ? (o.uv || [0, 0, 1, 1]) : F[k]);
    const s = o.ws || 1, W = (a, b) => o.world ? [0, 0, a / s, b / s] : null;
    if (F.f !== false) this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], col, W(x1 - x0, y1 - y0) || uv("f"), o);
    if (F.b !== false) this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], col, W(x1 - x0, y1 - y0) || uv("b"), o);
    if (F.l !== false) this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], col, W(z1 - z0, y1 - y0) || uv("l"), o);
    if (F.r !== false) this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], col, W(z1 - z0, y1 - y0) || uv("r"), o);
    if (F.t !== false) this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], col, W(x1 - x0, z1 - z0) || uv("t"), o);
    if (F.d !== false) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], col, W(x1 - x0, z1 - z0) || uv("d"), o);
  }
  cyl(x, y, z, r, h, seg, col, o) {
    o = o || {}; const base = this.count, r2 = o.r2 === undefined ? r : o.r2;
    for (let k = 0; k <= seg; k++) { const a = k / seg * Math.PI * 2, cx = Math.cos(a), sz = Math.sin(a), sl = (r - r2) / h, nl = Math.hypot(1, sl);
      this.v(x + cx * r, y, z + sz * r, cx / nl, sl / nl, sz / nl, k / seg, 1, col, o.em, o.wind);
      this.v(x + cx * r2, y + h, z + sz * r2, cx / nl, sl / nl, sz / nl, k / seg, 0, col, o.em, o.wind); }
    for (let k = 0; k < seg; k++) { const a = base + k * 2; this.i.push(a, a + 3, a + 1, a, a + 2, a + 3); }
    if (o.cap !== false && r2 > 0) { const c = this.v(x, y + h, z, 0, 1, 0, .5, .5, col, o.em, o.wind), s0 = this.count;
      for (let k = 0; k <= seg; k++) { const a = k / seg * Math.PI * 2; this.v(x + Math.cos(a) * r2, y + h, z + Math.sin(a) * r2, 0, 1, 0, .5, .5, col, o.em, o.wind); }
      for (let k = 0; k < seg; k++) this.i.push(c, s0 + k + 1, s0 + k); }
  }
  rod(a, b, r, col, seg, o) { const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]); if (L < 1e-5) return; this.with(rodMatrix(a, b, r * 2), () => this.cyl(0, 0, 0, .5, 1, seg || 6, col, Object.assign({ cap: false }, o))); }
  sphere(x, y, z, rx, ry, rz, col, seg, o) {
    o = o || {}; seg = seg || 8; const base = this.count, rings = Math.max(3, seg >> 1);
    for (let i = 0; i <= rings; i++) { const th = i / rings * Math.PI, st = Math.sin(th), ct = Math.cos(th);
      for (let k = 0; k <= seg; k++) { const ph = k / seg * Math.PI * 2, nx = st * Math.cos(ph), ny = ct, nz = st * Math.sin(ph); this.v(x + nx * rx, y + ny * ry, z + nz * rz, nx / rx, ny / ry, nz / rz, k / seg, i / rings, col, o.em, o.wind); } }
    for (let i = 0; i < rings; i++) for (let k = 0; k < seg; k++) { const a = base + i * (seg + 1) + k, b = a + seg + 1; this.i.push(a, a + 1, b, a + 1, b + 1, b); }
  }
}
function rodMatrix(a, b, w) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(d[0], d[1], d[2]) || 1e-6, Y = [d[0] / L, d[1] / L, d[2] / L];
  let X = Math.abs(Y[1]) < .95 ? [Y[2], 0, -Y[0]] : [1, 0, 0]; const l = Math.hypot(X[0], X[1], X[2]); X = [X[0] / l, X[1] / l, X[2] / l];
  const Z = [X[1] * Y[2] - X[2] * Y[1], X[2] * Y[0] - X[0] * Y[2], X[0] * Y[1] - X[1] * Y[0]], m = new Float32Array(16);
  m[0] = X[0] * w; m[1] = X[1] * w; m[2] = X[2] * w; m[4] = d[0]; m[5] = d[1]; m[6] = d[2]; m[8] = Z[0] * w; m[9] = Z[1] * w; m[10] = Z[2] * w; m[12] = a[0]; m[13] = a[1]; m[14] = a[2]; m[15] = 1; return m;
}
