import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ShieldAlert, Ghost, Activity } from 'lucide-react';

export default function Dashboard() {
  const [burnData, setBurnData] = useState<any[]>([]);
  const [savingsData, setSavingsData] = useState<any[]>([]);
  const [forensicData, setForensicData] = useState<{ smurfing_detected: any[], shell_risk_detected: any[] }>({ smurfing_detected: [], shell_risk_detected: [] });
  const [ghostData, setGhostData] = useState<{ ghost_subscriptions: any[] }>({ ghost_subscriptions: [] });
  
  useEffect(() => {
    fetch(`http://${window.location.hostname}:8000/api/burn-oracle/burn-rate`)
      .then(res => res.json())
      .then(data => setBurnData(data.chart_data))
      .catch(err => console.error(err));
      
    fetch(`http://${window.location.hostname}:8000/api/negotiator/savings`)
      .then(res => res.json())
      .then(data => setSavingsData(data.chart_data))
      .catch(err => console.error(err));
      
    fetch(`http://${window.location.hostname}:8000/api/forensic-agent/analyze`)
      .then(res => res.json())
      .then(data => setForensicData(data))
      .catch(err => console.error(err));
      
    fetch(`http://${window.location.hostname}:8000/api/ghost-finder/analyze`)
      .then(res => res.json())
      .then(data => setGhostData(data))
      .catch(err => console.error(err));
  }, []);

  const totalGhostWaste = ghostData.ghost_subscriptions.reduce((acc, sub) => acc + sub.total_wasted, 0);

  return (
    <div className="p-8 space-y-8">
      <header>
        <h1 className="text-3xl font-light text-white tracking-wide">Command Center</h1>
        <p className="text-slate-400 mt-2">Executive overview of financial telemetry.</p>
      </header>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Forensic Alerts Widget */}
        <div className="lg:col-span-2 bg-finora-slate p-6 rounded-xl border border-red-900/50 shadow-xl overflow-hidden">
          <h2 className="text-lg text-red-500 font-medium mb-4 uppercase tracking-wider flex items-center">
            <ShieldAlert size={20} className="mr-2" />
            Active Forensic Alerts
          </h2>
          <div className="space-y-4 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            {forensicData.smurfing_detected.map((alert, idx) => (
              <div key={`smurf-${idx}`} className="flex items-center justify-between bg-[#0F172A] p-4 rounded-lg border border-red-500/20">
                <div className="flex items-center flex-1">
                  <div className="relative flex h-3 w-3 mr-4 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </div>
                  <div>
                    <div className="font-bold text-slate-200">{alert.vendor_name}</div>
                    <div className="text-xs text-red-400 uppercase tracking-wider">{alert.pattern}</div>
                  </div>
                </div>
                <div className="text-sm text-slate-400 flex items-center justify-end w-1/2">
                  <Activity size={16} className="mr-2 text-red-500 shrink-0" />
                  <span className="truncate">{alert.reason}</span>
                </div>
              </div>
            ))}
            {forensicData.shell_risk_detected.slice(0, 3).map((alert, idx) => (
              <div key={`shell-${idx}`} className="flex items-center justify-between bg-[#0F172A] p-4 rounded-lg border border-yellow-500/20">
                <div className="flex flex-col flex-1 pl-7">
                    <div className="font-bold text-slate-200">{alert.vendor_name}</div>
                    <div className="text-xs text-yellow-500 uppercase tracking-wider">{alert.pattern}</div>
                </div>
                <div className="text-sm text-slate-400 text-right">
                  {alert.reason}
                </div>
              </div>
            ))}
            {!forensicData.smurfing_detected.length && !forensicData.shell_risk_detected.length && (
              <div className="text-slate-500 italic p-4 text-center">No active forensic threats detected.</div>
            )}
          </div>
        </div>

        {/* Savings Opportunity Widget */}
        <div className="bg-finora-slate p-6 rounded-xl border border-finora-gold/30 shadow-xl flex flex-col justify-center items-center text-center">
          <div className="w-16 h-16 rounded-full bg-finora-gold/10 flex items-center justify-center mb-4 text-finora-gold">
            <Ghost size={32} />
          </div>
          <h2 className="text-lg text-finora-gold font-medium mb-1 uppercase tracking-wider">Savings Opportunity</h2>
          <p className="text-slate-400 text-sm mb-4">Total detected waste from unused subscriptions (Ghost Seats)</p>
          <div className="text-4xl font-light text-white tracking-widest">
            ${totalGhostWaste.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Burn Rate Chart */}
        <div className="bg-finora-slate p-6 rounded-xl border border-slate-700 shadow-xl">
          <h2 className="text-lg text-finora-gold font-medium mb-4 uppercase tracking-wider">Burn Oracle (Burn Rate)</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={burnData}>
                <XAxis dataKey="week" stroke="#64748b" tick={{fill: '#94a3b8'}} />
                <YAxis stroke="#64748b" tick={{fill: '#94a3b8'}} tickFormatter={(val) => `$${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}
                  itemStyle={{ color: '#d4af37' }}
                />
                <Line type="monotone" dataKey="burn" stroke="#d4af37" strokeWidth={3} dot={{r: 4, fill: '#0f172a', stroke: '#d4af37'}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Savings Chart */}
        <div className="bg-finora-slate p-6 rounded-xl border border-slate-700 shadow-xl">
          <h2 className="text-lg text-finora-gold font-medium mb-4 uppercase tracking-wider">Negotiator (Savings YTD)</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={savingsData}>
                <XAxis dataKey="month" stroke="#64748b" tick={{fill: '#94a3b8'}} />
                <YAxis stroke="#64748b" tick={{fill: '#94a3b8'}} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}
                  itemStyle={{ color: '#6366f1' }}
                  cursor={{fill: '#1e293b'}}
                />
                <Bar dataKey="savings" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
