"""Wandelt das nachtrainierte Qwen3-1.7B (Hugging-Face-Format, safetensors) ohne mlc_llm ins WebLLM-Format q4f16_1 um.

Aufbau (Namen, Formen, Reihenfolge, Aufteilung in params_shard_*.bin) kommt 1:1 aus der tensor-cache.json des offiziellen
Modells mlc-ai/Qwen3-1.7B-q4f16_1-MLC. Dadurch passt das Ergebnis sicher zur fertigen WebLLM-Browser-Bibliothek.
Die 4-Bit-Quantisierung rechnet wie mlc_llm (GroupQuantize): je 32 Werte eine float16-Skala = max|w| / 7,
q = round(w / Skala + 7) begrenzt auf 0..14, acht 4-Bit-Werte pro uint32 (erster Wert in den untersten Bits).
selftest() prüft das am unveränderten Qwen3-1.7B gegen die offiziellen Dateien.
"""
import hashlib
import json
import os
import re

import numpy as np

GROUP = 32  # Werte pro Skala
PACK = 8  # 4-Bit-Werte pro uint32
MAXQ = 7  # 2 ** (4 - 1) - 1
ROWS = 8192  # Zeilen pro Rechenschritt (hält den Speicherbedarf beim großen Wortschatz klein)


def quantize(w, rounding="even"):
    """float16 [N, K] → (q_weight uint32 [N, K/8], q_scale float16 [N, K/32]); gerechnet in float16 wie mlc_llm."""
    n, k = w.shape
    qw = np.empty((n, k // PACK), np.uint32)
    qs = np.empty((n, k // GROUP), np.float16)
    for a in range(0, n, ROWS):
        g = w[a:a + ROWS].reshape(-1, k // GROUP, GROUP)
        s = (np.abs(g).max(axis=2).astype(np.float32) / MAXQ).astype(np.float16)
        with np.errstate(divide="ignore", invalid="ignore"):  # Gruppe nur aus Nullen: Skala 0, ergibt wie bei mlc_llm q = 0
            x = (g.astype(np.float32) / s[..., None].astype(np.float32)).astype(np.float16)
        x = (x.astype(np.float32) + MAXQ).astype(np.float16).astype(np.float32)
        x = np.rint(x) if rounding == "even" else np.floor(x + 0.5)  # .5 zur geraden Zahl oder aufrunden
        x = np.clip(np.nan_to_num(x, nan=0.0), 0, 2 * MAXQ).astype(np.uint32).reshape(len(g), k // PACK, PACK)
        q = np.zeros(x.shape[:2], np.uint32)
        for r in range(PACK):
            q |= x[:, :, r] << np.uint32(4 * r)
        qw[a:a + ROWS], qs[a:a + ROWS] = q, s
    return qw, qs


def dequantize(qw, qs):
    """Gegenstück zu quantize() (so rechnet WebLLM): (q - 7) * Skala."""
    q = (qw[:, :, None] >> (np.arange(PACK, dtype=np.uint32) * 4)) & 0xF
    q = q.reshape(qw.shape[0], -1).astype(np.float32) - MAXQ
    return (q.reshape(qs.shape[0], qs.shape[1], GROUP) * qs[..., None].astype(np.float32)).reshape(q.shape)


def reader(src):
    """Liefert get(name) → float16-Array für alle *.safetensors in src (bfloat16 wird wie bei mlc_llm gerundet)."""
    from safetensors import safe_open
    try:
        import torch
    except ImportError:  # ohne torch nur float16/float32-Dateien
        torch = None
    where = {}
    for f in sorted(os.listdir(src)):
        if f.endswith(".safetensors"):
            h = safe_open(os.path.join(src, f), framework="pt" if torch else "np")
            for key in h.keys():
                where[key] = h
    if not where:
        raise FileNotFoundError(f"keine .safetensors-Datei in {src}")

    def get(name):
        if name not in where:
            raise KeyError(f"Gewicht {name} fehlt im Modell {src}")
        t = where[name].get_tensor(name)
        return t.to(torch.float16).numpy() if torch else t.astype(np.float16)
    return get


def tensors(get, rounding="even"):
    """name aus tensor-cache.json → Array. Zusammengelegte Gewichte wie im MLC-Qwen3-Loader:
    c_attn = q_proj + k_proj + v_proj, gate_up_proj = gate_proj + up_proj (untereinander)."""
    cache = {}

    def source(base):
        m = re.fullmatch(r"(.+)\.self_attn\.c_attn", base)
        if m:
            return np.concatenate([get(f"{m[1]}.self_attn.{p}_proj.weight") for p in "qkv"])
        m = re.fullmatch(r"(.+)\.mlp\.gate_up_proj", base)
        if m:
            return np.concatenate([get(f"{m[1]}.mlp.{p}_proj.weight") for p in ("gate", "up")])
        return get(base + ".weight")

    def tensor(name):
        m = re.fullmatch(r"(.+)\.q_(weight|scale)", name)
        if not m:
            return get(name)
        if m[1] not in cache:
            cache[m[1]] = dict(zip(("weight", "scale"), quantize(source(m[1]), rounding)))
        out = cache[m[1]].pop(m[2])
        if not cache[m[1]]:
            del cache[m[1]]
        return out
    return tensor


def shard(rec, tensor):
    """Baut eine params_shard_*.bin genau nach dem Eintrag aus tensor-cache.json."""
    buf = bytearray()
    for r in rec["records"]:
        a = tensor(r["name"])
        if str(a.dtype) != r["dtype"] or list(a.shape) != r["shape"] or a.nbytes != r["nbytes"] or len(buf) != r["byteOffset"]:
            raise ValueError(f"{r['name']}: {a.dtype} {list(a.shape)} passt nicht zu {r['dtype']} {r['shape']}")
        buf += a.tobytes()
    if len(buf) != rec["nbytes"]:
        raise ValueError(f"{rec['dataPath']}: {len(buf)} statt {rec['nbytes']} Bytes")
    return bytes(buf)


def convert(src, template, out, rounding="even", log=print):
    """src: Hugging-Face-Ordner, template: offizielle tensor-cache.json, out: Zielordner."""
    tpl = json.load(open(template))
    os.makedirs(out, exist_ok=True)
    tensor = tensors(reader(src), rounding)
    for i, rec in enumerate(tpl["records"]):
        data = shard(rec, tensor)
        with open(os.path.join(out, rec["dataPath"]), "wb") as f:
            f.write(data)
        rec["md5sum"] = hashlib.md5(data).hexdigest()
        log(f"{i + 1}/{len(tpl['records'])} {rec['dataPath']}")
    for name in ("tensor-cache.json", "ndarray-cache.json"):  # WebLLM sucht je nach Version die eine oder andere
        with open(os.path.join(out, name), "w") as f:
            json.dump(tpl, f, indent=4)
    return tpl


def compare(mine, official, records):
    """Anteil gleicher Werte je Eintrag (4-Bit-Werte einzeln gezählt)."""
    res = {}
    for r in records:
        a = np.frombuffer(mine, r["dtype"], r["nbytes"] // np.dtype(r["dtype"]).itemsize, r["byteOffset"])
        b = np.frombuffer(official, r["dtype"], a.size, r["byteOffset"])
        if r["dtype"] == "uint32":
            sh = np.arange(PACK, dtype=np.uint32) * 4
            a, b = (a[:, None] >> sh) & 0xF, (b[:, None] >> sh) & 0xF
        res[r["name"]] = float(np.mean(a == b))
    return res


def selftest(base, template, shards, log=print):
    """Wandelt das unveränderte Qwen3-1.7B (Ordner base) für die angegebenen Shards um und vergleicht mit den
    offiziellen Dateien ({dataPath: Pfad}). Gibt die passende Rundung zurück oder bricht ab."""
    tpl = {r["dataPath"]: r for r in json.load(open(template))["records"]}
    get, best = reader(base), None
    for rounding in ("even", "away"):
        res, same = {}, True
        for path, file in shards.items():
            mine, official = shard(tpl[path], tensors(get, rounding)), open(file, "rb").read()
            same &= hashlib.md5(mine).hexdigest() == tpl[path]["md5sum"] and mine == official
            res.update(compare(mine, official, tpl[path]["records"]))
        worst = min(res.values())
        log(f"Rundung {rounding}: {'byte-genau gleich' if same else f'mindestens {worst:.4%} gleich'}")
        if best is None or worst > best[1]:
            best = (rounding, worst, res)
    if best[1] < 0.999:
        for name, v in best[2].items():
            log(f"  {v:8.2%}  {name}")
        raise AssertionError(f"Selbsttest fehlgeschlagen: nur {best[1]:.2%} stimmen mit dem offiziellen Modell überein")
    return best[0]
