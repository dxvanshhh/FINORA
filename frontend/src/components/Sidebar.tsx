import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Search, 
  Ghost, 
  Handshake, 
  ShieldAlert, 
  Landmark, 
  Flame, 
  Users, 
  CheckSquare, 
  Leaf, 
  Globe 
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/smart-sorter', label: 'Smart Sorter', icon: Search },
  { path: '/ghost-finder', label: 'Ghost Finder', icon: Ghost },
  { path: '/negotiator', label: 'Negotiator', icon: Handshake },
  { path: '/forensic-agent', label: 'Forensic Agent', icon: ShieldAlert },
  { path: '/tax-compliance', label: 'Tax Compliance', icon: Landmark },
  { path: '/burn-oracle', label: 'Burn Oracle', icon: Flame },
  { path: '/vendor-rep', label: 'Vendor Rep', icon: Users },
  { path: '/trust-approvals', label: 'Trust Approvals', icon: CheckSquare },
  { path: '/esg-tracker', label: 'ESG Tracker', icon: Leaf },
  { path: '/global-arbitrage', label: 'Global Arbitrage', icon: Globe },
];

export const Sidebar = () => {
  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 h-screen flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-2xl font-bold flex items-center text-finora-gold tracking-widest uppercase">
          FINORA
        </h1>
        <p className="text-xs text-slate-500 mt-1">Autonomous Engine</p>
      </div>
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-finora-gold/10 text-finora-gold border border-finora-gold/20' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`
            }
          >
            <item.icon size={20} />
            <span className="font-medium text-sm">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-slate-800 text-xs text-slate-600 text-center">
        Engine Version 1.0.0
      </div>
    </div>
  );
};
