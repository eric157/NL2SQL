# NL2SQL Enterprise Analytics

An AI-native Business Intelligence platform built on top of a real e-commerce analytical dataset in **DuckDB**. It combines an Executive BI Command Center, an Interactive Data Model / ERD Explorer, an AI Analyst with conversational follow-up and self-healing SQL, a SQLGlot security AST engine, and Root-Cause Diagnostics ("Why did revenue decline?").

---

## 🌟 Key Features

1. **Executive BI Command Center (First Screen)**:
   - Designed for CEOs/CFOs/Head of Ops.
   - Real-time KPIs: Revenue, Orders, Customers, AOV, Profit Margin %, Return Rate %.
   - Analytical Hierarchy: Executive KPIs → Revenue & Profit Trends → Regional Breakdown → Anomaly Alerts → Direct AI Investigation triggers.

2. **Real Business Dataset**:
   - Built on the official **Global Superstore Sales Dataset** (9,994 source transaction line items, $2.3M+ sales, 1,862 products, 793 customers, and 5,009 orders). Return records are derived estimates because the source CSV has no returns field.
   - Normalized into 3NF relational schema inside **DuckDB** for `< 10ms` query execution.

3. **Data Model / Relationship Explorer**:
   - Interactive ERD diagram with table nodes, primary keys, foreign keys, cardinality (1:1, N:1), column types, and row counts.
   - Sample data preview drawer (10 rows).
   - Explains: *"How does the AI know which tables to join?"*

4. **Bounded AI Analyst & Root-Cause Engine**:
   - Conversational AI supporting pronouns & follow-ups ("that", "drill into Germany", "compare with previous period").
   - Semantic Layer mapping business terms ("sales", "buyers", "AOV", "margin", "SKU") to DuckDB SQL.
   - Variance decomposition engine to quantify drivers ("Why did revenue drop?").
   - Smart visualization decision tree (`kpi`, `line`, `area`, `bar`, `treemap`, `scatter`, `table`).
   - Automated Data Quality auditor (missing values, duplicates, IQR statistical outliers).

5. **SQL Security & AST Auditor (`SQLGlot`)**:
   - Enforces strict Read-Only mode (`SELECT`, `WITH ... SELECT`).
   - Blocks unsafe AST statements (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `CREATE`, `TRUNCATE`, multi-statements, file system access).
   - Automatic `LIMIT 1000` enforcement.
   - Self-healing repair loop (up to 3 retries on execution errors).

6. **Free-Tier & Offline Resilience**:
   - Multi-provider LLM interface (Groq / Gemini / Ollama / Deterministic Fallback Rule Engine).
   - Works 100% offline out of the box with zero API keys or costs required.

---

## 🏗️ Architecture Overview

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        React + Vite + TS Frontend                      │
│ ┌──────────────────┐ ┌──────────────┐ ┌───────────┐ ┌────────────────┐ │
│ │ Exec BI Dashboard│ │  AI Analyst  │ │ Model ERD │ │ Root-Cause Viz │ │
│ └──────────────────┘ └──────────────┘ └───────────┘ └────────────────┘ │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ REST / JSON API
┌───────────────────────────────────▼────────────────────────────────────┐
│                           FastAPI Backend                              │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │                      AI Orchestration Pipeline                     │ │
│ │  Intent -> Semantic Layer -> Plan -> SQL -> AST Security Validator │ │
│ └─────────────────────────────────┬──────────────────────────────────┘ │
│                                   │                                    │
│ ┌──────────────────┐ ┌────────────▼───────────┐ ┌────────────────────┐ │
│ │ Data Quality Engine│ │  DuckDB Analytics Engine│ │ Root-Cause Engine  │ │
│ └──────────────────┘ └────────────────────────┘ └────────────────────┘ │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ SQL
┌───────────────────────────────────▼────────────────────────────────────┐
│                    DuckDB Database (analytics.duckdb)                  │
│ [orders] [order_items] [customers] [products] [categories] [returns]   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Quick Start

### 1. Build the Analytical Database
```bash
python scripts/build_dataset.py
```

### 2. Launch FastAPI Backend
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

To use Groq for SQL planning, copy `backend/.env.example` to `backend/.env`, set `GROQ_API_KEY`, and restart the backend. Groq is tried first; if the request fails or no key is present, the app falls back to the local rule engine.

### Deploy to Vercel

Vercel is the recommended deployment because it can host both the React frontend and FastAPI backend under one origin:

1. Import this repository into Vercel with the repository root as the project root.
2. Add `GROQ_API_KEY` and optionally `GROQ_MODEL` under Vercel Project Settings > Environment Variables. Never add the key to frontend variables or source files.
3. Deploy. The frontend uses same-origin `/api` routes automatically.

The source CSV and DuckDB database are included for the serverless deployment. The database is read-only at runtime.

### Deploy the frontend to GitHub Pages

GitHub Pages cannot run FastAPI, DuckDB, or protect a Groq key. Deploy the backend separately, then set the GitHub Pages build variable `VITE_API_BASE_URL` to that backend's public URL. Put `GROQ_API_KEY` only in the backend host's secret environment variables.

### 3. Launch Vite Frontend
```bash
cd frontend
npm run dev
```

Open browser at `http://localhost:5173`.

---

## 🧪 Running Automated Tests
```bash
cd backend
python -m pytest tests/ -v
```
All 18 tests cover SQLGlot AST security parsing, DuckDB execution, semantic layer math, data quality audit, and FastAPI endpoints.
