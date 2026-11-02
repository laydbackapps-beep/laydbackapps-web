import os, re
import numpy as np
from PIL import Image
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Identity

BASE = "/home/ogheesus/laydback-site/sites/turner-brothers-carpentry-construction/assets"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

# ---------- mark: circular-cropped badge ----------
im = Image.open(BASE + "/logo-raw.jpg").convert("RGB")
a = np.asarray(im)
h, w, _ = a.shape
cy, cx = h / 2, w / 2
r = min(w, h) / 2 - 6
yy, xx = np.mgrid[0:h, 0:w]
dist = np.sqrt((yy - cy) ** 2 + (xx - cx) ** 2)
alpha = np.clip((r - dist) / 2.0 + 0.5, 0, 1)
out = np.dstack([a, (alpha * 255).astype(np.uint8)])
mark = Image.fromarray(out, "RGBA").crop(Image.fromarray(out, "RGBA").getbbox())
mark.resize((256,256), Image.LANCZOS).save(BASE + "/logo-mark.png", optimize=True)
mark.resize((256,256), Image.LANCZOS).save(BASE + "/logo-mark-light.png", optimize=True)
print("mark", mark.size)
# favicon: badge on white square
side = max(mark.size) + 16
c = Image.new("RGBA", (side, side), (255, 255, 255, 0))
c.paste(mark, ((side - mark.size[0]) // 2, (side - mark.size[1]) // 2), mark)
c.resize((64, 64), Image.LANCZOS).save(BASE + "/favicon.png")
c.resize((180, 180), Image.LANCZOS).save(BASE + "/favicon-180.png")

# ---------- wordmark ----------
_num = re.compile(r"-?\d+\.\d+")
rnd = lambda d: _num.sub(lambda m: ("%.2f" % float(m.group(0))).rstrip('0').rstrip('.'), d)

def text_path(text, font, size, x, y, track=0.0):
    upm = font['head'].unitsPerEm
    s = size / upm
    cmap = font.getBestCmap(); gs = font.getGlyphSet(); hmtx = font['hmtx']
    parts = []; cx = x
    for ch in text:
        gn = cmap.get(ord(ch))
        if gn is None or gn not in gs:
            cx += size * 0.5 + track; continue
        pen = SVGPathPen(gs)
        gs[gn].draw(TransformPen(pen, Identity.translate(cx, y).scale(s, -s)))
        d = rnd(pen.getCommands())
        if d.strip(): parts.append(d)
        cx += hmtx[gn][0] * s + track
    return " ".join(parts), cx - x

f = TTFont(BOLD)
def build_word(fill1, fill2, out):
    d1, w1 = text_path("TURNER BROTHERS", f, 54, 0, 46, track=1.6)
    d2, w2 = text_path("CARPENTRY & CONSTRUCTION", f, 26, 0, 84, track=2.2)
    W = int(max(w1, w2)) + 4; H = 100
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img">
  <title>Turner Brothers Carpentry &amp; Construction</title>
  <g fill="{fill1}"><path d="{d1}"/></g>
  <g fill="{fill2}"><path d="{d2}"/></g>
</svg>
'''
    open(out, "w").write(svg); print(out, W, H)

build_word("#16307a", "#3d4a63", BASE + "/logo-word.svg")
build_word("#ffffff", "#bfd4f2", BASE + "/logo-word-light.svg")

# check sheet
import cairosvg, io
def render(svg, w, bg):
    return Image.open(io.BytesIO(cairosvg.svg2png(url=svg, output_width=w, background_color=bg))).convert("RGB")
mk = Image.open(BASE + "/logo-mark.png")
sheet = Image.new("RGB", (820, 330), "white")
m2 = mk.resize((150, int(150 * mk.height / mk.width))); sheet.paste(m2, (40, 50), m2)
wr = render(BASE + "/logo-word.svg", 470, "white"); sheet.paste(wr, (240, 70))
sheet.paste(Image.new("RGB", (820, 150), (17, 24, 38)), (0, 180))
m3 = mk.resize((120, int(120 * mk.height / mk.width))); sheet.paste(m3, (40, 200), m3)
wl = render(BASE + "/logo-word-light.svg", 420, "#111826"); sheet.paste(wl, (240, 215))
sheet.save(BASE + "/_logocheck.png"); print("sheet")
