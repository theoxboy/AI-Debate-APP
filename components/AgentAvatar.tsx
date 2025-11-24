import React from 'react';
import { AgentConfig, AgentStatus } from '../types';
import { Mic, Volume2, AlertCircle, Brain, Radio, Globe, Calculator, BookOpen } from 'lucide-react';

interface AgentAvatarProps {
  config: AgentConfig;
  status: AgentStatus;
  volume: number;
  isSessionActive?: boolean;
  thinkingProcess?: string;
  totalScore?: number;
}

export const AgentAvatar: React.FC<AgentAvatarProps> = ({ 
  config, 
  status, 
  volume, 
  isSessionActive = false,
  thinkingProcess = "",
  totalScore = 0
}) => {
  // Normalize volume for visual scale (0 to 255 -> 1.0 to 1.3)
  const scale = status === AgentStatus.SPEAKING ? 1 + (volume / 255) * 0.4 : 1;
  
  const isSpeaking = status === AgentStatus.SPEAKING;
  const isThinking = status === AgentStatus.THINKING;
  const isError = status === AgentStatus.ERROR;
  const isListening = status === AgentStatus.IDLE && isSessionActive;

  // Dynamic colors
  const mainColor = isError ? '#ef4444' : config.color;

  return (
    <div className="flex flex-col items-center justify-center p-6 relative w-full">
      
      {/* Score Badge */}
      <div className="absolute top-0 right-0 md:right-10 px-3 py-1 bg-white/5 border border-white/10 rounded-lg backdrop-blur-md flex flex-col items-center">
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Fact Points</span>
        <span className="text-lg font-mono font-bold" style={{ color: config.color }}>{totalScore}</span>
      </div>

      {/* Container for the avatar with a float animation */}
      <div className={`relative transition-all duration-500 ${isSpeaking ? 'z-20 scale-110' : 'z-10'}`}>
        
        {/* SPEAKING: Multiple expanding organic ripples */}
        {isSpeaking && (
          <>
            <div 
              className="absolute inset-0 rounded-full opacity-40 animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]"
              style={{ backgroundColor: mainColor, animationDelay: '0s' }}
            />
            <div 
              className="absolute inset-0 rounded-full opacity-30 animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]"
              style={{ backgroundColor: mainColor, animationDelay: '0.4s' }}
            />
             <div 
              className="absolute inset-0 rounded-full opacity-20 animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]"
              style={{ backgroundColor: mainColor, animationDelay: '0.8s' }}
            />
          </>
        )}

        {/* THINKING: Rotating gradient ring + Pulse */}
        {isThinking && (
           <>
            <div className="absolute -inset-4 rounded-full opacity-40 animate-spin"
                style={{ 
                    background: `conic-gradient(from 0deg, transparent, ${mainColor}, transparent)`,
                    animationDuration: '2s'
                }}
            />
            <div className="absolute -inset-1 rounded-full opacity-30 animate-pulse"
                 style={{ backgroundColor: mainColor }}
            />
            
            {/* Thinking Step Overlay */}
            <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-48 text-center animate-in slide-in-from-bottom-2 fade-in">
                <div className="flex items-center justify-center gap-2 text-xs font-mono text-cyan-300 bg-black/40 px-2 py-1 rounded backdrop-blur-sm border border-cyan-500/30 whitespace-nowrap">
                    {thinkingProcess.includes('Search') ? <Globe className="w-3 h-3 animate-spin" /> : 
                     thinkingProcess.includes('Calculat') ? <Calculator className="w-3 h-3" /> :
                     <Brain className="w-3 h-3 animate-pulse" />}
                    {thinkingProcess}
                </div>
            </div>
          </>
        )}

        {/* LISTENING: Subtle breathing glow */}
        {isListening && (
           <div 
             className="absolute -inset-1 rounded-full opacity-20 animate-pulse"
             style={{ backgroundColor: mainColor, animationDuration: '3s' }}
           />
        )}

        {/* ERROR: Sharp pulse */}
        {isError && (
            <div className="absolute -inset-4 rounded-full bg-red-500/30 animate-ping" />
        )}
        
        {/* Main Avatar Circle */}
        <div 
          className="relative z-10 w-36 h-36 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-sm"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            border: `2px solid ${isSpeaking ? mainColor : 'rgba(255,255,255,0.1)'}`,
            transform: `scale(${scale})`,
            boxShadow: isSpeaking 
                ? `0 0 50px ${mainColor}55, inset 0 0 20px ${mainColor}22` 
                : '0 20px 40px -10px rgba(0, 0, 0, 0.6)'
          }}
        >
          {/* Inner Icon */}
          <div className="transition-all duration-300 transform">
            {isError ? (
                <AlertCircle className="w-16 h-16 text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
            ) : isSpeaking ? (
                <Volume2 
                    className="w-16 h-16 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" 
                    style={{ filter: `drop-shadow(0 0 10px ${mainColor})` }}
                />
            ) : isThinking ? (
                <Brain className="w-14 h-14 text-slate-300 animate-pulse opacity-80" />
            ) : isListening ? (
                <Radio className="w-14 h-14 text-slate-500 animate-[pulse_4s_infinite]" />
            ) : (
                <Mic className="w-14 h-14 text-slate-700" />
            )}
          </div>
        </div>
        
        {/* Status Indicator Dot (Floating) */}
        <div className="absolute top-1 right-1 transform translate-x-2 -translate-y-2 z-20">
            <span className={`flex h-5 w-5 relative`}>
                {(isSpeaking || isThinking || isListening) && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: mainColor }}></span>
                )}
                <span className="relative inline-flex rounded-full h-5 w-5 border-2 border-slate-900 shadow-lg" style={{ backgroundColor: status === AgentStatus.IDLE && !isSessionActive ? '#334155' : mainColor }}></span>
            </span>
        </div>
      </div>

      {/* Text Labels */}
      <div className="mt-8 text-center space-y-2 z-10">
        <h2 className="text-3xl font-bold tracking-tight text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
            {config.name}
        </h2>
        <div className="flex items-center justify-center">
            <span 
                className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.25em] font-bold border ${
                    isError ? 'border-red-500/30 text-red-400 bg-red-500/10' : 
                    isSpeaking ? 'border-white/20 text-white bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)]' :
                    'border-transparent text-slate-500'
                }`}
            >
                {status === AgentStatus.IDLE && isSessionActive ? 'Listening' : status}
            </span>
        </div>
      </div>
    </div>
  );
};