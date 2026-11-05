/* Trà Đá Phố Cổ — "Hộ chiếu phố cổ": ghé đủ 10 địa danh để nhận dấu, mỗi dấu kèm một câu chuyện ngắn */
"use strict";
const STAMPS = [
  { id: "longbien", t: "Cầu Long Biên", k: "Bắc qua sông Hồng", col: "#5a4636", x: -108, z: 0, r: 7,
    story: "Cầu Long Biên khánh thành năm 1902, là cây cầu thép bắc qua sông Hồng. Đường sắt chạy ở giữa, xe máy và xe đạp đi ở hai làn bên ngoài, và đi bên trái. Cây cầu từng bị đánh phá nhiều lần trong chiến tranh và được sửa lại để tiếp tục sử dụng." },
  { id: "duongtau", t: "Phố đường tàu", k: "Đường sắt xuyên phố", col: "#1d3f7a", x: -54, z: 14, r: 5,
    story: "Đường sắt xuyên qua khu phố cổ có từ thời Pháp thuộc. Nhà dân sát mép ray, tàu chạy qua chỉ cách mái hiên vài bước chân. Nơi đây nổi tiếng với khách du lịch, và chính quyền đã nhiều lần nhắc nhở, hạn chế các quán cà phê ven ray để bảo đảm an toàn." },
  { id: "dongxuan", t: "Chợ Đồng Xuân", k: "Phố Đồng Xuân", col: "#7a1d14", x: -28, z: -6.5, r: 7,
    story: "Chợ Đồng Xuân được xây năm 1889, là chợ lớn nhất khu phố cổ. Năm 1994 chợ bị cháy và được xây lại, vẫn giữ mặt tiền ba đầu hồi quen thuộc. Bên trong bán đủ thứ, từ vải vóc, quần áo tới đồ khô." },
  { id: "gate", t: "Ô Quan Chưởng", k: "Cửa ô cổ", col: "#9b2c24", x: 5, z: 0, r: 6,
    story: "Ô Quan Chưởng là cửa ô duy nhất của kinh thành Thăng Long xưa còn giữ được đến nay. Cổng được xây từ thế kỷ 18 và sửa lại vào đầu thế kỷ 19. Tên gọi dân gian gắn với một viên Chưởng cơ trấn giữ cửa ô, tương truyền đã chiến đấu chống quân Pháp năm 1873." },
  { id: "market", t: "Chợ Hàng Bè", k: "Phố Hàng Bè", col: "#2f6e3a", x: 26, z: -6.5, r: 5,
    story: "Phố Hàng Bè xưa nằm sát bờ sông Hồng. Bè tre, bè gỗ từ thượng nguồn xuôi về cập bến ở đây để bán, nên phố mang tên Hàng Bè. Phố còn lại khu chợ nhỏ bán rau, hoa và đồ khô cho người phố cổ." },
  { id: "pho", t: "Phở Bát Đàn", k: "Phố Bát Đàn", col: "#a8541f", x: 47, z: 6.4, r: 4.5,
    story: "Tên phố Bát Đàn gắn với nghề buôn bát, đĩa ngày trước. Quán phở ở đây nổi tiếng với cảnh khách xếp hàng, tự gọi, tự trả tiền rồi tự bưng bát." },
  { id: "giang", t: "Cà phê Giảng", k: "Phố Nguyễn Hữu Huân", col: "#5a3a24", x: 110.5, z: 6.4, r: 4.5,
    story: "Năm 1946, khi sữa tươi khan hiếm, ông Nguyễn Văn Giảng nghĩ ra cách đánh lòng đỏ trứng với đường để thay sữa. Cà phê trứng ra đời từ đó và trở thành một thức uống gắn với Hà Nội." },
  { id: "lavong", t: "Chả cá Lã Vọng", k: "Phố Chả Cá", col: "#1f1a16", x: 128.5, z: -6.8, r: 4.5,
    story: "Món chả cá gắn với một gia đình họ Đoàn. Trong quán đặt tượng Lã Vọng ngồi câu cá, nên khách quen gọi là chả cá Lã Vọng. Món ăn nổi tiếng đến mức con phố được đổi tên thành phố Chả Cá." },
  { id: "kem", t: "Kem Tràng Tiền", k: "Phố Tràng Tiền", col: "#b8322a", x: 166, z: -6.6, r: 5,
    story: "Tên Tràng Tiền bắt nguồn từ sở đúc tiền thời Nguyễn từng đặt ở khu này. Hiệu kem Tràng Tiền mở từ cuối thập niên 1950. Mua một que kem cốm rồi đứng ăn ngay trên vỉa hè là nếp quen của nhiều thế hệ người Hà Nội." },
  { id: "lake", t: "Hồ Gươm", k: "Hồ Hoàn Kiếm", col: "#1f4e9c", x: 218, z: -10, r: 16,
    story: "Truyền thuyết kể rằng sau khi đánh thắng quân Minh, vua Lê Lợi dạo thuyền trên hồ thì Rùa Vàng nổi lên đòi lại gươm thần. Hồ từ đó mang tên Hoàn Kiếm, tức hồ trả gươm. Tháp Rùa giữa hồ được xây vào cuối thế kỷ 19." },
  { id: "vanminh", t: "Nếp sống văn minh", k: "Dấu thưởng", col: "#1d6b5a", bonus: true,
    story: "Vỉa hè là lối đi chung. Bạn đã cùng mọi người kê ghế gọn, chừa lối đi cho người đi bộ. Một việc nhỏ, nhưng giúp phố cổ thông thoáng và an toàn hơn." },
  { id: "tet", t: "Xuân Đinh Mùi", k: "Dấu thưởng Tết", col: "#c8251d", bonus: true, season: "tet", x: -29, z: 6, r: 6,
    story: "Những ngày giáp Tết, phố Hàng Lược cạnh chợ Đồng Xuân thành chợ hoa với đào, quất và đủ loại hoa Tết. Dạo chợ hoa, mua một cành đào là cách nhiều gia đình Hà Nội đón xuân." }
];
const NEED = STAMPS.filter(s => !s.bonus).length;
const Passport = { got: {}, dwell: {}, onAward: null, sel: null, done: false, season: "thuong",
  init(onAward) { try { this.got = JSON.parse(localStorage.getItem("tdpc_passport") || "{}") || {}; } catch (e) { this.got = {}; }
    this.onAward = onAward; this.done = this.count() >= NEED; const $ = id => document.getElementById(id);
    $("pCert").addEventListener("click", () => this.certificate());
    $("pReset").addEventListener("click", () => { if (confirm("Xoá hết dấu trong hộ chiếu và bắt đầu lại?")) { this.got = {}; this.done = false; this.save(); this.sel = null; this.render(); } }); this.render(); },
  save() { try { localStorage.setItem("tdpc_passport", JSON.stringify(this.got)); } catch (e) { } },
  count() { return STAMPS.filter(s => !s.bonus && this.got[s.id]).length; },
  has(id) { return !!this.got[id]; },
  check(x, z, dt) { for (const s of STAMPS) { if (this.got[s.id] || s.x === undefined || (s.season && s.season !== this.season)) continue;
      if (Math.hypot(x - s.x, z - s.z) < s.r) { this.dwell[s.id] = (this.dwell[s.id] || 0) + dt; if (this.dwell[s.id] > 1.2) this.award(s.id); } else this.dwell[s.id] = 0; } },
  award(id) { if (this.got[id]) return; const s = STAMPS.find(q => q.id === id); if (!s) return; this.got[id] = Date.now(); this.save(); this.sel = id; this.render(); this.fx(s);
    const nowDone = !this.done && this.count() >= NEED; if (nowDone) this.done = true; if (this.onAward) this.onAward(s, nowDone); },
  date(ts) { const d = new Date(ts); return String(d.getDate()).padStart(2, "0") + "." + String(d.getMonth() + 1).padStart(2, "0") + "." + d.getFullYear(); },
  stampEl(s, big) { const el = document.createElement(big ? "div" : "button"); if (!big) el.type = "button";
    el.className = "stamp" + (this.got[s.id] || big ? "" : " no") + (big ? " big" : "") + (s.bonus ? " bonus" : ""); el.style.setProperty("--c", s.col);
    const a = document.createElement("small"); a.textContent = s.bonus ? "★ Dấu thưởng ★" : "Phố cổ Hà Nội"; const b = document.createElement("b"); b.textContent = s.t;
    const c = document.createElement("small"); c.textContent = this.got[s.id] ? this.date(this.got[s.id]) : (s.bonus ? (s.id === "tet" ? "Chợ hoa ngày Tết" : "Kê ghế gọn") : "Chưa ghé"); el.append(a, b, c);
    if (!big) el.addEventListener("click", () => { this.sel = s.id; this.render(); }); return el; },
  render() { const $ = id => document.getElementById(id), n = this.count();
    $("bPass").textContent = "Hộ chiếu " + n + "/" + NEED; $("pProg").textContent = n >= NEED ? "Bạn đã có đủ " + NEED + " dấu. Chúc mừng “người phố cổ”!" : "Đã có " + n + "/" + NEED + " dấu. Đứng gần mỗi địa danh một chút để được đóng dấu.";
    $("pBar").style.width = (n / NEED * 100) + "%"; const g = $("stampGrid"); g.textContent = ""; STAMPS.forEach(s => g.append(this.stampEl(s)));
    const st = $("stampStory"), s = STAMPS.find(q => q.id === this.sel);
    if (s) { st.hidden = false; $("ssK").textContent = s.k; $("ssT").textContent = s.t; $("ssD").textContent = this.got[s.id] ? s.story : (s.bonus ? (s.id === "tet" ? "Dấu này chỉ có trong dịp Tết: hãy dạo chợ hoa Hàng Lược cạnh chợ Đồng Xuân." : "Dấu này dành cho người cùng kê ghế gọn khi quán đông.") : "Hãy ghé " + s.t + " để mở câu chuyện này."); } else st.hidden = true;
    $("pCert").disabled = n < NEED; },
  fx(s) { const box = document.getElementById("stampFx"); box.textContent = ""; box.append(this.stampEl(s, true)); const cap = document.createElement("p"); cap.textContent = "Đã đóng dấu: " + s.t; box.append(cap);
    box.classList.remove("show"); void box.offsetWidth; box.classList.add("show"); clearTimeout(this._fx); this._fx = setTimeout(() => box.classList.remove("show"), 2600); },
  certificate() { if (this.count() < NEED) return; const W = 1800, H = 1100, c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#f8f0dc"); g.addColorStop(1, "#ecdcb6"); x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 2500; i++) { x.fillStyle = "rgba(120,90,40," + Math.random() * .06 + ")"; x.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
    x.strokeStyle = "#9b2c24"; x.lineWidth = 6; x.strokeRect(40, 40, W - 80, H - 80); x.lineWidth = 2; x.strokeRect(58, 58, W - 116, H - 116);
    x.textAlign = "center"; x.fillStyle = "#9b2c24"; x.font = "700 30px Georgia, serif"; x.fillText("TRÀ ĐÁ PHỐ CỔ · HỘ CHIẾU PHỐ CỔ", W / 2, 140);
    x.fillStyle = "#2a2320"; x.font = "700 78px Georgia, serif"; x.fillText("Giấy chứng nhận", W / 2, 240); x.font = "italic 34px Georgia, serif"; x.fillText("Chứng nhận người dạo phố", W / 2, 305);
    x.fillStyle = "#9b2c24"; x.font = "700 60px Georgia, serif"; x.fillText(document.getElementById("myName").textContent || "Người phố cổ", W / 2, 385);
    x.fillStyle = "#2a2320"; x.font = "30px Georgia, serif"; x.fillText("đã ghé đủ " + NEED + " địa danh của phố cổ Hà Nội và được công nhận là “người phố cổ”.", W / 2, 445);
    const list = STAMPS.filter(s => !s.bonus || this.got[s.id]), per = Math.ceil(list.length / 2);
    list.forEach((s, i) => { const row = Math.floor(i / per), col = i % per, n = row ? list.length - per : per, gap = (W - 200) / n, cx = 100 + gap * (col + .5), cy = 600 + row * 210, r = Math.min(85, gap * .42);
      x.save(); x.translate(cx, cy); x.rotate((i % 2 ? 1 : -1) * .12); x.globalAlpha = .88; x.strokeStyle = s.col; x.lineWidth = 5; x.beginPath(); x.arc(0, 0, r, 0, 7); x.stroke(); x.lineWidth = 2; x.beginPath(); x.arc(0, 0, r - 9, 0, 7); x.stroke();
      x.fillStyle = s.col; x.font = "700 " + Math.round(r * .26) + "px Georgia, serif"; const w = s.t.split(" "), h = Math.ceil(w.length / 2); x.fillText(w.slice(0, h).join(" "), 0, -4); x.fillText(w.slice(h).join(" "), 0, r * .3);
      x.font = Math.round(r * .17) + "px system-ui, sans-serif"; x.fillText(this.date(this.got[s.id]), 0, r * .62); x.restore(); });
    x.globalAlpha = 1; x.fillStyle = "#2a2320"; x.font = "28px Georgia, serif"; x.fillText("Hà Nội, ngày " + this.date(Date.now()), W / 2, 1000);
    const a = document.createElement("a"); a.href = c.toDataURL("image/png"); a.download = "giay-chung-nhan-nguoi-pho-co.png"; document.body.append(a); a.click(); a.remove(); }
};
