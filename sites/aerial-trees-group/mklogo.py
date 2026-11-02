#!/usr/bin/env python3
"""Aerial Trees Group: logo assets. Client has a real circular badge logo (720px).
Circle-mask it as the mark; redraw the wordmark as clean SVG. Palette sampled from the badge."""
import os
from PIL import Image, ImageDraw
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
REG  = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
OUT  = "/home/ogheesus/laydback-site/sites/aerial-trees-group/assets"
INK   = "#1b1a17"
ORANGE = "#d97a0e"
GREEN = "#4c8a1e"

src = Image.open(os.path.join(OUT, "logo.jpg")).convert("RGBA")
W, H = src.size
mask = Image.new("L", (W, H), 0)
ImageDraw.Draw(mask).ellipse((0, 0, W - 1, H - 1), fill=255)
r = Image.new("RGBA", (W, H), (0, 0, 0, 0)); r.paste(src, (0, 0), mask)
r.save(os.path.join(OUT, "logo-round.png"))
fav = Image.new("RGB", (W, H), (247, 246, 243)); fav.paste(src, (0, 0), mask)
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
        if d: parts.append(path(d, x, y, scale))
        x += gs[gn].width * scale + tr
    return "".join(parts), x - x0 - (tr if text else 0)

S1 = 60
p1a, w1a = line_paths(BOLD, "AERIAL ", S1, tracking=0.01, x0=4, y=50)
p1b, w1b = line_paths(BOLD, "TREES", S1, tracking=0.01, x0=4 + w1a, y=50)
p2,  w2  = line_paths(REG, "TREE SERVICES & STUMP GRINDING", 25, tracking=0.05, x0=4, y=90)
Wt = int(max(w1a + w1b, w2)) + 8
Ht = 104
word_svg = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d" '
    'role="img" aria-label="Aerial Trees Group — tree services &amp; stump grinding">\n'
    '  <title>Aerial Trees Group</title>\n'
    '  <g fill="%s">%s</g>\n'
    '  <g fill="%s">%s</g>\n'
    '  <g fill="%s">%s</g>\n'
    '</svg>\n' % (Wt, Ht, Wt, Ht, INK, p1a, ORANGE, p1b, GREEN, p2)
)
open(os.path.join(OUT, "logo-word.svg"), "w").write(word_svg)
print("word W", Wt, "| mark", r.size)
print(sorted(os.listdir(OUT)))
