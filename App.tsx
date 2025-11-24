
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAgent } from './hooks/useAgent';
import { AgentAvatar } from './components/AgentAvatar';
import { ChatLog } from './components/ChatLog';
import { DebateMeter } from './components/DebateMeter';
import { AgentConfig, ChatMessage, AgentStatus } from './types';
import { MessageSquare, Sparkles, StopCircle, PlayCircle, AlertTriangle, Settings, X, Globe, Smile, Frown, Zap, Skull, Heart, User, Cpu, Key } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

const AGENT_A_BASE: AgentConfig = {
  name: "Nova",
  voice: "Kore",
  color: "#818cf8",
  provider: 'google',
  model: 'gemini-2.5-flash',
  systemInstruction: "You are Nova. You are a competitive debater arguing IN FAVOR of the user's topic. If the topic is a choice (e.g., 'Cats vs Dogs'), argue for the FIRST option. You must use concrete facts, scientific studies, statistics, and logical reasoning to back up your support. Respectfully but firmly dismantle Sage's counter-arguments.",
};

const AGENT_B_BASE: AgentConfig = {
  name: "Sage",
  voice: "Fenrir",
  color: "#fb7185",
  provider: 'google',
  model: 'gemini-2.5-flash',
  systemInstruction: "You are Sage. You are a competitive debater arguing AGAINST the user's topic. If the topic is a choice (e.g., 'Cats vs Dogs'), argue for the SECOND option. You must use historical precedents, risk analysis, counter-facts, and critical thinking to expose flaws in Nova's position. Be skeptical and factual.",
};

const MOODS: Record<string, { label: string; instruction: string; icon: any }> = {
  "Neutral": { label: "Neutral", instruction: "Maintain a professional, objective, and composed tone.", icon: MessageSquare },
  "Happy": { label: "Happy/Optimistic", instruction: "You are in a fantastic mood! Be cheerful, optimistic, and energetic.", icon: Smile },
  "Angry": { label: "Angry", instruction: "You are furious! Speak with intense anger, frustration, and impatience.", icon: Zap },
  "Funny": { label: "Funny/Sarcastic", instruction: "Be hilarious, sarcastic, and witty. Crack jokes, use puns.", icon: Sparkles },
  "Understanding": { label: "Understanding", instruction: "Be deeply empathetic, calm, and understanding.", icon: Heart },
  "Bully": { label: "Bully", instruction: "Act like a bully. Be mean, condescending, and mock your opponent.", icon: Frown },
  "Vulgar": { label: "Vulgar/Rude", instruction: "Use slang, street language, and mild profanity. Be raw and unfiltered.", icon: Skull }
};

const LANGUAGES = ["English", "Spanish", "French", "German", "Italian", "Portuguese", "Chinese", "Japanese", "Korean", "Russian", "Arabic", "Hindi", "Darija Moroccan"];

const AI_PROVIDERS = [
    { id: 'google', name: 'Google Gemini' },
    { id: 'openai', name: 'OpenAI (Compatible)' },
    { id: 'anthropic', name: 'Anthropic' },
    { id: 'custom', name: 'Custom / Local' }
];

const MODELS = {
    google: ['gemini-2.5-flash', 'gemini-3-pro-preview'],
    openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
    anthropic: ['claude-3-5-sonnet-20240620', 'claude-3-opus-20240229'],
    custom: ['llama3', 'mistral', 'custom-model']
};

export default function App() {
  const [topic, setTopic] = useState("Artificial Intelligence: Threat or Savior?");
  const [language, setLanguage] = useState("English");
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  const [debateScore, setDebateScore] = useState(0); 
  const [agentAScore, setAgentAScore] = useState(0);
  const [agentBScore, setAgentBScore] = useState(0);

  // Advanced Agent Config State
  const [agentAData, setAgentAData] = useState({ ...AGENT_A_BASE, mood: "Neutral" });
  const [agentBData, setAgentBData] = useState({ ...AGENT_B_BASE, mood: "Neutral" });

  const [turnDelay, setTurnDelay] = useState(1000);
  const turnDelayRef = useRef(1000);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'agentA' | 'agentB'>('general');

  useEffect(() => { turnDelayRef.current = turnDelay; }, [turnDelay]);
  
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  
  useEffect(() => {
    return () => { if (audioContext && audioContext.state !== 'closed') audioContext.close(); };
  }, [audioContext]);

  // Merge Base Config with Dynamic User Settings
  const agentAConfig = useMemo(() => ({
    ...AGENT_A_BASE,
    ...agentAData,
    systemInstruction: AGENT_A_BASE.systemInstruction
        .replace('Nova', agentAData.name)
        .replace('Sage', agentBData.name) 
        + ` \n\nCURRENT MOOD: ${MOODS[agentAData.mood].instruction}`
  }), [agentAData, agentBData.name]);

  const agentBConfig = useMemo(() => ({
    ...AGENT_B_BASE,
    ...agentBData,
    systemInstruction: AGENT_B_BASE.systemInstruction
        .replace('Sage', agentBData.name)
        .replace('Nova', agentAData.name)
        + ` \n\nCURRENT MOOD: ${MOODS[agentBData.mood].instruction}`
  }), [agentBData, agentAData.name]);

  const agentA = useAgent(agentAConfig, audioContext);
  const agentB = useAgent(agentBConfig, audioContext);
  
  const isLoopRunning = useRef(false);

  const judgeTurn = async (text: string, speaker: string, topic: string) => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Rate argument strength (0-10) by ${speaker} on "${topic}": "${text}". Output NUMBER only.`;
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        const rating = parseInt(response.text?.trim() || "5", 10) || 5;
        
        if (speaker === agentAData.name) setAgentAScore(p => p + rating);
        else setAgentBScore(p => p + rating);

        setDebateScore(prev => {
            const shift = rating * 3; 
            const newScore = speaker === agentAData.name ? prev - shift : prev + shift;
            return Math.max(-100, Math.min(100, newScore));
        });
    } catch (e: any) {
        // Silently fail on rate limits to prevent loop interruption
        if (!e.message?.includes('429')) console.error("Judging failed", e);
    }
  };

  const startConversation = async () => {
    if (!topic.trim()) { setIsSettingsOpen(true); return; }
    setError(null);
    setDebateScore(0); setAgentAScore(0); setAgentBScore(0);
    
    let ctx = audioContext;
    try {
        if (!ctx || ctx.state === 'closed') {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            ctx = new AudioContextClass();
            setAudioContext(ctx);
        }
        if (ctx.state === 'suspended') await ctx.resume();
        // Wake up audio
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0.01; 
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + 0.1);
    } catch (e: any) {
        setError(`Audio Error: ${e.message}`); return;
    }

    setIsSessionActive(true);
    setMessages([]);
    isLoopRunning.current = true;

    try {
      let currentHistory: ChatMessage[] = [];
      
      while (isLoopRunning.current) {
        // Agent A
        if (!isLoopRunning.current) break;
        const textA = await agentA.generateText(currentHistory, topic, language);
        const msgA = { id: Date.now().toString(), sender: agentAData.name, text: textA, timestamp: Date.now() };
        setMessages(prev => [...prev, msgA]); currentHistory.push(msgA);
        judgeTurn(textA, agentAData.name, topic);
        if (textA) await agentA.speak(textA, ctx);
        if (isLoopRunning.current) await new Promise(r => setTimeout(r, turnDelayRef.current));

        // Agent B
        if (!isLoopRunning.current) break;
        const textB = await agentB.generateText(currentHistory, topic, language);
        const msgB = { id: Date.now().toString(), sender: agentBData.name, text: textB, timestamp: Date.now() };
        setMessages(prev => [...prev, msgB]); currentHistory.push(msgB);
        judgeTurn(textB, agentBData.name, topic);
        if (textB) await agentB.speak(textB, ctx);
        if (isLoopRunning.current) await new Promise(r => setTimeout(r, turnDelayRef.current));
      }
    } catch (e: any) {
      if (isLoopRunning.current) {
        setError("Error: " + (e.message || "Unknown error"));
        stopConversation();
      }
    }
  };

  const stopConversation = () => {
    isLoopRunning.current = false;
    setIsSessionActive(false);
    agentA.stop(); agentB.stop();
  };

  useEffect(() => { return () => { isLoopRunning.current = false; agentA.stop(); agentB.stop(); }; }, []);

  // Helper for Agent Settings Fields
  const renderAgentSettings = (data: typeof agentAData, setData: typeof setAgentAData, color: string) => (
      <div className="space-y-5 animate-in fade-in">
          {/* Identity */}
          <div className="grid grid-cols-2 gap-4">
              <div>
                  <label className="text-[10px] uppercase text-slate-500 font-bold">Name</label>
                  <input type="text" value={data.name} onChange={e => setData({...data, name: e.target.value})}
                      className="w-full bg-black/20 border border-white/10 rounded-xl p-2 text-sm focus:border-indigo-500 outline-none" />
              </div>
               <div>
                  <label className="text-[10px] uppercase text-slate-500 font-bold">Mood</label>
                  <select value={data.mood} onChange={e => setData({...data, mood: e.target.value})}
                      className="w-full bg-black/20 border border-white/10 rounded-xl p-2 text-sm focus:border-indigo-500 outline-none">
                      {Object.keys(MOODS).map(m => <option key={m} value={m} className="bg-slate-900">{MOODS[m].label}</option>)}
                  </select>
              </div>
          </div>

          {/* AI Provider Settings */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
             <div className="flex items-center gap-2 mb-2">
                 <Cpu className="w-4 h-4 text-slate-400" />
                 <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300">AI Model Configuration</h3>
             </div>
             
             <div>
                <label className="text-[10px] uppercase text-slate-500 font-bold">Provider</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                    {AI_PROVIDERS.map(p => (
                        <button key={p.id}
                            onClick={() => setData({...data, provider: p.id as any, model: MODELS[p.id as keyof typeof MODELS][0]})}
                            className={`px-2 py-2 rounded-lg text-[10px] font-bold border transition-all ${data.provider === p.id ? `bg-${color === '#818cf8' ? 'indigo' : 'rose'}-500/20 border-${color === '#818cf8' ? 'indigo' : 'rose'}-500 text-white` : 'border-white/10 text-slate-400 hover:bg-white/5'}`}
                        >
                            {p.name}
                        </button>
                    ))}
                </div>
             </div>

             <div>
                <label className="text-[10px] uppercase text-slate-500 font-bold">Model</label>
                <select value={data.model} onChange={e => setData({...data, model: e.target.value})}
                     className="w-full bg-black/20 border border-white/10 rounded-xl p-2 mt-1 text-sm outline-none">
                     {MODELS[data.provider as keyof typeof MODELS]?.map(m => (
                         <option key={m} value={m} className="bg-slate-900">{m}</option>
                     ))}
                     <option value="custom" className="bg-slate-900">Type Custom Model...</option>
                </select>
             </div>

             <div>
                <label className="text-[10px] uppercase text-slate-500 font-bold flex items-center gap-1">
                    <Key className="w-3 h-3" /> API Key (Optional)
                </label>
                <input type="password" placeholder="Required for non-Google providers"
                    value={data.apiKey || ''} onChange={e => setData({...data, apiKey: e.target.value})}
                    className="w-full bg-black/20 border border-white/10 rounded-xl p-2 mt-1 text-sm outline-none placeholder-slate-600 font-mono" />
             </div>

             {(data.provider === 'custom' || data.provider === 'openai') && (
                 <div>
                    <label className="text-[10px] uppercase text-slate-500 font-bold">API Endpoint</label>
                    <input type="text" placeholder="https://api.openai.com/v1/chat/completions"
                        value={data.apiEndpoint || ''} onChange={e => setData({...data, apiEndpoint: e.target.value})}
                        className="w-full bg-black/20 border border-white/10 rounded-xl p-2 mt-1 text-sm outline-none placeholder-slate-600 font-mono" />
                 </div>
             )}
          </div>
      </div>
  );

  return (
    <div className="min-h-screen text-white flex flex-col font-sans selection:bg-indigo-500/30 overflow-x-hidden relative">
      <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-black" />
      <div className="fixed inset-0 z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
      <div className="fixed inset-0 z-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <header className="px-6 py-4 border-b border-white/5 bg-slate-950/20 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.3)]"><Sparkles className="w-5 h-5 text-white" /></div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 via-white to-purple-200 tracking-tight">Gemini DuoChat</h1>
          </div>
          <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-full hover:bg-white/10 transition-colors border border-transparent hover:border-white/10" title="Configuration"><Settings className="w-5 h-5 text-slate-300" /></button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 flex flex-col z-10 relative">
        {error && (
            <div className="w-full mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-xs text-red-200 animate-in fade-in mx-auto max-w-lg">
                <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
                <span className="leading-relaxed">{error}</span>
            </div>
        )}

        <section className="w-full bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl flex flex-col items-center min-h-[500px] relative overflow-hidden group gap-8">
             <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[100px] pointer-events-none transition-all duration-1000 ${isSessionActive ? 'bg-indigo-500/10' : 'bg-transparent'}`} />
             <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950/50 pointer-events-none" />

             <div className="w-full flex flex-col md:flex-row items-center justify-between gap-8 z-10">
                <div className="flex flex-col items-center transform transition-transform duration-500 hover:scale-105 shrink-0">
                    <AgentAvatar config={agentAConfig} status={agentA.status} volume={agentA.volume} isSessionActive={isSessionActive} thinkingProcess={agentA.thinkingProcess} totalScore={agentAScore} />
                </div>
                <div className="flex-1 w-full max-w-lg flex flex-col items-center justify-center mx-4">
                    <DebateMeter 
                        score={debateScore} 
                        agentAColor={AGENT_A_BASE.color} 
                        agentBColor={AGENT_B_BASE.color} 
                        agentAName={agentAData.name} 
                        agentBName={agentBData.name} 
                        agentAScore={agentAScore} 
                        agentBScore={agentBScore} 
                    />
                </div>
                <div className="flex flex-col items-center transform transition-transform duration-500 hover:scale-105 shrink-0">
                    <AgentAvatar config={agentBConfig} status={agentB.status} volume={agentB.volume} isSessionActive={isSessionActive} thinkingProcess={agentB.thinkingProcess} totalScore={agentBScore} />
                </div>
             </div>

             <div className="w-full max-w-4xl z-10 mt-4 border-t border-white/5 pt-6">
                <ChatLog messages={messages} agentAColor={AGENT_A_BASE.color} agentBColor={AGENT_B_BASE.color} agentAName={agentAData.name} />
             </div>
        </section>

        <div className="flex justify-center mt-8">
             {!isSessionActive ? (
                <button onClick={startConversation} disabled={!topic.trim() || agentA.status === AgentStatus.THINKING}
                    className="px-12 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold tracking-widest rounded-full shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_40px_rgba(79,70,229,0.6)] transition-all transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 text-lg">
                    <PlayCircle className="w-6 h-6" /> START DEBATE
                </button>
            ) : (
                <button onClick={stopConversation}
                    className="px-12 py-4 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 font-bold tracking-widest rounded-full shadow-[0_0_15px_rgba(239,68,68,0.1)] transition-all flex items-center gap-3 text-lg hover:border-red-500/50">
                    <StopCircle className="w-6 h-6" /> STOP SESSION
                </button>
            )}
        </div>
      </main>

      {/* SETTINGS MODAL */}
      {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsSettingsOpen(false)} />
              
              <div className="relative bg-slate-900 border border-white/10 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                  {/* Modal Header */}
                  <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5 shrink-0">
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                          <Settings className="w-5 h-5 text-indigo-400" /> Settings
                      </h2>
                      <button onClick={() => setIsSettingsOpen(false)} className="p-1 rounded-full hover:bg-white/10"><X className="w-5 h-5 text-slate-400" /></button>
                  </div>
                  
                  {/* Tabs */}
                  <div className="flex border-b border-white/10 px-6 gap-6 bg-white/5 shrink-0">
                      <button onClick={() => setActiveTab('general')} className={`py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'general' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>General</button>
                      <button onClick={() => setActiveTab('agentA')} className={`py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'agentA' ? 'border-indigo-400 text-indigo-200' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>Agent 1</button>
                      <button onClick={() => setActiveTab('agentB')} className={`py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'agentB' ? 'border-rose-400 text-rose-200' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>Agent 2</button>
                  </div>

                  {/* Scrollable Content */}
                  <div className="p-6 space-y-6 overflow-y-auto">
                        {activeTab === 'general' && (
                            <div className="space-y-6 animate-in slide-in-from-left-4 fade-in">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Debate Topic</label>
                                    <textarea disabled={isSessionActive} value={topic} onChange={(e) => setTopic(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-slate-200 placeholder-slate-600 focus:border-indigo-500 outline-none resize-none h-24 text-sm" placeholder="Enter topic..." />
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Language</label>
                                        <select disabled={isSessionActive} value={language} onChange={(e) => setLanguage(e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-slate-200 outline-none appearance-none">
                                            {LANGUAGES.map(l => <option key={l} value={l} className="bg-slate-900">{l}</option>)}
                                        </select>
                                    </div>
                                    <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                                        <div className="flex justify-between mb-3"><label className="text-xs font-bold uppercase text-slate-400">Tempo</label><span className="text-xs font-mono text-indigo-300 px-2 rounded bg-indigo-500/10">{(turnDelay / 1000).toFixed(1)}s</span></div>
                                        <input type="range" min="0" max="5000" step="100" value={turnDelay} onChange={(e) => setTurnDelay(Number(e.target.value))} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'agentA' && renderAgentSettings(agentAData, setAgentAData, '#818cf8')}
                        {activeTab === 'agentB' && renderAgentSettings(agentBData, setAgentBData, '#fb7185')}
                  </div>

                  <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end shrink-0">
                      <button onClick={() => setIsSettingsOpen(false)} className="px-6 py-2 bg-white text-slate-900 font-bold rounded-lg hover:bg-slate-200 transition-colors">Done</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
