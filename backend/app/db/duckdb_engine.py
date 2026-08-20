import time
from typing import Dict, Any, List, Optional
import duckdb
from app.core.config import settings
from app.core.security import SQLSecurityValidator

class DuckDBEngine:
    """Manages DuckDB connection, schema introspection, and safe query execution."""

    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or settings.DB_PATH

    def get_connection(self):
        """Returns a read-only DuckDB connection."""
        return duckdb.connect(self.db_path, read_only=False) # Write/Read as needed

    def execute_query(self, sql_str: str) -> Dict[str, Any]:
        """
        Validates SQL AST, executes against DuckDB, and returns structured result.
        """
        # Validate AST
        is_valid, sanitized_sql, err = SQLSecurityValidator.validate_and_format_sql(sql_str)
        if not is_valid:
            return {
                "success": False,
                "error": f"Security/Syntax Validation Failed: {err}",
                "sql": sql_str,
                "rows": [],
                "columns": [],
                "row_count": 0,
                "execution_time_ms": 0
            }

        start_time = time.perf_counter()
        try:
            conn = self.get_connection()
            result = conn.execute(sanitized_sql)
            columns = [desc[0] for desc in result.description] if result.description else []
            raw_rows = result.fetchall()
            conn.close()
            execution_time = round((time.perf_counter() - start_time) * 1000, 2)

            # Convert row tuples to list of dicts
            formatted_rows = [
                {col: (float(val) if isinstance(val, (int, float)) and not isinstance(val, bool) else (str(val) if val is not None else None)) for col, val in zip(columns, row)}
                for row in raw_rows
            ]

            return {
                "success": True,
                "sql": sanitized_sql,
                "columns": columns,
                "rows": formatted_rows,
                "row_count": len(formatted_rows),
                "execution_time_ms": execution_time,
                "error": None
            }
        except Exception as e:
            execution_time = round((time.perf_counter() - start_time) * 1000, 2)
            return {
                "success": False,
                "error": str(e),
                "sql": sanitized_sql,
                "rows": [],
                "columns": [],
                "row_count": 0,
                "execution_time_ms": execution_time
            }

    def get_schema_metadata(self) -> Dict[str, Any]:
        """
        Introspects DuckDB database and returns full structural metadata for ERD & LLM context.
        """
        conn = self.get_connection()
        
        # Get tables
        tables_res = conn.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'main' AND table_type = 'BASE TABLE'
        """).fetchall()
        table_names = [t[0] for t in tables_res]

        schema_info = {}
        relationships = [
            {"from_table": "products", "from_column": "category_id", "to_table": "categories", "to_column": "category_id", "relation": "N:1"},
            {"from_table": "customers", "from_column": "region_id", "to_table": "regions", "to_column": "region_id", "relation": "N:1"},
            {"from_table": "orders", "from_column": "customer_id", "to_table": "customers", "to_column": "customer_id", "relation": "N:1"},
            {"from_table": "orders", "from_column": "region_id", "to_table": "regions", "to_column": "region_id", "relation": "N:1"},
            {"from_table": "order_items", "from_column": "order_id", "to_table": "orders", "to_column": "order_id", "relation": "N:1"},
            {"from_table": "order_items", "from_column": "product_id", "to_table": "products", "to_column": "product_id", "relation": "N:1"},
            {"from_table": "returns", "from_column": "order_item_id", "to_table": "order_items", "to_column": "order_item_id", "relation": "1:1"}
        ]

        # Primary key mapping
        pk_map = {
            "regions": "region_id",
            "categories": "category_id",
            "products": "product_id",
            "customers": "customer_id",
            "orders": "order_id",
            "order_items": "order_item_id",
            "returns": "return_id"
        }

        for tbl in table_names:
            cols_res = conn.execute(f"PRAGMA table_info('{tbl}')").fetchall()
            columns_meta = []
            for col in cols_res:
                col_name = col[1]
                col_type = col[2]
                columns_meta.append({
                    "name": col_name,
                    "type": col_type,
                    "is_pk": (col_name == pk_map.get(tbl)),
                    "is_fk": any(r["from_table"] == tbl and r["from_column"] == col_name for r in relationships)
                })

            count_res = conn.execute(f"SELECT COUNT(*) FROM {tbl}").fetchone()[0]

            schema_info[tbl] = {
                "table_name": tbl,
                "row_count": count_res,
                "columns": columns_meta,
                "primary_key": pk_map.get(tbl)
            }

        conn.close()

        return {
            "tables": schema_info,
            "relationships": relationships
        }

    def get_sample_rows(self, table_name: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Returns sample rows for a specified table."""
        res = self.execute_query(f"SELECT * FROM {table_name} LIMIT {limit}")
        return res.get("rows", [])
