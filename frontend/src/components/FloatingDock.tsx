import { useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { 
  Activity, ShieldAlert, Ghost, TrendingUp, Upload, 
  FileText, Sparkles, Database, Users, Globe, Info
} from 'lucide-react';

export const TABS = [
  { id: 'overview', name: 'Command Center', icon: Activity },
  { id: 'forensic', name: 'Forensic Agent', icon: ShieldAlert },
  { id: 'ghost', name: 'Ghost Seats', icon: Ghost },
  { id: 'oracle', name: 'Burn Oracle', icon: TrendingUp },
  { id: 'upload', name: 'Upload', icon: Upload },
  { id: 'tds', name: '26AS / TDS', icon: FileText },
  { id: 'negotiator', name: 'Negotiator', icon: Sparkles },
  { id: 'tax', name: 'Tax & GST', icon: Database },
  { id: 'vendor', name: 'Vendor Rep', icon: Users },
  { id: 'arbitrage', name: 'Arbitrage', icon: Globe },
  { id: 'about', name: 'About Finora', icon: Info },
];

function DockIcon({ tab, mouseX, isActive, onClick }: any) {
  const ref = useRef<HTMLButtonElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  
  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  // Apple-style magnification: icons grow smoothly based on proximity
  const size = useTransform(distance, [-120, 0, 120], [40, 62, 40]);
  const springSize = useSpring(size, { mass: 0.1, stiffness: 200, damping: 15 });

  return (
    <div className="relative flex flex-col items-center">
      {/* Tooltip */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            className="absolute -top-9 px-3 py-1 bg-[#1E1B4B]/90 text-white text-[10px] font-semibold tracking-wide rounded-lg pointer-events-none whitespace-nowrap z-[100]"
            style={{ backdropFilter: 'blur(12px)' }}
          >
            {tab.name}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1E1B4B]/90" />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button 
        ref={ref}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileTap={{ scale: 0.85 }}
        style={{ width: springSize, height: springSize }}
        className={`relative flex items-center justify-center rounded-[14px] transition-all duration-150
          ${isActive 
            ? 'bg-white/70 shadow-[0_2px_12px_rgba(99,102,241,0.15)]' 
            : 'bg-transparent hover:bg-white/40'}`}
        onClick={() => onClick(tab.id)}
      >
        <tab.icon 
          className={`w-[45%] h-[45%] transition-colors duration-150 ${isActive ? 'text-indigo-600' : 'text-[#1E1B4B]/60'}`} 
          strokeWidth={isActive ? 2 : 1.5} 
        />
        
        {/* Active dot */}
        {isActive && (
          <motion.div 
            layoutId="dockDot"
            className="absolute -bottom-1 w-[5px] h-[5px] rounded-full bg-indigo-500"
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          />
        )}
      </motion.button>
    </div>
  );
}

export default function FloatingDock({ currentTab, onChange }: { currentTab: string, onChange: (id: string) => void }) {
  const mouseX = useMotionValue(Infinity);

  return (
    <div className="fixed bottom-5 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <motion.div 
        onMouseMove={(e) => mouseX.set(e.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className="glass-dock flex items-end gap-1 px-3 py-2 rounded-[22px] pointer-events-auto"
      >
        {TABS.map((tab) => (
          <DockIcon 
            key={tab.id} 
            tab={tab} 
            mouseX={mouseX} 
            isActive={currentTab === tab.id} 
            onClick={onChange} 
          />
        ))}
      </motion.div>
    </div>
  );
}
