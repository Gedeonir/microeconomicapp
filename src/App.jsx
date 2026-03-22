import { useState, useEffect, useCallback, useRef } from "react";
import { SCHEMA, GROUPS, GROUP_COLORS } from "./lib/schema.js";
import { api, seedIfEmpty } from "./lib/api.js";
import { loadDynamicTables, registryToSchema, deleteIndicatorTable } from "./lib/tableManager.js";
import CreateTableModal from "./CreateTableModal.jsx";
import ReportPage from "./ReportPage.jsx";

// ─────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────
function fmtNum(val, type) {
  if (val === null || val === undefined || val === "") return "—";
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  if (type === "decimal") return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return Math.round(n).toLocaleString();
}
function fmtId(id) { return id ? id.slice(0, 8) + "…" : "—"; }
// Format sidebar counts: 0–999 as-is, 1000+ as "1.2k", 1000000+ as "1.2m"
function fmtCount(n) {
  if (n === null || n === undefined) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "m";
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}
function download(filename, content, mime) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type: mime }));
  a.download = filename; a.click();
}

// ─────────────────────────────────────────────────────────────
// ICONS (inline SVG helpers)
// ─────────────────────────────────────────────────────────────
const Icon = {
  Home:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Search:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
  Plus:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  Menu:    () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  ChevL:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>,
  ChevR:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>,
  Eye:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  EyeOff:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  Download:() => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Edit:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Trash:   () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Database:() => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  Filter:  () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  Columns: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>,
  Check:   () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Globe:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  Users:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Shield:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Leaf:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>,
  Briefcase:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
  Report:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
};

const GROUP_ICONS = {
  Core: Icon.Globe, Demographics: Icon.Users, Economy: Icon.Briefcase,
  Society: Icon.Users, Environment: Icon.Leaf, Safety: Icon.Shield,
};

// ─────────────────────────────────────────────────────────────
// GEO CASCADE HELPERS
// The hierarchy is: city → district → sector → cell → village
// Each FK col references one of these geo tables. When a parent
// changes we clear all children automatically.
// ─────────────────────────────────────────────────────────────
const GEO_CHAIN = ["city", "district", "sector", "cell", "village"];

// Tables that are read-only — no Add / Edit / Delete allowed
const READ_ONLY_TABLES = new Set(["city", "district", "sector", "cell", "village"]);

// Tables that are read-only — no Add / Edit / Delete allowed
// (populated via the locations data import, not manual entry)
const READONLY_TABLES = new Set(["city", "district", "sector", "cell", "village"]);

// For a given FK col, return the key of its geo level (or null)
function geoLevel(col) {
  if (!col || col.type !== "fk") return null;
  return GEO_CHAIN.includes(col.ref) ? col.ref : null;
}

// Return all geo FK cols for a schema in chain order
function orderedGeoCols(cols) {
  return GEO_CHAIN
    .map(level => cols.find(c => c.type === "fk" && c.ref === level))
    .filter(Boolean);
}

// Given current formData, return filtered options for a geo FK col
function filteredGeoOptions(col, allRecords, formData, schemaCols) {
  const ref = col.ref;
  const idx = GEO_CHAIN.indexOf(ref);
  if (idx === 0) return allRecords[ref] || []; // city — no parent filter

  const parentLevel = GEO_CHAIN[idx - 1];
  const parentCol = schemaCols.find(c => c.type === "fk" && c.ref === parentLevel);
  if (!parentCol) return allRecords[ref] || [];

  const parentId = formData[parentCol.key];
  if (!parentId) return [];

  const rows = allRecords[ref] || [];

  // The FK column name on the child table pointing to parent
  // e.g. district has city_id, sector has district_id, cell has sector_id, village has cell_id
  const fkField = `${parentLevel}_id`;
  return rows.filter(r => r[fkField] === parentId);
}

// When a geo FK value changes, clear all downstream geo FK fields
function clearDownstreamGeo(changedColKey, schemaCols, formData) {
  const changedCol = schemaCols.find(c => c.key === changedColKey);
  if (!changedCol) return formData;
  const level = geoLevel(changedCol);
  if (!level) return formData;
  const levelIdx = GEO_CHAIN.indexOf(level);

  const next = { ...formData };
  schemaCols.forEach(c => {
    if (c.type !== "fk") return;
    const cLevel = geoLevel(c);
    if (!cLevel) return;
    if (GEO_CHAIN.indexOf(cLevel) > levelIdx) {
      next[c.key] = "";
    }
  });
  return next;
}

// Build a full breadcrumb path for any geo FK value.
// e.g. village_id → "Kigali › Gasabo › Remera › Kanogo › Village 1"
// Stops at the level of the column itself (village_id shows all 5,
// district_id shows city › district, etc.)
function buildGeoPath(colRef, id, allRecords) {
  if (!id) return null;
  const levelIdx = GEO_CHAIN.indexOf(colRef);
  if (levelIdx === -1) return null;

  // Walk up from the target level collecting names
  const parts = [];
  let currentId = id;

  // Build from target level upward then reverse
  for (let i = levelIdx; i >= 0; i--) {
    const level = GEO_CHAIN[i];
    const rows  = allRecords[level] || [];
    const rec   = rows.find(r => r.id === currentId);
    if (!rec) break;
    parts.unshift(rec.name || rec.code || fmtId(rec.id));
    // Move to parent
    if (i > 0) {
      const parentLevel = GEO_CHAIN[i - 1];
      currentId = rec[`${parentLevel}_id`];
      if (!currentId) break;
    }
  }

  return parts.length ? parts.join(" › ") : null;
}

// ─────────────────────────────────────────────────────────────
// LOADING PRIMITIVES
// ─────────────────────────────────────────────────────────────
function Spinner({ size = 18, color = "var(--blue)" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: "spin .7s linear infinite", flexShrink: 0, display: "block" }}>
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}

function LoadingScreen({ message }) {
  return (
    <div className="loading-screen">
      <div className="loading-logo">
        <svg width="28" height="28" viewBox="0 0 16 16" fill="white"><path d="M8 1L2 4v8l6 3 6-3V4L8 1z"/></svg>
      </div>
      <Spinner size={24} color="var(--blue)" />
      <span className="loading-msg">{message}</span>
    </div>
  );
}

function Skeleton({ w = "60%", h = 12, radius = 4 }) {
  return <div style={{ height: h, width: w, borderRadius: radius, background: "var(--surface3)", animation: "shimmer 1.5s ease infinite" }} />;
}

function SkeletonRow({ cols }) {
  return (
    <tr className="skeleton-row">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i}><Skeleton w={`${45 + (i * 17) % 40}%`} /></td>
      ))}
    </tr>
  );
}

function SkeletonCard() {
  return (
    <div className="module-card skeleton-card">
      <Skeleton w={36} h={36} radius={8} />
      <Skeleton w="70%" h={12} />
      <Skeleton w="45%" h={10} />
    </div>
  );
}

function BtnSpinner() { return <Spinner size={13} color="currentColor" />; }

// ─────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = "info") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3800);
  }, []);
  return { toasts, toast: add };
}

function ToastContainer({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-dot" />
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────────────────────
function Modal({ open, title, subtitle, onClose, footer, size = "md", children }) {
  useEffect(() => {
    const fn = e => e.key === "Escape" && onClose();
    if (open) document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [open, onClose]);

  return (
    <div className={`modal-overlay${open ? " open" : ""}`}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal modal-${size}`}>
        <div className="modal-header">
          <div className="modal-header-text">
            <div className="modal-title">{title}</div>
            {subtitle && <div className="modal-subtitle">{subtitle}</div>}
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STEPPED FORM  — with cascading geo dropdowns
// ─────────────────────────────────────────────────────────────
function SteppedForm({ table, record = {}, allRecords, onChange, schema: schemaProp }) {
  const schema = schemaProp ? schemaProp[table] : SCHEMA[table];
  const cols = schema.columns.filter(c => !c.pk && !c.auto);

  // Separate geo FK cols (rendered in order) from other FK cols
  const geoCols    = orderedGeoCols(cols);
  const geoKeys    = new Set(geoCols.map(c => c.key));
  const nonGeoCols = cols.filter(c => !geoKeys.has(c.key));

  // non-geo FKs (e.g. any custom ref that isn't in the geo chain)
  const otherFkCols  = nonGeoCols.filter(c => c.type === "fk");
  const dataCols     = nonGeoCols.filter(c => c.type !== "fk");

  // Build steps
  // Step 1: Location (geo cascade) — only if geo cols exist
  // Step 2: Other references (non-geo FKs) — merged into location step if small
  // Step 3+: Data fields in chunks of 6
  const chunkSize = 6;
  const dataChunks = [];
  for (let i = 0; i < dataCols.length; i += chunkSize) {
    dataChunks.push(dataCols.slice(i, i + chunkSize));
  }

  const steps = [];
  if (geoCols.length || otherFkCols.length) {
    steps.push({
      label: "Location",
      icon: "📍",
      geoCols,
      otherFkCols,
      cols: [],       // handled specially
      isLocation: true,
    });
  }
  dataChunks.forEach((chunk, i) => {
    steps.push({
      label: dataChunks.length === 1 ? "Data" : `Data ${i + 1}/${dataChunks.length}`,
      icon: "📝",
      cols: chunk,
      isLocation: false,
    });
  });

  const [step, setStep] = useState(0);
  const totalSteps = steps.length;
  const currentStep = steps[step] || steps[0];

  // ── Field renderer ──────────────────────────────────────
  function renderGeoField(col) {
    const val = record[col.key] ?? "";
    const options = filteredGeoOptions(col, allRecords, record, cols);
    const refSchema = SCHEMA[col.ref];
    const parentLevel = GEO_CHAIN[GEO_CHAIN.indexOf(col.ref) - 1];
    const parentCol = cols.find(c => c.type === "fk" && c.ref === parentLevel);
    const parentSelected = parentCol ? !!record[parentCol.key] : true;
    const disabled = GEO_CHAIN.indexOf(col.ref) > 0 && !parentSelected;

    return (
      <div key={col.key} className="form-group form-group--full">
        <label className="form-label">
          {col.label}
          {col.required && <span className="req">*</span>}
          {disabled && (
            <span className="form-hint form-hint--inline">
              — select {parentLevel} first
            </span>
          )}
        </label>
        <select
          className={`form-select${disabled ? " form-select--disabled" : ""}`}
          value={val}
          disabled={disabled}
          required={col.required}
          onChange={e => {
            // Clear downstream geo fields then set this value
            const cleared = clearDownstreamGeo(col.key, cols, record);
            // Batch: first clear downstream, then set new value
            Object.entries(cleared).forEach(([k, v]) => {
              if (k !== col.key) onChange(k, v);
            });
            onChange(col.key, e.target.value);
          }}
        >
          <option value="">
            {disabled
              ? `— select ${parentLevel} first —`
              : `— Select ${refSchema?.label || col.ref} —`}
          </option>
          {options.map(r => (
            <option key={r.id} value={r.id}>
              {r.name || r.code || fmtId(r.id)}
            </option>
          ))}
        </select>
        {options.length === 0 && !disabled && (
          <span className="form-hint form-hint--warn">
            No {refSchema?.label || col.ref} records found
          </span>
        )}
      </div>
    );
  }

  function renderField(col) {
    const val = record[col.key] ?? "";

    // Non-geo FK
    if (col.type === "fk") {
      const refRows = allRecords[col.ref] || [];
      const refSchema = SCHEMA[col.ref];
      return (
        <div key={col.key} className="form-group form-group--full">
          <label className="form-label">
            {col.label}{col.required && <span className="req">*</span>}
          </label>
          <select className="form-select" value={val}
            onChange={e => onChange(col.key, e.target.value)} required={col.required}>
            <option value="">— Select {refSchema?.label || col.ref} —</option>
            {refRows.map(r => (
              <option key={r.id} value={r.id}>{r.name || r.fiscal_year || fmtId(r.id)}</option>
            ))}
          </select>
        </div>
      );
    }

    if (col.type === "select") {
      return (
        <div key={col.key} className="form-group">
          <label className="form-label">
            {col.label}{col.required && <span className="req">*</span>}
          </label>
          <select className="form-select" value={val}
            onChange={e => onChange(col.key, e.target.value)} required={col.required}>
            <option value="">— Select —</option>
            {(col.options || []).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      );
    }

    const inputType = col.type === "integer" || col.type === "bigint" || col.type === "decimal"
      ? "number" : "text";
    const stepAttr = col.type === "decimal" ? "any"
      : col.type === "integer" || col.type === "bigint" ? "1" : undefined;

    return (
      <div key={col.key} className="form-group">
        <label className="form-label">
          {col.label}{col.required && <span className="req">*</span>}
        </label>
        <input className="form-input" type={inputType} step={stepAttr} value={val}
          placeholder={col.example || ""} required={col.required}
          onChange={e => onChange(col.key, e.target.value)} />
        {col.example && <span className="form-hint">e.g. {col.example}</span>}
      </div>
    );
  }

  return (
    <div className="stepped-form">
      {/* Step progress bar */}
      {totalSteps > 1 && (
        <div className="step-progress">
          {steps.map((s, i) => (
            <div key={i} className="step-dot-wrap" onClick={() => setStep(i)}>
              <div className={`step-dot${i === step ? " active" : i < step ? " done" : ""}`}>
                {i < step ? <Icon.Check /> : i + 1}
              </div>
              <span className="step-dot-label">{s.label}</span>
              {i < totalSteps - 1 && <div className={`step-line${i < step ? " done" : ""}`} />}
            </div>
          ))}
        </div>
      )}

      {/* Current step body */}
      <div className="form-step-body">
        <div className="form-step-title">{currentStep.icon} {currentStep.label}</div>

        {currentStep.isLocation ? (
          <div className="form-grid">
            {/* Geo cascade dropdowns in chain order */}
            {currentStep.geoCols.map(col => renderGeoField(col))}
            {/* Any non-geo FK fields */}
            {currentStep.otherFkCols.map(col => renderField(col))}
          </div>
        ) : (
          <div className="form-grid">
            {currentStep.cols.map(col => renderField(col))}
          </div>
        )}
      </div>

      {/* Step nav */}
      {totalSteps > 1 && (
        <div className="step-nav">
          <button className="btn btn-ghost btn-sm" disabled={step === 0}
            onClick={() => setStep(s => s - 1)}>← Previous</button>
          <span className="step-counter">{step + 1} / {totalSteps}</span>
          <button className="btn btn-outline-blue btn-sm" disabled={step === totalSteps - 1}
            onClick={() => setStep(s => s + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COLUMN VISIBILITY PANEL
// ─────────────────────────────────────────────────────────────
function ColVisPanel({ schema, visible, onChange, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [onClose]);

  return (
    <div className="col-vis-panel" ref={ref}>
      <div className="col-vis-header">Visible columns</div>
      {schema.display.map(col => {
        const c = schema.columns.find(x => x.key === col) || { label: col };
        const isVis = visible.includes(col);
        return (
          <label key={col} className="col-vis-row">
            <span className={`col-vis-check${isVis ? " on" : ""}`}>
              {isVis && <Icon.Check />}
            </span>
            <span className="col-vis-label">{c.label}</span>
            <input type="checkbox" checked={isVis} style={{ display: "none" }}
              onChange={() => onChange(col)} />
          </label>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DATA TABLE
// ─────────────────────────────────────────────────────────────
const PAGE_SIZE = 15;

function DataTable({ table, allRecords, onEdit, onDelete, tableLoading, schemaOverride, isReadOnly }) {
  const schema = schemaOverride || SCHEMA[table];
  const rows = allRecords[table] || [];
  const [q, setQ] = useState("");
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState(1);
  const [page, setPage] = useState(1);
  const [visibleCols, setVisibleCols] = useState(schema.display);
  const [showColVis, setShowColVis] = useState(false);

  useEffect(() => {
    setPage(1); setQ(""); setSortCol(null);
    setVisibleCols(schema.display);
    setShowColVis(false);
  }, [table]);

  const search = q.toLowerCase();
  let filtered = search
    ? rows.filter(r => visibleCols.some(c => String(r[c] ?? "").toLowerCase().includes(search)))
    : rows;

  if (sortCol) {
    filtered = [...filtered].sort((a, b) => {
      const av = a[sortCol] ?? "", bv = b[sortCol] ?? "";
      return (av < bv ? -1 : av > bv ? 1 : 0) * sortDir;
    });
  }

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  function handleSort(col) {
    if (sortCol === col) setSortDir(d => d * -1);
    else { setSortCol(col); setSortDir(1); }
  }

  function toggleCol(col) {
    setVisibleCols(v => v.includes(col) ? (v.length > 1 ? v.filter(c => c !== col) : v) : [...v, col]);
  }

  function cellValue(col, val) {
    const c = schema.columns.find(x => x.key === col) || {};
    if (val === null || val === undefined || val === "") return <span className="cell-null">—</span>;

    if (c.type === "fk") {
      // Geo hierarchy FK → show full breadcrumb path "City › District › Sector › …"
      if (GEO_CHAIN.includes(c.ref)) {
        const path = buildGeoPath(c.ref, val, allRecords);
        if (path) {
          return (
            <span className="badge badge-geo" title={path}>
              {path}
            </span>
          );
        }
        return <span className="badge badge-blue">{fmtId(val)}</span>;
      }
      // Non-geo FK → name as before
      const refSch = SCHEMA[c.ref];
      const refRec = refSch ? (allRecords[c.ref] || []).find(x => x.id === val) : null;
      const label  = refRec ? (refRec.name || refRec.fiscal_year || fmtId(refRec.id)) : fmtId(val);
      return <span className="badge badge-blue">{label}</span>;
    }

    if (c.type === "select") return <span className="badge badge-green">{val}</span>;
    if (c.type === "integer" || c.type === "bigint" || c.type === "decimal")
      return <span className="cell-num">{fmtNum(val, c.type)}</span>;
    const str = String(val);
    return str.length > 40 ? str.slice(0, 40) + "…" : str;
  }

  const hiddenCount = schema.display.length - visibleCols.length;

  return (
    <div className="dt-wrap">
      <div className="dt-toolbar">
        <div className="dt-search-wrap">
          <span className="dt-search-icon"><Icon.Search /></span>
          <input className="dt-search" placeholder="Search records…" value={q}
            onChange={e => { setQ(e.target.value); setPage(1); }} />
          {q && <button className="dt-clear" onClick={() => setQ("")}>×</button>}
        </div>
        {tableLoading && (
          <span className="dt-syncing">
            <Spinner size={12} color="var(--blue)" /> Syncing…
          </span>
        )}
        <div className="dt-toolbar-right">
          <span className="dt-count">{total.toLocaleString()} record{total !== 1 ? "s" : ""}</span>
          <div style={{ position: "relative" }}>
            <button className={`btn btn-ghost btn-sm${hiddenCount ? " btn-active" : ""}`}
              onClick={() => setShowColVis(v => !v)} title="Toggle columns">
              <Icon.Columns /> Columns
              {hiddenCount > 0 && <span className="col-badge">{hiddenCount}</span>}
            </button>
            {showColVis && (
              <ColVisPanel schema={schema} visible={visibleCols}
                onChange={toggleCol} onClose={() => setShowColVis(false)} />
            )}
          </div>
          <button className="btn btn-ghost btn-sm" disabled={tableLoading}
            onClick={() => exportCSV(table, rows, schema)}>
            <Icon.Download /> Export
          </button>
        </div>
      </div>

      <div className="dt-scroller">
        <table className="dt">
          <thead>
            <tr>
              <th className="th-id">ID</th>
              {visibleCols.map(col => {
                const c = schema.columns.find(x => x.key === col) || { label: col };
                const sorted = sortCol === col;
                return (
                  <th key={col} className={sorted ? "sorted" : ""} onClick={() => handleSort(col)}>
                    {c.label}
                    <span className="sort-icon">{sorted ? (sortDir === 1 ? " ↑" : " ↓") : " ↕"}</span>
                  </th>
                );
              })}
              {!isReadOnly && <th className="th-actions">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {tableLoading && rows.length === 0
              ? Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} cols={visibleCols.length + 2} />)
              : pageRows.length === 0
              ? <tr><td colSpan={visibleCols.length + (isReadOnly ? 1 : 2)} className="dt-empty">
                  <div className="dt-empty-inner">
                    <Icon.Database />
                    <span>{q ? "No records match your search" : "No records yet — click Add Record"}</span>
                  </div>
                </td></tr>
              : pageRows.map(r => (
                <tr key={r.id} style={{ opacity: tableLoading ? .45 : 1, transition: "opacity .2s" }}>
                  <td className="cell-id" title={r.id}>{fmtId(r.id)}</td>
                  {visibleCols.map(col => <td key={col}>{cellValue(col, r[col])}</td>)}
                  {!isReadOnly && (
                    <td className="cell-actions">
                      <button className="icon-btn" title="Edit" disabled={tableLoading}
                        onClick={() => onEdit(table, r.id)}><Icon.Edit /></button>
                      <button className="icon-btn del" title="Delete" disabled={tableLoading}
                        onClick={() => onDelete(table, r.id)}><Icon.Trash /></button>
                    </td>
                  )}
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      <div className="dt-pagination">
        <span className="pg-info">
          {total === 0 ? "No records" : `${start + 1}–${Math.min(start + PAGE_SIZE, total)} of ${total.toLocaleString()}`}
        </span>
        <div className="pg-btns">
          <button className="pg-btn" disabled={safePage <= 1 || tableLoading}
            onClick={() => setPage(p => p - 1)}><Icon.ChevL /></button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
            <button key={p} className={`pg-btn${p === safePage ? " active" : ""}`}
              disabled={tableLoading} onClick={() => setPage(p)}>{p}</button>
          ))}
          {totalPages > 7 && <span className="pg-ellipsis">…{totalPages}</span>}
          <button className="pg-btn" disabled={safePage >= totalPages || tableLoading}
            onClick={() => setPage(p => p + 1)}><Icon.ChevR /></button>
        </div>
      </div>
    </div>
  );
}

function exportCSV(table, rows, schema) {
  if (!rows.length) return;
  const cols = schema.columns.map(c => c.key);
  const csv = [cols.join(","), ...rows.map(r => cols.map(c => JSON.stringify(r[c] ?? "")).join(","))].join("\n");
  download(`${table}_${new Date().toISOString().slice(0,10)}.csv`, csv, "text/csv");
}

// ─────────────────────────────────────────────────────────────
// BREADCRUMBS
// ─────────────────────────────────────────────────────────────
function Breadcrumbs({ current, onNavigate, schema: schemaProp }) {
  if (current === "home") return null;
  const schema = schemaProp || SCHEMA[current];
  return (
    <nav className="breadcrumbs">
      <button className="crumb crumb-link" onClick={() => onNavigate("home")}>Overview</button>
      <span className="crumb-sep">›</span>
      {schema && <span className="crumb-active">{schema.icon} {schema.label}</span>}
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────
// OVERVIEW PAGE
// ─────────────────────────────────────────────────────────────
function OverviewPage({ counts, onNavigate, initialLoading, fullSchema: fSchema, onCreateTable }) {
  const schemaToUse = fSchema || SCHEMA;
  const customTables = Object.entries(schemaToUse).filter(([, s]) => s.dynamic);

  return (
    <div className="page">
      <div className="hero-banner">
        <div className="hero-content">
          <div className="hero-badge">Republic of Rwanda</div>
          <h1 className="hero-title">Microeconomic Indicators Database</h1>
          <p className="hero-desc">
            Central data management portal for tracking, updating and monitoring
            Kigali's economic, social and environmental indicators across 17 modules.
          </p>
        </div>
      </div>

      {GROUPS.map(group => {
        const GroupIcon = GROUP_ICONS[group] || Icon.Database;
        const tables = Object.entries(schemaToUse).filter(([, s]) => s.group === group && !s.dynamic);
        if (tables.length === 0) return null;
        const groupTotal = tables.reduce((sum, [k]) => sum + (counts[k] || 0), 0);
        return (
          <div key={group} className="module-group">
            <div className="group-header">
              <div className="group-icon-wrap"><GroupIcon /></div>
              <div>
                <div className="group-label">{group}</div>
                <div className="group-sub">{tables.length} tables · {fmtCount(groupTotal)} records</div>
              </div>
            </div>
            <div className="modules-grid">
              {initialLoading
                ? Array.from({ length: tables.length }).map((_, i) => <SkeletonCard key={i} />)
                : tables.map(([key, s]) => {
                  const count = counts[key] || 0;
                  return (
                    <button key={key} className="module-card" onClick={() => onNavigate(key)}>
                      <div className="module-card-top">
                        <div className="module-icon" style={{ background: s.color + "18", border: `1px solid ${s.color}28` }}>
                          {s.icon}
                        </div>
                        <div className={`module-status${count > 0 ? " populated" : ""}`}>
                          {count > 0 ? "●" : "○"}
                        </div>
                      </div>
                      <div className="module-name">{s.label}</div>
                      <div className="module-meta">{s.columns.length} columns</div>
                      <div className="module-count">{fmtCount(count)} records</div>
                    </button>
                  );
                })
              }
            </div>
          </div>
        );
      })}

      <div className="module-group">
        <div className="group-header">
          <div className="group-icon-wrap" style={{ background: "var(--yellow-light)", borderColor: "rgba(232,180,0,.2)", color: "var(--yellow-deep)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>
            </svg>
          </div>
          <div>
            <div className="group-label" style={{ color: "var(--yellow-deep)" }}>Custom Indicators</div>
            <div className="group-sub">{customTables.length} user-defined tables</div>
          </div>
          <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={onCreateTable}>
            <Icon.Plus /> New Indicator
          </button>
        </div>
        {customTables.length === 0 ? (
          <div className="custom-tables-empty">
            <div className="custom-tables-empty-icon">📊</div>
            <p className="custom-tables-empty-title">No custom indicators yet</p>
            <p className="custom-tables-empty-sub">Click "New Indicator" to define your own table with custom columns.</p>
            <button className="btn btn-primary" onClick={onCreateTable}>
              <Icon.Plus /> Create first indicator
            </button>
          </div>
        ) : (
          <div className="modules-grid">
            {customTables.map(([key, s]) => {
              const count = counts[key] || 0;
              return (
                <button key={key} className="module-card module-card--custom" onClick={() => onNavigate(key)}>
                  <div className="module-card-top">
                    <div className="module-icon" style={{ background: "rgba(99,102,241,.12)", border: "1px solid rgba(99,102,241,.2)" }}>
                      {s.icon}
                    </div>
                    <span className="custom-badge">custom</span>
                  </div>
                  <div className="module-name">{s.label}</div>
                  <div className="module-meta">{s.columns.length} columns</div>
                  <div className="module-count">{fmtCount(count)} records</div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TABLE PAGE
// ─────────────────────────────────────────────────────────────
function TablePage({ table, allRecords, counts, onEdit, onDelete, onAdd, tableLoading, onNavigate, schema: schemaProp, isDynamic, onDeleteTable }) {
  const schema = schemaProp || SCHEMA[table];
  const count = counts[table] || 0;
  const isReadOnly = READ_ONLY_TABLES.has(table);
  return (
    <div className="page">
      <Breadcrumbs current={table} onNavigate={onNavigate} schema={schema} />
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">
            <span className="page-title-icon">{schema.icon}</span>
            {schema.label}
            {isDynamic && <span className="custom-badge custom-badge--title">custom</span>}
            {isReadOnly && <span className="readonly-badge">read only</span>}
          </h1>
          <div className="page-meta-row">
            <span className="page-meta">{schema.columns.length} columns</span>
            <span className="meta-sep">·</span>
            <span className="page-meta">{count.toLocaleString()} records</span>
            <span className="meta-sep">·</span>
            <span className="page-meta page-meta-group">{schema.group}</span>
            {tableLoading && <Spinner size={12} color="var(--blue)" />}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {isDynamic && !isReadOnly && (
            <button className="btn btn-danger btn-sm" disabled={tableLoading} onClick={onDeleteTable}>
              <Icon.Trash /> Delete table
            </button>
          )}
          {isReadOnly
            ? <span className="readonly-hint">Location data is managed via SQL imports</span>
            : (
              <button className="btn btn-primary" disabled={tableLoading} onClick={() => onAdd(table)}>
                <Icon.Plus /> Add Record
              </button>
            )
          }
        </div>
      </div>
      <DataTable table={table} allRecords={allRecords} onEdit={onEdit} onDelete={onDelete}
        tableLoading={tableLoading} schemaOverride={schema} isReadOnly={isReadOnly} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// GLOBAL SEARCH
// ─────────────────────────────────────────────────────────────
function GlobalSearch({ allRecords, onNavigate, onClose }) {
  const [q, setQ] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = [];
  if (q.length >= 2) {
    Object.entries(SCHEMA).forEach(([tableKey, schema]) => {
      const rows = allRecords[tableKey] || [];
      rows.forEach(row => {
        const match = schema.display.some(col =>
          String(row[col] ?? "").toLowerCase().includes(q.toLowerCase())
        );
        if (match && results.length < 20) {
          const label = schema.display.slice(0, 2).map(col => row[col] ?? "").filter(Boolean).join(" · ");
          results.push({ tableKey, schema, row, label });
        }
      });
    });
  }

  return (
    <div className="gsearch-wrap">
      <div className="gsearch-input-row">
        <Icon.Search />
        <input ref={inputRef} className="gsearch-input" placeholder="Search all tables…"
          value={q} onChange={e => setQ(e.target.value)} />
        <button className="gsearch-esc" onClick={onClose}>ESC</button>
      </div>
      {q.length >= 2 && (
        <div className="gsearch-results">
          {results.length === 0
            ? <div className="gsearch-empty">No results for "{q}"</div>
            : results.map((r, i) => (
              <button key={i} className="gsearch-result"
                onClick={() => { onNavigate(r.tableKey); onClose(); }}>
                <span className="gsearch-icon">{r.schema.icon}</span>
                <div className="gsearch-text">
                  <span className="gsearch-label">{r.label || fmtId(r.row.id)}</span>
                  <span className="gsearch-table">{r.schema.label}</span>
                </div>
              </button>
            ))
          }
        </div>
      )}
      {q.length === 0 && (
        <div className="gsearch-hint">
          {Object.keys(SCHEMA).map(k => (
            <button key={k} className="gsearch-chip" onClick={() => { onNavigate(k); onClose(); }}>
              {SCHEMA[k].icon} {SCHEMA[k].label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────────────────────
function Sidebar({ current, counts, onNavigate, mobileOpen, onMobileClose, dbConnected, collapsed, onToggleCollapse, dynamicSchema, onDeleteTable }) {
  return (
    <>
      {mobileOpen && <div className="sidebar-backdrop" onClick={onMobileClose} />}
      <aside className={`sidebar${collapsed ? " sidebar--collapsed" : ""}${mobileOpen ? " sidebar--open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="white"><path d="M8 1L2 4v8l6 3 6-3V4L8 1z"/></svg>
          </div>
          {!collapsed && (
            <div className="brand-text">
              <div className="brand-name">CoK Indicators</div>
              <div className="brand-sub">Data Management</div>
            </div>
          )}
          <button className="sidebar-close-btn" onClick={onMobileClose}>×</button>
          <button className="sidebar-collapse-btn" onClick={onToggleCollapse} title={collapsed ? "Expand" : "Collapse"}>
            {collapsed ? <Icon.ChevR /> : <Icon.ChevL />}
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className={`nav-item${current === "home" ? " active" : ""}`}
            onClick={() => { onNavigate("home"); onMobileClose(); }}
            title={collapsed ? "Overview" : ""}>
            <span className="nav-icon"><Icon.Home /></span>
            {!collapsed && <><span className="nav-label">Overview</span>
              <span className="nav-count">{fmtCount(Object.values(counts).reduce((s, n) => s + n, 0))}</span>
            </>}
          </div>

          {/* <div
            className={`nav-item${current === "report" ? " active" : ""}`}
            onClick={() => { onNavigate("report"); onMobileClose(); }}
            title={collapsed ? "Report" : ""}
            style={{ borderLeft: current === "report" ? "3px solid #1251C5" : "3px solid transparent" }}
          >
            <span className="nav-icon"><Icon.Report /></span>
            {!collapsed && <span className="nav-label">Generate Report</span>}
          </div> */}

          {GROUPS.map(group => {
            const tables = Object.entries(SCHEMA).filter(([, s]) => s.group === group);
            const GroupIcon = GROUP_ICONS[group] || Icon.Database;
            return (
              <div key={group} className="nav-group">
                {!collapsed && <div className="nav-group-label"><GroupIcon /> {group}</div>}
                {collapsed && <div className="nav-group-divider" />}
                {tables.map(([key, s]) => (
                  <div key={key}
                    className={`nav-item${current === key ? " active" : ""}`}
                    onClick={() => { onNavigate(key); onMobileClose(); }}
                    title={collapsed ? s.label : ""}>
                    <span className="nav-icon">{s.icon}</span>
                    {!collapsed && <>
                      <span className="nav-label">{s.label}</span>
                      <span className="nav-count">{fmtCount(counts[key] || 0)}</span>
                    </>}
                  </div>
                ))}
              </div>
            );
          })}

          {dynamicSchema && Object.keys(dynamicSchema).length > 0 && (
            <div className="nav-group">
              {!collapsed && <div className="nav-group-label" style={{ color: "var(--yellow-deep)" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
                Custom
              </div>}
              {collapsed && <div className="nav-group-divider" />}
              {Object.entries(dynamicSchema).map(([key, s]) => (
                <div key={key}
                  className={`nav-item${current === key ? " active" : ""}`}
                  onClick={() => { onNavigate(key); onMobileClose(); }}
                  title={collapsed ? s.label : ""}>
                  <span className="nav-icon">{s.icon}</span>
                  {!collapsed && <>
                    <span className="nav-label">{s.label}</span>
                    <span className="nav-count">{fmtCount(counts[key] || 0)}</span>
                  </>}
                </div>
              ))}
            </div>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="db-status">
            {dbConnected === null
              ? <><Spinner size={9} color="var(--amber)" />{!collapsed && <span>Connecting…</span>}</>
              : dbConnected
              ? <><span className="db-dot connected" />{!collapsed && <span>Supabase · connected</span>}</>
              : <><span className="db-dot" style={{ background: "var(--red)" }} />{!collapsed && <span>Connection error</span>}</>
            }
          </div>
        </div>
      </aside>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// USER MENU
// ─────────────────────────────────────────────────────────────
function UserMenu({ onSignOut, session }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const email = session?.user?.email || "Admin";
  const initials = email.slice(0, 2).toUpperCase();

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  return (
    <div className="user-menu-wrap" ref={ref}>
      <button className="user-avatar" onClick={() => setOpen(v => !v)} title={email}>{initials}</button>
      {open && (
        <div className="user-dropdown">
          <div className="user-dropdown-header">
            <div className="user-dropdown-avatar">{initials}</div>
            <div>
              <div className="user-dropdown-email">{email}</div>
              <div className="user-dropdown-role">Administrator</div>
            </div>
          </div>
          <div className="user-dropdown-divider" />
          <button className="user-dropdown-item user-dropdown-signout"
            onClick={() => { setOpen(false); onSignOut(); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TOPBAR
// ─────────────────────────────────────────────────────────────
function Topbar({ onMenuToggle, onAddRecord, reloading, current, onNavigate, allRecords, onSearch, onSignOut, session }) {
  const schema = current !== "home" ? SCHEMA[current] : null;
  return (
    <header className="topbar">
      <button className="menu-toggle" onClick={onMenuToggle}><Icon.Menu /></button>
      <div className="topbar-crumbs">
        <button className="topbar-crumb-home" onClick={() => onNavigate("home")}><Icon.Home /></button>
        {schema && <>
          <span className="topbar-crumb-sep">›</span>
          <span className="topbar-crumb-active">{schema.icon} {schema.label}</span>
        </>}
      </div>
      <button className="topbar-search-btn" onClick={onSearch}>
        <Icon.Search />
        <span className="topbar-search-text">Search all tables…</span>
        <kbd className="topbar-search-kbd">⌘K</kbd>
      </button>
      <div className="topbar-right">
        {reloading && (
          <span className="topbar-syncing">
            <Spinner size={12} color="rgba(255,255,255,.7)" /> Syncing
          </span>
        )}
        <span className="topbar-pill">v1.0</span>
        <button className="btn btn-yellow btn-sm" disabled={reloading} onClick={onAddRecord}>
          <Icon.Plus />
          <span className="btn-label-desktop">Add Record</span>
          <span className="btn-label-mobile">Add</span>
        </button>
        <UserMenu onSignOut={onSignOut} session={session} />
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────
// MOBILE BOTTOM TAB BAR
// ─────────────────────────────────────────────────────────────
function BottomTabBar({ current, onNavigate, counts }) {
  const tabs = [
    { key: "home",               label: "Overview", icon: <Icon.Home /> },
    { key: "demographic",        label: "Demog.",   icon: <Icon.Users /> },
    { key: "economic_indicator", label: "Economy",  icon: <Icon.Globe /> },
    { key: "revenue_finance",    label: "Revenue",  icon: <Icon.Briefcase /> },
    { key: "crime_safety",       label: "Safety",   icon: <Icon.Shield /> },
  ];
  return (
    <nav className="bottom-tab-bar">
      {tabs.map(t => (
        <button key={t.key} className={`bottom-tab${current === t.key ? " active" : ""}`}
          onClick={() => onNavigate(t.key)}>
          <span className="bottom-tab-icon">{t.icon}</span>
          <span className="bottom-tab-label">{t.label}</span>
          {(counts[t.key] || 0) > 0 && <span className="bottom-tab-badge">{fmtCount(counts[t.key])}</span>}
        </button>
      ))}
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────
// DELETE CONFIRM
// ─────────────────────────────────────────────────────────────
function DeleteConfirm({ table, record, schema: schemaProp }) {
  if (!record) return null;
  const schema = schemaProp ? (schemaProp[table] || SCHEMA[table]) : SCHEMA[table];
  const preview = schema.display.slice(0, 3).map(col => {
    const c = schema.columns.find(x => x.key === col) || {};
    return { label: c.label || col, value: record[col] ?? "—" };
  });
  return (
    <div className="delete-confirm">
      <div className="delete-icon">🗑️</div>
      <p className="delete-title">Delete this record?</p>
      <p className="delete-sub">This action cannot be undone.</p>
      <div className="delete-preview">
        {preview.map(p => (
          <div key={p.label} className="delete-preview-row">
            <span className="delete-preview-label">{p.label}</span>
            <span className="delete-preview-val">{String(p.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TABLE PICKER
// ─────────────────────────────────────────────────────────────
function TablePicker({ onPick, schema: schemaProp }) {
  const schemaToUse = schemaProp || SCHEMA;
  const pickable = Object.entries(schemaToUse).filter(([key]) => !READ_ONLY_TABLES.has(key));
  return (
    <div>
      <p className="picker-hint">Choose a table to add a record to:</p>
      <div className="picker-grid">
        {pickable.map(([key, s]) => (
          <button key={key} className="picker-card" onClick={() => onPick(key)}>
            <span className="picker-icon">{s.icon}</span>
            <span className="picker-name">{s.label}</span>
            <span className="picker-group">{s.group}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────
export default function App({ onSignOut, session }) {
  const [current, setCurrent] = useState("home");
  const [allRecords, setAllRecords] = useState({});
  const [counts, setCounts] = useState({});
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showCreateTable, setShowCreateTable] = useState(false);
  const { toasts, toast } = useToast();

  const [dynamicSchema, setDynamicSchema] = useState({});
  const fullSchema = { ...SCHEMA, ...dynamicSchema };

  const [initialLoading, setInitialLoading] = useState(true);
  const [tableLoading,   setTableLoading]   = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [deleting,       setDeleting]       = useState(false);
  const [dbConnected,    setDbConnected]    = useState(null);

  const [modal, setModal] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    const fn = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault(); setShowSearch(v => !v);
      }
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, []);

  const loadDynamic = useCallback(async () => {
    try {
      const rows = await loadDynamicTables();
      const dynSchema = {};
      rows.forEach(row => { dynSchema[row.table_name] = registryToSchema(row); });
      setDynamicSchema(dynSchema);
      return dynSchema;
    } catch { return {}; }
  }, []);

  const reload = useCallback(async (withSpinner = false) => {
    if (withSpinner) setTableLoading(true);
    try {
      const dynSchema = await loadDynamic();
      const combined = { ...SCHEMA, ...dynSchema };
      const next = {};
      for (const t of Object.keys(combined)) {
        try { next[t] = await api.getAll(t); } catch { next[t] = []; }
      }
      setAllRecords(next);
      const c = {};
      Object.keys(combined).forEach(t => c[t] = (next[t] || []).length);
      setCounts(c);
      setDbConnected(true);
    } catch { setDbConnected(false); }
    finally { if (withSpinner) setTableLoading(false); }
  }, [loadDynamic]);

  useEffect(() => {
    (async () => {
      setInitialLoading(true);
      try { await seedIfEmpty(); await reload(); }
      catch { setDbConnected(false); }
      finally { setInitialLoading(false); }
    })();
  }, [reload]);

  function navigate(page) { setCurrent(page); setMobileOpen(false); }

  // ── CRUD ─────────────────────────────────────────────────
  function openAdd(table) {
    if (!table) { setModal({ mode: "pick" }); return; }
    if (READ_ONLY_TABLES.has(table)) return toast("Location tables are read-only", "info");
    setFormData({});
    setModal({ mode: "add", table });
  }
  function openEdit(table, id) {
    if (READ_ONLY_TABLES.has(table)) return toast("Location tables are read-only", "info");
    const record = (allRecords[table] || []).find(r => r.id === id);
    if (!record) return toast("Record not found", "error");
    setFormData({ ...record });
    setModal({ mode: "edit", table, recordId: id });
  }
  function openDelete(table, id) {
    if (READ_ONLY_TABLES.has(table)) return toast("Location tables are read-only", "info");
    setModal({ mode: "delete", table, recordId: id });
  }
  function openDeleteTable(tableName) { setModal({ mode: "delete-table", table: tableName }); }

  async function handleSave() {
    const schema = fullSchema[modal.table];
    const required = schema.columns.filter(c => c.required && !c.pk && !c.auto);
    if (required.some(c => !formData[c.key])) {
      toast("Please fill all required fields", "error"); return;
    }
    const data = {};
    schema.columns.filter(c => !c.pk && !c.auto).forEach(c => {
      const val = formData[c.key];
      if (val === "" || val === null || val === undefined) { data[c.key] = null; return; }
      if (c.type === "integer" || c.type === "bigint") data[c.key] = parseInt(val);
      else if (c.type === "decimal") data[c.key] = parseFloat(val);
      else data[c.key] = val;
    });
    setSaving(true);
    try {
      if (modal.mode === "add") {
        await api.insert(modal.table, data);
        toast(`Added to ${fullSchema[modal.table].label}`, "success");
      } else {
        await api.update(modal.table, modal.recordId, data);
        toast("Record updated", "success");
      }
      setModal(null);
      await reload(true);
    } catch (e) { toast(e.message, "error"); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(modal.table, modal.recordId);
      toast("Record deleted", "success");
      setModal(null);
      await reload(true);
    } catch (e) { toast(e.message, "error"); }
    finally { setDeleting(false); }
  }

  async function handleDeleteTable() {
    setDeleting(true);
    try {
      await deleteIndicatorTable(modal.table);
      toast(`Table "${fullSchema[modal.table]?.label}" deleted`, "success");
      setModal(null);
      if (current === modal.table) setCurrent("home");
      await reload(true);
    } catch (e) { toast(e.message, "error"); }
    finally { setDeleting(false); }
  }

  const editRecord = modal?.recordId
    ? (allRecords[modal.table] || []).find(r => r.id === modal.recordId)
    : null;

  function handleFieldChange(key, val) {
    setFormData(prev => {
      const schema = fullSchema[modal?.table];
      if (!schema) return { ...prev, [key]: val };
      const col = schema.columns.find(c => c.key === key);
      // If a geo FK changed, clear downstream geo fields
      if (col && geoLevel(col)) {
        const cleared = clearDownstreamGeo(key, schema.columns, prev);
        return { ...cleared, [key]: val };
      }
      return { ...prev, [key]: val };
    });
  }

  function modalContent() {
    if (!modal) return null;
    if (modal.mode === "pick") return <TablePicker onPick={t => openAdd(t)} schema={fullSchema} />;
    if (modal.mode === "delete") return <DeleteConfirm table={modal.table} record={editRecord} schema={fullSchema} />;
    if (modal.mode === "delete-table") {
      const s = fullSchema[modal.table] || {};
      return (
        <div className="delete-confirm">
          <div className="delete-icon">🗑️</div>
          <p className="delete-title">Delete table "{s.label}"?</p>
          <p className="delete-sub">This permanently drops the PostgreSQL table and all its data. Cannot be undone.</p>
          <div className="delete-preview">
            <div className="delete-preview-row">
              <span className="delete-preview-label">Table ID</span>
              <span className="delete-preview-val">{modal.table}</span>
            </div>
            <div className="delete-preview-row">
              <span className="delete-preview-label">Records</span>
              <span className="delete-preview-val">{(allRecords[modal.table] || []).length}</span>
            </div>
          </div>
        </div>
      );
    }
    return (
      <SteppedForm
        table={modal.table}
        record={formData}
        allRecords={allRecords}
        schema={fullSchema}
        onChange={handleFieldChange}
      />
    );
  }

  function modalFooter() {
    if (!modal) return null;
    if (modal.mode === "pick") return null;
    if (modal.mode === "delete-table") return (
      <>
        <button className="btn btn-ghost" disabled={deleting} onClick={() => setModal(null)}>Cancel</button>
        <button className="btn btn-danger" disabled={deleting} onClick={handleDeleteTable}>
          {deleting ? <><BtnSpinner /> Deleting…</> : "Delete table permanently"}
        </button>
      </>
    );
    if (modal.mode === "delete") return (
      <>
        <button className="btn btn-ghost" disabled={deleting} onClick={() => setModal(null)}>Cancel</button>
        <button className="btn btn-danger" disabled={deleting} onClick={handleDelete}>
          {deleting ? <><BtnSpinner /> Deleting…</> : <><Icon.Trash /> Delete</>}
        </button>
      </>
    );
    return (
      <>
        <button className="btn btn-ghost" disabled={saving} onClick={() => setModal(null)}>Cancel</button>
        <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
          {saving
            ? <><BtnSpinner /> {modal.mode === "add" ? "Saving…" : "Updating…"}</>
            : modal.mode === "add" ? <><Icon.Plus /> Save Record</> : <><Icon.Check /> Update Record</>
          }
        </button>
      </>
    );
  }

  function modalTitle() {
    if (!modal) return "";
    if (modal.mode === "pick") return "Add Record";
    if (modal.mode === "delete-table") return "Delete Table";
    const s = fullSchema[modal.table] || {};
    if (modal.mode === "delete") return "Delete Record";
    if (modal.mode === "add") return `New ${s.label}`;
    return `Edit ${s.label}`;
  }
  function modalSubtitle() {
    if (!modal || modal.mode === "pick") return "";
    const s = fullSchema[modal.table] || {};
    if (modal.mode === "delete" || modal.mode === "delete-table") return `${s.icon || ""} ${s.label || modal.table}`;
    if (modal.mode === "edit") return `ID: ${fmtId(modal.recordId)}`;
    return `${s.group} · ${(s.columns || []).filter(c => !c.pk && !c.auto).length} fields`;
  }

  if (initialLoading) return <LoadingScreen message="Connecting to Supabase…" />;

  return (
    <div className="app">
      <Topbar
        onMenuToggle={() => setMobileOpen(v => !v)}
        onAddRecord={() => openAdd(current !== "home" && current !== "report" && !READ_ONLY_TABLES.has(current) ? current : null)}
        reloading={tableLoading}
        current={current}
        onNavigate={navigate}
        allRecords={allRecords}
        onSearch={() => setShowSearch(true)}
        onSignOut={onSignOut}
        session={session}
      />
      <div className="app-body">
        <Sidebar
          current={current} counts={counts} onNavigate={navigate}
          mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)}
          dbConnected={dbConnected} collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(v => !v)}
          dynamicSchema={dynamicSchema} onDeleteTable={openDeleteTable}
        />
        <main className="main-content">
          {current === "home"
            ? <OverviewPage counts={counts} onNavigate={navigate} initialLoading={false}
                fullSchema={fullSchema} onCreateTable={() => setShowCreateTable(true)} />
            : current === "report"
            ? <ReportPage allRecords={allRecords} />
            : <TablePage table={current} allRecords={allRecords} counts={counts}
                onEdit={openEdit} onDelete={openDelete} onAdd={openAdd}
                tableLoading={tableLoading} onNavigate={navigate}
                schema={fullSchema[current]}
                isDynamic={!!dynamicSchema[current]}
                onDeleteTable={() => openDeleteTable(current)} />
          }
        </main>
      </div>
      <BottomTabBar current={current} onNavigate={navigate} counts={counts} />

      <Modal open={showSearch} title="" subtitle="" size="search"
        onClose={() => setShowSearch(false)} footer={null}>
        <GlobalSearch allRecords={allRecords} onNavigate={navigate} onClose={() => setShowSearch(false)} />
      </Modal>

      <Modal open={showCreateTable} title="New Indicator Table" subtitle="Define schema and create in Supabase"
        size="lg" onClose={() => setShowCreateTable(false)} footer={null}>
        <CreateTableModal
          onClose={() => setShowCreateTable(false)}
          onCreated={async () => {
            setShowCreateTable(false);
            toast("Table created successfully!", "success");
            await reload(true);
          }}
        />
      </Modal>

      <Modal open={!!modal} title={modalTitle()} subtitle={modalSubtitle()}
        onClose={() => !saving && !deleting && setModal(null)}
        footer={modalFooter()}
        size={modal?.mode === "pick" ? "lg" : "md"}>
        {modalContent()}
      </Modal>

      <ToastContainer toasts={toasts} />
    </div>
  );
}