from PIL import Image, ImageDraw
import math

W = 512
S = W / 188.0

def p(x, y):
    return (x * S, y * S)

img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
G = (192, 144, 72, 255)
sw = int(round(3.2 * S))

# glow pass then crisp pass
for blur, alpha in ((9, 70), (0, 255)):
    layer = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    dl = ImageDraw.Draw(layer)
    col = (G[0], G[1], G[2], alpha)

    def line(a, b, w):
        dl.line([p(*a), p(*b)], fill=col, width=w)

    line((14, 68), (70, 68), sw)
    line((70, 68), (70, 12), sw)
    line((70, 12), (118, 12), sw)
    line((118, 12), (118, 68), sw)
    line((118, 68), (174, 68), sw)
    dl.rectangle([p(6, 60), p(22, 76)], outline=col, width=sw)
    line((9, 65), (19, 65), sw)
    line((9, 71), (19, 71), sw)
    for c in ((70, 68), (70, 12), (118, 12), (118, 68), (174, 68)):
        r = 3.4 * S
        dl.ellipse([p(c[0] - 3.4, c[1] - 3.4), p(c[0] + 3.4, c[1] + 3.4)], fill=col)
    dl.ellipse([p(166, 46), p(182, 58)], outline=col, width=sw)
    line((174, 48), (174, 56), sw)

    if blur:
        layer = layer.filter(__import__("PIL.ImageFilter", fromlist=["GaussianBlur"]).GaussianBlur(blur / 3))
    img = Image.alpha_composite(img, layer)

# centre the 188x80 mark in the square canvas
mark_h = int(80 * S)
canvas = Image.new("RGBA", (W, W), (0, 0, 0, 0))
canvas.paste(img, (0, (W - mark_h) // 2))
canvas.save("assets/logo.png")
canvas.resize((64, 64), Image.LANCZOS).save("assets/favicon.png")
print("wrote logo.png/favicon.png", canvas.size)
