"""
Creates mobile-optimised copies of all artwork images in artwork_mobile/.
Run once; re-run any time new artworks are added.

Output: max 800px on longest side, JPEG quality 65
Result: ~50-100 KB per image vs ~800 KB originals (~8x smaller)
"""
from PIL import Image
import os

SRC_BASE  = r"C:\Users\derek\Documents\Project\jd-partners-website\games\mygallery\artwork"
DST_BASE  = r"C:\Users\derek\Documents\Project\jd-partners-website\games\mygallery\artwork_mobile"
MAX_PX    = 800
QUALITY   = 65

for kid in ('Kayden', 'Kaylie'):
    src_dir = os.path.join(SRC_BASE, kid)
    dst_dir = os.path.join(DST_BASE, kid)
    os.makedirs(dst_dir, exist_ok=True)

    for fname in os.listdir(src_dir):
        if not fname.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
            continue
        src = os.path.join(src_dir, fname)
        dst = os.path.join(dst_dir, os.path.splitext(fname)[0] + '.jpg')

        img = Image.open(src).convert('RGB')
        w, h = img.size
        if max(w, h) > MAX_PX:
            scale = MAX_PX / max(w, h)
            img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
        img.save(dst, 'JPEG', quality=QUALITY, optimize=True)
        orig_kb  = os.path.getsize(src) // 1024
        small_kb = os.path.getsize(dst) // 1024
        print(f'{kid}/{fname}  {orig_kb} KB -> {small_kb} KB')

print('\nDone. Commit the artwork_mobile/ folder alongside the code changes.')
