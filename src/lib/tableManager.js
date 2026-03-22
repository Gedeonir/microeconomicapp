import { supabase } from './api.js';

export const COLUMN_TYPES = [
  { value: 'text',    label: 'Text',             pg: 'TEXT' },
  { value: 'integer', label: 'Integer',           pg: 'INTEGER' },
  { value: 'decimal', label: 'Decimal (numeric)', pg: 'NUMERIC(14,4)' },
  { value: 'bigint',  label: 'Big integer',       pg: 'BIGINT' },
  { value: 'boolean', label: 'Boolean (yes/no)',  pg: 'BOOLEAN' },
  { value: 'date',    label: 'Date',              pg: 'DATE' },
  { value: 'percent', label: 'Percentage (%)',    pg: 'NUMERIC(6,2)' },
];

async function runSQL(sql) {
  const { error } = await supabase.rpc('exec_sql', { sql });
  if (error) throw new Error(error.message);
}

export function toTableName(label) {
  return 'ind_' + label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
}

export async function createIndicatorTable({ label, group, icon, description, columns }) {
  const tableName = toTableName(label);
  const typeMap = Object.fromEntries(COLUMN_TYPES.map(t => [t.value, t.pg]));

  const colDefs = columns
    .map(c => {
      const safeName = c.key.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const pgType   = typeMap[c.type] || 'TEXT';
      const notNull  = c.required ? ' NOT NULL' : '';
      return `  ${safeName} ${pgType}${notNull}`;
    })
    .join(',\n');

  await runSQL(`
    CREATE TABLE IF NOT EXISTS ${tableName} (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      district_id UUID REFERENCES district(id) ON DELETE CASCADE,
      year        INTEGER,
      fiscal_year TEXT,
${colDefs},
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await runSQL(`
    DROP TRIGGER IF EXISTS trg_${tableName}_updated_at ON ${tableName};
    CREATE TRIGGER trg_${tableName}_updated_at
      BEFORE UPDATE ON ${tableName}
      FOR EACH ROW EXECUTE FUNCTION update_updated_at()
  `);

  await runSQL(`ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY`);

  await runSQL(`
    DROP POLICY IF EXISTS "${tableName}_auth_all" ON ${tableName};
    CREATE POLICY "${tableName}_auth_all" ON ${tableName}
      FOR ALL TO authenticated USING (true) WITH CHECK (true)
  `);

  await runSQL(`
    DROP POLICY IF EXISTS "${tableName}_service_all" ON ${tableName};
    CREATE POLICY "${tableName}_service_all" ON ${tableName}
      FOR ALL TO service_role USING (true) WITH CHECK (true)
  `);

  const schemaPayload = {
    label,
    icon:        icon || '📊',
    group:       group || 'Custom',
    description: description || '',
    table_name:  tableName,
    columns: columns.map(c => ({
      key:      c.key.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      label:    c.label,
      type:     c.type,
      required: !!c.required,
      example:  c.example || '',
    })),
    display_cols: columns.slice(0, 5).map(c =>
      c.key.toLowerCase().replace(/[^a-z0-9_]/g, '_')
    ),
  };

  const { error } = await supabase
    .from('indicator_registry')
    .insert({
      table_name:  tableName,
      label,
      icon:        icon || '📊',
      group_name:  group || 'Custom',
      description: description || '',
      schema_json: schemaPayload,
    });

  if (error) throw new Error(`Registry insert failed: ${error.message}`);

  return { tableName, schema: schemaPayload };
}

export async function deleteIndicatorTable(tableName) {
  await runSQL(`DROP TABLE IF EXISTS ${tableName} CASCADE`);
  await supabase.from('indicator_registry').delete().eq('table_name', tableName);
}

export async function loadDynamicTables() {
  const { data, error } = await supabase
    .from('indicator_registry')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

export function registryToSchema(row) {
  const s = row.schema_json;
  return {
    label:   s.label,
    icon:    s.icon,
    color:   '#6366f1',
    group:   s.group || 'Custom',
    dynamic: true,
    columns: [
      { key: 'id',          label: 'ID',           type: 'uuid',    pk: true },
      { key: 'district_id', label: 'District',     type: 'fk',      ref: 'district' },
      { key: 'year',        label: 'Year',          type: 'integer', example: String(new Date().getFullYear()) },
      { key: 'fiscal_year', label: 'Fiscal Year',   type: 'text',    example: 'FY2024-25' },
      ...s.columns.map(c => ({
        key:      c.key,
        label:    c.label,
        type:     c.type === 'percent' ? 'decimal' : c.type,
        required: c.required,
        example:  c.example,
      })),
      { key: 'created_at', label: 'Created At', type: 'datetime', auto: true },
      { key: 'updated_at', label: 'Updated At', type: 'datetime', auto: true },
    ],
    display: ['district_id', 'year', ...s.display_cols.slice(0, 4)],
  };
}