#!/usr/bin/env python3
"""Trà Đá Phố Cổ 6.2 — dựng xích lô và xe đạp chở hoa (kèm bản rút gọn), xuất public/models/.
Dùng thư viện trong tools/make_models.py (bản 6.1).  Chạy: python3 tools/make_vehicles.py"""
import math, os
import numpy as np
from make_models import Mesh, T, S, Rx, Ry, Rz, M, write_glb, srgb, OUT
TAU = math.tau

def _spoked(m, x, y, z, r, w, n=16, RB="rubber", CH="chrome"):
    X = M(T(x, y, z), Rz(math.pi / 2))
    m.torus(RB, r - .025, .025, 28, 6, xf=X); m.torus(CH, r - .052, .008, 24, 4, xf=X); m.cyl(CH, .03, w, 8, M(X, T(0, -w / 2, 0)))
    for k in range(n):
        a = k * TAU / n; m.tube(CH, [(x + (.012 if k % 2 else -.012), y, z), (x, y + math.sin(a) * (r - .055), z + math.cos(a) * (r - .055))], .0035, 3, cap=False)

def cyclo():
    """Xích lô Hà Nội: thùng ngồi đỏ sẫm phía trước, mui gấp (nhuộm), 2 bánh trước, 1 bánh sau, yên và tay lái người đạp phía sau."""
    m = Mesh(); RD, H, MT = "body_red", "tint_hood", "metal"
    for sx in (-1, 1): _spoked(m, sx * .45, .3, .55, .3, .06)
    _spoked(m, 0, .33, -.95, .33, .06)
    m.tube(MT, [(-.45, .3, .55), (.45, .3, .55)], .02, 6)
    m.tube(MT, [(0, .3, .55), (0, .42, .1), (0, .45, -.4), (0, .42, -.67), (0, .33, -.95)], .028, 8, cap=False)
    m.tube(MT, [(0, .45, -.4), (0, .8, -.5), (0, .96, -.95)], .025, 8, cap=False); m.tube(MT, [(0, .42, -.67), (0, .93, -.93)], .025, 8)
    m.tube(MT, [(0, .33, -.95), (0, .93, -.93)], .018, 6)
    m.rbox("leather", (.16, .05, .26), .02, T(0, .985, -.95), k=2)
    m.cyl(MT, .09, .02, 16, M(T(-.03, .42, -.67), Rz(math.pi / 2)))
    for sd in (1, -1): m.rbox("rubber", (.1, .02, .05), .006, T(sd * .1, .42 + sd * .1, -.67 + sd * .08))
    m.tube(MT, [(-.28, 1.16, -.47), (-.1, 1.12, -.42), (.1, 1.12, -.42), (.28, 1.16, -.47)], .014, 6)
    for sd in (-1, 1): m.tube("rubber", [(sd * .2, 1.14, -.45), (sd * .3, 1.17, -.48)], .02, 6)
    m.tube(MT, [(0, 1.12, -.42), (0, .82, .25)], .02, 6, cap=False)
    m.rbox(RD, (.86, .1, .58), .04, T(0, .6, .5), k=2)
    m.rbox("cushion", (.78, .08, .5), .035, T(0, .69, .52), k=2)
    m.rbox(RD, (.86, .6, .08), .04, M(T(0, .92, .24), Rx(-.18)), k=2)
    m.rbox("cushion", (.76, .48, .05), .03, M(T(0, .94, .29), Rx(-.18)), k=2)
    for sd in (-1, 1):
        m.rbox(RD, (.05, .32, .58), .02, T(sd * .43, .78, .5), k=2)
        m.tube("chrome", [(sd * .44, .95, .25), (sd * .44, .96, .62), (sd * .44, .88, .78)], .014, 6)
    m.rbox(RD, (.7, .04, .3), .015, M(T(0, .36, .86), Rx(.25)))
    m.rbox(RD, (.86, .3, .05), .02, T(0, .48, .8), k=2)
    for k, (z0, z1) in enumerate(((.12, .3), (.3, .44), (.44, .56))):  # mui gấp ba nếp
        R0 = .45 - k * .01; arc = [(math.cos(math.pi * i / 16) * R0, .95 + math.sin(math.pi * i / 16) * R0 * .85 - k * .03) for i in range(17)]
        for i in range(16):
            (xa, ya), (xb, yb) = arc[i], arc[i + 1]
            m.add(H, [(xa, ya, z0), (xb, yb, z0), (xb, yb, z1), (xa, ya, z1)], [(xa, ya - .95, 0), (xb, yb - .95, 0), (xb, yb - .95, 0), (xa, ya - .95, 0)], [0, 1, 2, 0, 2, 3, 0, 2, 1, 0, 3, 2], col=.9 + .1 * (i % 2))
        m.tube(MT, [(x, y, z1) for x, y in arc], .008, 4, cap=False)
    m.sphere("lamp", .035, 8, T(-.46, .7, .83))
    return m, {RD: {"c": srgb("#7a2a22"), "rough": .35, "metal": .1}, H: {"c": (1, 1, 1), "rough": .8}, MT: {"c": (.2, .2, .21), "rough": .45, "metal": .7},
               "chrome": {"c": (.85, .85, .87), "rough": .2, "metal": 1}, "rubber": {"c": (.05, .05, .05), "rough": .9}, "leather": {"c": (.05, .04, .035), "rough": .55},
               "cushion": {"c": srgb("#5a1d1a"), "rough": .7}, "lamp": {"c": (1, .95, .8), "em": (1, .9, .7)}}

def cyclo_lod():
    m = Mesh(); RD, H = "body_red", "tint_hood"
    for x, z, r in ((-.45, .55, .3), (.45, .55, .3), (0, -.95, .33)): m.cyl("rubber", r, .06, 10, M(T(x + .03, .3 if z > 0 else .33, z), Rz(math.pi / 2)))
    m.box(RD, (.86, .2, .58), T(0, .65, .5)); m.box(RD, (.86, .6, .08), M(T(0, .92, .24), Rx(-.18))); m.box("metal", (.05, .05, 1.4), T(0, .45, -.3))
    m.box("metal", (.05, .6, .05), T(0, .7, -.93)); m.box(H, (.9, .06, .45), M(T(0, 1.38, .32), Rx(-.35)))
    return m, {RD: {"c": srgb("#7a2a22"), "rough": .35}, H: {"c": (1, 1, 1), "rough": .8}, "metal": {"c": (.2, .2, .21), "rough": .45}, "rubber": {"c": (.05, .05, .05), "rough": .9}}

def bike():
    """Xe đạp chở hoa: khung kiểu cũ, giỏ trước, giá sau chất đầy hoa."""
    m = Mesh(); F = "frame"; rng = np.random.default_rng(5)
    _spoked(m, 0, .33, .55, .33, .04, 20); _spoked(m, 0, .33, -.5, .33, .04, 20)
    pts = {"bb": (0, .37, .06), "seat": (0, .9, -.2), "head": (0, .92, .4)}
    for a, b in (("bb", "seat"), ("bb", "head"), ("seat", "head")): m.tube(F, [pts[a], pts[b]], .018, 6)
    m.tube(F, [(0, .37, .06), (.04, .33, -.5)], .013, 5); m.tube(F, [(0, .9, -.2), (.04, .33, -.5)], .012, 5)
    m.tube(F, [(0, .92, .4), (0, .33, .55)], .015, 6); m.tube(F, [(0, .92, .4), (0, 1.1, .42)], .015, 6)
    m.tube(F, [(-.25, 1.12, .38), (0, 1.1, .42), (.25, 1.12, .38)], .012, 6)
    for sd in (-1, 1): m.tube("rubber", [(sd * .2, 1.115, .39), (sd * .28, 1.125, .37)], .017, 6)
    m.tube(F, [(0, .9, -.2), (0, .95, -.24)], .012, 5); m.rbox("leather", (.13, .05, .22), .02, T(0, .965, -.26), k=2)
    m.cyl("chrome", .09, .02, 16, M(T(-.03, .37, .06), Rz(math.pi / 2)))
    m.lathe("wicker", [(0, 0), (.15, 0), (.18, .2), (.17, .21), (.15, .02), (0, .02)], 4, M(T(0, .98, .6), Ry(math.pi / 4)))
    m.box("wicker", (.36, .03, .5), T(0, .78, -.6)); m.tube(F, [(0, .78, -.36), (0, .52, -.5)], .01, 4)
    cols = ["#e63946", "#ffb703", "#ffffff", "#f28482", "#c77dff", "#ff8fab", "#fb8500"]
    for i in range(40):
        a = rng.uniform(0, TAU); rr = rng.uniform(0, .26); x, z = math.cos(a) * rr, -.6 + math.sin(a) * rr * .8
        m.tube("stem", [(x * .3, .8, z * .9 - .06), (x, 1.0 + rng.uniform(0, .3), z)], .006, 3, cap=False)
        m.sphere("flower", .045, 6, T(x, 1.0 + rng.uniform(0, .35), z), col=srgb(cols[i % len(cols)]))
    for i in range(10): m.sphere("flower", .04, 6, T(rng.uniform(-.12, .12), 1.12 + rng.uniform(0, .08), .6 + rng.uniform(-.1, .1)), col=srgb(cols[(i * 3) % len(cols)]))
    return m, {F: {"c": srgb("#2b5a8a"), "rough": .35, "metal": .4}, "chrome": {"c": (.85, .85, .87), "rough": .2, "metal": 1}, "rubber": {"c": (.05, .05, .05), "rough": .9},
               "leather": {"c": (.08, .06, .05), "rough": .55}, "wicker": {"c": srgb("#b98a52"), "rough": .85}, "stem": {"c": srgb("#3f7a35"), "rough": .8}, "flower": {"c": (1, 1, 1), "rough": .6}}

def bike_lod():
    m = Mesh()
    for z in (.55, -.5): m.torus("rubber", .31, .02, 12, 4, xf=M(T(0, .33, z), Rz(math.pi / 2)))
    m.box("frame", (.04, .05, .7), M(T(0, .65, .1), Rx(.2))); m.box("frame", (.5, .03, .03), T(0, 1.1, .4))
    m.box("wicker", (.36, .05, .5), T(0, .8, -.6)); m.sphere("flower", 1, 8, M(T(0, 1.05, -.6), S(.28, .22, .25)))
    return m, {"frame": {"c": srgb("#2b5a8a"), "rough": .35}, "rubber": {"c": (.05, .05, .05), "rough": .9}, "wicker": {"c": srgb("#b98a52"), "rough": .85}, "flower": {"c": srgb("#e8708a"), "rough": .6}}

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for name, fn in {"cyclo": cyclo, "cyclo_lod": cyclo_lod, "bike": bike, "bike_lod": bike_lod}.items():
        mesh, mats = fn(); p = os.path.join(OUT, name + ".glb"); t = write_glb(p, mesh, mats)
        print(f"{name:10s} {t:6d} tam giác  {os.path.getsize(p) / 1024:7.1f} KB")
