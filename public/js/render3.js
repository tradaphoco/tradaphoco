/* Trà Đá Phố Cổ — bộ vẽ dùng Three.js r168.
   Giữ nguyên giao diện của bộ vẽ cũ (addMesh / addPrim / inst / addLines / tex / render).
   Bản 6.1 thêm: vẽ mô hình glTF (public/models/*.glb) bằng instancing, cả vật động (ghế, xe máy)
   lẫn vật tĩnh (cây sấu, cột đèn, tủ trà, xe đỗ), có nhuộm màu từng bản sao và đèn sáng về đêm. */
"use strict";
const QUALITY = {
  low: { name: "Nhẹ", shadow: 0, ao: false, bloom: false, fxaa: false, msaa: 0, maxDpr: 1, far: 70, near: 18 },
  mid: { name: "Vừa", shadow: 1024, ao: false, bloom: true, fxaa: true, msaa: 0, maxDpr: 1.5, far: 95, near: 28 },
  high: { name: "Cao", shadow: 2048, ao: true, bloom: true, fxaa: false, msaa: 4, maxDpr: 2, far: 130, near: 40 }
};
const lin = c => c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4);

const SKY_VS = `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; gl_Position.z = gl_Position.w; }`;
const SKY_FS = `uniform vec3 uSun, uZen, uHor, uFog, uSunC; uniform float uNight, uCloud, uTime; varying vec3 vW;
float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float n2(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
void main(){ vec3 d = normalize(vW - cameraPosition);
  float y = max(d.y, 0.); vec3 c = mix(uHor, uZen, pow(y, .55));
  float s = max(dot(d, uSun), 0.); c += uSunC * (pow(s, 600.) * 10. + pow(s, 8.) * .25) * (1. - uNight);
  if (uNight > .5) { vec2 g = d.xz / (d.y + .35) * 180.; float st = step(.996, h(floor(g))); c += vec3(st) * y * 1.4 * (.6 + .4 * sin(uTime * 2. + h(floor(g)) * 40.));
    vec3 md = normalize(vec3(-.4, .55, -.6)); float m = max(dot(d, md), 0.); c += vec3(.9, .9, .8) * smoothstep(.9994, .9997, m) * 4. + vec3(.2, .22, .3) * pow(m, 60.) * .6; }
  vec2 cp = d.xz / (d.y + .12) * 1.4 + vec2(uTime * .01, 0); float cl = n2(cp) * .6 + n2(cp * 2.3) * .3 + n2(cp * 5.) * .1; cl = smoothstep(.5 - uCloud * .35, .85, cl) * smoothstep(0., .25, d.y);
  vec3 cloudCol = mix(uHor * 1.05, vec3(1.), .35 * (1. - uNight)) * (1. - uNight * .7) + uSunC * pow(s, 4.) * .15 * (1. - uNight);
  c = mix(c, cloudCol, cl * .75);
  c = mix(c, uFog, clamp(1. - d.y * 5., 0., 1.) * .85 + (d.y < 0. ? 1. : 0.));
  gl_FragColor = vec4(c, 1.); }`;
const Q_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
const AO_FS = `uniform sampler2D tDepth; uniform mat4 pInv; uniform vec2 res; uniform float radius, intensity, projY; varying vec2 vUv;
vec3 vpos(vec2 uv){ float d = texture2D(tDepth, uv).x; vec4 c = vec4(uv * 2. - 1., d * 2. - 1., 1.); vec4 v = pInv * c; return v.xyz / v.w; }
void main(){ float d = texture2D(tDepth, vUv).x; if (d >= .99999) { gl_FragColor = vec4(1.); return; }
  vec3 p = vpos(vUv); vec3 n = normalize(cross(dFdx(p), dFdy(p))); if (dot(n, p) > 0.) n = -n;
  float rPix = radius * projY * .5 * res.y / -p.z; rPix = clamp(rPix, 2., 60.);
  float rot = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715)))) * 6.2832;
  float occ = 0.; const int N = 12;
  for (int i = 0; i < N; i++) { float f = (float(i) + .5) / float(N); float a = rot + f * 25.13; vec2 off = vec2(cos(a), sin(a)) * rPix * f / res;
    vec3 s = vpos(vUv + off), v = s - p; float vv = dot(v, v), vn = dot(v, n);
    occ += max(0., vn - .015 * -p.z) / (vv + .02) * max(0., 1. - vv / (radius * radius * 4.)); }
  float ao = clamp(1. - occ * intensity / float(N), 0., 1.); gl_FragColor = vec4(ao, ao, ao, 1.); }`;
const BRIGHT_FS = `uniform sampler2D tSrc; uniform vec2 texel; uniform float expo, thr; varying vec2 vUv;
void main(){ vec3 c = (texture2D(tSrc, vUv + texel * vec2(-.5,-.5)).rgb + texture2D(tSrc, vUv + texel * vec2(.5,-.5)).rgb + texture2D(tSrc, vUv + texel * vec2(-.5,.5)).rgb + texture2D(tSrc, vUv + texel * vec2(.5,.5)).rgb) * .25 * expo;
  float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(min(c * smoothstep(thr, thr + 1.2, l), vec3(40.)), 1.); }`;
const BLUR_FS = `uniform sampler2D tSrc; uniform vec2 dir; varying vec2 vUv;
void main(){ vec3 c = texture2D(tSrc, vUv).rgb * .2270; c += (texture2D(tSrc, vUv + dir * 1.3846).rgb + texture2D(tSrc, vUv - dir * 1.3846).rgb) * .3162; c += (texture2D(tSrc, vUv + dir * 3.2308).rgb + texture2D(tSrc, vUv - dir * 3.2308).rgb) * .0703; gl_FragColor = vec4(c, 1.); }`;
const DOWN_FS = `uniform sampler2D tSrc; uniform vec2 texel; varying vec2 vUv;
void main(){ gl_FragColor = vec4((texture2D(tSrc, vUv + texel * vec2(-1.,-1.)).rgb + texture2D(tSrc, vUv + texel * vec2(1.,-1.)).rgb + texture2D(tSrc, vUv + texel * vec2(-1.,1.)).rgb + texture2D(tSrc, vUv + texel * vec2(1.,1.)).rgb) * .25, 1.); }`;
const COMP_FS = `uniform sampler2D tScene, tAO, tB1, tB2, tB3; uniform vec2 aoTexel; uniform float expo, bloomK, aoK, night, vign; varying vec2 vUv;
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
void main(){ vec3 c = texture2D(tScene, vUv).rgb;
  if (aoK > 0.) { float ao = (texture2D(tAO, vUv + aoTexel * vec2(-1., -1.)).r + texture2D(tAO, vUv + aoTexel * vec2(1., -1.)).r + texture2D(tAO, vUv + aoTexel * vec2(-1., 1.)).r + texture2D(tAO, vUv + aoTexel * vec2(1., 1.)).r) * .25; c *= mix(1., ao, aoK); }
  c *= expo;
  if (bloomK > 0.) c += (texture2D(tB1, vUv).rgb * .5 + texture2D(tB2, vUv).rgb * .8 + texture2D(tB3, vUv).rgb * 1.1) * bloomK;
  c = aces(c);
  float l = dot(c, vec3(.2126, .7152, .0722));
  c = mix(c, c * c * (3. - 2. * c), .28);
  c *= mix(vec3(1.03, 1., .95), vec3(.94, .98, 1.08), night);
  c = mix(vec3(l), c, 1.06);
  vec2 q = vUv - .5; c *= 1. - vign * dot(q, q) * 1.6;
  gl_FragColor = vec4(pow(clamp(c, 0., 1.), vec3(1. / 2.2)), 1.); }`;
const FXAA_FS = `uniform sampler2D tSrc; uniform vec2 rcp; varying vec2 vUv;
float lum(vec3 c){ return dot(c, vec3(.299, .587, .114)); }
void main(){ vec3 nw = texture2D(tSrc, vUv + vec2(-1., -1.) * rcp).rgb, ne = texture2D(tSrc, vUv + vec2(1., -1.) * rcp).rgb, sw = texture2D(tSrc, vUv + vec2(-1., 1.) * rcp).rgb, se = texture2D(tSrc, vUv + vec2(1., 1.) * rcp).rgb, m = texture2D(tSrc, vUv).rgb;
  float lNW = lum(nw), lNE = lum(ne), lSW = lum(sw), lSE = lum(se), lM = lum(m), lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE))), lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
  vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), (lNW + lSW) - (lNE + lSE));
  float red = max((lNW + lNE + lSW + lSE) * .03125, 1. / 128.), rmin = 1. / (min(abs(dir.x), abs(dir.y)) + red);
  dir = min(vec2(8.), max(vec2(-8.), dir * rmin)) * rcp;
  vec3 a = .5 * (texture2D(tSrc, vUv + dir * (1. / 3. - .5)).rgb + texture2D(tSrc, vUv + dir * (2. / 3. - .5)).rgb);
  vec3 b = a * .5 + .25 * (texture2D(tSrc, vUv + dir * -.5).rgb + texture2D(tSrc, vUv + dir * .5).rgb);
  float lB = lum(b); gl_FragColor = vec4((lB < lMin || lB > lMax) ? a : b, 1.); }`;

class Renderer {
  constructor(canvas) {
    const T = window.THREE; if (!T) throw new Error("NO_THREE");
    this.T = T; this.canvas = canvas; window.__R3 = this;
    const r = new T.WebGLRenderer({ canvas, antialias: false, alpha: false, stencil: false, powerPreference: "high-performance" });
    r.setPixelRatio(1); r.toneMapping = T.NoToneMapping; r.outputColorSpace = T.LinearSRGBColorSpace;
    r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap; r.info.autoReset = false;
    this.r = r; this.gl = r.getContext(); this.maxAniso = Math.min(8, r.capabilities.getMaxAnisotropy());
    T.ShaderChunk.fog_fragment = T.ShaderChunk.fog_fragment.replace("fogDensity * fogDensity * vFogDepth * vFogDepth", "fogDensity * vFogDepth");
    const S = this.scene = new T.Scene(); S.fog = new T.FogExp2(0x000000, .005);
    this.U = { uTime: { value: 0 }, uWind: { value: 1 }, uEmK: { value: .6 } };
    this.camera = new T.PerspectiveCamera(55, 1, .1, 1200); this.camera.matrixAutoUpdate = false;
    this.sun = new T.DirectionalLight(0xffffff, 3); const sc = this.sun.shadow.camera;
    sc.left = -42; sc.right = 42; sc.top = 42; sc.bottom = -42; sc.near = 1; sc.far = 280; this.sun.shadow.bias = -.0004; this.sun.shadow.normalBias = .035; this.sun.shadow.radius = 2.5;
    S.add(this.sun, this.sun.target);
    this.hemi = new T.HemisphereLight(0xffffff, 0x333333, 1); S.add(this.hemi);
    this.pl = []; for (let i = 0; i < 8; i++) { const l = new T.PointLight(0xffffff, 0, 10, 1.4); this.pl.push(l); S.add(l); }
    this.skyMat = new T.ShaderMaterial({ uniforms: { uSun: { value: new T.Vector3(0, 1, 0) }, uZen: { value: new T.Vector3() }, uHor: { value: new T.Vector3() }, uFog: { value: new T.Vector3() }, uSunC: { value: new T.Vector3() },
      uNight: { value: 0 }, uCloud: { value: .4 }, uTime: { value: 0 } }, vertexShader: SKY_VS, fragmentShader: SKY_FS, side: T.BackSide, depthWrite: false, fog: false });
    const skyG = new T.SphereGeometry(800, 32, 16);
    this.sky = new T.Mesh(skyG, this.skyMat); this.sky.frustumCulled = false; this.sky.renderOrder = -10; S.add(this.sky);
    this.envScene = new T.Scene(); this.envScene.add(new T.Mesh(skyG, this.skyMat)); this.pmrem = new T.PMREMGenerator(r); this.envKey = ""; this.envT = -99; this.envRT = null;
    this.meshes = []; this.prims = {}; this.ground = []; this.mats = []; this.emMats = []; this.lampMats = [];
    const MAXG = 4096; this.glowG = new T.BufferGeometry(); this.glowA = { p: new Float32Array(MAXG * 3), c: new Float32Array(MAXG * 3), s: new Float32Array(MAXG), max: MAXG };
    this.glowG.setAttribute("position", new T.BufferAttribute(this.glowA.p, 3).setUsage(T.DynamicDrawUsage)); this.glowG.setAttribute("gcol", new T.BufferAttribute(this.glowA.c, 3).setUsage(T.DynamicDrawUsage)); this.glowG.setAttribute("gsize", new T.BufferAttribute(this.glowA.s, 1).setUsage(T.DynamicDrawUsage));
    this.glowMat = new T.ShaderMaterial({ uniforms: { uScale: { value: 500 } },
      vertexShader: `attribute vec3 gcol; attribute float gsize; uniform float uScale; varying vec3 vC; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = clamp(gsize * uScale / max(-mv.z, .1), 1., 256.); vC = gcol; }`,
      fragmentShader: `varying vec3 vC; void main(){ vec2 d = gl_PointCoord - .5; float r = length(d) * 2.; float a = exp(-r * r * 4.) * (1. - r); gl_FragColor = vec4(vC * max(a, 0.) * .42, 1.); }`,
      blending: T.AdditiveBlending, depthWrite: false, transparent: true });
    this.glows = new T.Points(this.glowG, this.glowMat); this.glows.frustumCulled = false; this.glows.renderOrder = 5; S.add(this.glows);
    this.rainA = new Float32Array(900 * 6); this.rainG = new T.BufferGeometry(); this.rainG.setAttribute("position", new T.BufferAttribute(this.rainA, 3).setUsage(T.DynamicDrawUsage));
    this.rainMat = new T.LineBasicMaterial({ color: 0xdde6f2, transparent: true, opacity: .35, depthWrite: false, fog: false });
    this.rain = new T.LineSegments(this.rainG, this.rainMat); this.rain.frustumCulled = false; this.rain.renderOrder = 6; S.add(this.rain);
    this.qScene = new T.Scene(); this.qCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1); this.quad = new T.Mesh(new T.PlaneGeometry(2, 2)); this.quad.frustumCulled = false; this.qScene.add(this.quad);
    const sm = (fs, u) => new T.ShaderMaterial({ uniforms: u, vertexShader: Q_VS, fragmentShader: fs, depthTest: false, depthWrite: false });
    this.pm = {
      ao: sm(AO_FS, { tDepth: { value: null }, pInv: { value: new T.Matrix4() }, res: { value: new T.Vector2() }, radius: { value: .55 }, intensity: { value: 1.25 }, projY: { value: 1 } }),
      bright: sm(BRIGHT_FS, { tSrc: { value: null }, texel: { value: new T.Vector2() }, expo: { value: 1 }, thr: { value: 1.1 } }),
      blur: sm(BLUR_FS, { tSrc: { value: null }, dir: { value: new T.Vector2() } }),
      down: sm(DOWN_FS, { tSrc: { value: null }, texel: { value: new T.Vector2() } }),
      comp: sm(COMP_FS, { tScene: { value: null }, tAO: { value: null }, tB1: { value: null }, tB2: { value: null }, tB3: { value: null }, aoTexel: { value: new T.Vector2() }, expo: { value: 1 }, bloomK: { value: .6 }, aoK: { value: 0 }, night: { value: 0 }, vign: { value: .22 } }),
      fxaa: sm(FXAA_FS, { tSrc: { value: null }, rcp: { value: new T.Vector2() } })
    };
    this.white = new T.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); this.white.needsUpdate = true;
    this.size = [0, 0]; this.rt = null; this.setQuality("mid");
    this.models = {}; this.statics = []; this.eye = [0, 0, 0]; this.buildModels();
  }

  /* ---------- Mô hình glTF ---------- */
  buildModels() {
    const T = this.T, src = window.__MODELS || {};
    for (const name in src) {
      const root = src[name]; root.updateMatrixWorld(true); const parts = [];
      root.traverse(o => { if (!o.isMesh) return;
        const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld); g.computeBoundingSphere();
        const s = o.material, nm = s.name || "", lamp = nm.startsWith("lamp") || nm.startsWith("glass_lamp");
        const mat = new T.MeshStandardMaterial({ color: s.color.clone(), roughness: s.roughness, metalness: s.metalness, vertexColors: !!g.attributes.color,
          transparent: s.transparent, opacity: s.opacity, depthWrite: !s.transparent, side: s.side });
        mat.envMapIntensity = s.metalness > .5 ? 1.0 : .55; mat.name = nm;
        if (lamp) { mat.emissive = s.emissive.clone(); mat.emissiveIntensity = 0; mat.userData.lamp = true; this.lampMats.push(mat); }
        mat.onBeforeCompile = sh => { // iem: độ sáng đèn theo từng bản sao (xe đỗ thì tắt đèn)
          sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute float iem;\nvarying float vIem;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvIem = iem;");
          sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vIem;").replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vIem;"); };
        mat.customProgramCacheKey = () => "tdpcModel";
        parts.push({ g, mat, tint: nm.startsWith("tint") }); });
      if (!parts.length) continue;
      const lod = name.endsWith("_lod"); if (lod) parts.forEach(p => p.noShadow = true);
      const M = { parts, n: 0, dyn: null }; M.dyn = parts.map(p => this.mkInst(p, 64, true)); this.models[name] = M;
    }
    for (const n in this.models) if (!n.endsWith("_lod")) this.models[n].lod = this.models[n + "_lod"] || null;
  }
  hasModel(n) { return !!this.models[n]; }
  mkInst(part, cap, dynamic) {
    const T = this.T, g = dynamic ? part.g : part.g.clone(), m = new T.InstancedMesh(g, part.mat, cap);
    m.instanceColor = new T.InstancedBufferAttribute(new Float32Array(cap * 3), 3); const iem = new T.InstancedBufferAttribute(new Float32Array(cap), 1); g.setAttribute("iem", iem);
    if (dynamic) { m.instanceMatrix.setUsage(T.DynamicDrawUsage); m.instanceColor.setUsage(T.DynamicDrawUsage); iem.setUsage(T.DynamicDrawUsage); m.frustumCulled = false; m.count = 0; }
    m.castShadow = !part.mat.transparent && !part.noShadow; m.receiveShadow = true; this.scene.add(m); return { mesh: m, iem, cap, part };
  }
  // chọn bản chi tiết hay bản rút gọn theo khoảng cách tới máy quay; quá xa thì không vẽ
  modelInst(name, mtx, c, em) {
    let M = this.models[name]; if (!M) return;
    const dx = mtx[12] - this.eye[0], dz = mtx[14] - this.eye[2], d = Math.sqrt(dx * dx + dz * dz), q = this.q;
    if (d > q.far + 15) return; if (d > q.near && M.lod) M = M.lod;
    this.putInst(M, mtx, c, em); }
  putInst(M, mtx, c, em) {
    if (M.n >= M.dyn[0].cap) { const cap = M.dyn[0].cap * 2; M.dyn = M.dyn.map(d => { const nd = this.mkInst(d.part, cap, true);
      nd.mesh.instanceMatrix.array.set(d.mesh.instanceMatrix.array.subarray(0, M.n * 16)); nd.mesh.instanceColor.array.set(d.mesh.instanceColor.array.subarray(0, M.n * 3)); nd.iem.array.set(d.iem.array.subarray(0, M.n));
      this.scene.remove(d.mesh); return nd; }); }
    const n = M.n++, r = lin(c[0]), g = lin(c[1]), b = lin(c[2]);
    for (const d of M.dyn) { d.mesh.instanceMatrix.array.set(mtx, n * 16); const ca = d.mesh.instanceColor.array;
      if (d.part.tint) { ca[n * 3] = r; ca[n * 3 + 1] = g; ca[n * 3 + 2] = b; } else { ca[n * 3] = ca[n * 3 + 1] = ca[n * 3 + 2] = 1; } d.iem.array[n] = em || 0; }
  }
  // vật tĩnh (cây, cột đèn, tủ trà, ghế cố định, xe đỗ): lưu một lần, mỗi khung chọn bản chi tiết/rút gọn theo khoảng cách
  addStatic(name, mtx, c, em) { if (!this.models[name]) return false; this.statics.push({ name, m: Float32Array.from(mtx), c: c || [1, 1, 1], em: em || 0 }); return true; }

  setQuality(tier) {
    const q = QUALITY[tier] || QUALITY.mid; const prev = this.q; this.q = q; this.tier = tier;
    const want = q.shadow > 0; if (!prev || (prev.shadow > 0) !== want) this.sun.castShadow = want;
    if (want && (!prev || prev.shadow !== q.shadow)) { this.sun.shadow.mapSize.set(q.shadow, q.shadow); if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; } }
    this.size = [0, 0];
  }
  syncSize() {
    const T = this.T, w = this.canvas.width, h = this.canvas.height; if (w === this.size[0] && h === this.size[1] && this.rtMsaa === this.q.msaa) return;
    this.size = [w, h]; this.rtMsaa = this.q.msaa; this.r.setSize(w, h, false);
    if (this.rt) Object.values(this.rt).forEach(t => t && t.dispose());
    const hf = { type: T.HalfFloatType, depthBuffer: false }, mk = (a, b, o) => new T.WebGLRenderTarget(Math.max(1, a | 0), Math.max(1, b | 0), Object.assign({ minFilter: T.LinearFilter, magFilter: T.LinearFilter }, o));
    const depthTexture = new T.DepthTexture(w, h); depthTexture.type = T.UnsignedIntType;
    this.rt = { scene: mk(w, h, { type: T.HalfFloatType, depthTexture, samples: this.q.msaa }),
      ao: mk(w / 2, h / 2, { depthBuffer: false }), h1: mk(w / 2, h / 2, hf), h2: mk(w / 2, h / 2, hf), q1: mk(w / 4, h / 4, hf), q2: mk(w / 4, h / 4, hf), e1: mk(w / 8, h / 8, hf), e2: mk(w / 8, h / 8, hf),
      ldr: mk(w, h, { depthBuffer: false }) };
  }
  tex(canvas, repeat) {
    const T = this.T, t = new T.CanvasTexture(canvas); t.colorSpace = T.SRGBColorSpace; t.anisotropy = this.maxAniso;
    t.wrapS = t.wrapT = repeat ? T.RepeatWrapping : T.ClampToEdgeWrapping; t.flipY = false; t.generateMipmaps = true; t.minFilter = T.LinearMipmapLinearFilter; t.needsUpdate = true; return t;
  }
  stdMat(o) {
    const T = this.T, m = new T.MeshStandardMaterial({ vertexColors: true, roughness: o.rough ?? .85, metalness: o.metal || 0, map: o.tex || null });
    m.envMapIntensity = o.envK ?? .5; m.userData.rough = m.roughness;
    if (o.em) { m.emissiveMap = o.em; m.emissive = new T.Color(1, 1, 1); m.emissiveIntensity = 0; this.emMats.push(m); }
    const U = this.U, inst = !!o.inst, water = !!o.water;
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute vec2 ext;\nvarying float vEmV;\nvarying vec3 vWP;\nuniform float uTime, uWind;" + (inst ? "\nattribute float iem;" : ""))
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvEmV = ext.x" + (inst ? " + iem" : "") + ";\nif (ext.y > 0.0) { float s = uWind * ext.y; transformed.x += sin(uTime * 1.4 + transformed.x * .35 + transformed.z * .2) * .09 * s; transformed.z += cos(uTime * 1.1 + transformed.x * .25) * .06 * s; transformed.y += sin(uTime * 2. + transformed.x) * .02 * s; }")
        .replace("#include <project_vertex>", "#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vEmV;\nvarying vec3 vWP;\nuniform float uEmK, uTime;")
        .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += vColor.rgb * vEmV * uEmK;");
      if (water) sh.fragmentShader = sh.fragmentShader.replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
{ vec2 p = vWP.xz; float t = uTime; vec3 nw = normalize(vec3(sin(p.x*1.3+t*1.1)*.09+sin(p.y*2.1-t*1.6)*.06+sin((p.x+p.y)*4.-t*2.3)*.04+sin(p.x*9.-t*3.)*.02, 1., cos(p.y*1.2+t*.9)*.09+cos(p.x*2.7+t*1.4)*.05+cos((p.x-p.y)*7.+t*2.)*.03));
  normal = normalize((viewMatrix * vec4(nw, 0.)).xyz); }`);
    };
    m.customProgramCacheKey = () => "tdpc" + (inst ? "i" : "") + (water ? "w" : "");
    return m;
  }
  geom(P, N, Uv, C, E, I) {
    const T = this.T, g = new T.BufferGeometry();
    g.setAttribute("position", new T.BufferAttribute(P, 3)); g.setAttribute("normal", new T.BufferAttribute(N, 3)); g.setAttribute("uv", new T.BufferAttribute(Uv, 2));
    g.setAttribute("color", new T.BufferAttribute(C, 3)); g.setAttribute("ext", new T.BufferAttribute(E, 2)); g.setIndex(new T.BufferAttribute(I, 1)); g.computeBoundingSphere(); return g;
  }
  chunk(b, size) {
    const P = b.p, Nn = b.n, Uu = b.u, Cc = b.c, Ee = b.e, I = b.i, groups = new Map();
    for (let t = 0; t < I.length; t += 3) { const a = I[t], c = I[t + 1], d = I[t + 2], k = Math.floor((P[a * 3] + P[c * 3] + P[d * 3]) / 3 / size); let g = groups.get(k); if (!g) { g = []; groups.set(k, g); } g.push(a, c, d); }
    const out = [];
    for (const tri of groups.values()) { const map = new Map(), idx = new Uint32Array(tri.length); let n = 0;
      for (let i = 0; i < tri.length; i++) { let v = map.get(tri[i]); if (v === undefined) { v = n++; map.set(tri[i], v); } idx[i] = v; }
      const p = new Float32Array(n * 3), nn = new Float32Array(n * 3), uv = new Float32Array(n * 2), c = new Float32Array(n * 3), e = new Float32Array(n * 2);
      for (const [o, v] of map) { p[v * 3] = P[o * 3]; p[v * 3 + 1] = P[o * 3 + 1]; p[v * 3 + 2] = P[o * 3 + 2]; nn[v * 3] = Nn[o * 3]; nn[v * 3 + 1] = Nn[o * 3 + 1]; nn[v * 3 + 2] = Nn[o * 3 + 2];
        uv[v * 2] = Uu[o * 2]; uv[v * 2 + 1] = Uu[o * 2 + 1]; c[v * 3] = lin(Cc[o * 3]); c[v * 3 + 1] = lin(Cc[o * 3 + 1]); c[v * 3 + 2] = lin(Cc[o * 3 + 2]); e[v * 2] = Ee[o * 2]; e[v * 2 + 1] = Ee[o * 2 + 1]; }
      out.push(this.geom(p, nn, uv, c, e, idx)); }
    return out;
  }
  addMesh(b, opt) {
    if (!b.i.length) return null; opt = opt || {}; const T = this.T, spec = opt.spec || .04;
    const mat = opt.water ? this.stdMat({ water: true, rough: .18, envK: .3 }) : this.stdMat({ tex: opt.tex, em: opt.em, rough: spec >= .2 ? .4 : spec >= .08 ? .72 : .88, metal: spec >= .2 ? .25 : 0, envK: spec >= .2 ? .8 : .5 });
    (opt.ground ? this.ground : this.mats).push(mat);
    const meshes = this.chunk(b, opt.water ? 1e9 : 48).map(g => { const m = new T.Mesh(g, mat); m.castShadow = !opt.noShadow && !opt.water; m.receiveShadow = true; m.matrixAutoUpdate = false; this.scene.add(m); return m; });
    let hidden = false; const w = { season: opt.season, meshes, get hidden() { return hidden; }, set hidden(v) { hidden = !!v; meshes.forEach(m => m.visible = !hidden); } };
    this.meshes.push(w); return w;
  }
  addPrim(name, b) {
    const g = this.geom(new Float32Array(b.p), new Float32Array(b.n), new Float32Array(b.u), new Float32Array(b.c.map(lin)), new Float32Array(b.e), new Uint32Array(b.i));
    const P = { g, mat: this.stdMat({ inst: true, rough: .7, envK: .45 }), cap: 0, n: 0, mesh: null, iem: null }; this.prims[name] = P; this.grow(P, 512);
  }
  grow(P, cap) {
    const T = this.T, old = P.mesh, m = new T.InstancedMesh(P.g, P.mat, cap);
    m.instanceMatrix.setUsage(T.DynamicDrawUsage); m.instanceColor = new T.InstancedBufferAttribute(new Float32Array(cap * 3), 3); m.instanceColor.setUsage(T.DynamicDrawUsage);
    const iem = new T.InstancedBufferAttribute(new Float32Array(cap), 1); iem.setUsage(T.DynamicDrawUsage);
    if (old) { m.instanceMatrix.array.set(old.instanceMatrix.array.subarray(0, P.n * 16)); m.instanceColor.array.set(old.instanceColor.array.subarray(0, P.n * 3)); iem.array.set(P.iem.array.subarray(0, P.n)); this.scene.remove(old); }
    P.g.setAttribute("iem", iem); P.iem = iem; m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true; m.count = 0; this.scene.add(m); P.mesh = m; P.cap = cap;
  }
  inst(name, mtx, c, em) {
    if (name.charCodeAt(0) === 109 && name.startsWith("model:")) return this.modelInst(name.slice(6), mtx, c, em);
    const P = this.prims[name]; if (P.n >= P.cap) this.grow(P, P.cap * 2); const n = P.n++;
    P.mesh.instanceMatrix.array.set(mtx, n * 16); const ca = P.mesh.instanceColor.array; ca[n * 3] = lin(c[0]); ca[n * 3 + 1] = lin(c[1]); ca[n * 3 + 2] = lin(c[2]); P.iem.array[n] = em || 0;
  }
  addLines(arr, color) {
    const T = this.T, g = new T.BufferGeometry(); g.setAttribute("position", new T.BufferAttribute(new Float32Array(arr), 3));
    const L = new T.LineSegments(g, new T.LineBasicMaterial({ color: new T.Color(lin(color[0]), lin(color[1]), lin(color[2])) })); L.matrixAutoUpdate = false; this.scene.add(L);
  }
  updateEnvMap(env) {
    const k = [env.zen, env.hor, env.sunC].map(v => v.map(x => Math.round(x * 25)).join(",")).join("|") + "|" + Math.round(env.night) + "|" + Math.round(env.cloud * 10);
    const now = performance.now() / 1000; if (k === this.envKey || now - this.envT < 2) return;
    this.envKey = k; this.envT = now; const rt = this.pmrem.fromScene(this.envScene, .02, .1, 1000);
    if (this.envRT) this.envRT.dispose(); this.envRT = rt; this.scene.environment = rt.texture;
  }
  pass(mat, target) { this.quad.material = mat; this.r.setRenderTarget(target); this.r.render(this.qScene, this.qCam); }
  render(cam, env, pts, rain) {
    const r = this.r, q = this.q; r.info.reset(); this.syncSize(); const [w, h] = this.size;
    this.eye = cam.eye; for (const st of this.statics) this.modelInst(st.name, st.m, st.c, st.em);
    const C = this.camera; C.matrix.fromArray(M4.inv(cam.view)); C.matrixWorldNeedsUpdate = true; C.projectionMatrix.fromArray(cam.proj); C.projectionMatrixInverse.copy(C.projectionMatrix).invert();
    const U = this.U; U.uTime.value = env.time; U.uWind.value = env.wind; U.uEmK.value = .6 + 2.4 * env.night;
    const t = cam.target, sd = env.sunDir, sz = env.shadowSize || 42, snap = 2 * sz / (q.shadow || 1024), tx = Math.round(t[0] / snap) * snap, tz = Math.round(t[2] / snap) * snap;
    this.sun.target.position.set(tx, t[1], tz); this.sun.position.set(tx + sd[0] * 120, t[1] + sd[1] * 120, tz + sd[2] * 120); this.sun.target.updateMatrixWorld();
    const mx = Math.max(env.sunC[0], env.sunC[1], env.sunC[2], 1e-4); this.sun.color.setRGB(env.sunC[0] / mx, env.sunC[1] / mx, env.sunC[2] / mx); this.sun.intensity = mx * Math.PI;
    this.hemi.color.setRGB(env.sky[0], env.sky[1], env.sky[2]); this.hemi.groundColor.setRGB(env.gnd[0], env.gnd[1], env.gnd[2]); this.hemi.intensity = Math.PI * .5;
    this.scene.fog.color.setRGB(env.fog[0], env.fog[1], env.fog[2]); this.scene.fog.density = env.fogD;
    const su = this.skyMat.uniforms; su.uSun.value.set(sd[0], sd[1], sd[2]); su.uZen.value.set(...env.zen); su.uHor.value.set(...env.hor); su.uFog.value.set(...env.fog); su.uSunC.value.set(...env.sunC);
    su.uNight.value = env.night; su.uCloud.value = env.cloud; su.uTime.value = env.time; this.sky.position.set(cam.eye[0], cam.eye[1], cam.eye[2]);
    this.updateEnvMap(env);
    const L = env.lights || []; for (let i = 0; i < 8; i++) { const l = this.pl[i], s = L[i]; if (!s) { l.intensity = 0; l.visible = false; continue; }
      const m2 = Math.max(s.c[0], s.c[1], s.c[2], 1e-4); l.visible = true; l.position.set(s.p[0], s.p[1], s.p[2]); l.color.setRGB(s.c[0] / m2, s.c[1] / m2, s.c[2] / m2); l.intensity = m2 * .85 * Math.PI; l.distance = s.r * 1.1; }
    for (const m of this.emMats) m.emissiveIntensity = env.night * 1.6;
    for (const m of this.lampMats) m.emissiveIntensity = .25 + env.night * 2.6;
    for (const m of this.ground) { m.color.setScalar(1 - env.wet * .35); m.roughness = m.userData.rough - .62 * env.wet; m.envMapIntensity = .5 + .9 * env.wet; }
    for (const m of this.mats) m.roughness = m.userData.rough - .2 * env.wet;
    for (const k in this.prims) { const P = this.prims[k]; P.mesh.count = P.n; P.mesh.instanceMatrix.needsUpdate = true; P.mesh.instanceColor.needsUpdate = true; P.iem.needsUpdate = true; }
    for (const k in this.models) { const M = this.models[k]; for (const d of M.dyn) { d.mesh.count = M.n; d.mesh.instanceMatrix.needsUpdate = true; d.mesh.instanceColor.needsUpdate = true; d.iem.needsUpdate = true; } }
    const G = this.glowA; let ng = 0; if (pts) { ng = Math.min(G.max, pts.length / 7 | 0); for (let i = 0; i < ng; i++) { const o = i * 7; G.p[i * 3] = pts[o]; G.p[i * 3 + 1] = pts[o + 1]; G.p[i * 3 + 2] = pts[o + 2]; G.c[i * 3] = pts[o + 3]; G.c[i * 3 + 1] = pts[o + 4]; G.c[i * 3 + 2] = pts[o + 5]; G.s[i] = pts[o + 6]; } }
    this.glowG.setDrawRange(0, ng); ["position", "gcol", "gsize"].forEach(a => this.glowG.attributes[a].needsUpdate = true); this.glowMat.uniforms.uScale.value = h * .9; this.glows.visible = ng > 0;
    if (rain && rain.length) { const n = Math.min(this.rainA.length, rain.length); this.rainA.set(rain.subarray(0, n)); this.rainG.setDrawRange(0, n / 3); this.rainG.attributes.position.needsUpdate = true; this.rain.visible = true;
      this.rainMat.color.setRGB(env.night > .5 ? .35 : .75, env.night > .5 ? .4 : .8, env.night > .5 ? .5 : .88); } else this.rain.visible = false;
    const R = this.rt; r.setRenderTarget(R.scene); r.clear(); r.render(this.scene, C);
    for (const k in this.prims) this.prims[k].n = 0;
    for (const k in this.models) this.models[k].n = 0;
    const pm = this.pm;
    if (q.ao) { const u = pm.ao.uniforms; u.tDepth.value = R.scene.depthTexture; u.pInv.value.copy(C.projectionMatrixInverse); u.res.value.set(w / 2, h / 2); u.projY.value = cam.proj[5]; this.pass(pm.ao, R.ao); }
    if (q.bloom) { const u = pm.bright.uniforms; u.tSrc.value = R.scene.texture; u.texel.value.set(1 / w, 1 / h); u.expo.value = env.expo; u.thr.value = env.night > .5 ? .9 : 1.4; this.pass(pm.bright, R.h1);
      const blur = (a, b, ww, hh) => { pm.blur.uniforms.tSrc.value = a.texture; pm.blur.uniforms.dir.value.set(1 / ww, 0); this.pass(pm.blur, b); pm.blur.uniforms.tSrc.value = b.texture; pm.blur.uniforms.dir.value.set(0, 1 / hh); this.pass(pm.blur, a); };
      const down = (a, b, ww, hh) => { pm.down.uniforms.tSrc.value = a.texture; pm.down.uniforms.texel.value.set(.5 / ww, .5 / hh); this.pass(pm.down, b); };
      blur(R.h1, R.h2, w / 2, h / 2); down(R.h1, R.q1, w / 2, h / 2); blur(R.q1, R.q2, w / 4, h / 4); down(R.q1, R.e1, w / 4, h / 4); blur(R.e1, R.e2, w / 8, h / 8); }
    const u = pm.comp.uniforms; u.tScene.value = R.scene.texture; u.tAO.value = q.ao ? R.ao.texture : this.white; u.aoTexel.value.set(1 / (w / 2), 1 / (h / 2)); u.aoK.value = q.ao ? .9 : 0;
    u.tB1.value = R.h1.texture; u.tB2.value = R.q1.texture; u.tB3.value = R.e1.texture; u.bloomK.value = q.bloom ? (env.night > .5 ? .75 : .35) : 0; u.expo.value = env.expo; u.night.value = env.night;
    if (q.fxaa) { this.pass(pm.comp, R.ldr); pm.fxaa.uniforms.tSrc.value = R.ldr.texture; pm.fxaa.uniforms.rcp.value.set(1 / w, 1 / h); this.pass(pm.fxaa, null); }
    else this.pass(pm.comp, null);
  }
  onRestore() { this.size = [0, 0]; this.envKey = ""; this.envRT = null; this.pmrem = new this.T.PMREMGenerator(this.r); if (this.sun.shadow.map) this.sun.shadow.map = null; }
  stats() { const i = this.r.info.render; return { calls: i.calls, tris: i.triangles }; }
}
