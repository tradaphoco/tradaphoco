/* Cờ tướng: luật đi quân, chiếu, hết nước, máy đánh đơn giản. Dùng chung cho trình duyệt và máy chủ. */
(function (root) {
  "use strict";
  const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], DG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const VAL = { k: 10000, a: 20, e: 20, h: 40, r: 90, c: 45, p: 10 };
  const side = p => p ? (p === p.toUpperCase() ? "r" : "b") : null;
  function init() { const b = new Array(90).fill(""), back = "rheakaehr";
    for (let c = 0; c < 9; c++) { b[c] = back[c]; b[81 + c] = back[c].toUpperCase(); } b[19] = b[25] = "c"; b[64] = b[70] = "C";
    for (let c = 0; c < 9; c += 2) { b[27 + c] = "p"; b[54 + c] = "P"; } return b; }
  function pseudo(b, s) { const out = [];
    for (let i = 0; i < 90; i++) { const p = b[i]; if (!p || side(p) !== s) continue; const r = (i / 9) | 0, c = i % 9, t = p.toLowerCase(), red = s === "r";
      const ok = (rr, cc) => rr >= 0 && rr <= 9 && cc >= 0 && cc <= 8;
      const add = (rr, cc) => { if (!ok(rr, cc)) return false; const j = rr * 9 + cc, q = b[j]; if (q && side(q) === s) return false; out.push([i, j]); return !q; };
      const pal = (rr, cc) => cc >= 3 && cc <= 5 && (red ? rr >= 7 && rr <= 9 : rr >= 0 && rr <= 2);
      if (t === "k") { for (const [dr, dc] of D4) if (pal(r + dr, c + dc)) add(r + dr, c + dc); }
      else if (t === "a") { for (const [dr, dc] of DG) if (pal(r + dr, c + dc)) add(r + dr, c + dc); }
      else if (t === "e") { for (const [dr, dc] of DG) { const rr = r + 2 * dr, cc = c + 2 * dc; if (!ok(rr, cc) || (red ? rr < 5 : rr > 4) || b[(r + dr) * 9 + c + dc]) continue; add(rr, cc); } }
      else if (t === "h") { for (const [dr, dc] of D4) { const lr = r + dr, lc = c + dc; if (!ok(lr, lc) || b[lr * 9 + lc]) continue; if (dr) { add(r + 2 * dr, c - 1); add(r + 2 * dr, c + 1); } else { add(r - 1, c + 2 * dc); add(r + 1, c + 2 * dc); } } }
      else if (t === "r") { for (const [dr, dc] of D4) { let rr = r + dr, cc = c + dc; while (ok(rr, cc)) { if (!add(rr, cc)) break; rr += dr; cc += dc; } } }
      else if (t === "c") { for (const [dr, dc] of D4) { let rr = r + dr, cc = c + dc, jumped = false;
          while (ok(rr, cc)) { const q = b[rr * 9 + cc]; if (!jumped) { if (!q) out.push([i, rr * 9 + cc]); else jumped = true; } else if (q) { if (side(q) !== s) out.push([i, rr * 9 + cc]); break; } rr += dr; cc += dc; } } }
      else if (t === "p") { const f = red ? -1 : 1; add(r + f, c); if (red ? r <= 4 : r >= 5) { add(r, c - 1); add(r, c + 1); } } }
    return out; }
  const kingPos = (b, s) => b.indexOf(s === "r" ? "K" : "k");
  function inCheck(b, s) { const kp = kingPos(b, s); if (kp < 0) return true; const o = s === "r" ? "b" : "r", op = kingPos(b, o);
    if (op >= 0 && op % 9 === kp % 9) { let blocked = false; for (let j = Math.min(op, kp) + 9; j < Math.max(op, kp); j += 9) if (b[j]) { blocked = true; break; } if (!blocked) return true; }
    return pseudo(b, o).some(m => m[1] === kp); }
  const apply = (b, m) => { const n = b.slice(); n[m[1]] = n[m[0]]; n[m[0]] = ""; return n; };
  const legal = (b, s) => pseudo(b, s).filter(m => !inCheck(apply(b, m), s));
  function evalB(b) { let v = 0; for (let i = 0; i < 90; i++) { const p = b[i]; if (!p) continue; const t = p.toLowerCase(), r = (i / 9) | 0; let x = VAL[t]; if (t === "p" && (p === "P" ? r <= 4 : r >= 5)) x += 10; v += p === t ? -x : x; } return v; }
  function aiMove(b, s) { const ms = legal(b, s); if (!ms.length) return null; const sg = s === "r" ? 1 : -1, os = s === "r" ? "b" : "r"; let best = -1e9, bm = ms[0];
    for (const m of ms) { const nb = apply(b, m), rep = pseudo(nb, os); let worst = rep.length ? 1e9 : 1e6; for (const r of rep) { const v = sg * evalB(apply(nb, r)); if (v < worst) worst = v; }
      const sc = worst + Math.random() * 4; if (sc > best) { best = sc; bm = m; } } return bm; }
  function newGame() { return { b: init(), turn: "r", last: null, status: "play", winner: null, check: false, n: 0 }; }
  function move(g, s, f, t) { if (g.status !== "play" || g.turn !== s) return false; if (!legal(g.b, s).some(m => m[0] === f && m[1] === t)) return false;
    g.b = apply(g.b, [f, t]); g.last = [f, t]; g.n++; g.turn = s === "r" ? "b" : "r"; g.check = inCheck(g.b, g.turn);
    if (!legal(g.b, g.turn).length) { g.status = "over"; g.winner = s; } else if (g.n >= 300) { g.status = "over"; g.winner = null; } return true; }
  const XQ = { init, pseudo, legal, inCheck, apply, aiMove, newGame, move, side };
  if (typeof module !== "undefined" && module.exports) module.exports = XQ; else root.XQ = XQ;
})(typeof self !== "undefined" ? self : this);
