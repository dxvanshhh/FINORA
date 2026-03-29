import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, ArrowRight, Landmark } from 'lucide-react';
import Background3D from '../components/Background3D';

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin();
  };

  return (
    <>
      <Background3D />
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">

        <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-[#1E1B4B]">FINORA</h1>
          <p className="text-[10px] text-indigo-500 font-bold tracking-[0.25em] mt-1 uppercase">Indian Audit Engine</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel w-full max-w-sm p-8 rounded-3xl"
        >
          <div className="flex items-center justify-center mb-2">
            <Shield size={20} className="text-indigo-500 mr-2" strokeWidth={2} />
            <h2 className="text-[#1E1B4B] text-lg font-bold">Secure Audit Portal</h2>
          </div>
          <p className="text-slate-400 text-xs text-center mb-6">Authorized personnel only</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 ml-0.5 uppercase tracking-wider">Corporate Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/60 border border-white/70 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none rounded-xl px-4 py-3 text-sm font-medium text-[#1E1B4B] transition-all"
                placeholder="analyst@finora.in" required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 ml-0.5 uppercase tracking-wider">Password</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/60 border border-white/70 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none rounded-xl px-4 py-3 text-sm font-medium text-[#1E1B4B] transition-all"
                placeholder="••••••••" required
              />
            </div>

            <button type="submit" className="mt-2 w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors flex justify-center items-center">
              Authenticate <Shield size={15} className="ml-2" strokeWidth={2.5}/>
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[10px] font-bold text-slate-400 uppercase">or</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* SSO Button */}
          <button onClick={onLogin} className="w-full bg-white/70 text-[#1E1B4B] border border-white/80 font-semibold py-3 rounded-xl hover:bg-white/90 transition-colors flex justify-center items-center text-sm mb-3">
            Sign in with SSO <ArrowRight size={15} className="ml-2 text-slate-400" />
          </button>

          {/* Indian-Specific Login Option */}
          <button onClick={onLogin} className="w-full bg-indigo-50/80 text-indigo-700 border border-indigo-100 font-semibold py-3 rounded-xl hover:bg-indigo-100/80 transition-colors flex justify-center items-center text-sm">
            <Landmark size={15} className="mr-2" strokeWidth={2} /> Login with PAN / GST
          </button>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-8">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Powered by GLA Fintech Lab</p>
        </motion.div>
      </div>
    </>
  );
}
