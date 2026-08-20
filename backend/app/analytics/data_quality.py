from typing import List, Dict, Any

class DataQualityAuditor:
    """Audits analytical query results for quality indicators, nulls, duplicates, and outliers."""

    @staticmethod
    def audit_result(rows: List[Dict[str, Any]], columns: List[str]) -> Dict[str, Any]:
        row_count = len(rows)
        if row_count == 0:
            return {
                "row_count": 0,
                "status": "warning",
                "missing_values_count": 0,
                "duplicate_rows_count": 0,
                "outliers_count": 0,
                "badges": [
                    {"level": "warning", "label": "0 rows returned (Empty result set)"}
                ]
            }

        # 1. Null / Missing Values Audit
        null_counts = {col: 0 for col in columns}
        for row in rows:
            for col in columns:
                if row.get(col) is None or row.get(col) == "":
                    null_counts[col] += 1

        total_nulls = sum(null_counts.values())

        # 2. Duplicate Detection
        seen = set()
        duplicates = 0
        for row in rows:
            # Hashable tuple representation
            row_tuple = tuple((k, str(v)) for k, v in sorted(row.items()))
            if row_tuple in seen:
                duplicates += 1
            else:
                seen.add(row_tuple)

        # 3. IQR Outlier Detection on Numerical Columns
        outliers_count = 0
        num_cols = []
        if row_count >= 5:
            for col in columns:
                sample_vals = [r[col] for r in rows if isinstance(r.get(col), (int, float)) and not isinstance(r.get(col), bool)]
                if len(sample_vals) == row_count:
                    num_cols.append((col, sorted(sample_vals)))

            for col_name, sorted_vals in num_cols:
                n = len(sorted_vals)
                q1 = sorted_vals[int(n * 0.25)]
                q3 = sorted_vals[int(n * 0.75)]
                iqr = q3 - q1
                if iqr > 0:
                    lower_bound = q1 - 1.5 * iqr
                    upper_bound = q3 + 1.5 * iqr
                    col_outliers = [v for v in sorted_vals if v < lower_bound or v > upper_bound]
                    outliers_count += len(col_outliers)

        # Generate Badges
        badges = []
        badges.append({"level": "success", "label": f"{row_count:,} rows analyzed"})

        if total_nulls == 0:
            badges.append({"level": "success", "label": "No missing values"})
        else:
            badges.append({"level": "warning", "label": f"{total_nulls} missing values detected"})

        if duplicates == 0:
            badges.append({"level": "success", "label": "No duplicate records"})
        else:
            badges.append({"level": "warning", "label": f"{duplicates} duplicate rows detected"})

        if outliers_count == 0:
            badges.append({"level": "success", "label": "Clean distribution"})
        else:
            badges.append({"level": "info", "label": f"{outliers_count} statistical outliers (IQR)"})

        overall_status = "success" if (total_nulls == 0 and duplicates == 0) else "warning"

        return {
            "row_count": row_count,
            "status": overall_status,
            "missing_values_count": total_nulls,
            "duplicate_rows_count": duplicates,
            "outliers_count": outliers_count,
            "badges": badges
        }
