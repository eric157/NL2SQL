import pytest
from app.analytics.data_quality import DataQualityAuditor
from app.analytics.viz_selector import VizSelector

def test_data_quality_clean_dataset():
    rows = [
        {"month": "2025-01", "revenue": 1000.0},
        {"month": "2025-02", "revenue": 1200.0},
        {"month": "2025-03", "revenue": 1150.0},
        {"month": "2025-04", "revenue": 1300.0},
        {"month": "2025-05", "revenue": 1250.0}
    ]
    cols = ["month", "revenue"]
    audit = DataQualityAuditor.audit_result(rows, cols)
    assert audit["row_count"] == 5
    assert audit["missing_values_count"] == 0
    assert audit["duplicate_rows_count"] == 0

def test_viz_selector_time_series():
    rows = [
        {"order_month": "2025-01", "revenue": 5000.0},
        {"order_month": "2025-02", "revenue": 6200.0}
    ]
    cols = ["order_month", "revenue"]
    viz = VizSelector.select_visualization(cols, rows)
    assert viz["type"] in ["area", "line"]
    assert viz["x_axis"] == "order_month"

def test_viz_selector_bar_chart():
    rows = [
        {"category_name": "Technology", "sales": 45000.0},
        {"category_name": "Furniture", "sales": 32000.0},
        {"category_name": "Office Supplies", "sales": 18000.0}
    ]
    cols = ["category_name", "sales"]
    viz = VizSelector.select_visualization(cols, rows)
    assert viz["type"] == "bar"
    assert viz["x_axis"] == "category_name"
