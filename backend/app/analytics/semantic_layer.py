from typing import Dict, Any, List

class SemanticLayer:
    """Provides business metric definitions, expression mappings, and synonym resolution."""

    METRICS = {
        "revenue": {
            "name": "Total Revenue",
            "sql_expression": "SUM(oi.line_total)",
            "description": "Total monetary value of completed/shipped order items after discounts.",
            "unit": "$",
            "synonyms": ["revenue", "sales", "turnover", "total sales", "gross sales", "income"]
        },
        "orders": {
            "name": "Order Count",
            "sql_expression": "COUNT(DISTINCT o.order_id)",
            "description": "Total number of unique customer orders placed.",
            "unit": "count",
            "synonyms": ["orders", "total orders", "order count", "transactions", "purchases"]
        },
        "customers": {
            "name": "Active Customers",
            "sql_expression": "COUNT(DISTINCT o.customer_id)",
            "description": "Count of unique active buying customers.",
            "unit": "count",
            "synonyms": ["customers", "buyers", "accounts", "clients", "purchasers", "active users"]
        },
        "aov": {
            "name": "Average Order Value (AOV)",
            "sql_expression": "SUM(oi.line_total) / NULLIF(COUNT(DISTINCT o.order_id), 0)",
            "description": "Average revenue generated per order.",
            "unit": "$",
            "synonyms": ["aov", "average order value", "average basket size", "avg sale"]
        },
        "profit": {
            "name": "Total Profit",
            "sql_expression": "SUM(oi.line_profit)",
            "description": "Total net margin earned on sold items.",
            "unit": "$",
            "synonyms": ["profit", "net profit", "margin", "earnings", "bottom line"]
        },
        "profit_margin": {
            "name": "Profit Margin %",
            "sql_expression": "(SUM(oi.line_profit) / NULLIF(SUM(oi.line_total), 0)) * 100",
            "description": "Profit as a percentage of total revenue.",
            "unit": "%",
            "synonyms": ["margin %", "profit margin", "profitability", "margin percentage"]
        },
        "return_rate": {
            "name": "Return Rate %",
            "sql_expression": "(COUNT(DISTINCT r.return_id) * 100.0) / NULLIF(COUNT(DISTINCT oi.order_item_id), 0)",
            "description": "Percentage of items returned by buyers.",
            "unit": "%",
            "synonyms": ["return rate", "returns %", "refund rate", "product returns"]
        }
    }

    DIMENSIONS = {
        "category": "c.category_name",
        "department": "c.department",
        "sub_category": "p.sub_category",
        "product": "p.product_name",
        "region": "reg.region_name",
        "country": "reg.country",
        "segment": "cust.segment",
        "ship_mode": "o.ship_mode",
        "sales_channel": "o.sales_channel",
        "order_year": "EXTRACT(YEAR FROM o.order_date)",
        "order_month": "STRFTIME(o.order_date, '%Y-%m')",
        "order_date": "o.order_date"
    }

    @classmethod
    def get_semantic_prompt_context(cls) -> str:
        """Formulates concise semantic layer metadata string for LLM prompting."""
        lines = [
            "### BUSINESS SEMANTIC LAYER & METRICS",
            "Use the following authoritative standard expressions when generating analytical queries:",
            ""
        ]
        for key, info in cls.METRICS.items():
            syn_str = ", ".join(info["synonyms"])
            lines.append(f"- **{info['name']}** (`{key}`): SQL = `{info['sql_expression']}` | Synonyms: [{syn_str}]")
        
        lines.append("\n### STANDARD JOIN STRUCTURE:")
        lines.append("""
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        JOIN products p ON oi.product_id = p.product_id
        JOIN categories c ON p.category_id = c.category_id
        JOIN customers cust ON o.customer_id = cust.customer_id
        JOIN regions reg ON o.region_id = reg.region_id
        LEFT JOIN returns r ON oi.order_item_id = r.order_item_id
        """)
        return "\n".join(lines)
