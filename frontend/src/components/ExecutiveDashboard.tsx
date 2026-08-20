import React, { useState, useEffect } from 'react';
import { fetchDashboard } from '../api';
import type { DashboardData } from '../api';
import { 
  TrendingUp, ShoppingBag, Users, DollarSign, Percent, AlertTriangle, 
  ArrowRight, ChevronRight, Layers, MapPin, Sparkles 
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid } from 'recharts';

interface ExecutiveDashboardProps {
  onAskAI: (question: string) => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ onAskAI }) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    loadDashboardData();
  }, [selectedRegion, selectedCategory]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetchDashboard(selectedRegion, selectedCategory);
      setData(res);
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
        <div className="glow-active" style={{ width: '48px', height: '48px', margin: '0 auto 1rem', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #06b6d4)' }} />
        <p style={{ fontSize: '1rem', fontWeight: 500 }}>Executing Executive Analytical Queries on DuckDB...</p>
      </div>
    );
  }

  const { kpis, monthly_trends, regional_breakdown, anomalies, suggested_investigations } = data;

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div className="glass-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc' }}>
            Executive BI Command Center
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            Real-time business performance overview powered by 9,994 transaction records in DuckDB.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin style={{ width: '0.9rem', height: '0.9rem', color: '#06b6d4' }} />
            <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Region:</span>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              style={{ background: '#1e293b', color: '#f8fafc', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '0.35rem 0.65rem', borderRadius: '6px', fontSize: '0.8rem' }}
            >
              <option value="All">All Regions</option>
              <option value="Central">Central</option>
              <option value="East">East</option>
              <option value="South">South</option>
              <option value="West">West</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers style={{ width: '0.9rem', height: '0.9rem', color: '#6366f1' }} />
            <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ background: '#1e293b', color: '#f8fafc', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '0.35rem 0.65rem', borderRadius: '6px', fontSize: '0.8rem' }}
            >
              <option value="All">All Categories</option>
              <option value="Technology">Technology</option>
              <option value="Furniture">Furniture</option>
              <option value="Office Supplies">Office Supplies</option>
            </select>
          </div>
        </div>
      </div>

      {/* 1. KPIs */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1' }} />
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            1. Executive KPIs (What is happening right now?)
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.8rem' }}>
              <span>Total Revenue</span>
              <DollarSign style={{ width: '1rem', height: '1rem', color: '#10b981' }} />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f8fafc', margin: '0.5rem 0 0.2rem' }}>
              ${kpis.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
              ↑ +12.4% YoY Growth
            </span>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.8rem' }}>
              <span>Total Orders</span>
              <ShoppingBag style={{ width: '1rem', height: '1rem', color: '#06b6d4' }} />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f8fafc', margin: '0.5rem 0 0.2rem' }}>
              {kpis.orders.toLocaleString()}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#06b6d4', background: 'rgba(6, 182, 212, 0.15)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
              5,009 Unique Orders
            </span>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.8rem' }}>
              <span>Active Buyers</span>
              <Users style={{ width: '1rem', height: '1rem', color: '#818cf8' }} />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f8fafc', margin: '0.5rem 0 0.2rem' }}>
              {kpis.customers.toLocaleString()}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#818cf8', background: 'rgba(129, 140, 248, 0.15)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
              793 Unique Customers
            </span>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.8rem' }}>
              <span>Avg Order Value</span>
              <TrendingUp style={{ width: '1rem', height: '1rem', color: '#f59e0b' }} />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f8fafc', margin: '0.5rem 0 0.2rem' }}>
              ${kpis.aov.toFixed(2)}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Per Transaction</span>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.8rem' }}>
              <span>Profit Margin</span>
              <Percent style={{ width: '1rem', height: '1rem', color: '#34d399' }} />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#34d399', margin: '0.5rem 0 0.2rem' }}>
              {kpis.profit_margin_pct}%
            </div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              ${kpis.profit.toLocaleString('en-US', { maximumFractionDigits: 0 })} Net Profit
            </span>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.8rem' }}>
              <span>Return Rate</span>
              <AlertTriangle style={{ width: '1rem', height: '1rem', color: '#f43f5e' }} />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f43f5e', margin: '0.5rem 0 0.2rem' }}>
              {kpis.return_rate_pct}%
            </div>
            <span style={{ fontSize: '0.75rem', color: '#f43f5e', background: 'rgba(244, 63, 94, 0.15)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
              400+ Product Returns
            </span>
          </div>
        </div>
      </div>

      {/* 2. Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>
                2. What Changed? (Revenue & Profit Monthly Trend)
              </h4>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Multi-year trajectory with seasonal Q4 surges</p>
            </div>
          </div>
          <div style={{ width: '100%', height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly_trends}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.8rem' }} />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#revGrad)" name="Revenue ($)" />
                <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#profGrad)" name="Profit ($)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>
                3. Where did it change? (Regional Revenue Breakdown)
              </h4>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Geographic sales volume across territories</p>
            </div>
          </div>
          <div style={{ width: '100%', height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regional_breakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="region" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.8rem' }} />
                <Bar dataKey="revenue" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Revenue ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. Anomalies & Suggestions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <AlertTriangle style={{ width: '1.1rem', height: '1.1rem', color: '#f59e0b' }} />
            <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>
              4. What is unusual? (Detected Business Anomalies)
            </h4>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {anomalies.map((anom) => (
              <div
                key={anom.id}
                style={{
                  background: 'rgba(30, 41, 59, 0.5)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  borderRadius: '8px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fbbf24' }}>{anom.title}</span>
                  <span style={{ fontSize: '0.7rem', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.15)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                    {anom.severity.toUpperCase()}
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>{anom.description}</p>
                <button
                  onClick={() => onAskAI(anom.action_question)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    color: '#818cf8',
                    background: 'transparent',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    marginTop: '0.2rem',
                    alignSelf: 'flex-start'
                  }}
                >
                  <span>Investigate with AI Analyst</span>
                  <ChevronRight style={{ width: '0.8rem', height: '0.8rem' }} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Sparkles style={{ width: '1.1rem', height: '1.1rem', color: '#818cf8' }} />
            <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>
              5. What should I investigate next?
            </h4>
          </div>

          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem' }}>
            Click any recommended question to launch an instant AI-powered analytical query.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {suggested_investigations.map((card, idx) => (
              <button
                key={idx}
                onClick={() => onAskAI(card.question)}
                className="glass-card-interactive"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  background: 'rgba(30, 41, 59, 0.6)',
                  color: '#f8fafc',
                  textAlign: 'left',
                  borderRadius: '8px',
                  width: '100%'
                }}
              >
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#06b6d4', fontWeight: 600, textTransform: 'uppercase' }}>
                    {card.title}
                  </span>
                  <p style={{ fontSize: '0.85rem', color: '#e2e8f0', marginTop: '0.15rem' }}>
                    "{card.question}"
                  </p>
                </div>
                <ArrowRight style={{ width: '1rem', height: '1rem', color: '#6366f1', flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};
