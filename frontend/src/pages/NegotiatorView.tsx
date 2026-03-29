import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Building, RefreshCw } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000/api`
const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

const TEMPLATES = [
  { label: 'Price Reduction', icon: '📉', prompt: 'Draft a price reduction request citing market benchmarks and low usage.' },
  { label: 'SIM Subscription', icon: '📱', prompt: 'Draft an audit query on a suspicious SIM-based recurring charge.' },
  { label: 'GSTIN Clarification', icon: '🏛️', prompt: 'Request GSTIN and invoice compliance certification from vendor.' },
  { label: 'Early Settlement', icon: '💰', prompt: 'Offer 2% early payment discount in exchange for 10% price reduction.' },
  { label: 'Usage Review', icon: '🔍', prompt: 'Initiate a software subscription usage review and right-sizing discussion.' },
];

export default function NegotiatorView() {
  const [txList, setTxList] = useState<any[]>([]);
  const [loadingTxs, setLoadingTxs] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [email, setEmail] = useState('');
  const [generating, setGenerating] = useState(false);

  const loadTxs = async () => {
    setLoadingTxs(true);
    const txs = await fetch(`${API}/transactions`).then(r => r.json()).catch(() => []);
    setTxList(txs.slice(0, 30));
    setLoadingTxs(false);
  };

  const generate = async (tx: any) => {
    setSelectedTx(tx);
    setEmail('');
    setGenerating(true);
    const res = await fetch(`${API}/negotiate/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction_id: tx.id }),
    });
    const d = await res.json();
    setEmail(d.email_body || d.detail || 'Error');
    setGenerating(false);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-3xl font-extrabold text-[#1E1B4B]">AI <span className="text-indigo-500">Negotiator</span></h2>
        <p className="text-slate-500 text-sm mt-1">Gemini-powered procurement email engine — context-aware, data-driven</p>
      </div>

      {/* Quick templates */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">Quick Templates</p>
        <div className="flex gap-2 flex-wrap">
          {TEMPLATES.map(t => (
            <button key={t.label} onClick={() => setCustomPrompt(t.prompt)}
              className="glass-panel px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all">
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Transaction picker */}
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Select Transaction</span>
            <button onClick={loadTxs} className="text-indigo-500 hover:text-indigo-700 transition-colors">
              {loadingTxs ? <div className="w-4 h-4 rounded-full border-2 border-indigo-200 border-t-indigo-500 animate-spin" /> : <RefreshCw size={14} />}
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto custom-scrollbar divide-y divide-slate-50">
            {txList.length === 0 && (
              <div className="p-8 text-center">
                <button onClick={loadTxs} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all">
                  Load Transactions
                </button>
              </div>
            )}
            {txList.map((tx: any) => (
              <div key={tx.id} onClick={() => generate(tx)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/60 transition-colors ${selectedTx?.id === tx.id ? 'bg-indigo-50' : ''}`}>
                <Building size={13} className="text-indigo-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1E1B4B] truncate">{tx.vendor_name}</p>
                  <p className="text-[10px] text-slate-400">{tx.category}</p>
                </div>
                <p className="font-bold text-[#1E1B4B] text-sm">{fmt(tx.amount)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Custom prompt */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Custom Instructions</p>
          <textarea
            value={customPrompt}
            onChange={e => setCustomPrompt(e.target.value)}
            placeholder="e.g. 'Ask for a 20% discount citing our 3-year loyalty and recent price benchmarks from similar Indian enterprises...'"
            className="flex-1 min-h-36 w-full bg-white/60 border border-slate-200 rounded-xl p-3 text-sm text-[#1E1B4B] resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 leading-relaxed"
          />
          <button
            onClick={() => selectedTx && generate(selectedTx)}
            disabled={!selectedTx || generating}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200">
            {generating ? <><div className="w-4 h-4 rounded-full border-2 border-indigo-200 border-t-white animate-spin" /> GENERATING…</> :
              <><Sparkles size={14} /> Generate Email</>}
          </button>
        </div>
      </div>

      {/* Output */}
      <AnimatePresence>
        {(email || generating) && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="glass-panel p-6 rounded-2xl border-l-4 border-indigo-500">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Send className="text-indigo-500" size={16} />
                <p className="font-bold text-[#1E1B4B] text-sm">Generated Email</p>
                <span className="text-[9px] bg-indigo-50 border border-indigo-100 text-indigo-400 px-2 py-0.5 rounded-full font-bold">Gemini 2.0 Flash</span>
              </div>
              {email && (
                <button onClick={() => navigator.clipboard.writeText(email)}
                  className="text-[10px] text-indigo-500 font-bold hover:text-indigo-700 glass-panel px-3 py-1 rounded-xl">
                  Copy
                </button>
              )}
            </div>
            {generating ? (
              <div className="flex items-center gap-3 py-6">
                <div className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin" />
                <p className="text-indigo-500 font-mono text-xs animate-pulse">GEMINI IS ANALYZING TRANSACTION DATA…</p>
              </div>
            ) : (
              <pre className="text-[#1E1B4B] text-sm leading-relaxed whitespace-pre-wrap font-sans bg-white/60 p-5 rounded-xl max-h-96 overflow-y-auto custom-scrollbar">
                {email}
              </pre>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


