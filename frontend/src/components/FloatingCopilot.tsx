import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Network } from 'lucide-react';

export default function FloatingCopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user'|'system', text: string}[]>([
    { role: 'system', text: 'FINORA Neural Oracle online. How can I assist with your SaaS procurement and tax compliance audits today?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const sendMessage = async () => {
    if (!input.trim() || isTyping) return;
    const msg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setIsTyping(true);

    try {
      const apiBase = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000/api`;
      const res = await fetch(`${apiBase}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
      });
      if (!res.ok) throw new Error('API down');
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'system', text: data.response }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'system', text: 'Error connecting to FINORA core. Connection timed out.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 w-80 md:w-96 h-[500px] z-[99] glass-panel rounded-3xl border border-indigo-200 shadow-2xl overflow-hidden flex flex-col bg-white/90"
          >
            {/* Header */}
            <div className="p-4 border-b border-indigo-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                  <Network size={16} />
                </div>
                <div>
                  <h3 className="text-[#1E1B4B] font-bold text-sm tracking-wide">FINORA Target Oracle</h3>
                  <p className="text-[10px] text-emerald-500 font-bold tracking-wider uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Gemini Online
                  </p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 transition p-1">
                <X size={18} />
              </button>
            </div>

            {/* Chat Area */}
            <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user' 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 rounded-tr-sm' 
                      : 'bg-white border border-indigo-50 text-slate-700 shadow-sm rounded-tl-sm'
                  }`}>
                    {/* Render basic markdown/text */}
                    {m.text.split('\\n').map((line, j) => (
                      <p key={j} className="min-h-[1em]">{line}</p>
                    ))}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-indigo-50 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-3 bg-slate-50 border-t border-indigo-50 pb-4">
              <div className="flex items-center gap-2 bg-white rounded-2xl border border-indigo-100 p-1 pl-4 shadow-inner">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Ask the Oracle..."
                  className="flex-1 bg-transparent border-none outline-none text-sm text-[#1E1B4B] placeholder:text-slate-400"
                />
                <button 
                  onClick={sendMessage}
                  disabled={!input.trim() || isTyping}
                  className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shrink-0"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all z-[100] border border-white/20 ${
          isOpen ? 'bg-indigo-800 rotate-90 scale-90' : 'bg-indigo-600 hover:scale-105 hover:bg-indigo-700 animate-bounce-slow'
        }`}
      >
        {isOpen ? <X className="text-white" size={24} /> : <MessageSquare className="text-white" size={24} />}
      </button>
    </>
  );
}
