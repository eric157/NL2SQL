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

        # 3. Fallback to Local Rule Engine (100% deterministic & offline friendly)
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
        Deterministic Rule Engine for 100% offline / free-tier execution.
        Recognizes common business questions and formulates optimal SQL queries.
        """
        lower_p = prompt.lower().strip()

        # Monthly Revenue Trend
        if any(w in lower_p for w in ["monthly revenue", "revenue trend", "sales over time", "monthly sales"]):
            return {
                "intent": "monthly_revenue_trend",
                "analytical_plan": "Aggrgate total line_total revenue by year-month to analyze business revenue trends over time.",
                "sql": """
                SELECT 
                    STRFTIME(o.order_date, '%Y-%m') as order_month,
                    ROUND(SUM(oi.line_total), 2) as total_revenue,
                    COUNT(DISTINCT o.order_id) as total_orders
                FROM orders o
                JOIN order_items oi ON o.order_id = oi.order_id
                GROUP BY order_month
                ORDER BY order_month ASC;
                """
            }

        # Why revenue decline / drop
        if any(w in lower_p for w in ["why", "decline", "drop", "decreased", "fell", "down"]):
            return {
                "intent": "root_cause_decline",
                "analytical_plan": "Analyze category and regional contribution to Q3 2025 revenue variance.",
                "sql": """
                SELECT 
                    c.category_name,
                    reg.region_name,
                    ROUND(SUM(CASE WHEN STRFTIME(o.order_date, '%Y-Q') = '2025-Q2' THEN oi.line_total ELSE 0 END), 2) as q2_revenue,
                    ROUND(SUM(CASE WHEN STRFTIME(o.order_date, '%Y-Q') = '2025-Q3' THEN oi.line_total ELSE 0 END), 2) as q3_revenue,
                    ROUND(SUM(CASE WHEN STRFTIME(o.order_date, '%Y-Q') = '2025-Q3' THEN oi.line_total ELSE 0 END) - SUM(CASE WHEN STRFTIME(o.order_date, '%Y-Q') = '2025-Q2' THEN oi.line_total ELSE 0 END), 2) as revenue_delta
                FROM orders o
                JOIN order_items oi ON o.order_id = oi.order_id
                JOIN products p ON oi.product_id = p.product_id
                JOIN categories c ON p.category_id = c.category_id
                JOIN regions reg ON o.region_id = reg.region_id
                GROUP BY c.category_name, reg.region_name
                ORDER BY revenue_delta ASC;
                """
            }

        # Top Customers / High Value Buyers
        if any(w in lower_p for w in ["top customer", "customers", "highest revenue customer", "buyers", "most revenue"]):
            return {
                "intent": "top_customers",
                "analytical_plan": "Rank top 10 customers by total line_total revenue spent across orders.",
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

        # Category Performance / Growing category
        if any(w in lower_p for w in ["category", "categories", "product category", "department"]):
            return {
                "intent": "category_performance",
                "analytical_plan": "Aggregate total revenue, order item count, and profit by product category.",
                "sql": """
                SELECT 
                    c.category_name,
                    COUNT(DISTINCT oi.order_item_id) as items_sold,
                    ROUND(SUM(oi.line_total), 2) as total_revenue,
                    ROUND(SUM(oi.line_profit), 2) as total_profit,
                    ROUND((SUM(oi.line_profit) / NULLIF(SUM(oi.line_total), 0)) * 100, 1) as margin_pct
                FROM order_items oi
                JOIN products p ON oi.product_id = p.product_id
                JOIN categories c ON p.category_id = c.category_id
                GROUP BY c.category_name
                ORDER BY total_revenue DESC;
                """
            }

        # Regional Performance / Germany / Europe
        if any(w in lower_p for w in ["region", "geography", "germany", "europe", "country", "america"]):
            return {
                "intent": "regional_performance",
                "analytical_plan": "Break down revenue and customer volume across geographic regions.",
                "sql": """
                SELECT 
                    reg.region_name,
                    reg.country,
                    COUNT(DISTINCT o.customer_id) as customer_count,
                    COUNT(DISTINCT o.order_id) as total_orders,
                    ROUND(SUM(oi.line_total), 2) as total_revenue,
                    ROUND(AVG(oi.line_total), 2) as avg_item_value
                FROM orders o
                JOIN order_items oi ON o.order_id = oi.order_id
                JOIN regions reg ON o.region_id = reg.region_id
                GROUP BY reg.region_name, reg.country
                ORDER BY total_revenue DESC;
                """
            }

        # Default Fallback Query
        return {
            "intent": "general_overview",
            "analytical_plan": "Query overall product sales summary.",
            "sql": """
            SELECT 
                p.product_name,
                c.category_name,
                COUNT(DISTINCT oi.order_item_id) as total_units_sold,
                ROUND(SUM(oi.line_total), 2) as total_revenue
            FROM order_items oi
            JOIN products p ON oi.product_id = p.product_id
            JOIN categories c ON p.category_id = c.category_id
            GROUP BY p.product_name, c.category_name
            ORDER BY total_revenue DESC
            LIMIT 10;
            """
        }
