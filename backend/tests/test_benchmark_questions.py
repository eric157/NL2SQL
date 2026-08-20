from pathlib import Path
import re

from app.ai.orchestrator import AIOrchestrator
from app.db.duckdb_engine import DuckDBEngine


def test_100_question_benchmark_executes_safely():
    matrix_path = Path(__file__).parents[2] / "docs" / "AI_ANALYST_EDGE_CASE_QUESTIONS.md"
    questions = [
        match.group(1)
        for line in matrix_path.read_text(encoding="utf-8").splitlines()
        if (match := re.match(r"^\d+\.\s+(.*)$", line))
    ]

    assert len(questions) == 100

    analyst = AIOrchestrator(DuckDBEngine())
    failures = []
    for question in questions:
        result = analyst.process_query(question)
        if not result.get("success"):
            failures.append((question, result.get("error")))

    assert failures == []
