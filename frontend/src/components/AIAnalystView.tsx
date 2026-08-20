import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowUpRight, BarChart3, Bot, Check, ChevronDown, Download, Lightbulb, LoaderCircle, MessageSquare, Search, Send, Sparkles, Table2 } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { sendChatQuery } from '../api';
import type { ChatResponse } from '../api';

interface AIAnalystViewProps { initialQuestion?: string; isDevMode?: boolean; }
interface QuestionOption { category: string; label: string; question: string; }

const questionOptions: QuestionOption[] = [
  { category: 'growth', label: 'How are sales changing over time?', question: 'Show me monthly revenue' },
  { category: 'growth', label: 'How did sales perform each year?', question: 'Year-over-Year annual revenue comparison' },
  { category: 'profit', label: 'Which products are losing money?', question: 'Which sub-categories have negative profit margin?' },
  { category: 'profit', label: 'What is the effect of discounts?', question: 'How do discounts impact overall profit margin?' },
  { category: 'products', label: 'Which products sell the most?', question: 'Which products generated the highest revenue?' },
  { category: 'products', label: 'Where are returns highest?', question: 'Which sub-categories have the highest return rate?' },
  { category: 'customers', label: 'Who are our highest-value customers?', question: 'Which customers generated the most revenue?' },
  { category: 'customers', label: 'How do customer groups compare?', question: 'Revenue breakdown by customer segment' },
  { category: 'regions', label: 'Which regions perform best?', question: 'Compare regional sales performance' },
  { category: 'regions', label: 'Which states lead sales?', question: 'Which state generated the most revenue?' },
  { category: 'operations', label: 'Which shipping method works best?', question: 'Which shipping mode is most popular and profitable?' },
  { category: 'operations', label: 'What is the average order value?', question: 'What is our Average Order Value across categories?' }
];

const categories = [
  { id: 'all', label: 'All topics' }, { id: 'growth', label: 'Growth' }, { id: 'profit', label: 'Profit' },
  { id: 'products', label: 'Products' }, { id: 'customers', label: 'Customers' }, { id: 'regions', label: 'Regions' }, { id: 'operations', label: 'Operations' }
];

function humanize(value: string): string { return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function isNumber(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
function formatValue(column: string, value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (!isNumber(value)) return String(value);
  const money = /revenue|profit|sales|spent|refund|value|price|total/i.test(column);
  return money ? `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function ChartView({ response }: { response: ChatResponse }) {
  const rows = response.rows || [];
  const columns = response.columns || [];
  const numericColumns = columns.filter((column) => rows.some((row) => isNumber(row[column])));
  const categoryColumn = response.visualization.x_axis && columns.includes(response.visualization.x_axis)
    ? response.visualization.x_axis : columns.find((column) => !numericColumns.includes(column)) || columns[0];
  const valueColumn = response.visualization.value_col && numericColumns.includes(response.visualization.value_col)
    ? response.visualization.value_col : numericColumns[0];
  if (!rows.length || !categoryColumn || !valueColumn) return null;

  const chartRows = rows.slice(0, 20).map((row) => ({ label: String(row[categoryColumn] ?? 'Unknown'), value: isNumber(row[valueColumn]) ? row[valueColumn] : 0 }));
  const isTimeSeries = response.visualization.type === 'area' || response.visualization.type === 'line';
  const chartColor = isTimeSeries ? '#0f766e' : '#d97706';
  const chartProps = { margin: { top: 12, right: 18, left: 4, bottom: 8 } };

  return (
    <section className="analyst-chart" aria-label={response.visualization.title}>
      <div className="analyst-section-heading"><div><span className="eyebrow">Visual summary</span><h3>{humanize(response.visualization.title || valueColumn)}</h3></div><BarChart3 size={20} aria-hidden="true" /></div>
      <div className="analyst-chart-frame">
        <ResponsiveContainer width="100%" height="100%">
          {isTimeSeries ? <AreaChart data={chartRows} {...chartProps}>
            <defs><linearGradient id="analystAreaFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={chartColor} stopOpacity={0.34} /><stop offset="100%" stopColor={chartColor} stopOpacity={0.03} /></linearGradient></defs>
            <CartesianGrid vertical={false} stroke="#d6d3d1" strokeDasharray="3 3" /><XAxis dataKey="label" tick={{ fill: '#78716c', fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" /><YAxis tick={{ fill: '#78716c', fontSize: 11 }} tickLine={false} axisLine={false} width={58} tickFormatter={(value) => value >= 1000 ? `$${Math.round(value / 1000)}k` : String(value)} /><Tooltip formatter={(value) => formatValue(valueColumn, value)} labelStyle={{ color: '#44403c' }} contentStyle={{ border: '1px solid #e7e5e4', borderRadius: 8, background: '#fffdf8' }} /><Area type="monotone" dataKey="value" stroke={chartColor} strokeWidth={3} fill="url(#analystAreaFill)" />
          </AreaChart> : <BarChart data={chartRows} {...chartProps}>
            <CartesianGrid vertical={false} stroke="#d6d3d1" strokeDasharray="3 3" /><XAxis dataKey="label" tick={{ fill: '#78716c', fontSize: 11 }} tickLine={false} axisLine={false} interval={0} angle={chartRows.length > 8 ? -28 : 0} textAnchor={chartRows.length > 8 ? 'end' : 'middle'} height={chartRows.length > 8 ? 58 : 30} /><YAxis tick={{ fill: '#78716c', fontSize: 11 }} tickLine={false} axisLine={false} width={58} tickFormatter={(value) => value >= 1000 ? `$${Math.round(value / 1000)}k` : String(value)} /><Tooltip formatter={(value) => formatValue(valueColumn, value)} labelStyle={{ color: '#44403c' }} contentStyle={{ border: '1px solid #e7e5e4', borderRadius: 8, background: '#fffdf8' }} /><Bar dataKey="value" fill={chartColor} radius={[5, 5, 0, 0]} maxBarSize={42} />
          </BarChart>}
        </ResponsiveContainer>
      </div>
      <p className="analyst-chart-note">Showing the first {chartRows.length} results. The table below contains the available records.</p>
    </section>
  );
}

export const AIAnalystView: React.FC<AIAnalystViewProps> = ({ initialQuestion, isDevMode = false }) => {
  const [answer, setAnswer] = useState<ChatResponse | null>(null);
  const [question, setQuestion] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [recentQuestions, setRecentQuestions] = useState<string[]>([]);

  const ask = async (nextQuestion: string) => {
    const trimmed = nextQuestion.trim();
    if (!trimmed || loading) return;
    setQuestion(''); setLoading(true); setError(''); setShowDetails(false);
    try {
      const response = await sendChatQuery(trimmed, answer ? [{ question: answer.question, answer: answer.executive_insights }] : []);
      setAnswer(response); setRecentQuestions((current) => [trimmed, ...current.filter((item) => item !== trimmed)].slice(0, 4));
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'We could not complete that analysis.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (initialQuestion) void ask(initialQuestion); }, [initialQuestion]);

  const visibleQuestions = activeCategory === 'all' ? questionOptions : questionOptions.filter((item) => item.category === activeCategory);
  const displayedColumns = answer?.columns || [];
  const displayedRows = answer?.rows || [];
  const exportCSV = () => {
    if (!displayedRows.length) return;
    const csv = [displayedColumns.join(','), ...displayedRows.map((row) => displayedColumns.map((column) => `"${String(row[column] ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')].join('\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = 'nl2sql-analysis.csv'; link.click(); URL.revokeObjectURL(link.href);
  };

  return (
    <main className="analyst-page">
      <header className="analyst-hero"><div className="analyst-hero-copy"><span className="eyebrow">Ask the business</span><h1>Make sense of your sales data.</h1><p>Ask a question in everyday language. Get the answer, the main takeaway, and a simple visual from the real dataset.</p></div><div className="analyst-hero-mark"><Bot size={32} aria-hidden="true" /><span>Live analysis</span></div></header>
      <section className="analyst-ask-panel"><form className="analyst-search" onSubmit={(event) => { event.preventDefault(); void ask(question); }}><Search size={21} aria-hidden="true" /><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Try: Which regions generated the most revenue?" aria-label="Ask a business question" /><button type="submit" disabled={!question.trim() || loading} className="analyst-ask-button"><span>{loading ? 'Working...' : 'Ask'}</span>{loading ? <LoaderCircle size={17} className="analyst-spin" /> : <Send size={17} />}</button></form><div className="analyst-prompt-row"><Lightbulb size={16} aria-hidden="true" /><span>Not sure where to start? Choose a question below.</span></div></section>
      <section className="analyst-question-panel"><div className="analyst-section-heading"><div><span className="eyebrow">Quick start</span><h2>What would you like to know?</h2></div><Sparkles size={20} aria-hidden="true" /></div><div className="analyst-filter-row" role="tablist" aria-label="Question topics">{categories.map((category) => <button key={category.id} type="button" role="tab" aria-selected={activeCategory === category.id} className={activeCategory === category.id ? 'active' : ''} onClick={() => setActiveCategory(category.id)}>{category.label}</button>)}</div><div className="analyst-question-grid">{visibleQuestions.map((option) => <button key={option.question} type="button" className="analyst-question-card" onClick={() => void ask(option.question)} disabled={loading}><span>{option.label}</span><ArrowUpRight size={17} aria-hidden="true" /></button>)}</div></section>
      {recentQuestions.length > 0 && <div className="analyst-recent"><MessageSquare size={15} aria-hidden="true" /><span>Recent:</span>{recentQuestions.map((item) => <button key={item} type="button" onClick={() => void ask(item)}>{item}</button>)}</div>}
      {loading && <section className="analyst-loading"><LoaderCircle size={24} className="analyst-spin" /><div><strong>Looking through the dataset...</strong><span>Preparing a clear business answer.</span></div></section>}
      {error && <section className="analyst-error"><AlertCircle size={22} /><div><strong>We could not complete that question.</strong><span>{error}</span></div></section>}
      {answer && !loading && <section className="analyst-answer"><div className="analyst-answer-top"><div className="analyst-answer-title"><span className="analyst-answer-icon"><Check size={17} /></span><div><span className="eyebrow">{answer.supported === false ? 'Analysis limitation' : 'Your answer'}</span><h2>{answer.question}</h2></div></div><span className="analyst-live-pill">{answer.supported === false ? (answer.limitation_type === 'read_only' ? 'Read-only workspace' : 'Needs a dedicated analysis') : answer.success ? `${answer.llm_provider === 'groq' ? 'Groq AI' : answer.llm_provider === 'gemini' ? 'Gemini AI' : 'Local analysis'} · live data` : 'Needs another look'}</span></div>{answer.success && answer.supported !== false ? <><div className="analyst-takeaway"><span className="eyebrow">Main takeaway</span><p>{answer.executive_insights}</p></div><ChartView response={answer} />{displayedRows.length > 0 && <section className="analyst-results"><div className="analyst-section-heading"><div><span className="eyebrow">Details</span><h3>{answer.row_count.toLocaleString()} results</h3></div><button type="button" className="analyst-export" onClick={exportCSV}><Download size={15} /> Export</button></div><div className="analyst-table-wrap"><table><thead><tr>{displayedColumns.map((column) => <th key={column}>{humanize(column)}</th>)}</tr></thead><tbody>{displayedRows.slice(0, 12).map((row, index) => <tr key={index}>{displayedColumns.map((column) => <td key={column}>{formatValue(column, row[column])}</td>)}</tr>)}</tbody></table></div></section>}{answer.suggested_investigations.length > 0 && <section className="analyst-next"><span className="eyebrow">Useful next questions</span><div>{answer.suggested_investigations.slice(0, 3).map((suggestion) => <button type="button" key={suggestion} onClick={() => void ask(suggestion)}>{suggestion}<ArrowUpRight size={15} /></button>)}</div></section>}{isDevMode && <section className="analyst-tech"><button type="button" onClick={() => setShowDetails((current) => !current)}>Technical details <ChevronDown size={16} /></button>{showDetails && <><p>{answer.analytical_plan}</p><pre>{answer.sql}</pre></>}</section>}</> : <div className="analyst-takeaway"><p>{answer.supported === false ? (answer.limitation_type === 'read_only' ? 'This workspace is read-only. Ask for a business summary or comparison instead.' : 'This question needs a dedicated analytical plan. Configure Groq for generated analysis, or ask a supported summary question.') : answer.error || 'No answer was returned.'}</p></div>}</section>}
      {answer?.ai_transparency && answer.supported !== false && <section className="analyst-intelligence"><div className="analyst-intelligence-title"><span className="eyebrow">How this answer was built</span><span className={`analyst-confidence ${answer.ai_transparency.confidence}`}>{answer.ai_transparency.confidence === 'high' ? 'High confidence' : 'Limited confidence'}</span></div><div className="analyst-methods">{answer.ai_transparency.methods.map((method) => <span key={method}><Check size={13} /> {method}</span>)}</div>{answer.ai_transparency.business_terms_detected.length > 0 && <p className="analyst-terms"><strong>Business terms understood:</strong> {answer.ai_transparency.business_terms_detected.join(' · ')}</p>}</section>}
      <div className="analyst-footnote"><Table2 size={15} aria-hidden="true" /> Using the original Superstore transaction records. Return figures are derived estimates because the source does not include returns.</div>
    </main>
  );
};
