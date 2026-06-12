"""Generate apple-touch-icon.png (180x180) for the My Kid 3D Gallery PWA."""
from PIL import Image, ImageDraw, ImageFont
import math, os

SIZES = [180, 192, 512]
OUT   = os.path.dirname(os.path.abspath(__file__))

NAVY  = (10,  14,  26)
GOLD  = (200, 168, 32)
TEAL  = (112, 208, 192)
PINK  = (208, 112, 192)
CREAM = (245, 242, 238)

def make_icon(size):
    img = Image.new("RGB", (size, size), NAVY)
    d   = ImageDraw.Draw(img)
    S   = size

    # ── outer gold border ────────────────────────────────────────────────────
    bw = max(3, round(S * 0.025))          # border width scales with size
    d.rectangle([0, 0, S-1, S-1], outline=GOLD, width=bw)

    # ── ornate picture frame (inset) ─────────────────────────────────────────
    pad   = round(S * 0.09)
    fw    = max(2, round(S * 0.018))
    inner = [pad, pad, S-pad-1, S-pad-1]
    d.rectangle(inner, outline=GOLD, width=fw)

    # thin accent line inside the frame
    ap = pad + round(S * 0.032)
    d.rectangle([ap, ap, S-ap-1, S-ap-1], outline=(*GOLD[:3], 120) if False else GOLD, width=max(1, fw//2))

    # corner L-brackets
    brk = round(S * 0.06)
    lw2 = max(1, round(S * 0.012))
    corners = [(pad, pad), (S-pad-1, pad), (pad, S-pad-1), (S-pad-1, S-pad-1)]
    for cx, cy in corners:
        sx = 1 if cx == pad else -1
        sy = 1 if cy == pad else -1
        d.line([(cx + sx*brk, cy), (cx, cy), (cx, cy + sy*brk)], fill=GOLD, width=lw2)

    # ── three "paintings" inside the frame ───────────────────────────────────
    cx_c = S // 2
    cy_c = round(S * 0.44)

    # painting frame helper
    def painting(x, y, w, h, top_color, bot_color, letter, letter_col):
        margin = max(1, round(S * 0.008))
        d.rectangle([x, y, x+w, y+h], fill=NAVY, outline=GOLD, width=max(1, round(S*0.01)))
        # gradient-ish fill: top half / bottom half
        d.rectangle([x+margin, y+margin, x+w-margin, y+(h//2)], fill=top_color)
        d.rectangle([x+margin, y+(h//2), x+w-margin, y+h-margin], fill=bot_color)
        # letter label
        try:
            font_size = max(8, round(w * 0.55))
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            font = ImageFont.load_default()
        bbox = d.textbbox((0, 0), letter, font=font)
        tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
        d.text((x + (w-tw)//2, y + (h-th)//2), letter, fill=letter_col, font=font)

    pw = round(S * 0.22)
    ph = round(S * 0.30)
    gap = round(S * 0.07)

    # left painting — Kayden (teal)
    lx = cx_c - pw - gap//2
    ly = cy_c - ph//2
    painting(lx, ly, pw, ph, (40, 100, 90), (20, 50, 45), "K", TEAL)

    # right painting — Kaylie (pink)
    rx = cx_c + gap//2
    ry = cy_c - ph//2
    painting(rx, ry, pw, ph, (100, 40, 90), (50, 20, 45), "K", PINK)

    # ── "Gallery" label at the bottom ────────────────────────────────────────
    try:
        label_size = max(10, round(S * 0.085))
        label_font = ImageFont.truetype("georgia.ttf", label_size)
    except:
        try:
            label_font = ImageFont.truetype("arial.ttf", max(10, round(S*0.085)))
        except:
            label_font = ImageFont.load_default()

    label = "Gallery"
    lb = d.textbbox((0, 0), label, font=label_font)
    lw_, lh_ = lb[2]-lb[0], lb[3]-lb[1]
    ly_label = round(S * 0.78)
    d.text(((S - lw_) // 2, ly_label), label, fill=CREAM, font=label_font)

    # small gold line above label
    line_y = ly_label - round(S * 0.025)
    half   = round(S * 0.18)
    d.line([(S//2 - half, line_y), (S//2 + half, line_y)], fill=GOLD, width=max(1, round(S*0.006)))

    return img

for size in SIZES:
    icon = make_icon(size)
    name = "apple-touch-icon.png" if size == 180 else f"icon-{size}.png"
    icon.save(os.path.join(OUT, name))
    print(f"  {name}  ({size}x{size})")

print("Done.")
