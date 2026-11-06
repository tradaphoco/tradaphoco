/* Trà Đá Phố Cổ — người, xe máy, xích lô, xe đạp hoa, tàu điện, tàu hoả, gánh hàng (vẽ bằng instancing) */
"use strict";
function mm(a, b) { return M4.mul(new Float32Array(16), a, b); }
function T(x, y, z) { const m = M4.id(); m[12] = x; m[13] = y; m[14] = z; return m; }
function S(x, y, z) { const m = M4.id(); m[0] = x; m[5] = y; m[10] = z; return m; }
class Parts {
  constructor() { this.a = []; }
  box(cx, cy, cz, sx, sy, sz, c, e, rx) { let m = T(cx, cy, cz); if (rx) m = mm(m, M4.rotX(rx)); this.a.push(["box", mm(m, S(sx, sy, sz)), c, e || 0]); }
  sph(cx, cy, cz, rx, ry, rz, c, e) { this.a.push(["sph", mm(T(cx, cy, cz), S(rx * 2, ry * 2, rz * 2)), c, e || 0]); }
  rod(p, q, r, c, e) { this.a.push(["cyl", rodMatrix(p, q, r * 2), c, e || 0]); }
  coneSeg(a, b, w, c) { this.a.push(["cone", rodMatrix(a, b, w), c, 0]); }
  cone(cx, cy, cz, r, h, c) { this.a.push(["cone", mm(T(cx, cy, cz), S(r * 2, h, r * 2)), c, 0]); }
  wheel(cx, cy, cz, r, w, c, hub) { this.a.push(["cyl", mm(mm(T(cx, cy, cz), M4.rotZ(Math.PI / 2)), mm(S(r * 2, w, r * 2), T(0, -.5, 0))), c, 0]);
    if (hub) this.a.push(["cyl", mm(mm(T(cx, cy, cz), M4.rotZ(Math.PI / 2)), mm(S(r * .8, w * 1.15, r * .8), T(0, -.5, 0))), hub, 0]); }
  emit(R, W) { for (const [p, m, c, e] of this.a) R.inst(p, W ? mm(W, m) : m, c, e); }
  bake(B, W) { for (const [p, m, c, e] of this.a) B.with(W ? mm(W, m) : m, () => {
    if (p === "box") B.box(-.5, -.5, -.5, .5, .5, .5, c, { em: e }); else if (p === "sph") B.sphere(0, 0, 0, .5, .5, .5, c, 8, { em: e });
    else if (p === "cyl") B.cyl(0, 0, 0, .5, 1, 10, c, { em: e }); else B.cyl(0, 0, 0, .5, 1, 12, c, { r2: 0 }); }); }
}
function primitives(R) {
  const b = new Builder(); b.box(-.5, -.5, -.5, .5, .5, .5, [1, 1, 1]); R.addPrim("box", b);
  const s = new Builder(); s.sphere(0, 0, 0, .5, .5, .5, [1, 1, 1], 12); R.addPrim("sph", s);
  const c = new Builder(); c.cyl(0, 0, 0, .5, 1, 12, [1, 1, 1]); c.cyl(0, 0, 0, .5, 0, 12, [1, 1, 1]); R.addPrim("cyl", c);
  const k = new Builder(); k.cyl(0, 0, 0, .5, 1, 16, [1, 1, 1], { r2: 0 }); R.addPrim("cone", k);
}
const DARK = hex("#1e1a18");
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
function personParts(P, p) {
  const L = p.look, pose = p.pose, ph = p.phase || 0; let hipY, hipZ = 0, lean = 0, knee = [], foot = [];
  if (pose === "sit") { hipY = .36; hipZ = -.02; lean = .08; knee = [[-.11, .52, .38], [.11, .52, .38]]; foot = [[-.13, .05, .44], [.13, .05, .44]]; }
  else if (pose === "ride") { hipY = .78; hipZ = -.12; lean = .1; knee = [[-.19, .66, .24], [.19, .66, .24]]; foot = [[-.18, .36, .26], [.18, .36, .26]]; }
  else if (pose === "pedal") { hipY = 1.0; lean = .18; for (const sd of [-1, 1]) { const a = ph + (sd > 0 ? Math.PI : 0), fy = .42 + Math.sin(a) * .16, fz = .28 + Math.cos(a) * .16; foot.push([sd * .12, fy, fz]); knee.push([sd * .13, (hipY + fy) / 2 + .14, (hipZ + fz) / 2 + .2]); } }
  else { hipY = .9; const sw = pose === "walk" ? .42 : 0;
    for (const sd of [-1, 1]) { const a = Math.sin(ph + (sd > 0 ? Math.PI : 0)) * sw, bend = pose === "walk" ? Math.max(0, Math.sin(ph + (sd > 0 ? Math.PI : 0) + 1.6)) * .55 : .05;
      const k = [sd * .1, hipY - Math.cos(a) * .44, Math.sin(a) * .44]; knee.push(k); foot.push([sd * .1, k[1] - Math.cos(a - bend) * .44, k[2] + Math.sin(a - bend) * .44]); } }
  hipY += pose === "walk" ? Math.abs(Math.cos(ph)) * .03 : 0;
  const hips = [[-.1, hipY, hipZ], [.1, hipY, hipZ]];
  for (let i = 0; i < 2; i++) { P.rod(hips[i], knee[i], .075, L.pants); P.rod(knee[i], foot[i], .058, L.pants); P.box(foot[i][0], foot[i][1] - .01, foot[i][2] + .06, .1, .07, .24, DARK); }
  const shY = hipY + .55, shZ = hipZ + lean, tilt = Math.atan2(lean, .55);
  P.box(0, hipY + .1, hipZ + lean * .15, .34, .22, .2, L.coat ? L.shirt : L.pants, 0, tilt); P.box(0, hipY + .3, hipZ + lean * .5, L.coat ? .38 : .34, .3, L.coat ? .24 : .2, L.shirt, 0, tilt);
  P.box(0, shY - .1, shZ - .01, .4, .22, .22, L.shirt, 0, tilt); P.sph(-.19, shY - .06, shZ, .07, .07, .08, L.shirt); P.sph(.19, shY - .06, shZ, .07, .07, .08, L.shirt);
  if (L.board) { P.box(-.15, shY + .005, shZ, .1, .02, .14, L.board); P.box(.15, shY + .005, shZ, .1, .02, .14, L.board); }
  if (L.badge) { P.box(-.09, shY - .2, shZ + .115, .05, .06, .012, L.badge); P.box(.09, shY - .19, shZ + .115, .07, .02, .012, hex("#b3261e")); }
  if (L.belt) P.box(0, hipY + .2, hipZ + lean * .3, .36, .05, .22, L.belt);
  const nod = p.nod || 0, look = p.lookUp || 0, neck = [0, shY + .02, shZ + .01], HM = mm(T(neck[0], neck[1], neck[2]), M4.rotX(nod * .45 - look * .25)), hp = (x, y, z) => M4.tp(HM, x, y, z);
  P.rod(neck, [0, shY + .1, shZ + .015], .045, L.skin);
  if (L.scarf) { P.sph(0, shY + .04, shZ + .01, .1, .05, .1, L.scarf); P.box(.06, shY - .12, shZ + .12, .07, .22, .02, L.scarf); }
  const hc = hp(0, .17, .02); P.sph(hc[0], hc[1], hc[2], .1, .12, .11, L.skin);
  const hr = hp(0, .21, -.005); P.sph(hr[0], hr[1], hr[2], .108, .095, .118, L.hair);
  const no = hp(0, .16, .125); P.box(no[0], no[1], no[2], .03, .045, .03, L.skin);
  for (const sd of [-1, 1]) { const ey = hp(sd * .038, .19, .105); P.box(ey[0], ey[1], ey[2], .025, .016, .01, DARK); }
  if (L.beard) { const b = hp(0, .085, .1); P.sph(b[0], b[1], b[2], .05, .06, .03, L.hair); }
  if (L.hat === "non") { const c = hp(0, .23, .01); P.cone(c[0], c[1], c[2], .26, .22, hex("#e2cf96")); }
  else if (L.hat === "coi") { const c = hp(0, .22, .01); P.sph(c[0], c[1], c[2], .13, .11, .14, hex("#5b6b3a")); P.sph(c[0], c[1] - .03, c[2], .19, .02, .2, hex("#5b6b3a")); const st = hp(0, .32, .02); P.sph(st[0], st[1], st[2], .02, .02, .02, hex("#c8382f")); }
  else if (L.hat === "cap") { const c = hp(0, .24, 0); P.sph(c[0], c[1], c[2], .115, .07, .125, hex("#c0392b")); const v = hp(0, .225, .12); P.box(v[0], v[1], v[2], .17, .015, .1, hex("#c0392b")); }
  else if (L.hat === "len") { const c = hp(0, .25, 0); P.sph(c[0], c[1], c[2], .118, .085, .128, L.hatC || hex("#8a2a3a")); }
  else if (L.hat === "kepi") { const cr = hp(0, .3, 0); P.sph(cr[0], cr[1], cr[2], .135, .055, .145, L.hatC); P.rod(hp(0, .215, 0), hp(0, .275, 0), .112, L.hatC); P.rod(hp(0, .238, 0), hp(0, .258, 0), .115, hex("#b3261e"));
    const v = hp(0, .222, .12); P.box(v[0], v[1], v[2], .19, .014, .1, hex("#1c241a")); const b = hp(0, .262, .118); P.sph(b[0], b[1], b[2], .022, .026, .01, hex("#e6c34a")); }
  else if (L.hat === "dpcap") { const c = hp(0, .24, 0); P.sph(c[0], c[1], c[2], .118, .075, .128, L.hatC); const v = hp(0, .222, .12); P.box(v[0], v[1], v[2], .17, .014, .1, L.hatC); }
  else if (L.hat === "helmet") { const c = hp(0, .2, 0); P.sph(c[0], c[1], c[2], .14, .135, .15, L.helmet || hex("#f2c230")); }
  const act = p.act, k = act ? Math.sin(Math.min(1, act.k) * Math.PI) : 0, mouth = hp(0, .1, .16), t = p.t || 0;
  for (const sd of [-1, 1]) {
    const s0 = [sd * .2, shY - .05, shZ]; let el, hand;
    if (pose === "sit") { el = [sd * .22, shY - .3, shZ + .1]; hand = [sd * .14, .58, .32]; }
    else if (pose === "ride") { el = [sd * .26, shY - .22, shZ + .25]; hand = [sd * .3, 1.0, .46]; }
    else if (pose === "pedal") { el = [sd * .24, shY - .2, shZ + .25]; hand = [sd * .26, 1.18, .45]; }
    else { const sw = pose === "walk" ? Math.sin(ph + (sd > 0 ? 0 : Math.PI)) * .3 : 0; el = [sd * .24, shY - .28, shZ + sw * .5]; hand = [sd * .25, shY - .55, shZ + sw + .06]; }
    if (p.hold === "loa" && sd > 0) { hand = [.07, shY + .1, shZ + .3]; el = [.2, shY - .12, shZ + .2]; }
    if (p.hold === "chess" && sd > 0) { hand = [.06, .45, .5]; el = [.2, shY - .25, shZ + .25]; }
    if (p.carry && sd > 0) { el = [sd * .22, shY - .05, shZ + .1]; hand = [sd * .12, shY + .1, shZ + .05]; }
    const handA = sd > 0 ? (act && act.type === "sip" ? k : 0) : (act && act.type === "seed" ? k : 0);
    if (p.hold === "ice" && sd > 0) { const kk = .6 + .4 * Math.sin(t * .9 + (p.seed || 0) * 6); hand = lerp3(hand, mouth, kk * .8); el = lerp3(el, [sd * .2, shY - .2, shZ + .2], kk); }
    if (p.hold === "pour" && sd > 0) { const kk = act ? k : 0; hand = lerp3([sd * .2, .7, .25], [sd * .05, .95, .55], kk); el = [sd * .24, shY - .2, shZ + .2]; }
    if (p.hold === "fan" && sd > 0) { const f = Math.sin(t * 7) * .12; hand = [.08 + f, .78, .5]; el = [.22, shY - .25, shZ + .25]; }
    if (act && sd > 0 && (act.type === "wave" || act.type === "cheers" || act.type === "offer")) { const kk = Math.min(1, Math.sin(Math.min(1, act.k) * Math.PI) * 1.6);
      const tgt = act.type === "wave" ? [sd * .32 + Math.sin(act.k * 18) * .1, shY + .5, shZ + .1] : act.type === "cheers" ? [sd * .12, shY + .38, shZ + .3] : [sd * .1, shY - .12, shZ + .55];
      hand = lerp3(hand, tgt, kk); el = lerp3(el, [sd * .3, shY - .05, shZ + .2], kk); }
    if (handA > 0) { hand = lerp3(hand, mouth, handA); el = lerp3(el, [sd * .2, shY - .22, shZ + .18], handA); }
    P.rod(s0, el, L.coat ? .062 : .052, L.shirt); P.rod(el, hand, .042, L.sleeve === "long" || L.coat ? L.shirt : L.skin);
    if (L.band && sd < 0) { const m = lerp3(s0, el, .5); P.sph(m[0], m[1], m[2], .062, .045, .062, L.band); }
    P.sph(hand[0], hand[1], hand[2], .045, .05, .045, L.skin);
    const hold = sd > 0 ? p.hold : null;
    if (hold === "cup" || (sd > 0 && act && (act.type === "cheers" || act.type === "offer") && pose === "sit")) { const lv = p.cup === undefined ? 1 : p.cup;
      P.rod([hand[0], hand[1] - .02, hand[2] + .02], [hand[0], hand[1] + .1, hand[2] + .02], .035, [.86, .9, .9]); if (lv > 0) P.rod([hand[0], hand[1] - .01, hand[2] + .02], [hand[0], hand[1] - .01 + .1 * lv, hand[2] + .02], .037, hex("#c8862a")); }
    if (hold === "coffee") P.rod([hand[0], hand[1] - .01, hand[2] + .03], [hand[0], hand[1] + .06, hand[2] + .03], .03, hex("#f4efe6"));
    if (hold === "ice") { P.cone(hand[0], hand[1] + .08, hand[2] + .02, .03, -.1, hex("#c9954a")); P.sph(hand[0], hand[1] + .1, hand[2] + .02, .04, .04, .04, (p.seed || 0) > .5 ? hex("#9fd18a") : hex("#f6efe0")); }
    if (hold === "pour") P.box(hand[0], hand[1], hand[2] + .08, .16, .14, .18, hex("#6b4a30"));
    if (hold === "fan") P.box(hand[0], hand[1] + .08, hand[2], .2, .2, .015, hex("#d9b46a"));
    if (hold === "loa") { const y = shY + .2; P.coneSeg([0, y, shZ + .62], [0, y, shZ + .24], .27, hex("#ecebe4")); P.rod([0, y, shZ + .62], [0, y, shZ + .64], .135, hex("#b3261e")); }
  }
  if (p.carry) { const sway = Math.sin(ph * 2) * .03;
    P.rod([-.75, shY + .06 + sway, shZ], [.95, shY + .06 - sway, shZ], .02, hex("#9a7a46"));
    for (const [bx, s2] of [[-.62, sway], [.82, -sway]]) { for (let k2 = 0; k2 < 3; k2++) P.rod([bx, shY + .05 + s2, shZ], [bx + (k2 - 1) * .18, .55, shZ + (k2 % 2 ? .15 : -.15)], .006, hex("#5a4630"));
      P.rod([bx, .3, shZ], [bx, .55, shZ], .22, hex("#a07a46"));
      const gc = p.carry === "hoa" ? ["#e63946", "#ffb703", "#ffffff", "#f28482", "#c77dff"] : p.carry === "qua" ? ["#f08a24", "#e9c13a", "#4f8a3a"] : p.carry === "banhmi" ? ["#d9a45a", "#c98b3c", "#e8c07a"] : p.carry === "ngo" ? ["#e2b53a", "#7a3a2a", "#f0cf5a"] : ["#f2f2ee", "#e8e0c8"];
      for (let i = 0; i < 7; i++) { const a2 = i * 2.4; P.sph(bx + Math.cos(a2) * .12, .6 + (i % 3) * .05, shZ + Math.sin(a2) * .12, .07, .06, .07, hex(gc[i % gc.length])); } } }
}
function motoParts(P, v, night) { const c = v.color, blk = hex("#1b1b1b"), chrome = hex("#c9cdd0"), wr = .27;
  P.wheel(0, wr, .64, wr, .1, blk, chrome); P.wheel(0, wr, -.6, wr, .1, blk, chrome);
  P.box(0, .42, 0, .14, .12, 1.0, hex("#333")); P.box(0, .58, -.25, .32, .3, .78, c); P.box(0, .74, -.2, .3, .08, .72, hex("#202020"));
  P.box(0, .74, .38, .34, .55, .14, c, 0, -.25); P.box(0, .48, .5, .26, .28, .22, c);
  P.rod([0, .62, .6], [0, 1.0, .44], .03, hex("#444")); P.rod([-.34, 1.02, .44], [.34, 1.02, .44], .018, hex("#333"));
  P.box(0, .98, .52, .16, .12, .1, c); P.sph(0, .98, .58, .05, .05, .02, hex("#fff6c8"), night ? 2.5 : .3); P.box(0, .62, -.66, .14, .05, .03, hex("#d1201b"), night ? 1.5 : .2);
  P.box(0, .62, -.7, .3, .03, .3, hex("#333"));
  if (v.cargo === "boxes") { P.box(0, .82, -.78, .5, .32, .42, hex("#b98a52")); P.box(.02, 1.12, -.78, .44, .28, .38, hex("#c99a62")); }
  if (v.cargo === "flowers") { P.box(0, .74, -.8, .7, .18, .45, hex("#6b4a30")); const r = mulberry(v.seed * 1000 | 0); for (let i = 0; i < 16; i++) P.sph((r() - .5) * .62, .9 + r() * .2, -.8 + (r() - .5) * .4, .06, .06, .06, hex(["#e63946", "#ffb703", "#ffffff", "#f28482", "#c77dff"][i % 5])); }
  if (v.cargo === "dao") { P.rod([0, .7, -.8], [0, 2.1, -.9], .03, hex("#4a3328")); const r = mulberry(v.seed * 1000 | 0); for (let i = 0; i < 18; i++) P.sph((r() - .5) * .9, 1.4 + r() * .8, -.85 + (r() - .5) * .4, .09, .08, .09, hex(r() < .7 ? "#f2a0b8" : "#e86e94")); }
  if (v.cargo === "gas") P.rod([0, .64, -.78], [0, 1.15, -.78], .17, hex("#3f6e8a")); }
function cycloParts(P, v, night) { const red = hex("#7a2a22"), blk = hex("#1b1b1b"), metal = hex("#3a3a3a");
  P.wheel(-.45, .3, .55, .3, .06, blk, metal); P.wheel(.45, .3, .55, .3, .06, blk, metal); P.wheel(0, .33, -.95, .33, .06, blk, metal);
  P.rod([-.45, .3, .55], [.45, .3, .55], .02, metal); P.rod([0, .3, .55], [0, .5, -.35], .03, metal); P.rod([0, .5, -.35], [0, .33, -.95], .03, metal); P.rod([0, .5, -.35], [0, 1.0, -.7], .03, metal);
  P.box(0, .62, .5, .82, .1, .55, red); P.box(0, .92, .26, .82, .55, .08, red, 0, -.15); P.box(-.42, .78, .5, .04, .32, .55, red); P.box(.42, .78, .5, .04, .32, .55, red);
  P.box(0, 1.35, .32, .86, .04, .5, v.hood, 0, -.35); P.box(0, 1.12, .12, .86, .4, .04, v.hood, 0, .2); P.box(0, .99, -.7, .2, .06, .26, hex("#222"));
  if (night) P.sph(-.46, .7, .82, .03, .03, .03, hex("#fff3c4"), 2); }
function bikeParts(P, v) { const fr = hex("#2b5a8a"), blk = hex("#1b1b1b");
  P.wheel(0, .33, .55, .33, .04, blk, hex("#888")); P.wheel(0, .33, -.5, .33, .04, blk, hex("#888"));
  P.rod([0, .33, -.5], [0, .5, .05], .02, fr); P.rod([0, .5, .05], [0, .92, -.2], .02, fr); P.rod([0, .9, .4], [0, .5, .05], .02, fr); P.rod([0, .9, -.2], [0, .9, .4], .02, fr); P.rod([0, .33, .55], [0, 1.08, .42], .02, fr);
  P.rod([-.25, 1.1, .42], [.25, 1.1, .42], .015, fr); P.box(0, .98, -.24, .14, .05, .22, hex("#222")); P.box(0, .78, -.62, .9, .06, .45, hex("#8a6a3a")); const r = mulberry(v.seed * 999 | 0);
  for (let i = 0; i < 34; i++) { const a = r() * 6.28, rr = r() * .42; P.sph(Math.cos(a) * rr, .9 + r() * .45, -.62 + Math.sin(a) * rr * .5, .07, .07, .07, hex(["#e63946", "#ffb703", "#ffffff", "#f28482", "#c77dff", "#4f8a3a"][i % 6])); } }
function tramParts(P, v, night) { const red = hex("#8e2b22"), cream = hex("#efe0b0"), blk = hex("#2b2522"), win = night ? hex("#f2d48a") : hex("#4a5658");
  P.box(0, .85, 0, 2.2, 1.0, 9.6, red); P.box(0, 1.95, 0, 2.2, 1.2, 9.6, cream); P.box(0, 2.62, 0, 2.3, .14, 9.8, blk); P.box(0, 2.85, 0, 1.6, .3, 8.6, red);
  for (let k = 0; k < 8; k++) for (const sd of [-1, 1]) P.box(sd * 1.105, 2.0, -3.9 + k * 1.1, .02, .75, .8, win, night ? 1.4 : 0);
  for (const sd of [-1, 1]) { P.box(0, 2.0, sd * 4.81, 1.6, .8, .02, win, night ? 1.2 : 0); P.box(0, .35, sd * 3.6, 1.8, .4, 1.6, blk); P.sph(.7 * sd, 1.0, 4.82, .08, .08, .02, hex("#fff6c8"), night ? 3 : .3); }
  P.rod([0, 3.0, -2], [0, 6.9, -4.5], .03, blk); for (const z of [-3.6, -3, 3, 3.6]) for (const sd of [-1, 1]) P.wheel(sd * .85, .35, z, .35, .1, blk, hex("#555")); }
function trainCarParts(P, i, night) { const blue = hex("#1f4f8f"), cream = hex("#e9e2cf"), red = hex("#b3261e"), blk = hex("#222"), win = night ? hex("#f2d48a") : hex("#3e4a50"), L = i === 0 ? 14 : 15;
  if (i === 0) { P.box(0, 1.7, 0, 2.9, 2.6, L, blue); P.box(0, 2.6, L / 2 - 1.6, 2.92, .9, 2.4, cream); P.box(0, 1.2, 0, 2.94, .25, L, red); P.box(0, 3.15, 0, 2.6, .3, L - 1, hex("#3a3a3a"));
    P.box(0, 2.6, L / 2 + .01, 2.2, .7, .02, win, night ? 1 : 0); for (const sd of [-1, 1]) P.sph(sd * .9, 1.1, L / 2 + .02, .12, .12, .03, hex("#fff6c8"), night ? 3 : .6); }
  else { P.box(0, 1.75, 0, 2.9, 2.7, L - .6, cream); P.box(0, 1.0, 0, 2.92, .6, L - .6, blue); P.box(0, 3.15, 0, 2.7, .25, L - .6, hex("#6b6b6b"));
    for (let k = 0; k < 9; k++) for (const sd of [-1, 1]) P.box(sd * 1.455, 2.2, -L / 2 + 1.6 + k * 1.45, .02, .7, 1.0, win, night ? 1.2 : 0); }
  for (const z of [-L / 2 + 2, L / 2 - 2]) { P.box(0, .55, z, 2.3, .5, 2.2, blk); for (const sd of [-1, 1]) for (const dz of [-.6, .6]) P.wheel(sd * .72, .45, z + dz, .42, .12, blk, hex("#555")); } return L; }
function vehicleRiders(v) { const out = [];
  if (v.type === "moto") { out.push({ dx: 0, dy: 0, dz: 0, pose: "ride", look: v.rider }); if (v.pass) out.push({ dx: 0, dy: .06, dz: -.48, pose: "ride", look: v.pass }); }
  if (v.type === "cyclo") { out.push({ dx: 0, dy: .25, dz: .2, pose: "sit", look: v.pass }); out.push({ dx: 0, dy: 0, dz: -.95, pose: "pedal", look: v.rider }); }
  if (v.type === "bike") out.push({ dx: 0, dy: -.05, dz: -.22, pose: "pedal", look: v.rider }); return out; }
function stoolParts(P, col) { const h = .3, dk = col.map(v => v * .85); P.box(0, h - .0175, 0, .34, .035, .34, col);
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) P.rod([sx * .15, h - .03, sz * .15], [sx * .19, 0, sz * .19], .012, col); P.box(0, .11, 0, .34, .02, .34, dk); }
