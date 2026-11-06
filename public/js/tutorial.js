/* Trà Đá Phố Cổ — hướng dẫn chơi cho người mới: 5 bước ngắn, tự nhận biết khi người chơi làm xong từng bước.
   Hiện một lần cho người chơi lần đầu; mở lại trong ☰ › “Hướng dẫn nhanh”. */
"use strict";
(() => {
  const $ = id => document.getElementById(id), KEY = "tdpc_tut";
  const css = document.createElement("style");
  css.textContent = `.tut{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 150px);transform:translateX(-50%);z-index:9;width:min(92vw,420px);background:rgba(250,244,231,.97);border-radius:16px;
    box-shadow:0 10px 30px rgba(20,12,6,.4);padding:14px 16px 12px;border:2px solid #9b2c24;font-size:15px;line-height:1.5;color:#2a2320;animation:tutIn .35s ease}
  .tut .st{font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#9b2c24}.tut h4{font:700 19px Georgia,serif;margin:2px 0 4px}
  .tut .dots{display:flex;gap:5px;margin:8px 0 2px}.tut .dots i{flex:1;height:4px;border-radius:9px;background:#e3d3b2}.tut .dots i.on{background:#9b2c24}
  .tut .row{display:flex;justify-content:space-between;align-items:center;margin-top:8px}.tut button{border:0;border-radius:10px;padding:8px 12px;font-weight:700;cursor:pointer;font-size:13px}
  .tut .skip{background:transparent;opacity:.65}.tut .go{background:#9b2c24;color:#fff}.tut .ok{color:#2f6e3a;font-weight:700}
  .tut-hl{position:relative;z-index:6;animation:tutPulse 1.3s ease-in-out infinite;outline:3px solid #f0b429;outline-offset:3px}
  @keyframes tutPulse{50%{outline-color:rgba(240,180,41,.25);box-shadow:0 0 0 10px rgba(240,180,41,.18)}}@keyframes tutIn{from{opacity:0;transform:translate(-50%,14px)}}
  @media (max-width:600px){.tut{bottom:calc(env(safe-area-inset-bottom) + 132px);font-size:14px}}`;
  document.head.appendChild(css);

  let gestured = false; document.addEventListener("click", e => { if (e.target.closest && e.target.closest("#gmenu [data-g]")) gestured = true; }, true);
  const P = () => window.G && G.player;
  const STEPS = [
    { t: "Kiếm ghế mà ngồi", d: "Chạm vào một chiếc ghế nhựa xanh hoặc đỏ quanh quán trà để ngồi. Kéo màn hình để xoay nhìn quanh.", done: () => P() && P().state === "sit" },
    { t: "Nhấp ngụm trà đá", d: "Bấm “Nhấp trà” ở dưới màn hình (phím 1). Hết trà, cô bán hàng sẽ rót thêm.", hl: "a1", done: () => P() && (P().cup < .99 || (P().action && P().action.type === "sip")) },
    { t: "Làm quen người bên cạnh", d: "Chạm vào một người đang ngồi gần bạn, rồi chọn Mời trà, Cụng ly hoặc Vẫy chào.", done: () => gestured },
    { t: "Mở hộ chiếu phố cổ", d: "Có 10 địa danh để ghé và nhận dấu. Bấm nút “Hộ chiếu” ở góc trên.", hl: "bPass", done: () => $("passport") && $("passport").classList.contains("show") },
    { t: "Thế là xong!", d: "Bấm “Dạo phố” để tự đi tới địa danh, 📷 để chụp bưu thiếp gửi bạn bè, ☰ để đổi tên, xem nội quy. Chúc bạn ngồi vui.", last: true }
  ];
  let i = -1, box = null, timer = 0, okT = 0;
  function show() {
    const s = STEPS[i]; document.querySelectorAll(".tut-hl").forEach(e => e.classList.remove("tut-hl")); if (s.hl && $(s.hl)) $(s.hl).classList.add("tut-hl");
    if (!box) { box = document.createElement("div"); box.className = "tut"; box.setAttribute("role", "dialog"); box.setAttribute("aria-live", "polite"); document.body.appendChild(box); }
    box.innerHTML = `<div class="st">Hướng dẫn · bước ${i + 1}/${STEPS.length}</div><h4></h4><div class="d"></div><div class="dots">${STEPS.map((_, k) => `<i class="${k <= i ? "on" : ""}"></i>`).join("")}</div>
      <div class="row"><button class="skip" type="button">${s.last ? "" : "Bỏ qua hướng dẫn"}</button><button class="go" type="button">${s.last ? "Bắt đầu chơi" : "Tiếp"}</button></div>`;
    box.querySelector("h4").textContent = s.t; box.querySelector(".d").textContent = s.d;
    box.querySelector(".skip").onclick = () => finish(false); box.querySelector(".go").onclick = () => s.last ? finish(true) : next();
    box.querySelector(".go").style.display = s.last ? "" : "none"; okT = 0;
  }
  function next() { i++; if (i >= STEPS.length) return finish(true); show(); }
  function finish(done) { clearInterval(timer); timer = 0; if (box) box.remove(); box = null; document.querySelectorAll(".tut-hl").forEach(e => e.classList.remove("tut-hl"));
    try { localStorage.setItem(KEY, "done"); } catch (_) { } if (window.TDPC_ev) TDPC_ev(done ? "tut" : "tut_skip"); }
  function start() { if (timer) return; i = -1; gestured = false; next();
    timer = setInterval(() => { const s = STEPS[i]; if (!s || s.last || !s.done) return;
      if (s.done()) { if (!okT) { okT = 1; const g = box.querySelector(".go"); g.style.display = ""; g.textContent = "Tiếp ›"; box.querySelector(".d").innerHTML = '<span class="ok">✓ Làm tốt lắm!</span> ' + box.querySelector(".d").textContent; setTimeout(() => { if (STEPS[i] === s) next(); }, 1400); } } }, 300); }
  window.TDPC_tutorial = start;
  const more = $("more"); if (more && !$("bTut")) { const b = document.createElement("button"); b.className = "btn"; b.id = "bTut"; b.type = "button"; b.textContent = "🎓 Hướng dẫn nhanh"; more.insertBefore(b, $("bHelp")); b.onclick = () => { UI.closePanels(); start(); }; }
  let seen = null; try { seen = localStorage.getItem(KEY); } catch (_) { }
  if (!seen) { const w = setInterval(() => { const hud = $("hud"); if (hud && !hud.classList.contains("hidden") && P()) { clearInterval(w); setTimeout(start, 2500); } }, 500); }
})();
