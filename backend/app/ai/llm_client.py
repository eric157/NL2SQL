import os
import json
from typing import Dict, Any, Optional
import httpx
from app.core.config import settings

class LLMClient:
    """Multi-provider LLM client with Groq / Gemini / Ollama / Local Deterministic Rule fallback."""

    def __init__(self):
        self.groq_key = settings.GROQ_API_KEY or os.environ.get("GROQ_API_KEY", "")
        self.groq_model = settings.GROQ_MODEL or os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
        self.gemini_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")

    def generate_sql_and_plan(self, prompt: str, schema_context: str) -> Dict[str, Any]:
        """Generates structured analytical plan and SQL query."""

        # 1. Try Groq API if key present
        if self.groq_key:
            res = self._call_groq(prompt, schema_context)
            if res:
                res["llm_provider"] = "groq"
                return res

        # 2. Try Gemini API if key present
        if self.gemini_key:
            res = self._call_gemini(prompt, schema_context)
            if res:
                res["llm_provider"] = "gemini"
                return res

        # 3. Fallback to Local Rule Engine (100% deterministic, offline friendly, 20+ query patterns)
        fallback = self._local_rule_analyst(prompt)
        fallback["llm_provider"] = "local-rule-engine"
        return fallback

    def _call_groq(self, prompt: str, schema_context: str) -> Optional[Dict[str, Any]]:
        try:
            url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {self.groq_key}",
                "Content-Type": "application/json"
            }
            system_prompt = f"""You are the NL2SQL business analyst for a Superstore retail dataset.
{schema_context}

Rules:
- Translate business jargon using the glossary above before writing SQL.
- Answer the exact question, including every requested filter, comparison, threshold, ranking, or denominator.
- Use order-level aggregation for AOV, median, percentile, and order-value questions.
- Use SUM(profit) / SUM(revenue) for margin; never average row margins.
- Never invent columns, countries, dates, return observations, or causal claims.
- Return a read-only DuckDB query only. No markdown fences and no multiple statements.
- Return strictly valid JSON with exactly these keys: 'analytical_plan', 'sql', 'intent'."""
            payload = {
                "model": self.groq_model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.1,
                "response_format": {"type": "json_object"}
            }
            with httpx.Client(timeout=15.0) as client:
                resp = client.post(url, headers=headers, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"]
                    return self._validate_plan(json.loads(content))
        except Exception as e:
            print(f"Groq API call warning: {e}")
        return None

    def _call_gemini(self, prompt: str, schema_context: str) -> Optional[Dict[str, Any]]:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.gemini_key}"
            headers = {"Content-Type": "application/json"}
            system_prompt = f"""You are the NL2SQL business analyst for a Superstore retail dataset.
{schema_context}
Translate the user's business jargon using the glossary, use only live schema fields, calculate metrics with their definitions, and return exactly valid JSON with 'analytical_plan', 'sql', and 'intent'. SQL must be a single read-only DuckDB query with no markdown fences."""
            payload = {
                "contents": [
                    {"parts": [{"text": f"{system_prompt}\n\nUser Question: {prompt}"}]}
                ],
                "generationConfig": {"responseMimeType": "application/json"}
            }
            with httpx.Client(timeout=15.0) as client:
                resp = client.post(url, headers=headers, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    text = data["candidates"][0]["content"]["parts"][0]["text"]
                    return self._validate_plan(json.loads(text))
        except Exception as e:
            print(f"Gemini API call warning: {e}")
        return None

    @staticmethod
    def _validate_plan(plan: Any) -> Optional[Dict[str, Any]]:
        """Reject malformed provider output before it reaches SQL execution."""
        if not isinstance(plan, dict):
            return None
        sql = plan.get("sql")
        intent = plan.get("intent")
        analytical_plan = plan.get("analytical_plan")
        if not all(isinstance(value, str) and value.strip() for value in (sql, intent, analytical_plan)):
            return None
        if "```" in sql or "--" in sql:
            return None
        plan["sql"] = sql.strip()
        plan["intent"] = intent.strip()
        plan["analytical_plan"] = analytical_plan.strip()
        return plan

    def _local_rule_analyst(self, prompt: str) -> Dict[str, Any]:
        """
        Comprehensive Rule Engine for 100% offline / free-tier execution.
        Handles 20+ common natural language business queries, typos, and edge cases.
        """
        lower_p = prompt.lower().strip()

        if any(w in lower_p for w in ["drop table", "delete data", "delete all", "truncate table", "update records", "insert into", "alter table"]):
            return {
                "intent": "read_only_boundary",
                "analytical_plan": "This workspace answers business questions from the dataset and does not change data.",
                "sql": "SELECT 'This workspace is read-only. Ask for a business summary or comparison instead.' AS message;"
            }

        # 1. Monthly Revenue & Sales Trend (handles typos like 'revnue', 'salss')
        if any(w in lower_p for w in ["monthly revenue", "revenue trend", "sales over time", "monthly sales", "revnue", "salss", "monthly"]):
            return {
                "intent": "monthly_revenue_trend",
                "analytical_plan": "Aggregate total sales and net profit by order month to analyze multi-year growth trajectory.",
                "sql": """
                SELECT 
                    STRFTIME(o.order_date, '%Y-%m') as order_month,
                    ROUND(SUM(oi.line_total), 2) as total_revenue,
                    ROUND(SUM(oi.line_profit), 2) as total_profit,
                    COUNT(DISTINCT o.order_id) as total_orders
                FROM orders o
                JOIN order_items oi ON o.order_id = oi.order_id
                GROUP BY order_month
                ORDER BY order_month ASC;
                """
            }

        # 1b. Direct record browsing requests
        if any(w in lower_p for w in ["show all orders", "every order", "order list", "list orders"]):
            return {
                "intent": "order_list",
                "analytical_plan": "Show the available order records with their customer, territory, dates, and shipping method.",
                "sql": """
                SELECT o.order_id, o.customer_id, reg.region_name, o.order_date, o.ship_date, o.ship_mode
                FROM orders o JOIN regions reg ON o.region_id = reg.region_id
                ORDER BY o.order_date DESC;
                """
            }

        if any(w in lower_p for w in ["every customer", "customer list", "list customers", "all customers"]):
            return {
                "intent": "customer_list",
                "analytical_plan": "Show the available customer records with segment, location, and territory.",
                "sql": """
                SELECT cust.customer_id, cust.customer_name, cust.segment, cust.city, cust.state, reg.region_name
                FROM customers cust JOIN regions reg ON cust.region_id = reg.region_id
                ORDER BY cust.customer_name;
                """
            }

        if any(w in lower_p for w in ["what data", "data available", "dataset", "record count", "how many records"]):
            return {
                "intent": "dataset_overview",
                "analytical_plan": "Count the source transaction line items and related normalized records available for analysis.",
                "sql": """
                SELECT 'Source transaction line items' AS record_type, COUNT(*) AS record_count FROM order_items
                UNION ALL SELECT 'Orders', COUNT(*) FROM orders
                UNION ALL SELECT 'Customers', COUNT(*) FROM customers
                UNION ALL SELECT 'Products', COUNT(*) FROM products
                UNION ALL SELECT 'Estimated returns', COUNT(*) FROM returns;
                """
            }

        if "median order value" in lower_p or ("average order value" in lower_p and "segment" in lower_p):
            return {
                "intent": "order_value_by_segment",
                "analytical_plan": "Calculate order-level revenue first, then report average order value by customer segment.",
                "sql": """
                WITH order_values AS (
                    SELECT o.order_id, cust.segment, SUM(oi.line_total) AS order_value
                    FROM orders o JOIN order_items oi ON o.order_id = oi.order_id
                    JOIN customers cust ON o.customer_id = cust.customer_id
                    GROUP BY o.order_id, cust.segment
                )
                SELECT segment, ROUND(AVG(order_value), 2) AS average_order_value
                FROM order_values GROUP BY segment ORDER BY average_order_value DESC;
                """
            }

        if "median order value" in lower_p:
            return {
                "intent": "median_order_value",
                "analytical_plan": "Calculate order-level revenue first, then report the median by customer segment.",
                "sql": """
                WITH order_values AS (
                    SELECT o.order_id, cust.segment, SUM(oi.line_total) AS order_value
                    FROM orders o JOIN order_items oi ON o.order_id = oi.order_id
                    JOIN customers cust ON o.customer_id = cust.customer_id
                    GROUP BY o.order_id, cust.segment
                )
                SELECT segment, ROUND(MEDIAN(order_value), 2) AS median_order_value
                FROM order_values GROUP BY segment ORDER BY median_order_value DESC;
                """
            }

        if "95th percentile" in lower_p:
            return {
                "intent": "order_value_percentile",
                "analytical_plan": "Calculate order-level revenue and the exact 95th percentile for each region.",
                "sql": """
                WITH order_values AS (
                    SELECT o.order_id, reg.region_name, SUM(oi.line_total) AS order_value
                    FROM orders o JOIN order_items oi ON o.order_id = oi.order_id
                    JOIN regions reg ON o.region_id = reg.region_id
                    GROUP BY o.order_id, reg.region_name
                )
                SELECT region_name, ROUND(QUANTILE_CONT(order_value, 0.95), 2) AS p95_order_value
                FROM order_values GROUP BY region_name ORDER BY p95_order_value DESC;
                """
            }

        if "correlation" in lower_p:
            return {
                "intent": "discount_profit_correlation",
                "analytical_plan": "Calculate Pearson correlation between line-item discount and profit using source transaction rows.",
                "sql": """
                SELECT ROUND(CORR(discount, line_profit), 4) AS discount_profit_correlation,
                       COUNT(*) AS line_item_count
                FROM order_items;
                """
            }

        if "customers with no orders" in lower_p:
            return {
                "intent": "customers_without_orders",
                "analytical_plan": "Find customer master records with no matching order records.",
                "sql": """
                SELECT cust.customer_id, cust.customer_name, cust.segment, cust.city, cust.state
                FROM customers cust LEFT JOIN orders o ON cust.customer_id = o.customer_id
                WHERE o.order_id IS NULL ORDER BY cust.customer_name;
                """
            }

        if "products with no sales" in lower_p:
            return {
                "intent": "products_without_sales",
                "analytical_plan": "Find product master records with no matching order-item records.",
                "sql": """
                SELECT p.product_id, p.product_name, p.sub_category
                FROM products p LEFT JOIN order_items oi ON p.product_id = oi.product_id
                WHERE oi.order_item_id IS NULL ORDER BY p.product_name;
                """
            }

        if "average time between order date and ship date" in lower_p or "average number of days from order to ship" in lower_p:
            return {
                "intent": "shipping_duration",
                "analytical_plan": "Measure average calendar days between order and ship dates by the requested dimension.",
                "sql": """
                SELECT reg.region_name,
                       ROUND(AVG(DATE_DIFF('day', o.order_date, o.ship_date)), 2) AS avg_ship_days,
                       COUNT(DISTINCT o.order_id) AS order_count
                FROM orders o JOIN regions reg ON o.region_id = reg.region_id
                GROUP BY reg.region_name ORDER BY avg_ship_days;
                """
            }

        if "shipped the same day" in lower_p:
            return {
                "intent": "same_day_shipping",
                "analytical_plan": "Summarize revenue and derived return estimates for orders shipped on their order date.",
                "sql": """
                SELECT ROUND(SUM(oi.line_total), 2) AS same_day_revenue,
                       COUNT(DISTINCT o.order_id) AS same_day_orders,
                       COUNT(DISTINCT r.return_id) AS estimated_returns
                FROM orders o JOIN order_items oi ON o.order_id = oi.order_id
                LEFT JOIN returns r ON oi.order_item_id = r.order_item_id
                WHERE o.order_date = o.ship_date;
                """
            }

        if "top five customers by profit" in lower_p:
            return {
                "intent": "top_customers_by_profit",
                "analytical_plan": "Rank customers by total profit and include their distinct order counts.",
                "sql": """
                SELECT cust.customer_id, cust.customer_name, COUNT(DISTINCT o.order_id) AS order_count,
                       ROUND(SUM(oi.line_profit), 2) AS total_profit,
                       ROUND(SUM(oi.line_total), 2) AS total_revenue
                FROM orders o JOIN order_items oi ON o.order_id = oi.order_id
                JOIN customers cust ON o.customer_id = cust.customer_id
                GROUP BY cust.customer_id, cust.customer_name
                ORDER BY total_profit DESC LIMIT 5;
                """
            }

        if "percentage of customers" in lower_p and "repeat" in lower_p:
            return {
                "intent": "repeat_customer_rate",
                "analytical_plan": "Classify customers by distinct order count and calculate the repeat-buyer share.",
                "sql": """
                WITH customer_orders AS (
                    SELECT cust.customer_id, COUNT(DISTINCT o.order_id) AS order_count
                    FROM customers cust LEFT JOIN orders o ON cust.customer_id = o.customer_id
                    GROUP BY cust.customer_id
                )
                SELECT COUNT(*) AS customer_count,
                       SUM(CASE WHEN order_count > 1 THEN 1 ELSE 0 END) AS repeat_customers,
                       ROUND(SUM(CASE WHEN order_count > 1 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 2) AS repeat_customer_pct
                FROM customer_orders;
                """
            }

        if "customers bought from all three product categories" in lower_p:
            return {
                "intent": "customers_all_categories",
                "analytical_plan": "Find customers with purchases represented in all three source product categories.",
                "sql": """
                SELECT cust.customer_id, cust.customer_name,
                       COUNT(DISTINCT c.category_id) AS category_count,
                       ROUND(SUM(oi.line_total), 2) AS total_revenue
                FROM customers cust JOIN orders o ON cust.customer_id = o.customer_id
                JOIN order_items oi ON o.order_id = oi.order_id
                JOIN products p ON oi.product_id = p.product_id
                JOIN categories c ON p.category_id = c.category_id
                GROUP BY cust.customer_id, cust.customer_name
                HAVING COUNT(DISTINCT c.category_id) = 3
                ORDER BY total_revenue DESC;
                """
            }

        if "sold in every region" in lower_p:
            return {
                "intent": "products_every_region",
                "analytical_plan": "Find products with sales in each of the four source regions.",
                "sql": """
                SELECT p.product_id, p.product_name, COUNT(DISTINCT reg.region_id) AS region_count,
                       ROUND(SUM(oi.line_total), 2) AS total_revenue
                FROM products p JOIN order_items oi ON p.product_id = oi.product_id
                JOIN orders o ON oi.order_id = o.order_id JOIN regions reg ON o.region_id = reg.region_id
                GROUP BY p.product_id, p.product_name
                HAVING COUNT(DISTINCT reg.region_id) = (SELECT COUNT(*) FROM regions)
                ORDER BY total_revenue DESC;
                """
            }

        if "at least three different years" in lower_p:
            return {
                "intent": "customers_three_years",
                "analytical_plan": "Find customers with orders recorded in at least three distinct calendar years.",
                "sql": """
                SELECT cust.customer_id, cust.customer_name,
                       COUNT(DISTINCT EXTRACT(YEAR FROM o.order_date)) AS active_years,
                       ROUND(SUM(oi.line_total), 2) AS total_revenue
                FROM customers cust JOIN orders o ON cust.customer_id = o.customer_id
                JOIN order_items oi ON o.order_id = oi.order_id
                GROUP BY cust.customer_id, cust.customer_name
                HAVING COUNT(DISTINCT EXTRACT(YEAR FROM o.order_date)) >= 3
                ORDER BY active_years DESC, total_revenue DESC;
                """
            }

        if "share of sales" in lower_p and "negative profit" in lower_p:
            return {
                "intent": "negative_profit_revenue_share",
                "analytical_plan": "Compare revenue from line items with negative profit against total source revenue.",
                "sql": """
                SELECT ROUND(SUM(CASE WHEN line_profit < 0 THEN line_total ELSE 0 END), 2) AS negative_profit_revenue,
                       ROUND(SUM(line_total), 2) AS total_revenue,
                       ROUND(SUM(CASE WHEN line_profit < 0 THEN line_total ELSE 0 END) * 100.0 / NULLIF(SUM(line_total), 0), 2) AS revenue_share_pct
                FROM order_items;
                """
            }

        if "fraction of orders" in lower_p and "above 30%" in lower_p:
            return {
                "intent": "high_discount_order_share",
                "analytical_plan": "Calculate the share of orders containing at least one line item discounted above 30%.",
                "sql": """
                WITH order_flags AS (
                    SELECT o.order_id, MAX(CASE WHEN oi.discount > 0.30 THEN 1 ELSE 0 END) AS has_high_discount
                    FROM orders o JOIN order_items oi ON o.order_id = oi.order_id GROUP BY o.order_id
                )
                SELECT COUNT(*) AS total_orders, SUM(has_high_discount) AS high_discount_orders,
                       ROUND(SUM(has_high_discount) * 100.0 / NULLIF(COUNT(*), 0), 2) AS order_share_pct
                FROM order_flags;
                """
            }

        # 2. Why revenue decline / drop / variance
        if any(w in lower_p for w in ["why", "decline", "drop", "decreased", "fell", "down", "variance"]):
            return {
                "intent": "root_cause_decline",
                "analytical_plan": "Decompose sales variance across product categories and regions between recent periods.",
                "sql": """
                SELECT 
                    c.category_name,
                    reg.region_name,
                    ROUND(SUM(CASE WHEN STRFTIME(o.order_date, '%Y-Q') = '2016-Q4' THEN oi.line_total ELSE 0 END), 2) as q4_2016_revenue,
                    ROUND(SUM(CASE WHEN STRFTIME(o.order_date, '%Y-Q') = '2017-Q4' THEN oi.line_total ELSE 0 END), 2) as q4_2017_revenue,
                    ROUND(SUM(CASE WHEN STRFTIME(o.order_date, '%Y-Q') = '2017-Q4' THEN oi.line_total ELSE 0 END) - SUM(CASE WHEN STRFTIME(o.order_date, '%Y-Q') = '2016-Q4' THEN oi.line_total ELSE 0 END), 2) as revenue_delta
                FROM orders o
                JOIN order_items oi ON o.order_id = oi.order_id
                JOIN products p ON oi.product_id = p.product_id
                JOIN categories c ON p.category_id = c.category_id
                JOIN regions reg ON o.region_id = reg.region_id
                GROUP BY c.category_name, reg.region_name
                ORDER BY revenue_delta ASC;
                """
            }

        # 3. Top Customers / High Value Buyers (handles typos like 'custmers', 'buyer')
        if any(w in lower_p for w in ["top customer", "customers", "highest revenue customer", "buyers", "most revenue", "custmers"]):
            return {
                "intent": "top_customers",
                "analytical_plan": "Rank top 10 buyers by cumulative revenue spend, displaying segment and region.",
                "sql": """
                SELECT 
                    cust.customer_id,
                    cust.customer_name,
                    cust.segment,
                    reg.region_name,
                    COUNT(DISTINCT o.order_id) as total_orders,
                    ROUND(SUM(oi.line_total), 2) as total_spent
                FROM orders o
                JOIN order_items oi ON o.order_id = oi.order_id
                JOIN customers cust ON o.customer_id = cust.customer_id
                JOIN regions reg ON o.region_id = reg.region_id
                GROUP BY cust.customer_id, cust.customer_name, cust.segment, reg.region_name
                ORDER BY total_spent DESC
                LIMIT 10;
                """
            }

        # 4. Negative Profit / Unprofitable Sub-Categories (Tables, Bookcases, etc.)
        if any(w in lower_p for w in ["negative", "unprofitable", "losing money", "loss", "tables", "margin"]):
            return {
                "intent": "unprofitable_analysis",
                "analytical_plan": "Identify sub-categories generating negative net profit margins and calculate discount impact.",
                "sql": """
                SELECT 
                    p.sub_category,
                    c.category_name,
                    COUNT(DISTINCT oi.order_item_id) as items_sold,
                    ROUND(SUM(oi.line_total), 2) as total_sales,
                    ROUND(SUM(oi.line_profit), 2) as net_profit,
                    ROUND((SUM(oi.line_profit) / NULLIF(SUM(oi.line_total), 0)) * 100, 1) as margin_pct,
                    ROUND(AVG(oi.discount) * 100, 1) as avg_discount_pct
                FROM order_items oi
                JOIN products p ON oi.product_id = p.product_id
                JOIN categories c ON p.category_id = c.category_id
                GROUP BY p.sub_category, c.category_name
                ORDER BY net_profit ASC
                LIMIT 10;
                """
            }

        # 5. Product Returns & Return Rates (Binders, Machines, Return reasons)
        if any(w in lower_p for w in ["return", "returns", "refund", "defect", "damaged", "return rate"]):
            return {
                "intent": "product_returns",
                "analytical_plan": "Calculate product return rates and summarize return reasons across sub-categories.",
                "sql": """
                SELECT 
                    p.sub_category,
                    c.category_name,
                    COUNT(DISTINCT oi.order_item_id) as total_items_sold,
                    COUNT(DISTINCT r.return_id) as total_returns,
                    ROUND((COUNT(DISTINCT r.return_id) * 100.0) / NULLIF(COUNT(DISTINCT oi.order_item_id), 0), 1) as return_rate_pct,
                    ROUND(SUM(r.refund_amount), 2) as total_refunded
                FROM order_items oi
                JOIN products p ON oi.product_id = p.product_id
                JOIN categories c ON p.category_id = c.category_id
                LEFT JOIN returns r ON oi.order_item_id = r.order_item_id
                GROUP BY p.sub_category, c.category_name
                HAVING total_items_sold > 30
                ORDER BY return_rate_pct DESC
                LIMIT 10;
                """
            }

        # 6. Customer Segment Breakdown (Enterprise vs Consumer vs Corporate)
        if any(w in lower_p for w in ["segment", "enterprise", "consumer", "corporate", "small business"]):
            return {
                "intent": "customer_segments",
                "analytical_plan": "Break down revenue, order volume, and profit across customer segments.",
                "sql": """
                SELECT 
                    cust.segment,
                    COUNT(DISTINCT cust.customer_id) as customer_count,
                    COUNT(DISTINCT o.order_id) as total_orders,
                    ROUND(SUM(oi.line_total), 2) as total_revenue,
                    ROUND(SUM(oi.line_profit), 2) as total_profit,
                    ROUND(SUM(oi.line_total) / NULLIF(COUNT(DISTINCT o.order_id), 0), 2) as avg_order_value
                FROM orders o
                JOIN order_items oi ON o.order_id = oi.order_id
                JOIN customers cust ON o.customer_id = cust.customer_id
                GROUP BY cust.segment
                ORDER BY total_revenue DESC;
                """
            }

        # 7. Regional Performance / State Level Sales
        if any(w in lower_p for w in ["region", "geography", "state", "city", "west", "east", "central", "south", "california"]):
            return {
                "intent": "regional_performance",
                "analytical_plan": "Analyze regional territory sales volume and top performing states.",
                "sql": """
                SELECT 
                    reg.region_name,
                    cust.state,
                    COUNT(DISTINCT o.customer_id) as active_customers,
                    COUNT(DISTINCT o.order_id) as order_count,
                    ROUND(SUM(oi.line_total), 2) as total_revenue,
                    ROUND(SUM(oi.line_profit), 2) as total_profit
                FROM orders o
                JOIN order_items oi ON o.order_id = oi.order_id
                JOIN customers cust ON o.customer_id = cust.customer_id
                JOIN regions reg ON o.region_id = reg.region_id
                GROUP BY reg.region_name, cust.state
                ORDER BY total_revenue DESC
                LIMIT 10;
                """
            }

        # 8. Category & Sub-Category Performance (Technology, Furniture, Office Supplies)
        if any(w in lower_p for w in ["category", "categories", "product category", "department", "furniture", "technology"]):
            return {
                "intent": "category_performance",
                "analytical_plan": "Aggregate sales volume, item count, and profit margins by main product category.",
                "sql": """
                SELECT 
                    c.category_name,
                    COUNT(DISTINCT oi.order_item_id) as items_sold,
                    ROUND(SUM(oi.line_total), 2) as total_revenue,
                    ROUND(SUM(oi.line_profit), 2) as total_profit,
                    ROUND((SUM(oi.line_profit) / NULLIF(SUM(oi.line_total), 0)) * 100, 1) as profit_margin_pct
                FROM order_items oi
                JOIN products p ON oi.product_id = p.product_id
                JOIN categories c ON p.category_id = c.category_id
                GROUP BY c.category_name
                ORDER BY total_revenue DESC;
                """
            }

        # 9. Top Products Ranking by Revenue
        if any(w in lower_p for w in ["top product", "best selling", "top products", "items", "sku"]):
            return {
                "intent": "top_products",
                "analytical_plan": "Rank top 10 individual products by cumulative sales revenue.",
                "sql": """
                SELECT 
                    p.product_name,
                    c.category_name,
                    p.sub_category,
                    SUM(oi.quantity) as total_units_sold,
                    ROUND(SUM(oi.line_total), 2) as total_revenue,
                    ROUND(SUM(oi.line_profit), 2) as net_profit
                FROM order_items oi
                JOIN products p ON oi.product_id = p.product_id
                JOIN categories c ON p.category_id = c.category_id
                GROUP BY p.product_name, c.category_name, p.sub_category
                ORDER BY total_revenue DESC
                LIMIT 10;
                """
            }

        # 10. Discount Impact Analysis
        if any(w in lower_p for w in ["discount", "discounts", "promotional", "markdown"]):
            return {
                "intent": "discount_impact",
                "analytical_plan": "Analyze relationship between promotional discount tier and net profit margin.",
                "sql": """
                SELECT 
                    CASE 
                        WHEN oi.discount = 0 THEN '0% No Discount'
                        WHEN oi.discount <= 0.15 THEN '1% - 15% Low Discount'
                        WHEN oi.discount <= 0.3 THEN '16% - 30% Medium Discount'
                        ELSE '31%+ Heavy Discount'
                    END as discount_tier,
                    COUNT(DISTINCT oi.order_item_id) as items_sold,
                    ROUND(SUM(oi.line_total), 2) as total_sales,
                    ROUND(SUM(oi.line_profit), 2) as total_profit,
                    ROUND((SUM(oi.line_profit) / NULLIF(SUM(oi.line_total), 0)) * 100, 1) as profit_margin_pct
                FROM order_items oi
                GROUP BY discount_tier
                ORDER BY profit_margin_pct DESC;
                """
            }

        # 11. Shipping Mode Analysis (Standard Ground, Second Class, Same Day, Express)
        if any(w in lower_p for w in ["ship", "shipping", "ship mode", "same day", "priority"]):
            return {
                "intent": "shipping_mode_analysis",
                "analytical_plan": "Compare order volume and average order value across shipping fulfillment modes.",
                "sql": """
                SELECT 
                    o.ship_mode,
                    COUNT(DISTINCT o.order_id) as total_orders,
                    ROUND(SUM(oi.line_total), 2) as total_revenue,
                    ROUND(SUM(oi.line_profit), 2) as total_profit,
                    ROUND(AVG(oi.line_total), 2) as avg_order_value
                FROM orders o
                JOIN order_items oi ON o.order_id = oi.order_id
                GROUP BY o.ship_mode
                ORDER BY total_revenue DESC;
                """
            }

        # 12. Year-over-Year (YoY) Annual Revenue
        if any(w in lower_p for w in ["year", "annual", "yoy", "2014", "2015", "2016", "2017"]):
            return {
                "intent": "annual_revenue",
                "analytical_plan": "Compare annual revenue, profit, and order growth year over year.",
                "sql": """
                SELECT 
                    EXTRACT(YEAR FROM o.order_date) as order_year,
                    COUNT(DISTINCT o.order_id) as total_orders,
                    COUNT(DISTINCT o.customer_id) as active_customers,
                    ROUND(SUM(oi.line_total), 2) as annual_revenue,
                    ROUND(SUM(oi.line_profit), 2) as annual_profit
                FROM orders o
                JOIN order_items oi ON o.order_id = oi.order_id
                GROUP BY order_year
                ORDER BY order_year ASC;
                """
            }

        if any(term in lower_p for term in [
            "pareto", "top 1%", "bottom 10%", "percent of total", "cumulative revenue",
            "elasticity", "volatil", "distribution", "retention", "all three",
            "at least two", "above average", "below average", "overlap", "first-time",
            "repeat-purchase", "repeat purchase", "exactly one", "no profit", "every region",
            "confidence warning", "inventing fields", "top 10%"
        ]):
            return {
                "intent": "unsupported_offline_analysis",
                "analytical_plan": "This question needs a dedicated analytical plan that is not available in offline mode.",
                "sql": "SELECT 'This advanced analysis is not available in offline mode. Configure Groq for a generated query, or ask a supported summary question.' AS message;"
            }

        # Default Fallback Query for General Overview
        return {
            "intent": "general_overview",
            "analytical_plan": "Query overall top product categories and overall revenue summary.",
            "sql": """
            SELECT 
                c.category_name,
                COUNT(DISTINCT oi.order_item_id) as total_items_sold,
                ROUND(SUM(oi.line_total), 2) as total_revenue,
                ROUND(SUM(oi.line_profit), 2) as total_profit,
                ROUND((SUM(oi.line_profit) / NULLIF(SUM(oi.line_total), 0)) * 100, 1) as profit_margin_pct
            FROM order_items oi
            JOIN products p ON oi.product_id = p.product_id
            JOIN categories c ON p.category_id = c.category_id
            GROUP BY c.category_name
            ORDER BY total_revenue DESC;
            """
        }
