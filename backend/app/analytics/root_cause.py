from typing import Dict, Any, List
from app.db.duckdb_engine import DuckDBEngine

class RootCauseAnalyzer:
    """Performs dynamic variance decomposition and contribution driver analysis for 'Why' queries on real dataset."""

    def __init__(self, db_engine: DuckDBEngine):
        self.db = db_engine

    def analyze_revenue_decline(self, base_period: str = None, compare_period: str = None) -> Dict[str, Any]:
        """
        Decomposes revenue change between two period quarters across Category and Region dimensions.
        Automatically detects latest periods if unspecified.
        """
        # Detect periods if not provided
        if not base_period or not compare_period:
            period_sql = """
            SELECT DISTINCT STRFTIME(o.order_date, '%Y-Q') as qtr
            FROM orders o
            ORDER BY qtr DESC
            LIMIT 2;
            """
            periods_res = self.db.execute_query(period_sql)
            rows = periods_res.get("rows", [])
            if len(rows) >= 2:
                compare_period = rows[0]["qtr"]
                base_period = rows[1]["qtr"]
            else:
                compare_period = "2017-Q4"
                base_period = "2017-Q3"

        # 1. Total Variance
        total_sql = f"""
        SELECT 
            SUM(CASE WHEN STRFTIME(o.order_date, '%Y-Q') = '{base_period}' THEN oi.line_total ELSE 0 END) as base_rev,
            SUM(CASE WHEN STRFTIME(o.order_date, '%Y-Q') = '{compare_period}' THEN oi.line_total ELSE 0 END) as compare_rev
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id;
        """
        tot_res = self.db.execute_query(total_sql)
        tot_row = tot_res["rows"][0] if tot_res["rows"] else {"base_rev": 0, "compare_rev": 0}
        base_total = tot_row.get("base_rev") or 0.0
        compare_total = tot_row.get("compare_rev") or 0.0
        total_delta = compare_total - base_total
        pct_change = round((total_delta / base_total * 100), 2) if base_total else 0.0

        # 2. Category Contribution Breakdown
        cat_sql = f"""
        SELECT 
            c.category_name,
            SUM(CASE WHEN STRFTIME(o.order_date, '%Y-Q') = '{base_period}' THEN oi.line_total ELSE 0 END) as base_rev,
            SUM(CASE WHEN STRFTIME(o.order_date, '%Y-Q') = '{compare_period}' THEN oi.line_total ELSE 0 END) as compare_rev
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        JOIN products p ON oi.product_id = p.product_id
        JOIN categories c ON p.category_id = c.category_id
        GROUP BY c.category_name
        ORDER BY (compare_rev - base_rev) ASC;
        """
        cat_res = self.db.execute_query(cat_sql)
        cat_drivers = []
        for r in cat_res.get("rows", []):
            base_val = r["base_rev"] or 0.0
            comp_val = r["compare_rev"] or 0.0
            delta = comp_val - base_val
            contrib_pct = round((delta / abs(total_delta) * 100), 1) if total_delta != 0 else 0.0
            cat_drivers.append({
                "dimension": "category",
                "name": r["category_name"],
                "base_revenue": round(base_val, 2),
                "compare_revenue": round(comp_val, 2),
                "delta": round(delta, 2),
                "contribution_pct": contrib_pct
            })

        # 3. Regional Contribution Breakdown
        reg_sql = f"""
        SELECT 
            reg.region_name,
            reg.country,
            SUM(CASE WHEN STRFTIME(o.order_date, '%Y-Q') = '{base_period}' THEN oi.line_total ELSE 0 END) as base_rev,
            SUM(CASE WHEN STRFTIME(o.order_date, '%Y-Q') = '{compare_period}' THEN oi.line_total ELSE 0 END) as compare_rev
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        JOIN regions reg ON o.region_id = reg.region_id
        GROUP BY reg.region_name, reg.country
        ORDER BY (compare_rev - base_rev) ASC;
        """
        reg_res = self.db.execute_query(reg_sql)
        reg_drivers = []
        for r in reg_res.get("rows", []):
            base_val = r["base_rev"] or 0.0
            comp_val = r["compare_rev"] or 0.0
            delta = comp_val - base_val
            contrib_pct = round((delta / abs(total_delta) * 100), 1) if total_delta != 0 else 0.0
            reg_drivers.append({
                "dimension": "region",
                "name": r["region_name"],
                "country": r["country"],
                "base_revenue": round(base_val, 2),
                "compare_revenue": round(comp_val, 2),
                "delta": round(delta, 2),
                "contribution_pct": contrib_pct
            })

        top_decline_cat = cat_drivers[0] if cat_drivers else None
        top_decline_reg = reg_drivers[0] if reg_drivers else None

        direction = "decreased" if total_delta < 0 else "increased"
        summary_text = (
            f"Comparing {compare_period} against {base_period}, total revenue {direction} by ${abs(total_delta):,.2f} ({pct_change}%). "
            f"Top category driver: {top_decline_cat['name']} (delta: ${top_decline_cat['delta']:,.2f}, {top_decline_cat['contribution_pct']}% of total variance). "
            f"Top regional driver: {top_decline_reg['name']} (delta: ${top_decline_reg['delta']:,.2f})."
        )

        return {
            "base_period": base_period,
            "compare_period": compare_period,
            "base_total_revenue": round(base_total, 2),
            "compare_total_revenue": round(compare_total, 2),
            "total_delta": round(total_delta, 2),
            "pct_change": pct_change,
            "executive_summary": summary_text,
            "category_drivers": cat_drivers,
            "region_drivers": reg_drivers
        }
