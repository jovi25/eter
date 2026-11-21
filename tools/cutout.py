"""Cut AI-made creature pictures out of their flat background (dev tool, not shipped).

The background must be one flat colour: magenta (#FF00FF) or, for purple/pink subjects, green (#00FF00).
The colour is detected from the picture's border.

Usage:
  python tools/cutout.py sheet <idle> <attack> <out_dir> <name> [count]
      An evolution line: two pictures with the same `count` creatures (default 3) left to right, the first
      resting and the second attacking. Writes <name>_<n>.webp and <name>_<n>_atk.webp (same frame, feet on
      the same point, so they swap cleanly) plus <name>.json with each frame's feet anchor.
  python tools/cutout.py pair <image> <out_dir> <name>
      One character twice in one picture: resting on the left, attacking on the right.
      Writes <name>.webp and <name>_atk.webp (+ <name>.json).
  python tools/cutout.py split <image> <out_dir> <name1> <name2> ...
      One picture with several different creatures left to right; one file per name (+ <name1>.json).
  python tools/cutout.py fit <image> <out_dir> <name:w:h[:c]> ...
      Several creatures left to right, each fitted into a fixed w x h frame (feet at the bottom; :c centres).
  python tools/cutout.py map <image> <out_file> [width height]
      Crops and scales a map background to the game size (720x1280 by default).
  python tools/cutout.py grid <image> <out_dir> <name1> <name2> ...
      A grid of paintings separated by white gutters (card art): finds the cells, row by row, and saves each
      one (inner border trimmed) as <name>.webp, 320x300. Use '-' to skip a cell.
  python tools/cutout.py icons <image> <out_dir> <cols>x<rows> <name:w:h[:b]> ...
      A grid of separate objects on a flat background (icons, props): every blob goes to the grid cell its
      centre falls in; cells are read row by row. Each is fitted into w x h, centred (or standing on the
      bottom edge with :b). Use '-' to skip a cell.
"""
import json
import sys

import numpy as np
from PIL import Image, ImageFilter

PAD = 4


def key_out(path: str) -> np.ndarray:
    """RGBA float array with the background removed and its colour spill cleaned."""
    rgb = np.asarray(Image.open(path).convert('RGB')).astype(np.float32)
    border = np.concatenate([rgb[:4].reshape(-1, 3), rgb[-4:].reshape(-1, 3), rgb[:, :4].reshape(-1, 3), rgb[:, -4:].reshape(-1, 3)])
    bg = np.median(border, axis=0)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    green = bg[1] > max(bg[0], bg[2])
    # How strongly a pixel leans to the key colour (magenta: red AND blue above green; green: the opposite).
    if green:
        s = g - np.maximum(r, b)
        sbg = float(bg[1] - max(bg[0], bg[2]))
    else:
        s = np.minimum(r, b) - g
        sbg = float(min(bg[0], bg[2]) - bg[1])
    hi, lo = sbg * 0.8, sbg * 0.12
    a = np.clip((hi - s) / (hi - lo), 0, 1)
    # Unmix the background from the soft edges: C = a*F + (1-a)*bg  ->  F = (C - (1-a)*bg) / a
    safe = np.maximum(a, 0.05)[..., None]
    f = np.clip((rgb - (1 - a[..., None]) * bg) / safe, 0, 255)
    # Despill: any pixel still leaning to the key colour loses that lean.
    if green:
        f[..., 1] = np.minimum(f[..., 1], np.maximum(f[..., 0], f[..., 2]) + 12)
    else:
        m = np.minimum(f[..., 0], f[..., 2])
        spill = np.maximum(m - f[..., 1], 0)
        f[..., 0] -= spill
        f[..., 2] -= spill
    a[a < 0.04] = 0
    return np.dstack([f, a * 255])


def split(arr: np.ndarray, n: int) -> list[np.ndarray]:
    """One mask per creature, left to right. The n biggest solid blobs are the creatures; every other
    pixel (sparks, soft edges, glow) belongs to the creature whose solid part is nearest."""
    from scipy import ndimage

    core = arr[..., 3] > 128
    lab, count = ndimage.label(core)
    sizes = ndimage.sum(core, lab, range(1, count + 1))
    big = [int(i) + 1 for i in np.argsort(sizes)[::-1][:n]]
    owner = np.zeros(core.shape, np.int32)
    for k, b in enumerate(big, start=1):
        owner[lab == b] = k
    dist, (iy, ix) = ndimage.distance_transform_edt(owner == 0, return_indices=True)
    owner = owner[iy, ix]
    # Specks far from every creature (an AI watermark in a corner, stray dots) belong to nobody.
    owner[dist > arr.shape[1] * 0.04] = 0
    masks = [(owner == k) & (arr[..., 3] > 0) for k in range(1, n + 1)]
    masks.sort(key=lambda m: float(np.where(m.any(axis=0))[0].mean()))
    return masks


def isolate(arr: np.ndarray, mask: np.ndarray) -> np.ndarray:
    one = arr.copy()
    one[..., 3] *= mask
    return one


def anchor(one: np.ndarray) -> tuple[int, int, int, int, float, int]:
    """Bounding box and feet point: x = centre of the lowest quarter (legs), y = lowest solid row."""
    al = one[..., 3]
    ys = np.where((al > 20).any(axis=1))[0]
    xs = np.where((al > 20).any(axis=0))[0]
    x0, y0, x1, y1 = int(xs[0]), int(ys[0]), int(xs[-1]), int(ys[-1])
    feet = int(np.where((al > 128).any(axis=1))[0][-1])
    legs = al[y0 + int((y1 - y0) * 0.75):y1 + 1, x0:x1 + 1]
    cols = legs.sum(axis=0)
    cx = x0 + float((cols * np.arange(len(cols))).sum() / max(cols.sum(), 1))
    return x0, y0, x1, y1, cx, feet


def save_group(frames: list[tuple[np.ndarray, str]]) -> dict:
    """Crop several poses of one creature into frames of the same size with the feet on the same point."""
    info = [anchor(one) for one, _ in frames]
    left = max(cx - x0 for x0, _, _, _, cx, _ in info) + PAD
    right = max(x1 - cx for _, _, x1, _, cx, _ in info) + PAD
    up = max(fy - y0 for _, y0, _, _, _, fy in info) + PAD
    down = max(y1 - fy for _, _, _, y1, _, fy in info) + PAD
    w, h = int(np.ceil(left + right)), int(np.ceil(up + down))
    tail = [0, 0]
    for k, ((one, out), (_, _, _, _, cx, fy)) in enumerate(zip(frames, info)):
        canvas = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        img = Image.fromarray(one.round().astype(np.uint8), 'RGBA')
        canvas.paste(img, (int(round(left - cx)), int(round(up - fy))), img)
        canvas.save(out, 'WEBP', quality=92, method=6)
        if k == 0:
            # Tail tip of the resting pose: the solid pixels in the leftmost strip (a glow can sit there).
            al = np.asarray(canvas)[..., 3] > 128
            xs = np.where(al.any(axis=0))[0]
            strip = al[:, xs[0]:xs[0] + max(8, (xs[-1] - xs[0]) // 8)]
            ys, sx = np.where(strip)
            tail = [int(xs[0] + sx.mean()), int(ys.mean())]
    return {'w': w, 'h': h, 'originX': round(left / w, 3), 'originY': round(up / h, 3), 'tail': tail}


def write_meta(path: str, meta: list[dict]) -> None:
    with open(path, 'w') as fh:
        json.dump(meta, fh, indent=1)
    print(json.dumps(meta))


def sheet(idle_path: str, atk_path: str, out_dir: str, name: str, count: str = '3') -> None:
    n = int(count)
    idle, atk = key_out(idle_path), key_out(atk_path)
    meta = []
    for st, (m_i, m_a) in enumerate(zip(split(idle, n), split(atk, n)), start=1):
        m = save_group([(isolate(idle, m_i), f'{out_dir}/{name}_{st}.webp'), (isolate(atk, m_a), f'{out_dir}/{name}_{st}_atk.webp')])
        meta.append({'stage': st, **m})
    write_meta(f'{out_dir}/{name}.json', meta)


def pair(path: str, out_dir: str, name: str) -> None:
    arr = key_out(path)
    m_idle, m_atk = split(arr, 2)
    m = save_group([(isolate(arr, m_idle), f'{out_dir}/{name}.webp'), (isolate(arr, m_atk), f'{out_dir}/{name}_atk.webp')])
    write_meta(f'{out_dir}/{name}.json', [m])


def split_names(path: str, out_dir: str, *names: str) -> None:
    arr = key_out(path)
    meta = []
    for mask, nm in zip(split(arr, len(names)), names):
        meta.append({'name': nm, **save_group([(isolate(arr, mask), f'{out_dir}/{nm}.webp')])})
    write_meta(f'{out_dir}/{names[0]}.json', meta)


def fit(path: str, out_dir: str, *specs: str) -> None:
    """Several creatures left to right, each fitted into a fixed frame: spec = name:width:height[:c]
    (feet on the bottom edge, or centred with :c for flyers)."""
    arr = key_out(path)
    for mask, spec in zip(split(arr, len(specs)), specs):
        name, w, h, *mode = spec.split(':')
        w, h = int(w), int(h)
        one = isolate(arr, mask)
        x0, y0, x1, y1, cx, fy = anchor(one)
        img = Image.fromarray(one.round().astype(np.uint8), 'RGBA').crop((x0, y0, x1 + 1, y1 + 1))
        k = min(w / img.width, h / img.height)
        img = img.resize((max(1, round(img.width * k)), max(1, round(img.height * k))), Image.LANCZOS)
        canvas = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        left = int(round(w / 2 - (cx - x0) * k))
        left = max(0, min(w - img.width, left))
        top = (h - img.height) // 2 if mode == ['c'] else h - img.height
        canvas.paste(img, (left, top), img)
        canvas.save(f'{out_dir}/{name}.webp', 'WEBP', quality=92, method=6)
        print(name, img.size)


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


def runs(mask: np.ndarray, min_len: int) -> list[tuple[int, int]]:
    """Stretches of True at least `min_len` long: (start, end)."""
    out, start = [], None
    for i, v in enumerate(list(mask) + [False]):
        if v and start is None:
            start = i
        elif not v and start is not None:
            if i - start >= min_len:
                out.append((start, i))
            start = None
    return out


def grid(path: str, out_dir: str, *names: str) -> None:
    rgb = np.asarray(Image.open(path).convert('RGB')).astype(np.float32)
    light = rgb.min(axis=2) > 225  # gutter pixels: nearly white
    h, w = light.shape
    # A row/column is gutter when almost all of it is white.
    rows = runs(light.mean(axis=1) < 0.6, h // 12)
    cols = runs(light.mean(axis=0) < 0.6, w // 12)
    print('cells:', len(rows), 'x', len(cols))
    img = Image.open(path).convert('RGB')
    k = 0
    for (y0, y1) in rows:
        for (x0, x1) in cols:
            if k >= len(names):
                return
            name = names[k]
            k += 1
            if name == '-':
                continue
            m = max(6, (x1 - x0) // 60)  # trim soft edges / thin frames
            cell = img.crop((x0 + m, y0 + m, x1 - m, y1 - m))
            # Cover 320x300 (the art window's shape).
            tw, th = 320, 300
            s = max(tw / cell.width, th / cell.height)
            cell = cell.resize((round(cell.width * s), round(cell.height * s)), Image.LANCZOS)
            left, top = (cell.width - tw) // 2, (cell.height - th) // 2
            cell.crop((left, top, left + tw, top + th)).save(f'{out_dir}/{name}.webp', 'WEBP', quality=90, method=6)
            print(name, (x0, y0, x1, y1))


def icons(path: str, out_dir: str, layout: str, *specs: str) -> None:
    from scipy import ndimage

    cols, rows = (int(v) for v in layout.lower().split('x'))
    arr = key_out(path)
    h, w = arr.shape[:2]
    solid = ndimage.binary_dilation(arr[..., 3] > 40, iterations=max(2, w // 200))
    lab, count = ndimage.label(solid)
    sizes = ndimage.sum(solid, lab, range(1, count + 1))
    centres = ndimage.center_of_mass(solid, lab, range(1, count + 1))
    cell_of = np.zeros(count + 1, np.int32) - 1
    for i, ((cy, cx), size) in enumerate(zip(centres, sizes), start=1):
        if size < sizes.max() * 0.004:
            continue  # stray specks (watermark, dust)
        cell_of[i] = min(rows - 1, int(cy / h * rows)) * cols + min(cols - 1, int(cx / w * cols))
    for k, spec in enumerate(specs):
        if spec == '-':
            continue
        name, tw, th, *mode = spec.split(':')
        tw, th = int(tw), int(th)
        mask = np.isin(lab, np.where(cell_of == k)[0]) & (arr[..., 3] > 0)
        if not mask.any():
            print(name, 'EMPTY CELL')
            continue
        one = isolate(arr, mask)
        ys = np.where((one[..., 3] > 20).any(axis=1))[0]
        xs = np.where((one[..., 3] > 20).any(axis=0))[0]
        img = Image.fromarray(one.round().astype(np.uint8), 'RGBA').crop((xs[0], ys[0], xs[-1] + 1, ys[-1] + 1))
        s = min(tw / img.width, th / img.height)
        img = img.resize((max(1, round(img.width * s)), max(1, round(img.height * s))), Image.LANCZOS)
        canvas = Image.new('RGBA', (tw, th), (0, 0, 0, 0))
        top = th - img.height if mode == ['b'] else (th - img.height) // 2
        canvas.paste(img, ((tw - img.width) // 2, top), img)
        canvas.save(f'{out_dir}/{name}.webp', 'WEBP', quality=92, method=6)
        print(name, img.size)


if __name__ == '__main__':
    cmd, args = sys.argv[1], sys.argv[2:]
    if cmd == 'sheet':
        sheet(*args)
    elif cmd == 'pair':
        pair(*args)
    elif cmd == 'split':
        split_names(*args)
    elif cmd == 'fit':
        fit(*args)
    elif cmd == 'grid':
        grid(*args)
    elif cmd == 'icons':
        icons(*args)
    elif cmd == 'map':
        map_bg(args[0], args[1], *(int(v) for v in args[2:4]))
