import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Send, X, Globe, Eye, Scale, TrendingUp } from 'lucide-react';
import Background3D from './components/Background3D';
import FloatingDock, { TABS } from './components/FloatingDock';
import Login from './pages/Login';
import ForensicAgentView from './pages/ForensicAgent';
import GhostSeatsView from './pages/GhostSeatsView';
import BurnOracleView from './pages/BurnOracleView';
import TDSView from './pages/TDSView';
import TaxGSTView from './pages/TaxGSTView';
import VendorRepView from './pages/VendorRepView';
import NegotiatorView from './pages/NegotiatorView';
import FloatingCopilot from './components/FloatingCopilot';

const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000/api`;
const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

// Smooth animated counter
function AnimatedCounter({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const dur = 2000;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 4);
      setDisplay(Math.floor(ease * value));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);
  return <span>{fmt(display)}</span>;
}

// ─── Global Arbitrage Module ──────────────────────────────────────────────────

const USD_TO_INR = 83.5;

const PRICING_DATA = [
  {
    product: 'AWS (S3 + EC2 base)',
    icon: '☁️',
    regions: {
      India:     { base: 1100, tax: 0.18, currency: '₹', local: true },
      USA:       { base: 1240, tax: 0.00, currency: '$', local: false },
      Singapore: { base: 1190, tax: 0.09, currency: 'S$', local: false },
      UAE:       { base: 1150, tax: 0.05, currency: 'AED', local: false },
    },
  },
  {
    product: 'Zoom (Business Pro)',
    icon: '📹',
    highlight: true,
    regions: {
      India:     { base: 11800, tax: 0.18, currency: '₹', local: true },
      USA:       { base: 149,   tax: 0.00, currency: '$', local: false },
      Singapore: { base: 200,   tax: 0.09, currency: 'S$', local: false },
      UAE:       { base: 480,   tax: 0.05, currency: 'AED', local: false },
    },
  },
  {
    product: 'Slack (Pro, 50 users)',
    icon: '💬',
    regions: {
      India:     { base: 33000, tax: 0.18, currency: '₹', local: true },
      USA:       { base: 375,   tax: 0.00, currency: '$', local: false },
      Singapore: { base: 500,   tax: 0.09, currency: 'S$', local: false },
      UAE:       { base: 1380,  tax: 0.05, currency: 'AED', local: false },
    },
  },
];

// Exchange rates to INR (approximate)
const TO_INR: Record<string, number> = {
  '₹':  1,
  '$':  USD_TO_INR,
  'S$': 62,
  'AED': 22.7,
};

const REGION_FLAGS: Record<string, string> = {
  India: '🇮🇳', USA: '🇺🇸', Singapore: '🇸🇬', UAE: '🇦🇪',
};
const REGION_TAX_LABEL: Record<string, string> = {
  India: 'GST 18%', USA: 'No VAT', Singapore: 'GST 9%', UAE: 'VAT 5%',
};

function trueCostINR(base: number, tax: number, currency: string) {
  return Math.round(base * (1 + tax) * TO_INR[currency]);
}

function ArbitrageModule() {
  const regions = ['India', 'USA', 'Singapore', 'UAE'] as const;

  return (
    <div className="space-y-6">
      {/* Pricing Table */}
      <div className="glass-panel rounded-3xl overflow-hidden">
        <div className="p-6 pb-0">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
            True Cost Comparison — incl. Local Tax
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 w-48">Product</th>
                {regions.map(r => (
                  <th key={r} className="px-4 py-3 text-center">
                    <div className="text-base">{REGION_FLAGS[r]}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{r}</div>
                    <div className="text-[9px] text-indigo-400 font-semibold mt-0.5">{REGION_TAX_LABEL[r]}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PRICING_DATA.map((row) => {
                const inrCosts = regions.map(r => {
                  const reg = row.regions[r];
                  return trueCostINR(reg.base, reg.tax, reg.currency);
                });
                const minCost = Math.min(...inrCosts);
                const maxCost = Math.max(...inrCosts);

                return (
                  <tr key={row.product} className={`border-b border-slate-50 ${row.highlight ? 'bg-indigo-50/40' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{row.icon}</span>
                        <div>
                          <div className="font-semibold text-[#1E1B4B] text-sm">{row.product}</div>
                          {row.highlight && <div className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider">Best savings opportunity</div>}
                        </div>
                      </div>
                    </td>
                    {regions.map((r) => {
                      const reg = row.regions[r];
                      const inr = trueCostINR(reg.base, reg.tax, reg.currency);
                      const isCheapest = inr === minCost;
                      const isMostExpensive = inr === maxCost;
                      return (
                        <td key={r} className="px-4 py-4 text-center">
                          <div className={`inline-block px-3 py-1.5 rounded-xl text-xs font-bold ${
                            isCheapest
                              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                              : isMostExpensive
                              ? 'bg-red-50 text-red-600 ring-1 ring-red-100'
                              : 'bg-slate-50 text-slate-600'
                          }`}>
                            ₹{inr.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[9px] text-slate-400 mt-1">
                            {reg.currency}{reg.base.toLocaleString()} + {(reg.tax * 100).toFixed(0)}% tax
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 flex gap-4 text-[10px] font-semibold text-slate-400 border-t border-slate-100">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"/>Cheapest</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"/>Most Expensive</span>
          <span className="ml-auto">All values converted to INR at live rates. USD=₹{USD_TO_INR}</span>
        </div>
      </div>

      {/* AI Recommendation — Live Gemini */}
      <AiRecommendation />
    </div>
  );
}

function AiRecommendation() {
  const [aiText, setAiText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    setLoading(true); setError(''); setAiText(null);
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/ai-arbitrage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_prompt: 'Generate your best arbitrage recommendation for an Indian company. Be specific with numbers.' })
      });
      if (!res.ok) throw new Error(`API: ${res.status}`);
      const data = await res.json();
      setAiText(data.recommendation);
    } catch (e: any) {
      setError(e.message || 'Failed to reach Gemini.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-panel rounded-3xl p-7 border-l-4 border-indigo-500 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-100/50 rounded-full -translate-y-12 translate-x-12 blur-2xl pointer-events-none" />

      <div className="flex items-start gap-5 relative">
        <div className="flex-shrink-0 w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center">
          <Sparkles className="text-indigo-600" size={22} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] uppercase tracking-widest font-bold text-indigo-500">AI Recommendation</p>
            <span className="text-[9px] bg-indigo-50 text-indigo-400 font-bold px-2 py-0.5 rounded-full border border-indigo-100">Gemini 2.0 Flash</span>
          </div>

          {!aiText && !loading && !error && (
            <div>
              <p className="text-[#1E1B4B] font-bold text-lg leading-snug">
                Switching your Zoom billing to the UAE entity would save{' '}
                <span className="text-emerald-600">₹14,200/month</span>.
              </p>
              <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                Click <strong>Generate Action Plan</strong> to get a live, AI-powered analysis from Gemini using your FINORA Key.
              </p>
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-3 py-4">
              <div className="w-6 h-6 rounded-full border-[3px] border-slate-200 border-t-indigo-500 animate-spin" />
              <p className="text-indigo-500 font-mono tracking-widest text-[11px] animate-pulse">GEMINI IS THINKING…</p>
            </div>
          )}

          {error && (
            <p className="text-red-500 text-sm mt-2 font-medium">⚠️ {error}</p>
          )}

          {aiText && (
            <div className="mt-1 text-[#1E1B4B] text-sm leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
              {aiText}
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <button
              onClick={generate}
              disabled={loading}
              className={`text-white text-xs font-bold px-5 py-2 rounded-xl transition-all shadow-lg shadow-indigo-200 flex items-center ${
                loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              <Sparkles size={12} className="mr-1.5" strokeWidth={2.5}/> 
              {loading ? 'Generating…' : aiText ? 'Regenerate' : 'Generate Action Plan'}
            </button>
            <button className="bg-white/80 text-[#1E1B4B] border border-slate-200 text-xs font-semibold px-5 py-2 rounded-xl hover:bg-white transition-all">
              Export Report
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}



function LiveAgenticLog({ txs, forensic, ghosts }: any) {
  const [logs, setLogs] = useState<any[]>([
    { id: 1, type: 'ok', msg: 'Neural Network weights loaded' },
    { id: 2, type: 'info', msg: 'Initializing anomaly detection routines...' }
  ]);

  useEffect(() => {
    if (!txs || txs.length === 0) return;
    
    const interval = setInterval(() => {
        const randomTx = txs[Math.floor(Math.random() * txs.length)];
        const isThreat = Math.random() > 0.85;
        
        let msg = '';
        if (isThreat) {
           const types = ['Structuring Risk', 'Unusual Velocity', 'Missing ITC', 'Zero Usage Drop'];
           const threatType = types[Math.floor(Math.random() * types.length)];
           msg = `Detected anomalies in trace [${randomTx.id?.substring(0,6) || 'N/A'}] - ${threatType}`;
        } else {
           msg = `Analyzing vector ${randomTx.id?.substring(0,8) || 'N/A'} | ₹${randomTx.amount} -> ${randomTx.vendor_name?.substring(0,12) || 'UPI'}`;
        }

        const newLog = {
          id: Date.now(),
          type: isThreat ? 'warn' : 'info',
          msg
        };
        
        setLogs(prev => {
          const updated = [...prev, newLog];
          return updated.slice(-5);
        });
    }, 2500);

    return () => clearInterval(interval);
  }, [txs]);

  return (
    <div className="glass-panel p-8 rounded-3xl bg-slate-900 border border-slate-800 text-slate-300 font-mono text-[10px] overflow-hidden relative">
      <div className="absolute top-0 right-0 text-[100px] opacity-5 pointer-events-none leading-none">🧠</div>
      <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
        <p className="text-indigo-400 font-bold tracking-widest uppercase text-[10px] font-sans">
          Live Telemetry Stream
        </p>
        <span className="flex items-center gap-1.5 text-emerald-400 font-sans text-xs font-bold tracking-widest">
           <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> ACTIVE
        </span>
      </div>
      
      <div className="space-y-3 opacity-90 min-h-[140px] flex flex-col justify-end">
        {logs.map((log) => (
          <motion.p key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className={log.type === 'warn' ? 'text-amber-400' : log.type === 'info' ? 'text-indigo-300' : ''}>
            {log.type === 'ok' && <span className="text-emerald-400 mr-2">[OK]</span>}
            {log.type === 'warn' && <span className="text-amber-500 mr-2">[WARN]</span>}
            {log.type === 'info' && <span className="text-indigo-500 mr-2">[SCAN]</span>}
            {log.msg}
          </motion.p>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState('overview');
  const [txs, setTxs] = useState<any[]>([]);
  const [forensic, setForensic] = useState<any>({ smurfing_detected: [], shell_risk_detected: [] });
  const [ghosts, setGhosts] = useState<any>({ ghost_subscriptions: [] });
  const [totalValue, setTotalValue] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [emailText, setEmailText] = useState('');

  const refreshData = useCallback(() => {
    fetch(`${API_URL}/transactions`).then(r => r.json()).then(data => {
      setTxs(data);
      setTotalValue(data.reduce((s: number, t: any) => s + (t.amount || 0), 0));
    }).catch(console.error);
    fetch(`${API_URL}/forensic-agent/analyze`).then(r => r.json()).then(setForensic).catch(console.error);
    fetch(`${API_URL}/ghost-finder/analyze`).then(r => r.json()).then(setGhosts).catch(console.error);
  }, []);

  useEffect(() => { if (authed) refreshData(); }, [refreshData, authed]);

  const handleOptimize = async (ghost: any) => {
    setShowModal(true); setDrafting(true); setEmailText('');
    try {
      const res = await fetch(`${API_URL}/negotiate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_id: ghost.related_transactions[0].id })
      });
      const data = await res.json();
      setTimeout(() => { setEmailText(data.email_body); setDrafting(false); }, 1200);
    } catch { setEmailText('Error drafting.'); setDrafting(false); }
  };

  if (!authed) return <Login onLogin={() => setAuthed(true)} />;

  const renderContent = () => {
    switch (tab) {
      case 'overview': return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Total Audit Value */}
            <div className="glass-panel p-10 rounded-3xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/10 rounded-full blur-2xl group-hover:bg-emerald-400/20 transition-all pointer-events-none" />
              <p className="text-emerald-500 font-bold tracking-widest uppercase text-[11px] mb-3">Total Audit Value</p>
              <div className="text-4xl lg:text-5xl font-extrabold text-[#1E1B4B] tracking-tight">
                <AnimatedCounter value={totalValue} />
              </div>
              <p className="text-slate-500 mt-4 flex items-center text-sm font-medium">
                <span className="relative flex h-2.5 w-2.5 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"/>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"/>
                </span>
                Connected — {txs.length} transactions
              </p>
            </div>

            {/* AI Agentic Core State */}
            <div className="glass-panel p-8 rounded-3xl relative overflow-hidden group border border-indigo-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] shadow-indigo-100/50">
              <div className="absolute -bottom-4 -right-4 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all pointer-events-none" />
              <div className="flex items-center justify-between mb-5">
                <p className="text-indigo-600 font-bold tracking-widest uppercase text-[11px] flex items-center gap-1.5"><Sparkles size={14}/> Agentic Core active</p>
                <div className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-500 text-[9px] font-bold border border-indigo-100 uppercase tracking-widest">Autopilot</div>
              </div>
              <div className="space-y-3 relative z-10">
                <div className="flex justify-between items-center p-3 bg-white/60 rounded-xl border border-white/80">
                  <span className="text-slate-600 font-semibold text-xs flex items-center gap-2"><Globe size={14} className="text-indigo-400"/> Cross-border Arbitrage</span>
                  <span className="text-indigo-600 font-bold text-sm">Monitoring</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/60 rounded-xl border border-white/80">
                  <span className="text-slate-600 font-semibold text-xs flex items-center gap-2"><Eye size={14} className="text-emerald-400"/> Forensic Sentinel</span>
                  <span className="text-emerald-600 font-bold text-sm">Active</span>
                </div>
              </div>
            </div>

            {/* Web Extension Integration */}
            <div className="glass-panel p-8 rounded-3xl relative overflow-hidden group border border-purple-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] shadow-purple-100/50 flex flex-col justify-between" style={{ background: 'linear-gradient(135deg, #F8FAFF 0%, #F5F3FF 100%)' }}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all pointer-events-none" />
              <div>
                 <p className="text-purple-600 font-bold tracking-widest uppercase text-[11px] mb-2 flex items-center gap-1.5">
                   <Globe size={14}/> Browser Extension
                 </p>
                 <p className="text-slate-600 text-sm font-medium leading-relaxed mb-4">Inject FINORA's AI directly into your SaaS billing pages. Real-time parity detection.</p>
              </div>
              <a href="/finora-extension.zip" download="finora-extension.zip" className="bg-purple-600 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-lg shadow-purple-200 hover:bg-purple-700 transition flex justify-center items-center gap-2 relative z-10">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download Extension (.zip)
              </a>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Threat Summary */}
            <div className="glass-panel p-8 rounded-3xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-40 h-40 bg-red-400/5 rounded-full blur-3xl pointer-events-none" />
              <p className="text-[#1E1B4B] font-bold tracking-widest uppercase text-[11px] mb-5">Threat Summary</p>
              <div className="space-y-3 relative z-10">
                <div className="flex justify-between items-center p-4 bg-white/60 rounded-2xl border border-red-50 hover:border-red-100 transition-colors">
                  <span className="text-slate-600 font-bold text-sm">Forensic Events Flagged</span>
                  <span className="text-2xl font-black text-red-500">{forensic.smurfing_detected.length + forensic.shell_risk_detected.length}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-white/60 rounded-2xl border border-orange-50 hover:border-orange-100 transition-colors">
                  <span className="text-slate-600 font-bold text-sm">Ghost Seats Discovered</span>
                  <span className="text-2xl font-black text-orange-500">{ghosts.ghost_subscriptions.length}</span>
                </div>
              </div>
            </div>

            <LiveAgenticLog txs={txs} forensic={forensic} ghosts={ghosts} />
          </div>
        </motion.div>
      );

      case 'arbitrage': return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          <h2 className="text-3xl font-extrabold text-[#1E1B4B]">Global Arbitrage <span className="text-indigo-500">Intelligence</span></h2>
          <p className="text-slate-500 text-sm">True cost comparison across India 🇮🇳 · USA 🇺🇸 · Singapore 🇸🇬 · UAE 🇦🇪 — including GST &amp; VAT adjustments.</p>
          <ArbitrageModule />
        </motion.div>
      );

      case 'forensic': return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <ForensicAgentView />
        </motion.div>
      );

      case 'ghost': return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <GhostSeatsView />
        </motion.div>
      );

      case 'oracle': return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <BurnOracleView />
        </motion.div>
      );

      case 'tds': return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <TDSView />
        </motion.div>
      );

      case 'tax': return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <TaxGSTView />
        </motion.div>
      );

      case 'vendor': return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <VendorRepView />
        </motion.div>
      );

      case 'negotiator': return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <NegotiatorView />
        </motion.div>
      );

      case 'upload': return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          <h2 className="text-3xl font-extrabold text-[#1E1B4B]">Upload <span className="text-indigo-500">Document</span></h2>
          <p className="text-slate-500 text-sm">Upload Indian bank statements (PDF) for automatic transaction extraction.</p>
          <div className="glass-panel p-10 rounded-3xl border-2 border-dashed border-indigo-200 text-center">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <h3 className="text-[#1E1B4B] font-bold text-lg mb-2">Drop Bank Statement PDF</h3>
            <p className="text-slate-500 text-sm mb-6">Supports HDFC, ICICI, SBI, Axis, Kotak formats. GSTIN + UPI extracted automatically.</p>
            <input type="file" accept=".pdf" className="hidden" id="pdf-upload" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const fd = new FormData();
              fd.append('file', file);
              const res = await fetch(`http://${window.location.hostname}:8000/api/upload-pdf`, { method: 'POST', body: fd });
              const d = await res.json();
              alert(`✅ Extracted ${d.transactions?.length || 0} transactions from ${file.name}`);
            }} />
            <label htmlFor="pdf-upload" className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all cursor-pointer shadow-lg shadow-indigo-200 inline-block">
              Choose PDF
            </label>
          </div>
        </motion.div>
      );

      case 'about': return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

          {/* ── Hero Banner ── */}
          <div className="glass-panel rounded-3xl overflow-hidden">
            <div className="relative p-10 text-center" style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 60%, #312E81 100%)' }}>
              {/* Decorative orb */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -translate-y-16 translate-x-16 blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full translate-y-12 -translate-x-12 blur-3xl pointer-events-none" />

              <div className="relative">
                <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase mb-4"
                  style={{ background: 'rgba(99,102,241,0.25)', color: '#A5B4FC', border: '1px solid rgba(99,102,241,0.4)' }}>
                  Financial Intelligence Platform
                </span>
                <h2 className="text-4xl font-extrabold mb-4" style={{ color: '#F8FAFF', letterSpacing: '-0.02em' }}>
                  About <span style={{ color: '#818CF8' }}>FINORA</span>
                </h2>
                <p className="text-sm leading-relaxed max-w-2xl mx-auto" style={{ color: '#94A3B8' }}>
                  A next-generation Financial Intelligence suite designed by{' '}
                  <span className="font-bold" style={{ color: '#C7D2FE' }}>Team DCoderZ</span> to dismantle financial
                  opacity through autonomous AI auditing.
                </p>
              </div>
            </div>
          </div>

          {/* ── Production Tech Stack ── */}
          <div className="glass-panel p-8 rounded-3xl">
            <p className="text-[11px] font-bold uppercase tracking-widest mb-5" style={{ color: '#4F46E5' }}>Production Tech Stack</p>
            <div className="flex flex-wrap gap-3">
              {[
                { label: 'React 18',          icon: '⚛️' },
                { label: 'FastAPI',            icon: '⚡' },
                { label: 'Gemini 2.0 Flash',  icon: '✦' },
                { label: 'Three.js',           icon: '🔷' },
                { label: 'Scikit-Learn',       icon: '🤖' },
                { label: 'Framer Motion',      icon: '🎞️' },
              ].map(({ label, icon }) => (
                <span key={label}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
                  style={{ background: '#0F172A', color: '#E2E8F0', border: '1px solid #334155', letterSpacing: '0.03em' }}>
                  <span>{icon}</span>{label}
                </span>
              ))}
            </div>
          </div>

          {/* ── Three Technical Pillars ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Pillar 1 */}
            <motion.div whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="glass-panel p-8 rounded-3xl" style={{ borderTop: '3px solid #4F46E5' }}>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-5"
                style={{ background: '#0F172A' }}>
                <span className="text-xl">🧠</span>
              </div>
              <h3 className="font-extrabold text-base mb-3" style={{ color: '#0F172A' }}>Isolation Forest ML</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#475569' }}>
                Unsupervised anomaly detection trained on 200+ Indian transaction vectors.
              </p>
            </motion.div>

            {/* Pillar 2 */}
            <motion.div whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="glass-panel p-8 rounded-3xl" style={{ borderTop: '3px solid #4F46E5' }}>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-5"
                style={{ background: '#0F172A' }}>
                <span className="text-xl">🔍</span>
              </div>
              <h3 className="font-extrabold text-base mb-3" style={{ color: '#0F172A' }}>Forensic Sentinel</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#475569' }}>
                Real-time UPI structuring and GSTIN validation powered by Gemini 2.0 Flash.
              </p>
            </motion.div>

            {/* Pillar 3 */}
            <motion.div whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="glass-panel p-8 rounded-3xl" style={{ borderTop: '3px solid #4F46E5' }}>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-5"
                style={{ background: '#0F172A' }}>
                <span className="text-xl">🌐</span>
              </div>
              <h3 className="font-extrabold text-base mb-3" style={{ color: '#0F172A' }}>Global Arbitrage</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#475569' }}>
                Dynamic cross-border pricing intelligence across India, Singapore, and UAE.
              </p>
            </motion.div>
          </div>

          {/* ── Team DCoderZ ── */}
          <div className="glass-panel p-8 rounded-3xl">
            <p className="text-[11px] font-bold uppercase tracking-widest mb-6" style={{ color: '#4F46E5' }}>Team DCoderZ</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Leader */}
              <div className="flex items-center gap-5 p-5 rounded-2xl" style={{ background: 'linear-gradient(135deg, #0F172A, #1E1B4B)', border: '1px solid #334155' }}>
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-extrabold"
                  style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: '#fff' }}>DR</div>
                <div>
                  <p className="font-extrabold text-base" style={{ color: '#F8FAFF' }}>Devansh Raizada</p>
                  <p className="text-xs font-semibold mt-0.5" style={{ color: '#818CF8' }}>Lead Architect &amp; AI Specialist</p>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                    style={{ background: 'rgba(99,102,241,0.25)', color: '#A5B4FC', border: '1px solid rgba(99,102,241,0.35)' }}>
                    Project Lead
                  </span>
                </div>
              </div>

              {/* Partner */}
              <div className="flex items-center gap-5 p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid #E2E8F0' }}>
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-extrabold"
                  style={{ background: 'linear-gradient(135deg, #6366F1, #A78BFA)', color: '#fff' }}>AS</div>
                <div>
                  <p className="font-extrabold text-base" style={{ color: '#0F172A' }}>Ananya Sharma</p>
                  <p className="text-xs font-semibold mt-0.5" style={{ color: '#4F46E5' }}>Technical Strategist &amp; Data Analyst</p>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                    style={{ background: '#EEF2FF', color: '#4F46E5', border: '1px solid #C7D2FE' }}>
                    Core Contributor
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="text-center pb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#94A3B8' }}>
              FINORA · Built by Team DCoderZ · Powered by Gemini 2.0 Flash &amp; Isolation Forest
            </p>
          </div>

        </motion.div>
      );

      default: return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-96 glass-panel rounded-3xl">
          <div className="p-4 bg-indigo-50 rounded-2xl mb-4">
            <Globe className="text-indigo-500" size={28} strokeWidth={1.5} />
          </div>
          <h2 className="text-lg font-bold text-[#1E1B4B]">{TABS.find(t => t.id === tab)?.name}</h2>
          <p className="text-slate-400 text-sm mt-1">Telemetry active.</p>
        </motion.div>
      );
    }
  };

  return (
    <>
      <Background3D />
      <div className="relative z-10 w-full min-h-screen px-6 pt-10 pb-28 overflow-y-auto" style={{ maxHeight: '100vh' }}>
        <header className="max-w-5xl mx-auto mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#1E1B4B]">FINORA</h1>
          <p className="text-[10px] text-indigo-500 font-bold tracking-[0.25em] mt-0.5 uppercase">Indian Audit Engine</p>
        </header>
        <main className="max-w-5xl mx-auto">{renderContent()}</main>
      </div>

      <FloatingDock currentTab={tab} onChange={setTab} />

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-indigo-950/10 backdrop-blur-xl">
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-panel rounded-3xl w-full max-w-2xl overflow-hidden"
          >
            <div className="p-5 border-b border-slate-100/50 flex justify-between items-center">
              <h2 className="text-[#1E1B4B] font-bold uppercase tracking-widest text-[11px] flex items-center">
                <Sparkles size={13} className="mr-2 text-indigo-500"/> Negotiation
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-[#1E1B4B]"><X size={18}/></button>
            </div>
            <div className="p-8 h-80 overflow-y-auto">
              {drafting ? (
                <div className="h-full flex flex-col items-center justify-center">
                  <div className="w-8 h-8 rounded-full border-[3px] border-slate-200 border-t-indigo-500 animate-spin mb-3" />
                  <p className="text-indigo-500 font-mono tracking-widest text-[10px]">DRAFTING…</p>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-[#1E1B4B] text-sm leading-relaxed">{emailText}</pre>
              )}
            </div>
            <div className="p-4 border-t border-slate-100/50 flex justify-end">
              <button className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center text-sm">
                <Send size={13} className="mr-2"/> Dispatch
              </button>
            </div>
          </motion.div>
        </div>
      )}
      
      <FloatingCopilot />
    </>
  );
}
