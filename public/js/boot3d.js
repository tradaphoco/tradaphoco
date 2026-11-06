/* Trà Đá Phố Cổ — nạp Three.js, bộ mô hình 3D, nhân vật có hoạt cảnh và các phần mở rộng trước khi dựng phố.
   Mô hình nào không nạp được thì game tự dùng hình khối cũ cho món đó, không bị dừng. */
import * as THREE from "./vendor/three.module.min.js";
import { GLTFLoader } from "./vendor/GLTFLoader.js";
window.THREE = THREE;

const V = "6.2.1";
const NAMES = ["stool", "moto", "sau", "lamp", "stall", "cyclo", "bike", "stool_lod", "moto_lod", "sau_lod", "lamp_lod", "cyclo_lod", "bike_lod"];
const EXTRA = ["people3d.js", "audio_vi.js", "community.js", "tutorial.js"];
const MODELS = window.__MODELS = {};
const msg = t => { const el = document.querySelector("#bootLoad span"); if (el) el.textContent = t; };
const qs = new URLSearchParams(location.search);

if (!qs.has("nomodels")) {
  const loader = new GLTFLoader(); let done = 0; const total = NAMES.length + 1;
  const tick = () => msg("Đang dựng phố cổ… (nạp mô hình " + (++done) + "/" + total + ")");
  msg("Đang dựng phố cổ… (nạp mô hình 0/" + total + ")");
  const one = (file, ok) => new Promise(res => {
    const t = setTimeout(res, 25000);
    loader.load("models/" + file + ".glb?v=" + V, g => { ok(g); clearTimeout(t); tick(); res(); }, undefined, e => { console.warn("Không nạp được mô hình " + file + ", dùng hình khối cũ.", e); clearTimeout(t); tick(); res(); });
  });
  await Promise.all([...NAMES.map(n => one(n, g => { MODELS[n] = g.scene; })), qs.has("nopeople") ? Promise.resolve() : one("nguoi", g => { window.__PEOPLE = g; })]);
  msg("Đang dựng phố cổ…");
}

/* Thay ghế nhựa, xe máy, xích lô, xe đạp vẽ bằng khối hộp bằng mô hình, giữ nguyên mọi chỗ gọi trong game.js */
if (MODELS.stool) { const orig = window.stoolParts; window.stoolParts = (P, col) => { P.a.push(["model:stool", M4.id(), col, 0]); }; window.stoolParts.orig = orig; }
if (MODELS.moto) {
  const orig = window.motoParts; let baseN = null;
  window.motoParts = (P, v, night) => {
    if (baseN === null) { const t = new Parts(); orig(t, { color: [1, 1, 1], cargo: "none", seed: .1 }, false); baseN = t.a.length; }
    P.a.push(["model:moto", M4.id(), v.color, 1]);
    if (v.cargo && v.cargo !== "none") { const t = new Parts(); orig(t, v, night); for (let i = baseN; i < t.a.length; i++) P.a.push(t.a[i]); }
  };
}
if (MODELS.cyclo) window.cycloParts = (P, v) => { P.a.push(["model:cyclo", M4.id(), v.hood || [.2, .3, .25], 1]); };
if (MODELS.bike) window.bikeParts = (P) => { P.a.push(["model:bike", M4.id(), [1, 1, 1], 0]); };
const bake = Parts.prototype.bake;
Parts.prototype.bake = function (B, W) {
  const keep = [];
  for (const e of this.a) { if (e[0].startsWith("model:")) window.__R3.addStatic(e[0].slice(6), W ? mm(W, e[1]) : e[1], e[2], 0); else keep.push(e); }
  const all = this.a; this.a = keep; bake.call(this, B, W); this.a = all;
};

/* Các phần mở rộng của bản 6.2: nhân vật, giọng Việt, cộng đồng, hướng dẫn chơi */
for (const f of EXTRA) {
  await new Promise(res => { const s = document.createElement("script"); s.src = "js/" + f + "?v=" + V; s.onload = res; s.onerror = () => { console.warn("Không nạp được " + f); res(); }; document.body.appendChild(s); });
}
dispatchEvent(new Event("three-ready"));
