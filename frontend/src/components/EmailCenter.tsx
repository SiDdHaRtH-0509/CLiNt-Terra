'use client';

import React, { useState, useEffect } from 'react';
import { Mail, ShieldCheck, RefreshCw, Eye, Code, Terminal, Clock, CheckCircle } from 'lucide-react';
import { LedgerStats } from '@/lib/db';

interface EmailCenterProps {
  stats: LedgerStats;
  user: { name: string; email: string };
}

interface EmailLog {
  id: string;
  recipient: string;
  subject: string;
  timestamp: string;
  status: 'delivered' | 'bounced' | 'processing';
  type: 'welcome' | 'weekly_summary';
}

export default function EmailCenter({ stats, user }: EmailCenterProps) {
  const [activeTab, setActiveTab] = useState<'welcome' | 'weekly' | 'logs'>('welcome');
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([
    {
      id: 'email-1',
      recipient: 'siddharth@dubey.me',
      subject: 'Welcome to CLiNt Terra: Passive Carbon Ledger Active',
      timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toLocaleString(),
      status: 'delivered',
      type: 'welcome'
    },
    {
      id: 'email-2',
      recipient: 'siddharth@dubey.me',
      subject: 'Weekly Carbon Ledger Summary: -12.5% below budget',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleString(),
      status: 'delivered',
      type: 'weekly_summary'
    }
  ]);
  const [bounceRate, setBounceRate] = useState<number>(0.0);
  const [sentCount, setSentCount] = useState<number>(2);

  // Trigger simulated weekly summary update
  useEffect(() => {
    // Increment logs when total carbon updates
    if (stats.totalCarbon > 0) {
      setSentCount(prev => prev + 1);
      const newLog: EmailLog = {
        id: `email-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        recipient: user.email || 'user@clint-terra.net',
        subject: `Carbon Ledger Event Alert: Ingest committed (${stats.totalCarbon} kg CO2e)`,
        timestamp: new Date().toLocaleString(),
        status: 'delivered',
        type: 'weekly_summary'
      };
      setEmailLogs(prev => [newLog, ...prev]);
    }
  }, [stats.totalCarbon, user.email]);

  // Synchronize email logs to the current user's email on authentication
  useEffect(() => {
    if (user.email && user.email !== '') {
      setEmailLogs([
        {
          id: `email-welcome-${Date.now()}`,
          recipient: user.email,
          subject: 'Welcome to CLiNt Terra: Passive Carbon Ledger Active',
          timestamp: new Date().toLocaleString(),
          status: 'delivered',
          type: 'welcome'
        },
        {
          id: `email-weekly-${Date.now() - 5000}`,
          recipient: user.email,
          subject: 'Weekly Carbon Ledger Summary: -12.5% below budget',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleString(),
          status: 'delivered',
          type: 'weekly_summary'
        }
      ]);
      setSentCount(2);
    }
  }, [user.email, user.name]);

  return (
    <div className="glass-panel p-6 w-full flex flex-col h-full gap-5">
      {/* Header and stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-neutral-100 flex items-center gap-2">
            <Mail className="w-5 h-5 text-[var(--neon-blue)]" />
            Lifecycle & Email Engine
          </h2>
          <p className="text-xs text-neutral-500 font-mono mt-0.5">
            Non-blocking background events & Resend worker hooks
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex flex-col items-end">
            <span className="text-neutral-500">TOTAL SENT</span>
            <span className="text-neutral-200 font-medium">{sentCount} emails</span>
          </div>
          <div className="w-px h-6 bg-neutral-800" />
          <div className="flex flex-col items-end">
            <span className="text-neutral-500">BOUNCE RATE</span>
            <span className="text-[var(--neon-green)] font-medium">{bounceRate.toFixed(2)}%</span>
          </div>
          <div className="w-px h-6 bg-neutral-800" />
          <div className="flex flex-col items-end">
            <span className="text-neutral-500">SMTP DELIVERABILITY</span>
            <span className="text-[var(--neon-green)] font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--neon-green)]" /> 99.98%
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-900">
        <button
          onClick={() => setActiveTab('welcome')}
          className={`px-4 py-2 text-xs font-mono border-b-2 transition-all cursor-pointer ${
            activeTab === 'welcome'
              ? 'border-[var(--neon-blue)] text-[var(--neon-blue)]'
              : 'border-transparent text-neutral-500 hover:text-neutral-300'
          }`}
        >
          Welcome HTML
        </button>
        <button
          onClick={() => setActiveTab('weekly')}
          className={`px-4 py-2 text-xs font-mono border-b-2 transition-all cursor-pointer ${
            activeTab === 'weekly'
              ? 'border-[var(--neon-blue)] text-[var(--neon-blue)]'
              : 'border-transparent text-neutral-500 hover:text-neutral-300'
          }`}
        >
          Weekly Summary HTML
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 text-xs font-mono border-b-2 transition-all cursor-pointer ${
            activeTab === 'logs'
              ? 'border-[var(--neon-blue)] text-[var(--neon-blue)]'
              : 'border-transparent text-neutral-500 hover:text-neutral-300'
          }`}
        >
          Deliverability Logs
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 bg-black/60 rounded-xl border border-neutral-950 p-4 min-h-[300px] flex flex-col">
        {activeTab === 'welcome' && (
          <div className="flex-1 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-2 mb-2">
              <div className="flex flex-col">
                <span className="text-xs font-mono text-neutral-400">Subject: <span className="text-white">Welcome to CLiNt Terra: Passive Carbon Ledger Active</span></span>
                <span className="text-[10px] font-mono text-neutral-500 font-semibold text-neutral-400">From: team@clint-terra.net • To: {user.email || 'user@clint-terra.net'}</span>
              </div>
              <span className="text-[10px] bg-[var(--neon-green)]/10 text-[var(--neon-green)] border border-[var(--neon-green)]/20 px-2 py-0.5 rounded font-mono">ONBOARDING TRIGGERED</span>
            </div>
            
            {/* HTML Welcome Email Content */}
            <div className="clint-email-preview rounded-lg p-5 text-neutral-350 text-sm max-w-2xl mx-auto w-full font-sans shadow-lg">
              <div className="flex justify-between items-center border-b border-neutral-800 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-gradient-to-tr from-[var(--neon-green)] to-[var(--neon-blue)] flex items-center justify-center font-bold text-black font-mono">CT</div>
                  <span className="font-bold font-mono tracking-wider text-white">CLiNt Terra</span>
                </div>
                <span className="text-[10px] text-neutral-500 font-mono">ECOLOGICAL LEDGER SETUP COMPLETE</span>
              </div>
              
              <h1 className="text-xl font-bold text-white mb-3 tracking-tight">Your Passive Carbon Event-Sourcing Ledger is Active</h1>
              <p className="text-neutral-400 mb-4 leading-relaxed">
                Welcome to CLiNt Terra, {user.name || 'User'} ({user.email || 'user@clint-terra.net'}). This next-generation sustainability ecosystem maps your digital activity onto an immutable, high-throughput carbon ledger. The platform runs a passive, zero-input ingestion engine, pulling variables directly from your authorized digital touchpoints.
              </p>
              
              <div className="clint-email-inner-box rounded-lg p-4 mb-4 font-mono text-xs">
                <div className="text-white font-semibold mb-2">CONNECTED TELEMETRY INTEGRATIONS:</div>
                <div className="flex justify-between py-1 border-b border-neutral-900">
                  <span className="text-[var(--neon-blue)]">Plaid Bank Webhooks</span>
                  <span className="text-[var(--neon-green)]">CONNECTED</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-900">
                  <span className="text-[var(--neon-yellow)]">Google Maps Timeline Clusters</span>
                  <span className="text-[var(--neon-green)]">CONNECTED</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[var(--neon-green)]">HomeAssistant Grid Intensity</span>
                  <span className="text-[var(--neon-green)]">CONNECTED</span>
                </div>
              </div>
              
              <p className="text-neutral-400 mb-6 leading-relaxed">
                As transactions and coordinates filter through our Apache Kafka event queues, Go workers resolve emissions profiles with Redis semantic caching and Gemini Flash. You can inspect your real-time 3D Digital Carbon Twin on the platform dashboard at any time.
              </p>

              <div className="border-t border-neutral-800 pt-4 text-xs text-neutral-500 font-mono text-center">
                CLiNt Terra was founded and envisioned by <span className="text-neutral-300">Siddharth Gopal Dubey</span>.
                <br />
                Security-first carbon event-sourcing network.
              </div>
            </div>
          </div>
        )}

        {activeTab === 'weekly' && (
          <div className="flex-1 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-2 mb-2">
              <div className="flex flex-col">
                <span className="text-xs font-mono text-neutral-400">Subject: <span className="text-white">Weekly Carbon Ledger Summary: {stats.weeklySavingRate > 0 ? `-${stats.weeklySavingRate}% decrease` : `+${Math.abs(stats.weeklySavingRate)}% increase`}</span></span>
                <span className="text-[10px] font-mono text-neutral-500 font-semibold text-neutral-400">From: team@clint-terra.net • To: {user.email || 'user@clint-terra.net'}</span>
              </div>
              <span className="text-[10px] bg-[var(--neon-blue)]/10 text-[var(--neon-blue)] border border-[var(--neon-blue)]/20 px-2 py-0.5 rounded font-mono">AUTOMATED WEEKLY WORKER</span>
            </div>
            
            {/* HTML Weekly Summary Content */}
            <div className="clint-email-preview rounded-lg p-5 text-neutral-350 text-sm max-w-2xl mx-auto w-full font-sans shadow-lg">
              <div className="flex justify-between items-center border-b border-neutral-800 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-gradient-to-tr from-[var(--neon-green)] to-[var(--neon-blue)] flex items-center justify-center font-bold text-black font-mono">CT</div>
                  <span className="font-bold font-mono tracking-wider text-white">CLiNt Terra</span>
                </div>
                <span className="text-[10px] text-neutral-500 font-mono">WEEKLY LEDGER SUMMARY</span>
              </div>
              
              <h1 className="text-lg font-bold text-white mb-2 tracking-tight">Week 24 Carbon Audit: Summary & Dynamic Twin State</h1>
              <p className="text-neutral-450 mb-4 leading-relaxed text-xs">
                Your automated carbon ledger report is ready. Below is your aggregated greenhouse gas emission balance computed across registered financial transactions, transit grids, and household energy sensors.
              </p>
              
              <div className="grid grid-cols-2 gap-3 mb-5 font-mono text-xs">
                <div className="clint-email-inner-box rounded-lg p-3">
                  <span className="text-neutral-500 block mb-1 text-[10px]">TOTAL GHG EMISSIONS</span>
                  <span className={`text-xl font-bold ${stats.isNormal ? 'text-[var(--neon-green)]' : 'text-[var(--neon-orange)]'}`}>
                    {stats.totalCarbon} kg CO2e
                  </span>
                </div>
                <div className="clint-email-inner-box rounded-lg p-3">
                  <span className="text-neutral-500 block mb-1 text-[10px]">BUDGET SURPLUS/DEFICIT</span>
                  <span className={`text-xl font-bold ${stats.weeklySavingRate > 0 ? 'text-[var(--neon-green)]' : 'text-[var(--neon-orange)]'}`}>
                    {stats.weeklySavingRate > 0 ? `${stats.weeklySavingRate}% SAVED` : `${Math.abs(stats.weeklySavingRate)}% OVER`}
                  </span>
                </div>
              </div>

              <div className="clint-email-inner-box rounded-lg p-4 mb-4 font-mono text-xs">
                <div className="text-white font-semibold mb-2">CARBON BREAKDOWN BY EMISSION SOURCE:</div>
                {Object.entries(stats.carbonByCategory).map(([cat, val]) => (
                  <div key={cat} className="flex justify-between py-1 border-b border-neutral-900 last:border-0">
                    <span className="text-neutral-400">{cat}</span>
                    <span className="text-white font-semibold">{val} kg CO2e</span>
                  </div>
                ))}
              </div>

              <p className="text-neutral-400 mb-6 leading-relaxed text-xs">
                Based on your weekly budget of <strong>{stats.carbonBudget} kg CO2e</strong>, your 3D Digital Carbon Twin has loaded the <strong>{stats.isNormal ? 'STABLE GREEN BIOSPHERE' : 'DECAYING SMOKY ORANGE'}</strong> WebGL context shader variables. Continue passive tracking to maintain balance.
              </p>

              <div className="border-t border-neutral-800 pt-4 text-xs text-neutral-500 font-mono text-center">
                Platform founded by Siddharth Gopal Dubey. Thank you for utilizing CLiNt Terra.
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="flex-1 flex flex-col font-mono text-xs gap-3">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-2 mb-2">
              <span className="text-neutral-400">Background Worker Email Thread Log Output</span>
              <button
                onClick={() => {
                  setEmailLogs([
                    {
                      id: `email-${Math.random().toString(36).substring(2, 9)}`,
                      recipient: 'siddharth@dubey.me',
                      subject: 'Scheduled Weekly summary: Ledger Audit',
                      timestamp: new Date().toLocaleString(),
                      status: 'delivered',
                      type: 'weekly_summary'
                    },
                    ...emailLogs
                  ]);
                }}
                className="px-2 py-0.5 border border-neutral-800 hover:border-neutral-700 bg-neutral-900/60 rounded text-[10px] text-neutral-400 hover:text-white cursor-pointer"
              >
                Send Manual Report
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto max-h-[250px] flex flex-col gap-2">
              {emailLogs.map((log) => (
                <div key={log.id} className="p-3 clint-log-item rounded-lg flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-neutral-300 font-medium">{log.subject}</span>
                      <span className="text-[10px] text-neutral-500">Recipient: {log.recipient} • ID: {log.id}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-neutral-400">{log.timestamp}</span>
                    <span className="text-[10px] bg-[var(--neon-green)]/10 text-[var(--neon-green)] border border-[var(--neon-green)]/20 px-2 py-0.5 rounded flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> {log.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
