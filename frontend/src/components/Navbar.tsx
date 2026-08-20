import React from 'react';
import { LayoutDashboard, Bot, Network, Sparkles, ShieldCheck, History, Database, RefreshCw, Eye, Code } from 'lucide-react';

export type NavTab = 'dashboard' | 'analyst' | 'datamodel' | 'rootcause' | 'security' | 'history';

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onReset: () => void;
  isDevMode: boolean;
  setIsDevMode: (val: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onReset, isDevMode, setIsDevMode }) => {
  const tabs = [
    { id: 'dashboard', label: 'Executive BI Center', icon: LayoutDashboard },
    { id: 'analyst', label: 'AI Analyst', icon: Bot },
    { id: 'rootcause', label: 'Root Cause Diagnostics', icon: Sparkles },
    { id: 'datamodel', label: 'Data Model & ERD', icon: Network },
    { id: 'security', label: 'SQL Security', icon: ShieldCheck },
    { id: 'history', label: 'Query History', icon: History }
  ];

  return (
    <header style={{ background: 'rgba(15, 23, 42, 0.95)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(16px)', position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)', padding: '0.5rem', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Database style={{ width: '1.25rem', height: '1.25rem', color: '#ffffff' }} />
          </div>
          <div>
            <h1 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', lineHeight: 1.2 }}>
              NL2SQL <span className="gradient-text">Enterprise Analytics</span>
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
              <span style={{ fontSize: '0.7rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '0.1rem 0.4rem', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: 600 }}>
                Real Superstore Dataset (9,994 Orders)
              </span>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>• DuckDB Engine</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(30, 41, 59, 0.6)', padding: '0.25rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)', overflowX: 'auto' }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as NavTab)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#ffffff' : '#94a3b8',
                  background: isActive ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.9), rgba(79, 70, 229, 0.9))' : 'transparent',
                  boxShadow: isActive ? '0 2px 10px rgba(99, 102, 241, 0.3)' : 'none',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                <Icon style={{ width: '1rem', height: '1rem', color: isActive ? '#ffffff' : '#94a3b8' }} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Actions: Dev / Exec Mode Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => setIsDevMode(!isDevMode)}
            title="Toggle between Non-Tech Executive View and Developer Mode"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.75rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              color: isDevMode ? '#38bdf8' : '#cbd5e1',
              background: isDevMode ? 'rgba(56, 189, 248, 0.15)' : 'rgba(51, 65, 85, 0.5)',
              border: `1px solid ${isDevMode ? 'rgba(56, 189, 248, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
              transition: 'all 0.2s ease'
            }}
          >
            {isDevMode ? <Code style={{ width: '0.85rem', height: '0.85rem', color: '#38bdf8' }} /> : <Eye style={{ width: '0.85rem', height: '0.85rem', color: '#cbd5e1' }} />}
            <span>{isDevMode ? 'Dev Mode On' : 'Executive View'}</span>
          </button>

          <button
            onClick={onReset}
            title="Reset session state"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.75rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              color: '#cbd5e1',
              background: 'rgba(51, 65, 85, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              transition: 'background 0.2s ease'
            }}
          >
            <RefreshCw style={{ width: '0.85rem', height: '0.85rem' }} />
            <span>Reset</span>
          </button>
        </div>

      </div>
    </header>
  );
};
