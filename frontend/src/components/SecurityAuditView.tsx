import React, { useState } from 'react';
import { runSecurityCheck } from '../api';
import { ShieldCheck, ShieldAlert, Code2, Play, CheckCircle2, XCircle } from 'lucide-react';

export const SecurityAuditView: React.FC = () => {
  const [inputSql, setInputSql] = useState<string>("SELECT customer_name, SUM(line_total) FROM orders JOIN order_items ON orders.order_id = order_items.order_id GROUP BY customer_name LIMIT 10");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleAudit = async (sqlToTest?: string) => {
    const target = sqlToTest || inputSql;
    if (!target.trim()) return;

    setLoading(true);
    try {
      const res = await runSecurityCheck(target);
      setResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const samplePresets = [
    { label: "Valid Read-Only Query", sql: "SELECT c.category_name, SUM(oi.line_total) FROM order_items oi JOIN products p ON oi.product_id = p.product_id JOIN categories c ON p.category_id = c.category_id GROUP BY c.category_name LIMIT 50" },
    { label: "Malicious DROP TABLE Injection", sql: "DROP TABLE customers;" },
    { label: "Malicious DELETE Statement", sql: "DELETE FROM orders WHERE order_status = 'Processing';" },
    { label: "Multiple Statement Injection", sql: "SELECT * FROM products; DROP TABLE orders;" }
  ];

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div className="glass-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 className="font-display" style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f8fafc' }}>
            SQLGlot AST Security & Read-Only Auditor
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            Ensures LLM-generated SQL queries cannot modify, delete, drop, or alter database structures.
          </p>
        </div>
        <span style={{ fontSize: '0.75rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: 600 }}>
          AST Read-Only Sandbox Active
        </span>
      </div>

      {/* Editor & Presets */}
      <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#818cf8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Code2 style={{ width: '1rem', height: '1rem' }} />
            <span>Test SQL Input String:</span>
          </label>

          {/* Presets */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {samplePresets.map((p, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInputSql(p.sql);
                  handleAudit(p.sql);
                }}
                style={{ fontSize: '0.72rem', color: '#cbd5e1', background: 'rgba(30, 41, 59, 0.6)', padding: '0.25rem 0.65rem', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.08)' }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <textarea
          className="font-mono"
          value={inputSql}
          onChange={(e) => setInputSql(e.target.value)}
          rows={5}
          style={{ width: '100%', background: '#090d16', color: '#38bdf8', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '1rem', fontSize: '0.85rem', lineHeight: 1.5 }}
        />

        <button
          onClick={() => handleAudit()}
          disabled={loading}
          style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem' }}
        >
          <Play style={{ width: '0.85rem', height: '0.85rem' }} />
          <span>Execute AST Security Audit</span>
        </button>
      </div>

      {/* Result Panel */}
      {result && (
        <div className="glass-card" style={{ padding: '1.5rem', borderLeft: `4px solid ${result.is_valid ? '#10b981' : '#f43f5e'}` }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            {result.is_valid ? (
              <ShieldCheck style={{ width: '1.5rem', height: '1.5rem', color: '#10b981' }} />
            ) : (
              <ShieldAlert style={{ width: '1.5rem', height: '1.5rem', color: '#f43f5e' }} />
            )}
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: result.is_valid ? '#10b981' : '#f43f5e' }}>
                {result.is_valid ? 'AST Security Audit PASSED' : 'AST Security Audit REJECTED'}
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                {result.is_valid ? 'SQL complies with strict read-only execution standards.' : result.error}
              </p>
            </div>
          </div>

          {/* Checklist */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '1rem' }}>
            {result.rules_audited.map((rule: any, rIdx: number) => (
              <div key={rIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.85rem', background: 'rgba(30, 41, 59, 0.4)', borderRadius: '6px', fontSize: '0.83rem' }}>
                <span style={{ color: '#f8fafc' }}>{rule.rule}</span>
                {rule.passed ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#10b981', fontWeight: 600, fontSize: '0.78rem' }}>
                    <CheckCircle2 style={{ width: '0.85rem', height: '0.85rem' }} /> Passed
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#f43f5e', fontWeight: 600, fontSize: '0.78rem' }}>
                    <XCircle style={{ width: '0.85rem', height: '0.85rem' }} /> Rejected
                  </span>
                )}
              </div>
            ))}
          </div>

        </div>
      )}

    </div>
  );
};
