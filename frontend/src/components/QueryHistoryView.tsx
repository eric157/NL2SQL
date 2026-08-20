import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { API_BASE } from '../api';

export const QueryHistoryView: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/history`, {
        headers: { "X-Session-ID": window.localStorage.getItem('nl2sql-session-id') || '' }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.history || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div className="glass-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 className="font-display" style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f8fafc' }}>
            Query & Insight Execution Log
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            Real-time audit trail of natural language questions, AST parsed SQL, execution latency, and DuckDB result counts.
          </p>
        </div>
        <button
          onClick={loadHistory}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.75rem', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.3)', fontSize: '0.8rem' }}
        >
          <RefreshCw style={{ width: '0.85rem', height: '0.85rem' }} />
          <span>Refresh History</span>
        </button>
      </div>

      {/* Logs Table */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        {logs.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
            <p>No queries executed in this session yet. Ask questions in the AI Analyst tab to populate live query logs!</p>
          </div>
        ) : (
          <table style={{ width: '100%', fontSize: '0.82rem', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '0.6rem' }}>Time</th>
                <th style={{ padding: '0.6rem' }}>Question</th>
                <th style={{ padding: '0.6rem' }}>Generated SQL</th>
                <th style={{ padding: '0.6rem' }}>Status</th>
                <th style={{ padding: '0.6rem' }}>Latency</th>
                <th style={{ padding: '0.6rem' }}>Rows Returned</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                  <td style={{ padding: '0.6rem', color: '#64748b' }}>{log.time}</td>
                  <td style={{ padding: '0.6rem', fontWeight: 600 }}>{log.question}</td>
                  <td style={{ padding: '0.6rem', fontFamily: 'monospace', color: '#38bdf8', fontSize: '0.75rem' }}>
                    {log.sql ? (log.sql.length > 70 ? `${log.sql.slice(0, 70)}...` : log.sql) : '-'}
                  </td>
                  <td style={{ padding: '0.6rem', color: '#10b981' }}>✓ {log.status}</td>
                  <td style={{ padding: '0.6rem', color: '#818cf8' }}>{log.latency}</td>
                  <td style={{ padding: '0.6rem' }}>{log.rows}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
};
