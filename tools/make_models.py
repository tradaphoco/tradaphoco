#!/usr/bin/env python3
"""Trà Đá Phố Cổ — bộ dựng mô hình bằng code (thay cho Blender), xuất file .glb (glTF 2.0).

Chạy:  python3 tools/make_models.py      → ghi vào public/models/
       python3 tools/make_vehicles.py    → xích lô, xe đạp chở hoa
       python3 tools/make_people.py      → nhân vật có khung xương và hoạt cảnh
Cần:   Python 3 + numpy.

Mô hình hướng mặt trước về +Z, trục đứng +Y, đơn vị mét, gốc toạ độ ở mặt đất.
Quy ước tên vật liệu (bộ vẽ trong game đọc theo tên):
  tint_*   → nhuộm theo màu từng bản sao (ghế xanh/đỏ, màu sơn xe máy)
  lamp*    → phát sáng về đêm (đèn pha, đèn hậu, đèn đường)
"""
import json, math, struct, os
import numpy as np

TAU = math.tau
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "models")

def T(x, y, z): m = np.eye(4); m[:3, 3] = (x, y, z); return m
def S(x, y=None, z=None): m = np.eye(4); m[0, 0], m[1, 1], m[2, 2] = x, (x if y is None else y), (x if z is None else z); return m
def Rx(a): c, s = math.cos(a), math.sin(a); m = np.eye(4); m[1, 1], m[1, 2], m[2, 1], m[2, 2] = c, -s, s, c; return m
def Ry(a): c, s = math.cos(a), math.sin(a); m = np.eye(4); m[0, 0], m[0, 2], m[2, 0], m[2, 2] = c, s, -s, c; return m
def Rz(a): c, s = math.cos(a), math.sin(a); m = np.eye(4); m[0, 0], m[0, 1], m[1, 0], m[1, 1] = c, -s, s, c; return m
def M(*ms):
    r = np.eye(4)
    for m in ms: r = r @ m
    return r
def align(a, b, side=(1, 0, 0)):
    a, b = np.array(a, float), np.array(b, float); d = b - a; L = np.linalg.norm(d); y = d / L
    x = np.array(side, float); x = x - y * np.dot(x, y)
    if np.linalg.norm(x) < 1e-6: x = np.array([0, 0, 1.0]) - y * y[2]
    x /= np.linalg.norm(x); z = np.cross(x, y)
    m = np.eye(4); m[:3, 0], m[:3, 1], m[:3, 2], m[:3, 3] = x, y, z, (a + b) / 2; return m, L

class Mesh:
    def __init__(self): self.parts = {}
    def add(self, mat, P, N, I, C=None, xf=None, col=1.0):
        P = np.asarray(P, float).reshape(-1, 3); N = np.asarray(N, float).reshape(-1, 3); I = np.asarray(I, np.int64).reshape(-1)
        if C is None: C = np.ones((len(P), 3))
        C = np.asarray(C, float).reshape(-1, 3) * np.asarray(col, float)
        if xf is not None:
            R = xf[:3, :3]; P = P @ R.T + xf[:3, 3]; N = N @ np.linalg.inv(R)
            if np.linalg.det(R) < 0: I = I.reshape(-1, 3)[:, ::-1].reshape(-1)
        N = N / np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-9)
        d = self.parts.setdefault(mat, {"P": [], "N": [], "C": [], "I": [], "n": 0})
        d["P"].append(P); d["N"].append(N); d["C"].append(C); d["I"].append(I + d["n"]); d["n"] += len(P)
    def rbox(self, mat, size, r, xf=None, k=1, col=1.0, C=None):
        h = np.array(size, float) / 2; r = min(r, *(h * .999))
        def samples(hh):
            inner = hh - r; arc = [-inner - r * math.cos(a) for a in np.linspace(0, math.pi / 2, k + 1)]
            return np.array(arc + [-x for x in reversed(arc)])
        sm = [samples(h[i]) for i in range(3)]
        P, N, I = [], [], []
        for f in range(3):
            u, v = [a for a in range(3) if a != f]
            for sg in (-1, 1):
                su, sv = sm[u], sm[v]; base = len(P)
                for a in su:
                    for b in sv:
                        p0 = np.zeros(3); p0[f] = sg * h[f]; p0[u] = a; p0[v] = b
                        inner = np.clip(p0, -(h - r), h - r); n = p0 - inner; ln = np.linalg.norm(n)
                        if ln < 1e-9: n = np.zeros(3); n[f] = sg
                        else: n = n / ln
                        P.append(inner + n * r); N.append(n)
                nu, nv = len(su), len(sv)
                for i in range(nu - 1):
                    for j in range(nv - 1):
                        a0 = base + i * nv + j; a1 = a0 + nv; tri = [a0, a1, a1 + 1, a0, a1 + 1, a0 + 1]
                        pa, pb, pc = np.array(P[tri[0]]), np.array(P[tri[1]]), np.array(P[tri[2]])
                        if np.dot(np.cross(pb - pa, pc - pa), N[a0]) < 0: tri = [a0, a1 + 1, a1, a0, a0 + 1, a1 + 1]
                        I += tri
        self.add(mat, P, N, I, C, xf, col)
    def lathe(self, mat, prof, seg=24, xf=None, col=1.0, flute=None, colfn=None, split=40):
        prof = [np.array(p, float) for p in prof]; segn = []
        for i in range(len(prof) - 1):
            d = prof[i + 1] - prof[i]; L = np.linalg.norm(d)
            segn.append(np.array([d[1], -d[0]]) / L if L > 1e-9 else None)
        rings = []
        for i, p in enumerate(prof):
            a = segn[i - 1] if i > 0 else None; b = segn[i] if i < len(segn) else None
            if a is None and b is None: continue
            if a is None: rings.append((p, b, i)); continue
            if b is None: rings.append((p, a, i)); continue
            if math.degrees(math.acos(np.clip(np.dot(a, b), -1, 1))) > split: rings.append((p, a, i)); rings.append((p, b, i))
            else: n = a + b; rings.append((p, n / np.linalg.norm(n), i))
        P, N, C, I = [], [], [], []
        for (p, n, _) in rings:
            for k in range(seg + 1):
                t = k / seg * TAU; c, s = math.cos(t), math.sin(t); rr = p[0]
                if flute: rr = rr * (1 + flute[1] * math.cos(flute[0] * t))
                P.append((rr * c, p[1], rr * s)); N.append((n[0] * c, n[1], n[0] * s))
                C.append(colfn(p[1], t) if colfn else (1, 1, 1))
        for r in range(len(rings) - 1):
            if rings[r][2] == rings[r + 1][2]: continue
            for k in range(seg):
                a0 = r * (seg + 1) + k; b0 = a0 + seg + 1
                I += [a0, b0, a0 + 1, a0 + 1, b0, b0 + 1]
        self.add(mat, P, N, I, C, xf, col)
    def box(self, mat, size, xf=None, col=1.0):
        h = np.array(size, float) / 2; P, N, I = [], [], []
        for f in range(3):
            u, v = [a for a in range(3) if a != f]
            for sg in (-1, 1):
                b = len(P); n = np.zeros(3); n[f] = sg
                for a, c in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                    p = np.zeros(3); p[f] = sg * h[f]; p[u] = a * h[u]; p[v] = c * h[v]; P.append(p); N.append(n)
                tri = [b, b + 1, b + 2, b, b + 2, b + 3]
                if np.dot(np.cross(P[b + 1] - P[b], P[b + 2] - P[b]), n) < 0: tri = [b, b + 2, b + 1, b, b + 3, b + 2]
                I += tri
        self.add(mat, P, N, I, None, xf, col)
    def cyl(self, mat, r, h, seg=16, xf=None, col=1.0, r2=None):
        r2 = r if r2 is None else r2
        self.lathe(mat, [(0, 0), (r, 0), (r2, h), (0, h)], seg, xf, col)
    def torus(self, mat, R, r, s1=24, s2=10, arc=TAU, a0=0.0, xf=None, col=1.0, sx=1.0):
        P, N, I = [], [], []
        for i in range(s1 + 1):
            u = a0 + arc * i / s1; cu, su = math.cos(u), math.sin(u)
            for j in range(s2 + 1):
                v = TAU * j / s2; cv, sv = math.cos(v), math.sin(v)
                P.append(((R + r * cv) * cu, r * sv * sx, (R + r * cv) * su)); N.append((cv * cu, sv / max(sx, 1e-3), cv * su))
        for i in range(s1):
            for j in range(s2):
                a = i * (s2 + 1) + j; b = a + s2 + 1; I += [a, a + 1, b, a + 1, b + 1, b]
        self.add(mat, P, N, I, None, xf, col)
    def sphere(self, mat, rad, seg=16, xf=None, col=1.0, C=None):
        P, N, I = [], [], []; rings = max(4, seg // 2)
        for i in range(rings + 1):
            th = math.pi * i / rings
            for k in range(seg + 1):
                ph = TAU * k / seg; n = (math.sin(th) * math.cos(ph), math.cos(th), math.sin(th) * math.sin(ph))
                P.append(tuple(np.array(n) * rad)); N.append(n)
        for i in range(rings):
            for k in range(seg):
                a = i * (seg + 1) + k; b = a + seg + 1; I += [a, a + 1, b, a + 1, b + 1, b]
        self.add(mat, P, N, I, C, xf, col)
    def tube(self, mat, pts, rad, seg=10, xf=None, col=1.0, cap=True, colfn=None):
        pts = [np.array(p, float) for p in pts]; n = len(pts)
        rads = rad if isinstance(rad, (list, tuple)) else [rad] * n
        tans = []
        for i in range(n):
            d = pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]; tans.append(d / np.linalg.norm(d))
        ref = np.array([0, 1.0, 0]) if abs(tans[0][1]) < .9 else np.array([1.0, 0, 0])
        nrm = np.cross(tans[0], ref); nrm /= np.linalg.norm(nrm)
        P, N, C, I = [], [], [], []
        for i in range(n):
            if i > 0:
                b = np.cross(tans[i - 1], tans[i])
                if np.linalg.norm(b) > 1e-8:
                    b /= np.linalg.norm(b); ang = math.acos(np.clip(np.dot(tans[i - 1], tans[i]), -1, 1))
                    nrm = nrm * math.cos(ang) + np.cross(b, nrm) * math.sin(ang) + b * np.dot(b, nrm) * (1 - math.cos(ang))
            bn = np.cross(tans[i], nrm)
            for k in range(seg + 1):
                t = TAU * k / seg; dv = nrm * math.cos(t) + bn * math.sin(t)
                P.append(pts[i] + dv * rads[i]); N.append(dv); C.append(colfn(pts[i], i / (n - 1)) if colfn else (1, 1, 1))
        for i in range(n - 1):
            for k in range(seg):
                a = i * (seg + 1) + k; b = a + seg + 1; I += [a, a + 1, b, a + 1, b + 1, b]
        if cap:
            for end, sg in ((0, -1), (n - 1, 1)):
                c0 = len(P); P.append(pts[end]); N.append(tans[end] * sg); C.append(C[end * (seg + 1)])
                for k in range(seg + 1):
                    P.append(P[end * (seg + 1) + k]); N.append(tans[end] * sg); C.append(C[end * (seg + 1)])
                for k in range(seg):
                    I += [c0, c0 + 1 + k, c0 + 2 + k] if sg > 0 else [c0, c0 + 2 + k, c0 + 1 + k]
        self.add(mat, P, N, I, C, xf, col)
    def blob(self, mat, center, rad, sub=2, amp=.2, seed=0, xf=None, colfn=None):
        t = (1 + 5 ** .5) / 2
        V = [(-1, t, 0), (1, t, 0), (-1, -t, 0), (1, -t, 0), (0, -1, t), (0, 1, t), (0, -1, -t), (0, 1, -t), (t, 0, -1), (t, 0, 1), (-t, 0, -1), (-t, 0, 1)]
        F = [(0, 11, 5), (0, 5, 1), (0, 1, 7), (0, 7, 10), (0, 10, 11), (1, 5, 9), (5, 11, 4), (11, 10, 2), (10, 7, 6), (7, 1, 8), (3, 9, 4), (3, 4, 2), (3, 2, 6), (3, 6, 8), (3, 8, 9), (4, 9, 5), (2, 4, 11), (6, 2, 10), (8, 6, 7), (9, 8, 1)]
        V = [np.array(v) / np.linalg.norm(v) for v in V]
        for _ in range(sub):
            cache, F2 = {}, []
            def mid(a, b):
                key = (min(a, b), max(a, b))
                if key not in cache: m = V[a] + V[b]; V.append(m / np.linalg.norm(m)); cache[key] = len(V) - 1
                return cache[key]
            for a, b, c in F:
                ab, bc, ca = mid(a, b), mid(b, c), mid(c, a); F2 += [(a, ab, ca), (b, bc, ab), (c, ca, bc), (ab, bc, ca)]
            F = F2
        rng = np.random.default_rng(seed); ph = rng.uniform(0, TAU, 6)
        Vn = np.array(V); disp = 1 + amp * (np.sin(Vn[:, 0] * 3.1 + ph[0]) * np.sin(Vn[:, 1] * 2.7 + ph[1]) * np.sin(Vn[:, 2] * 3.3 + ph[2]) + .5 * np.sin(Vn[:, 0] * 7 + ph[3]) * np.sin(Vn[:, 2] * 6.5 + ph[4]))
        P = np.array(center) + Vn * (np.array(rad) * disp[:, None])
        I = np.array(F).reshape(-1); N = np.zeros_like(P)
        for a, b, c in F:
            n = np.cross(P[b] - P[a], P[c] - P[a]); N[a] += n; N[b] += n; N[c] += n
        if np.dot(N[0], Vn[0]) < 0: I = I.reshape(-1, 3)[:, ::-1].reshape(-1); N = -N
        C = np.array([colfn(p, v) for p, v in zip(P, Vn)]) if colfn else None
        self.add(mat, P, N, I, C, xf)

def write_glb(path, mesh, mats):
    bin_ = bytearray(); views, accs, prims = [], [], []
    def push(arr, target, comp, typ, mm=False):
        while len(bin_) % 4: bin_.append(0)
        off = len(bin_); b = arr.tobytes(); bin_.extend(b)
        views.append({"buffer": 0, "byteOffset": off, "byteLength": len(b), "target": target})
        a = {"bufferView": len(views) - 1, "componentType": comp, "count": int(len(arr)), "type": typ}
        if mm: a["min"] = arr.min(0).tolist(); a["max"] = arr.max(0).tolist()
        accs.append(a); return len(accs) - 1
    matlist = []; tris = 0
    for name, d in mesh.parts.items():
        P = np.concatenate(d["P"]).astype(np.float32); N = np.concatenate(d["N"]).astype(np.float32)
        C = np.clip(np.concatenate(d["C"]), 0, 1).astype(np.float32); I = np.concatenate(d["I"]).astype(np.uint32)
        tris += len(I) // 3
        prims.append({"attributes": {"POSITION": push(P, 34962, 5126, "VEC3", True), "NORMAL": push(N, 34962, 5126, "VEC3"), "COLOR_0": push(C, 34962, 5126, "VEC3")},
                      "indices": push(I, 34963, 5125, "SCALAR"), "material": len(matlist)})
        m = mats[name]; mj = {"name": name, "pbrMetallicRoughness": {"baseColorFactor": list(m.get("c", (1, 1, 1))) + [m.get("a", 1.0)], "metallicFactor": m.get("metal", 0.0), "roughnessFactor": m.get("rough", .8)}}
        if "em" in m: mj["emissiveFactor"] = list(m["em"])
        if m.get("a", 1) < 1: mj["alphaMode"] = "BLEND"
        if m.get("double"): mj["doubleSided"] = True
        matlist.append(mj)
    while len(bin_) % 4: bin_.append(0)
    gl = {"asset": {"version": "2.0", "generator": "Tra Da Pho Co make_models.py"}, "scene": 0, "scenes": [{"nodes": [0]}],
          "nodes": [{"mesh": 0, "name": os.path.basename(path)[:-4]}], "meshes": [{"primitives": prims}], "materials": matlist,
          "accessors": accs, "bufferViews": views, "buffers": [{"byteLength": len(bin_)}]}
    js = json.dumps(gl, separators=(",", ":")).encode()
    while len(js) % 4: js += b" "
    with open(path, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(bin_)))
        f.write(struct.pack("<II", len(js), 0x4E4F534A)); f.write(js)
        f.write(struct.pack("<II", len(bin_), 0x004E4942)); f.write(bin_)
    return tris

def srgb(h):
    h = h.lstrip("#"); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4) for x in c)

# ================= MÔ HÌNH =================
def stool():
    """Ghế nhựa đẩu vỉa hè: mặt vuông bo góc có khe cầm tay, viền váy, 4 chân chữ L choãi, thanh giằng."""
    m = Mesh(); H = .30; tint = "tint_plastic"
    m.rbox(tint, (.34, .03, .34), .012, T(0, H - .015, 0), k=2)
    m.rbox(tint, (.11, .006, .026), .003, T(0, H - .001, -.115), col=.32)  # khe cầm tay (lõm, tối)
    for i in range(4):  # viền váy dưới mặt ghế
        a = i * TAU / 4; m.rbox(tint, (.30, .05, .012), .004, M(Ry(a), T(0, H - .052, .157)), col=.93)
    for sx in (-1, 1):
        for sz in (-1, 1):
            top = np.array([sx * .158, H - .03, sz * .158]); bot = np.array([sx * .19, .008, sz * .19])
            for ax in (0, 2):  # hai cánh của chân chữ L
                off = np.zeros(3); off[2 - ax] = -(sz if ax == 0 else sx) * .03
                xf, L = align(top + off, bot + off, side=(0, 0, 1) if ax == 0 else (1, 0, 0))
                m.rbox(tint, (.07, L, .011), .004, xf, col=.95)
            m.rbox(tint, (.05, .012, .05), .005, T(bot[0] - sx * .012, .006, bot[2] - sz * .012), col=.7)  # đế chân
    for i in range(4):  # thanh giằng giữa các chân
        a = i * TAU / 4; m.rbox(tint, (.31, .022, .012), .005, M(Ry(a), T(0, .12, .175)), col=.9)
    return m, {tint: {"c": (1, 1, 1), "rough": .42, "metal": 0}}

def moto():
    """Xe số kiểu Wave/Dream: bánh mâm đúc, phuộc, yếm, đầu đèn, gương, yên da, gác-ba-ga, ống xả, giảm xóc."""
    m = Mesh(); P, CH, RB, DK, LE = "tint_paint", "chrome", "rubber", "dark", "leather"
    def wheel(z, front):
        X = M(T(0, .27, z), Rz(math.pi / 2))
        m.torus(RB, .228, .045, 24, 8, xf=X)
        m.lathe(CH, [(.172, -.028), (.19, -.03), (.19, .03), (.172, .028), (.172, -.028)], 20, X)
        m.cyl(CH, .048, .12, 12, M(X, T(0, -.06, 0)))
        for k in range(5): m.box("alloy", (.024, .13, .016), M(X, Ry(k * TAU / 5), T(.105, 0, 0), Rz(math.pi / 2)))
        if front: m.cyl("alloy", .11, .006, 18, M(X, T(0, -.05, 0)))
    wheel(.64, True); wheel(-.60, False)
    zf = .64
    for sx in (-1, 1):
        m.tube(CH, [(sx * .055, .27, zf), (sx * .058, .55, zf - .08), (sx * .062, .86, zf - .17)], .02, 8)
        m.tube(DK, [(sx * .055, .27, zf), (sx * .057, .42, zf - .04)], .026, 8)
    m.torus(P, .3, .022, 14, 6, arc=math.pi * .65, a0=-math.pi * .25, xf=M(T(0, .27, zf), Rz(math.pi / 2)), sx=3.2)  # chắn bùn trước
    m.sphere(P, 1, 14, M(T(0, .96, zf - .12), S(.12, .11, .13)))  # đầu đèn
    m.sphere("lamp", 1, 12, M(T(0, .975, zf - .015), S(.07, .055, .025)))
    m.rbox(DK, (.15, .05, .08), .015, T(0, 1.06, .44))  # đồng hồ
    m.tube(CH, [(-.34, 1.0, .43), (-.22, 1.02, .45), (0, 1.03, .46), (.22, 1.02, .45), (.34, 1.0, .43)], .012, 6)
    for sx in (-1, 1):
        m.tube(RB, [(sx * .26, 1.004, .435), (sx * .36, .998, .43)], .019, 8)
        m.tube(CH, [(sx * .2, 1.03, .45), (sx * .26, 1.12, .43), (sx * .29, 1.22, .41)], .007, 5)
        m.sphere(DK, 1, 8, M(T(sx * .3, 1.25, .41), S(.06, .04, .012)))
        m.tube(DK, [(sx * .2, 1.035, .47), (sx * .3, 1.01, .5)], .006, 4)  # tay phanh
    m.sphere(P, 1, 16, M(T(0, .64, .36), Rx(-.32), S(.2, .3, .085)))  # yếm
    m.sphere(DK, 1, 10, M(T(0, .62, .30), Rx(-.32), S(.17, .26, .06)))
    m.tube(DK, [(0, .88, .5), (0, .62, .3), (0, .44, .05), (0, .46, -.28)], .032, 6)
    m.rbox("engine", (.2, .21, .3), .035, T(0, .33, .02), k=2)
    m.rbox("engine", (.12, .15, .15), .03, M(T(0, .44, .2), Rx(.9)), k=2)
    for k in range(3): m.box("engine", (.15, .008, .17), M(T(0, .4 + k * .04, .21 + k * .025), Rx(.9)), col=.8)
    m.tube(CH, [(.04, .36, .26), (.09, .22, .18), (.12, .2, .0), (.13, .25, -.25), (.13, .3, -.38)], .022, 6)
    m.cyl(CH, .045, .34, 12, M(T(.13, .32, -.36), Rx(math.pi / 2), T(0, -.34, 0)), r2=.04)
    m.box(DK, (.04, .06, .26), T(.165, .345, -.52))
    m.box(DK, (.05, .08, .62), T(-.085, .3, -.26))  # hộp xích
    m.sphere(P, 1, 16, M(T(0, .6, -.32), S(.15, .14, .4)))  # thân sau
    m.rbox(LE, (.25, .075, .66), .034, T(0, .765, -.18), k=2)
    m.box(LE, (.255, .012, .66), T(0, .735, -.18), col=.55)
    m.torus(P, .3, .022, 12, 6, arc=math.pi * .7, a0=-math.pi * .62, xf=M(T(0, .27, -.6), Rz(math.pi / 2)), sx=3.2)
    for sx in (-1, 1):  # gác-ba-ga, càng sau, giảm xóc, gác chân
        m.tube(CH, [(sx * .1, .78, -.45), (sx * .1, .8, -.78), (0, .8, -.8)], .01, 5)
        m.tube(DK, [(sx * .07, .38, -.05), (sx * .07, .27, -.6)], .022, 6)
        m.tube(CH, [(sx * .085, .3, -.55), (sx * .095, .66, -.42)], .012, 6)
        m.tube(DK, [(sx * .05, .3, .07), (sx * .2, .31, .07)], .012, 5); m.tube(RB, [(sx * .14, .31, .07), (sx * .22, .31, .07)], .017, 6)
        m.tube(DK, [(sx * .1, .34, -.3), (sx * .18, .34, -.3)], .009, 5)
    m.tube(CH, [(-.1, .8, -.45), (.1, .8, -.45)], .01, 5)
    m.rbox("lamp_red", (.11, .045, .035), .012, T(0, .7, -.72))
    m.box("plate", (.14, .085, .008), M(T(0, .56, -.79), Rx(.3)))
    return m, {P: {"c": (1, 1, 1), "rough": .28, "metal": .15}, CH: {"c": (.9, .9, .92), "rough": .15, "metal": 1.0}, "alloy": {"c": (.62, .63, .65), "rough": .3, "metal": .9},
               RB: {"c": (.05, .05, .05), "rough": .88}, DK: {"c": (.06, .06, .065), "rough": .55, "metal": .3}, "engine": {"c": (.38, .38, .4), "rough": .45, "metal": .7},
               LE: {"c": (.04, .035, .03), "rough": .5}, "lamp": {"c": (1, .97, .85), "rough": .1, "em": (1, .93, .75)}, "lamp_red": {"c": (.7, .05, .03), "rough": .2, "em": (1, .08, .03)},
               "plate": {"c": (.92, .92, .9), "rough": .4}}

def sau_tree(seed=11):
    """Cây sấu Hà Nội: thân xám nâu quét vôi trắng gốc, cành toả, tán xanh sẫm dày, cao ~12,5 m."""
    rng = np.random.default_rng(seed); m = Mesh(); H = 12.5
    def bark(p, t):
        y = p[1]; n = .85 + .15 * math.sin(p[0] * 9 + p[2] * 7 + y * 3)
        if y < 1.25: return (.82 * n, .8 * n, .76 * n)  # vôi trắng
        return (.11 * n, .085 * n, .068 * n)  # (đã đổi sang hệ màu tuyến tính)
    trunk = [(math.sin(y * .7) * .12, y, math.cos(y * .5) * .08) for y in np.linspace(0, 5.6, 12)]
    m.tube("bark", trunk, list(np.linspace(.3, .18, 12)), 14, colfn=bark)
    m.lathe("bark", [(.36, 0), (.31, .25), (.3, .5)], 16, colfn=lambda y, t: (.8, .78, .74))
    ends = []
    def branch(p0, d, L, r, lvl):
        pts = [p0]; dirv = np.array(d, float)
        for k in range(5):
            dirv = dirv + rng.normal(0, .12, 3) + np.array([0, .06, 0]); dirv /= np.linalg.norm(dirv); pts.append(pts[-1] + dirv * L / 5)
        m.tube("bark", pts, list(np.linspace(r, r * .45, 6)), 6, colfn=bark)
        if lvl < 2:
            for _ in range(2 + lvl):
                a = rng.uniform(0, TAU); nd = dirv + np.array([math.cos(a) * .7, .35, math.sin(a) * .7])
                branch(pts[rng.integers(2, 5)], nd / np.linalg.norm(nd), L * .6, r * .5, lvl + 1)
        elif rng.random() < .55: ends.append(pts[-1])
    for k in range(5):
        a = k * TAU / 5 + rng.uniform(-.3, .3); y = rng.uniform(4.2, 5.4)
        d = np.array([math.cos(a), rng.uniform(.6, 1.0), math.sin(a)]); branch(np.array([0, y, 0]), d / np.linalg.norm(d), rng.uniform(3.2, 4.2), .13, 0)
    cen = np.array([0, 8.6, 0]); centers = [np.array(e) for e in ends]
    for _ in range(8):
        v = rng.normal(0, 1, 3); v /= np.linalg.norm(v); v[1] = abs(v[1]) * .8; centers.append(cen + v * np.array([3.0, 2.2, 3.0]))
    ys = [c[1] for c in centers]; y0, y1 = min(ys) - 1.5, max(ys) + 1.5
    for i, c in enumerate(centers):
        hue = rng.uniform(-.03, .05)
        def leaf(p, v, hue=hue):
            ao = .5 + .5 * np.clip((p[1] - y0) / (y1 - y0), 0, 1); out = .82 + .18 * max(0, np.dot(v, (p - cen) / max(np.linalg.norm(p - cen), 1e-6)))
            k = ao * out; n = .9 + .1 * math.sin(p[0] * 5.1 + p[2] * 4.3 + p[1] * 3.7)
            g = (k * n) ** 2.2
            return ((.035 + hue * .3) * g * 1.6, (.12 + hue * .4) * g * 1.6, .022 * g * 1.6)
        r = rng.uniform(1.1, 1.65); m.blob("leaf", c, (r, r * .78, r), sub=2, amp=.22, seed=int(rng.integers(1e6)), colfn=leaf)
    return m, {"bark": {"c": (1, 1, 1), "rough": .92}, "leaf": {"c": (1, 1, 1), "rough": .78}}

def street_lamp():
    """Cột đèn kiểu cổ Hà Nội: đế khía, thân khía rãnh, vòng trang trí, tay vươn cong, lồng đèn sáu cạnh."""
    m = Mesh(); G = "iron"
    m.lathe(G, [(.24, 0), (.24, .08), (.2, .12), (.19, .45), (.16, .55), (.15, .62), (.12, .7), (.0, .7)], 32, flute=(8, .06))
    m.lathe(G, [(.085, .7), (.078, 2.0), (.07, 3.4), (.062, 3.7), (0, 3.7)], 24, flute=(12, .1))
    for y in (.72, 1.6, 3.4, 3.7): m.torus(G, .09, .018, 24, 8, xf=T(0, y, 0))
    m.lathe(G, [(.07, 3.7), (.1, 3.78), (.06, 3.86), (.03, 4.0), (0, 4.05)], 20)
    m.sphere(G, .035, 12, T(0, 4.06, 0))
    arm = [(0, 3.72, 0), (0, 3.82, .12), (0, 3.92, .26), (0, 3.98, .38), (0, 3.97, .45)]
    m.tube(G, arm, .022, 10); m.torus(G, .07, .012, 20, 6, arc=math.pi * 1.4, xf=M(T(0, 3.66, .14), Ry(math.pi / 2), Rx(math.pi / 2)))
    L = M(T(0, 3.72, .45))
    m.lathe(G, [(.0, .0), (.07, .0), (.12, .06), (.0, .06)], 6, L)
    m.lathe("glass_lamp", [(.11, .06), (.16, .26), (.17, .3), (.0, .3)], 6, L)
    for k in range(6):
        a = k * TAU / 6; m.tube(G, [(.11 * math.cos(a), 3.78, .45 + .11 * math.sin(a)), (.17 * math.cos(a), 4.02, .45 + .17 * math.sin(a))], .008, 6)
    m.lathe(G, [(.2, .3), (.21, .32), (.09, .44), (.03, .5), (0, .5)], 6, L)
    m.sphere(G, .03, 10, M(L, T(0, .52, 0)))
    return m, {G: {"c": srgb("#24382c"), "rough": .45, "metal": .55}, "glass_lamp": {"c": (1, .92, .7), "rough": .15, "em": (1, .82, .5), "a": .92}}

def tea_stall():
    """Tủ trà đá vỉa hè: tủ gỗ kính đựng kẹo lạc, thuốc lá; bình trà đá, ấm tích nhôm, phích, khay cốc, hũ hướng dương, thùng xốp đựng đá."""
    m = Mesh(); W, GL = "wood", "glass"
    m.rbox(W, (1.2, .3, .76), .02, T(0, .15, 0), k=2)
    for x in (-.4, 0, .4): m.rbox(W, (.36, .22, .01), .01, T(x, .15, .381), k=1, col=.8)  # cánh tủ
    for x in (-.4, 0, .4): m.sphere("brass", .012, 8, T(x + .14, .17, .392))
    for sx in (-1, 1):
        for sz in (-1, 1): m.rbox(W, (.035, .32, .035), .006, T(sx * .58, .46, sz * .36), k=1)
    m.rbox(W, (1.22, .025, .78), .008, T(0, .625, 0), k=1)
    m.rbox(GL, (1.14, .3, .004), .002, T(0, .46, .372), k=1); m.rbox(GL, (.004, .3, .7), .002, T(-.588, .46, 0), k=1); m.rbox(GL, (.004, .3, .7), .002, T(.588, .46, 0), k=1)
    rng = np.random.default_rng(3)
    goods = ["#d8a24a", "#3a2a1a", "#e2d1a8", "#c8382f", "#6f4a2a", "#f2f2ee", "#2f5e8a", "#e9b949"]
    for row, z in enumerate((.22, .02, -.18)):
        x = -.52
        while x < .5:
            w = rng.uniform(.05, .12); h = rng.uniform(.04, .15); c = srgb(goods[rng.integers(len(goods))])
            m.box("goods", (w, h, .12), T(x + w / 2, .3 + h / 2, z), col=c); x += w + .015
    top = .64
    m.lathe("amber", [(0, 0), (.11, 0), (.12, .03), (.12, .3), (.1, .34), (.06, .36), (0, .36)], 28, T(-.38, top, -.05))
    m.lathe("red_plastic", [(.065, .36), (.07, .38), (.06, .41), (0, .41)], 20, T(-.38, top, -.05))
    m.tube("red_plastic", [(-.26, top + .3, -.05), (-.24, top + .2, -.05), (-.26, top + .08, -.05)], .012, 8)
    m.cyl("red_plastic", .015, .04, 10, M(T(-.38, top + .03, .07), Rx(math.pi / 2)))  # vòi bình
    K = T(-.08, top, -.12)  # ấm tích nhôm
    m.lathe("alu", [(0, 0), (.08, 0), (.1, .03), (.11, .09), (.1, .15), (.07, .19), (.06, .2), (.065, .21), (0, .21)], 28, K)
    m.sphere("alu", .018, 10, M(K, T(0, .225, 0)))
    m.tube("alu", [(-.18, top + .06, -.12), (-.2, top + .14, -.12), (-.22, top + .2, -.12)], [.022, .014, .01], 10)
    m.torus("alu", .09, .009, 20, 6, arc=math.pi, xf=M(K, T(0, .2, 0), Rz(math.pi / 2), Rx(math.pi / 2)))
    m.lathe("thermos", [(0, 0), (.06, 0), (.065, .02), (.065, .26), (.05, .3), (.035, .31), (0, .31)], 24, T(.14, top, -.02))
    m.lathe("alu", [(.04, .3), (.045, .36), (0, .36)], 16, T(.14, top, -.02))
    m.lathe("alu", [(0, 0), (.2, 0), (.21, .015), (.19, .015), (0, .012)], 32, T(.18, top, .22))  # khay
    for k in range(6):  # cốc thủy tinh có trà
        a = k * TAU / 6; X = T(.18 + .1 * math.cos(a), top + .012, .22 + .1 * math.sin(a))
        m.lathe(GL, [(0, 0), (.028, 0), (.033, .1), (.031, .1), (.026, .004), (0, .004)], 14, X)
        m.lathe("tea", [(0, .006), (.027, .006), (.03, .07), (0, .07)], 12, X)
    m.lathe(GL, [(0, 0), (.07, 0), (.075, .14), (.06, .16), (0, .16)], 20, T(.42, top, -.18))
    m.lathe("seeds", [(0, .005), (.066, .005), (.07, .1), (0, .1)], 16, T(.42, top, -.18))
    m.lathe("red_plastic", [(.06, .16), (.065, .19), (0, .19)], 16, T(.42, top, -.18))
    m.lathe(GL, [(0, 0), (.06, 0), (.065, .12), (0, .12)], 18, T(.42, top, .0))
    for k in range(10): m.sphere("candy", .018, 6, T(.42 + rng.uniform(-.035, .035), top + .02 + rng.uniform(0, .07), rng.uniform(-.035, .035)), col=srgb(["#e63946", "#ffb703", "#2a9d8f", "#f4a261"][k % 4]))
    IB = T(1.0, 0, -.075)  # thùng xốp đá
    m.rbox("foam", (.5, .4, .45), .02, M(IB, T(0, .2, 0)), k=2); m.rbox("foam", (.52, .05, .47), .015, M(IB, T(0, .425, 0)), k=2, col=.96)
    m.rbox("foam", (.2, .02, .03), .008, M(IB, T(0, .46, 0)), k=1, col=.85)
    return m, {W: {"c": srgb("#7a4e2e"), "rough": .62}, GL: {"c": (.85, .92, .95), "rough": .04, "a": .28, "double": True}, "goods": {"c": (1, 1, 1), "rough": .55},
               "brass": {"c": (.8, .62, .3), "rough": .3, "metal": 1}, "amber": {"c": srgb("#c8862a"), "rough": .2, "a": .82}, "red_plastic": {"c": srgb("#c8382f"), "rough": .4},
               "alu": {"c": (.78, .78, .8), "rough": .3, "metal": .95}, "thermos": {"c": srgb("#b5281f"), "rough": .3, "metal": .2}, "tea": {"c": srgb("#b5651d"), "rough": .1, "a": .85},
               "seeds": {"c": (.1, .09, .08), "rough": .8}, "candy": {"c": (1, 1, 1), "rough": .3}, "foam": {"c": (.95, .95, .93), "rough": .95}}

# ---------- bản rút gọn (LOD) cho vật ở xa: cùng kích thước, ít tam giác hơn nhiều ----------
def stool_lod():
    m, mats = Mesh(), None; H = .30; t = "tint_plastic"
    m.box(t, (.34, .03, .34), T(0, H - .015, 0))
    for sx in (-1, 1):
        for sz in (-1, 1):
            xf, L = align((sx * .15, H - .03, sz * .15), (sx * .185, 0, sz * .185)); m.box(t, (.05, L, .05), xf, col=.92)
    for i in range(4): m.box(t, (.3, .05, .012), M(Ry(i * TAU / 4), T(0, H - .052, .157)), col=.9)
    return m, {t: {"c": (1, 1, 1), "rough": .42}}
def moto_lod():
    m = Mesh(); P, DK, RB = "tint_paint", "dark", "rubber"
    for z in (.64, -.6): m.cyl(RB, .27, .1, 10, M(T(.05, .27, z), Rz(math.pi / 2)))
    m.sphere(P, 1, 8, M(T(0, .64, .36), Rx(-.32), S(.2, .3, .085))); m.sphere(P, 1, 8, M(T(0, .6, -.32), S(.15, .14, .4))); m.sphere(P, 1, 8, M(T(0, .96, .52), S(.12, .11, .13)))
    m.box("leather", (.25, .075, .66), T(0, .765, -.18)); m.box("engine", (.2, .21, .3), T(0, .33, .02))
    m.box(DK, (.68, .03, .03), T(0, 1.01, .44)); m.box(DK, (.04, .6, .04), M(T(0, .6, .58), Rx(-.3)))
    m.box("lamp", (.1, .07, .02), T(0, .975, .66)); m.box("lamp_red", (.1, .04, .03), T(0, .7, -.72))
    return m, {P: {"c": (1, 1, 1), "rough": .28, "metal": .15}, DK: {"c": (.06, .06, .065), "rough": .55}, RB: {"c": (.05, .05, .05), "rough": .88}, "leather": {"c": (.04, .035, .03), "rough": .5},
               "engine": {"c": (.38, .38, .4), "rough": .45, "metal": .7}, "lamp": {"c": (1, .97, .85), "em": (1, .93, .75)}, "lamp_red": {"c": (.7, .05, .03), "em": (1, .08, .03)}}
def sau_lod(seed=11):
    rng = np.random.default_rng(seed); m = Mesh()
    m.tube("bark", [(0, 0, 0), (0, 2.8, 0), (.1, 5.6, 0)], [.3, .24, .18], 7, colfn=lambda p, t: (.82, .8, .76) if p[1] < 1.25 else (.11, .085, .068))
    for k in range(5):
        a = k * TAU / 5; m.tube("bark", [(0, 4.6, 0), (math.cos(a) * 2.2, 6.6, math.sin(a) * 2.2)], [.12, .06], 5, cap=False, colfn=lambda p, t: (.11, .085, .068))
    cen = np.array([0, 8.4, 0])
    for i in range(9):
        v = rng.normal(0, 1, 3); v /= np.linalg.norm(v); v[1] = abs(v[1]) * .6; c = cen + v * np.array([2.6, 1.8, 2.6]); r = rng.uniform(1.8, 2.3)
        def leaf(p, vv):
            g = (.55 + .45 * np.clip((p[1] - 5.5) / 6, 0, 1)) ** 2.2; return (.035 * g * 1.6, .12 * g * 1.6, .022 * g * 1.6)
        m.blob("leaf", c, (r, r * .75, r), sub=1, amp=.18, seed=int(rng.integers(1e6)), colfn=leaf)
    return m, {"bark": {"c": (1, 1, 1), "rough": .92}, "leaf": {"c": (1, 1, 1), "rough": .78}}
def lamp_lod():
    m = Mesh(); G = "iron"
    m.lathe(G, [(.22, 0), (.18, .2), (.12, .7), (.075, .7), (.065, 3.7), (.09, 3.75), (0, 4.0)], 8)
    m.tube(G, [(0, 3.72, 0), (0, 3.92, .26), (0, 3.97, .45)], .025, 5, cap=False)
    m.lathe("glass_lamp", [(.11, 3.78), (.17, 4.02), (.2, 4.04), (.0, 4.22)], 6, T(0, 0, .45))
    return m, {G: {"c": srgb("#24382c"), "rough": .45, "metal": .55}, "glass_lamp": {"c": (1, .92, .7), "rough": .15, "em": (1, .82, .5)}}

MODELS = {"stool": stool, "moto": moto, "sau": sau_tree, "lamp": street_lamp, "stall": tea_stall,
          "stool_lod": stool_lod, "moto_lod": moto_lod, "sau_lod": sau_lod, "lamp_lod": lamp_lod}

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for name, fn in MODELS.items():
        mesh, mats = fn(); path = os.path.join(OUT, name + ".glb"); tris = write_glb(path, mesh, mats)
        print(f"{name:10s} {tris:6d} tam giác  {os.path.getsize(path) / 1024:7.1f} KB")
