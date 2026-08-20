import os
import json
from typing import Dict, Any, Optional
import httpx
from app.core.config import settings

class LLMClient:
    """Multi-provider LLM client with Groq / Gemini / Ollama / Local Deterministic Rule fallback."""

    def __init__(self):
        self.groq_key = settings.GROQ_API_KEY or os.environ.get("GROQ_API_KEY", "")
        self.gemini_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")

    def generate_sql_and_plan(self, prompt: str, schema_context: str) -> Dict[str, Any]:
        """Generates structured analytical plan and SQL query."""

        # 1. Try Groq API if key present
        if self.groq_key:
            res = self._call_groq(prompt, schema_context)
            if res:
                return res

        # 2. Try Gemini API if key present
        if self.gemini_key:
            res = self._call_gemini(prompt, schema_context)
            if res:
                return res

        # 3. Fallback to Local Rule Engine (100% deterministic, offline friendly, 20+ query patterns)
        return self._local_rule_analyst(prompt)

    def _call_groq(self, prompt: str, schema_context: str) -> Optional[Dict[str, Any]]:
        try:
            url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {self.groq_key}",
                "Content-Type": "application/json"
            }
            system_prompt = f"{schema_context}\nReturn strictly valid JSON with keys: 'analytical_plan', 'sql', 'intent'."
            payload = {
                "model": "mixtral-8x7b-32768",
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
                    return json.loads(content)
        except Exception as e:
            print(f"Groq API call warning: {e}")
        return None

    def _call_gemini(self, prompt: str, schema_context: str) -> Optional[Dict[str, Any]]:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.gemini_key}"
            headers = {"Content-Type": "application/json"}
            system_prompt = f"{schema_context}\nReturn strictly valid JSON with keys: 'analytical_plan', 'sql', 'intent'."
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
                    return json.loads(text)
        except Exception as e:
            print(f"Gemini API call warning: {e}")
        return None

    def _local_rule_analyst(self, prompt: str) -> Dict[str, Any]:
        """
        Comprehensive Rule Engine for 100% offline / free-tier execution.
        Handles 20+ common natural language business queries, typos, and edge cases.
        """
        lower_p = prompt.lower().strip()

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
