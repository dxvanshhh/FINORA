import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ghost, AlertTriangle, TrendingDown, Sparkles, Mail } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000/api`
const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

const riskStyle: Record<string, string> = {
  Critical: 'bg-red-50 text-red-700 border-red-200 border-l-red-500',
  High:     'bg-orange-50 text-orange-700 border-orange-200 border-l-orange-500',
  Medium:   'bg-yellow-50 text-yellow-700 border-yellow-100 border-l-yellow-400',
  Low:      'bg-green-50 text-green-700 border-green-100 border-l-green-400',
};
const riskDot: Record<string, string> = {
  Critical: 'bg-red-500', High: 'bg-orange-500', Medium: 'bg-yellow-400', Low: 'bg-green-500',
};

export default function GhostSeatsView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/ghost-finder/extended`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const generateEmail = async (seat: any) => {
    setSelected(seat);
    setEmail('');
    setEmailLoading(true);
    // Find a matching transaction for it
    const txRes = await fetch(`${API}/transactions`).then(r => r.json());
    const tx = txRes.find((t: any) => t.vendor_name === seat.vendor_name);
    if (tx) {
      const res = await fetch(`${API}/negotiate/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_id: tx.id }),
      });
      const d = await res.json();
      setEmail(d.email_body || d.detail || 'Error generating email');
    } else {
      setEmail('No matching transaction found to generate email.');
    }
    setEmailLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-indigo-500 animate-spin" /></div>;

  const seats: any[] = data?.seats || [];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-3xl font-extrabold text-[#1E1B4B]">Ghost Seats <span className="text-indigo-500">Detector</span></h2>
        <p className="text-slate-500 text-sm mt-1">AI-powered subscription waste analysis — multi-signal risk scoring</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Waste Est.', val: fmt(data?.total_estimated_waste || 0), color: 'text-red-500' },
          { label: 'Annual Recovery', val: fmt(data?.annual_recovery_potential || 0), color: 'text-emerald-600' },
          { label: 'Critical Subs', val: data?.critical_count || 0, color: 'text-red-600' },
          { label: 'Analyzed', val: data?.total_subscriptions_analyzed || 0, color: 'text-indigo-500' },
        ].map(s => (
          <div key={s.label} className="glass-panel p-5 rounded-2xl">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{s.label}</p>
            <p className={`text-2xl font-extrabold ${s.color}`}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-2">
          <Ghost className="text-indigo-500" size={16} />
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Subscription Risk Map</span>
        </div>
        {seats.length === 0 && <div className="p-10 text-center text-slate-400 text-sm">No ghost seats detected</div>}
        <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto custom-scrollbar">
          {seats.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
              className={`flex items-center gap-4 p-5 hover:bg-white/60 cursor-pointer border-l-4 ${riskStyle[s.risk_level] || ''}`}
              onClick={() => generateEmail(s)}>
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${riskDot[s.risk_level]}`} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#1E1B4B] text-sm">{s.vendor_name}</p>
                <p className="text-slate-400 text-xs mt-0.5">{s.category} · {s.subscription_count} invoices · avg {s.avg_logins} logins/mo</p>
              </div>
              <div className="text-right">
                <p className="font-extrabold text-red-500 text-sm">{fmt(s.estimated_waste)} waste</p>
                <p className="text-[10px] text-slate-400">{s.waste_percent}% of spend</p>
              </div>
              <div className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border ${riskStyle[s.risk_level]}`}>
                {s.risk_level}
              </div>
              <div className="text-[10px] text-slate-400 w-28 text-right hidden md:block">{s.action}</div>
              <Sparkles size={14} className="text-indigo-300" />
            </motion.div>
          ))}
        </div>
      </div>

      {/* AI Email Panel */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="glass-panel p-6 rounded-2xl border-l-4 border-indigo-500">
            <div className="flex items-center gap-2 mb-3">
              <Mail className="text-indigo-500" size={16} />
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Gemini Negotiation Email — {selected.vendor_name}</p>
              <span className="ml-auto text-[9px] bg-indigo-50 border border-indigo-100 text-indigo-400 px-2 py-0.5 rounded-full font-bold">AI Generated</span>
            </div>
            {emailLoading ? (
              <div className="flex items-center gap-3 py-4">
                <div className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin" />
                <p className="text-indigo-500 font-mono text-xs animate-pulse">GEMINI DRAFTING EMAIL…</p>
              </div>
            ) : (
              <pre className="text-[#1E1B4B] text-xs leading-relaxed whitespace-pre-wrap font-sans max-h-72 overflow-y-auto custom-scrollbar bg-white/60 p-4 rounded-xl">
                {email}
              </pre>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


