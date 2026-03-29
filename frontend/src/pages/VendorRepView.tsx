import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Sparkles, Mail } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000/api`
const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

const gradeColor: Record<string, string> = {
  A: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  B: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  C: 'bg-orange-50 text-orange-700 border-orange-100',
  D: 'bg-red-50 text-red-700 border-red-200',
};
const riskBorder: Record<string, string> = {
  Low: 'border-l-emerald-400', Medium: 'border-l-yellow-400',
  High: 'border-l-orange-500', Critical: 'border-l-red-500',
};

export default function VendorRepView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    fetch(`${API}/vendor-rep/extended`).then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  const generateEmail = async (vendor: any) => {
    setSelected(vendor);
    setEmail('');
    setEmailLoading(true);
    const txRes = await fetch(`${API}/transactions`).then(r => r.json()).catch(() => []);
    const tx = txRes.find((t: any) => t.vendor_name === vendor.name);
    if (tx) {
      const res = await fetch(`${API}/negotiate/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_id: tx.id }),
      });
      const d = await res.json();
      setEmail(d.email_body || d.detail || 'Error generating email');
    } else {
      setEmail('No recent transaction found for this vendor to generate email.');
    }
    setEmailLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-indigo-500 animate-spin" /></div>;

  const vendors: any[] = data?.vendors || [];
  const filtered = filter === 'All' ? vendors : vendors.filter((v: any) => v.risk_level === filter);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-[#1E1B4B]">Vendor <span className="text-indigo-500">Reputation</span></h2>
          <p className="text-slate-500 text-sm mt-1">NLP + behavioral scoring — TDS compliance, GSTIN, activity signals</p>
        </div>
        <div className="text-right glass-panel px-4 py-3 rounded-2xl">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Avg Score</p>
          <p className="text-2xl font-extrabold text-indigo-500">{data?.avg_score || 0}</p>
        </div>
      </div>

      {/* Critical alerts */}
      {data?.critical_vendors?.length > 0 && (
        <div className="glass-panel p-4 rounded-2xl border-l-4 border-red-500 bg-red-50/30">
          <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-2">🔴 Critical Vendors Requiring Immediate Action</p>
          <div className="flex flex-wrap gap-2">
            {data.critical_vendors.map((v: any) => (
              <span key={v.name} className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">{v.name}</span>
            ))}
          </div>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Vendors', val: data?.total_vendors || 0 },
          { label: 'Critical', val: data?.critical_count || 0, c: 'text-red-500' },
          { label: 'High Risk', val: data?.high_risk_count || 0, c: 'text-orange-500' },
          { label: 'Avg Score', val: data?.avg_score || 0, c: 'text-indigo-500' },
        ].map(k => (
          <div key={k.label} className="glass-panel p-4 rounded-2xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{k.label}</p>
            <p className={`text-2xl font-extrabold ${k.c || 'text-[#1E1B4B]'}`}>{k.val}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['All', 'Critical', 'High', 'Medium', 'Low'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filter === f ? 'bg-indigo-600 text-white' : 'glass-panel text-slate-500 hover:text-indigo-600'}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Vendor cards */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
        {filtered.map((v: any, i: number) => (
          <motion.div key={v.name} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className={`glass-panel p-4 rounded-2xl border-l-4 ${riskBorder[v.risk_level] || 'border-l-slate-200'} hover:bg-white/70 cursor-pointer transition-all`}
            onClick={() => generateEmail(v)}>
            <div className="flex items-center gap-4">
              {/* Grade badge */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-lg border ${gradeColor[v.grade]}`}>
                {v.grade}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-[#1E1B4B] text-sm truncate">{v.name}</p>
                  {v.nlp_flags.length > 0 && <AlertTriangle size={12} className="text-red-400 flex-shrink-0" />}
                </div>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                  <span>{v.txn_count} txns · {fmt(v.total_spent)}</span>
                  <span>TDS: {v.tds_compliance_rate}%</span>
                  {v.has_gstin ? <span className="text-emerald-500">✓ GSTIN</span> : <span className="text-red-400">✗ No GSTIN</span>}
                  <span>Logins: {v.avg_login_activity}/mo</span>
                </div>
                {v.red_flags.length > 0 && (
                  <div className="flex gap-1.5 mt-1.5">
                    {v.red_flags.map((f: string) => <span key={f} className="bg-red-50 text-red-500 border border-red-100 px-1.5 py-0.5 rounded text-[9px] font-bold">{f}</span>)}
                  </div>
                )}
              </div>

              {/* Score bar */}
              <div className="w-24 flex-shrink-0">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div className={`h-full rounded-full ${v.score >= 75 ? 'bg-emerald-500' : v.score >= 55 ? 'bg-yellow-400' : v.score >= 35 ? 'bg-orange-500' : 'bg-red-500'}`}
                    animate={{ width: `${v.score}%` }} transition={{ duration: 0.6 }} />
                </div>
                <p className="text-[10px] font-bold text-slate-500 text-right mt-0.5">{v.score}/100</p>
              </div>

              <Sparkles size={14} className="text-indigo-300 flex-shrink-0" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Email panel */}
      {selected && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-6 rounded-2xl border-l-4 border-indigo-500">
          <div className="flex items-center gap-2 mb-3">
            <Mail className="text-indigo-500" size={16} />
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Gemini Negotiation — {selected.name} (Score: {selected.score}/100)</p>
          </div>
          {emailLoading ? (
            <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin" /><p className="text-indigo-500 text-xs font-mono animate-pulse">DRAFTING…</p></div>
          ) : (
            <pre className="text-[#1E1B4B] text-xs leading-relaxed whitespace-pre-wrap font-sans bg-white/60 p-4 rounded-xl max-h-64 overflow-y-auto custom-scrollbar">{email}</pre>
          )}
        </motion.div>
      )}
    </div>
  );
}


