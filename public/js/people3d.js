/* Trà Đá Phố Cổ — nhân vật có khung xương và hoạt cảnh (models/nguoi.glb).
   Người ở gần máy quay được vẽ bằng nhân vật có khung xương; ở xa, hoặc khi đã dùng hết số nhân vật cho phép,
   game vẽ bằng hình khối cũ như trước. Không cần sửa game.js: tệp này thay hàm personParts và
   chèn thêm vào Renderer.inst / Renderer.render. */
"use strict";
(() => {
  if (typeof Renderer === "undefined" || typeof personParts === "undefined") return;
  const T3 = window.THREE, G = window.__PEOPLE;
  const origPP = window.personParts;
  window.personParts = (P, p) => { P.a.push(["person", M4.id(), p, 0]); };
  window.personParts.orig = origPP;

  const lin = c => c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4);
  const hx = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
  const FIXED = { 4: "#1e1a18", 9: "#e2cf96", 10: "#b3261e", 11: "#e6c34a", 12: "#b5651d", 13: "#dfe8ea", 14: "#8a6a3a", 15: "#ecebe4", 16: "#5b6b3a", 17: "#f6efe0", 18: "#c9954a", 19: "#a65a50" };
  const HATS = { non: "hat_non", coi: "hat_coi", cap: "hat_cap", len: "hat_len", kepi: "hat_kepi", dpcap: "hat_dp", helmet: "hat_helmet" };
  const ITEMS = { cup: ["it_cup", "it_tea"], coffee: ["it_coffee"], ice: ["it_ice"], pour: ["it_pour"], fan: ["it_fan"], loa: ["it_loa"], chess: ["it_piece"] };
  const GOODS = { hoa: "#e8506a", qua: "#f08a24", banhmi: "#d9a45a", xoi: "#f2efe2", ngo: "#e2b53a" };
  const ACCS = ["hat_non", "hat_coi", "hat_cap", "hat_len", "hat_kepi", "hat_dp", "hat_helmet", "beard", "scarf", "badge", "boards", "band", "belt",
    "it_cup", "it_tea", "it_coffee", "it_ice", "it_pour", "it_fan", "it_loa", "it_piece", "it_pole"];
  const CAP = { low: 14, mid: 26, high: 40 }, NEAR = { low: 20, mid: 32, high: 46 };
  const frac = x => x - Math.floor(x);

  function cloneSkinned(src) {
    const cl = src.clone(true), a = [], b = []; src.traverse(o => a.push(o)); cl.traverse(o => b.push(o));
    a.forEach((o, i) => { if (o.isSkinnedMesh) { const s = o.skeleton; b[i].bind(new T3.Skeleton(s.bones.map(x => b[a.indexOf(x)]), s.boneInverses), o.bindMatrix); } });
    return cl;
  }
  function makeMat() {
    const m = new T3.MeshStandardMaterial({ vertexColors: true, roughness: .72, metalness: 0 }); m.envMapIntensity = .45;
    const pal = []; for (let i = 0; i < 20; i++) pal.push(new T3.Color(1, 1, 1));
    for (const k in FIXED) { const c = hx(FIXED[k]); pal[k].setRGB(lin(c[0]), lin(c[1]), lin(c[2])); }
    m.userData.pal = pal;
    m.onBeforeCompile = sh => { sh.uniforms.uPal = { value: pal };
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute float _region;\nvarying float vReg;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvReg = _region;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform vec3 uPal[20];\nvarying float vReg;").replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.rgb *= uPal[int(vReg + .5)];"); };
    m.customProgramCacheKey = () => "tdpcPerson"; return m;
  }

  class People {
    constructor(R) { this.R = R; this.slots = []; this.used = 0; this.src = G.scene; this.clips = G.animations; this.dur = {}; for (const c of this.clips) this.dur[c.name] = c.duration; }
    slot() {
      const s = { root: cloneSkinned(this.src), mat: makeMat(), n: {}, act: {}, on: [] };
      s.root.matrixAutoUpdate = false;
      s.root.traverse(o => { if (o.isMesh) { o.material = s.mat; o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } if (o.name) s.n[o.name] = o; });
      ACCS.forEach(k => { if (s.n[k]) s.n[k].visible = false; });
      s.mixer = new T3.AnimationMixer(s.root);
      for (const c of this.clips) { const a = s.mixer.clipAction(c); a.play(); a.enabled = false; a.timeScale = 0; s.act[c.name] = a; }
      this.R.scene.add(s.root); this.slots.push(s); return s;
    }
    take() { const tier = this.R.tier || "mid"; if (this.used >= CAP[tier]) return null; return this.slots[this.used] || this.slot(); }
    place(W, p) {
      const s = this.take(); if (!s) return false; this.used++;
      s.root.matrix.fromArray(W); s.root.matrixWorldNeedsUpdate = true; s.root.visible = true;
      const L = p.look || {}, pal = s.mat.userData.pal, set = (i, c) => { if (c) pal[i].setRGB(lin(c[0]), lin(c[1]), lin(c[2])); };
      set(0, L.skin); set(1, L.shirt); set(2, L.pants); set(3, L.hair); set(5, L.hatC || L.helmet || [.5, .5, .5]); set(6, L.scarf || L.band); set(8, (L.sleeve === "long" || L.coat) ? L.shirt : L.skin);
      if (p.carry) set(7, hx(GOODS[p.carry] || "#d9a45a"));
      const want = {}; const hat = HATS[L.hat]; if (hat) want[hat] = 1;
      if (L.beard) want.beard = 1; if (L.scarf) want.scarf = 1; if (L.badge) want.badge = 1; if (L.board) want.boards = 1; if (L.band) want.band = 1; if (L.belt) want.belt = 1;
      const pose = p.pose || "stand", act = p.act, hold = p.hold || (act && pose === "sit" && (act.type === "cheers" || act.type === "offer") ? "cup" : null);
      (ITEMS[hold] || []).forEach(k => want[k] = 1); if (p.carry) want.it_pole = 1;
      for (const k of ACCS) { const o = s.n[k]; if (o) o.visible = !!want[k]; }
      if (want.it_tea && s.n.it_tea) s.n.it_tea.scale.y = Math.max(.02, p.cup === undefined ? 1 : p.cup);
      const clock = performance.now() / 1000 + (p.seed || 0) * 17, D = this.dur; let base = "stand", bt = 0;
      if (pose === "walk") { base = p.carry ? "walk_carry" : "walk"; bt = frac((p.phase || 0) / 6.2832) * D[base]; }
      else if (pose === "pedal") { base = "pedal"; bt = frac((p.phase || 0) / 6.2832) * D.pedal; }
      else if (pose === "ride") { base = "ride"; bt = frac(clock / D.ride) * D.ride; }
      else if (pose === "sit") { base = hold === "chess" ? "sit_chess" : hold === "fan" ? "sit_fan" : hold === "pour" ? "sit_pour" : "sit";
        bt = base === "sit_pour" ? (act && act.type === "pour" ? Math.min(1, act.k) * D.sit_pour : 0) : frac(clock / D[base]) * D[base]; }
      else { base = hold === "loa" ? "stand_loa" : hold === "ice" ? "stand_ice" : "stand"; bt = frac(clock / D[base]) * D[base]; }
      let over = null, ot = 0;
      if (act && act.type !== "pour") { const n = (pose === "sit" ? "sit_" : "stand_") + act.type; if (s.act[n]) { over = n; ot = Math.min(1, Math.max(0, act.k)) * D[n]; } }
      const on = over ? [[over, ot, 1]] : [[base, bt, 1]];
      for (const n of s.on) if (!on.some(x => x[0] === n)) s.act[n].enabled = false;
      for (const [n, t, w] of on) { const a = s.act[n]; a.enabled = true; a.setEffectiveWeight(w); a.time = t; }
      s.on = on.map(x => x[0]); s.mixer.update(0);
      const head = s.n.head; if (head) { if (!act && (pose === "sit" || pose === "stand") && hold !== "chess" && hold !== "loa") head.rotation.y += Math.sin(clock * .33) * Math.sin(clock * .11 + 2) * .45; if (p.lookUp) head.rotation.x -= .3 * p.lookUp; }
      return true;
    }
    hideRest() { for (let i = this.used; i < this.slots.length; i++) this.slots[i].root.visible = false; }
  }

  const oInst = Renderer.prototype.inst, oRender = Renderer.prototype.render;
  const tmp = new Parts();
  Renderer.prototype.inst = function (name, mtx, c, em) {
    if (name !== "person") return oInst.call(this, name, mtx, c, em);
    if (G && !this._ppl) this._ppl = new People(this);
    const e = this.eye || [0, 0, 0], dx = mtx[12] - e[0], dz = mtx[14] - e[2];
    if (this._ppl && dx * dx + dz * dz < NEAR[this.tier || "mid"] ** 2 && this._ppl.place(mtx, c)) return;
    tmp.a.length = 0; origPP(tmp, c); for (const [p, m, cc, ee] of tmp.a) oInst.call(this, p, mm(mtx, m), cc, ee);
  };
  Renderer.prototype.render = function (cam, env, pts, rain) {
    if (this._ppl) this._ppl.hideRest();
    oRender.call(this, cam, env, pts, rain);
    if (this._ppl) this._ppl.used = 0;
  };
})();
