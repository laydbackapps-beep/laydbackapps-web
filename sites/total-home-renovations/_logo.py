import os, subprocess, sys, re
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Identity

FDIR = "/usr/share/fonts/truetype/dejavu/"
BOLD = FDIR + "DejaVuSans-Bold.ttf"

_num = re.compile(r"-?\d+\.\d+")
def rnd(d):
    return _num.sub(lambda m: ("%.2f" % float(m.group(0))).rstrip('0').rstrip('.'), d)

def text_paths(text, font, size, x, y, track=0.0):
    """Return (svg_d_fragment, total_width). y = baseline."""
    upm = font['head'].unitsPerEm
    s = size / upm
    cmap = font.getBestCmap()
    gs = font.getGlyphSet()
    hmtx = font['hmtx']
    out = []
    cx = x
    for ch in text:
        gname = cmap.get(ord(ch))
        if gname is None:
            cx += size * 0.5 + track
            continue
        if gname not in gs:
            cx += size * 0.5 + track
            continue
        pen = SVGPathPen(gs)
        tp = TransformPen(pen, Identity.translate(cx, y).scale(s, -s))
        gs[gname].draw(tp)
        d = rnd(pen.getCommands())
        if d.strip():
            out.append(d)
        cx += hmtx[gname][0] * s + track
    return " ".join(out), cx - x

def build(mark_fill, outline, word_fill, out_mark, out_word, out_lockup):
    # --- mark: 3 houses ---
    # viewBox 0 0 132 88
    houses = []
    specs = [(2, 34, 40), (44, 22, 44), (88, 36, 42)]  # x, roofPeakY, width
    parts = []
    for i, (hx, peak, w) in enumerate(specs):
        base_y = 78
        body_top = peak + 30
        body_h = 34
        bh = 30
        bx = hx + 4
        bw = w - 8
        by = base_y - bh
        # roof triangle
        cxr = hx + w / 2
        parts.append(f'<path d="M{hx},{body_top} L{cxr},{peak} L{hx+w},{body_top} Z" fill="{mark_fill}" stroke="{outline}" stroke-width="3" stroke-linejoin="round"/>')
        # body
        parts.append(f'<rect x="{bx}" y="{by}" width="{bw}" height="{bh}" fill="none" stroke="{outline}" stroke-width="3"/>')
        # chimney (except middle)
        if i != 1:
            parts.append(f'<rect x="{hx+w-14}" y="{peak+4}" width="7" height="14" fill="none" stroke="{outline}" stroke-width="3"/>')
        # window
        parts.append(f'<rect x="{bx+bw/2-5}" y="{by+9}" width="10" height="12" fill="none" stroke="{outline}" stroke-width="3"/>')
    mark_body = "\n  ".join(parts)
    mark = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 132 88" width="132" height="88" role="img">
  <title>Total Home Renovations mark</title>
  {mark_body}
</svg>
'''
    open(out_mark, "w").write(mark)

    # --- wordmark: two lines ---
    f = TTFont(BOLD)
    size1, size2 = 46, 34
    d1, w1 = text_paths("TOTAL HOME", f, size1, 0, 40, track=1.5)
    d2, w2 = text_paths("RENOVATIONS", f, size2, 0, 78, track=1.5)
    W = max(w1, w2) + 4
    H = 96
    word = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} {H}" width="{W:.0f}" height="{H}" role="img">
  <title>Total Home Renovations</title>
  <g fill="{word_fill}">
    <path d="{d1}"/>
    <path d="{d2}"/>
  </g>
</svg>
'''
    open(out_word, "w").write(word)
    return W, H

base = "/home/ogheesus/laydback-site/sites/total-home-renovations/assets"
INK = "#12151a"; BLUE = "#2e5c9e"; WHITE = "#ffffff"
build(BLUE, INK, INK, base+"/logo-mark.svg", base+"/logo-word.svg", None)
build(BLUE, WHITE, WHITE, base+"/_tmp_mark_light.svg", base+"/logo-word-light.svg", None)
os.replace(base+"/_tmp_mark_light.svg", base+"/logo-mark-light.svg")
print("built")
