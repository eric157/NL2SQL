from typing import List, Dict, Any

class VizSelector:
    """Intelligently recommends the best visualization format based on query intent and data shape."""

    @staticmethod
    def select_visualization(columns: List[str], rows: List[Dict[str, Any]], intent_hint: str = "") -> Dict[str, Any]:
        row_count = len(rows)

        if row_count == 0:
            return {"type": "table", "title": "Query Results (0 rows)", "x_axis": None, "y_axis": None}

        # 1. KPI Single Metric Check
        if row_count == 1 and len(columns) <= 2:
            val_col = columns[-1]
            return {
                "type": "kpi",
                "title": columns[0].replace("_", " ").title() if len(columns) == 1 else f"{columns[1]} for {rows[0].get(columns[0])}",
                "value_col": val_col,
                "label_col": columns[0] if len(columns) > 1 else None
            }

        # Identify Column Data Types
        date_cols = [c for c in columns if any(d in c.lower() for d in ["date", "month", "year", "day", "quarter", "week"])]
        num_cols = []
        cat_cols = []

        if row_count > 0:
            sample_row = rows[0]
            for col in columns:
                val = sample_row.get(col)
                if isinstance(val, (int, float)) and not isinstance(val, bool):
                    num_cols.append(col)
                elif col not in date_cols:
                    cat_cols.append(col)

        # 2. Time Series -> Line / Area Chart
        if date_cols and num_cols:
            date_col = date_cols[0]
            primary_num = num_cols[0]
            chart_type = "area" if "revenue" in primary_num.lower() or "profit" in primary_num.lower() else "line"
            return {
                "type": chart_type,
                "title": f"{primary_num.replace('_', ' ').title()} over {date_col.replace('_', ' ').title()}",
                "x_axis": date_col,
                "y_axis": num_cols,
                "breakdown_by": cat_cols[0] if cat_cols else None
            }

        # 3. Categorical Breakdown -> Bar / Treemap
        if cat_cols and num_cols:
            cat_col = cat_cols[0]
            primary_num = num_cols[0]
            cardinality = len(set(r.get(cat_col) for r in rows))

            if cardinality > 8 and "category" in cat_col.lower():
                return {
                    "type": "treemap",
                    "title": f"{primary_num.replace('_', ' ').title()} by {cat_col.replace('_', ' ').title()}",
                    "category_col": cat_col,
                    "value_col": primary_num
                }

            return {
                "type": "bar",
                "title": f"{primary_num.replace('_', ' ').title()} by {cat_col.replace('_', ' ').title()}",
                "x_axis": cat_col,
                "y_axis": num_cols,
                "cardinality": cardinality
            }

        # 4. Two Numeric Metrics -> Scatter Plot
        if len(num_cols) >= 2 and not date_cols:
            return {
                "type": "scatter",
                "title": f"{num_cols[0].replace('_', ' ').title()} vs {num_cols[1].replace('_', ' ').title()}",
                "x_axis": num_cols[0],
                "y_axis": num_cols[1],
                "label_col": cat_cols[0] if cat_cols else None
            }

        # Default fallback to Table
        return {
            "type": "table",
            "title": "Analytical Result Table",
            "x_axis": None,
            "y_axis": None
        }
