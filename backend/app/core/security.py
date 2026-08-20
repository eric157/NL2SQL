from typing import Tuple, Optional
import sqlglot
import sqlglot.expressions as exp

PROHIBITED_NODES = (
    exp.Insert,
    exp.Update,
    exp.Delete,
    exp.Drop,
    exp.Create,
    exp.Alter,
    exp.Command,
    exp.Transaction,
    exp.Commit,
    exp.Rollback,
)

DANGEROUS_FUNCTIONS = {
    "read_csv",
    "read_parquet",
    "read_json",
    "read_blob",
    "write_csv",
    "copy",
    "attach",
    "detach",
    "install",
    "load",
    "system",
}

class SQLSecurityError(ValueError):
    """Exception raised when SQL violates security AST rules."""
    pass

class SQLSecurityValidator:
    """Uses SQLGlot to parse, inspect, and enforce strict read-only security rules on generated SQL."""

    @staticmethod
    def validate_and_format_sql(sql_str: str, max_limit: int = 1000) -> Tuple[bool, str, Optional[str]]:
        """
        Validates that the provided SQL is strictly read-only SELECT or WITH statement.
        Appends LIMIT clause if missing or if exceeding max_limit.

        Returns:
            (is_valid: bool, processed_sql: str, error_message: Optional[str])
        """
        clean_sql = sql_str.strip()
        if not clean_sql:
            return False, "", "Empty SQL query provided."

        # Remove trailing semicolon
        if clean_sql.endswith(";"):
            clean_sql = clean_sql[:-1].strip()

        try:
            # Parse statements
            parsed_statements = sqlglot.parse(clean_sql, read="duckdb")
        except Exception as err:
            return False, clean_sql, f"SQL Syntax Error during AST parsing: {str(err)}"

        if len(parsed_statements) == 0:
            return False, clean_sql, "No valid SQL statements found."

        if len(parsed_statements) > 1:
            return False, clean_sql, "Security Violation: Multiple SQL statements in a single execution are prohibited."

        statement = parsed_statements[0]
        if statement is None:
            return False, clean_sql, "Failed to parse SQL AST."

        # Check statement root type (Must be Select or With)
        if not isinstance(statement, (exp.Select, exp.With)):
            return False, clean_sql, f"Security Violation: Only SELECT or WITH queries are allowed. Got root statement type '{statement.key.upper()}'."

        # Walk AST to detect prohibited statement nodes
        for node in statement.walk():
            if isinstance(node, PROHIBITED_NODES):
                node_type = node.key.upper() if hasattr(node, "key") else str(type(node))
                return False, clean_sql, f"Security Violation: Prohibited operation '{node_type}' detected in AST."

            # Check function calls for file system or system access
            if isinstance(node, exp.Anonymous):
                func_name = node.name.lower()
                if func_name in DANGEROUS_FUNCTIONS:
                    return False, clean_sql, f"Security Violation: Restricted function '{func_name}' is not permitted."
            
            if isinstance(node, exp.Func):
                func_name = node.key.lower()
                if func_name in DANGEROUS_FUNCTIONS:
                    return False, clean_sql, f"Security Violation: Restricted function '{func_name}' is not permitted."

        # Enforce LIMIT
        sanitized_ast = SQLSecurityValidator._enforce_limit(statement, max_limit)
        final_sql = sanitized_ast.sql(dialect="duckdb")

        return True, final_sql, None

    @staticmethod
    def _enforce_limit(ast_statement: exp.Expression, max_limit: int) -> exp.Expression:
        """Ensures the top-level SELECT statement has a LIMIT <= max_limit."""
        if isinstance(ast_statement, exp.With):
            target_select = ast_statement.this
            if isinstance(target_select, exp.Select):
                # Remove existing limit and apply max_limit
                target_select.args.pop("limit", None)
                ast_statement.this = target_select.limit(max_limit)
            return ast_statement

        if isinstance(ast_statement, exp.Select):
            ast_statement.args.pop("limit", None)
            return ast_statement.limit(max_limit)

        return ast_statement
