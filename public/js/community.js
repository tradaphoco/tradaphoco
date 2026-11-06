/* Trà Đá Phố Cổ — cộng đồng: báo cáo người chơi, thông báo từ quản trị viên, nội quy quán, ghi nhận sự kiện để thống kê.
   Không sửa game.js: tệp này lắng nghe kết nối WebSocket và thêm nút vào giao diện có sẵn. */
"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const css = document.createElement("style");
  css.textContent = `.cm-banner{position:fixed;left:50%;top:calc(env(safe-area-inset-top) + 74px);transform:translateX(-50%);z-index:13;background:#1f4e9c;color:#fff;border-radius:14px;padding:10px 40px 10px 14px;max-width:min(92vw,520px);font-size:14px;line-height:1.45;box-shadow:0 8px 26px rgba(0,0,0,.35)}
  .cm-banner b{display:block;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;opacity:.8}.cm-banner button{position:absolute;top:6px;right:6px;border:0;background:transparent;color:#fff;font-size:20px;padding:4px 8px;cursor:pointer}
  .cm-rep{display:none;margin-top:6px;gap:5px;flex-wrap:wrap}.cm-rep.show{display:flex}.cm-rep button{flex:1 1 45%;border:1px solid #d9a58c;background:#fff8ea;border-radius:10px;padding:7px 4px;font-size:12px;cursor:pointer}
  #cmRules ul{padding-left:18px;margin:8px 0}#cmRules li{margin:6px 0;font-size:14px;line-height:1.5}`;
  document.head.appendChild(css);

  const WS = window.WebSocket;
  function Wrapped(url, proto) { const ws = proto ? new WS(url, proto) : new WS(url); window.__tdpcWs = ws;
    ws.addEventListener("message", e => { if (typeof e.data !== "string" || e.data.indexOf('"notice"') < 0) return; try { const m = JSON.parse(e.data); if (m.t === "notice") banner(m.text, m.from === "admin"); } catch (_) { } });
    return ws; }
  Wrapped.prototype = WS.prototype; Object.assign(Wrapped, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 }); window.WebSocket = Wrapped;

  let bTimer = 0;
  function banner(text, admin) { let b = $("cmBanner"); if (!b) { b = document.createElement("div"); b.id = "cmBanner"; b.className = "cm-banner"; b.setAttribute("role", "status"); document.body.appendChild(b); }
    b.textContent = ""; const h = document.createElement("b"); h.textContent = admin ? "Thông báo từ quán" : "Thông báo"; const p = document.createElement("div"); p.textContent = text;
    const x = document.createElement("button"); x.type = "button"; x.textContent = "×"; x.setAttribute("aria-label", "Đóng"); x.onclick = () => b.remove(); b.append(h, p, x);
    clearTimeout(bTimer); bTimer = setTimeout(() => b && b.remove(), admin ? 20000 : 7000); }

  const online = () => window.G && G.mode === "online";
  const ev = (k, v) => { if (online()) G.send({ t: "ev", k, v }); };

  function setupReport() {
    const gm = $("gmenu"); if (!gm || $("gReport")) return;
    const btn = document.createElement("button"); btn.type = "button"; btn.className = "mute"; btn.id = "gReport"; btn.textContent = "🚩 Báo cáo tên / hành vi";
    const box = document.createElement("div"); box.className = "cm-rep";
    (window.RoomLib && RoomLib.REASONS || ["Tên thô tục", "Tên giả danh", "Quấy rối", "Khác"]).forEach(r => { const b = document.createElement("button"); b.type = "button"; b.textContent = r;
      b.onclick = () => { const name = $("gmName").textContent.replace(/\s*●\s*$/, "").trim(); G.send({ t: "report", name, reason: r }); box.classList.remove("show"); $("gClose").click(); }; box.appendChild(b); });
    btn.onclick = () => box.classList.toggle("show");
    gm.append(btn, box);
    new MutationObserver(() => { const real = /●\s*$/.test($("gmName").textContent) && online() && !/ẩn tên/.test($("gmName").textContent); btn.hidden = !real; if (!gm.classList.contains("show")) box.classList.remove("show"); })
      .observe(gm, { attributes: true, attributeFilter: ["class"] });
  }

  function setupRules() {
    const more = $("more"); if (!more || $("bRules")) return;
    const b = document.createElement("button"); b.className = "btn"; b.id = "bRules"; b.type = "button"; b.textContent = "📜 Nội quy quán";
    more.insertBefore(b, $("bHelp"));
    const ov = document.createElement("div"); ov.className = "overlay gone"; ov.id = "cmRules"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true");
    ov.innerHTML = `<div class="panel faq"><div class="eyebrow">Cộng đồng</div><h1 style="font-size:28px">Nội quy quán trà đá</h1><ul>
      <li><b>Đặt tên tử tế.</b> Không dùng từ thô tục, không giả danh công an, dân phòng, quản trị viên, không ghi số điện thoại hay họ tên đầy đủ.</li>
      <li><b>Tôn trọng người ngồi cạnh.</b> Mời trà, cụng ly là để làm quen, đừng bấm liên tục làm phiền người khác.</li>
      <li><b>Thấy tên hay hành vi không phù hợp?</b> Chạm vào người đó, chọn “🙈 Ẩn tên” để không phải thấy nữa, hoặc “🚩 Báo cáo” để quản trị viên xem xét.</li>
      <li><b>Quản trị viên có thể</b> ẩn tên, mời ra khỏi quán hoặc tạm khoá người vi phạm. Tên bị nhiều người báo cáo sẽ tự động được ẩn.</li>
      <li><b>Quán không lưu</b> họ tên thật hay tin nhắn của bạn. Máy chủ chỉ giữ mã ẩn danh của kết nối để chống phá và đếm lượt khách.</li></ul>
      <button class="big red" type="button" id="cmRulesOk">Đã hiểu</button></div>`;
    document.body.appendChild(ov);
    b.onclick = () => { UI.closePanels(); ov.classList.remove("gone"); };
    $("cmRulesOk").onclick = () => ov.classList.add("gone");
  }

  function setupEvents() {
    if (window.Passport && !Passport.__wrapped) { const a = Passport.award.bind(Passport), c = Passport.certificate.bind(Passport); Passport.__wrapped = true;
      Passport.award = id => { const had = Passport.has(id); a(id); if (!had && Passport.has(id)) ev("stamp", id); };
      Passport.certificate = () => { c(); ev("cert"); }; }
    const ph = $("bPhoto"); if (ph) ph.addEventListener("click", () => ev("photo"));
  }
  window.TDPC_ev = ev;
  setupReport(); setupRules(); setupEvents();
})();
