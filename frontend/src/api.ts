import { useQuery } from '@tanstack/react-query'

export type Metrics = { n: number; mae: number; rmse: number; bias: number; nmae_pct: number | null; mean_actual: number; max_shortfall: number; max_surplus: number }
export type Row = { time: string; hour: number; forecast: number | null; actual: number | null; error: number | null; lead_hours: number | null; adjusted: number | null }
export type Vintage = { published: string; values: (number | null)[]; is_decision: boolean; label: string }
export type DayAhead = {
  delivery_date: string; decision_time: string; vintage: string | null; vintage_age_hours: number | null
  rows: Row[]; forecast_mwh: number; actual_mwh: number; metrics: Metrics; bias_adjustment: number | null; adjusted_metrics: Metrics; evolution: Vintage[]
}
export type Buffer = { p80: number; p90: number; p95: number; share_hours_short: number | null }
export type DayRow = { date: string; vintage: string | null; forecast_mwh: number; actual_mwh: number; mae: number; bias: number; max_shortfall: number; nmae_pct: number | null; bias_adjustment: number | null }
export type Accuracy = {
  cutoff: string; days: number; overall: Metrics; adjusted: Metrics
  percentiles: Record<string, number>; buffer: Buffer; buffer_adjusted: Buffer
  by_hour: ({ hour: number } & Metrics)[]; by_lead: ({ lead_hours: number } & Metrics)[]; by_vintage: ({ label: string } & Metrics)[]
  histogram: { bin_start: number; count: number }[]; per_day: DayRow[]; worst_day: DayRow | null
}
export type Meta = { decision_window: [string, string]; delivery_days: string[]; default_cutoff: string; gate_closure: string; snapshot: Record<string, string | number> }

async function get<T>(path: string): Promise<T> {
  const r = await fetch(path)
  if (!r.ok) throw new Error(`API ${r.status}: ${await r.text()}`)
  return r.json()
}

export const useMeta = () => useQuery({ queryKey: ['meta'], queryFn: () => get<Meta>('/api/meta') })
export const useDayAhead = (date: string, cutoff: string) =>
  useQuery({ queryKey: ['dayahead', date, cutoff], queryFn: () => get<DayAhead>(`/api/dayahead/${date}?cutoff=${cutoff}`), placeholderData: prev => prev })
export const useAccuracy = (cutoff: string) =>
  useQuery({ queryKey: ['accuracy', cutoff], queryFn: () => get<Accuracy>(`/api/accuracy?cutoff=${cutoff}`), placeholderData: prev => prev })
