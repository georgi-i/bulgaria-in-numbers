/* Bulgaria in Numbers — app logic. Data comes from /data/*.js (window globals). */
(() => {
'use strict';

const E = window.EUROSTAT, MAP = window.BG_MAP, P = window.POPULATION, V = window.VEHICLES;
const $ = (s) => document.querySelector(s);
const el = (tag, attrs = {}, html = '') => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (html) n.innerHTML = html;
  return n;
};
const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ── state ─────────────────────────────────────────────── */
let lang = 'bg';
try { if (localStorage.getItem('lang') === 'en') lang = 'en'; } catch (_) {}
const state = { metric: 'pop', selected: null, sort: { key: 'pop', dir: -1 }, query: '', veh: 'cat', brandSort: 'total', hou: 'rooms' };

/* ── i18n ──────────────────────────────────────────────── */
const T = {
  bg: {
    brand: 'България в числа', nav_map: 'Карта', nav_regions: 'Области', nav_population: 'Население',
    nav_vehicles: 'Автомобили', nav_migration: 'Миграция', mig_title: 'Миграция', nav_housing: 'Жилища', nav_insights: 'Изводи',
    hero_eyebrow: '28 области · данни 2024–2026', hero_title: 'България в числа',
    hero_lead: 'Население, икономика, автомобили и жилища — по области.',
    map_title: 'Карта', map_sub: 'Изберете показател и кликнете върху област.',
    regions_title: 'Всички области', search: 'Търси област',
    pop_title: 'Регистрирани и реални жители',
    pop_sub: 'Постоянен адрес (ГРАО) спрямо оценката на Евростат за реално живеещите.',
    lg_real: 'Реално население', lg_registered: 'Постоянен адрес',
    veh_title: 'Автомобили', hou_title: 'Жилища', ins_title: 'Изводи',
    kpi_pop: 'реално население', kpi_perm: 'с постоянен адрес', kpi_cars: 'леки автомобили', kpi_housing: 'жилища',
    bulgaria: 'България', country: 'Цялата страна', region: 'Област', municipalities: 'общини', km2: 'км²',
    rank: 'място', of: 'от', since: 'от', back: 'Покажи цялата страна',
    g_people: 'Население', g_demo: 'Демография', g_econ: 'Икономика и бит',
    r_pop: 'Реално население', r_perm: 'Постоянен адрес', r_curr: 'Настоящ адрес', r_density: 'Гъстота',
    r_age: 'Медианна възраст', r_014: 'Под 15 г.', r_65: 'Над 65 г.', r_birth: 'Раждаемост', r_death: 'Смъртност',
    r_natural: 'Естествен прираст', r_migr: 'Нетна миграция', r_gdp: 'БВП на човек', r_cars: 'Леки автомобили',
    r_cars100: 'Коли на 100 жители', r_housing: 'Жилища', r_urban: 'Жилища в градовете', r_dwell: 'Жилища на 100 жители',
    years: 'г.', per_km2: '/км²', permille: '‰',
    m_pop: 'Население', m_density: 'Гъстота', m_gdp: 'БВП на човек', m_age: 'Медианна възраст', m_old: 'Над 65 г.',
    m_natural: 'Естествен прираст', m_migr: 'Миграция', m_cars: 'Коли / 100 ж.', m_dwell: 'Жилища / 100 ж.', m_gap: 'Регистрирани в повече',
    t_region: 'Област', t_pop: 'Население', t_curr: 'Наст. адрес', t_perm: 'Пост. адрес', t_density: 'Гъстота', t_gdp: 'БВП / човек',
    t_age: 'Мед. възраст', t_cars: 'Коли / 100', t_housing: 'Жилища',
    v_cat: 'Категории', v_brands: 'Марки', v_age: 'Възраст',
    b_total: 'Брой', b_new: 'Дял до 5 г.', b_old: 'Дял над 20 г.', sort_by: 'Подреди по',
    cat_note: 'Регистрирани превозни средства по категория.',
    brand_note: 'Леки автомобили (кат. M1) по марка — топ 30.',
    ages: ['до 5 г.', '6–10 г.', '11–15 г.', '16–20 г.', 'над 20 г.'],
    age_head: 'Леки автомобили по възраст', age_cat: 'Дял на превозните средства над 20 години',
    h_rooms: 'Стаи', h_urban: 'Град и село', h_per: 'На жител',
    rooms: ['1 стая', '2 стаи', '3 стаи', '4 стаи', '5 стаи', '6+ стаи'],
    h_total: 'жилища общо', h_urbsh: 'в градовете', h_avg: 'на 100 жители',
    h_urban_note: 'Дял на жилищата в градовете.', h_per_note: 'Жилища на 100 реални жители (Евростат).',
    h_rooms_note: 'Жилищен фонд по брой стаи, НСИ, 31.12.2024.',
    gap_note: 'Разликата идва основно от емигранти, които не са сменили адреса си. Стойността вдясно показва колко повече хора са регистрирани спрямо реално живеещите.',
    src: 'Източници', updated: 'Евростат — изтеглено',
    settlements: 'населени места', g_towns: 'Най-големи градове (настоящ адрес)',
    r_empty: 'Села без жители', r_under50: 'Села под 50 жители',
    r_old20: 'Коли над 20 г.', r_reg: 'Нови регистрации (2026)', r_regnew: 'От тях нови МПС', r_regev: 'От тях електрически',
    m_old20: 'Коли над 20 г.', m_ev: 'Електрически (нови рег.)',
    v_fuel: 'Гориво', v_reg: 'Регистрации', mvr: 'МВР',
    fuel_head: 'Леки автомобили по вид гориво', euro_head: 'Леки автомобили по екологична категория',
    fuel_note: 'Дизел, бензин, газ, хибрид и ток — по данни от талоните.',
    reg_head: 'Първоначални регистрации по възраст на превозното средство,', reg_ev: 'Дял на електрическите сред новите регистрации',
    reg_ages: ['до 6 месеца', '6 мес. – 5 г.', '5–10 г.', 'над 10 г.'],
    reg_note: 'Всички превозни средства, регистрирани за първи път в България от началото на годината.',
    since_prev: 'от март', r_growth: 'Промяна на колите от март', m_growth: 'Ръст на колите',
    b_growth: 'Ръст', delta_note: 'Вдясно — промяна спрямо',
  },
  en: {
    brand: 'Bulgaria in Numbers', nav_map: 'Map', nav_regions: 'Regions', nav_population: 'Population',
    nav_vehicles: 'Vehicles', nav_migration: 'Migration', mig_title: 'Migration', nav_housing: 'Housing', nav_insights: 'Insights',
    hero_eyebrow: '28 regions · data 2024–2026', hero_title: 'Bulgaria in Numbers',
    hero_lead: 'Population, economy, vehicles and housing — region by region.',
    map_title: 'Map', map_sub: 'Pick an indicator and click a region.',
    regions_title: 'All regions', search: 'Search region',
    pop_title: 'Registered vs. actual residents',
    pop_sub: 'Permanent address registrations compared with Eurostat’s estimate of people actually living there.',
    lg_real: 'Actual population', lg_registered: 'Permanent address',
    veh_title: 'Vehicles', hou_title: 'Housing', ins_title: 'Insights',
    kpi_pop: 'actual population', kpi_perm: 'registered residents', kpi_cars: 'passenger cars', kpi_housing: 'dwellings',
    bulgaria: 'Bulgaria', country: 'Whole country', region: 'Region', municipalities: 'municipalities', km2: 'km²',
    rank: 'rank', of: 'of', since: 'since', back: 'Show whole country',
    g_people: 'People', g_demo: 'Demographics', g_econ: 'Economy & living',
    r_pop: 'Actual population', r_perm: 'Permanent address', r_curr: 'Current address', r_density: 'Density',
    r_age: 'Median age', r_014: 'Under 15', r_65: 'Aged 65+', r_birth: 'Birth rate', r_death: 'Death rate',
    r_natural: 'Natural change', r_migr: 'Net migration', r_gdp: 'GDP per capita', r_cars: 'Passenger cars',
    r_cars100: 'Cars per 100 residents', r_housing: 'Dwellings', r_urban: 'Urban dwellings', r_dwell: 'Dwellings per 100 residents',
    years: 'yrs', per_km2: '/km²', permille: '‰',
    m_pop: 'Population', m_density: 'Density', m_gdp: 'GDP per capita', m_age: 'Median age', m_old: 'Aged 65+',
    m_natural: 'Natural change', m_migr: 'Migration', m_cars: 'Cars / 100', m_dwell: 'Dwellings / 100', m_gap: 'Over-registration',
    t_region: 'Region', t_pop: 'Population', t_curr: 'Current addr.', t_perm: 'Permanent addr.', t_density: 'Density', t_gdp: 'GDP / capita',
    t_age: 'Median age', t_cars: 'Cars / 100', t_housing: 'Dwellings',
    v_cat: 'Categories', v_brands: 'Brands', v_age: 'Age',
    b_total: 'Count', b_new: 'Share ≤5 yrs', b_old: 'Share 20+ yrs', sort_by: 'Sort by',
    cat_note: 'Registered vehicles by category.',
    brand_note: 'Passenger cars (cat. M1) by brand — top 35.',
    ages: ['≤5 yrs', '6–10 yrs', '11–15 yrs', '16–20 yrs', '20+ yrs'],
    age_head: 'Passenger cars by age', age_cat: 'Share of vehicles older than 20 years',
    h_rooms: 'Rooms', h_urban: 'Urban & rural', h_per: 'Per resident',
    rooms: ['1 room', '2 rooms', '3 rooms', '4 rooms', '5 rooms', '6+ rooms'],
    h_total: 'dwellings', h_urbsh: 'urban', h_avg: 'per 100 residents',
    h_urban_note: 'Share of dwellings in towns and cities.', h_per_note: 'Dwellings per 100 actual residents (Eurostat).',
    h_rooms_note: 'Housing stock by number of rooms, NSI, 31 Dec 2024.',
    gap_note: 'The gap comes mostly from emigrants who never changed their registered address. The figure on the right shows how many more people are registered than actually live there.',
    src: 'Sources', updated: 'Eurostat — fetched',
    settlements: 'settlements', g_towns: 'Largest towns (current address)',
    r_empty: 'Villages with no residents', r_under50: 'Villages under 50 residents',
    r_old20: 'Cars older than 20 yrs', r_reg: 'First registrations (2026)', r_regnew: 'of which brand new', r_regev: 'of which electric',
    m_old20: 'Cars 20+ yrs', m_ev: 'Electric (new reg.)',
    v_fuel: 'Fuel', v_reg: 'Registrations', mvr: 'Ministry of Interior',
    fuel_head: 'Passenger cars by fuel', euro_head: 'Passenger cars by emission standard',
    fuel_note: 'Diesel, petrol, gas, hybrid and electric — from registration documents.',
    reg_head: 'First registrations by vehicle age,', reg_ev: 'Electric share of first registrations',
    reg_ages: ['under 6 months', '6 mo – 5 yrs', '5–10 yrs', '10+ yrs'],
    reg_note: 'All vehicles registered in Bulgaria for the first time since the start of the year.',
    since_prev: 'since March', r_growth: 'Change in cars since March', m_growth: 'Car growth',
    b_growth: 'Growth', delta_note: 'Right column — change since',
  },
};
const t = (k) => T[lang][k] ?? k;
const loc = () => (lang === 'bg' ? 'bg-BG' : 'en-GB');

/* ── formatting ────────────────────────────────────────── */
const nf = (d) => new Intl.NumberFormat(loc(), { minimumFractionDigits: d, maximumFractionDigits: d });
const fInt = (n) => nf(0).format(Math.round(n));
const fDec = (n, d = 1) => nf(d).format(n);
const fMil = (n) => fDec(n / 1e6, 2) + (lang === 'bg' ? ' млн.' : 'M');
const fPct = (n, d = 1) => fDec(n, d) + (lang === 'bg' ? ' %' : '%');
const fSigned = (n, d = 1) => (n > 0 ? '+' : n < 0 ? '−' : '') + fDec(Math.abs(n), d);
const fEur = (n) => (lang === 'bg' ? fInt(n) + ' €' : '€' + fInt(n));
const fDelta = (cur, old) => (old ? fSigned((cur / old - 1) * 100, 1) + (lang === 'bg' ? ' %' : '%') : '');
const fCompact = (n) => (n >= 1e6 ? fMil(n) : n >= 1e4 ? fDec(n / 1e3, 0) + (lang === 'bg' ? ' хил.' : 'k') : fInt(n));

/* ── data model ────────────────────────────────────────── */
function build(base, e, g, v) {
  const age = v.cars_age, ageKnown = age.reduce((a, b) => a + b, 0);
  return {
    key: base.key, bg: base.bg, en: base.en, municipalities: g.municipalities.length,
    settlements: g.settlements, towns: g.towns || [], empty: g.empty, under50: g.under_50,
    pop: e.pop, perm: g.permanent, curr: g.current, area: e.area_km2,
    density: e.pop / e.area_km2, gdp: e.gdp_per_capita, age: e.median_age,
    share014: (e.pop_0_14 / e.pop) * 100, share65: (e.pop_65plus / e.pop) * 100,
    birth: e.birth_rate, death: e.death_rate, natural: e.birth_rate - e.death_rate, migr: e.migration_rate,
    cars: v.cars, cars100: (v.cars / e.pop) * 100, old20: (age[4] / ageKnown) * 100,
    carsPrev: v.prev, carsGrowth: v.prev ? (v.cars / v.prev - 1) * 100 : null,
    regAll: v.all, regNew: (v.new / v.all) * 100, regEv: (v.electric / v.all) * 100, regHybrid: (v.hybrid / v.all) * 100,
    housing: base.housing.total, urban: (base.housing.urban / base.housing.total) * 100,
    dwell: (base.housing.total / e.pop) * 100, gap: (g.permanent / e.pop - 1) * 100,
    rooms: base.housing.rooms, history: e.pop_history,
  };
}
const PREV = V.previous;
const REG = window.REGIONS.map((r) => build(r, E.regions[r.key], P.regions[r.key], { ...V.regions[r.key], prev: PREV && PREV.regions[r.key] }));
const BYKEY = Object.fromEntries(REG.map((r) => [r.key, r]));
const H = window.HOUSING_NATIONAL;
const sumObj = (objs, keys) => Object.fromEntries(keys.map((k) => [k, sum(objs, (o) => o[k])]));
const NAT = build(
  { key: null, bg: 'България', en: 'Bulgaria', housing: { total: H.total, urban: H.urban, rural: H.rural, rooms: H.rooms } },
  E.regions._BG,
  { ...sumObj(Object.values(P.regions), ['settlements', 'permanent', 'current', 'empty', 'under_50']),
    municipalities: Object.values(P.regions).flatMap((r) => r.municipalities), towns: [] },
  { ...sumObj(Object.values(V.regions), ['cars', 'electric', 'hybrid', 'new', 'all']),
    cars_age: [0, 1, 2, 3, 4].map((i) => sum(Object.values(V.regions), (r) => r.cars_age[i])),
    prev: PREV && PREV.categories.M1 },
);
const nameOf = (r) => (lang === 'bg' ? r.bg : r.en);

const Y = E.years;
const METRICS = [
  { id: 'pop', v: (r) => r.pop, f: fCompact, year: Y.pop },
  { id: 'density', v: (r) => r.density, f: (v) => fDec(v, 0) + ' ' + t('per_km2'), year: Y.pop },
  { id: 'gdp', v: (r) => r.gdp, f: fEur, year: Y.gdp_per_capita },
  { id: 'age', v: (r) => r.age, f: (v) => fDec(v, 1) + ' ' + t('years'), year: Y.median_age },
  { id: 'old', v: (r) => r.share65, f: (v) => fPct(v), year: Y.pop_65plus },
  { id: 'natural', v: (r) => r.natural, f: (v) => fSigned(v) + ' ‰', year: Y.birth_rate, diverging: true },
  { id: 'migr', v: (r) => r.migr, f: (v) => fSigned(v) + ' ‰', year: Y.migration_rate, diverging: true },
  { id: 'cars', v: (r) => r.cars100, f: (v) => fDec(v, 1) },
  { id: 'old20', v: (r) => r.old20, f: (v) => fPct(v) },
  { id: 'ev', v: (r) => r.regEv, f: (v) => fPct(v), year: V.first_reg.year },
  ...(PREV ? [{ id: 'growth', v: (r) => r.carsGrowth, f: (v) => fSigned(v, 1) + (lang === 'bg' ? ' %' : '%') }] : []),
  { id: 'dwell', v: (r) => r.dwell, f: (v) => fDec(v, 1) },
  { id: 'gap', v: (r) => r.gap, f: (v) => fSigned(v, 0) + (lang === 'bg' ? ' %' : '%') },
];
const metric = () => METRICS.find((m) => m.id === state.metric);

/* ── generic UI ────────────────────────────────────────── */
function segmented(container, items, current, onPick) {
  container.innerHTML = '';
  for (const [id, label] of items) {
    const b = el('button', { type: 'button', role: 'tab', 'aria-selected': String(id === current) }, esc(label));
    b.addEventListener('click', () => onPick(id));
    container.appendChild(b);
  }
}
function barList(items, { max, fmt, active } = {}) {
  const m = max ?? Math.max(...items.map((i) => i.value));
  const extra = items.some((i) => i.extra != null);
  return `<div class="bars${extra ? ' with-extra' : ''}">` + items.map((i) => `
    <div class="bar-row${active && i.key === active ? ' active' : ''}">
      <span class="lbl" title="${esc(i.label)}">${esc(i.label)}</span>
      <span class="track"><span class="fill" style="width:${(Math.max(i.value, 0) / m) * 100}%"></span></span>
      <span class="val">${fmt(i.value)}</span>${extra ? `<span class="val extra">${i.extra ?? ''}</span>` : ''}
    </div>`).join('') + '</div>';
}

/* ── hero KPIs ─────────────────────────────────────────── */
function renderKpis() {
  const k = [
    [fMil(NAT.pop), t('kpi_pop') + ` (${Y.pop})`],
    [fMil(NAT.perm), t('kpi_perm')],
    [fMil(NAT.cars), t('kpi_cars') + (PREV ? ` · ${fDelta(NAT.cars, NAT.carsPrev)} ${t('since_prev')}` : '')],
    [fMil(NAT.housing), t('kpi_housing')],
  ];
  $('#kpis').innerHTML = k.map(([v, l]) => `<div class="kpi"><div class="kpi-val num">${v}</div><div class="kpi-lbl">${esc(l)}</div></div>`).join('');
}

/* ── map ───────────────────────────────────────────────── */
const svg = $('#mapSvg');
svg.setAttribute('viewBox', `0 0 ${MAP.width} ${MAP.height}`);
const SVGNS = 'http://www.w3.org/2000/svg';
const pathEls = {};
for (const r of REG) {
  const p = document.createElementNS(SVGNS, 'path');
  p.setAttribute('d', MAP.paths[r.key]);
  p.setAttribute('tabindex', '0');
  p.setAttribute('role', 'button');
  p.addEventListener('click', () => select(state.selected === r.key ? null : r.key));
  p.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); select(r.key); } });
  p.addEventListener('mousemove', (ev) => showTip(ev, r));
  p.addEventListener('mouseleave', hideTip);
  svg.appendChild(p);
  pathEls[r.key] = p;
}
const tip = $('#tooltip');
function showTip(ev, r) {
  const box = $('.map-card').getBoundingClientRect();
  const m = metric();
  tip.innerHTML = `<b>${esc(nameOf(r))}</b>${esc(t('m_' + m.id))}: ${m.f(m.v(r))}`;
  tip.style.left = ev.clientX - box.left + 'px';
  tip.style.top = ev.clientY - box.top + 'px';
  tip.hidden = false;
}
function hideTip() { tip.hidden = true; }

function renderMap() {
  const m = metric();
  const vals = REG.map(m.v);
  const min = Math.min(...vals), max = Math.max(...vals), absMax = Math.max(...vals.map(Math.abs));
  for (const r of REG) {
    const v = m.v(r), p = pathEls[r.key];
    let tt, color = 'var(--accent)';
    if (m.diverging) { tt = Math.abs(v) / absMax; if (v < 0) color = 'var(--neg)'; }
    else tt = max === min ? 1 : (v - min) / (max - min);
    p.style.fill = color;
    p.style.fillOpacity = (0.12 + 0.83 * Math.sqrt(tt)).toFixed(3);
    p.classList.toggle('selected', r.key === state.selected);
    p.setAttribute('aria-label', `${nameOf(r)}: ${m.f(v)}`);
  }
  if (state.selected) svg.appendChild(pathEls[state.selected]); // draw selected border on top
  const grad = m.diverging
    ? 'linear-gradient(90deg, var(--neg), color-mix(in srgb, var(--neg) 12%, transparent) 50%, var(--accent))'
    : 'linear-gradient(90deg, color-mix(in srgb, var(--accent) 12%, transparent), var(--accent))';
  const lo = m.diverging ? -absMax : min, hi = m.diverging ? absMax : max;
  $('#legend').innerHTML = `<span class="num">${m.f(lo)}</span><span class="legend-bar" style="background:${grad}"></span><span class="num">${m.f(hi)}</span>${m.year ? `<span style="margin-left:auto">${m.year}</span>` : ''}`;
}

function renderMetricPicker() {
  segmented($('#metricPicker'), METRICS.map((m) => [m.id, t('m_' + m.id)]), state.metric, (id) => {
    state.metric = id; renderMetricPicker(); renderMap(); renderPanel();
  });
}

/* ── side panel ────────────────────────────────────────── */
function sparkline(hist) {
  const ys = Object.keys(hist).sort(), vs = ys.map((y) => hist[y]);
  if (vs.length < 2) return '';
  const w = 120, h = 40, lo = Math.min(...vs), hi = Math.max(...vs);
  const pts = vs.map((v, i) => `${((i / (vs.length - 1)) * (w - 4) + 2).toFixed(1)},${(h - 3 - ((v - lo) / (hi - lo || 1)) * (h - 6)).toFixed(1)}`);
  const ch = (vs[vs.length - 1] / vs[0] - 1) * 100;
  return `<div><svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="M${pts.join('L')}"/></svg>
    <div class="spark-note num">${fSigned(ch)}${lang === 'bg' ? ' %' : '%'} ${t('since')} ${ys[0]}</div></div>`;
}
function renderPanel() {
  const r = state.selected ? BYKEY[state.selected] : NAT;
  const m = metric();
  const rows = (list) => list.map(([k, v, hl]) => `<div class="row${hl ? ' hl' : ''}"><span>${esc(t(k))}</span><span>${v}</span></div>`).join('');
  let rank = '';
  if (state.selected) {
    const sorted = [...REG].sort((a, b) => m.v(b) - m.v(a));
    rank = `<span class="num">${t('m_' + m.id)}: ${sorted.findIndex((x) => x.key === r.key) + 1} ${t('of')} 28</span>`;
  }
  const isM = (id) => m.id === id;
  $('#panel').innerHTML = `
    <div class="panel-kicker"><span>${esc(state.selected ? t('region') : t('country'))}</span>${rank}</div>
    <h3>${esc(nameOf(r))}</h3>
    <div class="panel-meta num">${fInt(r.municipalities)} ${t('municipalities')} · ${fInt(r.settlements)} ${t('settlements')} · ${fInt(r.area)} ${t('km2')}</div>
    <div class="panel-hero">
      <div><div class="big num">${fInt(r.pop)}</div><div class="sub">${esc(t('r_pop'))}, ${Y.pop}</div></div>
      ${sparkline(r.history)}
    </div>
    <div class="rows">
      <div class="group-title">${esc(t('g_people'))}</div>
      ${rows([
        ['r_perm', fInt(r.perm)],
        ['r_curr', fInt(r.curr)],
        ['m_gap', fSigned(r.gap, 0) + (lang === 'bg' ? ' %' : '%'), isM('gap')],
        ['r_density', fDec(r.density, 1) + ' ' + t('per_km2'), isM('density')],
        ['r_empty', fInt(r.empty)],
        ['r_under50', fInt(r.under50)],
      ])}
      ${r.towns.length ? `<div class="group-title">${esc(t('g_towns'))}</div>` + rows(r.towns.map((x) => [x.name, fInt(x.current)])) : ''}
      <div class="group-title">${esc(t('g_demo'))}</div>
      ${rows([
        ['r_age', fDec(r.age, 1) + ' ' + t('years'), isM('age')],
        ['r_014', fPct(r.share014)],
        ['r_65', fPct(r.share65), isM('old')],
        ['r_birth', fDec(r.birth) + ' ‰'],
        ['r_death', fDec(r.death) + ' ‰'],
        ['r_natural', fSigned(r.natural) + ' ‰', isM('natural')],
        ['r_migr', fSigned(r.migr) + ' ‰', isM('migr')],
      ])}
      <div class="group-title">${esc(t('g_econ'))}</div>
      ${rows([
        ['r_gdp', fEur(r.gdp), isM('gdp')],
        ['r_cars', fInt(r.cars)],
        ...(PREV ? [['r_growth', fSigned(r.carsGrowth, 1) + (lang === 'bg' ? ' %' : '%') + ` (${fSigned(r.cars - r.carsPrev, 0)})`, isM('growth')]] : []),
        ['r_cars100', fDec(r.cars100, 1), isM('cars')],
        ['r_old20', fPct(r.old20), isM('old20')],
        ['r_reg', fInt(r.regAll)],
        ['r_regnew', fPct(r.regNew)],
        ['r_regev', fPct(r.regEv), isM('ev')],
        ['r_housing', fInt(r.housing)],
        ['r_urban', fPct(r.urban)],
        ['r_dwell', fDec(r.dwell, 1), isM('dwell')],
      ])}
    </div>
    ${state.selected ? `<button class="panel-reset" type="button" id="panelReset">${esc(t('back'))}</button>` : ''}`;
  const reset = $('#panelReset');
  if (reset) reset.addEventListener('click', () => select(null));
}

function select(key, scroll) {
  state.selected = key;
  renderMap(); renderPanel(); renderGap(); renderHousing();
  if (scroll) $('#map').scrollIntoView({ behavior: 'smooth' });
}

/* ── region table ──────────────────────────────────────── */
const COLS = [
  ['name', 't_region', (r) => nameOf(r), (r) => esc(nameOf(r))],
  ['pop', 't_pop', (r) => r.pop, (r) => fInt(r.pop)],
  ['curr', 't_curr', (r) => r.curr, (r) => fInt(r.curr)],
  ['perm', 't_perm', (r) => r.perm, (r) => fInt(r.perm)],
  ['density', 't_density', (r) => r.density, (r) => fDec(r.density, 1)],
  ['gdp', 't_gdp', (r) => r.gdp, (r) => fEur(r.gdp)],
  ['age', 't_age', (r) => r.age, (r) => fDec(r.age, 1)],
  ['cars', 't_cars', (r) => r.cars100, (r) => fDec(r.cars100, 1)],
  ['housing', 't_housing', (r) => r.housing, (r) => fInt(r.housing)],
];
function renderTable() {
  const { key, dir } = state.sort;
  const col = COLS.find((c) => c[0] === key);
  const q = state.query.trim().toLowerCase();
  const rows = REG.filter((r) => !q || r.bg.toLowerCase().includes(q) || r.en.toLowerCase().includes(q))
    .sort((a, b) => {
      const x = col[2](a), y = col[2](b);
      return (typeof x === 'string' ? x.localeCompare(y, loc()) : x - y) * dir;
    });
  const head = COLS.map(([id, label]) => `<th scope="col" data-col="${id}"${id === key ? ` aria-sort="${dir > 0 ? 'ascending' : 'descending'}"` : ''}>${esc(t(label))}</th>`).join('');
  const body = rows.map((r) => `<tr data-key="${esc(r.key)}">${COLS.map((c) => `<td>${c[3](r)}</td>`).join('')}</tr>`).join('');
  $('#regionTable').innerHTML = `<thead><tr>${head}</tr></thead><tbody>${body}</tbody>`;
}
$('#regionTable').addEventListener('click', (ev) => {
  const th = ev.target.closest('th');
  if (th) {
    const id = th.dataset.col;
    state.sort = state.sort.key === id ? { key: id, dir: -state.sort.dir } : { key: id, dir: id === 'name' ? 1 : -1 };
    return renderTable();
  }
  const tr = ev.target.closest('tr[data-key]');
  if (tr) select(tr.dataset.key, true);
});
$('#search').addEventListener('input', (ev) => { state.query = ev.target.value; renderTable(); });

/* ── registered vs actual ──────────────────────────────── */
function renderGap() {
  const rows = [...REG].sort((a, b) => b.gap - a.gap);
  const max = Math.max(...rows.map((r) => Math.max(r.perm, r.pop)));
  $('#gapChart').innerHTML = rows.map((r) => `
    <div class="bar-row${r.key === state.selected ? ' active' : ''}">
      <span class="lbl">${esc(nameOf(r))}</span>
      <span class="track" title="${fInt(r.pop)} / ${fInt(r.perm)}">
        <span class="fill light" style="width:${(r.perm / max) * 100}%"></span>
        <span class="fill" style="width:${(r.pop / max) * 100}%"></span>
      </span>
      <span class="val">${fSigned(r.gap, 0)}${lang === 'bg' ? ' %' : '%'}</span>
    </div>`).join('') + `<p class="chart-note">${esc(t('gap_note'))}</p>`;
}

/* ── largest cities (GRAO, current address) ────────────── */
function renderCities() {
  const bg = lang === 'bg';
  const cities = REG.flatMap((r) => r.towns.map((x) => ({ ...x, region: r })))
    .sort((a, b) => b.current - a.current).slice(0, 10);
  const cityName = (x) => {
    const n = x.name.replace(/^гр\. /, '');
    if (bg) return n;
    if (n === 'София') return 'Sofia';
    return n === x.region.bg ? x.region.en : n; // regional centres share the region's name
  };
  const pct = (v) => fSigned(v, 1) + (bg ? ' %' : '%');
  const totalCurr = NAT.curr, top4 = cities.slice(0, 4);
  $('#citiesTitle').textContent = bg ? 'Най-големите градове по настоящ адрес' : 'Largest cities by current address';
  $('#citiesTable').innerHTML = `<thead><tr>
      <th>${bg ? 'Град' : 'City'}</th><th>${bg ? 'Настоящ адрес' : 'Current address'}</th>
      <th>${bg ? 'Постоянен адрес' : 'Permanent address'}</th><th>${bg ? 'Разлика' : 'Difference'}</th>
      <th>${bg ? 'Дял от страната' : 'Share of country'}</th></tr></thead>
    <tbody>${cities.map((x) => `<tr><td>${esc(cityName(x))}</td><td><b>${fInt(x.current)}</b></td><td>${fInt(x.permanent)}</td>
      <td>${pct((x.current / x.permanent - 1) * 100)}</td><td>${fPct((x.current / totalCurr) * 100)}</td></tr>`).join('')}</tbody>`;
  const share4 = (sum(top4, (x) => x.current) / totalCurr) * 100;
  $('#citiesNote').textContent = bg
    ? `${top4.map(cityName).join(', ')} събират ${fPct(share4)} от хората с настоящ адрес в страната (${fInt(sum(top4, (x) => x.current))} от ${fInt(totalCurr)}). Настоящият адрес е мястото, където човек реално живее; разликата спрямо постоянния показва колко регистрирани там живеят другаде. ГРАО, ${fmtDate(P.settlements_date).replace(/\.?$/, '.')}`
    : `${top4.map(cityName).join(', ')} hold ${fPct(share4)} of everyone with a current address in Bulgaria (${fInt(sum(top4, (x) => x.current))} of ${fInt(totalCurr)}). The current address is where people actually live; the difference to the permanent address shows how many registered there live elsewhere. GRAO, ${fmtDate(P.settlements_date)}.`;
}

/* ── migration ─────────────────────────────────────────── */
const MIG = window.MIGRATION;
const NUTS2 = { NW: 'BG31', NC: 'BG32', NE: 'BG33', SE: 'BG34', SW: 'BG41', SC: 'BG42' };
function renderMigration() {
  const bg = lang === 'bg', I = MIG.internal, X = MIG.external;
  const pc = (v) => fPct(v, 0);
  // internal: net flows between NUTS 2 regions (diagonal = moves within a region)
  const flows = I.regions.map((r, i) => {
    const inflow = sum(I.matrix[i], (v) => v) - I.matrix[i][i];
    const outflow = sum(I.matrix, (row) => row[i]) - I.matrix[i][i];
    const members = REG.filter((x) => E.regions[x.key].nuts.startsWith(NUTS2[r.id])).map(nameOf).join(', ');
    return { ...r, inflow, outflow, net: inflow - outflow, members };
  }).sort((a, b) => b.net - a.net);
  const between = I.total - sum(I.matrix.map((row, i) => row[i]), (v) => v);
  const maxNet = Math.max(...flows.map((f) => Math.abs(f.net)));
  const netBars = flows.map((f) => `
    <div class="bar-row" title="${esc(f.members)}">
      <span class="lbl">${esc(bg ? f.bg : f.en)}</span>
      <span class="track"><span class="fill${f.net < 0 ? ' neg' : ''}" style="width:${(Math.abs(f.net) / maxNet) * 100}%"></span></span>
      <span class="val">${fSigned(f.net, 0)}</span>
    </div>`).join('');
  const im = X.immigrants, em = X.emigrants;
  const cit = [[bg ? 'Българско' : 'Bulgarian', im.bg, em.bg], [bg ? 'ЕС' : 'EU', im.eu, em.eu], [bg ? 'Извън ЕС' : 'Non-EU', im.non_eu, em.non_eu]];
  const groups = [[0, 14], [15, 29], [30, 44], [45, 64], [65, 200]];
  const ageRows = groups.map(([lo, hi]) => {
    const rows = X.ages.filter((a) => { const n = parseInt(a.age, 10); return n >= lo && n <= hi; });
    return [hi > 100 ? `${lo}+` : `${lo}–${hi}`, sum(rows, (a) => a.immigrants), sum(rows, (a) => a.emigrants)];
  });
  const table = (head, rows) => `<table class="mini-table"><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr><td>${esc(r[0])}</td><td>${fInt(r[1])} <span class="muted">· ${pc((r[1] / im.total) * 100)}</span></td><td>${fInt(r[2])} <span class="muted">· ${pc((r[2] / em.total) * 100)}</span></td></tr>`).join('')}</tbody></table>`;
  const sas = (w) => (/^[СсЗз]/.test(w) ? 'със ' : 'с ') + w;
  const top = flows[0], worst = flows[flows.length - 1], second = flows[1];
  const old = ageRows[4][2], work = sum(X.ages.filter((a) => { const n = parseInt(a.age, 10); return n >= 20 && n <= 49; }), (a) => a.immigrants);
  const facts = bg ? [
    `През ${X.year} г. в България са се заселили <b>${fInt(im.total)}</b> души от чужбина, а са се изселили <b>${fInt(em.total)}</b> — нетно <b>${fSigned(im.total - em.total, 0)}</b>.`,
    `${pc((im.foreign / im.total) * 100)} от имигрантите са чужди граждани, най-вече от страни извън ЕС (${fInt(im.non_eu)}). Останалите ${pc((im.bg / im.total) * 100)} са българи, които се връщат.`,
    `${pc((work / im.total) * 100)} от имигрантите са на 20–49 години, докато ${pc((old / em.total) * 100)} от емигрантите са на 65 и повече години.`,
    `Вътре в страната са сменили адреса си <b>${fInt(I.total)}</b> души, като ${fInt(between)} от тях са се преместили в друг статистически район.`,
    `Печели основно ${top.bg} район (${sas(top.members.split(', ').includes('София-град') ? 'София' : top.members.split(', ')[0])}): <b>${fSigned(top.net, 0)}</b> души. ${second.bg} е почти на нула (${fSigned(second.net, 0)}).`,
    `Останалите райони губят население, най-много ${worst.bg} (${fSigned(worst.net, 0)}).`,
    `Жените мигрират повече от мъжете: ${fInt(I.women)} срещу ${fInt(I.men)} (${pc((I.women / I.total) * 100)}).`,
    `<span class="fine">Емиграцията се отчита по заявена промяна на адреса в чужбина, затова реалният брой вероятно е по-голям.</span>`,
  ] : [
    `In ${X.year}, <b>${fInt(im.total)}</b> people moved to Bulgaria from abroad and <b>${fInt(em.total)}</b> left — a net gain of <b>${fSigned(im.total - em.total, 0)}</b>.`,
    `${pc((im.foreign / im.total) * 100)} of immigrants are foreign citizens, mostly from outside the EU (${fInt(im.non_eu)}). The other ${pc((im.bg / im.total) * 100)} are returning Bulgarians.`,
    `${pc((work / im.total) * 100)} of immigrants are aged 20–49, while ${pc((old / em.total) * 100)} of emigrants are 65 or older.`,
    `Within the country <b>${fInt(I.total)}</b> people changed their address; ${fInt(between)} of them moved to a different statistical region.`,
    `The main winner is the ${top.en} region (with ${top.members.split(', ').includes('Sofia City') ? 'Sofia' : top.members.split(', ')[0]}): <b>${fSigned(top.net, 0)}</b> people. ${second.en} is close to zero (${fSigned(second.net, 0)}).`,
    `All other regions lose people, most of all ${worst.en} (${fSigned(worst.net, 0)}).`,
    `Women migrate more than men: ${fInt(I.women)} vs ${fInt(I.men)} (${pc((I.women / I.total) * 100)}).`,
    `<span class="fine">Emigration is counted from declared moves abroad, so the real number is probably higher.</span>`,
  ];
  $('#migSub').textContent = bg ? `Вътрешна и външна миграция през ${X.year} г., НСИ.` : `Internal and international migration in ${X.year}, NSI.`;
  $('#migBody').innerHTML = `
    <div class="big-stat">
      <div><b class="num">${fInt(im.total)}</b><span>${bg ? 'имигранти' : 'immigrants'}</span></div>
      <div><b class="num">${fInt(em.total)}</b><span>${bg ? 'емигранти' : 'emigrants'}</span></div>
      <div><b class="num">${fSigned(im.total - em.total, 0)}</b><span>${bg ? 'нетна външна миграция' : 'net international migration'}</span></div>
      <div><b class="num">${fInt(I.total)}</b><span>${bg ? 'вътрешни премествания' : 'moves within Bulgaria'}</span></div>
    </div>
    <div class="mig-grid">
      <div>
        <div class="group-title" style="margin:0 0 12px">${bg ? 'Нетна миграция между районите' : 'Net migration between regions'}</div>
        <div class="bars">${netBars}</div>
        <p class="chart-note">${bg ? 'Статистически райони (NUTS 2). Задръжте върху ред, за да видите областите.' : 'Statistical regions (NUTS 2). Hover a row to see its provinces.'}</p>
      </div>
      <div>
        <div class="group-title" style="margin:0 0 4px">${bg ? 'По гражданство' : 'By citizenship'}</div>
        ${table([bg ? 'Гражданство' : 'Citizenship', bg ? 'Имигранти' : 'Immigrants', bg ? 'Емигранти' : 'Emigrants'], cit)}
        <div class="group-title" style="margin:24px 0 4px">${bg ? 'По възраст' : 'By age'}</div>
        ${table([bg ? 'Възраст' : 'Age', bg ? 'Имигранти' : 'Immigrants', bg ? 'Емигранти' : 'Emigrants'], ageRows)}
      </div>
    </div>
    <ul class="facts">${facts.map((f) => `<li>${f}</li>`).join('')}</ul>`;
}

/* ── vehicles ──────────────────────────────────────────── */
const BRAND = { 'ФОЛКСВАГЕН': 'Volkswagen', 'ОПЕЛ': 'Opel', 'МЕРЦЕДЕС': 'Mercedes-Benz', 'АУДИ': 'Audi', 'ТОЙОТА': 'Toyota', 'БМВ': 'BMW', 'ПЕЖО': 'Peugeot', 'ФОРД': 'Ford', 'РЕНО': 'Renault', 'ШКОДА': 'Škoda', 'ХОНДА': 'Honda', 'СИТРОЕН': 'Citroën', 'НИСАН': 'Nissan', 'ХЮНДАЙ': 'Hyundai', 'ФИАТ': 'Fiat', 'КИА': 'Kia', 'МАЗДА': 'Mazda', 'СЕАТ': 'SEAT', 'ДАЧИЯ': 'Dacia', 'СУЗУКИ': 'Suzuki', 'МИЦУБИШИ': 'Mitsubishi', 'ВОЛВО': 'Volvo', 'ДАЙХАТСУ': 'Daihatsu', 'ЛАНЧИЯ': 'Lancia', 'ДЕУ': 'Daewoo', 'САНГ ЙОНГ': 'SsangYong', 'СУБАРУ': 'Subaru', 'ВАЗ': 'Lada', 'ШЕВРОЛЕТ': 'Chevrolet', 'ДЖИП': 'Jeep', 'ЛЕНД РОВЕР': 'Land Rover', 'АЛФА РОМЕО': 'Alfa Romeo', 'МИНИ': 'Mini', 'ПОРШЕ': 'Porsche', 'ЛЕКСУС': 'Lexus', 'ТЕСЛА': 'Tesla', 'ЯГУАР': 'Jaguar' };
const CATS = V.categories, BRANDS = V.brands;
const M1 = CATS.find((c) => c.id === 'M1');
const fmtDate = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString(loc(), { day: 'numeric', month: 'long', year: 'numeric' });

function renderVehicles() {
  segmented($('#vehTabs'), [['cat', t('v_cat')], ['brands', t('v_brands')], ['age', t('v_age')], ['fuel', t('v_fuel')], ['reg', t('v_reg')]], state.veh, (id) => { state.veh = id; renderVehicles(); });
  const note = (k) => `<p class="chart-note">${esc(t(k))} ${esc(t('mvr'))}, ${fmtDate(V.date).replace(/\.?$/, '.')}</p>`;
  const body = $('#vehBody');
  if (state.veh === 'cat') {
    body.innerHTML = barList(CATS.map((c) => ({ label: lang === 'bg' ? c.bg : c.en, value: c.total, extra: PREV ? fDelta(c.total, PREV.categories[c.id]) : undefined })), { fmt: fInt })
      + (PREV ? `<p class="chart-note">${esc(t('delta_note'))} ${fmtDate(PREV.date)}.</p>` : '')
      + note('cat_note');
  } else if (state.veh === 'brands') {
    const share = (b, i) => (b.age[i] / b.total) * 100;
    const growth = (b) => (PREV && PREV.brands[b.name] ? (b.total / PREV.brands[b.name] - 1) * 100 : -Infinity);
    const by = { total: (b) => b.total, new: (b) => share(b, 0), old: (b) => share(b, 4), growth }[state.brandSort];
    const pool = state.brandSort === 'growth' ? BRANDS.filter((b) => growth(b) > -Infinity) : BRANDS;
    const items = [...pool].sort((a, b) => by(b) - by(a)).map((b) => ({ label: BRAND[b.name] || b.name, value: by(b),
      extra: state.brandSort === 'total' && PREV ? fDelta(b.total, PREV.brands[b.name]) : undefined }));
    body.innerHTML = `<div class="sub-controls"><span>${esc(t('sort_by'))}</span><div class="segmented" id="brandSort"></div></div>`
      + barList(items, state.brandSort === 'growth'
        ? { fmt: (v) => fSigned(v, 1) + (lang === 'bg' ? ' %' : '%') }
        : { fmt: state.brandSort === 'total' ? fInt : (v) => fPct(v), max: state.brandSort === 'total' ? undefined : 100 })
      + note('brand_note');
    segmented($('#brandSort'), [['total', t('b_total')], ['new', t('b_new')], ['old', t('b_old')], ...(PREV ? [['growth', t('b_growth')]] : [])], state.brandSort, (id) => { state.brandSort = id; renderVehicles(); });
  } else if (state.veh === 'fuel') {
    const lbl = (x) => (lang === 'bg' ? x.bg : x.en);
    const fuelTotal = sum(V.fuel, (x) => x.n), euroTotal = sum(V.euro, (x) => x.n);
    body.innerHTML = `<div class="group-title" style="margin-bottom:12px">${esc(t('fuel_head'))}</div>`
      + barList(V.fuel.filter((x) => x.id !== 'other').map((x) => ({ label: lbl(x), value: (x.n / fuelTotal) * 100 })), { fmt: (v) => fPct(v), max: 100 })
      + `<div class="group-title" style="margin:32px 0 12px">${esc(t('euro_head'))}</div>`
      + barList(V.euro.map((x) => ({ label: lbl(x), value: (x.n / euroTotal) * 100 })), { fmt: (v) => fPct(v), max: 100 })
      + note('fuel_note');
  } else if (state.veh === 'reg') {
    const fa = V.first_reg.age, faT = sum(fa, (x) => x), labels = t('reg_ages');
    body.innerHTML = `<div class="group-title">${esc(t('reg_head'))} ${V.first_reg.year}</div>
      <div class="big-stat">${fa.map((v, i) => `<div><b class="num">${fPct((v / faT) * 100)}</b><span>${esc(labels[i])} · ${fCompact(v)}</span></div>`).join('')}</div>
      <div class="stack" style="margin-bottom:36px">${fa.map((v, i) => `<i style="width:${(v / faT) * 100}%;opacity:${1 - i * 0.22}"></i>`).join('')}</div>
      <div class="group-title" style="margin-bottom:12px">${esc(t('reg_ev'))}</div>`
      + barList([...REG].sort((a, b) => b.regEv - a.regEv).map((r) => ({ key: r.key, label: nameOf(r), value: r.regEv })), { fmt: (v) => fPct(v), active: state.selected })
      + note('reg_note');
  } else {
    const ages = t('ages');
    body.innerHTML = `<div class="group-title">${esc(t('age_head'))}</div>
      <div class="big-stat">${M1.age.map((v, i) => `<div><b class="num">${fPct((v / M1.total) * 100)}</b><span>${esc(ages[i])} · ${fCompact(v)}</span></div>`).join('')}</div>
      <div class="stack" style="margin-bottom:36px">${M1.age.map((v, i) => `<i style="width:${(v / M1.total) * 100}%;opacity:${0.2 + i * 0.2}"></i>`).join('')}</div>
      <div class="group-title" style="margin-bottom:12px">${esc(t('age_cat'))}</div>`
      + barList([...CATS].sort((a, b) => b.age[4] / b.total - a.age[4] / a.total)
        .map((c) => ({ label: lang === 'bg' ? c.bg : c.en, value: (c.age[4] / c.total) * 100 })), { fmt: (v) => fPct(v), max: 100 });
  }
}

/* ── housing ───────────────────────────────────────────── */
function renderHousing() {
  segmented($('#houTabs'), [['rooms', t('h_rooms')], ['urban', t('h_urban')], ['per', t('h_per')]], state.hou, (id) => { state.hou = id; renderHousing(); });
  const body = $('#houBody');
  if (state.hou === 'rooms') {
    const rooms = t('rooms');
    body.innerHTML = `<div class="big-stat">
        <div><b class="num">${fMil(H.total)}</b><span>${esc(t('h_total'))}</span></div>
        <div><b class="num">${fPct((H.urban / H.total) * 100)}</b><span>${esc(t('h_urbsh'))}</span></div>
        <div><b class="num">${fDec(NAT.dwell, 1)}</b><span>${esc(t('h_avg'))}</span></div>
      </div>`
      + barList(H.rooms.map((v, i) => ({ label: rooms[i], value: v })), { fmt: (v) => fPct((v / H.total) * 100) })
      + `<p class="chart-note">${esc(t('h_rooms_note'))}</p>`;
  } else if (state.hou === 'urban') {
    body.innerHTML = barList([...REG].sort((a, b) => b.urban - a.urban).map((r) => ({ key: r.key, label: nameOf(r), value: r.urban })), { fmt: (v) => fPct(v), max: 100, active: state.selected })
      + `<p class="chart-note">${esc(t('h_urban_note'))}</p>`;
  } else {
    body.innerHTML = barList([...REG].sort((a, b) => b.dwell - a.dwell).map((r) => ({ key: r.key, label: nameOf(r), value: r.dwell })), { fmt: (v) => fDec(v, 1), active: state.selected })
      + `<p class="chart-note">${esc(t('h_per_note'))}</p>`;
  }
}

/* ── insights (computed from data) ─────────────────────── */
function renderInsights() {
  const by = (f) => [...REG].sort((a, b) => f(b) - f(a));
  const gapTop = by((r) => r.gap)[0];
  const sofia = BYKEY['СОФИЯ'];
  const gdpShare = (sofia.gdp * sofia.pop) / (NAT.gdp * NAT.pop) * 100;
  const poorest = by((r) => -r.gdp)[0];
  const oldest = by((r) => r.age)[0], youngest = by((r) => -r.age)[0];
  const declining = REG.filter((r) => r.natural < 0).length;
  const carsTop = by((r) => r.cars100)[0], carsLow = by((r) => -r.cars100)[0];
  const dwTop = by((r) => r.dwell)[0], dwLow = by((r) => -r.dwell)[0];
  const grew = REG.filter((r) => r.carsGrowth > 0).length;
  const growTop = PREV ? by((r) => r.carsGrowth)[0] : null;
  const vav = (name) => (/^[ВвФф]/.test(name) ? 'във ' : 'в ') + name;
  const absTop = PREV ? by((r) => r.cars - r.carsPrev) : [];
  const absShare = PREV ? ((absTop[0].cars - absTop[0].carsPrev + absTop[1].cars - absTop[1].carsPrev) / (NAT.cars - NAT.carsPrev)) * 100 : 0;
  const brandTop = PREV ? [...BRANDS].filter((b) => PREV.brands[b.name]).sort((a, b) => b.total / PREV.brands[b.name] - a.total / PREV.brands[a.name])[0] : null;
  const pAge = PREV && PREV.m1_age, pTot = pAge ? pAge.reduce((a, b) => a + b, 0) : 1;
  const prevOld20 = pAge ? (pAge[4] / pTot) * 100 : 0, prevNew5 = pAge ? (pAge[0] / pTot) * 100 : 0;
  const months = PREV ? Math.round((new Date(V.date) - new Date(PREV.date)) / 2629746000) : 0;
  const old20 = (M1.age[4] / M1.total) * 100, new5 = (M1.age[0] / M1.total) * 100;
  const hist = Object.keys(NAT.history).sort();
  const popCh = (NAT.history[hist[hist.length - 1]] / NAT.history[hist[0]] - 1) * 100;
  const P_ = (v, d = 1) => fPct(v, d);
  const bg = lang === 'bg';
  const cards = [
    [fMil(NAT.perm - NAT.pop),
      bg ? 'Регистрирани, но не живеят тук' : 'Registered, but not living here',
      bg ? `С постоянен адрес са ${fMil(NAT.perm)} души, а реално живеят ${fMil(NAT.pop)} (Евростат, ${Y.pop}). Най-голяма е разликата в ${gapTop.bg}: ${fInt(gapTop.perm)} регистрирани срещу ${fInt(gapTop.pop)} жители.`
         : `${fMil(NAT.perm)} people hold a permanent address, but ${fMil(NAT.pop)} actually live in the country (Eurostat, ${Y.pop}). The gap is largest in ${gapTop.en}: ${fInt(gapTop.perm)} registered vs ${fInt(gapTop.pop)} residents.`],
    [P_(gdpShare, 0),
      bg ? 'Икономиката е в София' : 'The economy is in Sofia',
      bg ? `София-град има ${P_((sofia.pop / NAT.pop) * 100)} от населението и ${P_(gdpShare, 0)} от БВП. БВП на човек там (${fEur(sofia.gdp)}) е ${fDec(sofia.gdp / poorest.gdp, 1)} пъти по-висок от този в ${poorest.bg}.`
         : `Sofia City holds ${P_((sofia.pop / NAT.pop) * 100)} of the population and ${P_(gdpShare, 0)} of GDP. Its GDP per capita (${fEur(sofia.gdp)}) is ${fDec(sofia.gdp / poorest.gdp, 1)}× that of ${poorest.en}.`],
    [fSigned(popCh) + (bg ? ' %' : '%'),
      bg ? `Население от ${hist[0]} г.` : `Population since ${hist[0]}`,
      bg ? `Смъртността надвишава раждаемостта в ${declining} от 28 области. Естественият прираст за страната е ${fSigned(NAT.natural)} ‰ (${Y.birth_rate}).`
         : `Deaths exceed births in ${declining} of 28 regions. The national natural change is ${fSigned(NAT.natural)} ‰ (${Y.birth_rate}).`],
    [fDec(NAT.age, 1),
      bg ? 'Медианна възраст' : 'Median age',
      bg ? `Най-възрастна е ${oldest.bg} (${fDec(oldest.age, 1)} г.), най-млада — ${youngest.bg} (${fDec(youngest.age, 1)} г.). ${P_(NAT.share65, 0)} от хората са над 65 години.`
         : `${oldest.en} is the oldest region (${fDec(oldest.age, 1)}), ${youngest.en} the youngest (${fDec(youngest.age, 1)}). ${P_(NAT.share65, 0)} of people are 65 or older.`],
    [P_(old20, 0),
      bg ? 'Коли на над 20 години' : 'Cars older than 20 years',
      bg ? `Едва ${P_(new5)} от леките автомобили са до 5 години — един от най-старите автопаркове в ЕС.`
         : `Only ${P_(new5)} of passenger cars are under five years old — one of the oldest fleets in the EU.`],
    [fDec(NAT.cars100, 0),
      bg ? 'Коли на 100 жители' : 'Cars per 100 residents',
      bg ? `Най-много в ${carsTop.bg} (${fDec(carsTop.cars100, 0)}), най-малко в ${carsLow.bg} (${fDec(carsLow.cars100, 0)}). Изчислено спрямо реалното население.`
         : `Highest in ${carsTop.en} (${fDec(carsTop.cars100, 0)}), lowest in ${carsLow.en} (${fDec(carsLow.cars100, 0)}). Based on actual population.`],
    [fDec(NAT.dwell, 0),
      bg ? 'Жилища на 100 жители' : 'Dwellings per 100 residents',
      bg ? `Най-много жилища спрямо хората има ${dwTop.bg} (${fDec(dwTop.dwell, 0)}) — следствие от обезлюдяване. Най-малко — ${dwLow.bg} (${fDec(dwLow.dwell, 0)}).`
         : `${dwTop.en} has the most dwellings per person (${fDec(dwTop.dwell, 0)}), a sign of depopulation. ${dwLow.en} has the fewest (${fDec(dwLow.dwell, 0)}).`],
    [P_(V.first_reg.age[3] / sum(V.first_reg.age, (x) => x) * 100),
      bg ? `Внос на стари коли (${V.first_reg.year})` : `Old imports (${V.first_reg.year})`,
      bg ? `Толкова от регистрираните за първи път превозни средства са над 10 години. Нови са едва ${P_(NAT.regNew)}, а електрическите — ${P_(NAT.regEv)}.`
         : `That share of vehicles registered for the first time is over ten years old. Only ${P_(NAT.regNew)} are brand new and ${P_(NAT.regEv)} are electric.`],
    ...(PREV ? [
      [fSigned(NAT.cars - NAT.carsPrev, 0),
        bg ? `Още коли за ${months} месеца` : `More cars in ${months} months`,
        bg ? `От ${fmtDate(PREV.date)} до ${fmtDate(V.date)} леките автомобили се увеличават от ${fInt(NAT.carsPrev)} на ${fInt(NAT.cars)} (${fDelta(NAT.cars, NAT.carsPrev)}). Ръст има ${grew === 28 ? 'във всички 28 области' : `в ${grew} от 28 области`}, най-бърз ${vav(growTop.bg)} (${fDelta(growTop.cars, growTop.carsPrev)}).`
           : `Between ${fmtDate(PREV.date)} and ${fmtDate(V.date)} passenger cars grew from ${fInt(NAT.carsPrev)} to ${fInt(NAT.cars)} (${fDelta(NAT.cars, NAT.carsPrev)}), in ${grew === 28 ? 'all 28 regions' : `${grew} of 28 regions`}. Fastest growth: ${growTop.en} (${fDelta(growTop.cars, growTop.carsPrev)}).`],
      [fSigned(absTop[0].cars - absTop[0].carsPrev, 0),
        bg ? `Най-много нови коли ${vav(absTop[0].bg)}` : `Most added cars: ${absTop[0].en}`,
        bg ? `В бройки най-много са добавени ${vav(absTop[0].bg)} (${fSigned(absTop[0].cars - absTop[0].carsPrev, 0)}) и ${vav(absTop[1].bg)} (${fSigned(absTop[1].cars - absTop[1].carsPrev, 0)}) — заедно ${P_(absShare, 0)} от ръста в страната.`
           : `In absolute terms most cars were added in ${absTop[0].en} (${fSigned(absTop[0].cars - absTop[0].carsPrev, 0)}) and ${absTop[1].en} (${fSigned(absTop[1].cars - absTop[1].carsPrev, 0)}) — together ${P_(absShare, 0)} of the national increase.`],
      ...(PREV.m1_age && brandTop ? [[fDelta(brandTop.total, PREV.brands[brandTop.name]),
        bg ? `${BRAND[brandTop.name] || brandTop.name} расте най-бързо` : `${BRAND[brandTop.name] || brandTop.name} grows fastest`,
        bg ? `Броят им се увеличава от ${fInt(PREV.brands[brandTop.name])} на ${fInt(brandTop.total)}. Автопаркът леко се подмладява: делът на колите над 20 години пада от ${P_(prevOld20)} на ${P_(old20)}, а на тези до 5 години расте от ${P_(prevNew5)} на ${P_(new5)}.`
           : `Their number rose from ${fInt(PREV.brands[brandTop.name])} to ${fInt(brandTop.total)}. The fleet is getting slightly younger: cars over 20 years fell from ${P_(prevOld20)} to ${P_(old20)}, cars up to 5 years rose from ${P_(prevNew5)} to ${P_(new5)}.`]] : []),
    ] : []),
    [fInt(NAT.under50 + NAT.empty),
      bg ? 'Почти празни села' : 'Nearly empty villages',
      bg ? `Толкова населени места имат под 50 души с настоящ адрес, а ${fInt(NAT.empty)} нямат нито един (ГРАО, ${fmtDate(P.settlements_date)}). Общо населените места са ${fInt(NAT.settlements)}.`
         : `That many settlements have fewer than 50 people at a current address, and ${fInt(NAT.empty)} have none at all (GRAO, ${fmtDate(P.settlements_date)}). There are ${fInt(NAT.settlements)} settlements in total.`],
  ];
  $('#insightGrid').innerHTML = cards.map(([f, h, p]) => `<article class="insight"><div class="figure num">${f}</div><h3>${esc(h)}</h3><p>${esc(p)}</p></article>`).join('');
}

/* ── footer ────────────────────────────────────────────── */
function renderFooter() {
  const bg = lang === 'bg';
  const src = bg ? [
    [`Население по постоянен и настоящ адрес — ГРАО, ${fmtDate(P.date)}`, 'https://www.grao.bg/tables.html'],
    [`Регистрирани МПС — МВР, ${fmtDate(V.date)}`, 'https://data.egov.bg'],
    ['Жилищен фонд — НСИ, 31.12.2024', 'https://www.nsi.bg/statistical-data/244/786'],
    [`Вътрешна и външна миграция — НСИ, ${MIG.external.year} г.`, 'https://www.nsi.bg'],
    ['Население, демография, БВП и площ по области — Евростат', 'https://ec.europa.eu/eurostat/web/regions/database'],
    ['Граници на областите — geoBoundaries (CC BY 4.0)', 'https://www.geoboundaries.org'],
  ] : [
    [`Population by permanent and current address — GRAO, ${fmtDate(P.date)}`, 'https://www.grao.bg/tables.html'],
    [`Registered vehicles — Ministry of Interior, ${fmtDate(V.date)}`, 'https://data.egov.bg'],
    ['Housing stock — NSI, 31 Dec 2024', 'https://www.nsi.bg/statistical-data/244/786'],
    [`Internal and international migration — NSI, ${MIG.external.year}`, 'https://www.nsi.bg'],
    ['Population, demography, GDP and area by region — Eurostat', 'https://ec.europa.eu/eurostat/web/regions/database'],
    ['Region boundaries — geoBoundaries (CC BY 4.0)', 'https://www.geoboundaries.org'],
  ];
  $('#footer').innerHTML = `<p>${esc(t('src'))}</p><ul>${src.map(([l, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${esc(l)}</a></li>`).join('')}</ul>
    <p>${esc(t('updated'))} ${esc(E.fetched)}. ${bg ? 'Показателите „на 100 жители“ са изчислени спрямо реалното население.' : 'Per-resident figures use the actual (Eurostat) population.'}</p>`;
}

/* ── language & nav ────────────────────────────────────── */
function applyLang() {
  document.documentElement.lang = lang;
  document.title = t('brand');
  document.querySelectorAll('[data-t]').forEach((n) => { n.textContent = t(n.dataset.t); });
  $('#search').placeholder = t('search');
  $('#langBtn').textContent = lang === 'bg' ? 'EN' : 'БГ';
  renderKpis(); renderMetricPicker(); renderMap(); renderPanel(); renderTable();
  renderGap(); renderCities(); renderMigration(); renderVehicles(); renderHousing(); renderInsights(); renderFooter();
}
$('#langBtn').addEventListener('click', () => {
  lang = lang === 'bg' ? 'en' : 'bg';
  try { localStorage.setItem('lang', lang); } catch (_) {}
  applyLang();
});
const links = $('#navLinks'), menu = $('#menuBtn');
menu.addEventListener('click', () => {
  const open = links.classList.toggle('open');
  menu.setAttribute('aria-expanded', String(open));
});
links.addEventListener('click', (ev) => { if (ev.target.tagName === 'A') { links.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); } });
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && state.selected) select(null); });

applyLang();
})();
