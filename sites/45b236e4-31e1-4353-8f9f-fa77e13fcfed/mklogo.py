#!/usr/bin/env python3
"""mklogo.py - build the brand lockup artwork for this Lay'dback lead site.

Design workflow (logo-design skill): brief -> geometric SVG build -> palette
sampled from the artwork's own pixels.

Nothing here is a screenshot of a font: the mark is hand-built geometry
(polygons / rounded shapes) and the wordmark letterforms are the font's real
outline contours, converted to <path> data with fontTools (no live <text>,
no embedded raster).

Run from this site directory:  mklogo.py
Writes:  assets/logo-mark.svg  assets/logo-word.svg  assets/logo-header.svg
         assets/logo-3x.png  (inspection render, transparent)
Prints:  a JSON palette sampled from the rendered artwork.
"""
import json
import sys
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")

from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Transform

HERE = Path(__file__).resolve().parent
FONTS = HERE / "mkfonts"
ASSETS = HERE / "assets"
SITE = HERE.name

# --------------------------------------------------------------------------
# BRAND SPECS — one per site.  Colours are the business's own (never the
# Lay'dback lime #c4fb24, never another client's palette).
# --------------------------------------------------------------------------
SPECS = {
    # ---- electrician, Maitland / Rutherford -----------------------------
    "yp_-a80a7e3a-fcb": {
        "name": "Trent Lantry Electrical",
        "mark": "hexbolt",
        "paper": "#fafafa",
        "ink": "#1a1a1a",
        "accent": "#8a5527",      # copper conductor brown
        "accent2": "#c98a5a",     # lighter copper (detail stroke)
        "bar": "#fafafa",
        "word": [
            {"text": "TRENT LANTRY", "font": "Oxanium-700.ttf", "size": 104,
             "tracking": 1.5, "fill": "#1a1a1a"},
            {"text": "ELECTRICAL", "font": "SpaceMono-700.ttf", "size": 46,
             "tracking": 13.0, "fill": "#8a5527"},
        ],
    },
    # ---- landscaping, Floraville / Newcastle ----------------------------
    "45b236e4-31e1-4353-8f9f-fa77e13fcfed": {
        "name": "Newcastle Landscapes",
        "mark": "terraces",
        "paper": "#eef1e7",
        "ink": "#1e261e",
        "accent": "#cf8ea6",      # orchard blossom rose
        "accent2": "#24513a",     # pine / deep garden green
        "bar": "#eef1e7",
        "word": [
            {"text": "NEWCASTLE", "font": "Lexend-600.ttf", "size": 104,
             "tracking": 1.0, "fill": "#1e261e"},
            {"text": "LANDSCAPES", "font": "Lexend-600.ttf", "size": 104,
             "tracking": 1.0, "fill": "#24513a"},
        ],
    },
    # ---- plumbing, Pokolbin ---------------------------------------------
    "yp-0542e17d-3c5": {
        "name": "Warren Ellis Plumbing",
        "mark": "elbow",
        "paper": "#f5f1eb",
        "ink": "#0b100f",
        "accent": "#b06a2e",      # copper pipe
        "accent2": "#d69a63",     # polished copper highlight
        "bar": "#0b100f",
        "word": [
            {"text": "WARREN ELLIS", "font": "SpaceMono-700.ttf", "size": 92,
             "tracking": 2.0, "fill": "#f5f1eb"},
            {"text": "PLUMBING", "font": "DMSans-600.ttf", "size": 52,
             "tracking": 12.0, "fill": "#b06a2e"},
        ],
    },
    # ---- fencing, Jewells ------------------------------------------------
    "yp-cb623703-c63": {
        "name": "O'Hara's Fencing",
        "mark": "pickets",
        "paper": "#ece7dd",
        "ink": "#1d3742",
        "accent": "#b0663c",      # weathered rust red
        "accent2": "#1d3742",     # slate
        "bar": "#ece7dd",
        "word": [
            {"text": "O'HARA'S", "font": "BricolageGrotesque-700.ttf", "size": 112,
             "tracking": 1.0, "fill": "#1d3742"},
            {"text": "FENCING", "font": "InstrumentSans-600.ttf", "size": 52,
             "tracking": 16.0, "fill": "#b0663c"},
        ],
    },
}


# --------------------------------------------------------------------------
# marks — hand-built geometry, viewBox 0 0 96 96
# --------------------------------------------------------------------------
def mark_svg(which, accent, accent2, paper):
    """Return (inner_svg, viewbox). Real paths/shapes only."""
    if which == "hexbolt":
        # pointy-top hexagon (a nut / bolt head) + a lightning bolt knocked
        # out of it in paper white; a lighter inner hexagon adds the craft
        # detail. Copper = the electrician's own conductor colour.
        hexagon = ("M48 3 L86.97 25.5 L86.97 70.5 L48 93 "
                   "L9.03 70.5 L9.03 25.5 Z")
        inner = ("M48 15.6 L76.06 31.8 L76.06 64.2 L48 80.4 "
                 "L19.94 64.2 L19.94 31.8 Z")
        bolt = ("M51.1 23 L35.5 50.1 L45.4 50.1 L40.7 73 "
                "L60.5 44.9 L50.1 44.9 Z")
        return (
            f'<path d="{hexagon}" fill="{accent}"/>'
            f'<path d="{inner}" fill="none" stroke="{accent2}" '
            f'stroke-opacity=".55" stroke-width="2.4"/>'
            f'<path d="{bolt}" fill="{paper}"/>'
        ), "0 0 96 96"

    if which == "terraces":
        # garden terraces / retaining beds rising to the right; the topmost
        # bed carries the orchard blossom colour.
        green = accent2
        return (
            f'<rect x="8" y="72" width="80" height="12" rx="6" fill="{green}"/>'
            f'<rect x="24" y="54" width="64" height="12" rx="6" fill="{green}"/>'
            f'<rect x="40" y="36" width="48" height="12" rx="6" fill="{green}"/>'
            f'<rect x="56" y="18" width="32" height="12" rx="6" fill="{accent}"/>'
        ), "0 0 96 96"

    if which == "elbow":
        # copper badge, paper-white pipe elbow (with collars) and a water
        # droplet sitting in the crook of the elbow.
        return (
            f'<rect x="8" y="8" width="80" height="80" rx="20" fill="{accent}"/>'
            f'<path d="M32 78 V56 Q32 44 44 44 H74" fill="none" '
            f'stroke="{paper}" stroke-width="14" stroke-linecap="butt" '
            f'stroke-linejoin="round"/>'
            f'<rect x="23" y="70" width="18" height="9" rx="4" fill="{paper}"/>'
            f'<rect x="68" y="35" width="9" height="18" rx="4" fill="{paper}"/>'
            f'<circle cx="60" cy="64" r="6.5" fill="{paper}"/>'
        ), "0 0 96 96"

    if which == "pickets":
        # paling-picket run: two rails behind three pointed pickets, the
        # centre picket picked out in the rust accent.
        slate = accent2
        screw = accent
        rails = (f'<rect x="6" y="32" width="84" height="9" rx="4.5" fill="{slate}"/>'
                 f'<rect x="6" y="60" width="84" height="9" rx="4.5" fill="{slate}"/>')
        def picket(x0, fill):
            x1 = x0 + 18
            mid = x0 + 9
            return (f'<path d="M{x0} 32 L{mid} 18 L{x1} 32 L{x1} 86 '
                    f'L{x0} 86 Z" fill="{fill}"/>')
        return rails + picket(14, slate) + picket(39, screw) + picket(64, slate), "0 0 96 96"

    raise SystemExit("unknown mark: " + which)


# --------------------------------------------------------------------------
# letterforms -> real outline paths
# --------------------------------------------------------------------------
def open_font(path, wght=None, opsz=None):
    f = TTFont(str(path))
    if "fvar" in f:
        from fontTools.varLib.instancer import instantiateVariableFont
        axes = {}
        for a in f["fvar"].axes:
            if a.axisTag == "wght" and wght is not None:
                axes["wght"] = wght
            elif a.axisTag == "opsz" and opsz is not None:
                axes["opsz"] = min(max(opsz, a.minValue), a.maxValue)
        if axes:
            f = instantiateVariableFont(f, axes, inplace=True)
    return f


def _fmt(v):
    s = f"{v:.1f}"
    return s[:-2] if s.endswith(".0") else s


def text_paths(text, font_path, size, x0, baseline, tracking=0.0):
    """Outline `text` into SVG path data. Returns (list_of_d, advance_width)."""
    f = open_font(font_path, wght=700, opsz=size)
    upem = f["head"].unitsPerEm
    cmap = f.getBestCmap()
    gs = f.getGlyphSet()
    hmtx = f["hmtx"]
    s = size / upem
    out, x = [], x0
    for ch in text:
        gn = cmap.get(ord(ch))
        if gn is None:
            x += size * 0.42 + tracking
            continue
        spen = SVGPathPen(gs, ntos=_fmt)
        pen = TransformPen(spen, Transform(s, 0, 0, -s, x, baseline))
        gs[gn].draw(pen)
        d = spen.getCommands()
        if d:
            out.append(d)
        x += hmtx[gn][0] * s + tracking
    return out, (x - x0 - tracking if text else 0.0)


def cap_height(font_path, size):
    f = open_font(font_path, wght=700, opsz=size)
    upem = f["head"].unitsPerEm
    cap = None
    try:
        cap = f["OS/2"].sCapHeight
    except Exception:
        pass
    if not cap:
        cap = int(upem * 0.72)
    return cap * size / upem


def build_word(spec):
    """Wordmark SVG. Every glyph is an outlined path, laid out with tracking."""
    pad = 6.0
    lead = 1.30                       # line advance multiplier
    lines = spec["word"]
    metrics = []
    width = 0.0
    y = 0.0
    for ln in lines:
        fp = FONTS / ln["font"]
        ch = cap_height(fp, ln["size"])
        _, w = text_paths(ln["text"], fp, ln["size"], 0, 0, ln["tracking"])
        metrics.append((fp, ch, w))
        width = max(width, w)
        y += ch * lead
    height = y

    out = []
    baseline = 0.0
    for ln, (fp, ch, w) in zip(lines, metrics):
        baseline += ch
        ds, _ = text_paths(ln["text"], fp, ln["size"], 0.0, baseline, ln["tracking"])
        out.append(f'<g fill="{ln["fill"]}">')
        for d in ds:
            out.append(f'<path d="{d}"/>')
        out.append("</g>")
        baseline += ch * (lead - 1.0)

    W = round(width + pad * 2, 1)
    H = round(height + pad * 1.4, 1)
    body = (f'<g transform="translate({pad:.1f},{pad * 0.7:.1f})">'
            + "".join(out) + "</g>")
    return body, W, H


def svg_doc(viewbox, body, w, h, title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}" '
            f'width="{w}" height="{h}" role="img" aria-label="{title}">'
            f"<title>{title}</title>{body}</svg>")


# --------------------------------------------------------------------------
def main():
    spec = SPECS[SITE]
    ASSETS.mkdir(exist_ok=True)

    m_body, m_vb = mark_svg(spec["mark"], spec["accent"], spec["accent2"], spec["paper"])
    mark = svg_doc(m_vb, m_body, 96, 96, f"{spec['name']} mark")
    (ASSETS / "logo-mark.svg").write_text(mark)

    w_body, ww, wh = build_word(spec)
    word = svg_doc(f"0 0 {ww} {wh}", w_body, ww, wh, f"{spec['name']} wordmark")
    (ASSETS / "logo-word.svg").write_text(word)

    # combined horizontal lockup: mark, gap, wordmark — vertically centred
    gap = 22.0
    H = max(96.0, wh)
    cb = (f'<g transform="translate(0,{(H - 96) / 2:.1f})">{m_body}</g>'
          f'<g transform="translate({96 + gap:.1f},{(H - wh) / 2:.1f})">{w_body}</g>')
    CW = round(96 + gap + ww, 1)
    CH = round(H, 1)
    header = svg_doc(f"0 0 {CW} {CH}", cb, CW, CH, f"{spec['name']} logo")
    (ASSETS / "logo-header.svg").write_text(header)

    pal = sample_palette(spec, header)
    print(json.dumps({
        "site": SITE, "name": spec["name"],
        "files": {"logo-mark.svg": [96, 96], "logo-word.svg": [ww, wh],
                  "logo-header.svg": [CW, CH]},
        "palette": pal,
    }, indent=1))


def sample_palette(spec, header_svg):
    """Render the lockup and read the brand palette back out of its pixels."""
    from playwright.sync_api import sync_playwright
    from PIL import Image
    import collections

    tmp = ASSETS / "_palette_probe.html"
    tmp.write_text(
        "<html><body style='margin:0;background:" + spec["bar"] + "'>"
        + header_svg.replace('width="', 'width="', 1) + "</body></html>")

    png = ASSETS / "logo-3x.png"
    with sync_playwright() as pw:
        b = pw.chromium.launch(args=["--no-sandbox"])
        pg = b.new_page(viewport={"width": 1200, "height": 300},
                        device_scale_factor=3)
        pg.goto(tmp.as_uri())
        pg.wait_for_timeout(250)
        el = pg.query_selector("svg")
        box = el.bounding_box()
        pg.screenshot(path=str(png), clip={"x": box["x"], "y": box["y"],
                                           "width": box["width"], "height": box["height"]})
        # transparent copy of the mark on its own, for pure brand pixels
        pg.set_content("<html><body style='margin:0;background:transparent'>"
                       + (ASSETS / "logo-mark.svg").read_text() + "</body></html>")
        pg.wait_for_timeout(150)
        el = pg.query_selector("svg")
        mb = el.bounding_box()
        pg.screenshot(path=str(ASSETS / "_mark.png"),
                      omit_background=True,
                      clip={"x": mb["x"], "y": mb["y"], "width": mb["width"], "height": mb["height"]})
        b.close()
    tmp.unlink(missing_ok=True)

    img = Image.open(png).convert("RGB")
    w, h = img.size
    paper = "#%02x%02x%02x" % img.getpixel((3, 3))
    bar = spec["bar"]

    m = Image.open(ASSETS / "_mark.png").convert("RGBA")
    counts = collections.Counter()
    for px in m.getdata():
        if px[3] > 200:
            counts[(px[0], px[1], px[2])] += 1
    top = counts.most_common(3)
    (ASSETS / "_mark.png").unlink(missing_ok=True)

    def hexof(t):
        return "#%02x%02x%02x" % t

    # ink = the darkest common pixel of the entire lockup rendered on its
    # own bar colour (dark-bar brands take their ink from the bar).
    wx = img
    wc = collections.Counter()
    for px in wx.getdata():
        wc[px] += 1
    darks = sorted([c for c, n in wc.items() if n > 40], key=lambda c: sum(c))
    return {
        "paper": {"hex": paper,
                  "pixel": f"logo-header.svg on {bar}, pixel (3,3) - lockup background"},
        "accent": {"hex": hexof(top[0][0]) if top else spec["accent"],
                   "pixel": "logo-mark.svg, most common opaque pixel"},
        "accent_secondary": {"hex": hexof(top[1][0]) if len(top) > 1 else spec["accent2"],
                             "pixel": "logo-mark.svg, 2nd most common opaque pixel"},
        "ink": {"hex": hexof(darks[0]) if darks else spec["ink"],
                "pixel": f"logo-header.svg on {bar}, darkest common pixel"},
    }


if __name__ == "__main__":
    main()
