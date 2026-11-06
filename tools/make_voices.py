#!/usr/bin/env python3
"""Trà Đá Phố Cổ — tạo giọng nói tiếng Việt (giọng Bắc) cho tiếng rao, loa phường, cô bán hàng, tiếng xì xào quán,
và tiếng máy xe số. Xuất public/sound/*.mp3.

Cần: espeak-ng (có sẵn giọng "vi" – Vietnamese Northern), ffmpeg, Python 3 + numpy + scipy.
    Ubuntu/Debian:  sudo apt install espeak-ng ffmpeg
    Windows:        cài espeak-ng (bản .msi trên GitHub) và ffmpeg, thêm vào PATH
Chạy:  python3 tools/make_voices.py

Muốn giọng thật hơn: thu âm người thật đọc đúng các câu trong VOICES (điện thoại là đủ), lưu thành
public/sound/<tên>.mp3 cùng tên. Game tự dùng file mới, không phải sửa code.
"""
import os, subprocess, tempfile
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, resample_poly

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "sound")
SR = 24000

def ssml(text): return "<speak>" + text + "</speak>"
DRAW = lambda w, r=38, p="+28%": f"<prosody rate='{r}%' pitch='{p}'>{w}</prosody>"
VOICES = {
    "rao_banhmi": ("vi+f4", 62, 135, "Bánh mì nóng giòn " + DRAW("đây") + "."),
    "rao_banhmi2": ("vi+f3", 55, 130, "Ai " + DRAW("bánh mì", 70) + " nóng giòn " + DRAW("đây") + "."),
    "rao_xoi": ("vi+f4", 58, 135, "Xôi lạc, xôi ngô nóng " + DRAW("đây") + "."),
    "rao_hoa": ("vi+f2", 64, 135, "Hoa tươi " + DRAW("đây", 55) + ". Ai mua hoa " + DRAW("không") + "?"),
    "rao_qua": ("vi+f3", 60, 135, "Cam ngọt, quýt ngọt " + DRAW("đây") + "."),
    "rao_ngo": ("vi+f4", 56, 135, "Ngô nướng, khoai nướng " + DRAW("đây") + "."),
    "loa_phuong": ("vi+m3", 42, 150, "Thông báo, thông báo. Đề nghị bà con kê ghế gọn vào phía trong, chừa lối đi cho người đi bộ, không lấn chiếm lòng đường. Xin cảm ơn bà con."),
    "dp_camon": ("vi+m1", 46, 150, "Cảm ơn bà con đã hợp tác."),
    "dp_viahe": ("vi+m1", 46, 150, "Bạn ơi, đi lên vỉa hè cho an toàn nhé."),
    "co_moi": ("vi+f3", 52, 145, "Trà đá đây cháu ơi."),
    "co_moi2": ("vi+f3", 52, 145, "Có hướng dương, kẹo lạc đây."),
    "co_ngoi": ("vi+f3", 52, 145, "Cứ ngồi đi cháu."),
}
BABBLE = ["Dạo này thế nào?", "Ừ, cũng bình thường.", "Hôm nay trời mát nhỉ.", "Thế à?", "Ừ đúng rồi.", "Làm cốc nữa đi.", "Cho cháu cốc trà.",
          "Về muộn thế.", "Ha ha ha.", "Ông ấy bảo thế.", "Tối nay đi đâu?", "Ngồi tí đã.", "Mai đi làm sớm.", "Thôi, không sao.", "Chuẩn đấy.",
          "Ơ, thế à?", "Cô ơi, thêm đá.", "Hà Nội mùa này đẹp.", "Ăn gì chưa?", "Đắt thế.", "Được đấy.", "Kể nghe xem nào."]

def espeak(voice, pitch, speed, text, path):
    subprocess.run(["espeak-ng", "-v", voice, "-p", str(pitch), "-s", str(speed), "-m", "-w", path, ssml(text)], check=True)

def load(path):
    sr, x = wavfile.read(path); x = x.astype(np.float32) / 32768
    if x.ndim > 1: x = x.mean(1)
    return resample_poly(x, SR, sr).astype(np.float32)

def warm(x):
    """Làm giọng bớt "máy": lọc bỏ rè cao, thêm chút hơi thở và rung nhẹ, nén âm lượng."""
    x = sosfilt(butter(2, [110, 5200], "band", fs=SR, output="sos"), x)
    t = np.arange(len(x)) / SR; x = x * (1 + .04 * np.sin(2 * np.pi * 4.8 * t))
    breath = sosfilt(butter(2, [1800, 6000], "band", fs=SR, output="sos"), np.random.default_rng(1).normal(0, 1, len(x))).astype(np.float32)
    env = np.convolve(np.abs(x), np.ones(400) / 400, "same"); x = x + breath * env * .12
    x = np.tanh(x * 2.2) / np.tanh(2.2)
    fade = np.minimum(1, np.minimum(np.arange(len(x)), np.arange(len(x))[::-1]) / (SR * .02)); x *= fade
    return (x / max(1e-6, np.abs(x).max()) * .9).astype(np.float32)

def mp3(x, path, br="48k"):
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f: tmp = f.name
    wavfile.write(tmp, SR, (np.clip(x, -1, 1) * 32767).astype(np.int16))
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp, "-ac", "1", "-b:a", br, path], check=True); os.remove(tmp)

def babble(sec=24.0, seed=3):
    rng = np.random.default_rng(seed); out = np.zeros(int(sec * SR), np.float32)
    voices = ["vi+m1", "vi+m2", "vi+m3", "vi+m4", "vi+f2", "vi+f3", "vi+f4"]
    with tempfile.TemporaryDirectory() as d:
        for i in range(70):
            p = os.path.join(d, f"{i}.wav"); espeak(voices[i % len(voices)], int(rng.integers(35, 70)), int(rng.integers(140, 175)), BABBLE[rng.integers(len(BABBLE))], p)
            x = load(p) * rng.uniform(.25, .7); x = sosfilt(butter(2, [150, 3200], "band", fs=SR, output="sos"), x).astype(np.float32)
            st = int(rng.uniform(0, sec) * SR); n = min(len(x), len(out) - st); out[st:st + n] += x[:n]
            if n < len(x): out[:len(x) - n] += x[n:]
    rev = np.zeros_like(out)
    for dly, g in ((.031, .35), (.047, .28), (.073, .2), (.11, .14)): k = int(dly * SR); rev[k:] += out[:-k] * g
    out = out + rev; return out / np.abs(out).max() * .8

def engine(sec=2.0, rpm_hz=26.0):
    """Tiếng máy xe số 110 phân khối ở vòng tua thấp: chuỗi xung nổ qua ống xả. Vòng lặp liền mạch."""
    rng = np.random.default_rng(7); n = int(sec * SR); out = np.zeros(n, np.float32); per = SR / rpm_hz; t = 0.0
    burst_t = np.arange(int(SR * .05)) / SR
    while t < n:
        a = 1 + rng.normal(0, .12); i = int(t)
        b = (np.exp(-burst_t * 90) * (np.sin(2 * np.pi * 95 * burst_t) * .9 + np.sin(2 * np.pi * 240 * burst_t) * .45 + rng.normal(0, .35, len(burst_t)))).astype(np.float32) * a
        m = min(len(b), n - i); out[i:i + m] += b[:m]
        if m < len(b): out[:len(b) - m] += b[m:]
        t += per * (1 + rng.normal(0, .02))
    out = sosfilt(butter(2, [40, 2500], "band", fs=SR, output="sos"), out)
    return (out / np.abs(out).max() * .85).astype(np.float32)

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    with tempfile.TemporaryDirectory() as d:
        for name, (v, p, s, text) in VOICES.items():
            w = os.path.join(d, name + ".wav"); espeak(v, p, s, text, w); x = warm(load(w))
            mp3(x, os.path.join(OUT, name + ".mp3")); print(f"{name:12s} {len(x) / SR:5.2f} giây")
    mp3(babble(), os.path.join(OUT, "xi_xao.mp3"), "40k"); print("xi_xao      24.00 giây (vòng lặp)")
    mp3(engine(), os.path.join(OUT, "may_xe.mp3"), "40k"); print("may_xe       2.00 giây (vòng lặp)")
