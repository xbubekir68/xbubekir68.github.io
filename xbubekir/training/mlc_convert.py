"""Wandelt das nachtrainierte Qwen3-1.7B (Hugging-Face-Format, safetensors) ohne mlc_llm ins WebLLM-Format q4f16_1 um.

Aufbau (Namen, Formen, Reihenfolge, Aufteilung in params_shard_*.bin) kommt 1:1 aus der tensor-cache.json des offiziellen
Modells mlc-ai/Qwen3-1.7B-q4f16_1-MLC. Dadurch passt das Ergebnis sicher zur fertigen WebLLM-Browser-Bibliothek.
Die 4-Bit-Quantisierung rechnet wie mlc_llm (GroupQuantize): je 32 Werte eine float16-Skala = max|w| / 7,
q = round(w / Skala + 7) begrenzt auf 0..14, acht 4-Bit-Werte pro uint32 (erster Wert in den untersten Bits).
selftest() prüft das am unveränderten Qwen3-1.7B gegen die offiziellen Dateien und sucht dabei unter VARIANTS die
Rechenweise, die deren float16-Rundung am besten trifft (die offiziellen Dateien wurden auf einer GPU gerechnet).
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
# Rechenweisen "Skala/Werte/Rundung", die sich nur in der float16-Rundung unterscheiden:
# Skala  div = max/7, rcp = max · float16(1/7) (Fast-Math auf der GPU)
# Werte  div16 = w/s und +7 je auf float16 gerundet (wie mlc_llm auf der CPU), add32 = nur w/s gerundet,
#        rcp16 = w · float16(1/s), f32 = ohne Zwischenrundung
# Rundung even = .5 zur geraden Zahl, away = .5 aufrunden
VARIANTS = [f"{s}/{v}/{r}" for s in ("div", "rcp") for v in ("div16", "add32", "rcp16", "f32") for r in ("even", "away")]


def f16(x):
    """auf float16 runden, in float32 weiterrechnen"""
    return x.astype(np.float16).astype(np.float32)


def quantize(w, variant=VARIANTS[0]):
    """float16 [N, K] → (q_weight uint32 [N, K/8], q_scale float16 [N, K/32]) wie mlc_llm GroupQuantize."""
    sc, va, ro = variant.split("/")
    n, k = w.shape
    qw = np.empty((n, k // PACK), np.uint32)
    qs = np.empty((n, k // GROUP), np.float16)
    for a in range(0, n, ROWS):
        g = w[a:a + ROWS].reshape(-1, k // GROUP, GROUP)
        m = np.abs(g).max(axis=2).astype(np.float32)
        s = (m / MAXQ if sc == "div" else m * np.float32(np.float16(1 / MAXQ))).astype(np.float16)
        sf = s[..., None].astype(np.float32)
        # Gruppe nur aus Nullen: Skala 0, ergibt wie bei mlc_llm q = 0
        with np.errstate(divide="ignore", invalid="ignore", over="ignore"):
            x = g.astype(np.float32) * f16(1 / sf) if va == "rcp16" else g.astype(np.float32) / sf
            x = x + MAXQ if va == "f32" else f16(x) + MAXQ
            x = f16(x) if va in ("div16", "rcp16") else x
        x = np.rint(x) if ro == "even" else np.floor(x + 0.5)
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


def tensors(get, variant=VARIANTS[0]):
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
            cache[m[1]] = dict(zip(("weight", "scale"), quantize(source(m[1]), variant)))
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


def convert(src, template, out, variant=VARIANTS[0], log=print):
    """src: Hugging-Face-Ordner, template: offizielle tensor-cache.json, out: Zielordner, variant: von selftest()."""
    tpl = json.load(open(template))
    os.makedirs(out, exist_ok=True)
    tensor = tensors(reader(src), variant)
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
    """Je Eintrag: (Anteil gleicher Werte, größte Abweichung in float16-Stufen); 4-Bit-Werte einzeln gezählt."""
    res = {}
    for r in records:
        a = np.frombuffer(mine, r["dtype"], r["nbytes"] // np.dtype(r["dtype"]).itemsize, r["byteOffset"])
        b = np.frombuffer(official, r["dtype"], a.size, r["byteOffset"])
        if r["dtype"] == "uint32":
            sh = np.arange(PACK, dtype=np.uint32) * 4
            a, b = (a[:, None] >> sh) & 0xF, (b[:, None] >> sh) & 0xF
            steps = 0
        else:
            steps = int(np.abs(a.view(np.int16).astype(np.int32) - b.view(np.int16)).max())
        res[r["name"]] = (float(np.mean(a == b)), steps)
    return res


def selftest(base, template, shards, log=print):
    """Wandelt das unveränderte Qwen3-1.7B (Ordner base) für die angegebenen Shards in jeder Rechenweise aus VARIANTS um
    und vergleicht mit den offiziellen Dateien ({dataPath: Pfad}). Gibt die passende Rechenweise zurück oder bricht ab.
    Bestanden: byte-genau gleich, oder Normen gleich, 4-Bit-Werte zu mindestens 99 % gleich und Skalen höchstens
    1 float16-Stufe daneben (reine Rundungsunterschiede, ohne Einfluss auf die Qualität)."""
    tpl = {r["dataPath"]: r for r in json.load(open(template))["records"]}
    official = {path: open(file, "rb").read() for path, file in shards.items()}
    get, best = reader(base), None
    for variant in VARIANTS:
        res, same = {}, True
        for path in shards:
            mine = shard(tpl[path], tensors(get, variant))
            same &= hashlib.md5(mine).hexdigest() == tpl[path]["md5sum"] and mine == official[path]
            res.update(compare(mine, official[path], tpl[path]["records"]))
        scale = [v for n, v in res.items() if n.endswith(".q_scale")]
        weight = [v[0] for n, v in res.items() if n.endswith(".q_weight")]
        score = (same, min(v[0] for v in scale), min(weight))
        log(f"{variant:16} Skalen {score[1]:7.2%} gleich (max. {max(v[1] for v in scale)} Stufe), 4-Bit-Werte {score[2]:7.2%}"
            + ("  byte-genau gleich" if same else ""))
        if best is None or score > best[0]:
            best = (score, variant, res)
    (same, _, weight), variant, res = best
    norms = all(v[0] == 1 for n, v in res.items() if not re.search(r"\.q_(weight|scale)$", n))
    steps = max(v[1] for n, v in res.items() if n.endswith(".q_scale"))
    if same:
        log(f"✅ Selbsttest bestanden mit {variant}: byte-genau gleich wie das offizielle Modell")
    elif norms and weight >= 0.99 and steps <= 1:
        log(f"✅ Selbsttest bestanden mit {variant}: Aufbau stimmt, Unterschiede nur in der letzten float16-Stelle")
    else:
        for name, (v, st) in res.items():
            log(f"  {v:8.2%}  {st:3} Stufen  {name}")
        raise AssertionError(f"Selbsttest fehlgeschlagen (beste Rechenweise {variant}): Normen gleich: {norms}, "
                             f"4-Bit-Werte {weight:.2%}, Skalen bis {steps} Stufen daneben")
    return variant
