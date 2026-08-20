from typing import Dict, Any, List, Optional
import time
from app.db.duckdb_engine import DuckDBEngine
from app.analytics.semantic_layer import SemanticLayer
from app.analytics.data_quality import DataQualityAuditor
from app.analytics.root_cause import RootCauseAnalyzer
from app.analytics.viz_selector import VizSelector
from app.ai.llm_client import LLMClient

class AIOrchestrator:
    """Bounded AI Workflow Orchestrator for NL2SQL Enterprise Analytics."""

    def __init__(self, db_engine: DuckDBEngine):
        self.db = db_engine
        self.llm = LLMClient()
        self.root_cause_engine = RootCauseAnalyzer(db_engine)

    def process_query(self, user_question: str, conversation_history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
        start_time = time.perf_counter()

        # 1. Resolve Conversation Context
        resolved_prompt = self._resolve_context(user_question, conversation_history or [])

        # 2. Get Semantic Layer & Schema Context
        schema_meta = self.db.get_schema_metadata()
        schema_context_str = SemanticLayer.get_semantic_prompt_context()

        # 3. Generate SQL Plan via LLM or Local Rule Engine
        plan_res = self.llm.generate_sql_and_plan(resolved_prompt, schema_context_str)
        initial_sql = plan_res.get("sql", "")
        plan_summary = plan_res.get("analytical_plan", "Executed database query.")

        # 4. Self-Healing SQL Loop (Max 3 attempts)
        repair_attempts = 0
        current_sql = initial_sql
        exec_res = None

        while repair_attempts < 3:
            exec_res = self.db.execute_query(current_sql)
            if exec_res.get("success"):
                break

            repair_attempts += 1
            err_msg = exec_res.get("error", "Unknown error")
            print(f"SQL execution attempt {repair_attempts} failed: {err_msg}. Attempting self-healing repair...")
            
            # Simple self-healing repair prompt
            repair_prompt = f"Original question: '{resolved_prompt}'. Failing SQL: '{current_sql}'. Error: '{err_msg}'. Fix the DuckDB SQL query."
            repaired_plan = self.llm.generate_sql_and_plan(repair_prompt, schema_context_str)
            current_sql = repaired_plan.get("sql", current_sql)

        rows = exec_res.get("rows", [])
        columns = exec_res.get("columns", [])
        final_sql = exec_res.get("sql", current_sql)

        # 5. Data Quality Inspection
        dq_audit = DataQualityAuditor.audit_result(rows, columns)

        # 6. Visualization Decision Tree
        viz_config = VizSelector.select_visualization(columns, rows, intent_hint=plan_res.get("intent", ""))

        # 7. Root-Cause Analysis Check
        root_cause_data = None
        if "why" in user_question.lower() or "decline" in user_question.lower() or "drop" in user_question.lower():
            root_cause_data = self.root_cause_engine.analyze_revenue_decline()

        # 8. Executive Insights & Proactive Suggestions
        insights = self._generate_executive_insights(resolved_prompt, rows, columns, root_cause_data)
        suggestions = self._generate_proactive_suggestions(resolved_prompt, columns, rows)

        total_latency = round((time.perf_counter() - start_time) * 1000, 2)

        return {
            "question": user_question,
            "resolved_prompt": resolved_prompt,
            "analytical_plan": plan_summary,
            "sql": final_sql,
            "success": exec_res.get("success", False),
            "error": exec_res.get("error"),
            "execution_time_ms": exec_res.get("execution_time_ms", 0),
            "total_latency_ms": total_latency,
            "sql_repair_attempts": repair_attempts,
            "columns": columns,
            "rows": rows,
            "row_count": len(rows),
            "data_quality": dq_audit,
            "visualization": viz_config,
            "root_cause_analysis": root_cause_data,
            "executive_insights": insights,
            "suggested_investigations": suggestions
        }

    def _resolve_context(self, current_question: str, history: List[Dict[str, str]]) -> str:
        """Resolves pronouns like 'that', 'germany', 'those customers' using conversation history."""
        if not history:
            return current_question

        last_turn = history[-1]
        last_question = last_turn.get("question", "")

        lower_curr = current_question.lower()
        if "drill into" in lower_curr or "only" in lower_curr or "that" in lower_curr:
            return f"{current_question} (Context from previous query: '{last_question}')"

        return current_question

    def _generate_executive_insights(self, question: str, rows: List[Dict[str, Any]], columns: List[str], root_cause: Optional[Dict[str, Any]]) -> str:
        if root_cause:
            return root_cause["executive_summary"]

        if not rows:
            return "No data records were returned for this criteria. Consider broadening date bounds or filters."

        row_count = len(rows)
        if row_count == 1:
            first_row = rows[0]
            metric_str = ", ".join(f"{k}: {v}" for k, v in first_row.items())
            return f"Analytical Result Summary: {metric_str}."

        first_col = columns[0]
        last_col = columns[-1]
        top_row = rows[0]
        return f"Retrieved {row_count} analytical records. Highest performer by {last_col}: '{top_row.get(first_col)}' with {top_row.get(last_col)}."

    def _generate_proactive_suggestions(self, question: str, columns: List[str], rows: List[Dict[str, Any]]) -> List[str]:
        lower_q = question.lower()
        suggestions = []

        if "why" in lower_q or "decline" in lower_q:
            suggestions = [
                "Which specific products drove the European decline?",
                "How did North America perform during the same quarter?",
                "Was the decline accompanied by an increase in return rate?"
            ]
        elif "customer" in lower_q:
            suggestions = [
                "Which categories do these top customers buy most?",
                "What is the average order frequency for Enterprise buyers?",
                "Compare repeat buyer revenue vs single-order buyers."
            ]
        elif "category" in lower_q or "product" in lower_q:
            suggestions = [
                "Drill into sub-categories for Technology products.",
                "Which regions generate the highest margin for Furniture?",
                "Show monthly revenue trend for Top 5 products."
            ]
        else:
            suggestions = [
                "Why did revenue decline in Q3 2025?",
                "Which customers generated the highest revenue?",
                "Compare Europe vs North America regional performance."
            ]

        return suggestions
