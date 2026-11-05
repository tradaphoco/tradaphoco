/* Trà Đá Phố Cổ — bộ dựng hình WebGL2 tự viết (không cần thư viện ngoài)
   Toán ma trận, bộ dựng hình tĩnh, instancing, bóng đổ, bầu trời, sương, đèn đêm, mặt nước, mưa. */
"use strict";
const M4 = {
  id() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
  mul(o, a, b) { const r = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let i = 0; i < 4; i++) r[c * 4 + i] = a[i] * b[c * 4] + a[4 + i] * b[c * 4 + 1] + a[8 + i] * b[c * 4 + 2] + a[12 + i] * b[c * 4 + 3];
    o.set(r); return o; },
  persp(fovy, asp, n, f) { const t = 1 / Math.tan(fovy / 2), m = new Float32Array(16); m[0] = t / asp; m[5] = t; m[10] = (f + n) / (n - f); m[11] = -1; m[14] = 2 * f * n / (n - f); return m; },
  ortho(l, r, b, t, n, f) { const m = M4.id(); m[0] = 2 / (r - l); m[5] = 2 / (t - b); m[10] = -2 / (f - n); m[12] = -(r + l) / (r - l); m[13] = -(t + b) / (t - b); m[14] = -(f + n) / (f - n); return m; },
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

const VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNrm; layout(location=2) in vec2 aUV; layout(location=3) in vec3 aCol; layout(location=4) in vec2 aExt;
layout(location=5) in vec4 iM0; layout(location=6) in vec4 iM1; layout(location=7) in vec4 iM2; layout(location=8) in vec4 iM3; layout(location=9) in vec4 iC;
uniform mat4 uVP, uSVP; uniform float uTime, uWind;
out vec3 vW, vN, vCol; out vec2 vUV; out float vEm; out vec4 vSh;
void main(){ mat4 M=mat4(iM0,iM1,iM2,iM3); vec4 w=M*vec4(aPos,1.0);
  if(aExt.y>0.0){ float s=uWind*aExt.y; w.x+=sin(uTime*1.4+w.x*.35+w.z*.2)*.09*s; w.z+=cos(uTime*1.1+w.x*.25)*.06*s; w.y+=sin(uTime*2.+w.x)*.02*s; }
  vW=w.xyz; vN=normalize(transpose(inverse(mat3(M)))*aNrm); vUV=aUV; vCol=aCol*iC.rgb; vEm=aExt.x+iC.a; vSh=uSVP*w; gl_Position=uVP*w; }`;
const FS = `#version 300 es
precision highp float; precision highp sampler2DShadow;
in vec3 vW, vN, vCol; in vec2 vUV; in float vEm; in vec4 vSh;
uniform sampler2D uTex, uEmT; uniform sampler2DShadow uShadow;
uniform vec3 uSun, uSunC, uSky, uGnd, uFog, uCam; uniform float uFogD, uNight, uSpec, uWet, uWater, uTime, uExpo, uShOn;
uniform vec4 uLP[16]; uniform vec3 uLC[16]; uniform int uNL;
out vec4 o;
vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }
float shadowAt(vec4 p, float ndl){ vec3 s=p.xyz/p.w*.5+.5; if(s.x<0.||s.x>1.||s.y<0.||s.y>1.||s.z>1.) return 1.;
  float b=.0012+.002*(1.-ndl), r=0.; vec2 t=vec2(1.0/2048.0);
  r+=texture(uShadow,vec3(s.xy,s.z-b)); r+=texture(uShadow,vec3(s.xy+vec2(t.x,0),s.z-b)); r+=texture(uShadow,vec3(s.xy-vec2(t.x,0),s.z-b));
  r+=texture(uShadow,vec3(s.xy+vec2(0,t.y),s.z-b)); r+=texture(uShadow,vec3(s.xy-vec2(0,t.y),s.z-b)); return r/5.; }
void main(){
  vec4 tx=texture(uTex,vUV); if(tx.a<.5) discard;
  vec3 alb=pow(tx.rgb*vCol,vec3(2.2));
  vec3 N=normalize(vN); if(!gl_FrontFacing) N=-N;
  vec3 V=normalize(uCam-vW); float dist=length(uCam-vW), wet=uWet;
  if(uWater>.5){ vec2 p=vW.xz; float t=uTime;
    N=normalize(vec3(sin(p.x*1.3+t*1.1)*.09+sin(p.y*2.1-t*1.6)*.06+sin((p.x+p.y)*4.-t*2.3)*.04+sin(p.x*9.-t*3.)*.02,1.,cos(p.y*1.2+t*.9)*.09+cos(p.x*2.7+t*1.4)*.05+cos((p.x-p.y)*7.+t*2.)*.03)); }
  alb*=1.-wet*.35;
  float ndl=max(dot(N,uSun),0.), sh=uShOn>.5?shadowAt(vSh,ndl):1.;
  vec3 hemi=mix(uGnd,uSky,N.y*.5+.5);
  float ao=(N.y<.5&&uWater<.5)?mix(.66,1.,smoothstep(0.,1.1,vW.y)):1.;
  vec3 col=alb*(hemi*ao+uSunC*ndl*sh);
  float sp=uSpec+wet*.6, gl=mix(24.,90.,wet); vec3 H=normalize(uSun+V); col+=uSunC*pow(max(dot(N,H),0.),gl)*sp*sh;
  for(int i=0;i<16;i++){ if(i>=uNL) break; vec3 d=uLP[i].xyz-vW; float r=uLP[i].w, L=length(d); vec3 l=d/L;
    float att=clamp(1.-L/r,0.,1.); att*=att; col+=uLC[i]*att*(alb*max(dot(N,l),0.)+pow(max(dot(N,normalize(l+V)),0.),gl)*sp*1.5); }
  if(uWater>.5){ float fr=.04+.96*pow(1.-max(dot(N,V),0.),5.); vec3 R=reflect(-V,N);
    vec3 sky=mix(uFog,uSky*1.7,clamp(R.y*3.,0.,1.))*vec3(.72,.95,.82); col=mix(col,sky,fr*.4+.05); col+=uSunC*pow(max(dot(R,uSun),0.),220.)*1.5; }
  vec3 em=texture(uEmT,vUV).rgb; col+=pow(em,vec3(2.2))*uNight*2.4;
  col+=pow(vCol,vec3(2.2))*vEm*mix(.6,3.,uNight);
  float f=1.-exp(-dist*uFogD*(uWater>.5?.55:1.)); col=mix(col,uFog,clamp(f,0.,1.));
  col=aces(col*uExpo); o=vec4(pow(col,vec3(1./2.2)),1.); }`;
const VS_D = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos; layout(location=4) in vec2 aExt; layout(location=5) in vec4 iM0; layout(location=6) in vec4 iM1; layout(location=7) in vec4 iM2; layout(location=8) in vec4 iM3;
uniform mat4 uVP; uniform float uTime, uWind;
void main(){ mat4 M=mat4(iM0,iM1,iM2,iM3); vec4 w=M*vec4(aPos,1.); if(aExt.y>0.){ float s=uWind*aExt.y; w.x+=sin(uTime*1.4+w.x*.35+w.z*.2)*.09*s; w.z+=cos(uTime*1.1+w.x*.25)*.06*s; } gl_Position=uVP*w; }`;
const FS_D = `#version 300 es
precision mediump float; out vec4 o; void main(){ o=vec4(1); }`;
const VS_SKY = `#version 300 es
precision highp float; const vec2 P[3]=vec2[3](vec2(-1,-1),vec2(3,-1),vec2(-1,3)); out vec2 vP;
void main(){ vP=P[gl_VertexID]; gl_Position=vec4(vP,.9999,1); }`;
const FS_SKY = `#version 300 es
precision highp float; in vec2 vP; uniform mat4 uIVP; uniform vec3 uCam, uSun, uZen, uHor, uFog, uSunC; uniform float uNight, uExpo, uCloud, uTime; out vec4 o;
vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }
float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float n2(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
void main(){ vec4 a=uIVP*vec4(vP,1,1); vec3 d=normalize(a.xyz/a.w-uCam);
  float y=max(d.y,0.); vec3 c=mix(uHor,uZen,pow(y,.55));
  float s=max(dot(d,uSun),0.); c+=uSunC*(pow(s,600.)*8.+pow(s,8.)*.25)*(1.-uNight);
  if(uNight>.5){ vec2 g=d.xz/(d.y+.35)*180.; float st=step(.996,h(floor(g))); c+=vec3(st)*y*.9*(.6+.4*sin(uTime*2.+h(floor(g))*40.));
    vec3 md=normalize(vec3(-.4,.55,-.6)); float m=max(dot(d,md),0.); c+=vec3(.9,.9,.8)*smoothstep(.9994,.9997,m)*2.+vec3(.2,.22,.3)*pow(m,60.)*.6; }
  vec2 cp=d.xz/(d.y+.12)*1.4+vec2(uTime*.01,0); float cl=n2(cp)*.6+n2(cp*2.3)*.3+n2(cp*5.)*.1; cl=smoothstep(.5-uCloud*.35,.85,cl)*smoothstep(0.,.25,d.y);
  c=mix(c,mix(uHor*1.05,vec3(1.),.35*(1.-uNight))*(1.-uNight*.7),cl*.75);
  c=mix(c,uFog,clamp(1.-d.y*5.,0.,1.)*.85+(d.y<0.?1.:0.)); c=aces(c*uExpo); o=vec4(pow(c,vec3(1./2.2)),1); }`;
const VS_PT = `#version 300 es
precision highp float; layout(location=0) in vec3 aPos; layout(location=1) in vec4 aC; uniform mat4 uVP; uniform float uScale; out vec4 vC;
void main(){ vec4 p=uVP*vec4(aPos,1.); gl_Position=p; gl_PointSize=clamp(aC.a*uScale/p.w,1.,256.); vC=aC; }`;
const FS_PT = `#version 300 es
precision mediump float; in vec4 vC; uniform float uK; out vec4 o; void main(){ vec2 d=gl_PointCoord-.5; float r=length(d)*2.; float a=exp(-r*r*4.)*(1.-r); o=vec4(vC.rgb*max(a,0.)*uK,1.); }`;
const VS_LN = `#version 300 es
precision highp float; layout(location=0) in vec3 aPos; uniform mat4 uVP; uniform vec3 uCam; out float vD;
void main(){ gl_Position=uVP*vec4(aPos,1.); vD=length(aPos-uCam); }`;
const FS_LN = `#version 300 es
precision mediump float; in float vD; uniform vec4 uC; uniform vec3 uFog; uniform float uFogD; out vec4 o;
void main(){ float f=clamp(1.-exp(-vD*uFogD),0.,1.); o=vec4(mix(uC.rgb,uFog,f),uC.a); }`;

class Renderer {
  constructor(canvas) {
    const gl = canvas.getContext("webgl2", { antialias: true, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: false });
    if (!gl) throw new Error("NO_WEBGL2");
    this.gl = gl; this.canvas = canvas; this.aniso = gl.getExtension("EXT_texture_filter_anisotropic");
    this.prog = this.mk(VS, FS); this.progD = this.mk(VS_D, FS_D); this.progSky = this.mk(VS_SKY, FS_SKY); this.progPt = this.mk(VS_PT, FS_PT); this.progLn = this.mk(VS_LN, FS_LN);
    [this.prog, this.progD, this.progSky, this.progPt, this.progLn].forEach(p => { const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS), map = {};
      for (let i = 0; i < n; i++) { const inf = gl.getActiveUniform(p, i); map[inf.name.replace("[0]", "")] = gl.getUniformLocation(p, inf.name); } p.u = map; });
    this.white = this.solidTex([255, 255, 255, 255]); this.black = this.solidTex([0, 0, 0, 255]);
    this.meshes = []; this.prims = {}; this.lines = []; this.SH = 2048; this.initShadow(); this.emptyVao = gl.createVertexArray();
    this.ptBuf = gl.createBuffer(); this.ptVao = gl.createVertexArray(); gl.bindVertexArray(this.ptVao); gl.bindBuffer(gl.ARRAY_BUFFER, this.ptBuf);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 28, 12);
    this.dynLnBuf = gl.createBuffer(); this.dynLnVao = gl.createVertexArray(); gl.bindVertexArray(this.dynLnVao); gl.bindBuffer(gl.ARRAY_BUFFER, this.dynLnBuf); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
  }
  mk(vs, fs) { const gl = this.gl, sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; }
  solidTex(c) { const gl = this.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(c)); return t; }
  tex(canvas, repeat) { const gl = this.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas); gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const w = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE; gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, w); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, w);
    if (this.aniso) gl.texParameterf(gl.TEXTURE_2D, this.aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(this.aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT))); return t; }
  initShadow() { const gl = this.gl; this.shTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.shTex); gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, this.SH, this.SH);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.shFb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, this.shFb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.shTex, 0);
    gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE); gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
  upload(b) { const gl = this.gl, vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const buf = (data, loc, n) => { const bf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 0, 0); };
    buf(b.p, 0, 3); buf(b.n, 1, 3); buf(b.u, 2, 2); buf(b.c, 3, 3); buf(b.e, 4, 2);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(b.i), gl.STATIC_DRAW); return { vao, count: b.i.length }; }
  addMesh(b, mat) { if (!b.i.length) return null; const m = Object.assign(this.upload(b), mat); this.meshes.push(m); return m; }
  addPrim(name, b) { const gl = this.gl, m = this.upload(b); gl.bindVertexArray(m.vao); const ib = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, ib);
    for (let k = 0; k < 5; k++) { gl.enableVertexAttribArray(5 + k); gl.vertexAttribPointer(5 + k, 4, gl.FLOAT, false, 80, k * 16); gl.vertexAttribDivisor(5 + k, 1); }
    gl.bindVertexArray(null); this.prims[name] = Object.assign(m, { ib, data: new Float32Array(20 * 512), n: 0 }); }
  inst(name, m, c, em) { const P = this.prims[name]; if (P.n * 20 >= P.data.length) { const d = new Float32Array(P.data.length * 2); d.set(P.data); P.data = d; }
    const o = P.n * 20; P.data.set(m, o); P.data[o + 16] = c[0]; P.data[o + 17] = c[1]; P.data[o + 18] = c[2]; P.data[o + 19] = em || 0; P.n++; }
  addLines(arr, color) { const gl = this.gl, vao = gl.createVertexArray(); gl.bindVertexArray(vao); const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0); gl.bindVertexArray(null); this.lines.push({ vao, n: arr.length / 3, color }); }
  setStaticAttribs() { const gl = this.gl; gl.vertexAttrib4f(5, 1, 0, 0, 0); gl.vertexAttrib4f(6, 0, 1, 0, 0); gl.vertexAttrib4f(7, 0, 0, 1, 0); gl.vertexAttrib4f(8, 0, 0, 0, 1); gl.vertexAttrib4f(9, 1, 1, 1, 0); }
  drawScene(p, depth, env) { const gl = this.gl; this.setStaticAttribs();
    for (const m of this.meshes) { if (m.hidden || (depth && m.noShadow)) continue;
      if (!depth) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, m.tex || this.white); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, m.em || this.black);
        gl.uniform1f(p.u.uSpec, m.spec || .04); gl.uniform1f(p.u.uWet, (m.ground ? 1 : .25) * env.wet); gl.uniform1f(p.u.uWater, m.water ? 1 : 0); }
      gl.bindVertexArray(m.vao); gl.drawElements(gl.TRIANGLES, m.count, gl.UNSIGNED_INT, 0); }
    if (!depth) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.white); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.black); gl.uniform1f(p.u.uSpec, .06); gl.uniform1f(p.u.uWet, env.wet * .25); gl.uniform1f(p.u.uWater, 0); }
    for (const k in this.prims) { const P = this.prims[k]; if (!P.n) continue; gl.bindVertexArray(P.vao); gl.drawElementsInstanced(gl.TRIANGLES, P.count, gl.UNSIGNED_INT, 0, P.n); }
    gl.bindVertexArray(null); }
  render(cam, env, pts, rainLines) {
    const gl = this.gl, c = this.canvas;
    for (const k in this.prims) { const P = this.prims[k]; if (!P.n) continue; gl.bindBuffer(gl.ARRAY_BUFFER, P.ib); gl.bufferData(gl.ARRAY_BUFFER, P.data.subarray(0, P.n * 20), gl.DYNAMIC_DRAW); }
    const S = env.shadowSize, t = cam.target, sd = env.sunDir, eye = [t[0] + sd[0] * 120, t[1] + sd[1] * 120, t[2] + sd[2] * 120];
    const svp = M4.mul(new Float32Array(16), M4.ortho(-S, S, -S, S, 1, 260), M4.lookAt(eye, t, Math.abs(sd[1]) > .99 ? [1, 0, 0] : [0, 1, 0]));
    gl.enable(gl.DEPTH_TEST);
    if (env.shadows) { gl.bindFramebuffer(gl.FRAMEBUFFER, this.shFb); gl.viewport(0, 0, this.SH, this.SH); gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.useProgram(this.progD); gl.uniformMatrix4fv(this.progD.u.uVP, false, svp); gl.uniform1f(this.progD.u.uTime, env.time); gl.uniform1f(this.progD.u.uWind, env.wind);
      gl.disable(gl.CULL_FACE); gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1.5, 2); this.drawScene(this.progD, true, env); gl.disable(gl.POLYGON_OFFSET_FILL); gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
    gl.viewport(0, 0, c.width, c.height); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.CULL_FACE); gl.depthMask(false); gl.useProgram(this.progSky); const ps = this.progSky.u;
    gl.uniformMatrix4fv(ps.uIVP, false, M4.inv(cam.vp)); gl.uniform3fv(ps.uCam, cam.eye); gl.uniform3fv(ps.uSun, sd); gl.uniform3fv(ps.uZen, env.zen); gl.uniform3fv(ps.uHor, env.hor);
    gl.uniform3fv(ps.uFog, env.fog); gl.uniform3fv(ps.uSunC, env.sunC); gl.uniform1f(ps.uNight, env.night); gl.uniform1f(ps.uExpo, env.expo); gl.uniform1f(ps.uCloud, env.cloud); gl.uniform1f(ps.uTime, env.time);
    gl.bindVertexArray(this.emptyVao); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.depthMask(true);
    gl.useProgram(this.prog); const u = this.prog.u;
    gl.uniformMatrix4fv(u.uVP, false, cam.vp); gl.uniformMatrix4fv(u.uSVP, false, svp); gl.uniform1f(u.uTime, env.time); gl.uniform1f(u.uWind, env.wind);
    gl.uniform3fv(u.uSun, sd); gl.uniform3fv(u.uSunC, env.sunC); gl.uniform3fv(u.uSky, env.sky); gl.uniform3fv(u.uGnd, env.gnd); gl.uniform3fv(u.uFog, env.fog); gl.uniform3fv(u.uCam, cam.eye);
    gl.uniform1f(u.uFogD, env.fogD); gl.uniform1f(u.uNight, env.night); gl.uniform1f(u.uExpo, env.expo); gl.uniform1f(u.uShOn, env.shadows ? 1 : 0);
    gl.uniform1i(u.uTex, 0); gl.uniform1i(u.uEmT, 1); gl.uniform1i(u.uShadow, 2); gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.shTex);
    const L = env.lights, n = Math.min(16, L.length), lp = new Float32Array(64), lc = new Float32Array(48);
    for (let i = 0; i < n; i++) { lp.set([L[i].p[0], L[i].p[1], L[i].p[2], L[i].r], i * 4); lc.set(L[i].c, i * 3); }
    gl.uniform4fv(u.uLP, lp); gl.uniform3fv(u.uLC, lc); gl.uniform1i(u.uNL, n);
    this.drawScene(this.prog, false, env);
    gl.useProgram(this.progLn); const ul = this.progLn.u; gl.uniformMatrix4fv(ul.uVP, false, cam.vp); gl.uniform3fv(ul.uCam, cam.eye); gl.uniform3fv(ul.uFog, env.fogOut); gl.uniform1f(ul.uFogD, env.fogD);
    for (const l of this.lines) { gl.uniform4fv(ul.uC, l.color); gl.bindVertexArray(l.vao); gl.drawArrays(gl.LINES, 0, l.n); }
    gl.enable(gl.BLEND); gl.depthMask(false);
    if (pts && pts.length) { gl.blendFunc(gl.ONE, gl.ONE); gl.useProgram(this.progPt); gl.uniformMatrix4fv(this.progPt.u.uVP, false, cam.vp); gl.uniform1f(this.progPt.u.uScale, c.height * .9); gl.uniform1f(this.progPt.u.uK, 1);
      gl.bindVertexArray(this.ptVao); gl.bindBuffer(gl.ARRAY_BUFFER, this.ptBuf); gl.bufferData(gl.ARRAY_BUFFER, pts, gl.DYNAMIC_DRAW); gl.drawArrays(gl.POINTS, 0, pts.length / 7); }
    if (rainLines && rainLines.length) { gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.useProgram(this.progLn); gl.uniform4fv(ul.uC, env.night > .5 ? [.6, .65, .75, .35] : [.85, .9, .95, .4]); gl.uniform1f(ul.uFogD, 0);
      gl.bindVertexArray(this.dynLnVao); gl.bindBuffer(gl.ARRAY_BUFFER, this.dynLnBuf); gl.bufferData(gl.ARRAY_BUFFER, rainLines, gl.DYNAMIC_DRAW); gl.drawArrays(gl.LINES, 0, rainLines.length / 3); }
    gl.depthMask(true); gl.disable(gl.BLEND); gl.bindVertexArray(null);
    for (const k in this.prims) this.prims[k].n = 0;
  }
}
