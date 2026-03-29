import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, AlertTriangle, TrendingUp, TrendingDown, BarChart2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';

const API = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000/api`;
const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export default function BurnOracleView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/burn-oracle/extended`).then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-indigo-500 animate-spin" /></div>;

  const weeks = data?.weeks || [];
  const forecast = data?.forecast_next_4_weeks || [];
  const anomalies: any[] = data?.anomalies || [];
  const chartData = [...weeks, ...forecast.map((f: any) => ({ ...f, forecast: true }))];

  const avgBurn = data?.mean_weekly_burn || 0;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-3xl font-extrabold text-[#1E1B4B]">Burn Oracle <span className="text-indigo-500">Intelligence</span></h2>
        <p className="text-slate-500 text-sm mt-1">Z-score + IQR anomaly detection on weekly spend velocity</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Avg Weekly Burn', val: fmt(avgBurn), color: 'text-[#1E1B4B]' },
          { label: 'Projected Monthly', val: fmt(data?.projected_monthly || 0), color: 'text-indigo-500' },
          { label: 'Anomaly Weeks', val: anomalies.length, color: 'text-red-500' },
          { label: 'Forecast +4wk', val: fmt(forecast[3]?.burn || 0), color: 'text-emerald-600' },
        ].map(k => (
          <div key={k.label} className="glass-panel p-5 rounded-2xl">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{k.label}</p>
            <p className={`text-2xl font-extrabold ${k.color}`}>{k.val}</p>
          </div>
        ))}
      </div>

      {/* Area Chart */}
      <div className="glass-panel p-6 rounded-2xl">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-5">Weekly Burn Rate — Last 20 Weeks + 4-Week Forecast</p>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="burnGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#6366F1" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EAB308" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#EAB308" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#94a3b8' }} />
            <YAxis tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} tick={{ fontSize: 9, fill: '#94a3b8' }} width={55} />
            <Tooltip formatter={(v: number) => fmt(v)} labelStyle={{ fontSize: 11 }} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
            <ReferenceLine y={avgBurn} stroke="#6366F1" strokeDasharray="4 4" label={{ value: 'AVG', fill: '#6366F1', fontSize: 9 }} />
            <Area type="monotone" dataKey="burn" stroke="#6366F1" strokeWidth={2} fill="url(#burnGrad)" dot={(props: any) => {
              const item = chartData[props.index];
              if (item?.is_spike) return <circle key={props.index} cx={props.cx} cy={props.cy} r={6} fill="#ef4444" stroke="#fff" strokeWidth={2} />;
              if (item?.is_dip) return <circle key={props.index} cx={props.cx} cy={props.cy} r={5} fill="#eab308" stroke="#fff" strokeWidth={2} />;
              return <circle key={props.index} cx={props.cx} cy={props.cy} r={3} fill="#6366F1" />;
            }} />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex gap-5 mt-3 text-[10px] font-semibold text-slate-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" />Spend Spike</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" />Unusual Dip</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-indigo-500 inline-block" />Normal</span>
        </div>
      </div>

      {/* Anomaly Cards */}
      {anomalies.length > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Detected Anomalies</p>
          {anomalies.map((a, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
              className={`glass-panel p-5 rounded-2xl border-l-4 ${a.severity === 'Critical' ? 'border-red-500' : a.type === 'Unusual Dip' ? 'border-yellow-400' : 'border-orange-400'}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {a.type === 'Spend Spike' ? <AlertTriangle size={14} className="text-red-500" /> : <TrendingDown size={14} className="text-yellow-500" />}
                    <p className="font-bold text-[#1E1B4B] text-sm">{a.type} — {a.week}</p>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${a.severity === 'Critical' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>{a.severity}</span>
                  </div>
                  <p className="text-slate-500 text-xs">{a.recommendation}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-extrabold text-[#1E1B4B]">{fmt(a.burn)}</p>
                  <p className={`text-xs font-bold ${a.type === 'Spend Spike' ? 'text-red-500' : 'text-yellow-600'}`}>{a.deviation}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

