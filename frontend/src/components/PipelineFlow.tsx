'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Database, Cpu, Layers, RefreshCw, Send, Zap, Fuel, Plane, Coffee, Sun, ChevronDown } from 'lucide-react';
import { RawEvent } from '@/lib/carbon';
import { addRawEvent } from '@/lib/db';

interface PipelineFlowProps {
  onNewEntry: () => void;
  theme?: 'light' | 'dark';
}

interface PipelinePacket {
  id: string;
  source: 'plaid' | 'maps' | 'homeassistant';
  title: string;
  amount: number;
  stage: 'webhook' | 'kafka' | 'worker' | 'cache' | 'timescaledb' | 'done';
}

export default function PipelineFlow({ onNewEntry, theme = 'dark' }: PipelineFlowProps) {
  const [activePackets, setActivePackets] = useState<PipelinePacket[]>([]);
  const [systemLoad, setSystemLoad] = useState<number>(12); // events per minute
  const [redisHits, setRedisHits] = useState<number>(187);
  const [geminiParses, setGeminiParses] = useState<number>(42);
  const isLightTheme = theme === 'light';

  // Scenario Form States
  const [foodAmount, setFoodAmount] = useState<string>('12.50');
  const [foodType, setFoodType] = useState<string>('dining.coffee');

  const [transitAmount, setTransitAmount] = useState<string>('15');
  const [transitType, setTransitType] = useState<string>('transit.rideshare_gas');

  const [energyAmount, setEnergyAmount] = useState<string>('24');
  const [energyType, setEnergyType] = useState<string>('utility.grid_mix');

  // Track latest active packets to avoid stale interval closures
  const packetsRef = useRef(activePackets);
  useEffect(() => {
    packetsRef.current = activePackets;
  }, [activePackets]);

  // Handle packet flow logic
  useEffect(() => {
    const interval = setInterval(() => {
      if (packetsRef.current.length === 0) return;

      // 1. Execute side effects outside of the pure state updater function
      packetsRef.current.forEach(p => {
        if (p.stage === 'timescaledb') {
          const rawEvent: RawEvent = {
            id: p.id,
            source: p.source,
            timestamp: new Date().toISOString(),
            amount: p.amount,
            title: p.title,
            rawDetails: `Ingested through Dynamic Scenario Form: Source:${p.source}, Title:${p.title}, Amount:${p.amount}`
          };
          addRawEvent(rawEvent);
          onNewEntry();
        }
      });

      // 2. Pure state transition update
      setActivePackets(prev => {
        const updated = prev.map(p => {
          if (p.stage === 'webhook') return { ...p, stage: 'kafka' as const };
          if (p.stage === 'kafka') return { ...p, stage: 'worker' as const };
          if (p.stage === 'worker') return { ...p, stage: 'cache' as const };
          if (p.stage === 'cache') return { ...p, stage: 'timescaledb' as const };
          if (p.stage === 'timescaledb') return { ...p, stage: 'done' as const };
          return p;
        });
        return updated.filter(p => p.stage !== 'done');
      });
    }, 1000); // Packet hops every 1s

    return () => clearInterval(interval);
  }, [onNewEntry]);

  const triggerDynamicWebhook = (
    source: 'plaid' | 'maps' | 'homeassistant',
    title: string,
    amount: number
  ) => {
    const newPacket: PipelinePacket = {
      id: 'flow-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
      source,
      title,
      amount,
      stage: 'webhook'
    };
    setActivePackets(prev => [...prev, newPacket]);
    setSystemLoad(prev => Math.min(prev + 12, 150));

    // Heuristics to simulate parser route
    if (
      title.toLowerCase().includes('mcdonald') ||
      title.toLowerCase().includes('starbucks') ||
      title.toLowerCase().includes('flight')
    ) {
      setGeminiParses(p => p + 1);
    } else {
      setRedisHits(h => h + 1);
    }

    setTimeout(() => {
      setSystemLoad(prev => Math.max(prev - 12, 12));
    }, 5000);
  };

  // Submit handlers for each form (with input validation to prevent integer overflows)
  const handleFoodSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(foodAmount);
    if (isNaN(val) || val <= 0 || val > 5000) return;

    let title = 'Starbucks Coffee';
    if (foodType === 'dining.fast_food') title = 'McDonalds Fast Food';
    else if (foodType === 'dining.restaurant') title = 'Dine-in Restaurant Meal';
    else if (foodType === 'dining.vegan') title = 'Sweetgreen Vegan Salad';

    triggerDynamicWebhook('plaid', title, val);
  };

  const handleTransitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(transitAmount);
    if (isNaN(val) || val <= 0 || val > 30000) return;

    let title = 'Uber rideshare';
    if (transitType === 'transit.flight_long' || transitType === 'transit.flight_short') {
      title = `Flight ${val}KM`;
    } else if (transitType === 'transit.rideshare_ev') {
      title = 'Uber EV ride';
    } else if (transitType === 'transit.train') {
      title = 'Train transit trip';
    } else if (transitType === 'transit.bus') {
      title = 'Municipal Bus Ride';
    }

    triggerDynamicWebhook('maps', title, val);
  };

  const handleEnergySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(energyAmount);
    if (isNaN(val) || val <= 0 || val > 10000) return;

    let title = 'Grid power draw';
    let finalVal = val;
    if (energyType === 'utility.solar_clean') {
      title = 'Solar array offset';
      finalVal = -val; // negative amount represents offset solar generation!
    } else if (energyType === 'utility.grid_coal') {
      title = 'Grid dirty coal power';
    }

    triggerDynamicWebhook('homeassistant', title, finalVal);
  };

  const getSourceBadge = (source: string) => {
    if (source === 'plaid') return 'bg-[#4285f4]/10 border-[#4285f4]/20 text-[#4285f4]';
    if (source === 'maps') return 'bg-[#f4b400]/10 border-[#f4b400]/20 text-[#f4b400]';
    return 'bg-[#0f9d58]/10 border-[#0f9d58]/20 text-[#0f9d58]';
  };

  return (
    <div className={`glass-panel p-6 w-full flex flex-col h-full gap-5 transition-colors duration-500`}>
      {/* Header and stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className={`text-lg font-semibold tracking-tight flex items-center gap-2 ${
            isLightTheme ? 'text-neutral-800' : 'text-neutral-100'
          }`}>
            <Zap className={`w-5 h-5 ${isLightTheme ? 'text-[#0f9d58]' : 'text-[#00ff66]'} animate-pulse`} />
            Passive Ingestion Pipeline
          </h2>
          <p className="text-xs text-neutral-500 font-mono mt-0.5">
            Decoupled Kafka Event Broker & Go Parse Worker
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex flex-col items-end">
            <span className="text-neutral-500">SYSTEM THROUGHPUT</span>
            <span className={`${isLightTheme ? 'text-neutral-750' : 'text-neutral-200'} font-medium`}>{systemLoad} ev/min</span>
          </div>
          <div className="w-px h-6 bg-neutral-300 dark:bg-neutral-800" />
          <div className="flex flex-col items-end">
            <span className="text-neutral-500">SEMANTIC CACHE HITS</span>
            <span className="text-[#0f9d58] dark:text-[#00ff66] font-medium">{redisHits}</span>
          </div>
          <div className="w-px h-6 bg-neutral-300 dark:bg-neutral-800" />
          <div className="flex flex-col items-end">
            <span className="text-neutral-500">GEMINI PARSER RUNS</span>
            <span className="text-[#4285f4] dark:text-[#00f0ff] font-medium">{geminiParses}</span>
          </div>
        </div>
      </div>

      {/* Ingestion Pipeline Visual Flow */}
      <div className={`flex flex-col gap-2 border p-4 rounded-xl relative overflow-hidden transition-colors ${
        isLightTheme ? 'bg-white border-[#dadce0]' : 'bg-neutral-950/60 border-neutral-900'
      }`}>
        {/* Stage 1: Webhook Ingress */}
        <div className={`flex items-center justify-between p-3 rounded-lg border relative ${
          isLightTheme ? 'bg-[#f8f9fa] border-[#dadce0]' : 'bg-black/40 border-neutral-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center border border-neutral-300 dark:border-neutral-700">
              <Send className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
            </div>
            <div className="flex flex-col">
              <span className={`text-xs font-semibold ${isLightTheme ? 'text-neutral-800' : 'text-neutral-200'}`}>1. Webhook Gateway</span>
              <span className="text-[10px] text-neutral-500 font-mono">Ingests telemetry payloads</span>
            </div>
          </div>
          
          <div className="flex gap-1 items-center">
            {activePackets.filter(p => p.stage === 'webhook').map(p => (
              <span key={p.id} className={`text-[9px] px-2 py-0.5 rounded-full border font-mono animate-bounce ${getSourceBadge(p.source)}`}>
                {p.title.split(' ')[0]}
              </span>
            ))}
          </div>
        </div>

        {/* Connector */}
        <div className="flex justify-center -my-1 text-neutral-500 dark:text-neutral-700">
          <ChevronDown className="w-4 h-4 animate-pulse" />
        </div>

        {/* Stage 2: Apache Kafka Broker */}
        <div className={`flex items-center justify-between p-3 rounded-lg border relative ${
          isLightTheme ? 'bg-[#f8f9fa] border-[#dadce0]' : 'bg-black/40 border-neutral-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center border border-neutral-300 dark:border-neutral-700">
              <Layers className="w-4 h-4 text-[#f4b400]" />
            </div>
            <div className="flex flex-col">
              <span className={`text-xs font-semibold ${isLightTheme ? 'text-neutral-800' : 'text-neutral-200'}`}>2. Kafka Queue</span>
              <span className="text-[10px] text-neutral-500 font-mono">Broker event partition stream</span>
            </div>
          </div>
          
          <div className="flex gap-1 items-center">
            {activePackets.filter(p => p.stage === 'kafka').map(p => (
              <span key={p.id} className={`text-[9px] px-2 py-0.5 rounded-full border font-mono animate-pulse ${getSourceBadge(p.source)}`}>
                {p.title.split(' ')[0]}
              </span>
            ))}
          </div>
        </div>

        {/* Connector */}
        <div className="flex justify-center -my-1 text-neutral-500 dark:text-neutral-700">
          <ChevronDown className="w-4 h-4 animate-pulse" />
        </div>

        {/* Stage 3: Go Parsing Worker */}
        <div className={`flex items-center justify-between p-3 rounded-lg border relative ${
          isLightTheme ? 'bg-[#f8f9fa] border-[#dadce0]' : 'bg-black/40 border-neutral-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center border border-neutral-300 dark:border-neutral-700">
              <Cpu className="w-4 h-4 text-[#0f9d58]" />
            </div>
            <div className="flex flex-col">
              <span className={`text-xs font-semibold ${isLightTheme ? 'text-neutral-800' : 'text-neutral-200'}`}>3. Go Worker</span>
              <span className="text-[10px] text-neutral-500 font-mono">Stateless carbon processor</span>
            </div>
          </div>
          
          <div className="flex gap-1 items-center">
            {activePackets.filter(p => p.stage === 'worker').map(p => (
              <span key={p.id} className={`text-[9px] px-2 py-0.5 rounded-full border font-mono ${getSourceBadge(p.source)}`}>
                Parsing...
              </span>
            ))}
          </div>
        </div>

        {/* Connector */}
        <div className="flex justify-center -my-1 text-neutral-500 dark:text-neutral-700">
          <ChevronDown className="w-4 h-4 animate-pulse" />
        </div>

        {/* Stage 4: Redis / Gemini Flash */}
        <div className={`flex items-center justify-between p-3 rounded-lg border relative ${
          isLightTheme ? 'bg-[#f8f9fa] border-[#dadce0]' : 'bg-black/40 border-neutral-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center border border-neutral-300 dark:border-neutral-700">
              <RefreshCw className="w-4 h-4 text-[#4285f4] animate-spin-slow" />
            </div>
            <div className="flex flex-col">
              <span className={`text-xs font-semibold ${isLightTheme ? 'text-neutral-800' : 'text-neutral-200'}`}>4. Cache / Gemini</span>
              <span className="text-[10px] text-neutral-500 font-mono">Resolves emissions factors</span>
            </div>
          </div>
          
          <div className="flex gap-1 items-center">
            {activePackets.filter(p => p.stage === 'cache').map(p => (
              <span key={p.id} className={`text-[9px] px-2 py-0.5 rounded-full border font-mono ${getSourceBadge(p.source)}`}>
                Mapping...
              </span>
            ))}
          </div>
        </div>

        {/* Connector */}
        <div className="flex justify-center -my-1 text-neutral-500 dark:text-neutral-700">
          <ChevronDown className="w-4 h-4 animate-pulse" />
        </div>

        {/* Stage 5: TimescaleDB ledger */}
        <div className={`flex items-center justify-between p-3 rounded-lg border relative ${
          isLightTheme ? 'bg-[#f8f9fa] border-[#dadce0]' : 'bg-black/40 border-neutral-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center border border-neutral-300 dark:border-neutral-700">
              <Database className="w-4 h-4 text-[#0f9d58]" />
            </div>
            <div className="flex flex-col">
              <span className={`text-xs font-semibold ${isLightTheme ? 'text-neutral-800' : 'text-neutral-200'}`}>5. TimescaleDB</span>
              <span className="text-[10px] text-neutral-500 font-mono">Immutable carbon ledger</span>
            </div>
          </div>
          
          <div className="flex gap-1 items-center">
            {activePackets.filter(p => p.stage === 'timescaledb').map(p => (
              <span key={p.id} className={`text-[9px] px-2 py-0.5 rounded-full border font-mono ${getSourceBadge(p.source)}`}>
                Writing...
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Real Scenario Calculators */}
      <div className="flex flex-col gap-4">
        <h3 className={`text-xs uppercase font-mono tracking-wider ${isLightTheme ? 'text-neutral-500' : 'text-neutral-400'}`}>
          Fill Real Scenario to Calculate Actual CO2
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Form 1: Food & Dining */}
          <form onSubmit={handleFoodSubmit} className={`p-4 rounded-xl border flex flex-col gap-3.5 ${
            isLightTheme ? 'bg-white border-[#dadce0]' : 'bg-neutral-950/40 border-neutral-800'
          }`}>
            <div className="flex items-center gap-2 border-b pb-2 border-neutral-200 dark:border-neutral-800">
              <Coffee className="w-4 h-4 text-[#4285f4]" />
              <span className={`text-xs font-semibold font-mono ${isLightTheme ? 'text-neutral-700' : 'text-neutral-300'}`}>Food & Dining (Plaid)</span>
            </div>
            <div className="flex flex-col gap-1 text-xs">
              <label className="text-[10px] text-neutral-500 uppercase font-mono">Amount Spent (USD)</label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                max="5000"
                value={foodAmount}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  if (val > 5000) return;
                  setFoodAmount(e.target.value);
                }}
                className={`px-3 py-2 border rounded-lg outline-none font-mono text-xs ${
                  isLightTheme ? 'bg-[#f8f9fa] border-[#dadce0] text-neutral-800 focus:border-[#4285f4]' : 'bg-neutral-900 border-neutral-800 text-neutral-200 focus:border-neutral-700'
                }`}
              />
            </div>
            <div className="flex flex-col gap-1 text-xs">
              <label className="text-[10px] text-neutral-500 uppercase font-mono">Scenario Category</label>
              <select
                value={foodType}
                onChange={e => setFoodType(e.target.value)}
                className={`px-3 py-2 border rounded-lg outline-none font-mono text-xs ${
                  isLightTheme ? 'bg-[#f8f9fa] border-[#dadce0] text-neutral-800 focus:border-[#4285f4]' : 'bg-neutral-900 border-neutral-800 text-neutral-200 focus:border-neutral-700'
                }`}
              >
                <option value="dining.coffee">Starbucks / Coffee shop (0.60 kg/$)</option>
                <option value="dining.fast_food">McDonalds / Fast food (2.10 kg/$)</option>
                <option value="dining.restaurant">Standard Restaurant dining (1.80 kg/$)</option>
                <option value="dining.vegan">Sweetgreen / Vegan option (0.45 kg/$)</option>
              </select>
            </div>
            <button
              type="submit"
              className={`w-full py-2 rounded-lg text-xs font-semibold font-mono cursor-pointer transition-all ${
                isLightTheme ? 'bg-[#4285f4] text-white hover:bg-[#357ae8]' : 'bg-[#4285f4]/20 text-[#4285f4] hover:bg-[#4285f4]/35 border border-[#4285f4]/30'
              }`}
            >
              Log Food webhook
            </button>
          </form>

          {/* Form 2: Transit & Commute */}
          <form onSubmit={handleTransitSubmit} className={`p-4 rounded-xl border flex flex-col gap-3.5 ${
            isLightTheme ? 'bg-white border-[#dadce0]' : 'bg-neutral-950/40 border-neutral-800'
          }`}>
            <div className="flex items-center gap-2 border-b pb-2 border-neutral-200 dark:border-neutral-800">
              <Fuel className="w-4 h-4 text-[#f4b400]" />
              <span className={`text-xs font-semibold font-mono ${isLightTheme ? 'text-neutral-700' : 'text-neutral-300'}`}>Transit & Travel (Maps)</span>
            </div>
            <div className="flex flex-col gap-1 text-xs">
              <label className="text-[10px] text-neutral-500 uppercase font-mono">Distance Traveled (KM)</label>
              <input
                type="number"
                min="0.5"
                max="30000"
                value={transitAmount}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  if (val > 30000) return;
                  setTransitAmount(e.target.value);
                }}
                className={`px-3 py-2 border rounded-lg outline-none font-mono text-xs ${
                  isLightTheme ? 'bg-[#f8f9fa] border-[#dadce0] text-neutral-800 focus:border-[#f4b400]' : 'bg-neutral-900 border-neutral-800 text-neutral-200 focus:border-neutral-700'
                }`}
              />
            </div>
            <div className="flex flex-col gap-1 text-xs">
              <label className="text-[10px] text-neutral-500 uppercase font-mono">Transit Mode</label>
              <select
                value={transitType}
                onChange={e => setTransitType(e.target.value)}
                className={`px-3 py-2 border rounded-lg outline-none font-mono text-xs ${
                  isLightTheme ? 'bg-[#f8f9fa] border-[#dadce0] text-neutral-800 focus:border-[#f4b400]' : 'bg-neutral-900 border-neutral-800 text-neutral-200 focus:border-neutral-700'
                }`}
              >
                <option value="transit.rideshare_gas">Uber / Cab combustion (0.22 kg/km)</option>
                <option value="transit.rideshare_ev">Uber EV / Electric (0.04 kg/km)</option>
                <option value="transit.flight_short">Short-haul flight (0.25 kg/km)</option>
                <option value="transit.flight_long">Long-haul flight (0.18 kg/km)</option>
                <option value="transit.train">Subway / Electric train (0.035 kg/km)</option>
                <option value="transit.bus">Municipal Bus ride (0.08 kg/km)</option>
              </select>
            </div>
            <button
              type="submit"
              className={`w-full py-2 rounded-lg text-xs font-semibold font-mono cursor-pointer transition-all ${
                isLightTheme ? 'bg-[#f4b400] text-white hover:bg-[#db9f00]' : 'bg-[#f4b400]/20 text-[#f4b400] hover:bg-[#f4b400]/35 border border-[#f4b400]/30'
              }`}
            >
              Log Transit webhook
            </button>
          </form>

          {/* Form 3: Energy Grid & Solar */}
          <form onSubmit={handleEnergySubmit} className={`p-4 rounded-xl border flex flex-col gap-3.5 ${
            isLightTheme ? 'bg-white border-[#dadce0]' : 'bg-neutral-950/40 border-neutral-800'
          }`}>
            <div className="flex items-center gap-2 border-b pb-2 border-neutral-200 dark:border-neutral-800">
              <Sun className="w-4 h-4 text-[#0f9d58]" />
              <span className={`text-xs font-semibold font-mono ${isLightTheme ? 'text-neutral-700' : 'text-neutral-300'}`}>Utilities & Solar (HA)</span>
            </div>
            <div className="flex flex-col gap-1 text-xs">
              <label className="text-[10px] text-neutral-500 uppercase font-mono">Usage / Generation (kWh)</label>
              <input
                type="number"
                min="0.1"
                max="10000"
                value={energyAmount}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  if (val > 10000) return;
                  setEnergyAmount(e.target.value);
                }}
                className={`px-3 py-2 border rounded-lg outline-none font-mono text-xs ${
                  isLightTheme ? 'bg-[#f8f9fa] border-[#dadce0] text-neutral-800 focus:border-[#0f9d58]' : 'bg-neutral-900 border-neutral-800 text-neutral-200 focus:border-neutral-700'
                }`}
              />
            </div>
            <div className="flex flex-col gap-1 text-xs">
              <label className="text-[10px] text-neutral-500 uppercase font-mono">Power Source type</label>
              <select
                value={energyType}
                onChange={e => setEnergyType(e.target.value)}
                className={`px-3 py-2 border rounded-lg outline-none font-mono text-xs ${
                  isLightTheme ? 'bg-[#f8f9fa] border-[#dadce0] text-neutral-800 focus:border-[#0f9d58]' : 'bg-neutral-900 border-neutral-800 text-neutral-200 focus:border-neutral-700'
                }`}
              >
                <option value="utility.grid_mix">Standard grid power (0.42 kg/kWh)</option>
                <option value="utility.grid_coal">Coal-heavy Grid usage (0.95 kg/kWh)</option>
                <option value="utility.solar_clean">Solar array green generation (-0.42 kg/kWh offset)</option>
              </select>
            </div>
            <button
              type="submit"
              className={`w-full py-2 rounded-lg text-xs font-semibold font-mono cursor-pointer transition-all ${
                isLightTheme ? 'bg-[#0f9d58] text-white hover:bg-[#0c7f47]' : 'bg-[#0f9d58]/20 text-[#0f9d58] hover:bg-[#0f9d58]/35 border border-[#0f9d58]/30'
              }`}
            >
              Log Utility webhook
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
