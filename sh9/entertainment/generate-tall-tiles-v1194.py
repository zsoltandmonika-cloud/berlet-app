#!/usr/bin/env python3
"""SHO v1194: proportion-safe tall cinema-style tiles from the approved artwork.

All visible source pixels, especially the baked-in Hungarian labels, are kept
at uniform scale. Only the softened background is extended to meet the height
of the other four SH9 category cards. Nothing is vertically stretched.
"""
from pathlib import Path
from PIL import Image, ImageOps, ImageFilter, ImageDraw, ImageEnhance

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / "assets"
SOURCE = ASSETS / "sho-approved-culture-feature-v1189.webp"
img = Image.open(SOURCE).convert("RGB")

def tile(name, box, color):
    original = img.crop(box)
    width, height = 370, 257
    backdrop = ImageOps.fit(
        original, (width, height), method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.42)
    )
    backdrop = ImageEnhance.Brightness(
        backdrop.filter(ImageFilter.GaussianBlur(18))
    ).enhance(0.48)
    # Keep all title, icon and photograph pixels in their original proportions.
    foreground = original.resize(
        (width, round(original.height * width / original.width)),
        Image.Resampling.LANCZOS
    ).convert("RGBA")
    y = height - foreground.height - 6
    alpha = Image.new("L", foreground.size, 255)
    draw = ImageDraw.Draw(alpha)
    for row in range(40):
        draw.line((0, row, foreground.width, row), fill=min(255, int(255 * row / 40)))
    backdrop.paste(foreground, (0, y), alpha)
    border = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    brush = ImageDraw.Draw(border)
    brush.rounded_rectangle(
        (3, 3, width - 4, height - 4),
        radius=24, outline=tuple(color) + (255,), width=4
    )
    composed = Image.alpha_composite(
        backdrop.convert("RGBA"), border.filter(ImageFilter.GaussianBlur(8))
    )
    composed = Image.alpha_composite(composed, border).convert("RGB")
    path = ASSETS / f"sho-{name}-tall-v1194.webp"
    composed.save(path, "WEBP", quality=79, method=6)
    print(f"Created {path.relative_to(ROOT)}: {composed.size}")

tile("culture", (21, 10, 392, 183), (255, 185, 91))
tile("events", (402, 10, 769, 183), (67, 214, 255))
# Exact original aspect ratio for the editable, clickable featured panel.
feature = img.crop((13, 185, 779, 381))
feature_path = ASSETS / "sho-feature-proportional-v1194.webp"
feature.save(feature_path, "WEBP", quality=84, method=6)
print(f"Created {feature_path.relative_to(ROOT)}: {feature.size}")
