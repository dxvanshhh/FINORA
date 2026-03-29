import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, MapPin } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const API = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000/api`
const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const COLORS = ['#6366F1', '#EF4444', '#F59E0B'];

export default function TaxGSTView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'eligible' | 'blocked' | 'missing'>('eligible');

  useEffect(() => {
    fetch(`${API}/tax-compliance/extended`).then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-indigo-500 animate-spin" /></div>;

  const score = data?.compliance_score || 0;
  const scoreColor = score >= 75 ? 'text-emerald-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600';

  const pieData = [
    { name: 'ITC Eligible', value: data?.itc_eligible_amount || 0 },
    { name: 'ITC Blocked', value: data?.itc_blocked_amount || 0 },
    { name: 'ITC Lost', value: data?.itc_lost_to_missing_gstin || 0 },
  ];

  const stateSpend: Record<string, number> = data?.state_spend || {};

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-3xl font-extrabold text-[#1E1B4B]">Tax & GST <span className="text-indigo-500">Intelligence</span></h2>
        <p className="text-slate-500 text-sm mt-1">ITC eligibility, blocked credits, GSTIN compliance &amp; state analysis</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Compliance Score', val: `${score}%`, color: scoreColor },
          { label: 'ITC Recoverable', val: fmt(data?.net_itc_recoverable || 0), color: 'text-emerald-600' },
          { label: 'ITC Blocked', val: fmt(data?.itc_blocked_amount || 0), color: 'text-orange-500' },
          { label: 'Lost (No GSTIN)', val: fmt(data?.itc_lost_to_missing_gstin || 0), color: 'text-red-500' },
        ].map(k => (
          <div key={k.label} className="glass-panel p-5 rounded-2xl">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{k.label}</p>
            <p className={`text-2xl font-extrabold ${k.color}`}>{k.val}</p>
          </div>
        ))}
      </div>

      {/* Chart + State map */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="glass-panel p-5 rounded-2xl">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-4">ITC Breakdown</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={80} innerRadius={50} paddingAngle={3}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex gap-3 justify-center text-[10px] font-semibold text-slate-500 mt-2">
            {pieData.map((p, i) => <span key={i} className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />{p.name}</span>)}
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-4">State-wise Spend</p>
          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            {Object.entries(stateSpend).map(([state, amt], i) => {
              const maxAmt = Math.max(...Object.values(stateSpend));
              const pct = (Number(amt) / maxAmt) * 100;
              return (
                <div key={i} className="flex items-center gap-3">
                  <MapPin size={12} className="text-indigo-400 flex-shrink-0" />
                  <span className="text-[11px] text-slate-600 font-semibold w-24 truncate">{state}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-indigo-400 rounded-full" animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold w-20 text-right">{fmt(Number(amt))}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'eligible', label: `✅ ITC Eligible (${data?.itc_eligible_count || 0})` },
          { key: 'blocked', label: `🚫 ITC Blocked (${data?.itc_blocked_count || 0})` },
          { key: 'missing', label: `⚠️ Missing GSTIN (${data?.missing_gstin_count || 0})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${tab === t.key ? 'bg-indigo-600 text-white shadow' : 'glass-panel text-slate-500 hover:text-indigo-600'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="divide-y divide-slate-50 max-h-96 overflow-y-auto custom-scrollbar">
          {(tab === 'eligible' ? data?.top_itc_eligible :
            tab === 'blocked' ? data?.top_itc_blocked :
            data?.missing_gstin_vendors
          )?.map((item: any, i: number) => (
            <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
              className="flex items-center gap-4 px-5 py-4 hover:bg-white/60">
              {tab === 'eligible' ? <CheckCircle size={15} className="text-emerald-500 flex-shrink-0" /> :
               tab === 'blocked' ? <XCircle size={15} className="text-orange-500 flex-shrink-0" /> :
               <XCircle size={15} className="text-red-500 flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#1E1B4B] text-sm truncate">{item.vendor || item.vendor_name}</p>
                <p className="text-slate-400 text-[11px]">{item.reason || item.section || item.issue}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-[#1E1B4B]">{fmt(item.amount)}</p>
                <p className={`text-xs font-bold ${tab === 'eligible' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {tab === 'eligible' ? `+${fmt(item.gst_amount)} ITC` : fmt(item.itc_loss || item.gst_amount)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}


