#!/usr/bin/env python3
"""Build data/vehicles.js from the Ministry of Interior (МВР) open-data export.

Usage:  python3 scripts/update_mvr.py <export.zip | folder with the CSV files> [--date YYYY-MM-DD]

The export is the "Регистрирани ППС" dataset on data.egov.bg (zip with ~22 CSV files).
Used files:
   4-...-po-kategoriya-marka-vzrast-i-oblast   categories, brands, age, cars per region
   5-...-po-kategoriya-eko-kategoriya-i-energien-iztochnik   fuel and Euro class of cars
   7-...-po-kategoriya-i-vzrast               first registrations this year by vehicle age
  20-...-po-oblasti-i-vid-gorivo               first registrations this year per region (new/used, electric, hybrid)
"""
import argparse
import csv
import io
import json
import re
import zipfile
from collections import Counter, defaultdict
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "data" / "vehicles.js"
REGION = {"СОФИЯ-ГРАД": "СОФИЯ", "СОФИЯ-ОКРЪГ": "СОФИЙСКА"}
REGIONS = {
    "БЛАГОЕВГРАД", "БУРГАС", "ВАРНА", "ВЕЛИКО ТЪРНОВО", "ВИДИН", "ВРАЦА", "ГАБРОВО", "ДОБРИЧ",
    "КЪРДЖАЛИ", "КЮСТЕНДИЛ", "ЛОВЕЧ", "МОНТАНА", "ПАЗАРДЖИК", "ПЕРНИК", "ПЛЕВЕН", "ПЛОВДИВ",
    "РАЗГРАД", "РУСЕ", "СИЛИСТРА", "СЛИВЕН", "СМОЛЯН", "СОФИЙСКА", "СОФИЯ", "СТАРА ЗАГОРА",
    "ТЪРГОВИЩЕ", "ХАСКОВО", "ШУМЕН", "ЯМБОЛ",
}
AGE_COLS = ["0-5 год.", "6-10 год.", "11-15 год.", "15-20 год.", "над 20 год."]

# vehicle category groups: id, bg, en, matcher
CATEGORIES = [
    ("M1", "Леки автомобили", "Passenger cars", lambda c: c == "M1"),
    ("N1", "Лекотоварни до 3,5 т", "Vans up to 3.5 t", lambda c: c == "N1"),
    ("N2", "Камиони 3,5–12 т", "Trucks 3.5–12 t", lambda c: c == "N2"),
    ("N3", "Тежкотоварни над 12 т", "Heavy trucks over 12 t", lambda c: c == "N3"),
    ("M2", "Микробуси", "Minibuses", lambda c: c == "M2"),
    ("M3", "Автобуси", "Buses", lambda c: c == "M3"),
    ("L3", "Мотоциклети", "Motorcycles", lambda c: c.startswith("L3")),
    ("L1", "Мопеди", "Mopeds", lambda c: c.startswith("L1")),
    ("O", "Ремаркета", "Trailers", lambda c: c.startswith("O")),
    ("T", "Трактори", "Tractors", lambda c: c == "T"),
]

FUEL_GROUPS = [  # id, bg, en, matcher on the fuel string
    ("diesel", "Дизел", "Diesel", lambda f: f in ("ДИЗЕЛ", "ДИЗЕЛ/БИОДИЗЕЛ")),
    ("petrol", "Бензин", "Petrol", lambda f: f == "БЕНЗИН"),
    ("lpg", "Бензин и газ", "Petrol + LPG/CNG", lambda f: "ГАЗ" in f and "ЕЛЕКТРИЧЕСТВО" not in f),
    ("hybrid", "Хибрид", "Hybrid", lambda f: "ЕЛЕКТРИЧЕСТВО" in f and "ВОДОРОД" not in f),
    ("electric", "Електрически", "Electric", lambda f: f == "ЕЛЕКТРОДВИГАТЕЛ"),
]
EURO_GROUPS = [
    ("euro6", "Евро 6 и 7", "Euro 6–7", lambda e: re.match(r"ЕВРО (6|7|VI)", e)),
    ("euro5", "Евро 5", "Euro 5", lambda e: re.match(r"ЕВРО (5|V\b|V )", e)),
    ("euro4", "Евро 4", "Euro 4", lambda e: re.match(r"ЕВРО (4|IV)", e)),
    ("euro3", "Евро 3 и по-ниска", "Euro 3 or lower", lambda e: re.match(r"ЕВРО (0|1|2|3|I|II|III)\b", e)),
]


def open_csvs(src):
    src = Path(src)
    if src.is_dir():
        files = {p.name: p.read_bytes() for p in src.glob("*.csv")}
    else:
        with zipfile.ZipFile(src) as z:
            files = {Path(n).name: z.read(n) for n in z.namelist() if n.endswith(".csv")}

    def get(prefix):
        name = next(n for n in files if n.startswith(prefix + "-"))
        return csv.DictReader(io.StringIO(files[name].decode("utf-8-sig")))
    return get


def region(name):
    r = REGION.get(name, name)
    return r if r in REGIONS else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source")
    ap.add_argument("--date", required=True, help="reference date of the export, e.g. 2026-11-01")
    a = ap.parse_args()
    get = open_csvs(a.source)

    cats = {c[0]: [0] * 6 for c in CATEGORIES}  # 5 age groups + total
    brands = defaultdict(lambda: [0] * 6)
    reg = {r: {"cars": 0, "cars_age": [0] * 5} for r in REGIONS}
    for row in get("4"):
        c = row["КАГЕТОРИЯ"]
        if c == "ОБЩО":
            continue
        vals = [int(row[k]) for k in AGE_COLS] + [int(row["ВСИЧКО"])]
        for cid, *_ , match in CATEGORIES:
            if match(c):
                cats[cid] = [x + y for x, y in zip(cats[cid], vals)]
        if c == "M1":
            brands[row["МАРКА"]] = [x + y for x, y in zip(brands[row["МАРКА"]], vals)]
            r = region(row["РЕГИОН"])
            if r:
                reg[r]["cars"] += vals[5]
                reg[r]["cars_age"] = [x + y for x, y in zip(reg[r]["cars_age"], vals[:5])]

    fuel, euro = Counter(), Counter()
    for row in get("5"):
        if row["КАТЕГОРИЯ"] != "M1":
            continue
        n = int(row["БРОЙ"])
        f = next((g[0] for g in FUEL_GROUPS if g[3](row["ВИД ГОРИВО"])), "other")
        e = next((g[0] for g in EURO_GROUPS if g[3](row["ЕКО КАТЕГОРИЯ"])), "unknown")
        fuel[f] += n
        euro[e] += n

    first_age, year = Counter(), None
    for row in get("7"):
        if row["ГОДИНА"].isdigit():
            year = row["ГОДИНА"]
            first_age[row["ВЪЗРАСТ"]] += int(row["БРОЙ"])
    age_order = ["до 6 мес.", "над 6 мес. до 5 год.", "над 5 год. до 10 год.", "над 10 год."]

    for r in reg.values():
        r.update(electric=0, hybrid=0, new=0, all=0)
    for row in get("20"):  # first registrations during the current year
        r = region(row["РЕГИОН"])
        if not r:
            continue
        g = lambda k: int(row.get(k + "-нови", 0) or 0) + int(row.get(k + "-употр.", 0) or 0)
        reg[r]["electric"] += g("ЕЛЕКТРОДВИГАТЕЛ")
        reg[r]["hybrid"] += sum(g(k[:-5]) for k in row if k.endswith("-нови") and "ЕЛЕКТРИЧЕСТВО" in k and "ВОДОРОД" not in k)
        reg[r]["new"] += int(row["общо-нови"])
        reg[r]["all"] += int(row["общо-нови"]) + int(row["общо-употр."])

    top = sorted(brands.items(), key=lambda kv: -kv[1][5])[:35]

    # keep the previously published snapshot so the site can show the change
    previous = None
    if OUT.exists():
        text = OUT.read_text(encoding="utf-8")
        old = json.loads(text[text.index("{"):text.rstrip().rstrip(";").rindex("}") + 1])
        if old.get("date") == a.date:
            previous = old.get("previous")
        else:
            previous = {
                "date": old["date"],
                "categories": {c["id"]: c["total"] for c in old["categories"]},
                "m1_age": next(c["age"] for c in old["categories"] if c["id"] == "M1"),
                "brands": {b["name"]: b["total"] for b in old["brands"]},
                "regions": {k: r["cars"] for k, r in old["regions"].items()},
            }
    payload = {
        "date": a.date,
        "categories": [{"id": c[0], "bg": c[1], "en": c[2], "total": cats[c[0]][5], "age": cats[c[0]][:5]} for c in CATEGORIES],
        "brands": [{"name": n, "total": v[5], "age": v[:5]} for n, v in top],
        "fuel": [{"id": g[0], "bg": g[1], "en": g[2], "n": fuel[g[0]]} for g in FUEL_GROUPS]
                + [{"id": "other", "bg": "Друго", "en": "Other", "n": fuel["other"]}],
        "euro": [{"id": g[0], "bg": g[1], "en": g[2], "n": euro[g[0]]} for g in EURO_GROUPS]
                + [{"id": "unknown", "bg": "Без данни", "en": "No data", "n": euro["unknown"]}],
        "first_reg": {"year": year, "age": [first_age[k] for k in age_order]},
        "regions": reg,
        "previous": previous,
    }
    OUT.write_text(
        "// Generated by scripts/update_mvr.py from the МВР open-data export — do not edit by hand.\n"
        "// age = [0–5, 6–10, 11–15, 16–20, 20+ years]; regions.*: cars = M1, electric/hybrid/new/all = all vehicle types\n"
        "window.VEHICLES = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    print(f"Wrote {OUT}: M1={cats['M1'][5]:,}, regions={sum(r['cars'] for r in reg.values()):,}")


if __name__ == "__main__":
    main()
