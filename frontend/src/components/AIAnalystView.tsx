import React, { useState } from 'react';
import { sendChatQuery } from '../api';
import type { ChatResponse } from '../api';
import { 
  Send, Bot, User, AlertCircle, ChevronDown, ChevronUp, Download, Code2, Sparkles 
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface AIAnalystViewProps {
  initialQuestion?: string;
  isDevMode?: boolean;
}

interface MessageTurn {
  id: string;
  question: string;
  response?: ChatResponse;
  loading?: boolean;
  error?: string;
}

export const AIAnalystView: React.FC<AIAnalystViewProps> = ({ initialQuestion, isDevMode = false }) => {
  const [messages, setMessages] = useState<MessageTurn[]>(() => {
    if (initialQuestion) {
      return [{ id: '1', question: initialQuestion, loading: true }];
    }
    return [{ id: 'welcome', question: "Show me monthly revenue", loading: false }];
  });
  const [inputQuestion, setInputQuestion] = useState<string>('');
  const [expandedSql, setExpandedSql] = useState<Record<string, boolean>>({});
  const [activeCategory, setActiveCategory] = useState<string>('all');

  React.useEffect(() => {
    if (initialQuestion) {
      handleAsk(initialQuestion);
    } else {
      handleAsk("Show me monthly revenue");
    }
  }, []);

  const presetQuestions = [
    { category: 'revenue', label: '📊 Monthly Revenue Trend', question: 'Show me monthly revenue' },
    { category: 'revenue', label: '📅 Annual Sales YoY', question: 'Year-over-Year annual revenue comparison' },
    { category: 'decline', label: '🔍 Why Revenue Changed?', question: 'Why did revenue change between recent quarters?' },
    { category: 'decline', label: '⚠️ Negative Profit Margin', question: 'Which sub-categories have negative profit margin?' },
    { category: 'profit', label: '💸 Profitability by Sub-Category', question: 'Sub-category profitability ranking' },
    { category: 'profit', label: '🏷️ Discount Impact on Margin', question: 'How do discounts impact overall profit margin?' },
    { category: 'products', label: '📦 Top 10 Revenue Products', question: 'Which products generated the highest revenue?' },
    { category: 'products', label: '🔄 Highest Product Return Rates', question: 'Which sub-categories have the highest return rate?' },
    { category: 'customers', label: '👑 Top 10 Spending Customers', question: 'Which customers generated the most revenue?' },
    { category: 'customers', label: '🏢 Enterprise vs Consumer', question: 'Revenue breakdown by customer segment' },
    { category: 'region', label: '🗺️ Regional Sales Distribution', question: 'Compare regional sales performance' },
    { category: 'region', label: '📍 Top States by Sales', question: 'Which state generated the most revenue?' },
    { category: 'shipping', label: '🚚 Shipping Mode Comparison', question: 'Which shipping mode is most popular and profitable?' },
    { category: 'aov', label: '🛒 Average Basket Size (AOV)', question: 'What is our Average Order Value across categories?' }
  ];

  const filteredPresets = activeCategory === 'all' 
    ? presetQuestions 
    : presetQuestions.filter(p => p.category === activeCategory);

  const handleAsk = async (qText: string) => {
    if (!qText.trim()) return;

    const msgId = Date.now().toString();
    const newTurn: MessageTurn = { id: msgId, question: qText, loading: true };
    setMessages((prev) => [...prev, newTurn]);
    setInputQuestion('');

    try {
      const history = messages
        .filter((m) => m.response)
        .map((m) => ({ question: m.question, answer: m.response?.executive_insights || '' }));

      const res = await sendChatQuery(qText, history);

      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, loading: false, response: res } : m))
      );
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, loading: false, error: err.message || "Failed to execute query" } : m))
      );
    }
  };

  const toggleSql = (id: string) => {
    setExpandedSql((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const exportCSV = (rows: Record<string, any>[], filename: string) => {
    if (!rows || rows.length === 0) return;
    const keys = Object.keys(rows[0]);
    const csvContent = [
      keys.join(','),
      ...rows.map(r => keys.map(k => `"${r[k] !== null && r[k] !== undefined ? r[k] : ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
  };

  const renderChart = (res: ChatResponse) => {
    const { visualization, rows, columns } = res;
    if (!rows || rows.length === 0) return null;

    if (visualization.type === 'kpi' && rows.length === 1) {
      const val = rows[0][columns[columns.length - 1]];
      return (
        <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(30, 41, 59, 0.4)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <span style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase' }}>{columns[0]}</span>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#6366f1', margin: '0.5rem 0' }}>
            {typeof val === 'number' ? `$${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : val}
          </div>
        </div>
      );
    }

    if (visualization.type === 'area' || visualization.type === 'line') {
      const xKey = visualization.x_axis || columns[0];
      const yKey = columns[1] || columns[columns.length - 1];
      return (
        <div style={{ width: '100%', height: '280px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows}>
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey={xKey} stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.8rem' }} />
              <Area type="monotone" dataKey={yKey} stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#chartGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      );
    }

    const xKey = visualization.x_axis || columns[0];
    const yKey = columns[1] || columns[columns.length - 1];
    return (
      <div style={{ width: '100%', height: '280px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows.slice(0, 15)}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey={xKey} stroke="#64748b" fontSize={11} />
            <YAxis stroke="#64748b" fontSize={11} />
            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.8rem' }} />
            <Bar dataKey={yKey} fill="#06b6d4" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: '85vh' }}>
      
      {/* Header Banner */}
      <div className="glass-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="font-display" style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f8fafc' }}>
            AI Business Intelligence Analyst
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            Ask any question in plain English. The AI translates business intent into analytical SQL, checks data quality, and explains business drivers.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: 600 }}>
            Global Superstore Dataset (9,994 Orders)
          </span>
        </div>
      </div>

      {/* Preset Executive Questions Selector */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
          <Sparkles style={{ width: '1rem', height: '1rem', color: '#818cf8' }} />
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc' }}>
            Executive Recommended Questions (1-Click Launch)
          </h3>
        </div>

        {/* Category Filter Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
          {[
            { id: 'all', label: 'All Questions' },
            { id: 'revenue', label: '📊 Revenue & Growth' },
            { id: 'decline', label: '🔍 Decline & Variance' },
            { id: 'profit', label: '💸 Profitability' },
            { id: 'products', label: '📦 Products & Returns' },
            { id: 'customers', label: '👥 Customers' },
            { id: 'region', label: '🗺️ Regions' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                fontSize: '0.75rem',
                padding: '0.25rem 0.65rem',
                borderRadius: '20px',
                background: activeCategory === cat.id ? 'rgba(99, 102, 241, 0.8)' : 'rgba(30, 41, 59, 0.6)',
                color: activeCategory === cat.id ? '#ffffff' : '#94a3b8',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Question Pills */}
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          {filteredPresets.map((preset, pIdx) => (
            <button
              key={pIdx}
              onClick={() => handleAsk(preset.question)}
              style={{
                background: 'rgba(30, 41, 59, 0.5)',
                color: '#e2e8f0',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Messages Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flexGrow: 1 }}>
        {messages.map((turn) => {
          const isSqlOpen = expandedSql[turn.id];
          const resp = turn.response;
          return (
            <div key={turn.id} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* User Question */}
              <div style={{ alignSelf: 'flex-end', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.9), rgba(79, 70, 229, 0.9))', color: '#ffffff', padding: '0.85rem 1.25rem', borderRadius: '12px 12px 2px 12px', maxWidth: '80%', boxShadow: '0 4px 15px rgba(99, 102, 241, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.25rem' }}>
                  <User style={{ width: '0.85rem', height: '0.85rem' }} />
                  <span>Business Executive</span>
                </div>
                <p style={{ fontSize: '0.95rem', fontWeight: 500 }}>{turn.question}</p>
              </div>

              {/* AI Analyst Response */}
              {turn.loading && (
                <div className="glass-card" style={{ alignSelf: 'flex-start', padding: '1.25rem 1.5rem', maxWidth: '85%', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Bot style={{ width: '1.2rem', height: '1.2rem', color: '#6366f1' }} />
                  <span style={{ fontSize: '0.9rem' }}>Analyzing business dataset & formulating executive explanation...</span>
                </div>
              )}

              {turn.error && (
                <div className="glass-card" style={{ alignSelf: 'flex-start', padding: '1.25rem 1.5rem', maxWidth: '85%', borderColor: 'rgba(244, 63, 94, 0.3)', background: 'rgba(244, 63, 94, 0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f43f5e', fontWeight: 600 }}>
                    <AlertCircle style={{ width: '1.1rem', height: '1.1rem' }} />
                    <span>Analysis Error</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#e2e8f0', marginTop: '0.4rem' }}>{turn.error}</p>
                </div>
              )}

              {resp && (
                <div className="glass-card" style={{ alignSelf: 'flex-start', padding: '1.5rem', width: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  
                  {/* Header & Quality Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Bot style={{ width: '1.25rem', height: '1.25rem', color: '#6366f1' }} />
                      <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.95rem' }}>Executive Analyst Insight</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {resp.data_quality.badges.map((badge, bIdx) => (
                        <span
                          key={bIdx}
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '4px',
                            background: badge.level === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: badge.level === 'success' ? '#10b981' : '#f59e0b',
                            border: `1px solid ${badge.level === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                          }}
                        >
                          ✓ {badge.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Executive Business Summary */}
                  <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '1rem 1.25rem', borderRadius: '8px', borderLeft: '4px solid #6366f1' }}>
                    <h5 style={{ fontSize: '0.8rem', color: '#818cf8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                      Key Business Findings
                    </h5>
                    <p style={{ fontSize: '0.92rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                      {resp.executive_insights}
                    </p>
                  </div>

                  {/* Interactive Chart */}
                  {renderChart(resp)}

                  {/* Results Data Table */}
                  {resp.rows && resp.rows.length > 0 && (
                    <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <h5 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
                          Analytical Results ({resp.row_count} records)
                        </h5>
                        <button
                          onClick={() => exportCSV(resp.rows, `export_${turn.id}`)}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '0.25rem 0.55rem', borderRadius: '6px' }}
                        >
                          <Download style={{ width: '0.75rem', height: '0.75rem' }} />
                          <span>Export CSV</span>
                        </button>
                      </div>

                      <div style={{ overflowX: 'auto', maxHeight: '250px' }}>
                        <table style={{ width: '100%', fontSize: '0.78rem', textAlign: 'left', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                              {resp.columns.map((col, cIdx) => (
                                <th key={cIdx} style={{ padding: '0.45rem' }}>{col.replace(/_/g, ' ').toUpperCase()}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {resp.rows.slice(0, 10).map((r, rIdx) => (
                              <tr key={rIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                                {resp.columns.map((col, cIdx) => (
                                  <td key={cIdx} style={{ padding: '0.45rem' }}>
                                    {typeof r[col] === 'number' ? (col.includes('revenue') || col.includes('profit') || col.includes('spent') || col.includes('sales') ? `$${r[col].toLocaleString()}` : r[col].toLocaleString()) : String(r[col])}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Developer Mode SQL Accordion */}
                  {(isDevMode || isSqlOpen) && (
                    <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <button
                        onClick={() => toggleSql(turn.id)}
                        style={{ width: '100%', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.8rem', background: 'transparent' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Code2 style={{ width: '0.9rem', height: '0.9rem', color: '#06b6d4' }} />
                          <span>Technical Details & SQL Query (DuckDB Dialect)</span>
                          <span style={{ color: '#10b981', fontSize: '0.7rem', background: 'rgba(16,185,129,0.15)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                            ✓ AST Read-Only Verified
                          </span>
                        </div>
                        {isSqlOpen ? <ChevronUp style={{ width: '1rem', height: '1rem' }} /> : <ChevronDown style={{ width: '1rem', height: '1rem' }} />}
                      </button>

                      {isSqlOpen && (
                        <div style={{ padding: '0.75rem 1rem 1rem', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '0.8rem' }}>
                          <div style={{ marginBottom: '0.5rem', color: '#818cf8', fontWeight: 600 }}>
                            Analytical Plan: <span style={{ color: '#cbd5e1', fontWeight: 400 }}>{resp.analytical_plan}</span>
                          </div>
                          <pre className="font-mono" style={{ background: '#090d16', padding: '0.85rem', borderRadius: '6px', color: '#38bdf8', overflowX: 'auto', fontSize: '0.78rem' }}>
                            {resp.sql}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Proactive Next Investigation Suggestions */}
                  {resp.suggested_investigations && resp.suggested_investigations.length > 0 && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: 600, textTransform: 'uppercase' }}>
                        Recommended Next Investigations:
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                        {resp.suggested_investigations.map((sug, sIdx) => (
                          <button
                            key={sIdx}
                            onClick={() => handleAsk(sug)}
                            style={{
                              background: 'rgba(99, 102, 241, 0.12)',
                              color: '#c7d2fe',
                              border: '1px solid rgba(99, 102, 241, 0.3)',
                              padding: '0.4rem 0.75rem',
                              borderRadius: '20px',
                              fontSize: '0.78rem',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            → {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>
          );
        })}
      </div>

      {/* Input Chat Box */}
      <div style={{ position: 'sticky', bottom: '1.5rem', background: 'rgba(15, 23, 42, 0.95)', padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.3)', backdropFilter: 'blur(16px)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)' }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk(inputQuestion);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
        >
          <input
            type="text"
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            placeholder="Ask your data anything (e.g. 'Why did revenue change?', 'Which products are losing money?')..."
            style={{ flexGrow: 1, background: 'transparent', border: 'none', color: '#f8fafc', fontSize: '0.92rem', padding: '0.25rem 0.5rem' }}
          />
          <button
            type="submit"
            disabled={!inputQuestion.trim()}
            style={{
              background: inputQuestion.trim() ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(51, 65, 85, 0.5)',
              color: '#ffffff',
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s ease'
            }}
          >
            <span>Ask Analyst</span>
            <Send style={{ width: '0.9rem', height: '0.9rem' }} />
          </button>
        </form>
      </div>

    </div>
  );
};
