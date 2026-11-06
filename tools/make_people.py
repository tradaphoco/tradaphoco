#!/usr/bin/env python3
"""Trà Đá Phố Cổ — dựng nhân vật có khung xương và hoạt cảnh, xuất public/models/nguoi.glb (glTF 2.0).

Chạy:  python3 tools/make_people.py
Nhân vật dùng chung cho mọi người trong phố. Màu da, áo, quần, tóc, mũ… đổi theo từng người
bằng bảng màu trong game (thuộc tính _REGION của đỉnh), nên chỉ cần một file.

Khung xương (18 khớp, tư thế nghỉ: đứng thẳng, tay buông, mặt hướng +Z, phía +X là tay phải trong game):
  root › hips › spine › chest › neck › head
                        chest › armR › foreR › handR,   chest › armL › foreL › handL
        hips › thighR › shinR › footR,                  hips › thighL › shinL › footL
"""
import json, math, struct, os
import numpy as np
from make_models import Mesh, T, S, Rx, Ry, Rz, M, align, OUT

D = math.radians
J = [("root", -1, (0, 0, 0)), ("hips", 0, (0, .92, 0)), ("spine", 1, (0, 1.06, 0)), ("chest", 2, (0, 1.24, 0)),
     ("neck", 3, (0, 1.44, 0)), ("head", 4, (0, 1.52, 0)),
     ("armR", 3, (.185, 1.39, 0)), ("foreR", 6, (.2, 1.12, 0)), ("handR", 7, (.21, .885, 0)),
     ("armL", 3, (-.185, 1.39, 0)), ("foreL", 9, (-.2, 1.12, 0)), ("handL", 10, (-.21, .885, 0)),
     ("thighR", 1, (.095, .9, 0)), ("shinR", 12, (.1, .49, 0)), ("footR", 13, (.1, .08, 0)),
     ("thighL", 1, (-.095, .9, 0)), ("shinL", 15, (-.1, .49, 0)), ("footL", 16, (-.1, .08, 0))]
JI = {n: i for i, (n, _, _) in enumerate(J)}
JP = {n: np.array(p, float) for n, _, p in J}
# vùng màu: 0 da, 1 áo, 2 quần, 3 tóc, 4 tối, 5 mũ, 6 khăn/băng, 7 hàng gánh, 8 cẳng tay; cố định 9–19 (xem people3d.js)
R_SKIN, R_SHIRT, R_PANTS, R_HAIR, R_DARK, R_HAT, R_SCARF, R_GOODS, R_FORE = range(9)
R_NON, R_RED, R_GOLD, R_TEA, R_GLASS, R_WOOD, R_WHITE, R_OLIVE, R_ICE, R_CONE, R_LIP = range(9, 20)

def body():
    m = Mesh()
    def put(bone, region, fn): fn(m, f"b{JI[bone]}_r{region}")
    for s, sd in (("R", 1), ("L", -1)):
        x = .1 * sd
        put("thigh" + s, R_PANTS, lambda m, k: m.tube(k, [(x * .95, .93, 0), (x, .7, .005), (x, .5, 0)], [.083, .072, .062], 8))
        put("shin" + s, R_PANTS, lambda m, k: m.tube(k, [(x, .5, 0), (x, .3, -.008), (x, .1, 0)], [.062, .057, .047], 8))
        put("shin" + s, R_PANTS, lambda m, k: m.sphere(k, .063, 8, T(x, .49, 0)))
        put("foot" + s, R_DARK, lambda m, k: m.rbox(k, (.1, .075, .25), .03, T(x, .042, .05)))
        put("foot" + s, R_DARK, lambda m, k: m.sphere(k, .05, 6, T(x, .08, 0)))
    put("hips", R_PANTS, lambda m, k: m.rbox(k, (.33, .22, .21), .06, T(0, .94, -.005)))
    put("spine", R_SHIRT, lambda m, k: m.rbox(k, (.32, .24, .2), .06, T(0, 1.11, 0)))
    put("chest", R_SHIRT, lambda m, k: m.rbox(k, (.36, .28, .215), .07, T(0, 1.29, .003)))
    for sd in (1, -1): put("chest", R_SHIRT, lambda m, k: m.sphere(k, .072, 8, T(.175 * sd, 1.375, 0)))
    put("chest", R_SHIRT, lambda m, k: m.lathe(k, [(.075, 1.4), (.068, 1.44), (.0, 1.445)], 10))
    put("neck", R_SKIN, lambda m, k: m.cyl(k, .048, .12, 8, T(0, 1.42, .005)))
    put("head", R_SKIN, lambda m, k: m.sphere(k, 1, 14, M(T(0, 1.615, .012), S(.094, .116, .104))))
    put("head", R_SKIN, lambda m, k: m.sphere(k, 1, 8, M(T(0, 1.565, .045), S(.068, .05, .07))))
    for sd in (1, -1):
        put("head", R_SKIN, lambda m, k: m.sphere(k, 1, 6, M(T(.093 * sd, 1.615, .0), S(.018, .03, .022))))
        put("head", R_DARK, lambda m, k: m.sphere(k, 1, 6, M(T(.034 * sd, 1.632, .098), S(.013, .014, .008))))
        put("head", R_HAIR, lambda m, k: m.rbox(k, (.04, .008, .012), .003, M(T(.036 * sd, 1.66, .1), Rz(-.12 * sd))))
    put("head", R_SKIN, lambda m, k: m.sphere(k, 1, 8, M(T(0, 1.605, .112), S(.017, .024, .02))))
    put("head", R_LIP, lambda m, k: m.rbox(k, (.036, .009, .01), .004, T(0, 1.572, .106)))
    def hair(m, k):
        m.sphere(k, 1, 14, M(T(0, 1.632, -.004), S(.104, .11, .114)))
        P = m.parts[k]["P"][-1]; n = P - np.array([0, 1.632, -.004]); n /= np.linalg.norm(n, axis=1, keepdims=True)
        hide = (n[:, 2] > .25) & (n[:, 1] < .42); hide |= (n[:, 1] < -.15)
        P[hide] = np.array([0, 1.62, .0]) + (P[hide] - np.array([0, 1.62, 0])) * .82
    put("head", R_HAIR, hair)
    for s, sd in (("R", 1), ("L", -1)):
        put("arm" + s, R_SHIRT, lambda m, k: m.tube(k, [(.19 * sd, 1.4, 0), (.198 * sd, 1.26, .003), (.2 * sd, 1.13, 0)], [.058, .05, .046], 7))
        put("fore" + s, R_FORE, lambda m, k: m.tube(k, [(.2 * sd, 1.13, 0), (.205 * sd, 1.0, .004), (.21 * sd, .9, 0)], [.045, .042, .035], 7))
        put("fore" + s, R_FORE, lambda m, k: m.sphere(k, .046, 7, T(.2 * sd, 1.12, 0)))
        put("hand" + s, R_SKIN, lambda m, k: m.sphere(k, 1, 8, M(T(.212 * sd, .845, .008), S(.032, .05, .042))))
        put("hand" + s, R_SKIN, lambda m, k: m.sphere(k, 1, 6, M(T(.19 * sd, .865, .035), S(.014, .03, .014))))
    return m

def acc(fn):
    m = Mesh(); fn(m); return m

def accessories():
    A = []
    A.append(("hat_non", "head", acc(lambda m: (m.lathe("r9", [(0, 1.84), (.27, 1.665), (.28, 1.655), (0, 1.69)], 24), m.torus("r14", .14, .006, 20, 4, xf=T(0, 1.73, 0))))))
    A.append(("hat_coi", "head", acc(lambda m: (m.sphere("r16", 1, 16, M(T(0, 1.68, .005), S(.125, .1, .135))), m.lathe("r16", [(.12, 1.655), (.2, 1.64), (.2, 1.632), (.12, 1.645)], 20), m.sphere("r10", .016, 6, T(0, 1.73, .13))))))
    A.append(("hat_cap", "head", acc(lambda m: (m.sphere("r10", 1, 16, M(T(0, 1.69, -.005), S(.11, .07, .12))), m.rbox("r10", (.17, .012, .11), .004, M(T(0, 1.685, .13), Rx(.12)))))))
    A.append(("hat_len", "head", acc(lambda m: (m.sphere("r5", 1, 16, M(T(0, 1.685, -.005), S(.112, .1, .122))), m.torus("r5", .105, .016, 18, 6, xf=T(0, 1.645, -.005)), m.sphere("r5", .025, 8, T(0, 1.79, -.01))))))
    A.append(("hat_kepi", "head", acc(lambda m: (m.cyl("r5", .118, .085, 20, T(0, 1.655, 0), r2=.13), m.cyl("r5", .14, .02, 20, T(0, 1.74, -.005)), m.cyl("r10", .121, .022, 20, T(0, 1.665, 0)),
                                                 m.rbox("r4", (.19, .012, .1), .004, M(T(0, 1.66, .125), Rx(.2))), m.sphere("r11", 1, 8, M(T(0, 1.71, .13), S(.022, .026, .008)))))))
    A.append(("hat_dp", "head", acc(lambda m: (m.sphere("r5", 1, 16, M(T(0, 1.69, -.005), S(.112, .075, .122))), m.rbox("r5", (.17, .012, .1), .004, M(T(0, 1.68, .13), Rx(.12)))))))
    A.append(("hat_helmet", "head", acc(lambda m: (m.sphere("r5", 1, 18, M(T(0, 1.66, -.005), S(.135, .13, .145))), m.rbox("r4", (.2, .012, .07), .004, M(T(0, 1.69, .14), Rx(.25)))))))
    A.append(("beard", "head", acc(lambda m: m.sphere("r3", 1, 10, M(T(0, 1.54, .07), S(.05, .055, .035))))))
    A.append(("scarf", "chest", acc(lambda m: (m.torus("r6", .07, .03, 20, 8, xf=T(0, 1.43, .005)), m.rbox("r6", (.07, .24, .025), .01, M(T(.06, 1.3, .12), Rz(.08)))))))
    A.append(("badge", "chest", acc(lambda m: (m.rbox("r11", (.045, .055, .01), .004, T(-.09, 1.3, .117)), m.rbox("r10", (.06, .016, .01), .003, T(.09, 1.32, .117))))))
    A.append(("boards", "chest", acc(lambda m: [m.rbox("r10", (.1, .016, .1), .005, T(.13 * sd, 1.448, 0)) for sd in (1, -1)])))
    A.append(("band", "armL", acc(lambda m: m.cyl("r10", .057, .06, 12, T(-.197, 1.22, 0)))))
    A.append(("belt", "hips", acc(lambda m: (m.rbox("r4", (.34, .045, .22), .015, T(0, 1.0, -.005)), m.rbox("r11", (.05, .035, .01), .003, T(0, 1.0, .108))))))
    hx, hy, hz = .205, .835, .045
    A.append(("it_cup", "handR", acc(lambda m: m.lathe("r13", [(0, 0), (.03, 0), (.035, .105), (.032, .105), (.027, .004), (0, .004)], 14, T(hx, hy - .05, hz)))))
    A.append(("it_tea", "handR", acc(lambda m: m.lathe("r12", [(0, 0), (.028, 0), (.032, .08), (0, .08)], 12, T(hx, hy - .044, hz)))))
    A.append(("it_coffee", "handR", acc(lambda m: (m.lathe("r15", [(0, 0), (.03, 0), (.034, .06), (0, .06)], 14, T(hx, hy - .03, hz)), m.cyl("r4", .03, .004, 12, T(hx, hy + .028, hz))))))
    A.append(("it_ice", "handR", acc(lambda m: (m.lathe("r18", [(0, 0), (.032, .12), (0, .12)], 12, T(hx, hy - .07, hz)), m.sphere("r17", .036, 12, T(hx, hy + .06, hz))))))
    A.append(("it_pour", "handR", acc(lambda m: (m.lathe("r15", [(0, 0), (.07, 0), (.085, .05), (.08, .1), (.05, .13), (0, .13)], 18, T(hx, hy - .02, hz + .07)),
                                                 m.tube("r15", [(hx, hy + .02, hz + .14), (hx, hy + .06, hz + .2), (hx, hy + .09, hz + .24)], [.016, .011, .008], 8)))))
    A.append(("it_fan", "handR", acc(lambda m: (m.cyl("r14", .008, .14, 6, T(hx, hy - .02, hz)), m.cyl("r9", .11, .008, 16, M(T(hx, hy + .2, hz), Rx(math.pi / 2), T(0, -.004, 0)))))))
    A.append(("it_loa", "handR", acc(lambda m: (m.cyl("r4", .025, .12, 10, T(hx, hy - .06, hz)), m.cyl("r15", .04, .24, 16, M(T(hx, hy + .05, hz - .02), Rx(math.pi / 2)), r2=.11),
                                                m.torus("r10", .11, .012, 18, 6, xf=M(T(hx, hy + .05, hz + .22), Rx(math.pi / 2)))))))
    A.append(("it_piece", "handR", acc(lambda m: m.cyl("r9", .03, .015, 14, T(hx, hy - .03, hz)))))
    def pole(m):
        sy = 1.45; m.tube("r14", [(-.6, sy - .03, 0), (.18, sy, 0), (.95, sy - .03, 0)], .022, 8)
        for bx in (-.52, .87):
            for k in range(3): a = k * math.tau / 3; m.tube("r4", [(bx, sy - .02, 0), (bx + math.cos(a) * .2, .6, math.sin(a) * .2)], .004, 4, cap=False)
            m.lathe("r14", [(0, .32), (.21, .34), (.25, .58), (.24, .6), (0, .6)], 18, T(bx, 0, 0))
            m.blob("r7", (bx, .64, 0), (.22, .1, .22), sub=1, amp=.25, seed=int(abs(bx) * 100) + 7)
    A.append(("it_pole", "chest", acc(pole)))
    return A

def ik(hip, foot, L1=.41, L2=.41):
    dy, dz = foot[0] - hip[0], foot[1] - hip[1]; d = min(math.hypot(dy, dz), L1 + L2 - 1e-4)
    a = math.atan2(dz, -dy); c = math.acos(max(-1, min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))))
    th = -(a + c); kn = math.pi - math.acos(max(-1, min(1, (L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2))))
    return math.degrees(th), math.degrees(kn)

STAND = {"armR": (-4, 0, 6), "armL": (-4, 0, -6), "foreR": (-10, 0, 0), "foreL": (-10, 0, 0), "spine": (1, 0, 0)}
SIT = {"hipsT": (0, .43, -.03), "thighR": (-86, 4, 6), "thighL": (-86, -4, -6), "shinR": (84, 0, 0), "shinL": (84, 0, 0), "footR": (2, 0, 0), "footL": (2, 0, 0),
       "spine": (7, 0, 0), "chest": (4, 0, 0), "head": (4, 0, 0),
       "armR": (-28, 0, 10), "foreR": (-62, 0, 0), "handR": (90, 0, 0), "armL": (-24, 0, -8), "foreL": (-56, 0, 0), "handL": (20, 0, 0)}
def P(base, **kw):
    d = dict(base)
    for k, v in kw.items(): d[k] = v
    return d
def walk_keys(carry=False):
    ks = []
    for i, t in enumerate((0, .25, .5, .75, 1.0)):
        ph = i % 4; s = 1 if ph < 2 else -1
        if ph in (0, 2): th1, sh1, th2, sh2, y = -26, 6, 22, 38, .905
        else: th1, sh1, th2, sh2, y = 0, 4, -14, 62, .935
        if s < 0: th1, sh1, th2, sh2 = th2, sh2, th1, sh1
        p = {"hipsT": (0, y, 0), "thighR": (th1, 0, 0), "shinR": (sh1, 0, 0), "footR": (-th1 * .3 - sh1 * .5 + 8, 0, 0),
             "thighL": (th2, 0, 0), "shinL": (sh2, 0, 0), "footL": (-th2 * .3 - sh2 * .5 + 8, 0, 0),
             "spine": (4, -6 * s if ph in (0, 2) else 0, 0), "chest": (2, 8 * s if ph in (0, 2) else 0, 0),
             "armR": (24 * s if ph in (0, 2) else 0, 0, 6), "foreR": (-18 if s > 0 else -32, 0, 0), "armL": (-24 * s if ph in (0, 2) else 0, 0, -6), "foreL": (-32 if s > 0 else -18, 0, 0)}
        if carry: p.update({"armR": (-22, 0, 18), "foreR": (-150, 0, 0), "handR": (20, 0, 0), "spine": (2, 0, -3)})
        ks.append((t, p))
    return ks
def pedal_keys(hip_y=1.0, cy=.42, cz=.28, rad=.16):
    ks = []
    for i in range(9):
        t = i / 8; a = t * math.tau; p = {"hipsT": (0, hip_y, 0), "spine": (16, 0, 0), "chest": (6, 0, 0), "head": (-14, 0, 0)}
        for s, ph in (("R", 0), ("L", math.pi)):
            fy, fz = cy + math.sin(a + ph) * rad, cz + math.cos(a + ph) * rad; th, kn = ik((hip_y, 0), (fy, fz))
            p["thigh" + s] = (th, 0, 4 if s == "R" else -4); p["shin" + s] = (kn, 0, 0); p["foot" + s] = (-(th + kn) - 5, 0, 0)
        p["armR"] = (-58, 0, 12); p["foreR"] = (-22, 0, 0); p["armL"] = (-58, 0, -12); p["foreL"] = (-22, 0, 0)
        ks.append((t, p))
    return ks
RIDE = {"hipsT": (0, .84, -.13), "thighR": (-72, 0, 14), "thighL": (-72, 0, -14), "shinR": (100, 0, 0), "shinL": (100, 0, 0), "footR": (-28, 0, 0), "footL": (-28, 0, 0),
        "spine": (12, 0, 0), "chest": (4, 0, 0), "head": (-12, 0, 0), "armR": (-64, 0, 18), "foreR": (-24, 0, 0), "armL": (-64, 0, -18), "foreL": (-24, 0, 0)}
def loop(p0, p1, dur, n=2):
    return [(dur * i / (2 * n), p0 if i % 2 == 0 else p1) for i in range(2 * n + 1)]

SIP = P(SIT, armR=(-56, 0, 22), foreR=(-140, 0, 0), handR=(212, 0, 0), head=(-14, 0, 0))
SEED = P(SIT, armL=(-48, 0, -20), foreL=(-146, 0, 0), handL=(60, 0, 0), head=(4, 0, 0))
CHEERS_S = P(SIT, armR=(-100, 0, 6), foreR=(-38, 0, 0), handR=(138, 0, 0), spine=(10, 0, 0))
OFFER_S = P(SIT, armR=(-62, 0, 4), foreR=(-26, 0, 0), handR=(88, 0, 0), spine=(14, 0, 0))
CHEERS_T = P(STAND, armR=(-100, 0, 6), foreR=(-38, 0, 0), handR=(138, 0, 0))
OFFER_T = P(STAND, armR=(-60, 0, 4), foreR=(-24, 0, 0), handR=(84, 0, 0), spine=(8, 0, 0))
WAVE_A = {"armR": (-10, 0, 150), "foreR": (0, 0, 25)}; WAVE_B = {"armR": (-10, 0, 150), "foreR": (0, 0, -25)}
ICE0 = P(STAND, armR=(-30, 0, 8), foreR=(-80, 0, 0), handR=(110, 0, 0)); ICE1 = P(STAND, armR=(-50, 0, 22), foreR=(-140, 0, 0), handR=(190, 0, 0), head=(-8, 0, 0))
CLIPS = {
    "stand": loop(P(STAND), P(STAND, chest=(2, 0, 0), head=(-2, 3, 0)), 4.0, 1),
    "walk": walk_keys(), "walk_carry": walk_keys(True),
    "sit": loop(P(SIT), P(SIT, chest=(5.5, 0, 0), head=(2, 0, 0)), 4.0, 1),
    "sit_sip": [(0, P(SIT)), (.55, SIP), (1.1, SIP), (1.8, P(SIT))],
    "sit_seed": [(0, P(SIT)), (.35, SEED), (.5, P(SEED, head=(10, 0, 0))), (.8, P(SIT))],
    "sit_nod": [(0, P(SIT)), (.25, P(SIT, head=(26, 0, 0), neck=(6, 0, 0))), (.5, P(SIT)), (.75, P(SIT, head=(22, 0, 0), neck=(5, 0, 0))), (1.0, P(SIT))],
    "sit_cheers": [(0, P(SIT)), (.5, CHEERS_S), (.9, P(CHEERS_S, handR=(130, 0, 0))), (1.4, P(SIT))],
    "sit_offer": [(0, P(SIT)), (.5, OFFER_S), (.9, OFFER_S), (1.4, P(SIT))],
    "sit_wave": [(0, P(SIT))] + [(.25 + .25 * i, P(SIT, **(WAVE_A if i % 2 == 0 else WAVE_B))) for i in range(5)] + [(1.6, P(SIT))],
    "stand_wave": [(0, P(STAND))] + [(.25 + .25 * i, P(STAND, **(WAVE_A if i % 2 == 0 else WAVE_B))) for i in range(5)] + [(1.6, P(STAND))],
    "stand_cheers": [(0, P(STAND)), (.5, CHEERS_T), (.9, CHEERS_T), (1.4, P(STAND))],
    "stand_offer": [(0, P(STAND)), (.5, OFFER_T), (.9, OFFER_T), (1.4, P(STAND))],
    "sit_pour": [(0, P(SIT, armR=(-50, 0, 14), foreR=(-40, 0, 0), handR=(90, 0, 0))), (.5, P(SIT, armR=(-58, 0, 10), foreR=(-46, 0, 0), handR=(104, 0, -55), spine=(14, 0, 0))),
                 (1.1, P(SIT, armR=(-58, 0, 10), foreR=(-46, 0, 0), handR=(104, 0, -60), spine=(14, 0, 0))), (1.6, P(SIT, armR=(-50, 0, 14), foreR=(-40, 0, 0), handR=(90, 0, 0)))],
    "sit_fan": loop(P(SIT, armR=(-40, 0, 12), foreR=(-60, -25, 0), handR=(100, 0, 0)), P(SIT, armR=(-40, 0, 12), foreR=(-60, 25, 0), handR=(100, 0, 0)), .4, 1),
    "sit_chess": loop(P(SIT, armR=(-52, 0, 4), foreR=(-30, 0, 0), handR=(60, 0, 0), spine=(18, 0, 0), head=(18, 0, 0)), P(SIT, armR=(-48, 0, 4), foreR=(-34, 0, 0), handR=(60, 0, 0), spine=(18, 0, 0), head=(20, 6, 0)), 3.0, 1),
    "stand_loa": loop(P(STAND, armR=(-66, 0, 16), foreR=(-134, 0, 0), handR=(200, 0, 0)), P(STAND, armR=(-68, 0, 16), foreR=(-134, 0, 0), handR=(202, 0, 0), head=(-3, 0, 0)), 2.0, 1),
    "stand_ice": [(0, ICE0), (.8, ICE1), (1.4, ICE1), (2.4, ICE0), (3.0, ICE0)],
    "ride": loop(P(RIDE), P(RIDE, head=(-10, 4, 0)), 3.0, 1),
    "pedal": pedal_keys(), "pedal_cyclo": pedal_keys(),
}

def quat(e):
    x, y, z = (D(a) for a in e); cx, sx, cy, sy, cz, sz = math.cos(x / 2), math.sin(x / 2), math.cos(y / 2), math.sin(y / 2), math.cos(z / 2), math.sin(z / 2)
    return (sx * cy * cz + cx * sy * sz, cx * sy * cz - sx * cy * sz, cx * cy * sz + sx * sy * cz, cx * cy * cz - sx * sy * sz)

def write(path):
    bin_ = bytearray(); views, accs = [], []
    def push(arr, target=None, comp=5126, typ="SCALAR", mm=False):
        while len(bin_) % 4: bin_.append(0)
        off = len(bin_); b = np.ascontiguousarray(arr).tobytes(); bin_.extend(b)
        v = {"buffer": 0, "byteOffset": off, "byteLength": len(b)}
        if target: v["target"] = target
        views.append(v); a = {"bufferView": len(views) - 1, "componentType": comp, "count": int(len(arr)), "type": typ}
        if mm: a["min"] = np.asarray(arr).min(0).tolist(); a["max"] = np.asarray(arr).max(0).tolist()
        accs.append(a); return len(accs) - 1
    def gather(mesh, offset=np.zeros(3), skin=True):
        P_, N_, C_, I_, Jn, Rg = [], [], [], [], [], []; base = 0
        for key, d in mesh.parts.items():
            if skin: b, r = key[1:].split("_r"); b, r = int(b), int(r)
            else: b, r = 0, int(key[1:])
            Pc = np.concatenate(d["P"]); Nc = np.concatenate(d["N"]); Cc = np.concatenate(d["C"]); Ic = np.concatenate(d["I"])
            P_.append(Pc - offset); N_.append(Nc); C_.append(Cc); I_.append(Ic + base); Jn.append(np.full(len(Pc), b)); Rg.append(np.full(len(Pc), r)); base += len(Pc)
        return (np.concatenate(P_).astype(np.float32), np.concatenate(N_).astype(np.float32), np.clip(np.concatenate(C_), 0, 1).astype(np.float32),
                np.concatenate(I_).astype(np.uint32), np.concatenate(Jn), np.concatenate(Rg).astype(np.float32))
    bm = body(); P, N, C, I, Jn, Rg = gather(bm)
    ao = np.clip(.72 + .28 * np.clip(N[:, 1] * .5 + .5, 0, 1), 0, 1); C = C * ao[:, None]
    attrs = {"POSITION": push(P, 34962, 5126, "VEC3", True), "NORMAL": push(N, 34962, 5126, "VEC3"), "COLOR_0": push(C, 34962, 5126, "VEC3"),
             "JOINTS_0": push(np.stack([Jn, np.zeros_like(Jn), np.zeros_like(Jn), np.zeros_like(Jn)], 1).astype(np.uint8), 34962, 5121, "VEC4"),
             "WEIGHTS_0": push(np.tile(np.array([1, 0, 0, 0], np.float32), (len(P), 1)), 34962, 5126, "VEC4"), "_REGION": push(Rg, 34962, 5126, "SCALAR")}
    meshes = [{"name": "body", "primitives": [{"attributes": attrs, "indices": push(I, 34963, 5125), "material": 0}]}]
    tris = len(I) // 3; nodes = []
    for i, (n, p, pos) in enumerate(J):
        rel = np.array(pos) - (np.array(J[p][2]) if p >= 0 else 0)
        nodes.append({"name": n, "translation": [float(v) for v in rel], "children": []})
        if p >= 0: nodes[p]["children"].append(i)
    for name, bone, am in accessories():
        P2, N2, C2, I2, _, R2 = gather(am, JP[bone], skin=False); tris += len(I2) // 3
        meshes.append({"name": name, "primitives": [{"attributes": {"POSITION": push(P2, 34962, 5126, "VEC3", True), "NORMAL": push(N2, 34962, 5126, "VEC3"),
                       "COLOR_0": push(C2, 34962, 5126, "VEC3"), "_REGION": push(R2, 34962, 5126, "SCALAR")}, "indices": push(I2, 34963, 5125), "material": 0}]})
        nodes.append({"name": name, "mesh": len(meshes) - 1}); nodes[JI[bone]]["children"].append(len(nodes) - 1)
    ibm = []
    for n, p, pos in J: m = np.eye(4); m[:3, 3] = -np.array(pos); ibm.append(m.T.reshape(-1))
    skin = {"joints": list(range(len(J))), "inverseBindMatrices": push(np.array(ibm, np.float32), None, 5126, "MAT4"), "skeleton": 0}
    body_node = len(nodes); nodes.append({"name": "nguoi", "mesh": 0, "skin": 0})
    for nd in nodes:
        if "children" in nd and not nd["children"]: del nd["children"]
    anims = []
    for cname, keys in CLIPS.items():
        times = np.array([k[0] for k in keys], np.float32); ti = push(times, None, 5126, "SCALAR", True); samplers, channels = [], []
        for bi, (bn, _, pos) in enumerate(J):
            if bn == "root": continue
            q = np.array([quat(k[1].get(bn, (0, 0, 0))) for k in keys], np.float32)
            samplers.append({"input": ti, "output": push(q, None, 5126, "VEC4"), "interpolation": "LINEAR"}); channels.append({"sampler": len(samplers) - 1, "target": {"node": bi, "path": "rotation"}})
        tr = np.array([k[1].get("hipsT", (0, .92, 0)) for k in keys], np.float32)
        samplers.append({"input": ti, "output": push(tr, None, 5126, "VEC3"), "interpolation": "LINEAR"}); channels.append({"sampler": len(samplers) - 1, "target": {"node": JI["hips"], "path": "translation"}})
        anims.append({"name": cname, "samplers": samplers, "channels": channels})
    while len(bin_) % 4: bin_.append(0)
    gl = {"asset": {"version": "2.0", "generator": "Tra Da Pho Co make_people.py"}, "scene": 0, "scenes": [{"nodes": [0, body_node]}], "nodes": nodes, "meshes": meshes,
          "skins": [skin], "animations": anims, "materials": [{"name": "nguoi", "pbrMetallicRoughness": {"baseColorFactor": [1, 1, 1, 1], "metallicFactor": 0, "roughnessFactor": .75}}],
          "accessors": accs, "bufferViews": views, "buffers": [{"byteLength": len(bin_)}]}
    js = json.dumps(gl, separators=(",", ":")).encode()
    while len(js) % 4: js += b" "
    with open(path, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(bin_))); f.write(struct.pack("<II", len(js), 0x4E4F534A)); f.write(js)
        f.write(struct.pack("<II", len(bin_), 0x004E4942)); f.write(bin_)
    return tris

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True); p = os.path.join(OUT, "nguoi.glb"); t = write(p)
    print(f"nguoi  {t:6d} tam giác  {os.path.getsize(p) / 1024:7.1f} KB  {len(CLIPS)} hoạt cảnh")
