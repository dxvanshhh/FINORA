import { useEffect, useState } from 'react';
import { X, Send, Sparkles } from 'lucide-react';

export default function GhostFinder() {
  const [data, setData] = useState<{ ghost_subscriptions: any[] }>({ ghost_subscriptions: [] });
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [, setSelectedGhost] = useState<any>(null);
  const [drafting, setDrafting] = useState(false);
  const [emailText, setEmailText] = useState("");
  const [isSent, setIsSent] = useState(false);

  useEffect(() => {
    fetch(`http://${window.location.hostname}:8000/api/ghost-finder/analyze`)
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleOptimizeClick = async (ghost: any) => {
    setSelectedGhost(ghost);
    setShowModal(true);
    setDrafting(true);
    setEmailText("");
    setIsSent(false);

    try {
      // Pick first transaction ID to represent the ghost subscription
      const txId = ghost.related_transactions[0].id;
      
      const response = await fetch(`http://${window.location.hostname}:8000/api/negotiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ transaction_id: txId })
      });
      
      const payload = await response.json();
      
      // Artificial slight delay for effect
      setTimeout(() => {
        setEmailText(payload.email_body);
        setDrafting(false);
      }, 1500);

    } catch (err) {
      console.error(err);
      setEmailText("Error drafting email.");
      setDrafting(false);
    }
  };

  const handleSend = () => {
    setIsSent(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <header>
        <h1 className="text-3xl font-light text-white tracking-wide">Ghost Finder</h1>
        <p className="text-slate-400 mt-2">Autonomous detection of unused and abandoned recurring subscriptions.</p>
      </header>

      {loading ? (
        <div className="text-finora-gold animate-pulse">Scanning ledgers...</div>
      ) : (
        <div className="space-y-6">
          {data.ghost_subscriptions.map((ghost, idx) => (
            <div key={idx} className="bg-finora-slate border border-slate-700 rounded-xl p-6 shadow-xl relative overflow-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center transition-all hover:border-finora-gold/30">
              <div className="absolute top-0 left-0 w-2 h-full bg-red-500/80"></div>
              <div className="flex-1 pl-4">
                <h3 className="text-xl font-bold text-white mb-1">{ghost.vendor_name}</h3>
                <p className="text-finora-gold text-xs font-bold uppercase tracking-wider">{ghost.pattern}</p>
                <p className="text-slate-400 mt-2 text-sm max-w-lg">{ghost.reason}</p>
              </div>
              <div className="mt-4 sm:mt-0 sm:text-right flex flex-col items-start sm:items-end w-full sm:w-auto">
                <div className="text-2xl font-bold text-red-400 capitalize whitespace-nowrap">
                  Wasted: ${ghost.total_wasted.toFixed(2)}
                </div>
                <div className="text-slate-500 text-sm mt-1 mb-4">{ghost.months_unused} Months Unused</div>
                
                <button 
                  onClick={() => handleOptimizeClick(ghost)}
                  className="bg-finora-gold hover:bg-yellow-500 text-finora-dark font-bold py-2 px-6 rounded-lg transition-transform hover:scale-105 flex items-center shrink-0 shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                >
                  <Sparkles size={16} className="mr-2" />
                  Optimize
                </button>
              </div>
            </div>
          ))}
          {data.ghost_subscriptions.length === 0 && (
            <div className="text-slate-500 text-center py-10">No ghost subscriptions detected.</div>
          )}
        </div>
      )}

      {/* Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-[#0F172A] border border-finora-gold/30 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center">
              <h2 className="text-finora-gold text-lg font-bold tracking-wider flex items-center">
                <Sparkles size={20} className="mr-2" />
                FINORA Strategic Negotiation
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 h-[400px] overflow-y-auto custom-scrollbar">
              {drafting ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <div className="w-10 h-10 border-4 border-finora-gold border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-finora-gold animate-pulse text-lg tracking-widest uppercase">Drafting...</p>
                  <p className="text-slate-500 text-sm">Synthesizing telemetry data into executive correspondence</p>
                </div>
              ) : (
                <div className="bg-slate-900/50 p-6 rounded-lg text-slate-300 whitespace-pre-wrap font-mono text-sm leading-relaxed border border-slate-800 shadow-inner">
                  {emailText}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex justify-end">
              <button 
                disabled={drafting || isSent}
                onClick={handleSend}         
                className={`font-bold py-3 px-8 rounded-lg shadow-lg flex items-center transition-all ${
                  drafting 
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50'
                    : isSent 
                      ? 'bg-emerald-600 text-white shadow-[0_0_20px_rgba(52,211,153,0.5)] cursor-default'
                      : 'bg-finora-gold hover:bg-yellow-500 text-finora-dark hover:scale-105 shadow-[0_0_20px_rgba(212,175,55,0.4)]'
                }`}
              >
                {isSent ? (
                  <>Negotiation Initiated</>
                ) : (
                  <>
                    <Send size={18} className="mr-2" />
                    Send to Vendor
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
