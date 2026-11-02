#!/usr/bin/env python3
"""SHO Fancy PWA icons v1: build raster icons from the APPROVED favicon SVG.

Generates real PNGs for Android Chrome/Edge/Samsung install shortcuts.
No generic SH9 substitute, no source design regeneration.
"""
from pathlib import Path
from io import BytesIO
from PIL import Image
import cairosvg

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "sho-preview" / "favicon.svg"
DEST = ROOT / "assets"
NAVY = (7, 15, 35, 255)


def draw(size: int, scale: float = 1.0) -> Image.Image:
    svg = SOURCE.read_bytes()
    pixels = round(size * scale)
    png = cairosvg.svg2png(bytestring=svg, output_width=pixels, output_height=pixels)
    image = Image.open(BytesIO(png)).convert("RGBA")
    canvas = Image.new("RGBA", (size, size), NAVY)
    canvas.alpha_composite(image, ((size - pixels) // 2, (size - pixels) // 2))
    return canvas.convert("RGB")


def save(filename: str, size: int, scale: float = 1.0) -> None:
    image = draw(size, scale)
    path = DEST / filename
    image.save(path, format="PNG", optimize=True, compress_level=9)
    with Image.open(path) as opened:
        opened.load()
        assert opened.format == "PNG" and opened.size == (size, size), filename
        assert opened.getpixel((size // 2, size // 2)) != NAVY[:3], filename
    print(filename, size, path.stat().st_size, "bytes")


def main() -> None:
    DEST.mkdir(parents=True, exist_ok=True)
    save("sho-fancy-install-192-v1.png", 192)
    save("sho-fancy-install-512-v1.png", 512)
    # Android adaptive icons clip outside the central safe circle.
    save("sho-fancy-maskable-512-v1.png", 512, 0.79)
    save("sho-fancy-touch-180-v1.png", 180)


if __name__ == "__main__":
    main()
