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

    JARGON = {
        "AOV / average basket size": "Total order revenue divided by distinct orders; aggregate to order level before averaging.",
        "sales / revenue / turnover": "SUM(oi.line_total), not row count and not unit price.",
        "profit / bottom line": "SUM(oi.line_profit).",
        "margin / profitability": "Profit divided by revenue multiplied by 100; never use AVG of row margins.",
        "buyers / active customers": "COUNT(DISTINCT o.customer_id) among customers with orders.",
        "repeat buyer": "A customer with more than one distinct order.",
        "basket quantity": "The quantity of units or line items within an order; state which one is used.",
        "SKU / product": "A product master record identified by products.product_id.",
        "returns / return rate": "The returns table is a derived estimate, not observed source data.",
        "discount impact": "Compare profit margin across discount tiers; do not infer causality from correlation alone.",
        "region / territory": "The regions.region_name dimension: Central, East, South, or West.",
        "order value": "Revenue summed per order_id before calculating averages, medians, or percentiles.",
        "line item": "One source transaction row represented by order_items.order_item_id."
    }

    FEW_SHOT_EXAMPLES = [
        "Question: What is AOV by segment? Correct approach: aggregate SUM(oi.line_total) per order_id and segment, then average those order totals.",
        "Question: Which category has the best margin? Correct approach: group revenue and profit, then calculate SUM(profit) / SUM(revenue) * 100.",
        "Question: Are returns observed? Correct answer: no; returns are derived estimates because the source CSV has no return fields.",
        "Question: What is a repeat buyer? Correct approach: COUNT(DISTINCT order_id) > 1 for a customer.",
    ]

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

        lines.append("\n### BUSINESS JARGON TRANSLATION:")
        for term, definition in cls.JARGON.items():
            lines.append(f"- **{term}**: {definition}")

        lines.append("\n### CORRECTNESS EXAMPLES:")
        lines.extend(f"- {example}" for example in cls.FEW_SHOT_EXAMPLES)
        
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

    @classmethod
    def get_schema_prompt_context(cls, schema_meta: Dict[str, Any]) -> str:
        """Adds only live table and column names so the model cannot invent schema fields."""
        lines = ["\n### LIVE DATABASE SCHEMA (USE ONLY THESE TABLES AND COLUMNS):"]
        for table_name, table in schema_meta.get("tables", {}).items():
            columns = ", ".join(column["name"] for column in table.get("columns", []))
            lines.append(f"- {table_name}: {columns}")
        lines.append("\n### SOURCE AND PROVENANCE RULES:")
        lines.append("- The source has 9,994 order-item rows; do not call them 9,994 orders.")
        lines.append("- The returns table is derived from discount/profit heuristics and must be labeled estimated.")
        lines.append("- If a requested field is absent, say so instead of inventing it.")
        return "\n".join(lines)

    @classmethod
    def detect_business_terms(cls, question: str) -> List[str]:
        """Returns glossary concepts detected in a user question for transparent retrieval telemetry."""
        lower_question = question.lower()
        detected = []
        for term in cls.JARGON:
            aliases = term.lower().split(" /")
            if any(alias.strip() in lower_question for alias in aliases):
                detected.append(term)
        return detected[:8]
