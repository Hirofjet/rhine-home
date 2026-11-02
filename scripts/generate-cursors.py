#!/usr/bin/env python3
"""Generate web-friendly PNG cursors from the Blue Archive cursor pack.

Usage:
  python scripts/generate-cursors.py "F:/path/to/Blue.Archive.Millennium.Edition.v1.3"

The source pack is Windows .cur format. We extract the 32px frame, recolor it
for each theme, and write PNGs to public/cursors/.
"""
from __future__ import annotations

import io
import struct
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public" / "cursors"

THEMES = {
    "rhine": {
        "fill": (247, 232, 202),
        "accent": (211, 178, 122),
        "border": (24, 19, 11),
    },
    "sakura": {
        "fill": (255, 231, 243),
        "accent": (255, 158, 201),
        "border": (43, 16, 33),
    },
    "noctis": {
        "fill": (232, 225, 255),
        "accent": (154, 134, 255),
        "border": (18, 12, 38),
    },
}

# fixed hotspots for the 32px frame (x, y)
SOURCES = {
    "default": ("millennium_base.cur", (6, 10)),
    "pointer": ("millennium_link.cur", (6, 10)),
    "text": ("Optional/millennium_text.cur", (15, 16)),
    "move": ("millennium_move.cur", (15, 16)),
}


def load_cur_frame(path: Path) -> Image.Image:
    data = path.read_bytes()
    count = struct.unpack("<H", data[4:6])[0]
    for index in range(count):
        entry = data[6 + index * 16 : 22 + index * 16]
        width, height, _colors, _reserved, hx, hy, size, offset = struct.unpack(
            "<BBBBHHII", entry
        )
        if width != 32:
            continue
        dib = data[offset : offset + size]
        if not dib:
            raise ValueError(f"empty cursor frame: {path}")
        ico_entry = struct.pack(
            "<BBBBHHII", width, height, 0, 0, hx, hy, len(dib), 22
        )
        ico = struct.pack("<HHH", 0, 1, 1) + ico_entry + dib
        return Image.open(io.BytesIO(ico)).convert("RGBA")
    raise ValueError(f"no 32px frame in {path}")


def recolor(image: Image.Image, palette: dict[str, tuple[int, int, int]]) -> Image.Image:
    result = Image.new("RGBA", image.size)
    src = image.load()
    dst = result.load()
    fill = palette["fill"]
    accent = palette["accent"]
    border = palette["border"]
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = src[x, y]
            if a == 0:
                dst[x, y] = (0, 0, 0, 0)
                continue
            is_accent = b > r + 24 and b > 120
            if is_accent:
                # blue part of the original cursor -> theme accent
                target = accent
                strength = min(1.0, max(0.0, b / 255.0))
            elif min(r, g, b) > 110:
                target = fill
                strength = min(1.0, max(0.0, (r + g + b) / 765.0))
            else:
                target = border
                strength = min(1.0, max(0.0, (r + g + b) / 255.0))
            alpha = int(a * (0.55 + 0.45 * strength))
            dst[x, y] = (target[0], target[1], target[2], alpha)
    return result


def main() -> None:
    source = Path(sys.argv[1] if len(sys.argv) > 1 else "")
    if not source.is_dir():
        raise SystemExit("usage: generate-cursors.py <cursor-pack-directory>")

    for theme, palette in THEMES.items():
        out = PUBLIC / theme
        out.mkdir(parents=True, exist_ok=True)
        for name, (relative, _hotspot) in SOURCES.items():
            image = load_cur_frame(source / relative)
            recolor(image, palette).save(out / f"{name}.png")

    archive = PUBLIC / "archive"
    archive.mkdir(parents=True, exist_ok=True)
    for name, (relative, _hotspot) in SOURCES.items():
        image = load_cur_frame(source / relative)
        image.save(archive / f"{name}.png")

    (PUBLIC / "README.md").write_text(
        "Cursor PNGs generated from the Blue Archive Millennium Edition cursor pack.\n"
        "Source: provided by the site owner; converted to 32px PNG for the web.\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
