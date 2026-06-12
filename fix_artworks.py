from PIL import Image
import numpy as np
from collections import deque
import os

BASE = r"C:\Users\derek\Documents\Project\jd-partners-website\games\mygallery\artwork"

def remove_bg(path, tolerance, fill=(255,255,255)):
    """Flood-fill background from all edges using multiple seed points."""
    img = Image.open(path).convert("RGB")
    arr = np.array(img, dtype=np.int32)
    h, w = arr.shape[:2]
    visited = np.zeros((h, w), dtype=bool)

    # Gather seed pixels from all 4 edges
    edge_pixels = []
    for x in range(0, w, 4):
        edge_pixels += [(0, x), (h-1, x)]
    for y in range(0, h, 4):
        edge_pixels += [(y, 0), (y, w-1)]

    q = deque()
    for sy, sx in edge_pixels:
        if not visited[sy, sx]:
            visited[sy, sx] = True
            q.append((sy, sx, arr[sy, sx].copy()))

    # BFS — each queued pixel carries the seed color it started from
    while q:
        y, x, seed = q.popleft()
        arr[y, x] = fill
        for dy, dx in ((-1,0),(1,0),(0,-1),(0,1)):
            ny, nx = y+dy, x+dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx]:
                if np.max(np.abs(arr[ny, nx] - seed)) <= tolerance:
                    visited[ny, nx] = True
                    q.append((ny, nx, seed))

    Image.fromarray(arr.astype(np.uint8)).save(path, quality=93)
    print(f"  bg removed: {os.path.basename(path)}")


# ── 1. Fix 007.jpg rotation (was rotated 90° CW → now upside down; rotate 180° to correct) ──
p = f"{BASE}/Kaylie/007.jpg"
img = Image.open(p)
img.rotate(180).save(p, quality=93)
print("007.jpg: rotation corrected")

# ── 2. Re-do 009.jpg (fan) and 005.jpg (mask) with higher tolerance ──
remove_bg(f"{BASE}/Kaylie/009.jpg", tolerance=55)
remove_bg(f"{BASE}/Kaylie/005.jpg", tolerance=50)

# ── 3. Kayden files with grey photo backgrounds ──
grey_files = [
    "Kayden/001.jpg",  # robot on grey canvas
    "Kayden/002.jpg",  # lollipop face on grey
    "Kayden/003.jpg",  # milkshake cup on grey
    "Kayden/008.jpg",  # giraffe craft on grey
    "Kayden/009.jpg",  # bear-burger on grey
    "Kayden/030.jpg",  # fruit plate on grey
]
for f in grey_files:
    remove_bg(f"{BASE}/{f}", tolerance=45)

# ── 4. Kayden files with brown carpet backgrounds ──
brown_files = [
    "Kayden/011.jpg",  # clay animal on brown carpet
    "Kayden/012.jpg",  # clay bag on brown carpet
    "Kayden/013.jpg",  # camera craft on brown carpet
    "Kayden/028.jpg",  # panda painting on brown carpet
    "Kayden/033.jpg",  # clay rabbit on dark carpet
    "Kayden/034.jpg",  # snowman craft on brown carpet
    "Kayden/035.jpg",  # moon craft on brown cork
]
for f in brown_files:
    remove_bg(f"{BASE}/{f}", tolerance=45)

print("\nAll done.")
