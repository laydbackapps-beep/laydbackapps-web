#!/usr/bin/env python3
"""
mklogo.py - generate the header logo artwork for B&B Built Pty Ltd (Builder, Hunter NSW).

Concept: a brass-ruled plaque carrying a gable ROOF TRUSS (roof line + tie beam + king
post) - the structural sign of a builder, drawn as real geometry, not clip art.
Wordmark "B&B BUILT" is set in Archivo (the site's own sans) converted to OUTLINES, so
the .svg files carry no live text and need no font at runtime.

Outputs (assets/):
  logo-mark.svg      symbol only (the plaque + truss)
  logo-word.svg      wordmark only ("B&B | BUILT")
  logo-header.svg    horizontal lockup (mark + wordmark) - the header artwork
  logo-mark@2x.png / logo-word@2x.png / logo-header@2x.png  (transparent rasters, for sampling)
  palette.json       the palette sampled off the rendered artwork pixels

Run:  /home/ogheesus/personal-autogtm/.venv/bin/python mklogo.py
"""
import json, os, sys, urllib.request
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.misc.transform import Transform

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "assets")
FONTS = os.environ.get("MKLOGO_FONTS", "/home/ogheesus/.hermes/cache/scratch/fonts")
os.makedirs(ASSETS, exist_ok=True)
os.makedirs(FONTS, exist_ok=True)

# ---------------------------------------------------------------- palette
PAPER   = "#141414"   # plaque ground  -> site --ground / --paper
ACCENT  = "#B08D3E"   # brass         -> site --brass / --accent
ACCENT2 = "#D6B25F"   # bright brass  -> site --brass-bright
INK     = "#E9E4D8"   # wordmark ink  -> site --ink

FONT_W = {  # family -> weight -> filename
    "archivo": {
        500: "archivo-500.ttf",
        700: "archivo-700.ttf",
    }
}
GF = "https://fonts.gstatic.com/s/archivo/v25/"

def font_path(fam, wt):
    p = os.path.join(FONTS, FONT_W[fam][wt])
    if not os.path.exists(p):
        raise SystemExit(f"missing font {p} (download Archivo {wt} into {FONTS})")
    return p

# ---------------------------------------------------------------- text -> outline path
_cache = {}
def _font(fam, wt):
    if (fam, wt) not in _cache:
        tt = TTFont(font_path(fam, wt))
        _cache[(fam, wt)] = (tt, tt.getGlyphSet(), tt["head"].unitsPerEm, tt.getBestCmap(), tt["hmtx"])
    return _cache[(fam, wt)]

def run(fam, wt, text, size, x0, y0, tracking=0.0):
    """Return (path_d, x_end, bbox) for `text` baseline-left at (x0,y0), em = size px."""
    tt, gs, upm, cmap, hmtx = _font(fam, wt)
    scale = size / upm
    d, x = [], x0
    xmin = ymin = 1e9; xmax = ymax = -1e9
    for ch in text:
        gn = cmap.get(ord(ch))
        if gn is None:
            x += size * 0.3
            continue
        adv = hmtx[gn][0] * scale
        if ch != " ":
            sp = SVGPathPen(gs)
            gs[gn].draw(TransformPen(sp, Transform(scale, 0, 0, -scale, x, y0)))
            c = sp.getCommands()
            if c:
                d.append(c)
            bp = BoundsPen(gs)
            gs[gn].draw(TransformPen(bp, Transform(scale, 0, 0, -scale, x, y0)))
            if bp.bounds:
                bx0, by0, bx1, by1 = bp.bounds
                xmin, ymin = min(xmin, bx0), min(ymin, by0)
                xmax, ymax = max(xmax, bx1), max(ymax, by1)
        x += adv + tracking * size
    return " ".join(d), x, (xmin, ymin, xmax, ymax)

# ---------------------------------------------------------------- geometry helpers
def svg(w, h, body, vb=None):
    vb = vb or f"0 0 {w} {h}"
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" '
            f'role="img" aria-label="B&amp;B Built">\n{body}\n</svg>\n')

# ---------------- symbol: brass-ruled plaque + gable roof truss
MARK_PAD = 6
MARK_BOX = 132
def mark_svg():
    b = []
    b.append(f'<rect x="{MARK_PAD}" y="{MARK_PAD}" width="{MARK_BOX-2*MARK_PAD}" '
             f'height="{MARK_BOX-2*MARK_PAD}" rx="24" fill="{PAPER}" stroke="{ACCENT}" stroke-width="5"/>')
    # gable roof truss: roof line, tie beam, king post
    b.append(f'<path d="M32 86 L66 50 L100 86" fill="none" stroke="{ACCENT2}" stroke-width="9" '
             f'stroke-linejoin="miter" stroke-linecap="butt"/>')
    b.append(f'<path d="M32 86 H100" fill="none" stroke="{ACCENT}" stroke-width="7"/>')
    b.append(f'<path d="M66 50 V86" fill="none" stroke="{ACCENT}" stroke-width="7"/>')
    return svg(MARK_BOX, MARK_BOX, "  " + "\n  ".join(b))

# ---------------- wordmark: B&B  |  BUILT
WM_SIZE = 100
WM_BASE = 100.0

def _wb_parts():
    """Three runs for 'B' '&' 'B' (ampersand in bright brass) + the BUILT run."""
    d_b1, x1, bb_b1 = run("archivo", 700, "B", WM_SIZE, 0.0, WM_BASE, tracking=0.01)
    d_amp, x2, bb_amp = run("archivo", 700, "&", WM_SIZE, x1, WM_BASE, tracking=0.01)
    d_b2, x3, bb_b2 = run("archivo", 700, "B", WM_SIZE, x2, WM_BASE, tracking=0.01)
    rule_x = x3 + 22
    d_built, x4, bb_built = run("archivo", 500, "BUILT", WM_SIZE, rule_x + 22, WM_BASE, tracking=0.14)
    xmin = min(bb_b1[0], bb_amp[0], bb_b2[0], bb_built[0])
    xmax = x4
    top = min(bb_b1[1], bb_amp[1], bb_b2[1], bb_built[1])
    bot = max(bb_b1[3], bb_amp[3], bb_b2[3], bb_built[3])
    return dict(d_b1=d_b1, d_amp=d_amp, d_b2=d_b2, d_built=d_built,
                rule_x=rule_x, xmin=xmin, xmax=xmax, top=top, bot=bot)

def _word_body(offset_x=0.0, offset_y=0.0):
    p = _wb_parts()
    g = (f'<g transform="translate({offset_x:.1f},{offset_y:.1f})">'
         f'<path d="{p["d_b1"]}" fill="{INK}"/>'
         f'<path d="{p["d_amp"]}" fill="{ACCENT2}"/>'
         f'<path d="{p["d_b2"]}" fill="{INK}"/>'
         f'<path d="{p["d_built"]}" fill="{INK}"/>'
         f'<rect x="{p["rule_x"]:.1f}" y="{p["top"]+6:.1f}" width="4" '
         f'height="{p["bot"]-p["top"]-12:.1f}" fill="{ACCENT}"/>'
         f'</g>')
    return g, p

def word_svg():
    pad = 6
    g, p = _word_body()
    w = p["xmax"] - p["xmin"] + 2 * pad
    h = p["bot"] - p["top"] + 2 * pad
    vb = f'{p["xmin"]-pad:.1f} {p["top"]-pad:.1f} {w:.1f} {h:.1f}'
    return svg(w, h, "  " + g, vb=vb), p

def mark_inner():
    M = MARK_PAD
    return " ".join([
        f'<rect x="{M}" y="{M}" width="{MARK_BOX-2*M}" height="{MARK_BOX-2*M}" rx="24" '
        f'fill="{PAPER}" stroke="{ACCENT}" stroke-width="5"/>',
        f'<path d="M32 86 L66 50 L100 86" fill="none" stroke="{ACCENT2}" stroke-width="9" stroke-linejoin="miter"/>',
        f'<path d="M32 86 H100" fill="none" stroke="{ACCENT}" stroke-width="7"/>',
        f'<path d="M66 50 V86" fill="none" stroke="{ACCENT}" stroke-width="7"/>',
    ])

def lockup_svg(mark, wp):
    pad = 6
    wm_w = wp["xmax"] - wp["xmin"] + 2 * pad
    wm_h = wp["bot"] - wp["top"] + 2 * pad
    gap = 26
    mark_h = 96
    total_w = mark_h + gap + wm_w
    total_h = max(mark_h, wm_h)
    body = (f'<g transform="translate(0,{(total_h-mark_h)/2:.1f}) scale({mark_h/MARK_BOX:.4f})">'
            f'{mark_inner()}</g>\n'
            f'  <g transform="translate({-wp["xmin"]+pad+mark_h+gap:.1f},{-(wp["top"]-pad)+(total_h-wm_h)/2:.1f})">'
            f'{_word_body()[0]}</g>')
    return svg(total_w, total_h, body)

# ---------------------------------------------------------------- write + render
def render(svg_text, png_out, scale):
    import cairosvg
    cairosvg.svg2png(bytestring=svg_text.encode(), write_to=png_out, scale=scale,
                     output_width=None)

def sample(png, note):
    from PIL import Image
    im = Image.open(png).convert("RGBA")
    px = im.load()
    W, H = im.size
    from collections import Counter
    c = Counter()
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < 200:
                continue
            c[(r, g, b)] += 1
    return c, im

def main():
    mark = mark_svg()
    word, wp = word_svg()
    lock = lockup_svg(mark, wp)
    open(os.path.join(ASSETS, "logo-mark.svg"), "w").write(mark)
    open(os.path.join(ASSETS, "logo-word.svg"), "w").write(word)
    open(os.path.join(ASSETS, "logo-header.svg"), "w").write(lock)
    render(mark, os.path.join(ASSETS, "logo-mark@2x.png"), 3)
    render(word, os.path.join(ASSETS, "logo-word@2x.png"), 3)
    render(lock, os.path.join(ASSETS, "logo-header@2x.png"), 3)
    print("wrote svg + png")

    c, im = sample(os.path.join(ASSETS, "logo-header@2x.png"), "header")
    top = c.most_common(12)
    print("top colours (raster, coverage>=200 alpha):")
    for (r, g, b), n in top:
        print(f"  #{r:02X}{g:02X}{b:02X}  {n:>7}")

    dom = [f"#{r:02X}{g:02X}{b:02X}" for (r, g, b), n in top[:4]]
    pal = {
        "source": "assets/logo-header@2x.png (rendered from logo-header.svg)",
        "paper": PAPER, "accent": ACCENT, "accent_bright": ACCENT2, "ink": INK,
        "dominant_sampled": dom,
        "sampled_pixels": {f"#{r:02X}{g:02X}{b:02X}": n for (r, g, b), n in top[:4]},
    }
    json.dump(pal, open(os.path.join(ASSETS, "palette.json"), "w"), indent=1)
    print("palette.json written")

main()
