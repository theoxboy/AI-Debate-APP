import React from 'react';
import { ChatMessage } from '../types';
import { Quote } from 'lucide-react';

interface ChatLogProps {
  messages: ChatMessage[];
  agentAColor: string;
  agentBColor: string;
  agentAName: string;
}

export const ChatLog: React.FC<ChatLogProps> = ({ messages, agentAColor, agentBColor, agentAName }) => {
  // Only get the very last message
  const currentMessage = messages.length > 0 ? messages[messages.length - 1] : null;

  return (
    <div className="w-full flex flex-col items-center justify-center p-4 md:p-8 transition-all duration-500 min-h-[150px]">
      {!currentMessage ? (
        <div className="flex flex-col items-center justify-center space-y-4 opacity-30 mt-4">
            <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0s' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0.4s' }} />
            </div>
        </div>
      ) : (
        <div key={currentMessage.id} className="w-full max-w-4xl animate-in fade-in zoom-in-95 duration-700 ease-out">
           
           {/* Sender Badge */}
           <div className="flex justify-center mb-6">
                <div 
                    className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-md shadow-lg"
                    style={{ 
                        backgroundColor: `${currentMessage.sender === agentAName ? agentAColor : agentBColor}15`,
                        borderColor: `${currentMessage.sender === agentAName ? agentAColor : agentBColor}40`
                    }}
                >
                    <span 
                        className="w-1.5 h-1.5 rounded-full animate-pulse"
                        style={{ backgroundColor: currentMessage.sender === agentAName ? agentAColor : agentBColor }}
                    />
                    <span 
                        className="text-[10px] font-bold uppercase tracking-[0.25em]"
                        style={{ color: currentMessage.sender === agentAName ? agentAColor : agentBColor }}
                    >
                        {currentMessage.sender}
                    </span>
                </div>
           </div>

           {/* The Message */}
           <div className="relative group text-center">
                <Quote className="absolute -top-6 -left-4 w-12 h-12 text-white opacity-[0.03] transform -scale-x-100 group-hover:opacity-[0.05] transition-opacity duration-500" />
                
                <p 
                    className="inline-block text-xl md:text-3xl font-light leading-relaxed text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 drop-shadow-sm"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                >
                    "{currentMessage.text}"
                </p>
                
                <Quote className="absolute -bottom-6 -right-4 w-12 h-12 text-white opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-500" />
           </div>
        </div>
      )}
    </div>
  );
};