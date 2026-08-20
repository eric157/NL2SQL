# NL2SQL Enterprise Analytics

An AI-native Business Intelligence platform built on top of a real e-commerce analytical dataset in **DuckDB**. It combines an Executive BI Command Center, an Interactive Data Model / ERD Explorer, an AI Analyst with conversational follow-up and self-healing SQL, a SQLGlot security AST engine, and Root-Cause Diagnostics ("Why did revenue decline?").

---

## 🌟 Key Features

1. **Executive BI Command Center (First Screen)**:
   - Designed for CEOs/CFOs/Head of Ops.
   - Real-time KPIs: Revenue, Orders, Customers, AOV, Profit Margin %, Return Rate %.
   - Analytical Hierarchy: Executive KPIs → Revenue & Profit Trends → Regional Breakdown → Anomaly Alerts → Direct AI Investigation triggers.

2. **Real Business Dataset**:
   - Built on the official **Global Superstore Sales Dataset** (9,994 transaction line items, $2.3M+ sales, 1,862 products, 793 customers, 5,009 orders, 400+ returns).
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
