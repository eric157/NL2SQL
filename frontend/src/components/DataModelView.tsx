import React, { useState, useEffect } from 'react';
import { fetchSchema, fetchTableSample } from '../api';
import type { SchemaMetadata } from '../api';
import { Network, Key, Table, Eye } from 'lucide-react';

export const DataModelView: React.FC = () => {
  const [schema, setSchema] = useState<SchemaMetadata | null>(null);
  const [selectedTable, setSelectedTable] = useState<string>('orders');
  const [sampleRows, setSampleRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadSchema();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      loadSample(selectedTable);
    }
  }, [selectedTable]);

  const loadSchema = async () => {
    try {
      const res = await fetchSchema();
      setSchema(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadSample = async (tbl: string) => {
    try {
      const res = await fetchTableSample(tbl);
      setSampleRows(res.sample_rows || []);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || !schema) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
        <p>Inspecting DuckDB Schema & Introspecting Foreign Keys...</p>
      </div>
    );
  }

  const tableList = Object.keys(schema.tables);
  const currentTableMeta = schema.tables[selectedTable];

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div className="glass-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 className="font-display" style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f8fafc' }}>
            Data Model & Relationship Explorer
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            Dynamic ERD inspection of DuckDB database tables, primary keys, foreign keys, and join paths.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: '#06b6d4', background: 'rgba(6, 182, 212, 0.15)', padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
            7 Relational Tables
          </span>
        </div>
      </div>

      {/* Visual ERD Diagram */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Network style={{ width: '1.1rem', height: '1.1rem', color: '#6366f1' }} />
          <span>Interactive ERD Table Nodes & Key Mappings</span>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {tableList.map((tblName) => {
            const tbl = schema.tables[tblName];
            const isSelected = selectedTable === tblName;
            return (
              <div
                key={tblName}
                onClick={() => setSelectedTable(tblName)}
                style={{
                  background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                  border: isSelected ? '2px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: isSelected ? '#818cf8' : '#f8fafc' }}>
                    {tbl.table_name}
                  </span>
                  <Table style={{ width: '0.9rem', height: '0.9rem', color: isSelected ? '#6366f1' : '#64748b' }} />
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {tbl.row_count.toLocaleString()} rows • {tbl.columns.length} cols
                </div>
                <div style={{ fontSize: '0.7rem', color: '#10b981', marginTop: '0.4rem', fontFamily: 'monospace' }}>
                  PK: {tbl.primary_key}
                </div>
              </div>
            );
          })}
        </div>

        {/* Foreign Key Join Paths Banner */}
        <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
          <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: '#818cf8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            How does the AI know which tables to join?
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
            {schema.relationships.map((rel, idx) => (
              <span key={idx} style={{ fontSize: '0.75rem', color: '#cbd5e1', background: 'rgba(30, 41, 59, 0.8)', padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.05)', fontFamily: 'monospace' }}>
                {rel.from_table}.{rel.from_column} → {rel.to_table}.{rel.to_column} ({rel.relation})
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Table Detail Drawer */}
      {currentTableMeta && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem' }}>
          
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.85rem' }}>
              Table Schema: <span style={{ color: '#818cf8' }}>{currentTableMeta.table_name}</span>
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {currentTableMeta.columns.map((col, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.6rem', background: 'rgba(30, 41, 59, 0.4)', borderRadius: '6px', fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {col.is_pk && <Key style={{ width: '0.75rem', height: '0.75rem', color: '#10b981' }} />}
                    <span style={{ color: col.is_pk ? '#10b981' : (col.is_fk ? '#06b6d4' : '#f8fafc'), fontWeight: col.is_pk ? 700 : 500 }}>
                      {col.name}
                    </span>
                  </div>
                  <span style={{ color: '#64748b', fontSize: '0.7rem', fontFamily: 'monospace' }}>{col.type}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem', overflow: 'hidden' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Eye style={{ width: '1rem', height: '1rem', color: '#06b6d4' }} />
              <span>Sample Rows Preview ({currentTableMeta.table_name})</span>
            </h4>

            <div style={{ overflowX: 'auto', maxHeight: '400px' }}>
              <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#1e293b', color: '#94a3b8' }}>
                    {currentTableMeta.columns.map((col, idx) => (
                      <th key={idx} style={{ padding: '0.5rem 0.75rem', whiteSpace: 'nowrap' }}>{col.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sampleRows.map((row, rIdx) => (
                    <tr key={rIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#e2e8f0' }}>
                      {currentTableMeta.columns.map((col, cIdx) => (
                        <td key={cIdx} style={{ padding: '0.5rem 0.75rem', whiteSpace: 'nowrap' }}>
                          {row[col.name] !== null ? String(row[col.name]) : <span style={{ color: '#64748b' }}>null</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
