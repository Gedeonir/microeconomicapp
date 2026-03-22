import { useState, useRef } from "react";
import { api } from "./lib/api.js";

// ─── Constants ────────────────────────────────────────────────
const GEO_CHAIN = ["city", "district", "sector", "cell", "village"];

const INDICATORS = [
  { key: "youth_education",     label: "Youth & Education",     icon: "📚", color: "#a78bfa" },
  { key: "agriculture",         label: "Agriculture",           icon: "🌱", color: "#4ade80" },
  { key: "business_enterprise", label: "Business & Enterprise", icon: "🏢", color: "#f5a623" },
  { key: "financial_inclusion", label: "Financial Inclusion",   icon: "💳", color: "#a78bfa" },
  { key: "labor_market",        label: "Labor Market",          icon: "⚙️", color: "#f5a623" },
  { key: "infrastructure",      label: "Infrastructure",        icon: "🔌", color: "#4ade80" },
];

// Columns to display per indicator (label, key, unit)
const INDICATOR_FIELDS = {
  youth_education: [
    { label: "Youth Population (16–30)", key: "youth_population_16_30", unit: "" },
    { label: "Literacy Rate",            key: "literacy_rate_pct",       unit: "%" },
    { label: "Numeracy Rate",            key: "numeracy_rate_pct",       unit: "%" },
    { label: "Computer Literacy",        key: "computer_literacy_pct",   unit: "%" },
    { label: "Internet Usage",           key: "internet_usage_pct",      unit: "%" },
    { label: "Higher Education",         key: "higher_education_pct",    unit: "%" },
    { label: "TVET",                     key: "tvet_pct",                unit: "%" },
    { label: "Youth WPR",                key: "wpr_total_pct",           unit: "%" },
    { label: "Health Insurance",         key: "health_insurance_pct",    unit: "%" },
    { label: "Youth Migrants",           key: "youth_migrants",          unit: "" },
    { label: "Migration for Work",       key: "migration_work_reason_pct",unit: "%" },
  ],
  agriculture: [
    { label: "Season",                   key: "season",                       unit: "" },
    { label: "Agri Land (000 Ha)",       key: "agri_land_000ha",              unit: " 000ha" },
    { label: "Cultivated (000 Ha)",      key: "physical_cultivated_000ha",    unit: " 000ha" },
    { label: "Irrigated (Ha)",           key: "irrigated_land_ha",            unit: " ha" },
    { label: "Erosion Control (Ha)",     key: "erosion_control_ha",           unit: " ha" },
    { label: "Organic Fertilizer",       key: "organic_fertilizer_use_pct",   unit: "%" },
    { label: "Inorganic Fertilizer",     key: "inorganic_fertilizer_use_pct", unit: "%" },
    { label: "Improved Seeds",           key: "improved_seeds_use_pct",       unit: "%" },
    { label: "Cereal Production (MT)",   key: "cereal_production_mt",         unit: " MT" },
    { label: "Tuber Production (MT)",    key: "tuber_production_mt",          unit: " MT" },
    { label: "Maize Yield (Kg/Ha)",      key: "maize_yield_kg_ha",            unit: " kg/ha" },
    { label: "Cassava Yield (Kg/Ha)",    key: "cassava_yield_kg_ha",          unit: " kg/ha" },
  ],
  business_enterprise: [
    { label: "Total Businesses",         key: "total_businesses",            unit: "" },
    { label: "Micro (1–3 workers)",      key: "micro_enterprises",           unit: "" },
    { label: "Small (4–30 workers)",     key: "small_enterprises",           unit: "" },
    { label: "Medium (31–100)",          key: "medium_enterprises",          unit: "" },
    { label: "Large (100+)",             key: "large_enterprises",           unit: "" },
    { label: "Formal Enterprises",       key: "formal_enterprises",          unit: "" },
    { label: "Informal Enterprises",     key: "informal_enterprises",        unit: "" },
    { label: "Registered Investment",    key: "registered_investment_usd",   unit: " USD" },
    { label: "Jobs to be Created",       key: "jobs_to_be_created",          unit: "" },
    { label: "3yr Survival Rate",        key: "business_survival_3yr_pct",   unit: "%" },
  ],
  financial_inclusion: [
    { label: "Banked Population",        key: "banked_population_pct",              unit: "%" },
    { label: "Bank Branches",            key: "bank_branches",                      unit: "" },
    { label: "ATMs per 100K Adults",     key: "atm_per_100k_adults",               unit: "" },
    { label: "Mobile Money",             key: "mobile_money_penetration_pct",       unit: "%" },
    { label: "MoMo Volume (RwF)",        key: "mobile_money_transaction_vol",       unit: "" },
    { label: "Digital Payment",          key: "digital_payment_adoption_pct",       unit: "%" },
    { label: "Credit Growth",            key: "private_sector_credit_growth_pct",   unit: "%" },
    { label: "Lending Rate",             key: "lending_rate_pct",                   unit: "%" },
    { label: "Deposit Rate",             key: "deposit_rate_pct",                   unit: "%" },
    { label: "MFIs Active",              key: "microfinance_institutions",           unit: "" },
    { label: "SACCOs",                   key: "saccos",                             unit: "" },
  ],
  labor_market: [
    { label: "Total Employment",         key: "total_enterprise_employment",      unit: "" },
    { label: "Formal Workers",           key: "formal_workers",                   unit: "" },
    { label: "Informal Workers",         key: "informal_workers",                 unit: "" },
    { label: "Formal Share",             key: "formal_share_pct",                 unit: "%" },
    { label: "Female Workers",           key: "female_workers",                   unit: "" },
    { label: "Female Share",             key: "female_share_pct",                 unit: "%" },
    { label: "LFPR Total",               key: "lfpr_total_pct",                   unit: "%" },
    { label: "Youth WPR",                key: "youth_wpr_total_pct",              unit: "%" },
    { label: "Unemployment Rate",        key: "unemployment_rate_pct",            unit: "%" },
    { label: "Youth Unemployment",       key: "youth_unemployment_pct",           unit: "%" },
    { label: "Services Employment Share",key: "services_employment_share_pct",    unit: "%" },
  ],
  infrastructure: [
    { label: "Electricity Customers",    key: "electricity_customers",        unit: "" },
    { label: "Electrification (%HH)",    key: "electricity_share_of_hh_pct",  unit: "%" },
    { label: "Water Customers",          key: "water_customers",              unit: "" },
    { label: "Water Production (m³)",    key: "water_production_m3_annual",   unit: " m³" },
    { label: "Paved Roads (km)",         key: "paved_roads_national_km",      unit: " km" },
    { label: "Hotel Facilities",         key: "accommodation_facilities",     unit: "" },
    { label: "Hotel Rooms",              key: "hotel_rooms",                  unit: "" },
    { label: "Avg. Commute (min)",       key: "avg_commute_minutes",          unit: " min" },
    { label: "ODF Rate",                 key: "open_defecation_free_pct",     unit: "%" },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────
function fmt(val, unit = "") {
  if (val === null || val === undefined || val === "") return "—";
  const n = parseFloat(val);
  if (isNaN(n)) return String(val) + unit;
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M" + unit;
  if (Math.abs(n) >= 1_000)     return n.toLocaleString() + unit;
  return (Number.isInteger(n) ? n : n.toFixed(2)) + unit;
}

function Spinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: "spin .7s linear infinite", display: "inline-block" }}>
      <path d="M12 2a10 10 0 0 1 10 10"/>
    </svg>
  );
}

// ─── Location Selector ────────────────────────────────────────
function LocationSelector({ allRecords, value, onChange }) {
  // value = { city_id, district_id, sector_id, cell_id, village_id }
  const get = (level) => value[`${level}_id`] || "";
  const set = (level, id) => {
    const idx = GEO_CHAIN.indexOf(level);
    const cleared = { ...value };
    // Clear current and all downstream
    GEO_CHAIN.slice(idx).forEach(l => { cleared[`${l}_id`] = ""; });
    onChange({ ...cleared, [`${level}_id`]: id });
  };

  const filtered = (level) => {
    const idx = GEO_CHAIN.indexOf(level);
    if (idx === 0) return allRecords[level] || [];
    const parentLevel = GEO_CHAIN[idx - 1];
    const parentId    = value[`${parentLevel}_id`];
    if (!parentId) return [];
    return (allRecords[level] || []).filter(r => r[`${parentLevel}_id`] === parentId);
  };

  const levels = [
    { key: "city",     label: "City / Province" },
    { key: "district", label: "District" },
    { key: "sector",   label: "Sector" },
    { key: "cell",     label: "Cell" },
    { key: "village",  label: "Village" },
  ];

  return (
    <div className="rpt-loc-grid">
      {levels.map(({ key, label }, idx) => {
        const parentSelected = idx === 0 || !!value[`${GEO_CHAIN[idx - 1]}_id`];
        const opts = filtered(key);
        const disabled = !parentSelected;
        return (
          <div key={key} className="rpt-loc-item">
            <label className="rpt-loc-label">
              {label}
              {disabled && <span className="rpt-loc-hint"> — select {GEO_CHAIN[idx - 1]} first</span>}
            </label>
            <select
              className={`rpt-select${disabled ? " rpt-select--disabled" : ""}`}
              disabled={disabled}
              value={get(key)}
              onChange={e => set(key, e.target.value)}
            >
              <option value="">All {label}s</option>
              {opts.map(r => (
                <option key={r.id} value={r.id}>{r.name || r.code}</option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
}

// ─── Indicator Section ────────────────────────────────────────
function IndicatorSection({ indicator, records, year }) {
  const fields = INDICATOR_FIELDS[indicator.key] || [];
  const data   = records[indicator.key] || [];

  // Filter by year if chosen
  const filtered = year ? data.filter(r => String(r.year) === String(year)) : data;

  return (
    <div className="rpt-section">
      <div className="rpt-section-header" style={{ borderLeftColor: indicator.color }}>
        <span className="rpt-section-icon">{indicator.icon}</span>
        <h2 className="rpt-section-title">{indicator.label}</h2>
        <span className="rpt-section-count">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="rpt-empty">No data available for this location and year</div>
      ) : (
        <div className="rpt-table-wrap">
          <table className="rpt-table">
            <thead>
              <tr>
                <th>Year</th>
                {indicator.key === "agriculture" && <th>Season</th>}
                {fields.filter(f => f.key !== "season").map(f => (
                  <th key={f.key}>{f.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={row.id || i}>
                  <td className="rpt-td-year">{row.year ?? "—"}</td>
                  {indicator.key === "agriculture" && <td><span className="rpt-badge">{row.season || "—"}</span></td>}
                  {fields.filter(f => f.key !== "season").map(f => (
                    <td key={f.key} className="rpt-td-num">{fmt(row[f.key], f.unit)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Summary Cards ────────────────────────────────────────────
function SummaryCards({ records, selectedIndicators }) {
  const summaries = [];

  if (selectedIndicators.includes("labor_market")) {
    const rows = records.labor_market || [];
    const latest = rows.sort((a, b) => b.year - a.year)[0];
    if (latest) {
      summaries.push({ label: "Total Employment",  value: fmt(latest.total_enterprise_employment), icon: "👷", color: "#f5a623" });
      summaries.push({ label: "Unemployment Rate", value: fmt(latest.unemployment_rate_pct, "%"),  icon: "📉", color: "#f05252" });
    }
  }
  if (selectedIndicators.includes("business_enterprise")) {
    const rows = records.business_enterprise || [];
    const latest = rows.sort((a, b) => b.year - a.year)[0];
    if (latest) {
      summaries.push({ label: "Total Businesses",  value: fmt(latest.total_businesses),          icon: "🏢", color: "#f5a623" });
      summaries.push({ label: "Formal Enterprises",value: fmt(latest.formal_enterprises),        icon: "✅", color: "#4ade80" });
    }
  }
  if (selectedIndicators.includes("infrastructure")) {
    const rows = records.infrastructure || [];
    const latest = rows.sort((a, b) => b.year - a.year)[0];
    if (latest) {
      summaries.push({ label: "Electricity Access", value: fmt(latest.electricity_share_of_hh_pct, "%"), icon: "⚡", color: "#fbbf24" });
      summaries.push({ label: "Water Customers",    value: fmt(latest.water_customers),                  icon: "💧", color: "#60a5fa" });
    }
  }
  if (selectedIndicators.includes("youth_education")) {
    const rows = records.youth_education || [];
    const latest = rows.sort((a, b) => b.year - a.year)[0];
    if (latest) {
      summaries.push({ label: "Literacy Rate",      value: fmt(latest.literacy_rate_pct, "%"),    icon: "📖", color: "#a78bfa" });
      summaries.push({ label: "Internet Usage",     value: fmt(latest.internet_usage_pct, "%"),   icon: "🌐", color: "#60a5fa" });
    }
  }
  if (selectedIndicators.includes("financial_inclusion")) {
    const rows = records.financial_inclusion || [];
    const latest = rows.sort((a, b) => b.year - a.year)[0];
    if (latest) {
      summaries.push({ label: "Banked Population",  value: fmt(latest.banked_population_pct, "%"),        icon: "🏦", color: "#a78bfa" });
      summaries.push({ label: "Mobile Money",       value: fmt(latest.mobile_money_penetration_pct, "%"), icon: "📱", color: "#4ade80" });
    }
  }
  if (selectedIndicators.includes("agriculture")) {
    const rows = records.agriculture || [];
    const latest = rows.sort((a, b) => b.year - a.year)[0];
    if (latest) {
      summaries.push({ label: "Cereal Production",  value: fmt(latest.cereal_production_mt, " MT"), icon: "🌾", color: "#4ade80" });
      summaries.push({ label: "Maize Yield",        value: fmt(latest.maize_yield_kg_ha, " kg/ha"), icon: "🌽", color: "#fbbf24" });
    }
  }

  if (!summaries.length) return null;

  return (
    <div className="rpt-summary-grid">
      {summaries.map((s, i) => (
        <div key={i} className="rpt-summary-card" style={{ borderTopColor: s.color }}>
          <div className="rpt-summary-icon">{s.icon}</div>
          <div className="rpt-summary-value">{s.value}</div>
          <div className="rpt-summary-label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Report Page ─────────────────────────────────────────
export default function ReportPage({ allRecords }) {
  const [location, setLocation]           = useState({});
  const [selectedYear, setSelectedYear]   = useState("");
  const [selectedInds, setSelectedInds]   = useState(INDICATORS.map(i => i.key));
  const [reportData, setReportData]       = useState(null);
  const [locationLabel, setLocationLabel] = useState("");
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState("");
  const printRef = useRef(null);

  // Build years list from 2018 to current year
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2017 }, (_, i) => String(2018 + i)).reverse();

  // Resolve human-readable location label
  function resolveLabel(loc) {
    const parts = [];
    GEO_CHAIN.forEach(level => {
      const id = loc[`${level}_id`];
      if (!id) return;
      const rec = (allRecords[level] || []).find(r => r.id === id);
      if (rec) parts.push(rec.name || rec.code);
    });
    return parts.length ? parts.join(" › ") : "All Locations";
  }

  // Build Supabase filter params from location selection
  function buildFilters(loc) {
    const filters = {};
    GEO_CHAIN.forEach(level => {
      const id = loc[`${level}_id`];
      if (id) filters[`${level}_id`] = id;
    });
    return filters;
  }

  async function generateReport() {
    setLoading(true);
    setError("");
    setReportData(null);

    try {
      const filters  = buildFilters(location);
      const label    = resolveLabel(location);
      setLocationLabel(label);

      const results  = {};
      await Promise.all(
        selectedInds.map(async (indKey) => {
          try {
            // Fetch with location filters — api.getAll supports filter object as 2nd arg
            let rows = await api.getAll(indKey, filters);
            // Also filter by year client-side if selected
            if (selectedYear) rows = rows.filter(r => String(r.year) === selectedYear);
            results[indKey] = rows;
          } catch {
            results[indKey] = [];
          }
        })
      );

      setReportData(results);
    } catch (e) {
      setError(e.message || "Failed to fetch report data");
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  async function handleExportCSV() {
    if (!reportData) return;
    const parts = [];
    selectedInds.forEach(key => {
      const ind  = INDICATORS.find(i => i.key === key);
      const rows = reportData[key] || [];
      if (!rows.length) return;
      const fields = INDICATOR_FIELDS[key] || [];
      const headers = ["year", ...fields.map(f => f.key)];
      parts.push(`\n=== ${ind?.label} ===`);
      parts.push(headers.join(","));
      rows.forEach(r => parts.push(headers.map(h => JSON.stringify(r[h] ?? "")).join(",")));
    });
    const blob = new Blob([parts.join("\n")], { type: "text/csv" });
    const a    = document.createElement("a");
    a.href     = URL.createObjectURL(blob);
    a.download = `report_${locationLabel.replace(/ › /g, "_")}_${selectedYear || "all"}.csv`;
    a.click();
  }

  const hasLocation = Object.values(location).some(Boolean);

  return (
    <div className="rpt-page" ref={printRef}>
      {/* ── Control Panel ── */}
      <div className="rpt-controls no-print">
        <div className="rpt-controls-header">
          <div>
            <h2 className="rpt-ctrl-title">📊 Generate Report</h2>
            <p className="rpt-ctrl-sub">Select a location and indicators then generate</p>
          </div>
        </div>

        {/* Location picker */}
        <div className="rpt-ctrl-section">
          <div className="rpt-ctrl-section-label">📍 Location</div>
          <LocationSelector allRecords={allRecords} value={location} onChange={setLocation} />
        </div>

        {/* Year filter */}
        <div className="rpt-ctrl-section">
          <div className="rpt-ctrl-section-label">📅 Year</div>
          <select className="rpt-select rpt-select--year" value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}>
            <option value="">All years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* Indicator toggles */}
        <div className="rpt-ctrl-section">
          <div className="rpt-ctrl-section-label">📋 Indicators</div>
          <div className="rpt-ind-toggles">
            {INDICATORS.map(ind => {
              const on = selectedInds.includes(ind.key);
              return (
                <button key={ind.key}
                  className={`rpt-ind-toggle${on ? " on" : ""}`}
                  style={on ? { borderColor: ind.color, background: ind.color + "18", color: ind.color } : {}}
                  onClick={() => setSelectedInds(prev =>
                    on ? prev.filter(k => k !== ind.key) : [...prev, ind.key]
                  )}>
                  {ind.icon} {ind.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Generate button */}
        <div className="rpt-ctrl-actions">
          <button className="rpt-btn-generate"
            disabled={loading || selectedInds.length === 0}
            onClick={generateReport}>
            {loading ? <><Spinner /> Generating…</> : "Generate Report"}
          </button>
          {reportData && (
            <>
              <button className="rpt-btn-export" onClick={handlePrint}>🖨 Print / PDF</button>
              <button className="rpt-btn-export" onClick={handleExportCSV}>⬇ Export CSV</button>
            </>
          )}
        </div>

        {error && <div className="rpt-error">{error}</div>}
      </div>

      {/* ── Report Output ── */}
      {reportData && (
        <div className="rpt-output">
          {/* Report header */}
          <div className="rpt-header">
            <div className="rpt-header-meta">
              <div className="rpt-header-logo">
                <svg width="22" height="22" viewBox="0 0 16 16" fill="white"><path d="M8 1L2 4v8l6 3 6-3V4L8 1z"/></svg>
              </div>
              <div>
                <div className="rpt-header-org">Republic of Rwanda — City of Kigali</div>
                <div className="rpt-header-sub">Microeconomic Indicators Report</div>
              </div>
            </div>
            <div className="rpt-header-right">
              <div className="rpt-header-location">📍 {locationLabel}</div>
              {selectedYear && <div className="rpt-header-year">📅 {selectedYear}</div>}
              <div className="rpt-header-generated">Generated: {new Date().toLocaleDateString()}</div>
            </div>
          </div>

          {/* Summary KPI cards */}
          <SummaryCards records={reportData} selectedIndicators={selectedInds} />

          {/* Indicator sections */}
          {INDICATORS.filter(i => selectedInds.includes(i.key)).map(ind => (
            <IndicatorSection
              key={ind.key}
              indicator={ind}
              records={reportData}
              year={selectedYear}
            />
          ))}

          {/* Footer */}
          <div className="rpt-footer">
            <div>City of Kigali — Microeconomic Indicators Database</div>
            <div>Report generated on {new Date().toLocaleString()}</div>
          </div>
        </div>
      )}

      {!reportData && !loading && (
        <div className="rpt-placeholder">
          <div className="rpt-placeholder-icon">📊</div>
          <p className="rpt-placeholder-title">No report generated yet</p>
          <p className="rpt-placeholder-sub">
            Select a location{selectedYear ? "" : " and optionally a year"}, choose your indicators, then click Generate Report.
          </p>
        </div>
      )}
    </div>
  );
}