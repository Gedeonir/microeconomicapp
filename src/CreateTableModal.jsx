// src/CreateTableModal.jsx
// Full wizard UI for creating a new dynamic indicator table

import { useState } from 'react';
import { COLUMN_TYPES, toTableName, createIndicatorTable } from './lib/tableManager.js';

const GROUPS = ['Core', 'Demographics', 'Economy', 'Society', 'Environment', 'Safety', 'Custom'];

const ICONS = [
  '📊','📈','📉','🗂️','🏙️','👥','💰','🌱','⚙️','🏥',
  '🛡️','📋','✈️','🔌','💳','🌍','📚','⚠️','🏘️','🔬',
  '💡','🌊','♻️','🏗️','📡','🧮','🗺️','⚖️','🌡️','💊',
];

const STEPS = ['Table info', 'Define columns', 'Review & create'];

function StepIndicator({ step }) {
  return (
    <div className="ct-steps">
      {STEPS.map((s, i) => (
        <div key={i} className={`ct-step${i === step ? ' active' : i < step ? ' done' : ''}`}>
          <div className="ct-step-dot">{i < step ? '✓' : i + 1}</div>
          <span className="ct-step-label">{s}</span>
          {i < STEPS.length - 1 && <div className={`ct-step-line${i < step ? ' done' : ''}`} />}
        </div>
      ))}
    </div>
  );
}

function Step1({ data, onChange }) {
  return (
    <div className="ct-step-body">
      <div className="ct-field">
        <label className="ct-label">Table name <span className="req">*</span></label>
        <input className="ct-input" placeholder="e.g. Air Quality Index" value={data.label}
          onChange={e => onChange('label', e.target.value)} maxLength={60} />
        {data.label && (
          <div className="ct-hint">Table ID: <code>{toTableName(data.label)}</code></div>
        )}
      </div>

      <div className="ct-field">
        <label className="ct-label">Description</label>
        <textarea className="ct-input ct-textarea" rows={3}
          placeholder="What does this table track?" value={data.description}
          onChange={e => onChange('description', e.target.value)} />
      </div>

      <div className="ct-row">
        <div className="ct-field">
          <label className="ct-label">Group</label>
          <select className="ct-input ct-select" value={data.group}
            onChange={e => onChange('group', e.target.value)}>
            {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        <div className="ct-field">
          <label className="ct-label">Icon</label>
          <div className="ct-icon-grid">
            {ICONS.map(icon => (
              <button key={icon} type="button"
                className={`ct-icon-btn${data.icon === icon ? ' selected' : ''}`}
                onClick={() => onChange('icon', icon)}>
                {icon}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Step2({ columns, onAdd, onRemove, onChange }) {
  const [newCol, setNewCol] = useState({ label: '', key: '', type: 'text', required: false, example: '' });
  const [error, setError] = useState('');

  function autoKey(label) {
    return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }

  function handleLabelChange(val) {
    setNewCol(c => ({ ...c, label: val, key: autoKey(val) }));
  }

  function addColumn() {
    if (!newCol.label.trim()) { setError('Column name is required'); return; }
    if (!newCol.key.trim())   { setError('Column key is required'); return; }
    if (columns.find(c => c.key === newCol.key)) { setError('A column with this key already exists'); return; }
    setError('');
    onAdd({ ...newCol });
    setNewCol({ label: '', key: '', type: 'text', required: false, example: '' });
  }

  return (
    <div className="ct-step-body">
      <div className="ct-col-note">
        Every table automatically gets: <code>id</code>, <code>district_id</code>,
        <code>year</code>, <code>fiscal_year</code>, <code>created_at</code>, <code>updated_at</code>.
        Add your indicator-specific columns below.
      </div>

      {/* Existing columns */}
      {columns.length > 0 && (
        <div className="ct-col-list">
          <div className="ct-col-list-header">
            <span>Column</span><span>Key</span><span>Type</span><span>Req.</span><span />
          </div>
          {columns.map((col, i) => (
            <div key={i} className="ct-col-row">
              <span className="ct-col-name">{col.label}</span>
              <code className="ct-col-key">{col.key}</code>
              <span className="ct-col-type">{COLUMN_TYPES.find(t => t.value === col.type)?.label || col.type}</span>
              <span className={`ct-col-req${col.required ? ' yes' : ''}`}>{col.required ? '✓' : '—'}</span>
              <button className="ct-col-del" onClick={() => onRemove(i)} title="Remove">×</button>
            </div>
          ))}
        </div>
      )}

      {/* Add new column form */}
      <div className="ct-add-col">
        <div className="ct-add-col-title">Add column</div>
        <div className="ct-add-col-grid">
          <div className="ct-field">
            <label className="ct-label">Column name <span className="req">*</span></label>
            <input className="ct-input" placeholder="e.g. PM2.5 Level"
              value={newCol.label} onChange={e => handleLabelChange(e.target.value)} />
          </div>
          <div className="ct-field">
            <label className="ct-label">Key (auto)</label>
            <input className="ct-input ct-input-mono" placeholder="pm2_5_level"
              value={newCol.key} onChange={e => setNewCol(c => ({ ...c, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))} />
          </div>
          <div className="ct-field">
            <label className="ct-label">Data type</label>
            <select className="ct-input ct-select" value={newCol.type}
              onChange={e => setNewCol(c => ({ ...c, type: e.target.value }))}>
              {COLUMN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="ct-field">
            <label className="ct-label">Example value</label>
            <input className="ct-input" placeholder="e.g. 45.2"
              value={newCol.example} onChange={e => setNewCol(c => ({ ...c, example: e.target.value }))} />
          </div>
        </div>

        <div className="ct-add-col-footer">
          <label className="ct-checkbox">
            <input type="checkbox" checked={newCol.required}
              onChange={e => setNewCol(c => ({ ...c, required: e.target.checked }))} />
            <span>Required field</span>
          </label>
          {error && <span className="ct-error">{error}</span>}
          <button className="btn btn-outline-blue btn-sm" type="button" onClick={addColumn}>
            + Add column
          </button>
        </div>
      </div>
    </div>
  );
}

function Step3({ data, columns }) {
  const tableName = toTableName(data.label);
  const allCols = [
    { key: 'id', label: 'ID', type: 'uuid' },
    { key: 'district_id', label: 'District', type: 'fk' },
    { key: 'year', label: 'Year', type: 'integer' },
    { key: 'fiscal_year', label: 'Fiscal Year', type: 'text' },
    ...columns,
    { key: 'created_at', label: 'Created At', type: 'datetime' },
    { key: 'updated_at', label: 'Updated At', type: 'datetime' },
  ];

  return (
    <div className="ct-step-body">
      <div className="ct-review-card">
        <div className="ct-review-icon">{data.icon}</div>
        <div>
          <div className="ct-review-title">{data.label}</div>
          <div className="ct-review-meta">{data.group} · {toTableName(data.label)}</div>
          {data.description && <div className="ct-review-desc">{data.description}</div>}
        </div>
      </div>

      <div className="ct-review-cols">
        <div className="ct-review-cols-title">{allCols.length} columns</div>
        {allCols.map((col, i) => (
          <div key={i} className="ct-review-col-row">
            <code className="ct-review-col-key">{col.key}</code>
            <span className="ct-review-col-label">{col.label}</span>
            <span className="ct-review-col-type">{col.type}</span>
            {col.required && <span className="ct-review-col-req">required</span>}
          </div>
        ))}
      </div>

      <div className="ct-review-warning">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        This will create a real PostgreSQL table <code>{tableName}</code> in your Supabase database.
      </div>
    </div>
  );
}

export default function CreateTableModal({ onClose, onCreated }) {
  const [step, setStep] = useState(0);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const [tableData, setTableData] = useState({
    label: '', group: 'Custom', icon: '📊', description: '',
  });
  const [columns, setColumns] = useState([]);

  function updateTableData(key, val) {
    setTableData(d => ({ ...d, [key]: val }));
  }

  function canNext() {
    if (step === 0) return tableData.label.trim().length >= 2;
    if (step === 1) return columns.length >= 1;
    return true;
  }

  async function handleCreate() {
    setCreating(true);
    setError('');
    try {
      const result = await createIndicatorTable({
        label:       tableData.label,
        group:       tableData.group,
        icon:        tableData.icon,
        description: tableData.description,
        columns,
      });
      onCreated(result);
    } catch (e) {
      setError(e.message);
      setCreating(false);
    }
  }

  return (
    <div className="ct-wrap">
      <StepIndicator step={step} />

      {step === 0 && <Step1 data={tableData} onChange={updateTableData} />}
      {step === 1 && (
        <Step2
          columns={columns}
          onAdd={col => setColumns(c => [...c, col])}
          onRemove={i => setColumns(c => c.filter((_, j) => j !== i))}
          onChange={(i, key, val) => setColumns(c => c.map((col, j) => j === i ? { ...col, [key]: val } : col))}
        />
      )}
      {step === 2 && <Step3 data={tableData} columns={columns} />}

      {error && (
        <div className="ct-error-banner">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      <div className="ct-footer">
        <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={creating}>
          Cancel
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          {step > 0 && (
            <button className="btn btn-ghost btn-sm" disabled={creating} onClick={() => setStep(s => s - 1)}>
              ← Back
            </button>
          )}
          {step < 2 ? (
            <button className="btn btn-primary btn-sm" disabled={!canNext()} onClick={() => setStep(s => s + 1)}>
              Next →
            </button>
          ) : (
            <button className="btn btn-primary btn-sm" disabled={creating} onClick={handleCreate}>
              {creating
                ? <><span className="auth-spinner" /> Creating table…</>
                : '🚀 Create table'
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
