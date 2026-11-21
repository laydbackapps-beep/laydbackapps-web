#!/usr/bin/env python3
"""mklogo.py - design + build the header lockup artwork for Ray's Garden Works.

Outputs (assets/): logo-header.svg / .png (3x), logo-mark.svg, logo-word.svg
Also prints the palette sampled from the artwork's OWN pixels.

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
    """Advance width (px) and cap height (px) of an outlined run."""
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
    """Outlined letterforms (no live <text>). Origin = baseline-start of the run."""
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


# ------------------------------------------------------------------ the brief
# Ray's Garden Works - landscaping / garden maintenance, Fassifern NSW.
# Idea: a cream garden tile with a single deep-green leaf standing over a
# swept "trim line" - a clipped lawn edge. Warm, hand-kept, not corporate.
PAPER = '#F4EFDF'     # leaf tile / wordmark  (the site's own cream)
INK   = '#22401D'     # deep hedge green      (the site's own field)
ACC   = '#5C8F3A'     # fresh cut green       (accent)

MARK_VB_W, MARK_VB_H = 120, 120
MARK = (
    # tile
    '<rect x="4" y="4" width="112" height="112" rx="26" fill="%s"/>'
    # the leaf
    '<path d="M60,94 C36,74 34,44 60,26 C86,44 84,74 60,94 Z" fill="%s"/>'
    # midrib
    '<path d="M60,88 L60,40" fill="none" stroke="%s" stroke-width="4.2" stroke-linecap="round"/>'
    # inside-veins
    '<path d="M60,72 L74,62 M60,72 L46,62 M60,58 L70,50 M60,58 L50,50" fill="none" '
    'stroke="%s" stroke-width="3" stroke-linecap="round" opacity=".9"/>'
    # the swept trim line
    '<path d="M34,102 Q60,111 86,102" fill="none" stroke="%s" stroke-width="6" stroke-linecap="round"/>'
) % (PAPER, INK, PAPER, PAPER, ACC)

WORD = 'RAY\u2019S  GARDEN  WORKS'
W_FONT, W_SIZE, W_TRACK = 'narrow', 46, 3.2
W, W_CAP = text_metrics(W_FONT, WORD, W_SIZE, W_TRACK)
# wordmark cream: it sits on the site's deep-green bar
WORD_SVG = text_svg(W_FONT, WORD, W_SIZE, W_TRACK, 0, W_CAP, PAPER)


def svg(vb, inner, extra=''):
    x0, y0, w, h = vb
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="%s" height="%s" '
            'viewBox="%s %s %s %s"%s>%s</svg>'
            % (_n(w * 2), _n(h * 2), _n(x0), _n(y0), _n(w), _n(h), extra, inner))


def main():
    gap, pad = 26, 6
    tw = pad + MARK_VB_W + gap + W + pad
    th = MARK_VB_H + 2 * pad
    ty = pad + (MARK_VB_H - W_CAP) / 2.0
    lock = ('<g transform="translate(%s %s)">%s</g>'
            '<g transform="translate(%s %s)">%s</g>'
            % (_n(pad), _n(pad), MARK, _n(pad + MARK_VB_W + gap), _n(ty), WORD_SVG))

    open(os.path.join(ASSETS, 'logo-mark.svg'), 'w').write(
        svg((0, 0, MARK_VB_W, MARK_VB_H), MARK))
    open(os.path.join(ASSETS, 'logo-word.svg'), 'w').write(
        svg((0, 0, W, W_CAP), WORD_SVG))
    open(os.path.join(ASSETS, 'logo-header.svg'), 'w').write(
        svg((0, 0, tw, th), lock))

    import cairosvg
    cairosvg.svg2png(url=os.path.join(ASSETS, 'logo-header.svg'),
                     write_to=os.path.join(ASSETS, 'logo-header.png'),
                     output_width=int(tw * 3))
    print('mark vb %d x %d | word %.1f x %.1f | lockup %.1f x %d'
          % (MARK_VB_W, MARK_VB_H, W, W_CAP, tw, th))
    print('MARK_ASPECT %.4f  WORD_ASPECT %.4f'
          % (MARK_VB_W / MARK_VB_H, W / W_CAP))

    # ---- palette sampled from the artwork's own pixels -------------------
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

    def lum(c):
        return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255.0

    top = cnt.most_common(14)
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
