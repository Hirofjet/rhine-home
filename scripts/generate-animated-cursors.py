#!/usr/bin/env python3
"""Generate animated cursor sprite sheets from the Blue Archive .ani pack.

Usage:
  python scripts/generate-animated-cursors.py "F:/path/to/Blue.Archive.Millennium.Edition.v1.3"

Outputs public/cursors/animated/<state>.png + animated.json.
"""
from __future__ import annotations

import io
import json
import struct
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "cursors" / "animated"

SOURCES = {
    "default": ("Optional/millennium_base.ani", (6, 10)),
    "pointer": ("Optional/millennium_link.ani", (6, 10)),
    "text": ("millennium_text.ani", (15, 16)),
}


def read_chunks(data: bytes, start: int = 12):
    pos = start
    while pos + 8 <= len(data):
        cid = data[pos : pos + 4]
        size = struct.unpack("<I", data[pos + 4 : pos + 8])[0]
        body = data[pos + 8 : pos + 8 + size]
        yield cid, body
        pos += 8 + size + (size & 1)


def cur_frame(data: bytes) -> Image.Image:
    count = struct.unpack("<H", data[4:6])[0]
    for index in range(count):
        entry = data[6 + index * 16 : 22 + index * 16]
        width, height, _colors, _reserved, hx, hy, size, offset = struct.unpack(
            "<BBBBHHII", entry
        )
        if width != 32:
            continue
        dib = data[offset : offset + size]
        ico_entry = struct.pack(
            "<BBBBHHII", width, height, 0, 0, hx, hy, len(dib), 22
        )
        ico = struct.pack("<HHH", 0, 1, 1) + ico_entry + dib
        return Image.open(io.BytesIO(ico)).convert("RGBA")
    raise ValueError("no 32px frame")


def parse_ani(path: Path) -> tuple[list[Image.Image], int]:
    data = path.read_bytes()
    if data[:4] != b"RIFF" or data[8:12] != b"ACON":
        raise ValueError("not an ANI file")
    frames: list[Image.Image] = []
    rate = 8
    for cid, body in read_chunks(data):
        if cid == b"anih" and len(body) >= 36:
            _size, _nframes, _nsteps, _w, _h, _bits, _planes, disp_rate, _flags = struct.unpack(
                "<9I", body[:36]
            )
            rate = max(3, disp_rate or 8)
        elif cid == b"LIST" and body[:4] == b"fram":
            for sub_id, sub_body in read_chunks(body, 4):
                if sub_id in (b"icon", b"cur "):
                    try:
                        frames.append(cur_frame(sub_body))
                    except Exception:
                        continue
        elif cid == b"rate" and len(body) >= 4:
            values = struct.unpack("<" + "I" * (len(body) // 4), body)
            rate = max(3, sum(values) // max(1, len(values)))
    if not frames:
        raise ValueError("no frames")
    return frames, rate


def main() -> None:
    source = Path(sys.argv[1] if len(sys.argv) > 1 else "")
    if not source.is_dir():
        raise SystemExit("usage: generate-animated-cursors.py <cursor-pack-directory>")
    OUT.mkdir(parents=True, exist_ok=True)
    meta = {}
    for state, (relative, hotspot) in SOURCES.items():
        frames, rate = parse_ani(source / relative)
        # 36 frames is enough for a smooth loop and keeps the sheet small
        count = min(len(frames), 36)
        step = max(1, len(frames) // count)
        picked = [frames[index * step] for index in range(count)]
        sheet = Image.new("RGBA", (32 * count, 32), (0, 0, 0, 0))
        for index, frame in enumerate(picked):
            sheet.alpha_composite(frame, (index * 32, 0))
        sheet.save(OUT / f"{state}.png", optimize=True)
        meta[state] = {
            "file": f"{state}.png",
            "frames": count,
            "width": 32,
            "height": 32,
            "hotspot": list(hotspot),
            # ANI display rate is in 1/60s units; clamp to a sane CSS interval
            "frameMs": max(40, min(200, rate * 16)),
        }
    (OUT / "animated.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(json.dumps(meta, indent=2))


if __name__ == "__main__":
    main()
