#!/usr/bin/env python3
"""Stoneline Concreting: redraw the client's logo as clean SVG.
Client logo = charcoal tile, gold hard-hat concreter holding a beam, wordmark STONELINE / CONCRETING.
Colours sampled from the client's own logo (charcoal #2b2b2b, antique gold ~#c2a04c)."""
import os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
REG  = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
OUT  = "/home/ogheesus/laydback-site/sites/stoneline-concreting/assets"
os.makedirs(OUT, exist_ok=True)

INK   = "#232323"
TILE  = "#2b2b2b"
TILEDK = "#1c1c1c"
GOLD  = "#c2a04c"
GOLDD = "#9a7b2e"


def path(d, x, y, scale):
    return '<path d="%s" transform="translate(%.3f,%.3f) scale(%.6f,%.6f)"/>' % (d, x, y, scale, -scale)


def line_paths(font_path, text, size, tracking=0.0, x0=0.0, y=0.0):
    font = TTFont(font_path); gs = font.getGlyphSet(); cmap = font.getBestCmap()
    scale = size / float(font["head"].unitsPerEm); tr = size * tracking
    parts = []; x = x0
    for ch in text:
        gn = cmap.get(ord(ch))
        if gn is None:
            x += size * 0.3; continue
        pen = SVGPathPen(gs); gs[gn].draw(pen); d = pen.getCommands()
        if d:
            parts.append(path(d, x, y, scale))
        x += gs[gn].width * scale + tr
    return "".join(parts), x - x0 - (tr if text else 0)


# ---------------- mark: charcoal tile + gold hard hat + light beam ----------------
S = 256
hat = (
    # dome
    '<path d="M82 153 C82 103 102 82 128 82 C154 82 174 103 174 153 Z" fill="%s"/>'
    # brim (front), slightly wider, rounded
    '<rect x="62" y="149" width="132" height="18" rx="9" fill="%s"/>'
    # shaded under-edge of brim for a little depth
    '<path d="M71 167 h114 a9 9 0 0 1 -9 9 H80 a9 9 0 0 1 -9 -9 z" fill="%s" opacity="0.38"/>'
) % (GOLD, GOLD, TILEDK)
mark_svg = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" '
    'role="img" aria-label="Stoneline Concreting">\n'
    '  <title>Stoneline Concreting</title>\n'
    '  <rect x="14" y="14" width="228" height="228" rx="46" fill="%s"/>\n'
    '  %s\n'
    '</svg>\n' % (TILE, hat)
)
open(os.path.join(OUT, "logo-mark.svg"), "w").write(mark_svg)

# ---------------- wordmark ----------------
p1, w1 = line_paths(BOLD, "STONELINE", 62, tracking=0.02)
p2, w2 = line_paths(REG, "CONCRETING", 34, tracking=0.30)
W = max(w1, w2) + 8
H = 112
y1 = 54; y2 = 98
p1, w1 = line_paths(BOLD, "STONELINE", 62, tracking=0.02, x0=4, y=y1)
p2, w2 = line_paths(REG, "CONCRETING", 34, tracking=0.30, x0=4, y=y2)
word_svg = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %.0f %d" width="%.0f" height="%d" '
    'role="img" aria-label="Stoneline Concreting">\n'
    '  <title>Stoneline Concreting</title>\n'
    '  <g fill="%s">%s</g>\n'
    '  <g fill="%s">%s</g>\n'
    '</svg>\n' % (W, H, W, H, INK, p1, GOLDD, p2)
)
open(os.path.join(OUT, "logo-word.svg"), "w").write(word_svg)

try:
    import cairosvg
    cairosvg.svg2png(bytestring=mark_svg.encode(), write_to=os.path.join(OUT, "logo-mark-512.png"),
                     output_width=512, output_height=512)
    cairosvg.svg2png(bytestring=mark_svg.encode(), write_to=os.path.join(OUT, "logo.png"),
                     output_width=512, output_height=512)
    inner = mark_svg[mark_svg.index(">") + 1: mark_svg.rindex("</svg>")]
    fav = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">'
           '<rect width="256" height="256" fill="#f4f2ee"/>' + inner + '</svg>')
    cairosvg.svg2png(bytestring=fav.encode(), write_to=os.path.join(OUT, "favicon.png"),
                     output_width=64, output_height=64)
    print("rasters ok")
except Exception as e:
    print("raster err:", e)
print("word W", W, "| mark bytes", os.path.getsize(os.path.join(OUT, "logo-mark.svg")))
