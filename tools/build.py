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
            cur = {"label": line[3:].strip(), "d": [], "r": [], "m": [], "h": [], "sp": None, "line": no}
            blocks.append(cur)
        elif not line.strip():
            continue
        elif line.startswith("~ ") or line == "~":
            cur["r"].append(line[2:].strip())
        elif line.startswith("= ") or line == "=":
            cur["m"].append(line[2:].strip())
        elif line.startswith("+ ") or line == "+":
            cur["h"].append(line[2:].strip())
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
    if not b["h"]:
        warn(w, "has no Hindi meaning (add a line starting with '+ ')")
    for l in b["h"]:
        if not DEVA.search(l):
            err(w, f"Hindi meaning without Devanagari: {l[:40]!r}")
    out = {"d": "\n".join(b["d"]), "r": "\n".join(b["r"])}
    if b["m"]:
        out["m"] = " ".join(b["m"])
    if b["h"]:
        out["h"] = " ".join(b["h"])
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
    if head.get("keywords"):
        m["kw"] = [k.strip() for k in head["keywords"].split(",") if k.strip()]
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
        if len(p) not in (5, 6) or not p[0].isdigit() or not p[4].isdigit():
            err(f"{where}/index.txt", f"chapter line must be 'number | Devanagari | Roman | English | verse count', optionally followed by '| summary': {row[:50]}")
            continue
        chapters[int(p[0])] = {"n": int(p[0]), "d": p[1], "r": p[2], "en": p[3], "count": int(p[4])}
        if len(p) == 6 and p[5]:
            chapters[int(p[0])]["sum"] = p[5]
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
        # Numbering: verses count up from `from:` (default 1). With `numbering: print` in index.txt,
        # a speaker line takes a number of its own, as in printed editions of the Durga Saptashati.
        # `--- span 3` makes one block cover three numbers (a refrain-like line recited three times).
        print_nums = str(head.get("numbering", "")).lower() == "print"
        try:
            first = int(h.get("from", 1))
            last = int(h.get("to", chapters[n]["count"]))
        except ValueError:
            err(fw, "from and to must be numbers")
            continue
        verses, k = [], first - 1
        for b in blocks:
            span = re.fullmatch(r"span (\d+)", b["label"])
            if b["label"] and not span:
                verses.append(clean_block(fw, b, b["label"]))
                continue
            if print_nums and b["sp"]:
                k += 1
                b["sp"]["no"] = k
            width = int(span.group(1)) if span else 1
            lab = f"{n}.{k + 1}" if width == 1 else f"{n}.{k + 1}–{k + width}"
            k += width
            verses.append(clean_block(fw, b, lab.translate(DIGITS)))
        if k != last:
            err(fw, f"numbered verses end at {k} but should end at {last}")
        if first != 1 or last != chapters[n]["count"]:
            chapters[n]["part"] = {"from": first, "to": last}
            if not h.get("excerpt"):
                err(fw, "a partial chapter needs an 'excerpt:' line saying what it holds")
        chapters[n]["verses"] = verses
        for opt in ("intro", "excerpt"):
            if h.get(opt):
                chapters[n][opt] = h[opt]
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
    nav = core.get("navratri")
    if nav:
        by_id = {t["id"]: t for t in texts}
        if nav.get("occ") not in core["occasions"]:
            err("core.json navratri", f"unknown occasion '{nav.get('occ')}'")
        if [d["n"] for d in nav["days"]] != list(range(1, 10)):
            err("core.json navratri", "days must be numbered 1 to 9 in order")
        for d in nav["days"]:
            for r in d.get("read", []):
                t = by_id.get(r["id"])
                where = f"core.json navratri day {d['n']}"
                if not t:
                    err(where, f"unknown text id '{r['id']}'")
                elif "ch" in r:
                    ch = next((c for c in t.get("chapters", []) if c["n"] == r["ch"]), None)
                    if not ch or not ch.get("verses"):
                        err(where, f"'{r['id']}' has no readable chapter {r['ch']}")
                    elif r.get("at") and not any(v.get("n") == r["at"] for v in ch["verses"]):
                        err(where, f"no verse {r['at']} in '{r['id']}' chapter {r['ch']}")
                elif r.get("v") is not None and not 0 <= r["v"] < len(t.get("verses", [])):
                    err(where, f"'{r['id']}' has no verse index {r['v']}")
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
