#!/usr/bin/env python3
"""mklogo.py - design + build the header lockup artwork for Grace Rural Fencing.

Writes assets/logo-header.svg + .png (3x), logo-mark.svg, logo-word.svg
and prints the palette sampled from the artwork's OWN pixels.

Run: /home/ogheesus/personal-autogtm/.venv/bin/python mklogo.py
"""
import os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, 'assets')
os.makedirs(ASSETS, exist_ok=True)

FDIR = '/usr/share/fonts'
FONTS = {
    'grot':   FDIR + '/opentype/urw-base35/NimbusSans-Bold.otf',
    'grotr':  FDIR + '/opentype/urw-base35/NimbusSans-Regular.otf',
    'narrow': FDIR + '/opentype/urw-base35/NimbusSansNarrow-Bold.otf',
    'book':   FDIR + '/opentype/urw-base35/URWBookman-Demi.otf',
    'roman':  FDIR + '/opentype/urw-base35/NimbusRoman-Bold.otf',
    'noto':   FDIR + '/truetype/noto/NotoSans-Bold.ttf',
}
_F = {}


def _font(k):
    if k not in _F:
        f = TTFont(FONTS[k])
        _F[k] = (f, f['head'].unitsPerEm, f.getGlyphSet(), f.getBestCmap(), f['hmtx'])
    return _F[k]


def _n(v):
    v = float(v)
    if abs(v - round(v)) < 1e-6:
        return str(int(round(v)))
    return ('%.3f' % v).rstrip('0').rstrip('.')


def text_metrics(k, text, size, tracking=0.0):
    f, upem, gs, cmap, hmtx = _font(k)
    s = size / upem
    tu = tracking / s
    x = 0.0
    for ch in text:
        gn = cmap.get(ord(ch))
        if gn is None:
            x += 0.3 * upem + tu
            continue
        x += hmtx[gn][0] + tu
    cap = getattr(f['OS/2'], 'sCapHeight', 0) or int(upem * 0.71)
    return max(0.0, x - tu) * s, cap * s


def text_svg(k, text, size, tracking, x, baseline, fill, opacity=None):
    """Outlined letterforms - real paths, never a live <text> element."""
    f, upem, gs, cmap, hmtx = _font(k)
    s = size / upem
    tu = tracking / s
    xx = 0.0
    out = []
    for ch in text:
        gn = cmap.get(ord(ch))
        if gn is None:
            xx += 0.3 * upem + tu
            continue
        pen = SVGPathPen(gs)
        gs[gn].draw(pen)
        d = pen.getCommands()
        if d:
            out.append('<path d="%s" transform="translate(%s 0)"/>' % (d, _n(xx)))
        xx += hmtx[gn][0] + tu
    op = ' opacity="%s"' % opacity if opacity is not None else ''
    return ('<g fill="%s"%s transform="translate(%s %s) scale(%s -%s)">%s</g>'
            % (fill, op, _n(x), _n(baseline), _n(s), _n(s), ''.join(out)))


def svg(vb, inner, extra=''):
    x0, y0, w, h = vb
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="%s" height="%s" '
            'viewBox="%s %s %s %s"%s>%s</svg>'
            % (_n(w * 2), _n(h * 2), _n(x0), _n(y0), _n(w), _n(h), extra, inner))


# ------------------------------------------------------------------- brief
# Grace Rural Fencing - rural & stock fencing, Maitland NSW.
# Idea: a strainer post pair with a clay top rail and two plain wires, knocked
# out of a solid tar-green plate - the corner of a fence run, read at a glance.
PAPER = '#F3EFE6'   # the sheet's own bone
INK   = '#1D241C'   # the sheet's own ink green
ACC   = '#B5673A'   # the sheet's own clay
WIRE  = '#6F7468'   # the sheet's own wire grey

MARK_VB_W, MARK_VB_H = 120, 120
MARK = (
    '<rect x="4" y="4" width="112" height="112" rx="20" fill="%s"/>'
    '<path d="M26,18 V102" fill="none" stroke="%s" stroke-width="11"/>'
    '<path d="M94,18 V102" fill="none" stroke="%s" stroke-width="11"/>'
    '<path d="M21,37 H99" fill="none" stroke="%s" stroke-width="8"/>'
    '<path d="M21,63 H99" fill="none" stroke="%s" stroke-width="5"/>'
    '<path d="M21,88 H99" fill="none" stroke="%s" stroke-width="5"/>'
) % (INK, PAPER, PAPER, ACC, WIRE, WIRE)


def build_word():
    size, track = 46, 3.4
    w, cap = text_metrics('narrow', 'GRACE RURAL FENCING', size, track)
    return w, cap, text_svg('narrow', 'GRACE RURAL FENCING', size, track, 0, cap, INK)


def main():
    W, WH, WORD_SVG = build_word()
    import cairosvg
    gap, pad = 26, 6
    tw = pad + MARK_VB_W + gap + W + pad
    th = MARK_VB_H + 2 * pad
    ty = pad + (MARK_VB_H - WH) / 2.0
    lock = ('<g transform="translate(%s %s)">%s</g>'
            '<g transform="translate(%s %s)">%s</g>'
            % (_n(pad), _n(pad), MARK, _n(pad + MARK_VB_W + gap), _n(ty), WORD_SVG))
    open(os.path.join(ASSETS, 'logo-mark.svg'), 'w').write(svg((0, 0, MARK_VB_W, MARK_VB_H), MARK))
    open(os.path.join(ASSETS, 'logo-word.svg'), 'w').write(svg((0, 0, W, WH), WORD_SVG))
    open(os.path.join(ASSETS, 'logo-header.svg'), 'w').write(svg((0, 0, tw, th), lock))
    cairosvg.svg2png(url=os.path.join(ASSETS, 'logo-header.svg'),
                     write_to=os.path.join(ASSETS, 'logo-header.png'),
                     output_width=int(tw * 3))
    print('mark %dx%d | word %.1fx%.1f | lockup %.1fx%d | MARK_ASPECT %.4f WORD_ASPECT %.4f'
          % (MARK_VB_W, MARK_VB_H, W, WH, tw, th, MARK_VB_W / MARK_VB_H, W / WH))

    from collections import Counter
    from PIL import Image
    im = Image.open(os.path.join(ASSETS, 'logo-header.png')).convert('RGBA')
    w, h = im.size
    px = im.load()
    cnt = Counter()
    first = {}
    for yy in range(h):
        for xx in range(w):
            r, g, b, a = px[xx, yy]
            if a < 250:
                continue
            key = (r, g, b)
            cnt[key] += 1
            first.setdefault(key, (xx, yy))
    top = cnt.most_common(14)

    def lum(c):
        return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255.0

    bands = {'paper': None, 'ink': None, 'accent': None}
    chroma = lambda c: max(c) - min(c)
    mids = []
    for c, n in top:
        L = lum(c)
        if L > 0.72:
            bands['paper'] = bands['paper'] or (c, n)
        elif L < 0.25:
            bands['ink'] = bands['ink'] or (c, n)
        else:
            mids.append((c, n))
    if mids:
        # dominant AND saturated wins (chroma weighted by how much of it there is)
        bands['accent'] = max(mids, key=lambda cn: chroma(cn[0]) * (cn[1] ** 0.5))
    print('TOP COLOURS: ' + '  '.join('#%02X%02X%02X:%d' % (c[0], c[1], c[2], n) for c, n in top[:6]))
    for band in ('paper', 'ink', 'accent'):
        v = bands[band]
        if not v:
            print('%-7s none' % band)
            continue
        (r, g, b), n = v
        sxx, syy = first[(r, g, b)]
        print('%-7s #%02X%02X%02X  source px (%d,%d) of %dx%d  [%d px]'
              % (band, r, g, b, sxx, syy, w, h, n))


if __name__ == '__main__':
    main()
