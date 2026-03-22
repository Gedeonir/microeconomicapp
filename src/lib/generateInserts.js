/**
 * Rwanda Locations — SQL Insert Generator (v2)
 * Matches SCHEMA: city, adm_district, sector, cell, village
 * UUIDs are generated at insert time via gen_random_uuid()
 * -------------------------------------------------------
 * Usage:
 *   1. Put this file in the same folder as locations.ts
 *   2. Run: node generate_inserts_v2.js
 *   3. Paste rwanda_inserts.sql into Supabase after running rwanda_schema_v2.sql
 */

const fs   = require('fs');
const path = require('path');

// ── Load locations.ts ────────────────────────────────────────────
let raw;
for (const name of ['locations.ts', 'locations.js']) {
  const p = path.join(__dirname, name);
  if (fs.existsSync(p)) { raw = fs.readFileSync(p, 'utf8'); break; }
}
if (!raw) { console.error('ERROR: locations.ts not found.'); process.exit(1); }

const cleaned = raw.replace(/export\s+const\s+\w+\s*=\s*/, '').replace(/;\s*$/, '');
const locations = new Function(`return (${cleaned})`)();

// ── Helpers ──────────────────────────────────────────────────────
const esc   = s => String(s).replace(/'/g, "''");
const chunk = (arr, n) => {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

// Code generators — simple hierarchical codes e.g. KIG, KIG-GAS, KIG-GAS-REM
const toCode = name => name
  .toUpperCase()
  .replace(/[^A-Z0-9\s]/g, '')
  .trim()
  .split(/\s+/)
  .map(w => w.slice(0, 3))
  .join('')
  .slice(0, 6);

// ── Traverse ─────────────────────────────────────────────────────
// We use WITH clauses + gen_random_uuid() so no integer IDs needed.
// Instead we build named CTE inserts that reference each parent by
// a stable (name, parent_name) lookup — works perfectly for this dataset.

const cityRows   = [];
const distRows   = [];
const sectRows   = [];
const cellRows   = [];
const villRows   = [];

for (const [pName, pVal] of Object.entries(locations)) {
  if (pName === 'choose province' || typeof pVal !== 'object' || Array.isArray(pVal)) continue;
  const pCode = toCode(pName);
  cityRows.push(`('${esc(pName)}', 'Rwanda', '${pCode}')`);

  for (const [dName, dVal] of Object.entries(pVal)) {
    if (dName === 'choose district' || typeof dVal !== 'object' || Array.isArray(dVal)) continue;
    const dCode = `${pCode}-${toCode(dName)}`;
    distRows.push(`('${esc(dName)}', '${esc(pName)}', '${dCode}')`);

    for (const [sName, sVal] of Object.entries(dVal)) {
      if (sName === 'choose sector' || typeof sVal !== 'object' || Array.isArray(sVal)) continue;
      const sCode = `${dCode}-${toCode(sName)}`;
      sectRows.push(`('${esc(sName)}', '${esc(dName)}', '${esc(pName)}', '${sCode}')`);

      for (const [cName, cVal] of Object.entries(sVal)) {
        if (typeof cVal !== 'object') continue;
        const cCode = `${sCode}-${toCode(cName)}`;
        cellRows.push(`('${esc(cName)}', '${esc(sName)}', '${esc(dName)}', '${esc(pName)}', '${cCode}')`);

        if (Array.isArray(cVal)) {
          let vIdx = 1;
          for (const vName of cVal) {
            const vCode = `${cCode}-V${String(vIdx++).padStart(2,'0')}`;
            villRows.push(`('${esc(vName)}', '${esc(cName)}', '${esc(sName)}', '${esc(dName)}', '${esc(pName)}', '${vCode}')`);
          }
        }
      }
    }
  }
}

// ── Build SQL ────────────────────────────────────────────────────
const lines = [];

lines.push(`-- ================================================================
-- Rwanda Locations — DATA INSERTS  (v2)
-- Run AFTER rwanda_schema_v2.sql
-- Generated: ${new Date().toISOString()}
-- Cities    : ${cityRows.length}
-- Districts : ${distRows.length}
-- Sectors   : ${sectRows.length}
-- Cells     : ${cellRows.length}
-- Villages  : ${villRows.length}
-- ================================================================

`);

// city
lines.push(`-- CITY / PROVINCE (${cityRows.length} rows)`);
chunk(cityRows, 500).forEach(c => lines.push(
  `INSERT INTO city (name, country, code)\n` +
  `SELECT v.name, v.country, v.code FROM (VALUES\n` +
  c.map(r => `  (${r.replace(/^\(/, '').replace(/\)$/, '')})`).join(',\n') +
  `\n) AS v(name, country, code)\nWHERE NOT EXISTS (SELECT 1 FROM city WHERE name = v.name);\n`
));

// adm_district — join city by name
lines.push(`-- ADM_DISTRICT (${distRows.length} rows)`);
chunk(distRows, 500).forEach(c => lines.push(
  `INSERT INTO adm_district (name, city_id, code)\n` +
  `SELECT v.name, ci.id, v.code\n` +
  `FROM (VALUES\n` +
  c.map(r => `  (${r})`).join(',\n') +
  `\n) AS v(name, city_name, code)\n` +
  `JOIN city ci ON ci.name = v.city_name\n` +
  `ON CONFLICT (name, city_id) DO NOTHING;\n`
));

// sector — join adm_district by name+city
lines.push(`-- SECTOR (${sectRows.length} rows)`);
chunk(sectRows, 500).forEach(c => lines.push(
  `INSERT INTO sector (name, district_id, code)\n` +
  `SELECT v.name, d.id, v.code\n` +
  `FROM (VALUES\n` +
  c.map(r => `  (${r})`).join(',\n') +
  `\n) AS v(name, district_name, city_name, code)\n` +
  `JOIN city         ci ON ci.name = v.city_name\n` +
  `JOIN adm_district d  ON d.name  = v.district_name AND d.city_id = ci.id\n` +
  `ON CONFLICT (name, district_id) DO NOTHING;\n`
));

// cell — join sector by name+district+city
lines.push(`-- CELL (${cellRows.length} rows)`);
chunk(cellRows, 500).forEach(c => lines.push(
  `INSERT INTO cell (name, sector_id, code)\n` +
  `SELECT v.name, s.id, v.code\n` +
  `FROM (VALUES\n` +
  c.map(r => `  (${r})`).join(',\n') +
  `\n) AS v(name, sector_name, district_name, city_name, code)\n` +
  `JOIN city         ci ON ci.name = v.city_name\n` +
  `JOIN adm_district d  ON d.name  = v.district_name AND d.city_id = ci.id\n` +
  `JOIN sector       s  ON s.name  = v.sector_name   AND s.district_id = d.id\n` +
  `ON CONFLICT (name, sector_id) DO NOTHING;\n`
));

// village — join cell by name+sector+district+city
lines.push(`-- VILLAGE (${villRows.length} rows)`);
chunk(villRows, 500).forEach(c => lines.push(
  `INSERT INTO village (name, cell_id, code)\n` +
  `SELECT v.name, ce.id, v.code\n` +
  `FROM (VALUES\n` +
  c.map(r => `  (${r})`).join(',\n') +
  `\n) AS v(name, cell_name, sector_name, district_name, city_name, code)\n` +
  `JOIN city         ci ON ci.name = v.city_name\n` +
  `JOIN adm_district d  ON d.name  = v.district_name AND d.city_id    = ci.id\n` +
  `JOIN sector       s  ON s.name  = v.sector_name   AND s.district_id = d.id\n` +
  `JOIN cell         ce ON ce.name = v.cell_name      AND ce.sector_id  = s.id\n` +
  `ON CONFLICT (name, cell_id) DO NOTHING;\n`
));

const outPath = path.join(__dirname, 'rwanda_inserts.sql');
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');

console.log('\n✅ Done!');
console.log(`   Cities    : ${cityRows.length}`);
console.log(`   Districts : ${distRows.length}`);
console.log(`   Sectors   : ${sectRows.length}`);
console.log(`   Cells     : ${cellRows.length}`);
console.log(`   Villages  : ${villRows.length}`);
console.log(`\n📄 Output   : ${outPath}`);
console.log('\nNext steps:');
console.log('  1. Run rwanda_schema_v2.sql in Supabase SQL Editor');
console.log('  2. Run rwanda_inserts.sql in Supabase SQL Editor');