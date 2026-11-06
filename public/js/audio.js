/* Trà Đá Phố Cổ — âm thanh phố 3D theo vị trí, nhạc nền tự soạn, "Đài phố cổ" */
"use strict";
const rand = (a, b) => a + Math.random() * (b - a);
const VOWEL = { a: [760, 1250], i: [300, 2250], o: [500, 860], "ơ": [480, 1350], u: [350, 760], e: [540, 1850], "ê": [420, 2000], "ư": [360, 1350] };
const Snd = { ctx: null, out: null, city: null, rainG: null, cityOn: true, cityVol: .8, lis: [0, 0, 0], _bird: 2, _pho: 3, _wind: 8,
  init() { if (this.ctx) { if (this.ctx.state === "suspended") this.ctx.resume(); return; } const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
    this.ctx = new A(); this.out = this.ctx.createGain(); this.out.connect(this.ctx.destination); this.city = this.ctx.createGain(); this.city.gain.value = this.cityVol; this.city.connect(this.out);
    this.noiseB = this.buf(2, false); this.ambient(); this.initSpatial(); },
  buf(sec, brown) { const c = this.ctx, n = Math.floor(c.sampleRate * sec), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); let last = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + .02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; } return b; },
  ambient() { const c = this.ctx, tr = c.createBufferSource(); tr.buffer = this.buf(4, true); tr.loop = true; const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 460;
    const g = c.createGain(); g.gain.value = .13; tr.connect(lp); lp.connect(g); g.connect(this.city); tr.start();
    const rn = c.createBufferSource(); rn.buffer = this.noiseB; rn.loop = true; const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1400;
    this.rainG = c.createGain(); this.rainG.gain.value = 0; rn.connect(hp); hp.connect(this.rainG); this.rainG.connect(this.city); rn.start(); },
  setRain(on) { if (this.ctx) this.rainG.gain.setTargetAtTime(on ? .12 : 0, this.ctx.currentTime, .8); },
  setCity() { if (this.ctx) this.city.gain.setTargetAtTime(this.cityOn ? this.cityVol : 0, this.ctx.currentTime, .1); },
  ok() { return this.ctx && this.cityOn && this.cityVol > 0; },
  env(node, t, peak, dur, dest) { const g = this.ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + dur); node.connect(g); g.connect(dest || this.city); return g; },
  tone(f, t, dur, v, type, dest) { const o = this.ctx.createOscillator(); o.type = type || "sine"; o.frequency.value = f; this.env(o, t, v, dur, dest); o.start(t); o.stop(t + dur + .05); },
  clink() { if (!this.ok()) return; const t = this.ctx.currentTime; for (let i = 0; i < 3; i++) this.tone(rand(2200, 4000), t + i * .05, .3, .05); },
  crack() { if (!this.ok()) return; const c = this.ctx, t = c.currentTime, s = c.createBufferSource(); s.buffer = this.noiseB; const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = rand(2200, 3200); bp.Q.value = 3; s.connect(bp); this.env(bp, t, .5, .05); s.start(t, Math.random()); s.stop(t + .08); },
  nod() { if (!this.ok()) return; const t = this.ctx.currentTime; this.tone(660, t, .25, .035, "triangle"); this.tone(880, t + .1, .3, .03, "triangle"); },
  join() { if (!this.ok()) return; const t = this.ctx.currentTime; this.tone(523, t, .4, .04, "triangle"); this.tone(784, t + .12, .5, .035, "triangle"); },
  chime() { if (!this.ctx) return; const t = this.ctx.currentTime; [659, 784, 988].forEach((f, i) => this.tone(f, t + i * .08, .5, .05, "triangle", this.out)); },
  piece() { if (!this.ctx) return; const t = this.ctx.currentTime; this.tone(320, t, .08, .12, "triangle", this.out); this.tone(1400, t, .03, .05, "square", this.out); },
  shutter() { if (!this.ctx) return; const c = this.ctx, t = c.currentTime, s = c.createBufferSource(); s.buffer = this.noiseB; const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 2500; s.connect(bp); this.env(bp, t, .4, .06, this.out); this.env(bp, t + .09, .3, .05, this.out); s.start(t); s.stop(t + .2); },
  setP(pn, p) { if (pn.positionX) { const t = this.ctx.currentTime; pn.positionX.setTargetAtTime(p[0], t, .03); pn.positionY.setTargetAtTime(p[1], t, .03); pn.positionZ.setTargetAtTime(p[2], t, .03); } else pn.setPosition(p[0], p[1], p[2]); },
  setListener(p, f) { if (!this.ctx) return; const L = this.ctx.listener, t = this.ctx.currentTime; this.lis = p;
    if (L.positionX) { L.positionX.setTargetAtTime(p[0], t, .03); L.positionY.setTargetAtTime(p[1], t, .03); L.positionZ.setTargetAtTime(p[2], t, .03); L.forwardX.setTargetAtTime(f[0], t, .03); L.forwardY.setTargetAtTime(f[1], t, .03); L.forwardZ.setTargetAtTime(f[2], t, .03); L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0; }
    else { L.setPosition(p[0], p[1], p[2]); L.setOrientation(f[0], f[1], f[2], 0, 1, 0); } },
  spot(p, ref, roll) { const pn = this.ctx.createPanner(); pn.panningModel = "HRTF"; pn.distanceModel = "inverse"; pn.refDistance = ref || 3; pn.maxDistance = 400; pn.rolloffFactor = roll || 1.15;
    if (pn.positionX) { pn.positionX.value = p[0]; pn.positionY.value = p[1]; pn.positionZ.value = p[2]; } else pn.setPosition(p[0], p[1], p[2]); pn.connect(this.city); return pn; },
  dist(p) { return Math.hypot(p[0] - this.lis[0], p[2] - this.lis[2]); },
  honkAt(p, v) { if (!this.ok() || this.dist(p) > 90) return; const c = this.ctx, t = c.currentTime, d = this.spot(p, 4), lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1300;
    this.env(lp, t, .09 * (v || 1), .24, d); const f0 = rand(370, 440); [f0, f0 * 1.26].forEach(f => { const o = c.createOscillator(); o.type = "square"; o.frequency.value = f; o.connect(lp); o.start(t); o.stop(t + .26); }); },
  ringAt(p, v) { if (!this.ok() || this.dist(p) > 60) return; const t = this.ctx.currentTime, d = this.spot(p, 2.5); for (let i = 0; i < 3; i++) { this.tone(2350, t + i * .11, .18, .06 * (v || 1), "sine", d); this.tone(2900, t + i * .11, .14, .04 * (v || 1), "sine", d); } },
  tramAt(p) { if (!this.ok() || this.dist(p) > 120) return; const t = this.ctx.currentTime, d = this.spot(p, 6); for (let i = 0; i < 4; i++) { const tt = t + i * .32, f = i % 2 ? 1175 : 880; this.tone(f, tt, .9, .12, "triangle", d); this.tone(f * 2.76, tt, .4, .035, "sine", d); } },
  hornAt(p) { if (!this.ok() || this.dist(p) > 220) return; const c = this.ctx, t = c.currentTime, d = this.spot(p, 12, .8), lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900;
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.12, t + .1); g.gain.setValueAtTime(.12, t + 1.5); g.gain.linearRampToValueAtTime(0, t + 1.8); lp.connect(g); g.connect(d);
    [233, 293, 349].forEach(f => { const o = c.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.connect(lp); o.start(t); o.stop(t + 1.9); }); },
  bellAt(p) { if (!this.ok() || this.dist(p) > 80) return; const t = this.ctx.currentTime, d = this.spot(p, 3); this.tone(1480, t, .25, .07, "square", d); this.tone(1480, t + .3, .25, .07, "square", d); },
  clinkAt(p, v) { if (!this.ok() || this.dist(p) > 25) return; const t = this.ctx.currentTime, d = this.spot(p, 1.5); for (let i = 0; i < 2; i++) this.tone(rand(2200, 3800), t + i * .05, .25, .05 * (v || 1), "sine", d); },
  pourAt(p) { if (!this.ok()) return; const c = this.ctx, t = c.currentTime, s = c.createBufferSource(); s.buffer = this.noiseB; const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 4;
    bp.frequency.setValueAtTime(700, t); bp.frequency.linearRampToValueAtTime(1500, t + 1.1); const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.3, t + .15); g.gain.linearRampToValueAtTime(0, t + 1.15);
    s.connect(bp); bp.connect(g); g.connect(this.spot(p, 2)); s.start(t); s.stop(t + 1.3); },
  stamp() { if (!this.ctx) return; const c = this.ctx, t = c.currentTime, s = c.createBufferSource(); s.buffer = this.noiseB; const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 500;
    this.env(lp, t, .45, .18, this.out); s.connect(lp); s.start(t); s.stop(t + .3); const o = c.createOscillator(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(55, t + .2); this.env(o, t, .35, .25, this.out); o.start(t); o.stop(t + .3);
    [784, 988, 1175].forEach((f, i) => this.tone(f, t + .25 + i * .09, .5, .05, "triangle", this.out)); },
  voiceAt(p, sy, o) { if (!this.ok() || (p && this.dist(p) > 70)) return 0; o = o || {}; const c = this.ctx; let t = c.currentTime + .05; const t0 = t;
    const dest = p ? this.spot(p, o.ref || 3) : this.city, out = c.createGain(); out.gain.value = o.vol || .5;
    if (o.mega) { const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 550; const ws = c.createWaveShaper(), cv = new Float32Array(256); for (let i = 0; i < 256; i++) cv[i] = Math.tanh((i / 128 - 1) * 6); ws.curve = cv;
      const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 3400; out.connect(hp); hp.connect(ws); ws.connect(lp); const g = c.createGain(); g.gain.value = .35; lp.connect(g); g.connect(dest);
      [1046, 1318].forEach((f, i) => this.tone(f, t - .02 + i * .1, .12, .05, "square", dest)); t += .3; } else out.connect(dest);
    const src = c.createOscillator(); src.type = "sawtooth"; const vib = c.createOscillator(); vib.frequency.value = 5.2; const vg = c.createGain(); vg.gain.value = o.vib || 5; vib.connect(vg); vg.connect(src.frequency);
    const amp = c.createGain(); amp.gain.value = 0; src.connect(amp); const f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(), g2 = c.createGain(); f1.type = f2.type = "bandpass"; f1.Q.value = 7; f2.Q.value = 10; g2.gain.value = .55;
    amp.connect(f1); amp.connect(f2); f1.connect(out); f2.connect(g2); g2.connect(out);
    for (const [v, p0, p1, d] of sy) { const F = VOWEL[v] || VOWEL.a; f1.frequency.setTargetAtTime(F[0], t, .02); f2.frequency.setTargetAtTime(F[1], t, .02); src.frequency.setValueAtTime(p0, t); src.frequency.linearRampToValueAtTime(p1, t + d);
      amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime(1, t + .035); amp.gain.setValueAtTime(1, t + d - .05); amp.gain.linearRampToValueAtTime(0, t + d); t += d + .045; }
    src.start(t0); vib.start(t0); src.stop(t + .1); vib.stop(t + .1); return t - t0; },
  initSpatial() { const c = this.ctx;
    this.eng = []; for (let i = 0; i < 5; i++) { const pn = this.spot([0, -60, 0], 3.5), g = c.createGain(); g.gain.value = 0; const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 420;
      const o = c.createOscillator(); o.type = "sawtooth"; o.frequency.value = 50; const o2 = c.createOscillator(); o2.type = "square"; o2.frequency.value = 101; const g2 = c.createGain(); g2.gain.value = .25;
      const n = c.createBufferSource(); n.buffer = this.noiseB; n.loop = true; const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1100; bp.Q.value = .8; const ng = c.createGain(); ng.gain.value = .22;
      o.connect(lp); o2.connect(g2); g2.connect(lp); n.connect(bp); bp.connect(ng); ng.connect(g); lp.connect(g); g.connect(pn); o.start(); o2.start(); n.start(0, Math.random()); this.eng.push({ pn, g, o, o2 }); }
    const rumble = () => { const pn = this.spot([0, -60, 0], 6), g = c.createGain(); g.gain.value = 0; const o = c.createOscillator(); o.type = "sawtooth"; o.frequency.value = 34; const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 180;
      const n = c.createBufferSource(); n.buffer = this.noiseB; n.loop = true; const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 2600; bp.Q.value = 3; const ng = c.createGain(); ng.gain.value = .12;
      o.connect(lp); lp.connect(g); n.connect(bp); bp.connect(ng); ng.connect(g); g.connect(pn); o.start(); n.start(); return { pn, g }; };
    this.tramV = rumble(); this.trainV = rumble();
    this.babStall = this.babble([76, 1.1, -6.8], 2.5); this.babMarket = this.babble([26, 1.4, -6.5], 3); this.babPho = this.babble([47, 1.4, 6.5], 2.5); this.babPho.gain.value = .14; this.babDX = this.babble([-28, 1.4, -6.5], 4);
    [[222, 0, -18], [222, 0, 18], [-104, -4, 0]].forEach(p => { const n = c.createBufferSource(); n.buffer = this.noiseB; n.loop = true; const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 520; const g = c.createGain(); g.gain.value = .16;
      const l = c.createOscillator(); l.frequency.value = .18 + Math.random() * .1; const lg = c.createGain(); lg.gain.value = .1; l.connect(lg); lg.connect(g.gain); n.connect(lp); lp.connect(g); g.connect(this.spot(p, 6)); n.start(0, Math.random()); l.start(); }); },
  babble(p, ref) { const c = this.ctx, out = c.createGain(); out.gain.value = 0; out.connect(this.spot(p, ref));
    [[300, 2.3], [620, 3.1], [1250, 4.3], [2300, 2.9]].forEach(([f, r]) => { const n = c.createBufferSource(); n.buffer = this.noiseB; n.loop = true; const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = f; bp.Q.value = 3;
      const g = c.createGain(); g.gain.value = .5; const l = c.createOscillator(); l.frequency.value = r * (.75 + Math.random() * .5); const lg = c.createGain(); lg.gain.value = .5; l.connect(lg); lg.connect(g.gain); n.connect(bp); bp.connect(g); g.connect(out); n.start(0, Math.random() * 1.8); l.start(); }); return out; },
  updateEngines(list, tram, train) { if (!this.eng) return; const t = this.ctx.currentTime;
    this.eng.forEach((e, i) => { const it = list[i]; if (!it) { e.g.gain.setTargetAtTime(0, t, .2); return; } this.setP(e.pn, it.p); e.o.frequency.setTargetAtTime(40 + it.v * 6.5, t, .1); e.o2.frequency.setTargetAtTime((40 + it.v * 6.5) * 2.02, t, .1); e.g.gain.setTargetAtTime(it.moto ? .05 + it.v * .006 : 0, t, .15); });
    for (const [V, p, k] of [[this.tramV, tram, .22], [this.trainV, train, .5]]) { if (p) { this.setP(V.pn, p); V.g.gain.setTargetAtTime(k, t, .3); } else V.g.gain.setTargetAtTime(0, t, .3); } },
  zoneTick(dt, crowd, morning, winter) { if (!this.ctx) return; const t = this.ctx.currentTime;
    this.babStall.gain.setTargetAtTime(.03 + crowd * .028, t, .6); this.babMarket.gain.setTargetAtTime(morning ? .3 : .12, t, 1); this.babDX.gain.setTargetAtTime(morning ? .35 : .18, t, 1);
    this._bird -= dt; if (this._bird <= 0) { this._bird = 1.2 + Math.random() * 3.5; const p = [216 + Math.random() * 6, 4 + Math.random() * 2, (Math.random() - .5) * 120]; if (this.ok() && this.dist(p) < 80) this.chirp(p); }
    this._pho -= dt; if (this._pho <= 0) { this._pho = 1.5 + Math.random() * 4; const p = [45 + Math.random() * 4, 1, 7.2]; if (this.ok() && this.dist(p) < 40) { const d = this.spot(p, 1.5), tt = this.ctx.currentTime; this.tone(rand(1300, 1900), tt, .35, .06, "triangle", d); } }
    if (winter) { this._wind -= dt; if (this._wind <= 0) { this._wind = 7 + Math.random() * 10; this.gust(); } } },
  gust() { if (!this.ok()) return; const c = this.ctx, t = c.currentTime, s = c.createBufferSource(); s.buffer = this.noiseB; s.loop = true; const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(300, t); bp.frequency.linearRampToValueAtTime(900, t + 1.5); bp.frequency.linearRampToValueAtTime(350, t + 3.5); const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.12, t + 1.4); g.gain.linearRampToValueAtTime(0, t + 3.6);
    s.connect(bp); bp.connect(g); g.connect(this.city); s.start(t); s.stop(t + 3.8); },
  chirp(p) { const c = this.ctx, d = this.spot(p, 2.5); let t = c.currentTime; const n = 2 + Math.floor(Math.random() * 4), base = rand(2600, 3800);
    for (let i = 0; i < n; i++) { const o = c.createOscillator(); o.frequency.setValueAtTime(base, t); o.frequency.exponentialRampToValueAtTime(base * rand(1.2, 1.5), t + .07); this.env(o, t, .05, .1, d); o.start(t); o.stop(t + .14); t += rand(.09, .16); } }
};

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function mf(n) { return 440 * Math.pow(2, (NOTE[n[0]] + (parseInt(n.slice(1), 10) + 1) * 12 - 69) / 12); }
function seq(str, inst, v) { const ev = []; let t = 0; str.split(/\s+/).forEach(tok => { if (!tok || tok === "|") return; const [n, d] = tok.split(":"), dur = parseFloat(d); if (n !== "R") ev.push({ t, d: dur, f: mf(n), inst, v: v || 1 }); t += dur; }); return ev; }
function arp(roots, ints, step, inst, v) { const ev = []; let t = 0; roots.forEach(r => { const b = mf(r); ints.forEach(i => { ev.push({ t, d: step * 1.6, f: b * Math.pow(2, i / 12), inst, v }); t += step; }); }); return ev; }
function perBar(roots, beats, inst, v, dur) { const ev = []; roots.forEach((r, bar) => beats.forEach(b => ev.push({ t: bar * 4 + b, d: dur, f: mf(r), inst, v }))); return ev; }
const TRACKS = [
  { id: "som", title: "Sớm Hồ Gươm", sub: "Sáo trúc · đàn tranh · chậm, trong", tempo: 70, len: 32, build() { return [...seq("A4:1 C5:1 D5:2 | C5:1 A4:1 G4:2 | A4:1 G4:1 F4:1 D4:1 | F4:2 G4:2 | A4:1 C5:1 D5:1 F5:1 | D5:2 C5:2 | A4:1 G4:1 F4:1 G4:1 | D4:4", "sao", .9),
    ...arp(["D3", "C3", "D3", "G2", "D3", "C3", "F3", "D3"], [0, 7, 12, 7, 0, 7, 12, 19], .5, "tranh", .45), ...perBar(["D2", "C2", "D2", "G2", "D2", "C2", "F2", "D2"], [0], "bass", .6, 4)]; } },
  { id: "hoa", title: "Gánh hàng hoa", sub: "Đàn tranh · mõ · rộn ràng, buổi sớm", tempo: 104, len: 32, build() { return [...seq("D5:.5 C5:.5 A4:1 G4:.5 A4:.5 C5:1 | D5:.5 F5:.5 D5:.5 C5:.5 A4:2 | G4:.5 A4:.5 C5:.5 A4:.5 G4:.5 F4:.5 D4:1 | F4:1 G4:1 A4:2 | C5:.5 D5:.5 F5:1 D5:.5 C5:.5 A4:1 | G4:.5 A4:.5 C5:.5 D5:.5 A4:2 | G4:.5 F4:.5 D4:1 F4:.5 G4:.5 A4:1 | D4:4", "tranh", 1),
    ...perBar(["D2", "D2", "G2", "F2", "D2", "C2", "G2", "D2"], [0, 2], "bass", .7, 1.8), ...perBar(["D2", "D2", "D2", "D2", "D2", "D2", "D2", "D2"], [1, 3, 3.5], "mo", .7, .1)]; } },
  { id: "dem", title: "Đêm phố cổ", sub: "Đàn bầu · đàn tranh · trầm, chậm", tempo: 58, len: 32, build() { return [...seq("A4:2 G4:1 A4:1 | C5:3 A4:1 | G4:1 F4:1 D4:2 | F4:4 | G4:2 A4:1 C5:1 | D5:2 C5:1 A4:1 | G4:1 A4:1 F4:1 G4:1 | D4:4", "bau", 1),
    ...perBar(["D3", "D3", "D3", "D3", "D3", "D3", "D3", "D3"], [0], "pad", .5, 4), ...perBar(["A3", "A3", "A3", "C4", "D4", "A3", "C4", "A3"], [0], "pad", .35, 4), ...perBar(["D4", "C4", "D4", "F4", "G4", "D4", "F4", "D4"], [0, 2.5], "tranh", .35, 2)]; } },
  { id: "xuan", title: "Xuân về phố cổ", sub: "Đàn tranh · sáo · mõ · tươi vui", tempo: 96, len: 32, build() { return [...seq("G4:1 A4:.5 C5:.5 D5:1 C5:1 | A4:1 G4:.5 A4:.5 C5:2 | D5:1 E5:.5 D5:.5 C5:1 A4:1 | G4:2 A4:2 | C5:1 D5:.5 E5:.5 G5:1 E5:1 | D5:1 C5:.5 D5:.5 E5:2 | D5:.5 C5:.5 A4:1 G4:.5 A4:.5 C5:1 | G4:4", "sao", .9),
    ...arp(["G3", "C4", "G3", "D4", "C4", "G3", "D4", "G3"], [0, 7, 12, 16], 1, "tranh", .4), ...perBar(["G2", "C3", "G2", "D3", "C3", "G2", "D3", "G2"], [0, 2], "bass", .6, 1.6), ...perBar(["G2", "G2", "G2", "G2", "G2", "G2", "G2", "G2"], [1, 3], "mo", .6, .1)]; } }
];
const Music = { bus: null, vol: .7, cur: null, timer: 0, ev: null, idx: 0, loopStart: 0, spb: .8,
  ensureBus() { const c = Snd.ctx; this.bus = c.createGain(); this.bus.gain.value = this.vol; const rev = c.createDelay(1); rev.delayTime.value = .23; const fb = c.createGain(); fb.gain.value = .28; const wet = c.createGain(); wet.gain.value = .22;
    this.bus.connect(Snd.out); this.bus.connect(rev); rev.connect(fb); fb.connect(rev); rev.connect(wet); wet.connect(Snd.out); this.wet = wet; },
  play(id) { Snd.init(); if (!Snd.ctx) return; Radio.stopUser(); this.stop(true); const tr = TRACKS.find(t => t.id === id); if (!tr) return;
    this.ensureBus(); this.cur = tr; this.spb = 60 / tr.tempo; this.ev = tr.build().sort((a, b) => a.t - b.t); this.idx = 0; this.loopStart = Snd.ctx.currentTime + .15;
    this.timer = setInterval(() => this.tick(), 40); this.tick(); Radio.now = { type: "synth", id }; Radio.update(); },
  stop(silent) { clearInterval(this.timer); this.timer = 0; if (this.bus) { const b = this.bus, w = this.wet, t = Snd.ctx.currentTime; b.gain.setTargetAtTime(0, t, .12); w.gain.setTargetAtTime(0, t, .12); setTimeout(() => { try { b.disconnect(); w.disconnect(); } catch (e) { } }, 900); }
    this.bus = null; this.cur = null; if (!silent) { Radio.now = null; Radio.update(); } },
  setVol(v) { this.vol = v; if (this.bus) this.bus.gain.setTargetAtTime(v, Snd.ctx.currentTime, .05); },
  tick() { if (!this.bus) return; const now = Snd.ctx.currentTime; let guard = 0;
    while (guard++ < 200) { const e = this.ev[this.idx], t = this.loopStart + e.t * this.spb; if (t > now + .3) break; if (t > now - .05) this.note(e.inst, Math.max(t, now), e.f, e.d * this.spb, e.v);
      this.idx++; if (this.idx >= this.ev.length) { this.idx = 0; this.loopStart += this.cur.len * this.spb; } } },
  note(inst, t, f, dur, v) { const c = Snd.ctx, g = c.createGain(); g.connect(this.bus);
    if (inst === "tranh") { const o = c.createOscillator(), o2 = c.createOscillator(), g2 = c.createGain(), lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 3200;
      o.type = "triangle"; o2.type = "sine"; o.frequency.setValueAtTime(f * 1.012, t); o.frequency.exponentialRampToValueAtTime(f, t + .06); o2.frequency.value = f * 2; g2.gain.value = .3;
      const len = Math.min(2.6, dur + 1.2); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.16 * v, t + .006); g.gain.exponentialRampToValueAtTime(.0001, t + len);
      o.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); o.start(t); o2.start(t); o.stop(t + len + .05); o2.stop(t + len + .05); }
    else if (inst === "sao" || inst === "bau") { const o = c.createOscillator(), o2 = c.createOscillator(), g2 = c.createGain(), lfo = c.createOscillator(), lg = c.createGain(), end = t + dur, bau = inst === "bau";
      o.type = "sine"; o2.type = bau ? "sine" : "triangle"; if (bau) { o.frequency.setValueAtTime(f * .94, t); o.frequency.exponentialRampToValueAtTime(f, t + .16); } else o.frequency.value = f; o2.frequency.value = f * 2; g2.gain.value = bau ? .12 : .06;
      lfo.frequency.value = bau ? 4.8 : 5.3; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * (bau ? .014 : .007), t + Math.min(.5, dur * .7)); lfo.connect(lg); lg.connect(o.frequency);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime((bau ? .17 : .13) * v, t + (bau ? .05 : .07)); g.gain.linearRampToValueAtTime((bau ? .08 : .12) * v, Math.max(t + .08, end - .1)); g.gain.linearRampToValueAtTime(0, end + .15);
      o.connect(g); o2.connect(g2); g2.connect(g); [o, o2, lfo].forEach(x => { x.start(t); x.stop(end + .2); }); }
    else if (inst === "bass" || inst === "pad") { const o = c.createOscillator(); o.type = "sine"; o.frequency.value = f; g.gain.setValueAtTime(0, t);
      if (inst === "bass") { g.gain.linearRampToValueAtTime(.12 * v, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + dur + .4); } else { g.gain.linearRampToValueAtTime(.06 * v, t + dur * .4); g.gain.linearRampToValueAtTime(0, t + dur + .3); }
      o.connect(g); o.start(t); o.stop(t + dur + .5); }
    else if (inst === "mo") { const o = c.createOscillator(); o.frequency.setValueAtTime(1250, t); o.frequency.exponentialRampToValueAtTime(800, t + .05); g.gain.setValueAtTime(.09 * v, t); g.gain.exponentialRampToValueAtTime(.0001, t + .08); o.connect(g); o.start(t); o.stop(t + .1); } }
};
const SONGS = [["Nhớ mùa thu Hà Nội", "Trịnh Công Sơn"], ["Hà Nội mùa vắng những cơn mưa", "Trương Quý Hải"], ["Em ơi Hà Nội phố", "Phú Quang, thơ Phan Vũ"], ["Hướng về Hà Nội", "Hoàng Dương"], ["Nhớ về Hà Nội", "Hoàng Hiệp"], ["Hà Nội mùa thu", "Vũ Thanh"], ["Người Hà Nội", "Nguyễn Đình Thi"]];
const Radio = { now: null, user: [], audio: new Audio(),
  init(licensed) { const $ = id => document.getElementById(id);
    this.user = (licensed || []).map(t => ({ title: String(t.title || "Không tên"), sub: String(t.artist || ""), src: String(t.src || "") })).filter(t => t.src); this.audio.preload = "none";
    this.audio.addEventListener("ended", () => { if (this.now && this.now.type === "user" && this.user.length) this.playUser((this.now.i + 1) % this.user.length); });
    this.audio.addEventListener("error", () => { if (this.now && this.now.type === "user") { this.msg("Link hoặc file này không phát được."); this.now = null; this.update(); } });
    const sl = $("songList"); SONGS.forEach(([n, a]) => { const r = document.createElement("div"); r.className = "song"; const s = document.createElement("span"); s.textContent = n + " "; const sm = document.createElement("small"); sm.textContent = "— " + a; s.append(sm);
      const l = document.createElement("a"); l.href = "https://www.youtube.com/results?search_query=" + encodeURIComponent(n + " " + a.split(",")[0]); l.target = "_blank"; l.rel = "noopener noreferrer"; l.textContent = "Nghe ↗"; r.append(s, l); sl.append(r); });
    $("fileIn").addEventListener("change", e => { let n = 0; [...e.target.files].forEach(f => { if (!/^audio\//.test(f.type) && !/\.(mp3|m4a|ogg|wav|aac|flac)$/i.test(f.name)) return; this.user.push({ title: f.name.replace(/\.[^.]+$/, "").slice(0, 80), sub: "Từ máy của bạn", src: URL.createObjectURL(f), blob: true }); n++; });
      e.target.value = ""; this.msg(n ? "Đã thêm " + n + " bài." : "Không có file nhạc hợp lệ."); this.render(); });
    $("urlForm").addEventListener("submit", e => { e.preventDefault(); const u = $("urlIn").value.trim(); if (!/^https?:\/\/\S+$/i.test(u)) { this.msg("Link cần bắt đầu bằng http:// hoặc https://"); return; }
      let title = "Bài từ link"; try { const seg = new URL(u).pathname.split("/").filter(Boolean).pop(); if (seg) title = decodeURIComponent(seg).replace(/\.[^.]+$/, "").slice(0, 80) || title; } catch (_) { }
      this.user.push({ title, sub: "Từ link", src: u }); $("urlIn").value = ""; this.msg("Đã thêm “" + title + "”. Link phải trỏ thẳng tới file nhạc."); this.render(); });
    $("volMusic").addEventListener("input", e => { const v = e.target.value / 100; Music.setVol(v); this.audio.volume = v; });
    $("volCity").addEventListener("input", e => { Snd.cityVol = e.target.value / 100; Snd.setCity(); });
    $("mStop").addEventListener("click", () => this.stopAll()); $("mNext").addEventListener("click", () => this.next()); this.render(); },
  msg(s) { document.getElementById("radioMsg").textContent = s; },
  stopUser() { if (!this.audio.paused) this.audio.pause(); if (this.now && this.now.type === "user") this.now = null; },
  playUser(i) { const t = this.user[i]; if (!t) return; Snd.init(); Music.stop(true); this.audio.src = t.src; this.audio.volume = Music.vol; this.now = { type: "user", i }; this.update();
    this.audio.play().catch(() => { this.msg("Không phát được “" + t.title + "”."); this.now = null; this.update(); }); },
  stopAll() { Music.stop(); this.stopUser(); this.now = null; this.update(); },
  next() { const all = [...TRACKS.map(t => ({ type: "synth", id: t.id })), ...this.user.map((_, i) => ({ type: "user", i }))]; let k = -1;
    if (this.now) k = all.findIndex(a => a.type === this.now.type && (a.type === "synth" ? a.id === this.now.id : a.i === this.now.i)); const n = all[(k + 1) % all.length]; n.type === "synth" ? Music.play(n.id) : this.playUser(n.i); },
  update() { const np = document.getElementById("np"); np.textContent = !this.now ? "" : "♫ " + (this.now.type === "synth" ? TRACKS.find(t => t.id === this.now.id).title : this.user[this.now.i].title); this.render(); },
  row(title, sub, playing, onPlay, onDel) { const b = document.createElement("div"); b.className = "trkrow"; const btn = document.createElement("button"); btn.type = "button"; btn.className = "trk" + (playing ? " playing" : "");
    const ic = document.createElement("span"); ic.className = "ic"; ic.textContent = playing ? "❚❚" : "▶"; const tt = document.createElement("span"); tt.className = "tt"; const bb = document.createElement("b"); bb.textContent = title; const sm = document.createElement("small"); sm.textContent = sub; tt.append(bb, sm); btn.append(ic, tt);
    btn.addEventListener("click", () => playing ? this.stopAll() : onPlay()); b.append(btn);
    if (onDel) { const d = document.createElement("button"); d.type = "button"; d.className = "del"; d.textContent = "✕"; d.setAttribute("aria-label", "Xoá " + title); d.addEventListener("click", onDel); b.append(d); } return b; },
  render() { const sl = document.getElementById("synthList"); sl.textContent = ""; TRACKS.forEach(t => sl.append(this.row(t.title, t.sub, !!(this.now && this.now.type === "synth" && this.now.id === t.id), () => Music.play(t.id))));
    const ul = document.getElementById("userList"); ul.textContent = ""; if (!this.user.length) { const e = document.createElement("div"); e.className = "empty"; e.textContent = "Chưa có bài nào. Thêm file nhạc trên máy hoặc dán link."; ul.append(e); }
    this.user.forEach((t, i) => ul.append(this.row(t.title, t.sub || "Nhạc của bạn", !!(this.now && this.now.type === "user" && this.now.i === i), () => this.playUser(i), () => {
      if (this.now && this.now.type === "user") { if (this.now.i === i) this.stopAll(); else if (this.now.i > i) this.now.i--; } if (t.blob) URL.revokeObjectURL(t.src); this.user.splice(i, 1); this.update(); }))); }
};
