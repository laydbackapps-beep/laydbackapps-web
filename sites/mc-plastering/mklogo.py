#!/usr/bin/env python3
"""Redraw the MC Plastering logo (black MC monogram + red wedge, wordmark MACK CHILDS/PLASTERING)
as clean SVG from real glyph outlines (no live <text>). Colours sampled from the client's own logo."""
import os, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
REG  = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
OUT  = "/home/ogheesus/laydback-site/sites/mc-plastering/assets"
INK  = "#14110f"
RED  = "#d84130"
os.makedirs(OUT, exist_ok=True)


def letter(font_path, ch, size):
    font = TTFont(font_path); gs = font.getGlyphSet(); cmap = font.getBestCmap()
    scale = size / float(font["head"].unitsPerEm)
    gn = cmap.get(ord(ch))
    pen = SVGPathPen(gs); gs[gn].draw(pen)
    return pen.getCommands(), gs[gn].width * scale, scale


def path(d, x, y, scale):
    return '<path d="%s" transform="translate(%.3f,%.3f) scale(%.6f,%.6f)"/>' % (d, x, y, scale, -scale)


def line_paths(font_path, text, size, tracking=0.0, x0=0.0, y=0.0):
    font = TTFont(font_path); gs = font.getGlyphSet(); cmap = font.getBestCmap()
    scale = size / float(font["head"].unitsPerEm)
    tr = size * tracking
    parts = []; x = x0
    for ch in text:
        gn = cmap.get(ord(ch))
        if gn is None:
            x += size * 0.3; continue
        pen = SVGPathPen(gs); gs[gn].draw(pen)
        d = pen.getCommands()
        if d:
            parts.append(path(d, x, y, scale))
        x += gs[gn].width * scale + tr
    return "".join(parts), x - x0 - (tr if text else 0)


# ---------------- mark: MC monogram + red wedge ----------------
S = 256
gsize = 140
Md, Ma, Ms = letter(BOLD, "M", gsize)
Cd, Ca, Cs = letter(BOLD, "C", gsize)
gap = gsize * 0.015
total = Ma + gap + Ca
x0 = (S - total) / 2.0
base = S / 2.0 + gsize * 0.365            # optical centre
cap = gsize * 0.729
ytop = base - cap
m_path = path(Md, x0, base, Ms)
c_x = x0 + Ma + gap
c_path = path(Cd, c_x, base, Cs)
# red wedge capping the top-right terminal of the C (points right, like the client's logo)
wsize = gsize * 0.15
wx = c_x + Ca * 0.70
wy = base - cap * 0.84
wedge = ("M %.2f %.2f L %.2f %.2f L %.2f %.2f Z" % (
    wx, wy, wx + wsize * 1.5, wy + wsize * 0.45, wx, wy + wsize))

mark_svg = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" '
    'role="img" aria-label="MC Plastering monogram">\n'
    '  <title>MC Plastering</title>\n'
    '  <g fill="%s">%s%s</g>\n'
    '  <path d="%s" fill="%s"/>\n'
    '</svg>\n' % (INK, m_path, c_path, wedge, RED)
)
open(os.path.join(OUT, "logo-mark.svg"), "w").write(mark_svg)

# ---------------- wordmark: MACK CHILDS / PLASTERING ----------------
# measure to size the viewBox
p1, w1 = line_paths(BOLD, "MACK CHILDS", 56, tracking=0.012)
p2, w2 = line_paths(REG, "PLASTERING", 33, tracking=0.16)
W = max(w1, w2) + 8
H = 108
# line1 baseline, line2 baseline
y1 = 50
y2 = 92
p1, w1 = line_paths(BOLD, "MACK CHILDS", 56, tracking=0.012, x0=4, y=y1)
p2, w2 = line_paths(REG, "PLASTERING", 33, tracking=0.16, x0=4, y=y2)
word_svg = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %.0f %d" width="%.0f" height="%d" '
    'role="img" aria-label="Mack Childs Plastering">\n'
    '  <title>Mack Childs Plastering</title>\n'
    '  <g fill="%s">%s</g>\n'
    '  <g fill="%s">%s</g>\n'
    '</svg>\n' % (W, H, W, H, INK, p1, INK, p2)
)
open(os.path.join(OUT, "logo-word.svg"), "w").write(word_svg)

# ---------------- rasters ----------------
try:
    import cairosvg
    cairosvg.svg2png(bytestring=mark_svg.encode(), write_to=os.path.join(OUT, "logo-mark-512.png"),
                     output_width=512, output_height=512)
    # favicon: mark on paper
    inner = mark_svg[mark_svg.index(">") + 1: mark_svg.rindex("</svg>")]
    fav = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">'
           '<rect width="256" height="256" fill="#f7f5f2"/>' + inner + '</svg>')
    cairosvg.svg2png(bytestring=fav.encode(), write_to=os.path.join(OUT, "favicon.png"),
                     output_width=64, output_height=64)
    cairosvg.svg2png(bytestring=mark_svg.encode(), write_to=os.path.join(OUT, "logo.png"),
                     output_width=512, output_height=512)
    print("rasters ok")
except Exception as e:
    print("raster err:", e)

print("mark total width:", total, "x0", x0, "base", base, "ytop", ytop, "word W", W)
print("files:", sorted(os.listdir(OUT)))
