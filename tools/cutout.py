"""Cut AI-made creature sheets out of their flat magenta background (dev tool, not shipped).

Usage:
  python tools/cutout.py sheet  <idle.webp> <attack.webp> <out_dir> <name>
      Splits each sheet into its 3 creatures (left to right), crops idle and attack with the same box
      so they overlay, and writes <name>_<stage>.webp / <name>_<stage>_atk.webp plus <name>.json
      (size and feet anchor of each stage).
  python tools/cutout.py map <image> <out_file> [width height]
      Crops and scales a map background to the game size (720x1280 by default).
"""
import json
import sys

import numpy as np
from PIL import Image, ImageFilter


def key_out(path: str) -> np.ndarray:
    """RGBA float array with the magenta background removed and the magenta spill cleaned."""
    rgb = np.asarray(Image.open(path).convert('RGB')).astype(np.float32)
    border = np.concatenate([rgb[:4].reshape(-1, 3), rgb[-4:].reshape(-1, 3), rgb[:, :4].reshape(-1, 3), rgb[:, -4:].reshape(-1, 3)])
    bg = np.median(border, axis=0)
    # "Magenta-ness": how much red AND blue stand above green. The creatures never have that.
    s = np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1]
    sbg = float(min(bg[0], bg[2]) - bg[1])
    hi, lo = sbg * 0.8, sbg * 0.12
    a = np.clip((hi - s) / (hi - lo), 0, 1)
    # Unmix the background from the soft edges: C = a*F + (1-a)*bg  ->  F = (C - (1-a)*bg) / a
    safe = np.maximum(a, 0.05)[..., None]
    f = np.clip((rgb - (1 - a[..., None]) * bg) / safe, 0, 255)
    # Despill: any pixel still leaning magenta loses that lean.
    m = np.minimum(f[..., 0], f[..., 2])
    spill = np.maximum(m - f[..., 1], 0)
    f[..., 0] -= spill
    f[..., 2] -= spill
    a[a < 0.04] = 0
    return np.dstack([f, a * 255])


def split(arr: np.ndarray, n: int = 3) -> list[np.ndarray]:
    """One mask per creature, left to right. The n biggest solid blobs are the creatures; every other
    pixel (sparks, soft edges, glow) belongs to the creature whose solid part is nearest."""
    from scipy import ndimage

    core = arr[..., 3] > 128
    lab, count = ndimage.label(core)
    sizes = ndimage.sum(core, lab, range(1, count + 1))
    big = [int(i) + 1 for i in np.argsort(sizes)[::-1][:n]]
    # nearest big blob for every pixel
    owner = np.zeros(core.shape, np.int32)
    for k, b in enumerate(big, start=1):
        owner[lab == b] = k
    _, (iy, ix) = ndimage.distance_transform_edt(owner == 0, return_indices=True)
    owner = owner[iy, ix]
    masks = [(owner == k) & (arr[..., 3] > 0) for k in range(1, n + 1)]
    masks.sort(key=lambda m: float(np.where(m.any(axis=0))[0].mean()))
    return masks


def bbox(mask: np.ndarray, alpha: np.ndarray) -> tuple[int, int, int, int]:
    sub = mask & (alpha > 20)
    ys = np.where(sub.any(axis=1))[0]
    xs = np.where(sub.any(axis=0))[0]
    return int(xs[0]), int(ys[0]), int(xs[-1]), int(ys[-1])


def save(arr: np.ndarray, box: tuple[int, int, int, int], out: str) -> None:
    x0, y0, x1, y1 = box
    img = Image.fromarray(arr[y0:y1 + 1, x0:x1 + 1].round().astype(np.uint8), 'RGBA')
    img.save(out, 'WEBP', quality=92, method=6)


def sheet(idle_path: str, atk_path: str, out_dir: str, name: str) -> None:
    idle, atk = key_out(idle_path), key_out(atk_path)
    mi, ma = split(idle), split(atk)
    meta = []
    pad = 4
    h, w = idle.shape[:2]
    for st, (m_i, m_a) in enumerate(zip(mi, ma), start=1):
        bi, ba = bbox(m_i, idle[..., 3]), bbox(m_a, atk[..., 3])
        box = (max(0, min(bi[0], ba[0]) - pad), max(0, min(bi[1], ba[1]) - pad), min(w - 1, max(bi[2], ba[2]) + pad), min(h - 1, max(bi[3], ba[3]) + pad))
        one_i = idle.copy()
        one_i[..., 3] *= m_i
        one_a = atk.copy()
        one_a[..., 3] *= m_a
        save(one_i, box, f'{out_dir}/{name}_{st}.webp')
        save(one_a, box, f'{out_dir}/{name}_{st}_atk.webp')
        # Feet anchor: the centre of the legs (lowest quarter of the idle pose), the bottom of the box.
        x0, y0, x1, y1 = box
        al = one_i[y0:y1 + 1, x0:x1 + 1, 3]
        legs = al[int(al.shape[0] * 0.75):]
        cols = legs.sum(axis=0)
        cx = float((cols * np.arange(len(cols))).sum() / max(cols.sum(), 1))
        feet = int(np.where((al > 128).any(axis=1))[0][-1])
        meta.append({'stage': st, 'w': x1 - x0 + 1, 'h': y1 - y0 + 1, 'originX': round(cx / (x1 - x0 + 1), 3), 'originY': round(feet / (y1 - y0 + 1), 3)})
    with open(f'{out_dir}/{name}.json', 'w') as fh:
        json.dump(meta, fh, indent=1)
    print(json.dumps(meta))


def map_bg(path: str, out: str, w: int = 720, h: int = 1280) -> None:
    img = Image.open(path).convert('RGB')
    sw, sh = img.size
    if sw / sh > w / h:
        cw = round(sh * w / h)
        img = img.crop(((sw - cw) // 2, 0, (sw - cw) // 2 + cw, sh))
    else:
        ch = round(sw * h / w)
        img = img.crop((0, (sh - ch) // 2, sw, (sh - ch) // 2 + ch))
    img = img.resize((w, h), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1.2, percent=40, threshold=2))
    img.save(out, 'WEBP', quality=88, method=6)
    print(out, img.size)


if __name__ == '__main__':
    if sys.argv[1] == 'sheet':
        sheet(*sys.argv[2:6])
    elif sys.argv[1] == 'map':
        map_bg(sys.argv[2], sys.argv[3], *(int(v) for v in sys.argv[4:6]))
