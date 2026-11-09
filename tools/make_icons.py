# ホーム画面のアイコン（仮の絵柄: 緑の地に白いボール）を作る。
# 追加のライブラリなしで動く。使い方: start-local.bat と同じPythonで
#   python tools\make_icons.py
# 絵柄を変えたいときは、好きな画像を同じ名前・同じ大きさで icons\ に置けばよい。
import struct
import zlib
from pathlib import Path

GREEN = (11, 93, 30)
WHITE = (255, 255, 255)
DIMPLE = (200, 200, 200)


def pixel(x, y, size):
    # 中心からの距離で、白いボールの内側か外側かを決める
    cx = cy = size / 2
    r = size * 0.32
    dx, dy = x + 0.5 - cx, y + 0.5 - cy
    if dx * dx + dy * dy > r * r:
        return GREEN
    # ボールのくぼみ（小さな点）
    step = size * 0.09
    gx, gy = (x % step) - step / 2, (y % step) - step / 2
    if gx * gx + gy * gy < (size * 0.018) ** 2:
        return DIMPLE
    return WHITE


def write_png(path, size):
    rows = b"".join(
        b"\x00" + bytes(c for x in range(size) for c in pixel(x, y, size)) for y in range(size)
    )

    def chunk(kind, data):
        body = kind + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(rows, 9))
    png += chunk(b"IEND", b"")
    path.write_bytes(png)


out = Path(__file__).resolve().parent.parent / "icons"
out.mkdir(exist_ok=True)
for name, size in [("icon-192.png", 192), ("icon-512.png", 512), ("apple-touch-icon.png", 180)]:
    write_png(out / name, size)
    print("作成:", out / name)
