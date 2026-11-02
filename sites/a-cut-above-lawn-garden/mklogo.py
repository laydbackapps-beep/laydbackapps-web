#!/usr/bin/env python3
"""A Cut Above: logo assets. Client has a real logo (circular badge + mascot banner).
Use the badge as the mark (circle-masked), redraw the wordmark as clean SVG paths."""
import os
from PIL import Image, ImageDraw
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
REG  = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
OUT  = "/home/ogheesus/laydback-site/sites/a-cut-above-lawn-garden/assets"
INK  = "#171717"
GREEN = "#4f8f00"

# --- circular mark from the client's badge ---
src = Image.open(os.path.join(OUT, "logo.jpg")).convert("RGBA")
W, H = src.size
mask = Image.new("L", (W, H), 0)
ImageDraw.Draw(mask).ellipse((0, 0, W - 1, H - 1), fill=255)
round_img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
round_img.paste(src, (0, 0), mask)
round_img.save(os.path.join(OUT, "logo-round.png"))
# favicon: circle on paper
fav = Image.new("RGB", (W, H), (247, 246, 242))
fav.paste(src, (0, 0), mask)
fav.resize((64, 64), Image.LANCZOS).save(os.path.join(OUT, "favicon.png"))

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

_, w1 = line_paths(BOLD, "A CUT ABOVE", 60, tracking=0.01)
_, w2 = line_paths(REG, "LAWN & GARDEN MAINTENANCE", 25, tracking=0.06)
Wt = max(w1, w2) + 8
Ht = 104
p1, _ = line_paths(BOLD, "A CUT ABOVE", 60, tracking=0.01, x0=4, y=50)
p2, _ = line_paths(REG, "LAWN & GARDEN MAINTENANCE", 25, tracking=0.06, x0=4, y=90)
word_svg = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %.0f %d" width="%.0f" height="%d" '
    'role="img" aria-label="A Cut Above — Lawn &amp; Garden Maintenance">\n'
    '  <title>A Cut Above Lawn &amp; Garden Maintenance</title>\n'
    '  <g fill="%s">%s</g>\n'
    '  <g fill="%s">%s</g>\n'
    '</svg>\n' % (Wt, Ht, Wt, Ht, INK, p1, GREEN, p2)
)
open(os.path.join(OUT, "logo-word.svg"), "w").write(word_svg)
print("word W", Wt, "| logo-round", round_img.size)
print(sorted(os.listdir(OUT)))
