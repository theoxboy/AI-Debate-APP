
import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { AgentConfig, AgentStatus, ChatMessage } from '../types';
import { base64ToUint8Array, pcmToAudioBuffer } from '../utils/audioUtils';

/**
 * Helper to retry an async operation with exponential backoff
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>, 
  maxRetries: number = 3, 
  baseDelay: number = 2000
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (e: any) {
      lastError = e;
      const isRateLimit = e.message?.includes('429') || e.status === 429 || e.code === 429;
      const isServerOverload = e.message?.includes('503') || e.status === 503 || e.code === 503;

      if (isRateLimit || isServerOverload) {
        const delay = baseDelay * Math.pow(2, i);
        console.warn(`API Limit hit (${e.status}). Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw e;
      }
    }
  }
  throw lastError;
}

const THINKING_STEPS = [
    "Analyzing context...",
    "Searching Google for facts...",
    "Reviewing case studies...",
    "Calculating probabilities...",
    "Verifying sources...",
    "Formulating argument..."
];

export function useAgent(config: AgentConfig, audioContext: AudioContext | null) {
  const [status, setStatus] = useState<AgentStatus>(AgentStatus.IDLE);
  const [volume, setVolume] = useState(0);
  const [thinkingProcess, setThinkingProcess] = useState<string>("");
  
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const thinkingIntervalRef = useRef<any>(null);

  const ensureAnalyser = useCallback((ctx: AudioContext) => {
    if (analyserRef.current && analyserRef.current.context === ctx) {
        return analyserRef.current;
    }
    try {
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 32;
        analyser.smoothingTimeConstant = 0.8;
        analyser.connect(ctx.destination);
        analyserRef.current = analyser;
        return analyser;
    } catch (e) {
        console.error("Failed to create analyser", e);
        return null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (thinkingIntervalRef.current) clearInterval(thinkingIntervalRef.current);
      analyserRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    const updateVolume = () => {
      if (status === AgentStatus.SPEAKING && analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setVolume(avg);
      } else {
        setVolume(0);
      }
      animationFrameRef.current = requestAnimationFrame(updateVolume);
    };
    updateVolume();
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [status]);

  /**
   * Generates text response based on selected provider
   */
  const generateText = useCallback(async (history: ChatMessage[], topic: string, language: string) => {
    try {
      setStatus(AgentStatus.THINKING);
      setThinkingProcess("Initializing...");
      
      let stepIndex = 0;
      thinkingIntervalRef.current = setInterval(() => {
        setThinkingProcess(THINKING_STEPS[stepIndex % THINKING_STEPS.length]);
        stepIndex++;
      }, 800);

      // Prepare Prompt
      const conversationLog = history.map(msg => `${msg.sender}: ${msg.text}`).join('\n');
      const systemPrompt = `
      You are ${config.name}.
      ${config.systemInstruction}
      
      Debate Topic: ${topic}
      Language: ${language}
      
      Conversation History:
      ${conversationLog}
      
      Respond to the last message as ${config.name}. Keep it concise (2-3 sentences).
      `;

      let text = "";

      // --- GOOGLE (GEMINI) ---
      if (config.provider === 'google') {
          const apiKey = config.apiKey || process.env.API_KEY;
          const ai = new GoogleGenAI({ apiKey: apiKey });
          
          const response = await retryWithBackoff(async () => {
            return await ai.models.generateContent({
              model: config.model || 'gemini-2.5-flash',
              contents: systemPrompt, // For Gemini 2.5, sending raw text as contents usually works, but typically better as [{role: 'user', parts:[{text}]}]
              config: {
                // systemInstruction is passed in contents for simplicity or split if supported
                // tools: [{ googleSearch: {} }] // Only for Gemini
              }
            });
          });
          text = response.text || "";
      } 
      
      // --- OPENAI COMPATIBLE (OpenAI, Groq, Local) ---
      else if (config.provider === 'openai' || config.provider === 'custom') {
           const endpoint = config.apiEndpoint || 'https://api.openai.com/v1/chat/completions';
           const apiKey = config.apiKey || '';
           
           const response = await retryWithBackoff(async () => {
               const res = await fetch(endpoint, {
                   method: 'POST',
                   headers: {
                       'Content-Type': 'application/json',
                       'Authorization': `Bearer ${apiKey}`
                   },
                   body: JSON.stringify({
                       model: config.model,
                       messages: [
                           { role: 'system', content: config.systemInstruction },
                           { role: 'user', content: `Topic: ${topic}\n\nHistory:\n${conversationLog}\n\nRespond as ${config.name}.` }
                       ],
                       temperature: 0.7
                   })
               });
               if (!res.ok) {
                   const err = await res.json();
                   throw new Error(err.error?.message || res.statusText);
               }
               return res.json();
           });
           text = response.choices?.[0]?.message?.content || "";
      }
      
      // --- ANTHROPIC ---
      else if (config.provider === 'anthropic') {
           // Requires a proxy usually due to CORS, but simplified fetch here
           const apiKey = config.apiKey || '';
           const response = await retryWithBackoff(async () => {
               const res = await fetch('https://api.anthropic.com/v1/messages', {
                   method: 'POST',
                   headers: {
                       'x-api-key': apiKey,
                       'anthropic-version': '2023-06-01',
                       'content-type': 'application/json',
                       'dangerously-allow-browser': 'true' // Only for local dev
                   },
                   body: JSON.stringify({
                       model: config.model,
                       max_tokens: 1024,
                       system: config.systemInstruction,
                       messages: [
                           { role: 'user', content: `Topic: ${topic}\n\nHistory:\n${conversationLog}\n\nRespond as ${config.name}.` }
                       ]
                   })
               });
               if (!res.ok) throw new Error(res.statusText);
               return res.json();
           });
           text = response.content?.[0]?.text || "";
      }

      if (thinkingIntervalRef.current) clearInterval(thinkingIntervalRef.current);
      setThinkingProcess("");
      return text;

    } catch (e) {
      if (thinkingIntervalRef.current) clearInterval(thinkingIntervalRef.current);
      console.error("Text generation failed", e);
      setStatus(AgentStatus.ERROR);
      throw e;
    }
  }, [config]);

  /**
   * Generates audio. Defaults to Gemini TTS even if text provider is different,
   * unless specific TTS logic is added. Uses Default Env Key if agent key is missing/invalid for Google.
   */
  const speak = useCallback(async (text: string, contextOverride?: AudioContext): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      const ctx = contextOverride || audioContext;

      if (!ctx) {
        setStatus(AgentStatus.ERROR);
        resolve(); 
        return;
      }

      if (ctx.state === 'suspended') {
        try { await ctx.resume(); } catch (e) { console.error(e); }
      }

      ensureAnalyser(ctx);

      try {
        setStatus(AgentStatus.SPEAKING);
        
        // Always use Gemini for TTS for now to ensure voice quality
        // If the user provided a Google Key, use it. Otherwise use Env Key.
        const apiKey = (config.provider === 'google' && config.apiKey) ? config.apiKey : process.env.API_KEY;
        const ai = new GoogleGenAI({ apiKey: apiKey });
        
        const response = await retryWithBackoff(async () => {
            return await ai.models.generateContent({
                model: 'gemini-2.5-flash-preview-tts',
                contents: [{ parts: [{ text }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voice } },
                    },
                },
            });
        });

        let base64Audio = null;
        const parts = response.candidates?.[0]?.content?.parts;
        if (parts) {
            for (const part of parts) {
                if (part.inlineData?.data) {
                    base64Audio = part.inlineData.data;
                    break;
                }
            }
        }
        
        if (!base64Audio) throw new Error("No audio data");

        const uint8Array = base64ToUint8Array(base64Audio);
        const audioBuffer = pcmToAudioBuffer(uint8Array, ctx, 24000);
        
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        sourceRef.current = source;

        if (analyserRef.current) {
          source.connect(analyserRef.current);
        } else {
          source.connect(ctx.destination);
        }

        const safetyTimeout = setTimeout(() => {
            setStatus(AgentStatus.IDLE);
            resolve();
        }, (audioBuffer.duration * 1000) + 500); 

        source.onended = () => {
          clearTimeout(safetyTimeout);
          setStatus(AgentStatus.IDLE);
          resolve();
        };

        source.start();

      } catch (e) {
        console.error("Speech generation failed", e);
        setStatus(AgentStatus.ERROR);
        resolve(); 
      }
    });
  }, [config, audioContext, ensureAnalyser]);

  const stop = useCallback(() => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch (e) {}
    }
    if (thinkingIntervalRef.current) clearInterval(thinkingIntervalRef.current);
    setStatus(AgentStatus.IDLE);
  }, []);

  return {
    status,
    volume,
    thinkingProcess,
    generateText,
    speak,
    stop
  };
}
