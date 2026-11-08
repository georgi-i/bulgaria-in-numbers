# Bulgaria in Numbers

Population, economy, vehicles and housing across Bulgaria's 28 regions — an interactive map and dashboard in Bulgarian and English.

**Live:** https://georgi-i.github.io/bulgaria-in-numbers

## What's inside

- Interactive map — pick an indicator, click a region for a summary
- Sortable, searchable table of all regions
- Registered vs. actual population
- Internal and international migration
- Vehicles by category, brand and age
- Housing by rooms, urban/rural split and per resident
- Insights computed directly from the data
- Light and dark mode, mobile friendly

## Data

| Dataset | Source | As of |
|---|---|---|
| Population by permanent and current address, by municipality and settlement | [GRAO](https://www.grao.bg/tables.html) | 15 Oct 2026 |
| Registered vehicles, fuel, emission class, first registrations | [Ministry of Interior / data.egov.bg](https://data.egov.bg) | Nov 2026 |
| Internal and international migration | [NSI](https://www.nsi.bg) | 2025 |
| Housing stock | [NSI](https://www.nsi.bg/statistical-data/244/786) | 31 Dec 2024 |
| Population, age, birth/death rates, migration, GDP, area | [Eurostat](https://ec.europa.eu/eurostat/web/regions/database) | 2024–2025 |
| Region boundaries | [geoBoundaries](https://www.geoboundaries.org) (CC BY 4.0) | — |

Per-resident figures use Eurostat's estimate of the actual population (~6.4M), not the ~8.2M registered at a permanent address.

## Structure

```
index.html          page markup
assets/style.css    styles
assets/app.js       logic
data/               data files (plain JS, loaded with <script>)
scripts/            update scripts
```

## Updating data

All scripts need only Python 3.

```bash
# Population (GRAO) — municipalities table, optionally settlements table; URLs from grao.bg/tables.html
python3 scripts/update_grao.py https://www.grao.bg/tna/t41ob-15-10-2026_1.txt https://www.grao.bg/tna/t41nm-15-09-2026_2.txt

# Vehicles (МВР) — the zip export from data.egov.bg and its reference date
python3 scripts/update_mvr.py path/to/export_csv.zip --date 2026-11-01

# Migration (NSI) — the two .xlsx tables: internal migration by sex, external migration by age and citizenship
python3 scripts/update_migration.py internal.xlsx external.xlsx

# Eurostat indicators and map boundaries
python3 scripts/update_eurostat.py
python3 scripts/build_map.py
```

Housing (NSI, published yearly) is edited by hand in `data/regions.js`.

## Run locally

Open `index.html` in a browser, or:

```bash
python3 -m http.server
```

## License

Code: MIT. Data belongs to the respective institutions (GRAO, Ministry of Interior, NSI, Eurostat) and is published as open data.
