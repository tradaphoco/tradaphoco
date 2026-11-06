/* Trà Đá Phố Cổ — âm thanh bản 6.2: giọng nói tiếng Việt (tiếng rao, loa phường, cô bán hàng),
   tiếng xì xào trong quán bằng giọng người, tiếng máy xe số. File nằm trong public/sound/.
   Nếu file nào chưa tải được thì game dùng âm thanh tổng hợp như cũ. */
"use strict";
(() => {
  if (typeof Snd === "undefined") return;
  const FILES = ["rao_banhmi", "rao_banhmi2", "rao_xoi", "rao_hoa", "rao_qua", "rao_ngo", "loa_phuong", "dp_camon", "dp_viahe", "co_moi", "co_moi2", "co_ngoi", "xi_xao", "may_xe"];
  // game.js truyền chuỗi âm tiết giả lập; nhận dạng theo chuỗi nguyên âm để thay bằng câu nói thật
  const MAP = { "aaiooơ": ["rao_banhmi", "rao_banhmi2"], "oaooơ": ["rao_xoi"], "oươao": ["rao_hoa"], "aioơ": ["rao_qua"], "oưaưoơ": ["rao_ngo"],
    "uiuiêiaoêêoa": ["loa_phuong"], "aơaoo": ["dp_camon"], "aơiêa": ["dp_viahe"] };
  const B = {}; let loading = null;
  const babbleOuts = [];

  const oInit = Snd.init.bind(Snd);
  Snd.init = function () { oInit(); if (this.ctx && !loading) loading = load(); };
  async function load() {
    const ctx = Snd.ctx;
    await Promise.all(FILES.map(async f => { try { const r = await fetch("sound/" + f + ".mp3?v=6.2"); if (!r.ok) return; B[f] = await ctx.decodeAudioData(await r.arrayBuffer()); } catch (e) { console.warn("Không nạp được âm thanh " + f, e); } }));
    if (B.xi_xao) for (const o of babbleOuts) attachBabble(o);
  }
  function attachBabble(out) {
    const c = Snd.ctx, s = c.createBufferSource(); s.buffer = B.xi_xao; s.loop = true; s.playbackRate.value = .94 + Math.random() * .12;
    const g = c.createGain(); g.gain.value = 1.6; s.connect(g); g.connect(out); s.start(0, Math.random() * 20);
  }
  Snd.babble = function (p, ref) { const out = this.ctx.createGain(); out.gain.value = 0; out.connect(this.spot(p, ref)); babbleOuts.push(out); if (B.xi_xao) attachBabble(out); return out; };

  function megaChain(dest) {
    const c = Snd.ctx, hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 420;
    const pk = c.createBiquadFilter(); pk.type = "peaking"; pk.frequency.value = 1800; pk.Q.value = 1.2; pk.gain.value = 9;
    const ws = c.createWaveShaper(), cv = new Float32Array(512); for (let i = 0; i < 512; i++) { const x = i / 256 - 1; cv[i] = Math.tanh(x * 4) * .8; } ws.curve = cv;
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 3600;
    const dl = c.createDelay(.5); dl.delayTime.value = .19; const fb = c.createGain(); fb.gain.value = .22; // vọng giữa hai dãy nhà
    hp.connect(pk); pk.connect(ws); ws.connect(lp); lp.connect(dest); lp.connect(dl); dl.connect(fb); fb.connect(dl); fb.connect(dest);
    return hp;
  }
  const oVoice = Snd.voiceAt.bind(Snd);
  Snd.voiceAt = function (p, sy, o) {
    o = o || {}; const key = (sy || []).map(s => s[0]).join(""), list = MAP[key], name = list && list[Math.floor(Math.random() * list.length)];
    if (!name || !B[name]) return oVoice(p, sy, o);
    if (!this.ok() || (p && this.dist(p) > 70)) return 0;
    const c = this.ctx, t = c.currentTime + .05, dest = p ? this.spot(p, o.ref || 3, 1.05) : this.city, g = c.createGain(); g.gain.value = (o.vol || .5) * 1.5;
    const s = c.createBufferSource(); s.buffer = B[name]; s.playbackRate.value = .97 + Math.random() * .06;
    if (o.mega) { [1046, 1318].forEach((f, i) => this.tone(f, t - .02 + i * .1, .12, .05, "square", dest)); g.connect(megaChain(dest)); s.start(t + .3); }
    else { g.connect(dest); s.start(t); }
    s.connect(g); return B[name].duration + (o.mega ? .3 : 0);
  };
  const oPour = Snd.pourAt.bind(Snd); let lastSay = 0;
  Snd.pourAt = function (p) { oPour(p); const now = performance.now();
    if (now - lastSay > 25000 && Math.random() < .5) { lastSay = now; const n = ["co_moi", "co_moi2", "co_ngoi"][Math.floor(Math.random() * 3)];
      if (B[n] && this.ok()) { const c = this.ctx, s = c.createBufferSource(), g = c.createGain(); s.buffer = B[n]; g.gain.value = .55; s.connect(g); g.connect(this.spot([p[0] + .3, 1.2, p[2] - .8], 2.5)); s.start(c.currentTime + 1.3); } } };
  const oEng = Snd.updateEngines.bind(Snd);
  Snd.updateEngines = function (list, tram, train) {
    if (B.may_xe && this.eng && !this.eng[0].src) for (const e of this.eng) {
      try { e.o.disconnect(); e.o2.disconnect(); } catch (_) { }
      const s = this.ctx.createBufferSource(); s.buffer = B.may_xe; s.loop = true; s.start(0, Math.random() * 2); s.connect(e.g); e.src = s;
    }
    oEng(list, tram, train);
    if (this.eng && this.eng[0].src) { const t = this.ctx.currentTime;
      this.eng.forEach((e, i) => { const it = list[i]; if (it) { e.src.playbackRate.setTargetAtTime(.75 + it.v * .085, t, .15); e.g.gain.setTargetAtTime(it.moto ? .07 + it.v * .009 : 0, t, .15); } }); }
  };
  Snd.honkAt = function (p, v) { if (!this.ok() || this.dist(p) > 90) return; const c = this.ctx, d = this.spot(p, 4), t0 = c.currentTime, n = Math.random() < .6 ? 2 : 1;
    for (let k = 0; k < n; k++) { const t = t0 + k * .2, bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 900; bp.Q.value = .9; const g = c.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.075 * (v || 1), t + .01); g.gain.setValueAtTime(.075 * (v || 1), t + .12); g.gain.linearRampToValueAtTime(0, t + .15); bp.connect(g); g.connect(d);
      [415, 495].forEach(f => { const o = c.createOscillator(); o.type = "square"; o.frequency.value = f; o.connect(bp); o.start(t); o.stop(t + .17); }); } };
})();
