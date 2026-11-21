#!/usr/bin/env python3
"""mklogo.py — hand-built header lockup for Melrose Fascia & Gutter (Beresfield NSW).

Design: badge + wordmark lockup matching the site's eaves-drip / blueprint language.
  * Badge  : rounded square in the brand ACCENT (steel blue).
  * Symbol : a GUTTER C-channel cross-section with a DROP falling into it —
             the exact eaves motif the page's hero draws. Real paths, no font.
  * Word   : "MELROSE" (mono outlines) + descriptor "FASCIA & GUTTER".
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
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"

ACCENT = "#2f6fae"   # steel blue — Colorbond gutter
INK    = "#2b3a46"   # slate ink (page heading colour)
PAPER  = "#eef4f8"   # pale sky paper — knock-out inside the badge
DARK = False

H, BADGE, RAD = 128, 120, 26
WORD_CAP, DESC_CAP = 60, 20
DX, BASELINE, DBASELINE = 22, 94, 120

f = TTFont(FONT); gs = f.getGlyphSet(); UPM = f["head"].unitsPerEm
CMAP = f.getBestCmap(); HMTX = f["hmtx"]


def glyph_run(text, cap_target, baseline_y, start_x, tracking=0.0, color=None):
    x = 0.0; parts = []
    minx = 1e9; maxx = -1e9
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
            minx = min(minx, bp.bounds[0] + x); maxx = max(maxx, bp.bounds[2] + x)
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
sc = lambda v: v * S

# gutter C-channel cross-section (open top) — single clean U-wall outline
O0 = P((12, 48)); O1 = P((12, 78)); O2 = P((45, 104)); O3 = P((75, 104))
O4 = P((108, 78)); O5 = P((108, 48))
I5 = P((90, 48)); I4 = P((90, 74)); I3 = P((74, 88)); I2 = P((46, 88))
I1 = P((30, 74)); I0 = P((30, 48))
trough_d = ("M%.2f %.2f L%.2f %.2f C%.2f %.2f %.2f %.2f %.2f %.2f L%.2f %.2f "
            "C%.2f %.2f %.2f %.2f %.2f %.2f L%.2f %.2f L%.2f %.2f L%.2f %.2f "
            "C%.2f %.2f %.2f %.2f %.2f %.2f L%.2f %.2f "
            "C%.2f %.2f %.2f %.2f %.2f %.2f L%.2f %.2f Z") % (
    O0[0], O0[1], O1[0], O1[1],
    P((12, 92))[0], P((12, 92))[1], P((28, 104))[0], P((28, 104))[1], O2[0], O2[1],
    O3[0], O3[1],
    P((92, 104))[0], P((92, 104))[1], P((108, 92))[0], P((108, 92))[1], O4[0], O4[1],
    O5[0], O5[1], I5[0], I5[1], I4[0], I4[1],
    P((90, 82))[0], P((90, 82))[1], P((84, 88))[0], P((84, 88))[1], I3[0], I3[1],
    I2[0], I2[1],
    P((36, 88))[0], P((36, 88))[1], P((30, 82))[0], P((30, 82))[1], I1[0], I1[1],
    I0[0], I0[1])
# falling drop centred (60,26)
dt = P((60, 4)); dl = P((46, 30)); dr_ = P((74, 30))
drop_d = ("M%.2f %.2f C%.2f %.2f %.2f %.2f %.2f %.2f A%.2f %.2f 0 1 1 %.2f %.2f "
          "C%.2f %.2f %.2f %.2f %.2f %.2f Z" % (
              dt[0], dt[1], P((68, 18))[0], P((68, 18))[1], dr_[0], dr_[1], dr_[0], dr_[1],
              sc(14), sc(14), dl[0], dl[1],
              P((52, 18))[0], P((52, 18))[1], dt[0], dt[1], dt[0], dt[1]))
symbol = ('<path fill="%s" d="%s"/>' % (PAPER, trough_d)
          + '<path fill="%s" d="%s"/>' % (PAPER, drop_d))

badge_el = ('<rect x="0" y="%.2f" width="%d" height="%d" rx="%d" fill="%s"/>'
            % (BY, BADGE, BADGE, RAD, ACCENT))
word_el, x_end = glyph_run("MELROSE", WORD_CAP, BASELINE, BADGE + DX, color=INK)
_desc = "FASCIA & GUTTER"
_, _d0 = glyph_run(_desc, DESC_CAP, DBASELINE, BADGE + DX + 2, tracking=0.0, color=ACCENT)
_tr = max(0.04, ((x_end - (BADGE + DX + 2)) - (_d0 - (BADGE + DX + 2))) / max(1, len(_desc) - 1) / UPM)
desc_el, d_end = glyph_run(_desc, DESC_CAP, DBASELINE, BADGE + DX + 2, tracking=_tr, color=ACCENT)

W = int(max(x_end, d_end) + 20)
svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" '
       'height="%d" role="img" aria-label="Melrose Fascia and Gutter">%s%s%s%s</svg>'
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
