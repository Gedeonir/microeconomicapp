// ─────────────────────────────────────────────────────────────
// src/lib/api.js  —  Supabase backend
//
// SETUP:
//   1. npm install @supabase/supabase-js
//   2. Create a .env file in your project root:
//        VITE_SUPABASE_URL=https://xxxx.supabase.co
//        VITE_SUPABASE_ANON_KEY=eyJhbGci...
//   3. This file is a drop-in replacement for the localStorage version.
//      Nothing else in the app needs to change.
// ─────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL     = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '[CoK] Missing Supabase env vars.\n' +
    'Create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function handleError(error, context) {
  if (error) {
    console.error(`[CoK API] ${context}:`, error.message);
    throw new Error(error.message);
  }
}

// Strip null values so we don't accidentally overwrite DB defaults
function clean(data) {
  return Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== '' && v !== undefined)
  );
}

// ─────────────────────────────────────────────────────────────
// API — same interface as the localStorage version
// ─────────────────────────────────────────────────────────────

export const api = {

  // ── READ ALL ──────────────────────────────────────────────
  async getAll(table) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('created_at', { ascending: false });
    handleError(error, `getAll(${table})`);
    return data || [];
  },

  // ── READ ONE ──────────────────────────────────────────────
  async getById(table, id) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single();
    handleError(error, `getById(${table}, ${id})`);
    return data;
  },

  // ── CREATE ────────────────────────────────────────────────
  async insert(table, data) {
    const { data: inserted, error } = await supabase
      .from(table)
      .insert(clean(data))
      .select()
      .single();
    handleError(error, `insert(${table})`);
    return inserted;
  },

  // ── UPDATE ────────────────────────────────────────────────
  async update(table, id, data) {
    const { data: updated, error } = await supabase
      .from(table)
      .update(clean(data))
      .eq('id', id)
      .select()
      .single();
    handleError(error, `update(${table}, ${id})`);
    return updated;
  },

  // ── DELETE ────────────────────────────────────────────────
  async delete(table, id) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);
    handleError(error, `delete(${table}, ${id})`);
  },

  // ── BULK INSERT ───────────────────────────────────────────
  async bulkInsert(table, records) {
    const { data, error } = await supabase
      .from(table)
      .insert(records.map(clean))
      .select();
    handleError(error, `bulkInsert(${table})`);
    return data || [];
  },

  // ── COUNT ALL ─────────────────────────────────────────────
  // Returns { table: count } for all 17 tables
  async countAll() {
    const { SCHEMA } = await import('./schema.js');
    const tables = Object.keys(SCHEMA);

    const results = await Promise.all(
      tables.map((t) =>
        supabase
          .from(t)
          .select('*', { count: 'exact', head: true })
          .then(({ count, error }) => {
            if (error) console.warn(`[CoK] count(${t}):`, error.message);
            return [t, count || 0];
          })
      )
    );

    return Object.fromEntries(results);
  },
};

// ─────────────────────────────────────────────────────────────
// seedIfEmpty — only seeds if city table is empty
// Safe to call on every app load
// ─────────────────────────────────────────────────────────────
export async function seedIfEmpty() {
  const { data: cities, error } = await supabase
    .from('city')
    .select('id')
    .limit(1);

  if (error) {
    console.warn('[CoK] seedIfEmpty check failed:', error.message);
    return;
  }

  // Already seeded by the SQL migration — nothing to do
  if (cities && cities.length > 0) return;

  console.log('[CoK] Seeding initial data…');

  // City
  const { data: city, error: cityErr } = await supabase
    .from('city')
    .insert({ name: 'City of Kigali', country: 'Rwanda', area_km2: 730 })
    .select()
    .single();
  if (cityErr) { console.error('[CoK] Seed city failed:', cityErr.message); return; }

  // Districts
  const { data: districts, error: distErr } = await supabase
    .from('district')
    .insert([
      { city_id: city.id, name: 'Gasabo',     area_km2: 429 },
      { city_id: city.id, name: 'Kicukiro',   area_km2: 167 },
      { city_id: city.id, name: 'Nyarugenge', area_km2: 76  },
    ])
    .select();
  if (distErr) { console.error('[CoK] Seed districts failed:', distErr.message); return; }

  const [gasabo, kicukiro, nyarugenge] = districts;

  // Revenue
  await supabase.from('revenue_finance').insert([
    { city_id: city.id, fiscal_year: 'FY2019-20', budget_target_rwf: 29466109248, actual_collection_rwf: 25150471320, achievement_rate_pct: 85,  yoy_growth_pct: null, total_tax_revenue_rwf: 20998749324, rental_income_tax_rwf: 9544484167,  immovable_property_tax_rwf: 8919128473 },
    { city_id: city.id, fiscal_year: 'FY2020-21', budget_target_rwf: 35528907619, actual_collection_rwf: 28819215654, achievement_rate_pct: 81,  yoy_growth_pct: 14.6, total_tax_revenue_rwf: 24427929479, rental_income_tax_rwf: 9840948215,  immovable_property_tax_rwf: 11637348375 },
    { city_id: city.id, fiscal_year: 'FY2021-22', budget_target_rwf: 41496480636, actual_collection_rwf: 35229689313, achievement_rate_pct: 85,  yoy_growth_pct: 22.2, total_tax_revenue_rwf: 25301824772, rental_income_tax_rwf: 10519200249, immovable_property_tax_rwf: 11812030270 },
    { city_id: city.id, fiscal_year: 'FY2022-23', budget_target_rwf: 41753368437, actual_collection_rwf: 38128664836, achievement_rate_pct: 91,  yoy_growth_pct: 8.2,  total_tax_revenue_rwf: 27127106945, rental_income_tax_rwf: 11486324600, immovable_property_tax_rwf: 12678040045 },
    { city_id: city.id, fiscal_year: 'FY2023-24', budget_target_rwf: 41092698721, actual_collection_rwf: 44492170572, achievement_rate_pct: 108, yoy_growth_pct: 16.7, total_tax_revenue_rwf: 35644139129, rental_income_tax_rwf: 13228000999, immovable_property_tax_rwf: 12338215613, property_sales_tax_rwf: 4656128449 },
  ]);

  // RSSB
  await supabase.from('rssb_stats').insert([
    { district_id: gasabo.id,     fiscal_year: 'FY2024-25', active_members_total: 288939, active_members_male: 206289, active_members_female: 82650,  passive_members_total: 507462, contributing_institutions: 4079, total_contributions_rwf: 112748070454, medical_scheme_total: 68635,  cbhi_mutuelles: 489434 },
    { district_id: kicukiro.id,   fiscal_year: 'FY2024-25', active_members_total: 78440,  active_members_male: 49395,  active_members_female: 29045,  passive_members_total: 240113, contributing_institutions: 2007, total_contributions_rwf: 29613601198,  medical_scheme_total: 64816,  cbhi_mutuelles: 256878 },
    { district_id: nyarugenge.id, fiscal_year: 'FY2024-25', active_members_total: 154732, active_members_male: 99201,  active_members_female: 55531,  passive_members_total: 410200, contributing_institutions: 3825, total_contributions_rwf: 78514947634,  medical_scheme_total: 106400, cbhi_mutuelles: 243052 },
  ]);

  // Demographics
  await supabase.from('demographic').insert([
    { district_id: gasabo.id,     year: 2024, total_population: 644887,  male_population: 310000, female_population: 334887, density_per_km2: 1503.2, youth_population_16_30: 282898, youth_share_pct: 43.90, live_births: 24641, crude_birth_rate: 25.5, registered_deaths: 1957, crude_death_rate: 2.1, registered_marriages: 5543, annual_growth_rate_pct: 4.42 },
    { district_id: kicukiro.id,   year: 2024, total_population: 419068,  male_population: 199000, female_population: 220068, density_per_km2: 2510,   youth_population_16_30: 175298, youth_share_pct: 41.80, live_births: 13782, crude_birth_rate: 25.5, registered_deaths: 1095, crude_death_rate: 2.1, registered_marriages: 2375, annual_growth_rate_pct: 4.41 },
    { district_id: nyarugenge.id, year: 2024, total_population: 406553,  male_population: 194200, female_population: 212353, density_per_km2: 5349,   youth_population_16_30: 126094, youth_share_pct: 30.60, live_births: 9860,  crude_birth_rate: 25.5, registered_deaths: 996,  crude_death_rate: 2.1, registered_marriages: 2358, annual_growth_rate_pct: 2.70 },
  ]);

  // Crime
  await supabase.from('crime_safety').insert([
    { city_id: city.id, year: 2024, total_crimes: 20363, national_total_crimes: 77322, kigali_share_pct: 26.30, theft: 5911, assault_battery: 4389, breach_of_trust: 2283, fraud: 1398, child_defilement: 835, narcotic_drugs: 991, damaging_property: 893 },
  ]);

  console.log('[CoK] Seed complete.');
}
