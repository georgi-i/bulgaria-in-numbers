# 🇧🇬 Bulgaria in Numbers

An interactive, single-page data dashboard exploring population, registered vehicles and housing stock across all 28 regions of Bulgaria.

**Live site:** [bulgaria-in-numbers](https://georgi-i.github.io/bulgaria-in-numbers)

---

## Features

- **Regional overview** — cards for all 28 Bulgarian regions with population (permanent & current address), passenger cars and total dwellings
- **Expandable detail panels** — per-region breakdown including housing stock by room count, address-registration gap and key ratios
- **Housing details** — national overview, regional comparison (urban vs rural) and room structure across all regions
- **Vehicle details** — registered vehicles by category, top brands (passenger cars, cat. M1) with age breakdown, and fleet age structure
- **Comparative analysis** — horizontal bar charts for cars per 100 people, cars per dwelling, dwellings per person, and population figures
- **Key conclusions** — data-driven insights on motorisation, internal migration, housing surplus and Sofia's monocentric concentration
- **Bilingual** — full Bulgarian / English toggle
- **Mobile-friendly** — responsive layout with hamburger navigation
- **GitHub Pages ready** — single self-contained `index.html`, no build step required

---

## Data Sources

| Dataset | Source | Last updated |
|---|---|---|
| Population by settlement (permanent & current address) | [data.egov.bg](https://data.egov.bg/data/resourceView/1bf60558-c3f0-49a3-9993-a7f0ada5d20b) — NSI / МВР | 15 Jan 2026 |
| Registered vehicles by category, brand, age and region | [data.egov.bg](https://data.egov.bg/data/resourceView/43f82d8d-6374-45bb-a5e8-26a685962730) — МВР | 01 Mar 2026 |
| Dwellings by number of rooms | [NSI — nsi.bg](https://www.nsi.bg/statistical-data/244/786) | 31 Dec 2024 |

All three datasets are open government data published under Bulgarian open data legislation.

> **Note on population figures:** The permanent address total (~8.09M) is an administrative registration figure. Many Bulgarian emigrants abroad retain their permanent address in Bulgaria. NSI estimates the actual resident population at approximately 6.4–6.5M. The current address figure (~7.30M) is closer to reality but also includes outdated records.

---

## Tech stack

- Vanilla HTML, CSS and JavaScript — no frameworks, no dependencies
- All data is embedded directly in the HTML file as JSON constants
- Fonts served from Google Fonts (Inter)
- Fully functional offline once loaded

---

## Deploy to GitHub Pages

1. Fork or clone this repository
2. Go to **Settings → Pages**
3. Set source to the `main` branch, root folder (`/`)
4. GitHub Pages will serve `index.html` automatically

The site will be available at `https://georgi-i.github.io/bulgaria-in-numbers`

---

## Project structure

```
bulgaria-in-numbers/
└── index.html      # The entire application — data, styles and logic
└── README.md       # This file
```

---

## License

Data is © the respective Bulgarian state institutions (NSI, МВР) and published as open data.  
The visualisation code is released under the [MIT License](https://opensource.org/licenses/MIT).

---

*Built with [Claude Sonnet 4.6](https://www.anthropic.com/claude) by Anthropic.*
