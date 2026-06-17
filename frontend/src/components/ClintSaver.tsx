'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Terminal, Loader2, Sparkles, User, Info } from 'lucide-react';
import { LedgerStats } from '@/lib/db';
import { LedgerEntry } from '@/lib/carbon';

interface ClintSaverProps {
  stats: LedgerStats;
  ledger: LedgerEntry[];
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export default function ClintSaver({ stats, ledger }: ClintSaverProps) {
  const cleanInputText = (val: string): string => {
    return val.replace(/[\x00-\x1F\x7F]/g, '');
  };

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  
  // API Key States
  const [userApiKey, setUserApiKey] = useState('');
  const [isServerGeminiActive, setIsServerGeminiActive] = useState(false);
  
  // Floating Thinking Bubbles State
  const [bubbles, setBubbles] = useState<Array<{ id: number; left: number; size: number; duration: number }>>([]);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  const getBackendUrl = () => {
    if (process.env.NEXT_PUBLIC_BACKEND_URL) {
      return process.env.NEXT_PUBLIC_BACKEND_URL;
    }
    if (typeof window !== 'undefined') {
      const isLocal = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');
      if (isLocal) {
        return 'http://localhost:5000';
      }
      return 'https://clint-terra.onrender.com';
    }
    return 'http://localhost:5000';
  };

  // Load API Key on mount and check server status
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUserApiKey(localStorage.getItem('gemini_api_key') || '');
    }

    const checkStatus = async () => {
      try {
        const backendUrl = getBackendUrl();
        const res = await fetch(`${backendUrl}/`);
        if (res.ok) {
          const data = await res.json();
          if (data.geminiActive) {
            setIsServerGeminiActive(true);
          }
        }
      } catch (e) {
        console.error('Failed to fetch backend status:', e);
      }
    };
    checkStatus();
  }, []);

  // Emit thinking bubbles periodically when chat is closed
  useEffect(() => {
    if (isOpen) {
      setBubbles([]);
      return;
    }

    const interval = setInterval(() => {
      const newBubble = {
        id: Date.now() + Math.random(),
        left: Math.random() * 24 + 16, // random horizontal offset (centers over the 56px button)
        size: Math.random() * 8 + 6,    // bubble diameter (6px to 14px)
        duration: Math.random() * 1.5 + 2 // duration (2s to 3.5s)
      };
      setBubbles(prev => [...prev, newBubble].slice(-10)); // keep last 10 bubbles
    }, 900);

    return () => clearInterval(interval);
  }, [isOpen]);
  
  // Seed first greeting on open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: `Hello! I am CLiNt-Saver, your personal sustainability AI copilot. How can I help you analyze your carbon ledger, manage your twin biome, or lower your environmental footprint today?`,
          timestamp: new Date()
        }
      ]);
    }
  }, [isOpen, messages.length, stats.totalCarbon]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    if (!textToSend) setInput('');

    // User message
    const userMsg: ChatMessage = {
      role: 'user',
      content: query,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      // Send chat payload to backend API
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': userApiKey
        },
        body: JSON.stringify({
          message: query,
          apiKey: userApiKey,
          stats: {
            totalCarbon: stats.totalCarbon,
            weeklySavingRate: stats.weeklySavingRate,
            isNormal: stats.isNormal,
            carbonByCategory: stats.carbonByCategory
          },
          // Send recent ledger entries for complete context
          ledgerSummary: ledger.map(e => ({
            title: e.title,
            source: e.source,
            carbonFootprint: e.carbonFootprint,
            reasoning: e.reasoning
          }))
        })
      });

      if (!res.ok) {
        throw new Error('API failed');
      }

      const data = await res.json();
      
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: data.reply,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMsg]);
    } catch (e) {
      console.error('Copilot Chat Error', e);
      // Fallback response with offline knowledge base
      const reply = getLocalResponse(query, stats, ledger);
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: reply,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Quick query prompt presets
  const suggestions = [
    'Who founded CLiNt Terra?',
    'Why did my travel footprint spike?',
    'Explain the pipeline architecture',
    'How can I improve my ecological twin?'
  ];

  return (
    <div className={`fixed bottom-6 right-6 z-50 font-mono ${!isOpen ? 'animate-clint-float' : ''}`} id="tour-copilot">
      {/* Closed State Bubble */}
      {!isOpen && (
        <>
          {/* Thinking Bubbles */}
          {bubbles.map(bubble => (
            <div
              key={bubble.id}
              className="clint-bubble animate-clint-bubble"
              style={{
                left: `${bubble.left}px`,
                bottom: '56px',
                width: `${bubble.size}px`,
                height: `${bubble.size}px`,
                '--bubble-duration': `${bubble.duration}s`
              } as React.CSSProperties}
            />
          ))}
          
          <button
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 rounded-full p-[1px] shadow-[0_4px_20px_rgba(0,0,0,0.15)] dark:shadow-[0_0_20px_rgba(0,255,102,0.3)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.25)] hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center cursor-pointer overflow-hidden border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black relative"
          >
            <img src="/logo-saver.png" alt="CLiNt Saver" className="w-full h-full object-cover rounded-full" />
            {/* Unread badge */}
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#ff5500] border-2 border-white dark:border-black flex items-center justify-center text-[8px] font-bold text-white">
              1
            </span>
          </button>
        </>
      )}

      {/* Expanded Dialog Box */}
      {isOpen && (
        <div className="clint-panel w-[380px] sm:w-[420px] h-[500px] flex flex-col overflow-hidden scale-100 transition-all duration-300 animate-fade-in rounded-2xl">
          {/* Header */}
          <div className="flex justify-between items-center clint-header p-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--neon-green)] pulse-green" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-neutral-100 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-[var(--neon-green)]" />
                  CLiNt-Saver v1.1.2
                </span>
                <span className="text-[9px] text-neutral-500 font-semibold">
                  {(userApiKey || isServerGeminiActive) ? 'Mode: LIVE GEMINI AI' : 'Mode: LOCAL TERMINAL CACHE'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded clint-btn-icon transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* API Key Input Overlay Removed */}

          {/* Chat Pane */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-black/45">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2 max-w-[85%] ${
                  msg.role === 'user' ? 'self-end flex-row-reverse' : msg.role === 'system' ? 'self-center max-w-full' : 'self-start'
                }`}
              >
                {/* Avatar */}
                {msg.role !== 'system' && (
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] shrink-0 border border-solid ${
                    msg.role === 'user' 
                      ? 'bg-neutral-900 border-neutral-800 text-neutral-300' 
                      : 'bg-[var(--neon-green)]/10 border-[var(--neon-green)]/20 text-[var(--neon-green)]'
                  }`}>
                    {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : 'CS'}
                  </div>
                )}
                
                {/* Content Box */}
                <div className={`rounded-xl p-3 text-[11px] leading-relaxed border border-solid whitespace-pre-line ${
                  msg.role === 'user'
                    ? 'chat-bubble-user'
                    : msg.role === 'system'
                    ? 'chat-bubble-system font-semibold text-center py-1.5 px-4 w-full rounded-lg'
                    : 'chat-bubble-assistant'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            
            {/* API Key Prompt Banner Removed */}

            {loading && (
              <div className="flex gap-2 self-start max-w-[80%] items-center">
                <div className="w-6 h-6 rounded-full bg-[var(--neon-green)]/10 border border-[var(--neon-green)]/20 flex items-center justify-center shrink-0">
                  <Loader2 className="w-3.5 h-3.5 text-[var(--neon-green)] animate-spin" />
                </div>
                <div className="rounded-xl p-3 text-[11px] chat-bubble-loader border border-solid italic">
                  Parsing queries & ledger state...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Suggestions Panel */}
          {messages.length <= 2 && !loading && (
            <div className="px-4 py-2 clint-suggestion-panel">
              <span className="text-[9px] text-neutral-500 uppercase font-bold tracking-wider block mb-1">
                Suggested Telemetry Queries
              </span>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(sug)}
                    className="px-2 py-1 clint-suggestion-btn rounded text-[10px] cursor-pointer transition-all"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Panel */}
          <div className="p-3 clint-input-panel flex gap-2">
            <input
              type="text"
              placeholder="Ask CLiNt-Saver anything..."
              value={input}
              onChange={(e) => setInput(cleanInputText(e.target.value))}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 px-3 py-2 text-xs clint-input rounded-lg outline-none transition-all placeholder-neutral-500"
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="w-8 h-8 rounded-lg clint-btn-send flex items-center justify-center disabled:opacity-40 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Offline semantic cache / local lookup logic for CLiNt-Saver queries
 * when API endpoints are unreachable or database calls need immediate answer.
 */
function getLocalResponse(query: string, stats: LedgerStats, ledger: LedgerEntry[]): string {
  const text = query.toLowerCase();

  // 1. Founder Credits
  if (text.includes('founder') || text.includes('found') || text.includes('siddharth') || text.includes('dubey') || text.includes('who made') || text.includes('creator') || text.includes('owner') || text.includes('envisioned')) {
    return `CLiNt Terra was founded and envisioned by Siddharth Gopal Dubey.
    
Siddharth conceived the platform as a next-generation personal sustainability ecosystem. Instead of relying on manual data entry, the platform acts as a passive, zero-input carbon event-sourcing network, securely ingesting telemetry from user-authorized touchpoints (Plaid, Google Maps, HomeAssistant) and converting it into an immutable carbon ledger.`;
  }

  // 2. Technical Architecture / Pipeline
  if (text.includes('architecture') || text.includes('pipeline') || text.includes('kafka') || text.includes('go') || text.includes('worker') || text.includes('redis') || text.includes('timescaledb') || text.includes('mongodb') || text.includes('how does it work') || text.includes('technology') || text.includes('tech stack')) {
    return `CLiNt Terra is built on a high-throughput passive ingestion pipeline:
1. **Ingest Gateway**: Receives webhooks from Plaid (financial), Google Maps (transit), and HomeAssistant (power grid).
2. **Event Broker**: Decoupled Kafka queues buffer transaction packets to handle ingestion spikes.
3. **Go Worker**: A stateless worker pulls packets, uses Redis semantic cache for matching merchant coefficients, and falls back to a high-speed Gemini Flash parser to calculate precise GHG impacts.
4. **Ledger Store**: Immutably commits processed carbon events into a TimescaleDB time-series database.
5. **Frontend UI**: Renders a dark-mode dashboard with a React Three Fiber particle biosphere representing your Digital Carbon Twin.`;
  }

  // 3. Weekly Status / Budget
  if (text.includes('budget') || text.includes('saving') || text.includes('limit') || text.includes('status') || text.includes('biome') || text.includes('twin') || text.includes('health') || text.includes('rate') || text.includes('green') || text.includes('orange') || text.includes('grey')) {
    const rateText = stats.weeklySavingRate > 0 
      ? `saving rate is **${stats.weeklySavingRate}% under** your weekly budget`
      : `footprint is **${Math.abs(stats.weeklySavingRate)}% over** your weekly budget limit`;
    return `Your aggregate weekly carbon footprint is **${stats.totalCarbon} kg CO2e**, against a target weekly budget of **${stats.carbonBudget || 400} kg CO2e**.
    
Currently, your ${rateText}.
As a result, your WebGL Digital Carbon Twin has loaded the **${stats.isNormal ? 'STABLE GREEN BIOSPHERE' : 'DECAYING SMOKY ORANGE GRID'}** shader context.`;
  }

  // 4. Transit / Travel Spikes
  if (text.includes('travel') || text.includes('transit') || text.includes('flight') || text.includes('uber') || text.includes('commute') || text.includes('drive') || text.includes('train') || text.includes('bus') || text.includes('km') || text.includes('spike')) {
    const transitEmissions = stats.carbonByCategory['Transit'] || 0;
    
    // Find travel entries
    const travelEntries = ledger.filter(e => e.source === 'maps' || e.title.toLowerCase().includes('flight') || e.title.toLowerCase().includes('uber') || e.title.toLowerCase().includes('commute'));
    
    let highestDetail = '';
    if (travelEntries.length > 0) {
      const highest = [...travelEntries].sort((a, b) => b.carbonFootprint - a.carbonFootprint)[0];
      highestDetail = `\n\nYour highest registered travel event is **${highest.title}** (${highest.carbonFootprint} kg CO2e). ${highest.reasoning || 'Captured from Maps timeline telemetry.'}`;
    }

    return `Your weekly Transit emissions total **${transitEmissions} kg CO2e**. This includes aviation, rideshares, and rail commutes.${highestDetail}
    
*Recommendation*: To lower your travel footprint, consider opting for electric rail transit (which has a low coefficient of 0.035 kg/km) or selecting EV options on rideshares (0.04 kg/km) instead of standard combustion vehicles (0.22 kg/km).`;
  }

  // 5. Grid Energy / Utilities
  if (text.includes('energy') || text.includes('electricity') || text.includes('utility') || text.includes('solar') || text.includes('power') || text.includes('homeassistant') || text.includes('kwh')) {
    const energyEmissions = stats.carbonByCategory['Energy'] || 0;
    
    // Find energy entries
    const energyEntries = ledger.filter(e => e.source === 'homeassistant' || e.title.toLowerCase().includes('energy') || e.title.toLowerCase().includes('solar') || e.title.toLowerCase().includes('grid'));
    
    let highestDetail = '';
    if (energyEntries.length > 0) {
      const highest = [...energyEntries].sort((a, b) => b.carbonFootprint - a.carbonFootprint)[0];
      highestDetail = `\n\nYour highest energy event is **${highest.title}** (${highest.carbonFootprint} kg CO2e). ${highest.reasoning || 'Parsed from HomeAssistant webhook draw.'}`;
    }

    return `Your weekly Energy emissions total **${energyEmissions} kg CO2e**. This telemetry is passively pulled from your HomeAssistant regional grid intensity sensor.${highestDetail}
    
*Recommendation*: Emitting coal grid energy consumes 0.95 kg/kWh, while renewable solar offset drops consumption to 0.03 kg/kWh. Conserving power during peak dirty grid hours will lower emissions.`;
  }

  // 6. Food / Dining
  if (text.includes('dining') || text.includes('food') || text.includes('coffee') || text.includes('starbucks') || text.includes('mcdonald') || text.includes('sweetgreen') || text.includes('groceries') || text.includes('restaurant') || text.includes('eat') || text.includes('meal')) {
    const diningEmissions = (stats.carbonByCategory['Dining'] || 0) + (stats.carbonByCategory['Groceries'] || 0);
    
    // Find food entries
    const foodEntries = ledger.filter(e => e.category === 'Dining' || e.category === 'Groceries' || e.title.toLowerCase().includes('starbucks') || e.title.toLowerCase().includes('mcdonald') || e.title.toLowerCase().includes('salad') || e.title.toLowerCase().includes('sweetgreen'));
    
    let highestDetail = '';
    if (foodEntries.length > 0) {
      const highest = [...foodEntries].sort((a, b) => b.carbonFootprint - a.carbonFootprint)[0];
      highestDetail = `\n\nYour highest dining/grocery event is **${highest.title}** (${highest.carbonFootprint} kg CO2e). ${highest.reasoning || 'Parsed from Plaid merchant category.'}`;
    }

    return `Your weekly Food and Dining emissions total **${diningEmissions} kg CO2e**. This includes restaurant dining, fast food, and groceries.${highestDetail}
    
*Recommendation*: Fast food supply chains have a higher emission coefficient (2.1 kg per $ spent) due to high meat content and retail packaging, whereas organic/vegan meals (0.45 kg per $) significantly decrease your twin footprint.`;
  }

  // 7. Recent Transactions / Listing
  if (text.includes('buy') || text.includes('purchase') || text.includes('recent') || text.includes('transactions') || text.includes('history') || text.includes('ledger') || text.includes('list') || text.includes('what did i')) {
    if (!ledger || ledger.length === 0) {
      return `Your active carbon ledger database is currently empty. Simulate telemetry inputs using the Webhook Gateway on your dashboard to populate data!`;
    }
    
    const list = ledger.map(e => `• **${e.title}**: ${e.carbonFootprint} kg CO2e (${e.source.toUpperCase()})`).join('\n');
    return `Here are your most recent carbon ledger events:
${list}

You can view full details in the Financial-Grade Carbon Ledger table at the bottom of the dashboard.`;
  }

  // 8. Calculations & Formula details
  if (text.includes('calculate') || text.includes('formula') || text.includes('coefficient') || text.includes('how do you') || text.includes('math') || text.includes('co2')) {
    return `Carbon emissions ($GHG$) are calculated using category coefficients:
$$GHG = Activity \\times Coefficient$$
    
Coefficients depend on telemetry source units:
• **Plaid**: kg CO2e per USD ($) spent (e.g. Fast Food = 2.1, Vegan = 0.45, Electronic Shopping = 1.9, SaaS = 0.15)
• **Maps**: kg CO2e per kilometer (KM) traveled (e.g. Flight = 0.25, Combustion Rideshare = 0.22, EV Rideshare = 0.04, Subway = 0.035)
• **HomeAssistant**: kg CO2e per kilowatt-hour (kWh) consumed (e.g. Coal grid = 0.95, Mixed grid = 0.42, Solar = 0.03)

If the merchant is new, the Go parser forwards the transaction string to Gemini Flash to determine the closest matching carbon category.`;
  }

  // 9. Standard greetings/help
  if (text.includes('hello') || text.includes('hi ') || text.includes('hey') || text.includes('greetings') || text.includes('help')) {
    return `Hello! I am CLiNt-Saver, your personal carbon ledger copilot.
    
I can resolve calculations for your active twin biome:
• Current Footprint: **${stats.totalCarbon} kg CO2e**
• Weekly Allowance: **${stats.carbonBudget} kg CO2e**
    
Ask me details about your travel spikes, food consumption, regional grid power draws, the Kafka pipeline architecture, or corporate origins regarding founder Siddharth Gopal Dubey.`;
  }

  // 10. Default fallback responder
  return `Thank you for your question. As CLiNt-Saver, I have parsed your query against your live telemetry state.
  
Here is your summary:
• Weekly aggregate emissions: **${stats.totalCarbon} kg CO2e**
• Biome health status: **${stats.isNormal ? 'Stable Green' : 'Decaying Orange'}**
• Top category source: **${Object.keys(stats.carbonByCategory || {}).reduce((a, b) => stats.carbonByCategory[a] > stats.carbonByCategory[b] ? a : b, 'Transit')}**

To learn more, ask me about your recent transactions, travel spikes, calculations, or founder Siddharth Gopal Dubey.`;
}
