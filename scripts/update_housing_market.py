#!/usr/bin/env python3
"""Build data/housing_market.js — house prices and sales.

Usage:
  python3 scripts/update_housing_market.py [NSI .xlsx files ...] [--offline]

* NSI tables (ИЦЖ = house price index, ППЖ = housing sales indicators) are recognised by their
  title, so any number of them can be passed in any order. Periods are MERGED into the existing
  data file, so exporting only the latest quarter each time still builds up a history.
* The long national house price index (2015 = 100, since 2015) is fetched from Eurostat
  (prc_hpi_q) unless --offline is given.
Standard library only.
"""
import json
import re
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from datetime import date
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "data" / "housing_market.js"
M = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
ROMAN = {"I": 1, "II": 2, "III": 3, "IV": 4}
TYPES = {"1": "total", "1.1": "new", "1.2": "existing"}


# ── xlsx ──────────────────────────────────────────────────────
def read_xlsx(path):
    z = zipfile.ZipFile(path)
    strings = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")).iter(M + "si"):
            strings.append("".join(t.text or "" for t in si.iter(M + "t")))
    sheet = sorted(n for n in z.namelist() if re.match(r"xl/worksheets/sheet\d+\.xml", n))[0]
    rows = []
    for r in ET.fromstring(z.read(sheet)).iter(M + "row"):
        row = {}
        for c in r.iter(M + "c"):
            idx = 0
            for ch in re.match(r"[A-Z]+", c.get("r")).group():
                idx = idx * 26 + ord(ch) - 64
            v, t = c.find(M + "v"), c.get("t")
            if t == "inlineStr":
                val = "".join(x.text or "" for x in c.iter(M + "t"))
            elif v is None:
                continue
            elif t == "s":
                val = strings[int(v.text)]
            elif t == "str":
                val = v.text
            else:
                val = float(v.text)
            row[idx - 1] = val
        if row:
            rows.append([row.get(i) for i in range(max(row) + 1)])
    return rows


def clean(s):
    return re.sub(r"\s+", " ", str(s or "")).strip()


# ── NSI table parsing ─────────────────────────────────────────
def classify(title):
    t = clean(title)
    measure = "hpi" if t.startswith("ИЦЖ") else "sales_value" if "стойността" in t else "sales_count" if "броя" in t else None
    level = "cities" if "шестте града" in t else "regions" if "райони" in t else "national" if "национално" in t else None
    base = ("yoy" if "съответното тримесечие" in t else "qoq" if "предходното тримесечие" in t
            else "share" if "дял на тримесечието" in t else None)
    m = re.search(r"(20\d\d)\s*=\s*100", t)
    if m and not base:
        base = "idx" + m.group(1)
    if not (measure and level and base):
        raise ValueError(f"Unrecognised NSI table: {t[:120]}")
    return f"{measure}.{level}.{base}"


def parse_nsi(path):
    rows = read_xlsx(path)
    key = classify(rows[0][0])
    head = next(i for i, r in enumerate(rows) if any(isinstance(x, (int, float)) and 2000 < x < 2100 for x in r))
    years, quarters = rows[head], rows[head + 1]
    first = next(i for i, x in enumerate(years) if isinstance(x, (int, float)) and 2000 < x < 2100)
    periods, year = {}, None
    for i in range(first, max(len(years), len(quarters))):
        y = years[i] if i < len(years) else None
        if isinstance(y, (int, float)):
            year = int(y)
        q = clean(quarters[i] if i < len(quarters) else "")
        m = re.match(r"(I{1,3}|IV)\s+тримесечие", q)
        if year and m:
            periods[i] = f"{year}-Q{ROMAN[m.group(1)]}"

    level = key.split(".")[1]
    code_col = 1 if level == "cities" else 0
    out, typ, entity = {}, None, "Общо за страната" if level == "national" else None
    for r in rows[head + 2:]:
        code = clean(r[code_col] if len(r) > code_col else "")
        m = re.match(r"[A-Z]\.(1(?:\.\d)?)\.$", code)
        if m:
            typ = TYPES.get(m.group(1))
        elif level != "regions" or not typ:
            continue  # footnotes etc.; region rows below the first one carry no code
        if level == "cities" and clean(r[0]):
            entity = clean(r[0])
        if level == "regions":
            entity = clean(r[2] if len(r) > 2 else "")
            if not entity:
                continue
        for col, period in periods.items():
            v = r[col] if col < len(r) else None
            val = round(float(v), 2) if isinstance(v, (int, float)) else None
            out.setdefault(entity, {}).setdefault(typ, {})[period] = val
    return key, out


def merge(dst, src):
    for entity, types in src.items():
        for typ, series in types.items():
            dst.setdefault(entity, {}).setdefault(typ, {}).update(series)
            dst[entity][typ] = dict(sorted(dst[entity][typ].items()))


# ── Eurostat ──────────────────────────────────────────────────
def eurostat_hpi():
    q = [("geo", "BG"), ("unit", "I15_Q"), ("lang", "EN"), ("sinceTimePeriod", "2015-Q1")]
    q += [("purchase", p) for p in ("TOTAL", "DW_NEW", "DW_EXST")]
    url = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hpi_q?" + urllib.parse.urlencode(q)
    with urllib.request.urlopen(url, timeout=60) as r:
        d = json.load(r)
    times = {i: t for t, i in d["dimension"]["time"]["category"]["index"].items()}
    purch = d["dimension"]["purchase"]["category"]["index"]
    n = len(times)
    names = {"TOTAL": "total", "DW_NEW": "new", "DW_EXST": "existing"}
    return {names[p]: {times[i]: d["value"][str(pi * n + i)] for i in range(n) if str(pi * n + i) in d["value"]}
            for p, pi in purch.items()}


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    data = {"nsi": {}, "eurostat_hpi": None}
    if OUT.exists():
        text = OUT.read_text(encoding="utf-8")
        data = json.loads(text[text.index("{"):text.rstrip().rstrip(";").rindex("}") + 1])
    for path in args:
        key, table = parse_nsi(path)
        merge(data["nsi"].setdefault(key, {}), table)
        print(f"  {key}: {', '.join(sorted({p for t in table.values() for s in t.values() for p in s}))}")
    if "--offline" not in sys.argv:
        data["eurostat_hpi"] = {"base": "2015=100", "fetched": date.today().isoformat(), "series": eurostat_hpi()}
    OUT.write_text(
        "// Generated by scripts/update_housing_market.py — do not edit by hand.\n"
        "// nsi[measure.level.base][entity][total|new|existing][YYYY-Qn]; yoy/qoq = % change, idxYYYY = index.\n"
        "window.HOUSING_MARKET = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
