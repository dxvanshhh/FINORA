import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Zap, AlertTriangle, Shield, RefreshCw, ChevronRight } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000/api`

// ─── Risk colour helper ────────────────────────────────────────────────────────
function riskColor(score: number): string {
  if (score < 0.25) return 'bg-emerald-500';
  if (score < 0.50) return 'bg-yellow-400';
  if (score < 0.75) return 'bg-orange-500';
  return 'bg-red-600';
}
function riskTextColor(score: number): string {
  if (score < 0.25) return 'text-emerald-600';
  if (score < 0.50) return 'text-yellow-600';
  if (score < 0.75) return 'text-orange-600';
  return 'text-red-600';
}
function riskBg(score: number): string {
  if (score < 0.25) return 'bg-emerald-50 border-emerald-100';
  if (score < 0.50) return 'bg-yellow-50 border-yellow-100';
  if (score < 0.75) return 'bg-orange-50 border-orange-100';
  return 'bg-red-50 border-red-200';
}

// ─── Model Confidence Meter ────────────────────────────────────────────────────
function ConfidenceMeter({ confidence }: { confidence: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    // Animate + add slight fluctuation
    const interval = setInterval(() => {
      const fluctuation = (Math.random() - 0.5) * 0.03;
      setDisplay(Math.min(1, Math.max(0, confidence + fluctuation)));
    }, 800);
    return () => clearInterval(interval);
  }, [confidence]);

  const pct = Math.round(display * 100);
  const hue = Math.round(display * 120); // 0=red, 120=green

  return (
    <div className="glass-panel p-6 rounded-2xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain className="text-indigo-500" size={18} strokeWidth={2} />
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Model Confidence</span>
        </div>
        <motion.span
          key={pct}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          className="text-2xl font-extrabold"
          style={{ color: `hsl(${hue}, 70%, 40%)` }}
        >
          {pct}%
        </motion.span>
      </div>

      {/* Bar */}
      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `hsl(${hue}, 70%, 50%)` }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      <div className="flex justify-between mt-2 text-[10px] font-semibold text-slate-400">
        <span>Untrained</span>
        <span>Isolation Forest (150 trees)</span>
        <span>Expert</span>
      </div>
    </div>
  );
}

// ─── Neural Adaptation Log ─────────────────────────────────────────────────────
function AdaptationLog({ log }: { log: string[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  return (
    <div className="glass-panel rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100/50 flex items-center gap-2">
        <Zap className="text-indigo-500" size={14} strokeWidth={2} />
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Neural Adaptation Log</span>
        <div className="ml-auto relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
        </div>
      </div>
      <div className="h-36 overflow-y-auto custom-scrollbar font-mono text-[11px] bg-[#1E1B4B]/[0.03] p-4 space-y-1">
        {log.length === 0 && (
          <span className="text-slate-400 italic">Awaiting model activity...</span>
        )}
        {log.map((entry, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-indigo-700 leading-snug"
          >
            <span className="text-slate-400">{entry.split(']')[0]}]</span>
            <span> {entry.split(']').slice(1).join(']')}</span>
          </motion.div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// ─── Risk Score Bar ────────────────────────────────────────────────────────────
function RiskBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${riskColor(score)}`}
          initial={{ width: 0 }}
          animate={{ width: `${score * 100}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className={`text-[11px] font-extrabold tabular-nums w-10 text-right ${riskTextColor(score)}`}>
        {(score * 100).toFixed(0)}%
      </span>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ForensicAgentView() {
  const [mlData, setMlData] = useState<any>(null);
  const [logData, setLogData] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [llmResult, setLlmResult] = useState<any>(null);
  const [llmLoading, setLlmLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [mlRes, logRes] = await Promise.all([
        fetch(`${API}/forensic-agent/ml-analyze`).then(r => r.json()),
        fetch(`${API}/forensic-agent/adaptation-log`).then(r => r.json()),
      ]);
      setMlData(mlRes);
      setLogData(logRes.log || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(() => {
      fetch(`${API}/forensic-agent/adaptation-log`)
        .then(r => r.json())
        .then(d => setLogData(d.log || []));
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const handleLlmAnalyze = async (tx: any) => {
    setSelectedTx(tx);
    setLlmResult(null);
    setLlmLoading(true);
    try {
      const res = await fetch(`${API}/forensic-agent/llm-analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_id: tx.id }),
      });
      setLlmResult(await res.json());
    } catch (e) {
      setLlmResult({ error: String(e) });
    } finally {
      setLlmLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  const transactions: any[] = mlData?.transactions || [];
  const highRisk   = transactions.filter(t => t.risk_label === 'High Risk');
  const medRisk    = transactions.filter(t => t.risk_label === 'Medium Risk');
  const confidence = mlData?.model_confidence ?? 0.6;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-[#1E1B4B]">
            Forensic <span className="text-indigo-500">AI Brain</span>
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Isolation Forest · 8 engineered features · Gemini LLM layer
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchAll(); }}
          className="glass-panel p-2.5 rounded-xl hover:bg-white/80 transition-all"
          title="Refresh"
        >
          <RefreshCw size={16} className="text-indigo-500" strokeWidth={2} />
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl text-center">
          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">Scanned</p>
          <p className="text-3xl font-extrabold text-[#1E1B4B]">{mlData?.total_scanned ?? 0}</p>
        </div>
        <div className="glass-panel p-5 rounded-2xl text-center">
          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">High Risk</p>
          <p className="text-3xl font-extrabold text-red-500">{mlData?.high_risk_count ?? 0}</p>
        </div>
        <div className="glass-panel p-5 rounded-2xl text-center">
          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">Medium Risk</p>
          <p className="text-3xl font-extrabold text-orange-500">{mlData?.medium_risk_count ?? 0}</p>
        </div>
      </div>

      {/* Model confidence + log */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ConfidenceMeter confidence={confidence} />
        <AdaptationLog log={logData} />
      </div>

      {/* Risk Map — high risk first */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100/50 flex items-center gap-2">
          <AlertTriangle className="text-red-500" size={16} strokeWidth={2} />
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Risk Map</span>
          <span className="ml-auto text-[10px] text-slate-400 font-semibold">Green → Red gradient by ML risk_score</span>
        </div>
        <div className="max-h-[440px] overflow-y-auto custom-scrollbar divide-y divide-slate-50">
          {[...highRisk, ...medRisk, ...transactions.filter(t => t.risk_label === 'Clean').slice(0, 20)].map((tx, i) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 1) }}
              className={`flex items-center gap-4 px-5 py-3 hover:bg-white/60 transition-colors cursor-pointer ${riskBg(tx.risk_score)} border-l-4`}
              onClick={() => tx.risk_label !== 'Clean' && handleLlmAnalyze(tx)}
            >
              {/* Dot */}
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${riskColor(tx.risk_score)}`} />

              {/* Vendor */}
              <div className="flex-1 min-w-0">
                <p className="text-[#1E1B4B] font-semibold text-sm truncate">{tx.vendor_name}</p>
                <p className="text-slate-400 text-[10px] font-mono truncate">{tx.upi_vpa || 'no VPA'}</p>
              </div>

              {/* Amount */}
              <span className="text-[#1E1B4B] font-bold text-sm w-28 text-right tabular-nums">
                ₹{Number(tx.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>

              {/* Risk bar */}
              <div className="w-40 flex-shrink-0">
                <RiskBar score={tx.risk_score} />
              </div>

              {/* Label */}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${riskBg(tx.risk_score)} ${riskTextColor(tx.risk_score)} w-24 text-center flex-shrink-0`}>
                {tx.flaw_type || tx.risk_label}
              </span>

              {tx.risk_label !== 'Clean' && (
                <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* LLM Deep Analysis Panel */}
      <AnimatePresence>
        {selectedTx && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="glass-panel p-6 rounded-2xl border-l-4 border-indigo-500"
          >
            <div className="flex items-center gap-2 mb-4">
              <Shield className="text-indigo-500" size={18} strokeWidth={2} />
              <h3 className="font-bold text-[#1E1B4B] text-sm uppercase tracking-widest">Gemini Forensic Analysis</h3>
              <span className="ml-auto text-[9px] bg-indigo-50 text-indigo-400 border border-indigo-100 px-2 py-0.5 rounded-full font-bold">Senior Indian Auditor Prompt</span>
            </div>

            <p className="text-slate-500 text-xs font-mono mb-4 truncate">TX: {selectedTx.id}</p>

            {llmLoading && (
              <div className="flex items-center gap-3 py-4">
                <div className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin" />
                <p className="text-indigo-500 font-mono text-[11px] animate-pulse">GEMINI IS ANALYZING…</p>
              </div>
            )}

            {llmResult && !llmLoading && (
              <div className="space-y-3">
                <div className="flex gap-3 flex-wrap">
                  <div className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${llmResult.confirmed ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                    {llmResult.confirmed ? '⚠️ CONFIRMED' : '✅ CLEARED'}: {llmResult.risk_type}
                  </div>
                  <div className="px-3 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl text-xs font-bold">
                    Confidence: {Math.round((llmResult.confidence || 0) * 100)}%
                  </div>
                </div>
                <p className="text-[#1E1B4B] text-sm leading-relaxed">{llmResult.reasoning}</p>
                {llmResult.new_pattern && llmResult.new_pattern !== 'null' && (
                  <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-xs font-mono text-orange-700">
                    🔴 New pattern added to Flaw Registry: "{llmResult.new_pattern}"
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


