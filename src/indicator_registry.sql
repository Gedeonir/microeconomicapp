-- ============================================================
-- indicator_registry — stores metadata for dynamic tables
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS indicator_registry (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name  TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  icon        TEXT NOT NULL DEFAULT '📊',
  group_name  TEXT NOT NULL DEFAULT 'Custom',
  description TEXT,
  schema_json JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update trigger
DROP TRIGGER IF EXISTS trg_indicator_registry_updated_at ON indicator_registry;
CREATE TRIGGER trg_indicator_registry_updated_at
  BEFORE UPDATE ON indicator_registry
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE indicator_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "indicator_registry_auth_all" ON indicator_registry;
CREATE POLICY "indicator_registry_auth_all" ON indicator_registry
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "indicator_registry_service_all" ON indicator_registry;
CREATE POLICY "indicator_registry_service_all" ON indicator_registry
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Index
CREATE INDEX IF NOT EXISTS idx_indicator_registry_group
  ON indicator_registry(group_name);
