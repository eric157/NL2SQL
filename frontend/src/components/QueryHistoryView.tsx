import React from 'react';

export const QueryHistoryView: React.FC = () => {
  const sampleLogs = [
    { id: 1, time: "10:42:15", question: "Why did revenue decline?", sql: "SELECT c.category_name, SUM(CASE WHEN STRFTIME(o.order_date, '%Y-Q') = '2017-Q3' THEN oi.line_total ELSE 0 END) as base_rev...", status: "Success (200 OK)", latency: "8.2ms", rows: 3 },
    { id: 2, time: "10:41:04", question: "Which customers generated the most revenue?", sql: "SELECT cust.customer_name, SUM(oi.line_total) as total_spent FROM orders o JOIN order_items oi...", status: "Success (200 OK)", latency: "6.4ms", rows: 10 },
    { id: 3, time: "10:40:12", question: "Show me monthly revenue", sql: "SELECT STRFTIME(o.order_date, '%Y-%m') as order_month, SUM(oi.line_total) FROM orders o...", status: "Success (200 OK)", latency: "5.1ms", rows: 48 }
  ];

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      <div className="glass-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 className="font-display" style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f8fafc' }}>
            Query & Insight Execution Log
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            Audit trail of natural language questions, AST parsed SQL, execution latency, and DuckDB cache status.
          </p>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <table style={{ width: '100%', fontSize: '0.82rem', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th style={{ padding: '0.6rem' }}>Time</th>
              <th style={{ padding: '0.6rem' }}>Question</th>
              <th style={{ padding: '0.6rem' }}>Generated SQL</th>
              <th style={{ padding: '0.6rem' }}>Status</th>
              <th style={{ padding: '0.6rem' }}>Latency</th>
              <th style={{ padding: '0.6rem' }}>Rows</th>
            </tr>
          </thead>
          <tbody>
            {sampleLogs.map((log) => (
              <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                <td style={{ padding: '0.6rem', color: '#64748b' }}>{log.time}</td>
                <td style={{ padding: '0.6rem', fontWeight: 600 }}>{log.question}</td>
                <td style={{ padding: '0.6rem', fontFamily: 'monospace', color: '#38bdf8', fontSize: '0.75rem' }}>{log.sql.slice(0, 60)}...</td>
                <td style={{ padding: '0.6rem', color: '#10b981' }}>✓ {log.status}</td>
                <td style={{ padding: '0.6rem', color: '#818cf8' }}>{log.latency}</td>
                <td style={{ padding: '0.6rem' }}>{log.rows}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};
