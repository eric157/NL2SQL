export interface DashboardData {
  kpis: {
    revenue: number;
    orders: number;
    customers: number;
    aov: number;
    profit: number;
    profit_margin_pct: number;
    return_rate_pct: number;
  };
  monthly_trends: { month: string; revenue: number; profit: number }[];
  regional_breakdown: { region: string; revenue: number; orders: number }[];
  category_breakdown: { category: string; revenue: number; profit: number }[];
  anomalies: {
    id: number;
    title: string;
    severity: 'warning' | 'info' | 'critical';
    description: string;
    action_question: string;
  }[];
  suggested_investigations: { title: string; question: string }[];
}

export interface ChatResponse {
  question: string;
  resolved_prompt: string;
  analytical_plan: string;
  sql: string;
  success: boolean;
  error?: string;
  execution_time_ms: number;
  total_latency_ms: number;
  sql_repair_attempts: number;
  columns: string[];
  rows: Record<string, any>[];
  row_count: number;
  data_quality: {
    row_count: number;
    status: string;
    missing_values_count: number;
    duplicate_rows_count: number;
    outliers_count: number;
    badges: { level: 'success' | 'warning' | 'info'; label: string }[];
  };
  visualization: {
    type: 'kpi' | 'line' | 'area' | 'bar' | 'treemap' | 'scatter' | 'table';
    title: string;
    x_axis?: string;
    y_axis?: string | string[];
    value_col?: string;
  };
  root_cause_analysis?: {
    base_period: string;
    compare_period: string;
    base_total_revenue: number;
    compare_total_revenue: number;
    total_delta: number;
    pct_change: number;
    executive_summary: string;
    category_drivers: {
      dimension: string;
      name: string;
      base_revenue: number;
      compare_revenue: number;
      delta: number;
      contribution_pct: number;
    }[];
    region_drivers: {
      dimension: string;
      name: string;
      country: string;
      base_revenue: number;
      compare_revenue: number;
      delta: number;
      contribution_pct: number;
    }[];
  };
  executive_insights: string;
  suggested_investigations: string[];
}

export interface SchemaMetadata {
  tables: Record<
    string,
    {
      table_name: string;
      row_count: number;
      primary_key: string;
      columns: { name: string; type: string; is_pk: boolean; is_fk: boolean }[];
    }
  >;
  relationships: {
    from_table: string;
    from_column: string;
    to_table: string;
    to_column: string;
    relation: string;
  }[];
}

const API_BASE = "http://localhost:8000/api";

export async function fetchDashboard(region?: string, category?: string): Promise<DashboardData> {
  const params = new URLSearchParams();
  if (region && region !== "All") params.append("region", region);
  if (category && category !== "All") params.append("category", category);
  
  const res = await fetch(`${API_BASE}/dashboard?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch executive dashboard data");
  return res.json();
}

export async function sendChatQuery(question: string, history: { question: string; answer: string }[]): Promise<ChatResponse> {
  const formattedHistory = history.map(h => ({ question: h.question, answer: h.answer }));
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, history: formattedHistory })
  });
  if (!res.ok) throw new Error("AI Analyst query failed");
  return res.json();
}

export async function fetchSchema(): Promise<SchemaMetadata> {
  const res = await fetch(`${API_BASE}/schema`);
  if (!res.ok) throw new Error("Failed to fetch database schema");
  return res.json();
}

export async function fetchTableSample(tableName: string) {
  const res = await fetch(`${API_BASE}/schema/table/${tableName}`);
  if (!res.ok) throw new Error("Failed to fetch table sample data");
  return res.json();
}

export async function runSecurityCheck(sql: string) {
  const res = await fetch(`${API_BASE}/security-check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sql })
  });
  if (!res.ok) throw new Error("Security check failed");
  return res.json();
}

export async function runRootCauseAnalysis(basePeriod?: string, comparePeriod?: string) {
  const res = await fetch(`${API_BASE}/root-cause`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base_period: basePeriod, compare_period: comparePeriod })
  });
  if (!res.ok) throw new Error("Root cause analysis failed");
  return res.json();
}
