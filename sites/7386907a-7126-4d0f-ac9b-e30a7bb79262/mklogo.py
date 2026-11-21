#!/usr/bin/env python3
"""mklogo.py — hand-built header lockup for Staples Plumbing & Gas (Wallsend NSW).

Design: monogram-badge + wordmark lockup (dark theme).
  * Badge  : rounded square in the brand ACCENT (gas amber).
  * Symbol : a water DROP with a gas FLAME cut out of it (even-odd) — the two
             trades in one glyph, drawn as real paths (no font).
  * Word   : "STAPLES" (font glyph outlines -> real vector paths) + descriptor.
Outputs: assets/logo-header.svg + assets/logo-header.png (3x, transparent).
"""
import os, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Transform

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "assets")
FONT = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"

ACCENT = "#d08a2e"   # gas amber
INK    = "#eef2f5"   # light ink (page is dark)
PAPER  = "#14181c"   # dark page paper — knock-out inside the badge
DARK = True

H, BADGE, RAD = 128, 120, 26
WORD_CAP, DESC_CAP, DESC_TRACK = 62, 20, 0.10
DX, BASELINE, DBASELINE = 22, 94, 120

f = TTFont(FONT); gs = f.getGlyphSet(); UPM = f["head"].unitsPerEm
CMAP = f.getBestCmap(); HMTX = f["hmtx"]


def glyph_run(text, cap_target, baseline_y, start_x, tracking=0.0, color=None):
    x = 0.0; parts = []
    minx = 1e9; maxx = -1e9; miny = 1e9; maxy = -1e9
    for ch in text:
        gname = CMAP.get(ord(ch))
        if gname is None:
            x += UPM * 0.42; continue
        pen = SVGPathPen(gs)
        gs[gname].draw(TransformPen(pen, Transform(1, 0, 0, 1, x, 0)))
        if pen.getCommands():
            parts.append(pen.getCommands())
        bp = BoundsPen(gs); gs[gname].draw(bp)
        if bp.bounds:
            gx0, gy0, gx1, gy1 = bp.bounds
            minx = min(minx, gx0 + x); maxx = max(maxx, gx1 + x)
            miny = min(miny, gy0); maxy = max(maxy, gy1)
        x += HMTX[gname][0] + tracking * UPM
    x_end = x - tracking * UPM
    if not parts:
        return "", start_x
    hb = BoundsPen(gs); gs[CMAP[ord("H")]].draw(hb)
    s = cap_target / (hb.bounds[3] - hb.bounds[1])
    el = ('<path fill="%s" transform="translate(%.3f %.3f) scale(%.6f %.6f)" d="%s"/>'
          % (color, start_x - minx * s, baseline_y, s, -s, " ".join(parts)))
    return el, start_x + (x_end - minx) * s


BY = (H - BADGE) / 2.0
CX, CY = BADGE / 2.0, BY + BADGE / 2.0
S = BADGE / 120.0


def P(p):
    return (CX + (p[0] - 60) * S, CY + (p[1] - 60) * S)


def sc(v):
    return v * S


# water drop (outer) with a gas flame knocked out of it (even-odd)
drop = ("M%.2f %.2f C%.2f %.2f %.2f %.2f %.2f %.2f A%.2f %.2f 0 1 1 %.2f %.2f "
        "C%.2f %.2f %.2f %.2f %.2f %.2f Z")
p_tip = P((60, 12)); p_r = P((95, 68)); p_l = P((25, 68))
drop_d = drop % (
    p_tip[0], p_tip[1],
    P((76, 34))[0], P((76, 34))[1], P((95, 48))[0], P((95, 48))[1],
    p_r[0], p_r[1],
    sc(35), sc(35), p_l[0], p_l[1],
    P((25, 48))[0], P((25, 48))[1], P((44, 34))[0], P((44, 34))[1],
    p_tip[0], p_tip[1])
# flame (hole) — pointed top, rounded base, sits in the drop's lower half
fl = [P((60, 48)), P((69, 58)), P((74, 68)), P((72, 80)), P((61, 87)),
      P((49, 84)), P((46, 74)), P((49, 64)), P((55, 58))]
flame_d = ("M%.2f %.2f C%.2f %.2f %.2f %.2f %.2f %.2f C%.2f %.2f %.2f %.2f %.2f %.2f "
           "C%.2f %.2f %.2f %.2f %.2f %.2f C%.2f %.2f %.2f %.2f %.2f %.2f C%.2f %.2f %.2f %.2f %.2f %.2f Z") % (
    fl[0][0], fl[0][1],
    fl[1][0], fl[1][1], fl[2][0], fl[2][1], fl[2][0], fl[2][1],
    fl[2][0], fl[2][1], fl[3][0], fl[3][1], fl[3][0], fl[3][1],
    fl[3][0], fl[3][1], fl[4][0], fl[4][1], fl[4][0], fl[4][1],
    fl[4][0], fl[4][1], fl[5][0], fl[5][1], fl[5][0], fl[5][1],
    fl[5][0], fl[5][1], fl[6][0], fl[6][1], fl[0][0], fl[0][1])
symbol = ('<path fill="%s" fill-rule="evenodd" d="%s %s"/>'
          % (PAPER, drop_d, flame_d))

badge_el = ('<rect x="0" y="%.2f" width="%d" height="%d" rx="%d" fill="%s"/>'
            % (BY, BADGE, BADGE, RAD, ACCENT))
word_el, x_end = glyph_run("STAPLES", WORD_CAP, BASELINE, BADGE + DX, color=INK)
_desc = "PLUMBING & GAS"
_, _d0 = glyph_run(_desc, DESC_CAP, DBASELINE, BADGE + DX + 2, tracking=0.0, color=ACCENT)
_tr = max(0.04, ((x_end - (BADGE + DX + 2)) - (_d0 - (BADGE + DX + 2))) / max(1, len(_desc) - 1) / UPM)
desc_el, d_end = glyph_run(_desc, DESC_CAP, DBASELINE, BADGE + DX + 2,
                           tracking=_tr, color=ACCENT)

W = int(max(x_end, d_end) + 20)
svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" '
       'height="%d" role="img" aria-label="Staples Plumbing &amp; Gas">%s%s%s%s</svg>'
       % (W, H, W, H, badge_el, symbol, word_el, desc_el))
os.makedirs(ASSETS, exist_ok=True)
open(os.path.join(ASSETS, "logo-header.svg"), "w").write(svg)
print("wrote logo-header.svg %dx%d" % (W, H))


def render_png(scale=3):
    from playwright.sync_api import sync_playwright
    w, h = W * scale, H * scale
    html = ("<html><body style='margin:0;background:transparent'>"
            "<div style='width:%dpx;height:%dpx'>%s</div></body></html>"
            % (w, h, svg.replace('width="%d"' % W, 'width="%d"' % w)
                       .replace('height="%d"' % H, 'height="%d"' % h, 1)))
    out = os.path.join(ASSETS, "logo-header.png")
    with sync_playwright() as pw:
        b = pw.chromium.launch(args=["--no-sandbox"])
        pg = b.new_page(viewport={"width": w, "height": h})
        pg.set_content(html); pg.wait_for_timeout(250)
        pg.screenshot(path=out, omit_background=True); b.close()
    print("wrote logo-header.png %dx%d" % (w, h))
    return out


if __name__ == "__main__":
    png = render_png(3)
    try:
        from PIL import Image
        from collections import Counter
        im = Image.open(png).convert("RGBA"); px = im.load(); w, h = im.size
        acc = Counter(); ink = Counter(); pap = Counter()
        ap = {}; ip = {}; pp = {}
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                if a < 200:
                    continue
                k = (r // 8 * 8, g // 8 * 8, b // 8 * 8)
                lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255.0
                sat = (max(r, g, b) - min(r, g, b)) / 255.0
                if sat > 0.32:
                    acc[k] += 1; ap.setdefault(k, (x, y))
                elif lum < 0.45:
                    if DARK: pap[k] += 1; pp.setdefault(k, (x, y))
                    else: ink[k] += 1; ip.setdefault(k, (x, y))
                if lum > 0.72 and sat < 0.20:
                    if DARK: ink[k] += 1; ip.setdefault(k, (x, y))
                    else: pap[k] += 1; pp.setdefault(k, (x, y))
        hx = lambda k: "#%02x%02x%02x" % k
        print("PALETTE accent=%s@%s ink=%s@%s paper=%s@%s"
              % (hx(acc.most_common(1)[0][0]), ap.get(acc.most_common(1)[0][0]),
                 hx(ink.most_common(1)[0][0]) if ink else "-", ip.get(ink.most_common(1)[0][0]) if ink else "-",
                 hx(pap.most_common(1)[0][0]) if pap else "-", pp.get(pap.most_common(1)[0][0]) if pap else "-"))
    except Exception as e:
        print("palette sample failed:", e)
