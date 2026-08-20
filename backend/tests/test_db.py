import pytest
from app.db.duckdb_engine import DuckDBEngine

def test_duckdb_schema_metadata():
    db = DuckDBEngine()
    meta = db.get_schema_metadata()
    assert "tables" in meta
    assert "relationships" in meta
    
    tables = meta["tables"]
    expected_tables = ["regions", "categories", "products", "customers", "orders", "order_items", "returns"]
    for tbl in expected_tables:
        assert tbl in tables
        assert len(tables[tbl]["columns"]) > 0
        assert tables[tbl]["primary_key"] is not None

def test_duckdb_execute_query():
    db = DuckDBEngine()
    res = db.execute_query("SELECT COUNT(*) as cnt FROM categories")
    assert res["success"] is True
    assert res["row_count"] == 1
    assert res["rows"][0]["cnt"] > 0

def test_duckdb_sample_rows():
    db = DuckDBEngine()
    samples = db.get_sample_rows("categories", limit=5)
    assert len(samples) > 0
    assert "category_name" in samples[0]
