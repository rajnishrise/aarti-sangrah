#!/usr/bin/env python3
"""Validate the texts in content/ and compile them into data/library.js.

Usage:
    python tools/build.py           # validate and write data/library.js
    python tools/build.py --check   # validate only (for CI); exits 1 on errors

The text format is described in CONTRIBUTING.md.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
OUT = ROOT / "data" / "library.js"
DEVA = re.compile(r"[\u0900-\u097F]")
DIGITS = str.maketrans("0123456789", "०१२३४५६७८९")
AUTH_CLASSES = {"known", "attributed", "traditional"}
REQUIRED = ["id", "kind", "deity", "lang", "language", "region", "title", "author", "occasions", "when"]

errors, warnings = [], []


def err(where, msg):
    errors.append(f"{where}: {msg}")


def warn(where, msg):
    warnings.append(f"{where}: {msg}")


def parse_file(path):
    """Split a text file into headers (dict, repeated keys become lists) and verse blocks."""
    lines = path.read_text(encoding="utf-8").replace("\r\n", "\n").split("\n")
    head, blocks, cur = {}, [], None
    for no, raw in enumerate(lines, 1):
        line = raw.rstrip()
        if cur is None and not line.startswith("---"):
            if not line.strip():
                continue
            if ":" not in line:
                err(f"{path.name}:{no}", "header lines must look like 'key: value'")
                continue
            key, val = line.split(":", 1)
            key, val = key.strip().lower(), val.strip()
            if key in head:
                head[key] = head[key] if isinstance(head[key], list) else [head[key]]
                head[key].append(val)
            else:
                head[key] = val
            continue
        if line.startswith("---"):
            cur = {"label": line[3:].strip(), "d": [], "r": [], "m": [], "sp": None, "line": no}
            blocks.append(cur)
        elif not line.strip():
            continue
        elif line.startswith("~ ") or line == "~":
            cur["r"].append(line[2:].strip())
        elif line.startswith("= ") or line == "=":
            cur["m"].append(line[2:].strip())
        elif line.startswith("> "):
            parts = [p.strip() for p in line[2:].split("|")]
            cur["sp"] = {"d": parts[0], "r": parts[1] if len(parts) > 1 else ""}
        else:
            cur["d"].append(line.strip())
    return head, blocks


def clean_block(where, b, label=None):
    w = f"{where} (block at line {b['line']})"
    if not b["d"]:
        err(w, "has no Devanagari lines")
    if not b["r"]:
        err(w, "has no Roman lines (start them with '~ ')")
    for l in b["d"]:
        if not DEVA.search(l):
            err(w, f"line without Devanagari: {l[:40]!r}. Roman lines start with '~ ', meanings with '= '")
    for l in b["r"]:
        if DEVA.search(l):
            err(w, f"Roman line contains Devanagari: {l[:40]!r}")
    if b["d"] and b["r"] and len(b["d"]) != len(b["r"]):
        warn(w, f"{len(b['d'])} Devanagari lines but {len(b['r'])} Roman lines")
    if not b["m"]:
        warn(w, "has no meaning (add a line starting with '= ')")
    out = {"d": "\n".join(b["d"]), "r": "\n".join(b["r"])}
    if b["m"]:
        out["m"] = " ".join(b["m"])
    if label:
        out["n"] = label
    if b["sp"]:
        out["sp"] = b["sp"]
    return out


def meta(where, head, core):
    for k in REQUIRED:
        if not head.get(k):
            err(where, f"missing header '{k}'")
    title = [p.strip() for p in str(head.get("title", "")).split("|")]
    if len(title) != 3:
        err(where, "title must be 'Devanagari | Roman | English'")
        title = (title + ["", "", ""])[:3]
    auth = [p.strip() for p in str(head.get("author", "")).split("|")]
    if len(auth) != 2 or auth[1] not in AUTH_CLASSES:
        err(where, "author must be 'who wrote it | known, attributed or traditional'")
        auth = (auth + ["", "traditional"])[:2]
    occ = [o.strip() for o in str(head.get("occasions", "")).split(",") if o.strip()]
    for o in occ:
        if o not in core["occasions"]:
            err(where, f"unknown occasion '{o}' (add it to content/core.json)")
    if head.get("kind") not in {k["id"] for k in core["kinds"]}:
        err(where, f"unknown kind '{head.get('kind')}'")
    if head.get("deity") not in {d["id"] for d in core["deities"]}:
        err(where, f"unknown deity '{head.get('deity')}'")
    m = {
        "id": head.get("id", ""), "kind": head.get("kind", ""), "deity": head.get("deity", ""),
        "lang": head.get("lang", ""), "language": head.get("language", ""), "region": head.get("region", ""),
        "title": {"d": title[0], "r": title[1], "en": title[2]},
        "auth": {"t": auth[0], "c": auth[1]}, "occ": occ, "when": head.get("when", ""),
    }
    for opt in ("form", "dialect", "notes", "source"):
        if head.get(opt):
            m[opt] = head[opt]
    return m


def build_text(path, core):
    where = str(path.relative_to(ROOT))
    head, blocks = parse_file(path)
    t = meta(where, head, core)
    if t["id"] and path.stem != t["id"]:
        warn(where, f"file name should match id '{t['id']}'")
    refrain, verses = None, []
    for b in blocks:
        if b["label"].lower() == "refrain":
            if refrain:
                err(where, "more than one refrain block")
            refrain = clean_block(where, b)
        else:
            verses.append(clean_block(where, b, b["label"] or None))
    if not verses:
        err(where, "no verses")
    t["refrain"] = refrain
    t["refrainFirst"] = str(head.get("refrain-first", "yes")).lower() in ("yes", "true", "1")
    t["verses"] = verses
    return t


def build_granth(folder, core):
    where = str(folder.relative_to(ROOT))
    idx = folder / "index.txt"
    if not idx.exists():
        err(where, "missing index.txt")
        return None
    head, _ = parse_file(idx)
    g = meta(f"{where}/index.txt", head, core)
    chapters = {}
    rows = head.get("chapter", [])
    for row in rows if isinstance(rows, list) else [rows]:
        p = [x.strip() for x in row.split("|")]
        if len(p) != 5 or not p[0].isdigit() or not p[4].isdigit():
            err(f"{where}/index.txt", f"chapter line must be 'number | Devanagari | Roman | English | verse count': {row[:50]}")
            continue
        chapters[int(p[0])] = {"n": int(p[0]), "d": p[1], "r": p[2], "en": p[3], "count": int(p[4])}
    for f in sorted(folder.glob("*.txt")):
        if f.name == "index.txt":
            continue
        fw = str(f.relative_to(ROOT))
        h, blocks = parse_file(f)
        try:
            n = int(h.get("chapter", f.stem))
        except ValueError:
            err(fw, "chapter header must be a number")
            continue
        if n not in chapters:
            err(fw, f"chapter {n} is not listed in index.txt")
            continue
        verses, k = [], 0
        for b in blocks:
            if b["label"]:
                verses.append(clean_block(fw, b, b["label"]))
            else:
                k += 1
                verses.append(clean_block(fw, b, f"{n}.{k}".translate(DIGITS)))
        if k != chapters[n]["count"]:
            err(fw, f"has {k} numbered verses but index.txt says {chapters[n]['count']}")
        chapters[n]["verses"] = verses
        if h.get("intro"):
            chapters[n]["intro"] = h["intro"]
    g["chapters"] = [chapters[k] for k in sorted(chapters)]
    return g


def main():
    check_only = "--check" in sys.argv
    core = json.loads((CONTENT / "core.json").read_text(encoding="utf-8"))
    texts = []
    for path in sorted(CONTENT.glob("*/*.txt")):
        if path.parent.name != "granth":
            texts.append(build_text(path, core))
    for folder in sorted((CONTENT / "granth").glob("*/")):
        g = build_granth(folder, core)
        if g:
            texts.append(g)
    ids = [t["id"] for t in texts]
    for i in sorted({i for i in ids if ids.count(i) > 1}):
        err("content", f"duplicate id '{i}'")
    known = set(ids)
    for w in core["weekdays"]:
        for i in w["ids"]:
            if i not in known:
                err("core.json weekdays", f"unknown text id '{i}'")
    for p in core["presets"]:
        for i in p["ids"]:
            if i not in known:
                err(f"core.json preset '{p['n']}'", f"unknown text id '{i}'")
    for w in warnings:
        print("warning:", w)
    for e in errors:
        print("ERROR:", e)
    kinds = {}
    for t in texts:
        kinds[t["kind"]] = kinds.get(t["kind"], 0) + 1
    print(f"{len(texts)} texts: " + ", ".join(f"{v} {k}" for k, v in sorted(kinds.items())))
    if errors:
        print(f"{len(errors)} error(s); nothing written.")
        sys.exit(1)
    if check_only:
        return
    data = dict(core)
    data["texts"] = texts
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(
        "/* Generated by tools/build.py from the files in content/. Edit those, not this. */\n"
        "window.AARTI_DATA = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    print(f"Wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
