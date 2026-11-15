#!/usr/bin/env python3
"""把照片縮小並轉成 JPG，輸出到 images/ 資料夾。

用法：  python3 tools/resize.py <照片資料夾>
照片檔名要先改成商品編號，例如 1.jpg、001.png、12-2.heic 都可以，
輸出會變成 images/001.jpg、images/012-2.jpg。
需要 Pillow：  pip install pillow
"""
import re, sys
from pathlib import Path
from PIL import Image, ImageOps

MAX = 1200  # 長邊最大像素
out = Path(__file__).resolve().parent.parent / "images"
src = Path(sys.argv[1]) if len(sys.argv) > 1 else sys.exit(__doc__)
out.mkdir(exist_ok=True)
for f in sorted(src.iterdir()):
    m = re.fullmatch(r"0*(\d+)(-\d+)?", f.stem)
    if not m or not f.is_file():
        print("略過（檔名不是編號）：", f.name); continue
    try:
        im = ImageOps.exif_transpose(Image.open(f)).convert("RGB")
    except Exception as e:
        print("略過（無法讀取）：", f.name, e); continue
    im.thumbnail((MAX, MAX))
    dest = out / f"{int(m[1]):03d}{m[2] or ''}.jpg"
    im.save(dest, "JPEG", quality=82, optimize=True)
    print(f"{f.name} -> images/{dest.name}  ({dest.stat().st_size // 1024} KB)")
