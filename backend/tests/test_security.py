import pytest
from app.core.security import SQLSecurityValidator

def test_valid_select_query():
    sql = "SELECT customer_name, SUM(line_total) FROM orders JOIN order_items ON orders.order_id = order_items.order_id GROUP BY customer_name"
    is_valid, sanitized_sql, err = SQLSecurityValidator.validate_and_format_sql(sql)
    assert is_valid is True
    assert err is None
    assert "LIMIT 1000" in sanitized_sql

def test_prohibit_drop_table():
    sql = "DROP TABLE orders;"
    is_valid, sanitized_sql, err = SQLSecurityValidator.validate_and_format_sql(sql)
    assert is_valid is False
    assert "Security Violation" in err

def test_prohibit_delete_query():
    sql = "DELETE FROM customers WHERE customer_id = 'CUST-001';"
    is_valid, sanitized_sql, err = SQLSecurityValidator.validate_and_format_sql(sql)
    assert is_valid is False
    assert "Security Violation" in err

def test_prohibit_update_statement():
    sql = "UPDATE orders SET order_status = 'Cancelled';"
    is_valid, sanitized_sql, err = SQLSecurityValidator.validate_and_format_sql(sql)
    assert is_valid is False
    assert "Security Violation" in err

def test_prohibit_multi_statement_injection():
    sql = "SELECT * FROM products; DROP TABLE customers;"
    is_valid, sanitized_sql, err = SQLSecurityValidator.validate_and_format_sql(sql)
    assert is_valid is False
    assert "Multiple SQL statements" in err or "Security Violation" in err

def test_limit_enforcement():
    sql = "SELECT * FROM orders LIMIT 5000"
    is_valid, sanitized_sql, err = SQLSecurityValidator.validate_and_format_sql(sql, max_limit=1000)
    assert is_valid is True
    assert "LIMIT 1000" in sanitized_sql
