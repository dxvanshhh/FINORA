import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000/api`
const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

const SEC_STYLE: Record<string, { badge: string; dot: string }> = {
  '194J': { badge: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-400' },
  '194C': { badge: 'bg-blue-50  text-blue-700  border-blue-200',    dot: 'bg-blue-400' },
  '194Q': { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-400' },
};
const fallbackSec = { badge: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-400' };

// ── Section sub-row for an expanded vendor ────────────────────────────────────
function SectionRow({ sec }: { sec: any }) {
  const style = SEC_STYLE[sec.section] || fallbackSec;
  return (
    <motion.tr
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18 }}
    >
      <td colSpan={7} className="px-0 py-0">
        <div className="mx-5 mb-2 rounded-2xl overflow-hidden" style={{ background: '#EEF2FF', border: '1px solid #C7D2FE' }}>
          {/* Section header */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-indigo-100">
            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${style.badge}`}>
              Sec {sec.section}
            </span>
            <span className="text-xs font-semibold text-slate-600">{sec.nature}</span>
            <span className="text-[10px] text-indigo-500 font-bold ml-1">
              @ {sec.tds_rate} TDS · {sec.transaction_count} transaction{sec.transaction_count !== 1 ? 's' : ''}
            </span>
            <span className="ml-auto text-[10px] font-bold text-red-600">
              Total Liability: {fmt(sec.liability)}
            </span>
          </div>

          {/* Violation reason badge */}
          <div className="flex items-start gap-2 px-5 py-3 border-b border-indigo-100">
            <AlertTriangle size={12} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-700 leading-relaxed font-medium">
              {sec.violation_reason}
            </p>
          </div>

          {/* Shortfall + Penalty breakdown */}
          <div className="grid grid-cols-3 divide-x divide-indigo-100 px-0">
            <div className="px-5 py-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-indigo-400 mb-0.5">TDS Shortfall</p>
              <p className="text-base font-extrabold text-red-500">{fmt(sec.shortfall)}</p>
            </div>
            <div className="px-5 py-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-indigo-400 mb-0.5">Interest Penalty</p>
              <p className="text-base font-extrabold text-orange-500">{fmt(sec.penalty)}</p>
            </div>
            <div className="px-5 py-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-indigo-400 mb-0.5">Net Liability</p>
              <p className="text-base font-extrabold text-red-700">{fmt(sec.liability)}</p>
            </div>
          </div>
        </div>
      </td>
    </motion.tr>
  );
}

// ── Main vendor row (clickable) ───────────────────────────────────────────────
function VendorRow({ vendor, idx }: { vendor: any; idx: number }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <motion.tr
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: idx * 0.04 }}
        onClick={() => setOpen(o => !o)}
        className="cursor-pointer transition-colors hover:bg-white/70"
        style={{ background: open ? 'rgba(238,242,255,0.6)' : undefined }}
      >
        {/* Expand toggle + vendor name */}
        <td className="px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="text-slate-400 flex-shrink-0">
              {open ? <ChevronDown size={14} strokeWidth={2.5} /> : <ChevronRight size={14} strokeWidth={2.5} />}
            </span>
            <div>
              <p className="font-bold text-[#0F172A] text-sm leading-tight">{vendor.vendor_name}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {vendor.sections.length} section{vendor.sections.length !== 1 ? 's' : ''} · click to expand
              </p>
            </div>
          </div>
        </td>

        {/* Total flagged amount */}
        <td className="px-4 py-4 text-right">
          <span className="font-bold text-[#0F172A] text-sm">{fmt(vendor.total_amount)}</span>
        </td>

        {/* Section badges */}
        <td className="px-4 py-4 text-center">
          <div className="flex flex-wrap gap-1 justify-center">
            {vendor.sections.map((s: any) => {
              const style = SEC_STYLE[s.section] || fallbackSec;
              return (
                <span key={s.section} className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${style.badge}`}>
                  {s.section}
                </span>
              );
            })}
          </div>
        </td>

        {/* Shortfall */}
        <td className="px-4 py-4 text-right font-bold text-red-500 text-sm">
          {fmt(vendor.total_shortfall)}
        </td>

        {/* Penalty */}
        <td className="px-4 py-4 text-right font-bold text-orange-400 text-sm">
          {fmt(vendor.total_penalty)}
        </td>

        {/* Total liability */}
        <td className="px-4 py-4 text-right font-bold text-red-700 text-sm">
          {fmt(vendor.total_liability)}
        </td>

        {/* Risk */}
        <td className="px-4 py-4 text-center">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            vendor.max_risk === 'High' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
          }`}>
            {vendor.max_risk}
          </span>
        </td>
      </motion.tr>

      {/* Expanded section rows */}
      <AnimatePresence>
        {open && vendor.sections.map((sec: any) => (
          <SectionRow key={sec.section} sec={sec} />
        ))}
      </AnimatePresence>
    </>
  );
}

// ── Page root ─────────────────────────────────────────────────────────────────
export default function TDSView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'vendor' | 'compliant'>('vendor');

  useEffect(() => {
    fetch(`${API}/tds-check/extended`).then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-indigo-500 animate-spin" />
    </div>
  );

  const vendors: any[] = data?.vendor_breakdown || [];
  const compliant: any[] = data?.compliant || [];
  const sectionSummary: Record<string, any> = data?.summary_by_section || {};

  return (
    <div className="space-y-5">
      {/* Title */}
      <div>
        <h2 className="text-3xl font-extrabold" style={{ color: '#0F172A' }}>
          26AS / TDS <span style={{ color: '#4F46E5' }}>Cross-Check</span>
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Section-aware vendor audit — 194J · 194C · 194Q · expand any vendor to see per-law violations
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Shortfall',   val: fmt(data?.total_tds_shortfall || 0),    color: 'text-red-500' },
          { label: 'Interest Penalty',  val: fmt(data?.total_interest_penalty || 0), color: 'text-orange-500' },
          { label: 'Total Liability',   val: fmt(data?.total_liability || 0),         color: 'text-red-700' },
          { label: 'Compliant Txns',    val: data?.total_compliant || 0,              color: 'text-emerald-600' },
        ].map(k => (
          <div key={k.label} className="glass-panel p-5 rounded-2xl">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{k.label}</p>
            <p className={`text-2xl font-extrabold ${k.color}`}>{k.val}</p>
          </div>
        ))}
      </div>

      {/* Section summary pills */}
      {Object.keys(sectionSummary).length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {Object.entries(sectionSummary).map(([sec, s]: any) => {
            const style = SEC_STYLE[sec] || fallbackSec;
            return (
              <div key={sec} className={`glass-panel px-4 py-3 rounded-xl border text-sm flex items-center gap-2 ${style.badge}`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
                <span className="font-bold">Sec {sec}</span>
                <span className="text-[11px] opacity-75">·</span>
                <span>{s.count} violations</span>
                <span className="text-[11px] opacity-75">·</span>
                <span className="font-semibold">{fmt(s.liability)} liability</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab('vendor')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            tab === 'vendor' ? 'bg-indigo-600 text-white shadow-md' : 'glass-panel text-slate-500 hover:text-indigo-600'
          }`}>
          ⚠️ Non-Compliant Vendors ({vendors.length})
        </button>
        <button onClick={() => setTab('compliant')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            tab === 'compliant' ? 'bg-indigo-600 text-white shadow-md' : 'glass-panel text-slate-500 hover:text-indigo-600'
          }`}>
          ✅ Compliant ({compliant.length})
        </button>
      </div>

      {/* ── Non-Compliant Vendor Table (section-aware) ── */}
      {tab === 'vendor' && (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Vendor <span className="normal-case font-normal">(click to expand)</span>
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right">Amount</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center">Sections</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right">Shortfall</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right">+ Penalty</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right">Liability</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {vendors.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400 text-sm">No non-compliant vendors found.</td>
                  </tr>
                )}
                {vendors.map((v: any, i: number) => (
                  <VendorRow key={v.vendor_name} vendor={v} idx={i} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Compliant Table ── */}
      {tab === 'compliant' && (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Vendor</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right">Amount</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center">Section</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right">TDS Rate</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right">TDS Deducted</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {compliant.map((row: any, i: number) => (
                  <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="hover:bg-white/60 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-[#0F172A] text-sm truncate max-w-[200px]">{row.vendor_name}</p>
                      {row.nature && <p className="text-[10px] text-slate-400">{row.nature}</p>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[#0F172A]">{fmt(row.amount)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${(SEC_STYLE[row.section] || fallbackSec).badge}`}>
                        {row.section}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500 font-semibold">{row.tds_rate}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">{fmt(row.tds_deducted)}</td>
                    <td className="px-4 py-3 text-center">
                      <CheckCircle size={14} className="text-emerald-500 mx-auto" />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


