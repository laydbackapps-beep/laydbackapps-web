#!/usr/bin/env python3
"""mklogo.py — hand-built header lockup for Parker Roof Plumbing (Glendale NSW).

Design: monogram-badge + wordmark lockup.
  * Badge  : rounded square in the brand ACCENT (copper / roofing-metal).
  * Symbol : a gable ROOF line over a GUTTER run with a DOWNPIPE and a falling
             DROP — roof-plumbing geometry, drawn as real paths (no font).
  * Word   : "PARKER" (glyph outlines from a font, converted to real vector
             paths with fontTools — never live <text> mark) + "ROOF PLUMBING".
Outputs: assets/logo-header.svg  +  assets/logo-header.png (3x, transparent).
Also samples the mark's OWN pixels with PIL and prints the palette.
"""
import os, sys, json
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Transform

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "assets")
FONT = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"

# ---- ownable palette (copper roof-metal on slate) --------------------------
ACCENT = "#b2551c"   # copper — roofing / copper gutter
INK    = "#20313c"   # gunmetal slate — wordmark
PAPER  = "#f6f2ea"   # warm off-white — knock-out of the badge symbol

# ---- layout constants (SVG user units; final height = H) -------------------
H      = 128
BADGE  = 120
RAD    = 26
WORD_CAP = 62          # cap height of "PARKER"
DESC_CAP = 20          # cap height of descriptor
DESC_TRACK = 0.10      # extra per-glyph tracking (em) for descriptor
DX     = 22            # gap between badge and wordmark
BASELINE = 94          # baseline y of wordmark
DBASELINE = 120        # baseline y of descriptor

f = TTFont(FONT)
gs = f.getGlyphSet()
UPM = f["head"].unitsPerEm
CMAP = f.getBestCmap()
HMTX = f["hmtx"]


def glyph_run(text, cap_target, baseline_y, start_x, tracking=0.0,
              color=None, anchor_min=True):
    """Return (svg_path_element, x_end, top_y, bottom_y). Baseline-relative."""
    x = 0.0
    parts = []
    minx = 1e9; maxx = -1e9; miny = 1e9; maxy = -1e9
    for ch in text:
        gname = CMAP.get(ord(ch))
        if gname is None:
            x += UPM * 0.42
            continue
        pen = SVGPathPen(gs)
        gs[gname].draw(TransformPen(pen, Transform(1, 0, 0, 1, x, 0)))
        if pen.getCommands():
            parts.append(pen.getCommands())
        bp = BoundsPen(gs)
        gs[gname].draw(bp)
        if bp.bounds:
            gx0, gy0, gx1, gy1 = bp.bounds
            minx = min(minx, gx0 + x); maxx = max(maxx, gx1 + x)
            miny = min(miny, gy0); maxy = max(maxy, gy1)
        x += HMTX[gname][0] + tracking * UPM
    x_end = x - tracking * UPM
    if not parts:
        return "", start_x, baseline_y, baseline_y
    # cap height reference = capital H
    hb = BoundsPen(gs); gs[CMAP[ord("H")]].draw(hb)
    cap_units = hb.bounds[3] - hb.bounds[1]
    s = cap_target / cap_units
    tx = start_x - minx * s
    ty = baseline_y
    d = " ".join(parts)
    el = ('<path fill="%s" transform="translate(%.3f %.3f) scale(%.6f %.6f)" d="%s"/>'
          % (color, tx, ty, s, -s, d))
    x_end_abs = start_x + (x_end - minx) * s
    top_abs = baseline_y - (maxy) * s
    return el, x_end_abs, top_abs, baseline_y - (miny) * s


# ---------------- symbol geometry (drawn in final, y-down coords) -----------
# Badge occupies x 0..BADGE , y (H-BADGE)/2 .. (H-BADGE)/2+BADGE. centre:
BY = (H - BADGE) / 2.0
CX, CY = BADGE / 2.0, BY + BADGE / 2.0
S = BADGE / 120.0          # symbol design grid 120x120 -> badge size


def sym(pt):
    return (CX + (pt[0] - 60) * S, CY + (pt[1] - 60) * S)


def sc(v):
    return v * S


# roof chevron (stroke) : apex (60,8) -> eave L (8,56) -> eave R (112,56)
r0 = sym((60, 10)); r1 = sym((10, 54)); r2 = sym((110, 54))
roof = ('<path d="M%.2f %.2f L%.2f %.2f L%.2f %.2f" fill="none" stroke="%s" '
        'stroke-width="%.2f" stroke-linejoin="miter" stroke-linecap="butt"/>'
        % (r1[0], r1[1], r0[0], r0[1], r2[0], r2[1], PAPER, sc(13)))
# gutter run under the eaves
g0 = sym((10, 66))
gutter = ('<rect x="%.2f" y="%.2f" width="%.2f" height="%.2f" rx="%.2f" fill="%s"/>'
          % (g0[0], g0[1], sc(100), sc(12), sc(3), PAPER))
# downpipe from gutter
d0 = sym((54, 78))
pipe = ('<rect x="%.2f" y="%.2f" width="%.2f" height="%.2f" fill="%s"/>'
        % (d0[0], d0[1], sc(12), sc(32), PAPER))
# falling drop
dc = sym((90, 92)); dr = sc(15)
drop = ('<path d="M%.2f %.2f C%.2f %.2f %.2f %.2f %.2f %.2f '
        'A%.2f %.2f 0 0 1 %.2f %.2f C%.2f %.2f %.2f %.2f %.2f %.2f Z" fill="%s"/>'
        % (dc[0], dc[1] - dr * 1.35,
           dc[0] + dr * 0.75, dc[1] - dr * 0.2, dc[0] + dr, dc[1] + dr * 0.35,
           dc[0] + dr, dc[1] + dr * 0.55,
           dr, dr, dc[0] - dr, dc[1] + dr * 0.55,
           dc[0] - dr, dc[1] + dr * 0.35, dc[0] - dr * 0.75, dc[1] - dr * 0.2,
           dc[0], dc[1] - dr * 1.35, PAPER))
symbol = roof + gutter + pipe + drop

badge_el = ('<rect x="0" y="%.2f" width="%d" height="%d" rx="%d" fill="%s"/>'
            % (BY, BADGE, BADGE, RAD, ACCENT))

word_el, x_end, wtop, wbot = glyph_run("PARKER", WORD_CAP, BASELINE, BADGE + DX,
                                       color=INK)
_desc = "ROOF PLUMBING"
_, _d0, _, _ = glyph_run(_desc, DESC_CAP, DBASELINE, BADGE + DX + 2, tracking=0.0,
                         color=ACCENT)
_tr = max(0.04, ((x_end - (BADGE + DX + 2)) - (_d0 - (BADGE + DX + 2))) / max(1, len(_desc) - 1) / UPM)
desc_el, d_end, _, _ = glyph_run(_desc, DESC_CAP, DBASELINE, BADGE + DX + 2,
                                 tracking=_tr, color=ACCENT)

W = int(max(x_end, d_end) + 20)
svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" '
       'width="%d" height="%d" role="img" '
       'aria-label="Parker Roof Plumbing">%s%s%s%s</svg>'
       % (W, H, W, H, badge_el, symbol, word_el, desc_el))

os.makedirs(ASSETS, exist_ok=True)
with open(os.path.join(ASSETS, "logo-header.svg"), "w") as fh:
    fh.write(svg)
print("wrote logo-header.svg  %dx%d (viewBox)" % (W, H))


# ---------------- render transparent PNG at 3x via chromium ----------------
def render_png(scale=3):
    from playwright.sync_api import sync_playwright
    import base64
    w, h = W * scale, H * scale
    html = ("<html><body style='margin:0;background:transparent'>"
            "<div style='width:%dpx;height:%dpx'>%s</div></body></html>"
            % (w, h, svg.replace('width="%d"' % W, 'width="%d"' % w)
                       .replace('height="%d"' % H, 'height="%d"' % h, 1)))
    out = os.path.join(ASSETS, "logo-header.png")
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--no-sandbox"])
        pg = b.new_page(viewport={"width": w, "height": h})
        pg.set_content(html)
        pg.wait_for_timeout(250)
        pg.screenshot(path=out, omit_background=True)
        b.close()
    print("wrote logo-header.png  %dx%d" % (w, h))
    return out


if __name__ == "__main__":
    png = render_png(3)
    # ---- sample the mark's OWN pixels -------------------------------------
    try:
        from PIL import Image
        im = Image.open(png).convert("RGBA")
        px = im.load()
        w, h = im.size
        from collections import Counter
        def cls(r, g, b):
            mx, mn = max(r, g, b), min(r, g, b)
            return (mx - mn) / 255.0
        cnt = Counter(); first = {}
        acc = Counter(); ink = Counter(); pap = Counter()
        acc_px = {}; ink_px = {}; pap_px = {}
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                if a < 200:
                    continue
                key = (r // 8 * 8, g // 8 * 8, b // 8 * 8)
                cnt[key] += 1
                first.setdefault(key, (x, y))
                lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255.0
                sat = cls(r, g, b)
                if sat > 0.32:
                    acc[key] += 1; acc_px.setdefault(key, (x, y))
                elif lum < 0.45:
                    ink[key] += 1; ink_px.setdefault(key, (x, y))
                if lum > 0.80 and sat < 0.16:
                    pap[key] += 1; pap_px.setdefault(key, (x, y))
        def hexs(k):
            return "#%02x%02x%02x" % k
        accent = acc.most_common(1)[0][0] if acc else cnt.most_common(1)[0][0]
        ink = ink.most_common(1)[0][0] if ink else accent
        paper = pap.most_common(1)[0][0] if pap else accent
        print("PALETTE accent=%s@%s  ink=%s@%s  paper=%s@%s"
              % (hexs(accent), acc_px.get(accent), hexs(ink), ink_px.get(ink),
                 hexs(paper), pap_px.get(paper)))
    except Exception as e:
        print("palette sample failed:", e)
