# CoK Microeconomic Indicators — Dashboard

Full CRUD management dashboard for the City of Kigali Microeconomic Indicators database.
Built with React + Vite. Fully responsive (desktop, tablet, mobile).

## Quick start

```bash
npm install
npm run dev
```

Then open http://localhost:5173

## Build for production

```bash
npm run build
# output in /dist — deploy anywhere (Netlify, Vercel, Nginx, etc.)
```

## Project structure

```
src/
  lib/
    schema.js     ← All 17 table definitions (columns, types, display config)
    api.js        ← Storage layer (currently localStorage — swap for real DB here)
  App.jsx         ← All React components (Sidebar, Topbar, DataTable, Forms, Modals)
  index.css       ← All styles with full responsive breakpoints
  main.jsx        ← Entry point
```

## Connecting a real database

All database calls go through the `api` object in `src/lib/api.js`.
Replace each method with a `fetch()` call to your backend:

```js
// Example: swap localStorage → REST API
export const api = {
  async getAll(table) {
    const res = await fetch(`/api/${table}`);
    return res.json();
  },
  async insert(table, data) {
    const res = await fetch(`/api/${table}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async update(table, id, data) {
    const res = await fetch(`/api/${table}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async delete(table, id) {
    await fetch(`/api/${table}/${id}`, { method: 'DELETE' });
  },
};
```

Works with any backend: Node/Express, FastAPI, Django, Supabase, etc.

## Tables covered (17)

| Group        | Tables |
|--------------|--------|
| Core         | city, district |
| Demographics | demographic, civil_registration |
| Economy      | economic_indicator, revenue_finance, business_enterprise, financial_inclusion |
| Society      | labor_market, rssb_stats, household_poverty, youth_education |
| Environment  | agriculture, infrastructure, tourism |
| Safety       | crime_safety, disaster |
