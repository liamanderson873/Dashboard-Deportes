"""Builds docs/img/demo.gif from docs/img/frames/*.png (run capture-screenshots first)."""
from pathlib import Path

from PIL import Image

IMG = Path(__file__).resolve().parent.parent / "docs" / "img"
MAX_BYTES = 1_500_000
FRAME_MS = 1600


def build(width: int) -> int:
    paths = sorted((IMG / "frames").glob("*.png"))
    if not paths:
        raise SystemExit("No frames found: run `npm run screenshots` in web/ first.")
    frames = []
    for p in paths:
        im = Image.open(p).convert("RGB")
        height = round(im.height * width / im.width)
        im = im.resize((width, height), Image.LANCZOS)
        frames.append(im.quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE))
    out = IMG / "demo.gif"
    frames[0].save(
        out, save_all=True, append_images=frames[1:], duration=FRAME_MS, loop=0, optimize=True
    )
    return out.stat().st_size


if __name__ == "__main__":
    for w in (960, 800, 640):
        size = build(w)
        print(f"{w}px -> {size / 1024:.0f} KB")
        if size < MAX_BYTES:
            break
