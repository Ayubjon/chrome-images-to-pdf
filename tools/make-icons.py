#!/usr/bin/env python3
"""Generates simple icons (red background + white "page") with no dependencies."""
import os
import struct
import zlib


def write_png(path, size, pixels):
    """pixels — list of (r,g,b) of length size*size, row by row."""
    def chunk(typ, data):
        return (struct.pack(">I", len(data)) + typ + data
                + struct.pack(">I", zlib.crc32(typ + data) & 0xFFFFFFFF))

    raw = bytearray()
    idx = 0
    for _y in range(size):
        raw.append(0)  # row filter = 0
        for _x in range(size):
            r, g, b = pixels[idx]
            idx += 1
            raw += bytes((r, g, b))

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)  # 8-bit RGB
    idat = zlib.compress(bytes(raw), 9)
    png = sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


def make_pixels(size):
    bg = (214, 69, 61)        # red
    page = (255, 255, 255)    # white "page"
    inset = max(2, size // 4)
    out = []
    for y in range(size):
        for x in range(size):
            if inset <= x < size - inset and inset <= y < size - inset:
                out.append(page)
            else:
                out.append(bg)
    return out


def main():
    os.makedirs("icons", exist_ok=True)
    for s in (16, 48, 128):
        write_png(f"icons/icon{s}.png", s, make_pixels(s))
        print(f"icons/icon{s}.png")


if __name__ == "__main__":
    main()
