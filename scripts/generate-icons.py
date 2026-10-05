#!/usr/bin/env python3
"""Draw the TagFlow toolbar icons. Stdlib only."""

import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "public" / "icons"
SIZES = (16, 32, 48, 128)
BG = (16, 20, 27, 255)
RED = (235, 16, 0, 255)
CORAL = (255, 77, 58, 255)
WHITE = (247, 248, 250, 255)


def chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


def write_png(path: Path, size: int, pixels: bytes) -> None:
    raw = b"".join(b"\x00" + pixels[y * size * 4 : (y + 1) * size * 4] for y in range(size))
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    path.write_bytes(png)


def rounded_mask(size: int, radius: int) -> list[list[bool]]:
    mask = [[False] * size for _ in range(size)]
    for y in range(size):
        for x in range(size):
            dx = 0
            dy = 0
            if x < radius:
                dx = radius - x
            elif x >= size - radius:
                dx = x - (size - radius - 1)
            if y < radius:
                dy = radius - y
            elif y >= size - radius:
                dy = y - (size - radius - 1)
            mask[y][x] = dx * dx + dy * dy <= radius * radius
    return mask


def fill_rect(buf: bytearray, size: int, x0: int, y0: int, x1: int, y1: int, color: tuple[int, int, int, int], radius: int) -> None:
    for y in range(max(0, y0), min(size, y1)):
        for x in range(max(0, x0), min(size, x1)):
            local_radius = min(radius, (x1 - x0) // 2, (y1 - y0) // 2)
            if local_radius > 0 and not inside_round_rect(x, y, x0, y0, x1, y1, local_radius):
                continue
            offset = (y * size + x) * 4
            buf[offset : offset + 4] = bytes(color)


def inside_round_rect(x: int, y: int, x0: int, y0: int, x1: int, y1: int, radius: int) -> bool:
    left = x0 + radius
    right = x1 - radius - 1
    top = y0 + radius
    bottom = y1 - radius - 1
    if left <= x <= right or top <= y <= bottom:
        return True
    cx = left if x < left else right
    cy = top if y < top else bottom
    dx = x - cx
    dy = y - cy
    return dx * dx + dy * dy <= radius * radius


def draw(size: int) -> bytes:
    buf = bytearray(size * size * 4)
    radius = max(2, round(size * 0.22))
    mask = rounded_mask(size, radius)
    for y in range(size):
        for x in range(size):
            if not mask[y][x]:
                continue
            offset = (y * size + x) * 4
            buf[offset : offset + 4] = bytes(BG)

    bar_w = max(1, round(size * 0.125))
    gap = max(1, round(size * 0.08))
    total = bar_w * 3 + gap * 2
    left = (size - total) // 2
    bottom = size - max(2, round(size * 0.2))
    heights = (0.38, 0.58, 0.82)
    colors = (RED, CORAL, WHITE)
    for index, (height, color) in enumerate(zip(heights, colors)):
        bar_h = max(2, round((bottom - round(size * 0.18)) * height))
        x0 = left + index * (bar_w + gap)
        y0 = bottom - bar_h
        fill_rect(buf, size, x0, y0, x0 + bar_w, bottom, color, max(1, bar_w // 4))
    return bytes(buf)


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        write_png(ROOT / f"icon-{size}.png", size, draw(size))


if __name__ == "__main__":
    main()
