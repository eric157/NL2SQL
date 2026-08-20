import React, { useState, useEffect } from 'react';
import { runRootCauseAnalysis } from '../api';
import { Sparkles, Layers, MapPin, RefreshCw } from 'lucide-react';

export const RootCauseView: React.FC = () => {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadRootCause();
  }, []);

  const loadRootCause = async () => {
    setLoading(true);
    try {
      const res = await runRootCauseAnalysis();
      setAnalysis(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !analysis) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
        <p>Calculating variance drivers across Category & Regional dimensions...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      <div className="glass-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 className="font-display" style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f8fafc' }}>
            Root-Cause Variance & Driver Diagnostics
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            Automated waterfall decomposition engine isolating primary category & regional growth drivers.
          </p>
        </div>
        <button
          onClick={loadRootCause}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.75rem', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.3)', fontSize: '0.8rem' }}
        >
          <RefreshCw style={{ width: '0.85rem', height: '0.85rem' }} />
          <span>Re-Run Diagnostics</span>
        </button>
      </div>

      <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid #f59e0b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Sparkles style={{ width: '1.1rem', height: '1.1rem', color: '#f59e0b' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
            Variance Summary: {analysis.compare_period} vs {analysis.base_period}
          </h3>
        </div>
        <p style={{ fontSize: '1rem', color: '#e2e8f0', lineHeight: 1.5 }}>
          {analysis.executive_summary}
        </p>

        <div style={{ display: 'flex', gap: '2rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Base Period ({analysis.base_period})</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc' }}>${analysis.base_total_revenue.toLocaleString()}</div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Compare Period ({analysis.compare_period})</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc' }}>${analysis.compare_total_revenue.toLocaleString()}</div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Net Revenue Delta</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: analysis.total_delta < 0 ? '#f43f5e' : '#10b981' }}>
              ${analysis.total_delta.toLocaleString()} ({analysis.pct_change}%)
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers style={{ width: '1rem', height: '1rem', color: '#6366f1' }} />
            <span>Category Contribution Breakdown</span>
          </h4>
          <table style={{ width: '100%', fontSize: '0.8rem', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '0.5rem' }}>Category</th>
                <th style={{ padding: '0.5rem' }}>Base Rev</th>
                <th style={{ padding: '0.5rem' }}>Compare Rev</th>
                <th style={{ padding: '0.5rem' }}>Delta ($)</th>
                <th style={{ padding: '0.5rem' }}>Impact %</th>
              </tr>
            </thead>
            <tbody>
              {analysis.category_drivers.map((d: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                  <td style={{ padding: '0.5rem', fontWeight: 600 }}>{d.name}</td>
                  <td style={{ padding: '0.5rem' }}>${d.base_revenue.toLocaleString()}</td>
                  <td style={{ padding: '0.5rem' }}>${d.compare_revenue.toLocaleString()}</td>
                  <td style={{ padding: '0.5rem', color: d.delta < 0 ? '#f43f5e' : '#10b981', fontWeight: 600 }}>${d.delta.toLocaleString()}</td>
                  <td style={{ padding: '0.5rem', color: d.delta < 0 ? '#f43f5e' : '#10b981' }}>{d.contribution_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin style={{ width: '1rem', height: '1rem', color: '#06b6d4' }} />
            <span>Regional Contribution Breakdown</span>
          </h4>
          <table style={{ width: '100%', fontSize: '0.8rem', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '0.5rem' }}>Region</th>
                <th style={{ padding: '0.5rem' }}>Base Rev</th>
                <th style={{ padding: '0.5rem' }}>Compare Rev</th>
                <th style={{ padding: '0.5rem' }}>Delta ($)</th>
                <th style={{ padding: '0.5rem' }}>Impact %</th>
              </tr>
            </thead>
            <tbody>
              {analysis.region_drivers.map((d: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                  <td style={{ padding: '0.5rem', fontWeight: 600 }}>{d.name}</td>
                  <td style={{ padding: '0.5rem' }}>${d.base_revenue.toLocaleString()}</td>
                  <td style={{ padding: '0.5rem' }}>${d.compare_revenue.toLocaleString()}</td>
                  <td style={{ padding: '0.5rem', color: d.delta < 0 ? '#f43f5e' : '#10b981', fontWeight: 600 }}>${d.delta.toLocaleString()}</td>
                  <td style={{ padding: '0.5rem', color: d.delta < 0 ? '#f43f5e' : '#10b981' }}>{d.contribution_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
