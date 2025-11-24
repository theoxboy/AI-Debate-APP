import React from 'react';
import { Activity, Flame, Trophy } from 'lucide-react';

interface DebateMeterProps {
  score: number; // Kept for interface compatibility, represents momentum
  agentAColor: string;
  agentBColor: string;
  agentAName: string;
  agentBName: string;
  agentAScore: number;
  agentBScore: number;
}

export const DebateMeter: React.FC<DebateMeterProps> = ({ 
  agentAColor, 
  agentBColor,
  agentAName,
  agentBName,
  agentAScore,
  agentBScore
}) => {
  // Calculate total accumulated points
  const total = agentAScore + agentBScore;
  const safeTotal = total === 0 ? 1 : total;
  
  // Calculate percentage share for each agent
  const percentA = total === 0 ? 50 : (agentAScore / safeTotal) * 100;
  const percentB = total === 0 ? 50 : (agentBScore / safeTotal) * 100;

  // Identify the leader based on accumulated points
  const leader = agentAScore > agentBScore ? agentAName : agentBScore > agentAScore ? agentBName : "Tie";
  const leaderColor = leader === agentAName ? agentAColor : leader === agentBName ? agentBColor : '#94a3b8';

  return (
    <div className="w-full flex flex-col justify-center relative z-20 px-2 md:px-0 select-none">
      
      {/* Header Info */}
      <div className="flex items-center justify-between mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 text-indigo-400 animate-pulse" />
            <span>Fact Accumulation</span>
        </div>
        <div className="flex items-center gap-1">
             <Trophy className={`w-3 h-3 ${leader !== 'Tie' ? 'text-yellow-500' : 'text-slate-600'}`} />
             <span>Leader: <span style={{ color: leaderColor }}>{leader}</span></span>
        </div>
      </div>

      {/* Main Split Bar Container */}
      <div className="relative w-full h-8 bg-slate-900/80 rounded-full border border-white/10 backdrop-blur-md overflow-hidden flex shadow-[0_0_20px_rgba(0,0,0,0.6)]">
         
         {/* Agent A Section (Left) */}
         <div 
            className="h-full relative transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex items-center justify-start overflow-hidden"
            style={{ 
                width: `${percentA}%`,
                background: `linear-gradient(90deg, ${agentAColor}20, ${agentAColor})`,
                boxShadow: `inset -5px 0 15px -5px ${agentAColor}`
            }}
         >
             {/* Text Label Inside Bar */}
             <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black tracking-widest text-white/90 drop-shadow-md z-10 flex items-center gap-2 whitespace-nowrap opacity-80">
                 {percentA > 15 && (
                    <>
                        <Flame className={`w-3 h-3 ${percentA > 50 ? 'fill-current text-white' : ''}`} />
                        {Math.round(percentA)}%
                    </>
                 )}
             </div>

             {/* Animated Plasma Effect */}
             <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-40 mix-blend-overlay" />
             <div className="absolute inset-0 animate-[shimmer_3s_infinite]" 
                  style={{ background: `linear-gradient(90deg, transparent, ${agentAColor}66, transparent)` }} />
         </div>

         {/* The Clash Line (Center Divider) */}
         <div className="w-0.5 h-full bg-white/90 z-20 shadow-[0_0_15px_4px_rgba(255,255,255,0.5)] relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-8 bg-white/30 blur-lg rounded-full animate-pulse" />
         </div>

         {/* Agent B Section (Right) */}
         <div 
            className="h-full relative transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex items-center justify-end overflow-hidden"
            style={{ 
                width: `${percentB}%`,
                background: `linear-gradient(270deg, ${agentBColor}20, ${agentBColor})`,
                boxShadow: `inset 5px 0 15px -5px ${agentBColor}`
            }}
         >
             {/* Text Label Inside Bar */}
             <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black tracking-widest text-white/90 drop-shadow-md z-10 flex items-center gap-2 whitespace-nowrap opacity-80">
                 {percentB > 15 && (
                    <>
                        {Math.round(percentB)}%
                        <Flame className={`w-3 h-3 ${percentB > 50 ? 'fill-current text-white' : ''}`} />
                    </>
                 )}
             </div>

             {/* Animated Plasma Effect */}
             <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-40 mix-blend-overlay" />
             <div className="absolute inset-0 animate-[shimmer_3s_infinite_reverse]" 
                  style={{ background: `linear-gradient(90deg, transparent, ${agentBColor}66, transparent)` }} />
         </div>
      </div>

      {/* Detailed Score Stats below */}
      <div className="flex justify-between mt-2 px-1">
         <div className="flex flex-col items-start transition-all">
             <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 opacity-70">{agentAName}</span>
             <span className="text-xl font-mono font-black leading-none tracking-tighter" style={{ color: agentAColor, textShadow: `0 0 20px ${agentAColor}66` }}>
                 {agentAScore}
             </span>
         </div>
         <div className="flex flex-col items-end transition-all">
             <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 opacity-70">{agentBName}</span>
             <span className="text-xl font-mono font-black leading-none tracking-tighter" style={{ color: agentBColor, textShadow: `0 0 20px ${agentBColor}66` }}>
                 {agentBScore}
             </span>
         </div>
      </div>

      <style>{`
        @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
      `}</style>

    </div>
  );
};
