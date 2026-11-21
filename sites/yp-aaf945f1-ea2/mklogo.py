#!/usr/bin/env python3
"""mklogo.py — hand-built header lockup for Toronto Fencing Direct Sales Pty Ltd.

Design: badge + serif wordmark lockup matching the site's editorial masthead.
  * Badge  : rounded square in the brand ACCENT (walnut / timber stain).
  * Symbol : a 4-picket FENCE panel with pointed tops and two rails —
             built as real paths (no font, no clip-art).
  * Word   : "TORONTO" (serif outlines) + descriptor "FENCING DIRECT".
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
FONT = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"

ACCENT = "#8f4522"   # walnut / timber stain
INK    = "#2a2118"   # espresso ink (page text colour)
PAPER  = "#f5f0e6"   # warm cream paper — knock-out inside the badge
DARK = False

H, BADGE, RAD = 128, 120, 26
WORD_CAP, DESC_CAP = 60, 20
DX, BASELINE, DBASELINE = 22, 94, 120

f = TTFont(FONT); gs = f.getGlyphSet(); UPM = f["head"].unitsPerEm
CMAP = f.getBestCmap(); HMTX = f["hmtx"]


def glyph_run(text, cap_target, baseline_y, start_x, tracking=0.0, color=None):
    x = 0.0; parts = []
    minx = 1e9
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
            minx = min(minx, bp.bounds[0] + x)
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
P = lambda p: (CX + (p[0] - 60) * S, CY + (p[1] - 60) * S)

# 3 broad pickets with pronounced pointed tops (paper) inside a frame-free field
pick = ""
for px in (21, 50, 79):
    a = P((px, 26)); b = P((px + 9, 8)); c = P((px + 18, 26))
    d = P((px + 18, 104)); e = P((px, 104))
    pick += ('<path fill="%s" d="M%.2f %.2f L%.2f %.2f L%.2f %.2f L%.2f %.2f L%.2f %.2f Z"/>'
             % (PAPER, a[0], a[1], b[0], b[1], c[0], c[1], d[0], d[1], e[0], e[1]))
# rail drawn only in the GAPS between pickets, so the panel reads as a fence not a grid
rails = ""
for rx in (39, 68):
    r0 = P((rx, 74))
    rails += ('<rect x="%.2f" y="%.2f" width="%.2f" height="%.2f" fill="%s"/>'
              % (r0[0], r0[1], 11 * S, 11 * S, PAPER))
symbol = pick + rails

badge_el = ('<rect x="0" y="%.2f" width="%d" height="%d" rx="%d" fill="%s"/>'
            % (BY, BADGE, BADGE, RAD, ACCENT))
word_el, x_end = glyph_run("TORONTO", WORD_CAP, BASELINE, BADGE + DX, color=INK)
_desc = "FENCING DIRECT"
_, _d0 = glyph_run(_desc, DESC_CAP, DBASELINE, BADGE + DX + 2, tracking=0.0, color=ACCENT)
_tr = max(0.04, ((x_end - (BADGE + DX + 2)) - (_d0 - (BADGE + DX + 2))) / max(1, len(_desc) - 1) / UPM)
desc_el, d_end = glyph_run(_desc, DESC_CAP, DBASELINE, BADGE + DX + 2, tracking=_tr, color=ACCENT)

W = int(max(x_end, d_end) + 20)
svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" '
       'height="%d" role="img" aria-label="Toronto Fencing Direct Sales">%s%s%s%s</svg>'
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
        acc = Counter(); ink = Counter(); pap = Counter(); ap = {}; ip = {}; pp = {}
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
                if lum < 0.45 and sat < 0.45:
                    ink[k] += 1; ip.setdefault(k, (x, y))
                if lum > 0.78 and sat < 0.30:
                    pap[k] += 1; pp.setdefault(k, (x, y))
        hx = lambda k: "#%02x%02x%02x" % k
        print("PALETTE accent=%s@%s ink=%s@%s paper=%s@%s"
              % (hx(acc.most_common(1)[0][0]), ap.get(acc.most_common(1)[0][0]),
                 hx(ink.most_common(1)[0][0]), ip.get(ink.most_common(1)[0][0]),
                 hx(pap.most_common(1)[0][0]), pp.get(pap.most_common(1)[0][0])))
    except Exception as e:
        print("palette sample failed:", e)
