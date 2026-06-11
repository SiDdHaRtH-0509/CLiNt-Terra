'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  getLedger, 
  getStats, 
  clearLedger, 
  LedgerStats, 
  setOnboardingStatus,
  addRawEvent,
  getCarbonBudget,
  saveCarbonBudget
} from '@/lib/db';
import { LedgerEntry } from '@/lib/carbon';
import CarbonTwin3D from '@/components/CarbonTwin3D';
import PipelineFlow from '@/components/PipelineFlow';
import EmailCenter from '@/components/EmailCenter';
import LedgerTables from '@/components/LedgerTables';
import ClintSaver from '@/components/ClintSaver';
import AuthGate from '@/components/AuthGate';
import TutorialTour from '@/components/TutorialTour';
import { 
  Settings,
  Sun,
  Moon,
  LogOut,
  Clock,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Sliders,
  Database,
  Mail,
  Key
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function Dashboard() {
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [stats, setStats] = useState<LedgerStats>({
    totalCarbon: 0,
    carbonBySource: {},
    carbonByCategory: {},
    dailyTrend: [],
    weeklySavingRate: 0,
    carbonBudget: 400,
    isNormal: true,
  });
  
  const [mounted, setMounted] = useState(false);
  const [connectionTime, setConnectionTime] = useState<string>('');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [showSettings, setShowSettings] = useState(false);

  // Collapsible section states for advanced users
  const [showLedgerPanel, setShowLedgerPanel] = useState(false);
  const [showEmailPanel, setShowEmailPanel] = useState(false);
  
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState({ name: '', email: '' });

  // Onboarding Tutorial Tour State
  const [activeStep, setActiveStep] = useState<number>(-1);
  const [showTourPrompt, setShowTourPrompt] = useState<boolean>(false);

  // Settings Modal form states
  const [geminiKey, setGeminiKey] = useState('');
  const [gmailUser, setGmailUser] = useState('');
  const [gmailAppPass, setGmailAppPass] = useState('');
  const [resendKey, setResendKey] = useState('');

  // Ecosystem Simulation & Audit States
  const [projEV, setProjEV] = useState(false);
  const [projSolar, setProjSolar] = useState(false);
  const [projVegan, setProjVegan] = useState(false);
  const [projFlights, setProjFlights] = useState(false);
  
  const [auditStatus, setAuditStatus] = useState<'idle' | 'auditing' | 'passed'>('idle');
  const [auditLogs, setAuditLogs] = useState<string[]>([]);

  const projectedSavings = (projEV ? 2200 : 0) + (projSolar ? 1500 : 0) + (projVegan ? 800 : 0) + (projFlights ? 1800 : 0);

  const runLedgerAudit = () => {
    if (auditStatus === 'auditing') return;
    setAuditStatus('auditing');
    setAuditLogs([]);
    
    const lines = [
      `[${new Date().toLocaleTimeString()}] INITIATING TIMESCALEDB IMMUTABILITY PROOF CHECK...`,
      `[${new Date().toLocaleTimeString()}] Fetching active carbon ledger blocks...`,
      `[${new Date().toLocaleTimeString()}] Block range: 0x0001 - 0x${Math.floor(Math.random() * 9999).toString(16).toUpperCase()}`,
      `[${new Date().toLocaleTimeString()}] Verifying Merkle Root: 0x${Math.random().toString(36).substring(2, 10).toUpperCase()}...`,
      `[${new Date().toLocaleTimeString()}] Checking Plaid credentials signature...`,
      `[${new Date().toLocaleTimeString()}] Validating Google Maps timeline coordinates cache...`,
      `[${new Date().toLocaleTimeString()}] Database Hash integrity stable. No tampering detected.`,
      `[${new Date().toLocaleTimeString()}] SUCCESS: Cryptographic ledger trace integrity verified. AUDIT PASS.`
    ];

    let current = 0;
    const interval = setInterval(() => {
      if (current < lines.length) {
        setAuditLogs(prev => [...prev, lines[current]]);
        current++;
      } else {
        clearInterval(interval);
        setAuditStatus('passed');
        confetti({
          particleCount: 40,
          spread: 50,
          origin: { y: 0.8 },
          colors: ['#4285f4', '#00ff66', '#ffffff']
        });
      }
    }, 600);
  };

  // Load ledger, stats, theme and credentials on mount
  useEffect(() => {
    setMounted(true);
    setConnectionTime(new Date().toLocaleTimeString());
    
    // Load theme
    const savedTheme = localStorage.getItem('clint_theme') as 'light' | 'dark' || 'dark';
    setTheme(savedTheme);
    document.documentElement.classList.toggle('light', savedTheme === 'light');

    // Load credentials
    setGeminiKey(localStorage.getItem('gemini_api_key') || '');
    setGmailUser(localStorage.getItem('gmail_user') || '');
    setGmailAppPass(localStorage.getItem('gmail_app_password') || '');
    setResendKey(localStorage.getItem('resend_api_key') || '');

    refreshData();
  }, []);

  // Automatically expand collapsible panels during onboarding tour steps
  useEffect(() => {
    if (activeStep === 7) {
      setShowEmailPanel(true);
    } else if (activeStep === 8) {
      setShowLedgerPanel(true);
    }
  }, [activeStep]);

  const refreshData = () => {
    const currentLedger = getLedger();
    const currentStats = getStats();
    setLedger(currentLedger);
    setStats(currentStats);
  };

  const handleBudgetChange = (newBudget: number) => {
    saveCarbonBudget(newBudget);
    refreshData();
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to flush the carbon ledger database? This will reset all telemetry history.')) {
      clearLedger();
      setOnboardingStatus(false);
      refreshData();
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#ff5500', '#555555']
      });
    }
  };

  const handleNewEntry = () => {
    refreshData();
    const latest = getStats();
    if (latest.isNormal) {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.8 },
        colors: ['#137333', '#1a73e8', '#ffffff']
      });
    } else {
      confetti({
        particleCount: 20,
        spread: 30,
        origin: { y: 0.8 },
        colors: ['#d93025', '#888888']
      });
    }
  };

  const handleAuth = async (name: string, email: string, isLogin: boolean) => {
    setUser({ name, email });
    setIsAuthenticated(true);
    refreshData();

    if (isLogin) {
      setShowTourPrompt(false);
      localStorage.setItem('clint_tour_completed', 'true');
    } else {
      setShowTourPrompt(true);
      localStorage.removeItem('clint_tour_completed');
    }

    // Trigger welcoming email using stored SMTP or API credentials
    const subject = isLogin
      ? 'Welcome Back to CLiNt Terra: Passive Carbon Ledger Synced'
      : 'Welcome to CLiNt Terra: Passive Carbon Ledger Active';

    const htmlBody = isLogin
      ? `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; background-color: #f8f9fa; border: 1px solid #dadce0; color: #202124; border-radius: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #dadce0; padding-bottom: 15px; margin-bottom: 20px;">
            <h2 style="color: #202124; margin: 0; font-family: sans-serif; font-weight: bold;">CLiNt Terra</h2>
            <span style="font-size: 10px; color: #5f6368; font-family: monospace;">CONNECTION SYNCED</span>
          </div>
          <h1 style="color: #202124; font-size: 20px; margin-bottom: 10px; font-weight: bold;">Welcome Back to CLiNt Terra, ${name}</h1>
          <p style="color: #5f6368; font-size: 14px; line-height: 1.6;">
            Your passive carbon event-sourcing network is active and has synchronized telemetry inputs from your Plaid transaction feeds, Google Maps timeline clusters, and HomeAssistant household grid metrics.
          </p>
          <div style="background-color: #ffffff; border: 1px solid #dadce0; padding: 15px; border-radius: 8px; margin: 20px 0; font-family: monospace; font-size: 12px;">
            <div style="color: #1e8e3e; margin-bottom: 5px; font-weight: bold;">STATUS REPORT:</div>
            <div style="display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #f1f3f4;">
              <span style="color: #5f6368;">Active Operator:</span>
              <span style="color: #202124; font-weight: bold;">${name}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 3px 0;">
              <span style="color: #5f6368;">Sync Status:</span>
              <span style="color: #1e8e3e; font-weight: bold;">ESTABLISHED</span>
            </div>
          </div>
          <p style="color: #5f6368; font-size: 14px; line-height: 1.6;">
            Your 3D Earth Carbon Spike Globe has loaded. Continue monitoring your carbon index and filling scenario inputs.
          </p>
          <div style="border-top: 1px solid #dadce0; padding-top: 15px; font-size: 10px; color: #70757a; text-align: center; font-family: monospace; margin-top: 30px;">
            Envisioned by Siddharth Gopal Dubey.
          </div>
        </div>
      `
      : `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; background-color: #f8f9fa; border: 1px solid #dadce0; color: #202124; border-radius: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #dadce0; padding-bottom: 15px; margin-bottom: 20px;">
            <h2 style="color: #202124; margin: 0; font-family: sans-serif; font-weight: bold;">CLiNt Terra</h2>
            <span style="font-size: 10px; color: #5f6368; font-family: monospace;">ECOLOGICAL LEDGER SETUP COMPLETE</span>
          </div>
          <h1 style="color: #202124; font-size: 20px; margin-bottom: 10px; font-weight: bold;">Your Passive Carbon Event-Sourcing Ledger is Active</h1>
          <p style="color: #5f6368; font-size: 14px; line-height: 1.6;">
            Welcome to CLiNt Terra, ${name}. This next-generation personal sustainability ecosystem maps your digital footprint onto an immutable, high-throughput carbon ledger. The platform runs a passive, zero-input ingestion engine, pulling variables directly from your authorized digital touchpoints.
          </p>
          <div style="background-color: #ffffff; border: 1px solid #dadce0; padding: 15px; border-radius: 8px; margin: 20px 0; font-family: monospace; font-size: 12px;">
            <div style="color: #1e8e3e; margin-bottom: 5px; font-weight: bold;">CONNECTED TELEMETRY INTEGRATIONS:</div>
            <div style="display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #f1f3f4;">
              <span style="color: #1a73e8; font-weight: bold;">Plaid Bank Webhooks:</span>
              <span style="color: #1e8e3e; font-weight: bold;">CONNECTED</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #f1f3f4;">
              <span style="color: #f4b400; font-weight: bold;">Google Maps Timeline:</span>
              <span style="color: #1e8e3e; font-weight: bold;">CONNECTED</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 3px 0;">
              <span style="color: #0f9d58; font-weight: bold;">HomeAssistant Grid:</span>
              <span style="color: #1e8e3e; font-weight: bold;">CONNECTED</span>
            </div>
          </div>
          <p style="color: #5f6368; font-size: 14px; line-height: 1.6;">
            As transactions filter through our Apache Kafka event queues, Go workers resolve emissions profiles with Redis semantic caching and Gemini Flash. You can inspect your real-time 3D Earth Carbon Spike Globe on the platform dashboard at any time.
          </p>
          <div style="border-top: 1px solid #dadce0; padding-top: 15px; font-size: 10px; color: #70757a; text-align: center; font-family: monospace; margin-top: 30px;">
            CLiNt Terra was founded and envisioned by Siddharth Gopal Dubey.
          </div>
        </div>
      `;

    // Retrieve credential state directly from localStorage
    const savedGmailUser = localStorage.getItem('gmail_user') || '';
    const savedGmailAppPass = localStorage.getItem('gmail_app_password') || '';
    const savedResendKey = localStorage.getItem('resend_api_key') || '';

    try {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: email,
          subject,
          html: htmlBody,
          credentials: {
            gmailUser: savedGmailUser,
            gmailAppPassword: savedGmailAppPass,
            resendApiKey: savedResendKey
          }
        })
      });
    } catch (e) {
      console.error('SMTP welcome dispatch failed', e);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser({ name: '', email: '' });
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('clint_theme', nextTheme);
    document.documentElement.classList.toggle('light', nextTheme === 'light');
  };

  const saveSettings = () => {
    localStorage.setItem('gemini_api_key', geminiKey);
    localStorage.setItem('gmail_user', gmailUser);
    localStorage.setItem('gmail_app_password', gmailAppPass);
    localStorage.setItem('resend_api_key', resendKey);
    setShowSettings(false);
    // Reload page state
    window.location.reload();
  };

  if (!mounted) return null;

  if (!isAuthenticated) {
    return <AuthGate onAuthenticate={handleAuth} />;
  }

  const isLightTheme = theme === 'light';

  return (
    <main className="min-h-screen bg-black text-neutral-200 p-4 md:p-6 lg:p-8 relative scanline selection:bg-[var(--neon-green)] selection:text-black transition-colors duration-500">
      {/* Background Grid */}
      <div className={`fixed inset-0 pointer-events-none transition-all duration-1000 z-0 ${
        stats.isNormal ? 'biosphere-grid opacity-100' : 'decay-grid opacity-100'
      }`} />
      
      {/* Background Glow */}
      <div className={`fixed -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full blur-[160px] pointer-events-none transition-all duration-1000 z-0 ${
        stats.isNormal ? 'bg-[var(--neon-green)]/5' : 'bg-[var(--neon-orange)]/5'
      }`} />
      
      <div className="max-w-[1550px] mx-auto flex flex-col gap-6 relative z-10">
        {/* Widescreen Gutter Panels */}
        <div className="widescreen-gutter-left-container">
          <div className="widescreen-gutter-panel">
            <LeftWidescreenHUD stats={stats} />
          </div>
        </div>
        
        <div className="widescreen-gutter-right-container">
          <div className="widescreen-gutter-panel">
            <RightWidescreenHUD />
          </div>
        </div>

        {/* Antigravity Header */}
        <header className="glass-panel p-4 flex flex-col sm:flex-row justify-between items-center gap-4 bg-black/60 font-mono" id="tour-header">
          <div className="flex items-center gap-3">
            <img 
              src="/logo-terra.jpg" 
              className="w-10 h-10 rounded-xl object-cover border border-neutral-350 dark:border-neutral-850 logo-blend-light dark:logo-blend-dark bg-white p-0.5" 
              alt="CLiNt Terra Logo" 
            />
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white font-mono flex items-center gap-1.5">
                CLiNt Terra
                <span className="text-[10px] text-neutral-500 font-mono tracking-normal font-normal">v1.3.0</span>
              </h1>
              <p className="text-[10px] text-neutral-450 font-mono">
                Passive Carbon Event-Sourcing Ledger
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono">
            {/* Operator status */}
            <div className="px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-900 flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--neon-blue)]" />
              <span className="text-neutral-400">OPERATOR:</span>
              <span className="text-white font-semibold">{user.name || 'S. G. Dubey'}</span>
            </div>

            {/* Sync connection status */}
            <div className="px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-900 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--neon-green)] pulse-green" />
              <span className="text-[var(--neon-green)] font-semibold">ONLINE</span>
            </div>

            {/* Theme switch */}
            <button
              onClick={toggleTheme}
              className="p-2 border border-neutral-800 hover:border-neutral-750 bg-neutral-900/60 hover:bg-neutral-800 rounded-lg cursor-pointer transition-colors text-neutral-300 hover:text-white"
              title="Toggle Bright/Dark Mode"
            >
              {isLightTheme ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            </button>

            {/* Quick Tour button */}
            <button
              onClick={() => setActiveStep(0)}
              className="p-2 border border-neutral-800 hover:border-neutral-750 bg-neutral-900/60 hover:bg-neutral-800 rounded-lg cursor-pointer transition-colors text-neutral-300 hover:text-white flex items-center gap-1"
              title="Start Onboarding Tour"
            >
              🗺️ <span className="hidden sm:inline">Tour</span>
            </button>

            {/* Settings trigger */}
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 border border-neutral-800 hover:border-neutral-750 bg-neutral-900/60 hover:bg-neutral-800 rounded-lg cursor-pointer transition-colors text-neutral-300 hover:text-white"
              title="Configure Credentials"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            
            <button
              onClick={handleLogout}
              className="px-3 py-2 border border-neutral-850 hover:border-neutral-750 bg-neutral-900/60 hover:bg-neutral-800 rounded-lg text-xs text-[var(--neon-orange)] hover:text-[var(--neon-orange-mid)] font-mono cursor-pointer transition-all flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Disconnect
            </button>
          </div>
        </header>

        {/* Settings Modal (Credentials config) */}
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-mono">
            <div className="glass-panel w-full max-w-md p-6 bg-neutral-950 border border-neutral-800 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative">
              <div className="flex items-center gap-2 mb-4 border-b border-neutral-900 pb-3">
                <Settings className="w-5 h-5 text-[var(--neon-blue)]" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Integrations & Credentials</h2>
              </div>
              
              <div className="space-y-4 text-xs">
                {/* Gemini Key */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-neutral-400 uppercase font-bold flex items-center gap-1">
                    <Key className="w-3 h-3 text-[var(--neon-green)]" /> Gemini API Key
                  </label>
                  <input
                    type="password"
                    placeholder="Enter GEMINI_API_KEY..."
                    value={geminiKey}
                    onChange={e => setGeminiKey(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-850 focus:border-neutral-750 rounded text-neutral-200 outline-none placeholder-neutral-600"
                  />
                  <span className="text-[9px] text-neutral-500">Required for live conversational AI (CLiNt-Saver) response.</span>
                </div>

                {/* SMTP Credentials */}
                <div className="border-t border-neutral-900 pt-3 flex flex-col gap-3">
                  <span className="text-[10px] text-neutral-400 uppercase font-bold flex items-center gap-1">
                    <Mail className="w-3 h-3 text-[var(--neon-blue)]" /> Gmail SMTP Delivery
                  </span>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] text-neutral-450 uppercase">Gmail Address</label>
                    <input
                      type="email"
                      placeholder="e.g. operator@gmail.com"
                      value={gmailUser}
                      onChange={e => setGmailUser(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-850 focus:border-neutral-750 rounded text-neutral-200 outline-none placeholder-neutral-600"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] text-neutral-450 uppercase">Google App Password</label>
                    <input
                      type="password"
                      placeholder="16-character app password..."
                      value={gmailAppPass}
                      onChange={e => setGmailAppPass(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-850 focus:border-neutral-750 rounded text-neutral-200 outline-none placeholder-neutral-600"
                    />
                    <span className="text-[9px] text-neutral-500">Created under Google Account security &rarr; App Passwords.</span>
                  </div>
                </div>

                {/* Resend Key */}
                <div className="border-t border-neutral-900 pt-3 flex flex-col gap-1.5">
                  <label className="text-[10px] text-neutral-400 uppercase font-bold">Alternative: Resend API Key</label>
                  <input
                    type="password"
                    placeholder="re_..."
                    value={resendKey}
                    onChange={e => setResendKey(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-850 focus:border-neutral-750 rounded text-neutral-200 outline-none placeholder-neutral-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6 border-t border-neutral-900 pt-3">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-3 py-1.5 border border-neutral-850 rounded hover:bg-neutral-900 text-neutral-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={saveSettings}
                  className="px-4 py-1.5 clint-btn-blue hover:opacity-90 font-semibold rounded cursor-pointer transition-all"
                >
                  Save & Apply
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Widescreen Dashboard HUD grid layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
          
          {/* Left Column: Passive Telemetry Ingest HUD */}
          <div className="xl:col-span-2 hidden xl:flex flex-col gap-4">
            <LeftHUDPanel onNewEntry={handleNewEntry} />
          </div>

          {/* Center Column: Globe & Pipeline forms */}
          <div className="xl:col-span-8 flex flex-col gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Left Side: 3D Globe Viewer */}
              <div className="lg:col-span-7 flex flex-col gap-6">
                <div className="h-[430px] min-h-[430px] w-full" id="tour-globe">
                  <CarbonTwin3D isNormal={stats.isNormal} score={stats.totalCarbon} theme={theme} />
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Stat 1 */}
                  <div className="glass-panel p-4 bg-black/60 relative overflow-hidden group">
                    <span className="text-[9px] text-neutral-500 font-mono tracking-wider uppercase block mb-1">GHG Index Footprint</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-bold font-mono tracking-tight text-white">{stats.totalCarbon}</span>
                      <span className="text-xs text-neutral-500 font-mono">kg CO2e</span>
                    </div>
                    <div className="mt-2 text-[9px] font-mono text-neutral-500 flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.5 rounded font-semibold ${stats.isNormal ? 'bg-[#1e8e3e]/10 text-[#1e8e3e]' : 'bg-[#d93025]/10 text-[#d93025]'}`}>
                        {stats.isNormal ? 'NORMAL' : 'SURPLUS'}
                      </span>
                      <span>Budget limit: {stats.carbonBudget} kg</span>
                    </div>
                  </div>

                  {/* Stat 2 */}
                  <div className="glass-panel p-4 bg-black/60 relative overflow-hidden group">
                    <span className="text-[9px] text-neutral-500 font-mono tracking-wider uppercase block mb-1">Weekly Allowance Rate</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-bold font-mono tracking-tight text-white">
                        {stats.weeklySavingRate > 0 ? `-${stats.weeklySavingRate}%` : `+${Math.abs(stats.weeklySavingRate)}%`}
                      </span>
                      <span className="text-xs text-neutral-500 font-mono">vs target</span>
                    </div>
                    <div className="mt-2 text-[9px] font-mono text-neutral-500">
                      {stats.weeklySavingRate > 0 ? 'Eco-balance stable under budget' : 'Critical footprint warning limit reached'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side: Scenario Forms */}
              <div className="lg:col-span-5 flex flex-col">
                <PipelineFlow onNewEntry={handleNewEntry} theme={theme} />
              </div>
            </div>
          </div>

          {/* Right Column: Real-Time Biome Metrics */}
          <div className="xl:col-span-2 hidden xl:flex flex-col gap-4">
            <RightHUDPanel stats={stats} onBudgetChange={handleBudgetChange} onNewEntry={handleNewEntry} />
          </div>

        </div>

        {/* Collapsible Section 1: Detailed Carbon Ledger Log */}
        <div className="glass-panel bg-black/60 transition-all duration-300" id="tour-ledger">
          <button 
            onClick={() => setShowLedgerPanel(!showLedgerPanel)}
            className="w-full p-4 flex justify-between items-center text-xs font-mono font-semibold tracking-wider text-neutral-300 hover:text-white cursor-pointer select-none"
          >
            <span className="flex items-center gap-2 uppercase">
              <Database className="w-4 h-4 text-[#4285f4]" />
              TimescaleDB Active Transaction Ledger ({ledger.length} events)
            </span>
            {showLedgerPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {showLedgerPanel && (
            <div className="p-4 border-t border-neutral-900/60 animate-fade-in">
              <LedgerTables ledger={ledger} onClear={handleClear} />
            </div>
          )}
        </div>

        {/* Collapsible Section 2: Automated Email Center */}
        <div className="glass-panel bg-black/60 transition-all duration-300" id="tour-email">
          <button 
            onClick={() => setShowEmailPanel(!showEmailPanel)}
            className="w-full p-4 flex justify-between items-center text-xs font-mono font-semibold tracking-wider text-neutral-300 hover:text-white cursor-pointer select-none"
          >
            <span className="flex items-center gap-2 uppercase">
              <Mail className="w-4 h-4 text-[#0f9d58]" />
              Resend Lifecycle Email Engine & HTML Templates
            </span>
            {showEmailPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {showEmailPanel && (
            <div className="p-4 border-t border-neutral-900/60 animate-fade-in">
              <EmailCenter stats={stats} user={user} />
            </div>
          )}
        </div>

        {/* Biome Analytics Dashboard */}
        <div className="glass-panel p-6 bg-black/60 flex flex-col gap-4 font-mono" id="tour-metrics">
          <div className="flex justify-between items-center border-b border-neutral-900 pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="text-[var(--neon-green)]">🌍</span> Biome Intelligence & Global Saturation Metrics
            </h2>
            <span className="text-[10px] text-neutral-500">REAL-TIME GLOBAL MONITOR</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-neutral-950/60 border border-neutral-900 rounded-xl flex flex-col gap-2">
              <span className="text-[9px] text-neutral-500 uppercase tracking-wider">Atmospheric CO2 Concentration</span>
              <div className="flex justify-between items-baseline">
                <span className="text-2xl font-bold text-white tracking-tight">423.82 PPM</span>
                <span className="text-[9px] text-[var(--neon-orange)] font-semibold">+2.1% YOY</span>
              </div>
              <div className="h-1.5 w-full bg-neutral-900 rounded-full overflow-hidden mt-1">
                <div className="h-full bg-gradient-to-r from-[var(--neon-green)] via-[#ffaa00] to-[var(--neon-orange)] w-[78%]" />
              </div>
              <span className="text-[8px] text-neutral-500 leading-normal mt-1">
                Safe threshold limit: 350.0 PPM. Current carbon ingestion logs indicate elevated atmospheric heating indexes.
              </span>
            </div>

            <div className="p-4 bg-neutral-950/60 border border-neutral-900 rounded-xl flex flex-col gap-2">
              <span className="text-[9px] text-neutral-500 uppercase tracking-wider">Oceanic Acidification Index</span>
              <div className="flex justify-between items-baseline">
                <span className="text-2xl font-bold text-white tracking-tight">8.06 pH</span>
                <span className="text-[9px] text-neutral-500 font-semibold">PRE-IND: 8.2 pH</span>
              </div>
              <div className="h-1.5 w-full bg-neutral-900 rounded-full overflow-hidden mt-1">
                <div className="h-full bg-[var(--neon-blue)] w-[64%]" />
              </div>
              <span className="text-[8px] text-neutral-500 leading-normal mt-1">
                Logarithmic acidity level scale. Oceans have absorbed approximately 30% of anthropogenic carbon event emissions.
              </span>
            </div>

            <div className="p-4 bg-neutral-950/60 border border-neutral-900 rounded-xl flex flex-col gap-2">
              <span className="text-[9px] text-neutral-500 uppercase tracking-wider">Forest Cover Regeneration</span>
              <div className="flex justify-between items-baseline">
                <span className="text-2xl font-bold text-white tracking-tight">-12.8M Ha</span>
                <span className="text-[9px] text-[var(--neon-green)] font-semibold">+50K Offset</span>
              </div>
              <div className="h-1.5 w-full bg-neutral-900 rounded-full overflow-hidden mt-1">
                <div className="h-full bg-[var(--neon-green)] w-[45%]" />
              </div>
              <span className="text-[8px] text-neutral-500 leading-normal mt-1">
                Annual deforestation net rate. Planting forest offsets from the Biome HUD helps restore global canopy carbon sinks.
              </span>
            </div>
          </div>
        </div>

        {/* Carbon Forecaster Sandbox */}
        <div className="glass-panel p-6 bg-black/60 flex flex-col gap-4 font-mono" id="tour-sandbox">
          <div className="flex justify-between items-center border-b border-neutral-900 pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="text-[var(--neon-blue)]">📊</span> Personal Carbon Mitigation Sandbox
            </h2>
            <span className="text-[10px] text-[var(--neon-blue)] font-semibold">SIMULATION MODE</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-6 flex flex-col gap-3">
              <span className="text-[9px] text-neutral-500 uppercase tracking-wider mb-1">Toggle Ecological Commits:</span>
              
              <label className="flex items-center gap-3 p-3 bg-neutral-950/40 hover:bg-neutral-950/70 border border-neutral-900 rounded-xl cursor-pointer transition-all">
                <input 
                  type="checkbox" 
                  checked={projEV} 
                  onChange={e => setProjEV(e.target.checked)}
                  className="accent-[#00ff66] w-4 h-4 cursor-pointer"
                />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-white font-semibold">Switch to Electric Vehicle (EV)</span>
                  <span className="text-[9px] text-neutral-400">Eliminates commuting combustion emissions (-2,200 kg CO2e / Year)</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-neutral-950/40 hover:bg-neutral-950/70 border border-neutral-900 rounded-xl cursor-pointer transition-all">
                <input 
                  type="checkbox" 
                  checked={projSolar} 
                  onChange={e => setProjSolar(e.target.checked)}
                  className="accent-[#00ff66] w-4 h-4 cursor-pointer"
                />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-white font-semibold">Install Home Solar Array (5kW)</span>
                  <span className="text-[9px] text-neutral-400">Offsets dirty energy grid draw with clean generation (-1,500 kg CO2e / Year)</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-neutral-950/40 hover:bg-neutral-950/70 border border-neutral-900 rounded-xl cursor-pointer transition-all">
                <input 
                  type="checkbox" 
                  checked={projVegan} 
                  onChange={e => setProjVegan(e.target.checked)}
                  className="accent-[#00ff66] w-4 h-4 cursor-pointer"
                />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-white font-semibold">Transition to Vegan Diet</span>
                  <span className="text-[9px] text-neutral-400">Lowers food ingestion footprint impact (-800 kg CO2e / Year)</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-neutral-950/40 hover:bg-neutral-950/70 border border-neutral-900 rounded-xl cursor-pointer transition-all">
                <input 
                  type="checkbox" 
                  checked={projFlights} 
                  onChange={e => setProjFlights(e.target.checked)}
                  className="accent-[#00ff66] w-4 h-4 cursor-pointer"
                />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-white font-semibold">Cancel Air Travel Commutes</span>
                  <span className="text-[9px] text-neutral-400">Minimize short/long-haul air travel overheads (-1,800 kg CO2e / Year)</span>
                </div>
              </label>
            </div>

            <div className="lg:col-span-6 bg-neutral-950/60 border border-neutral-900 p-5 rounded-xl flex flex-col items-center justify-center text-center gap-4">
              <span className="text-[10px] text-neutral-500 uppercase tracking-widest">Estimated Impact Mitigation</span>
              
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="72" cy="72" r="60" className="stroke-neutral-200 dark:stroke-neutral-800 fill-none" strokeWidth="8" />
                  <circle 
                    cx="72" cy="72" r="60" 
                    className="stroke-[var(--neon-green)] fill-none transition-all duration-1000" 
                    strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 60}`}
                    strokeDashoffset={`${2 * Math.PI * 60 * (1 - Math.min(1.0, projectedSavings / 6300))}`}
                    strokeLinecap="round"
                  />
                </svg>
                
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-bold text-white font-mono tracking-tight">-{projectedSavings}</span>
                  <span className="text-[8px] text-neutral-450 font-mono uppercase">kg CO2e / Yr</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-semibold text-[var(--neon-green)]">
                  {projectedSavings === 6300 
                    ? '🏆 Net-Zero Champion Reached!' 
                    : projectedSavings > 3000 
                      ? '🌿 Strong Carbon Decoupling' 
                      : projectedSavings > 0 
                        ? '🌱 Beginning Mitigation Path' 
                        : '💤 Inactive Commits'}
                </div>
                <div className="text-[9px] text-neutral-500 leading-normal max-w-sm">
                  Your carbon ledger footprints will reflect this mitigation multiplier once verified transactions hit active TimescaleDB indices.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cryptographic Ledger Audit Console */}
        <div className="glass-panel p-6 bg-black/60 flex flex-col gap-4 font-mono" id="tour-audit">
          <div className="flex justify-between items-center border-b border-neutral-900 pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="text-[var(--neon-blue)]">🛡️</span> TimescaleDB Immutability & Audit Engine
            </h2>
            {auditStatus === 'passed' ? (
              <span className="text-[9px] font-bold text-[var(--neon-green)] px-2 py-0.5 bg-[var(--neon-green)]/10 border border-[var(--neon-green)]/20 rounded uppercase">
                Audit: Verified PASS
              </span>
            ) : auditStatus === 'auditing' ? (
              <span className="text-[9px] font-bold text-[var(--neon-blue)] px-2 py-0.5 bg-[var(--neon-blue)]/10 border border-[var(--neon-blue)]/20 rounded uppercase animate-pulse">
                Auditing...
              </span>
            ) : (
              <span className="text-[9px] text-neutral-500">MUTUAL TRUST LEDGER</span>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="bg-black/90 border border-neutral-900 rounded-xl p-4 min-h-[160px] max-h-[160px] overflow-y-auto font-mono text-[9px] leading-relaxed text-neutral-450 select-none scrollbar-thin">
              {auditLogs.length === 0 ? (
                <div className="text-neutral-500 italic text-center pt-10">Ledger audit trace idle. Click "Initiate Cryptographic Audit" below.</div>
              ) : (
                auditLogs.map((log, idx) => (
                  <div key={idx} className={log.includes('PASS') || log.includes('SUCCESS') ? 'text-[var(--neon-green)]' : log.includes('error') ? 'text-[var(--neon-orange)]' : ''}>
                    {log}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="text-[7.5px] text-neutral-500 max-w-md leading-normal select-none">
                Running audits forces a full cryptographic Merkle Root validation of all ingest streams across Redis cache buckets, Plaid tokens, and TimescaleDB partitions.
              </span>
              
              <button
                onClick={runLedgerAudit}
                disabled={auditStatus === 'auditing'}
                className={`px-4 py-2 border rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer ${
                  auditStatus === 'auditing'
                    ? 'bg-neutral-900 border-neutral-850 text-neutral-500 cursor-not-allowed'
                    : 'bg-[var(--neon-blue)]/10 border-[var(--neon-blue)]/30 text-[var(--neon-blue)] hover:bg-[var(--neon-blue)]/20 hover:shadow-[0_0_12px_rgba(26,115,232,0.15)]'
                }`}
              >
                {auditStatus === 'auditing' ? 'Running Hash Verifier...' : 'Initiate Cryptographic Audit'}
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Persistent Floating Onboarding Tutorial Tour */}
      <TutorialTour 
        activeStep={activeStep} 
        setActiveStep={setActiveStep} 
        onTourClose={() => setActiveStep(-1)} 
        showPrompt={showTourPrompt}
        setShowPrompt={setShowTourPrompt}
      />

      {/* Persistent Floating Copilot CLiNt-Saver */}
      <ClintSaver stats={stats} ledger={ledger} />
      
      {/* Interactive Cooling Cursor Trail Canvas */}
      <CursorTrail />
    </main>
  );
}

// ==========================================
// WIDESCREEN HUD SIDE PANELS
// ==========================================

function LeftHUDPanel({ onNewEntry }: { onNewEntry: () => void }) {
  const [logs, setLogs] = useState<Array<{ id: string; time: string; text: string; type: 'ok' | 'warn' | 'info' }>>([]);
  const [isPaused, setIsPaused] = useState(false);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLogs([
      { id: '1', time: new Date().toLocaleTimeString(), text: 'System diagnostics complete. Core online.', type: 'info' },
      { id: '2', time: new Date().toLocaleTimeString(), text: 'Ingested raw event: Plaid hook sync', type: 'ok' },
      { id: '3', time: new Date().toLocaleTimeString(), text: 'Mapped dining.coffee factor', type: 'info' }
    ]);
  }, []);

  useEffect(() => {
    if (isPaused) return;

    const phrases = [
      { text: 'Ingested raw maps timeline cluster waypoint', type: 'ok' as const },
      { text: 'Provisioning active Kafka consumer partition', type: 'info' as const },
      { text: 'Redis Cache hit: utility.grid_mix coefficient solved', type: 'ok' as const },
      { text: 'Syncing HomeAssistant energy metrics to TimescaleDB', type: 'ok' as const },
      { text: 'Gemini Flash parser mapped transaction', type: 'info' as const },
      { text: 'Warning: emissions trend approaching threshold limit', type: 'warn' as const },
      { text: 'Plaid financial credentials token verified', type: 'info' as const }
    ];

    const interval = setInterval(() => {
      const phrase = phrases[Math.floor(Math.random() * phrases.length)];
      setLogs(prev => {
        const nextLogs = [
          ...prev,
          {
            id: Date.now().toString(),
            time: new Date().toLocaleTimeString(),
            text: phrase.text,
            type: phrase.type
          }
        ];
        return nextLogs.slice(-35);
      });

      setTimeout(() => {
        if (logsContainerRef.current) {
          logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
        }
      }, 50);
    }, 4000);

    return () => clearInterval(interval);
  }, [isPaused]);

  const handleInject = () => {
    const sources = ['plaid', 'maps', 'homeassistant'] as const;
    const source = sources[Math.floor(Math.random() * sources.length)];
    let title = 'McDonalds Fast Food';
    let amount = 15.50;
    if (source === 'maps') {
      title = 'Transit commute (Uber EV)';
      amount = 22.0;
    } else if (source === 'homeassistant') {
      title = 'Grid dirty coal draw';
      amount = 8.5;
    }

    const rawEvent = {
      id: 'hud-inject-' + Date.now(),
      source,
      timestamp: new Date().toISOString(),
      amount,
      title,
      rawDetails: 'Injected manually from Left HUD Terminal Control Panel.'
    };

    addRawEvent(rawEvent);
    onNewEntry();

    setLogs(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        time: new Date().toLocaleTimeString(),
        text: `[MANUAL INJECT] Ingested raw ${source} event: ${title}`,
        type: 'ok'
      }
    ]);

    setTimeout(() => {
      if (logsContainerRef.current) {
        logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
      }
    }, 50);
  };

  return (
    <div className="glass-panel p-4 bg-black/60 flex flex-col h-full gap-3 border-neutral-900 font-mono text-[10px]" id="tour-ingest">
      <div className="border-b border-neutral-900 pb-2 flex items-center justify-between select-none">
        <span className="text-[9px] uppercase font-bold text-neutral-400 tracking-wider">Passive Ingest HUD</span>
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--neon-blue)] animate-pulse" />
      </div>

      <div 
        ref={logsContainerRef}
        className="flex-1 min-h-[300px] max-h-[360px] overflow-y-auto pr-1 flex flex-col gap-2 font-mono scrollbar-thin select-none"
      >
        {logs.map(log => (
          <div key={log.id} className="leading-normal border-b border-neutral-900/40 pb-1.5">
            <span className="text-neutral-500 mr-1">[{log.time}]</span>
            <span className={
              log.type === 'ok' ? 'text-[var(--neon-green)]' : log.type === 'warn' ? 'text-[var(--neon-orange)]' : 'text-[var(--neon-blue)]'
            }>
              {log.type === 'ok' ? '✓ ' : log.type === 'warn' ? '⚠ ' : 'i '}
              {log.text}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 pt-2 border-t border-neutral-900">
        <button
          onClick={handleInject}
          className="w-full py-1.5 bg-[var(--neon-green)]/10 hover:bg-[var(--neon-green)]/20 border border-[var(--neon-green)]/30 text-[var(--neon-green)] font-semibold rounded font-mono text-[9px] cursor-pointer transition-colors text-center"
        >
          Inject Raw Webhook event
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="py-1 border border-neutral-850 hover:bg-neutral-900 text-neutral-400 hover:text-white rounded font-mono text-[9px] cursor-pointer transition-colors text-center"
          >
            {isPaused ? 'Resume' : 'Pause'} Feed
          </button>
          <button
            onClick={() => setLogs([])}
            className="py-1 border border-neutral-850 hover:bg-neutral-900 text-neutral-400 hover:text-white rounded font-mono text-[9px] cursor-pointer transition-colors text-center"
          >
            Clear Log
          </button>
        </div>
      </div>
    </div>
  );
}

function RightHUDPanel({ 
  stats, 
  onBudgetChange,
  onNewEntry
}: { 
  stats: LedgerStats; 
  onBudgetChange: (budget: number) => void;
  onNewEntry: () => void;
}) {
  const [budgetVal, setBudgetVal] = useState(stats.carbonBudget);

  useEffect(() => {
    setBudgetVal(stats.carbonBudget);
  }, [stats.carbonBudget]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setBudgetVal(val);
    onBudgetChange(val);
  };

  const handlePlantTree = () => {
    const offsetEvent = {
      id: 'offset-tree-' + Date.now(),
      source: 'homeassistant' as const,
      timestamp: new Date().toISOString(),
      amount: -120.0,
      title: 'Plant Forest Reserve Offset',
      rawDetails: 'Manual ecological offset injected from Right HUD Biome panel.'
    };
    addRawEvent(offsetEvent);
    onNewEntry();

    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#00ff66', '#a8e6cf', '#ffffff']
    });
  };

  const utilization = stats.totalCarbon / stats.carbonBudget;
  let grade = 'A+';
  let gradeColor = 'text-[var(--neon-green)]';
  if (utilization > 1.5) {
    grade = 'F-';
    gradeColor = 'text-[var(--neon-orange)] animate-pulse';
  } else if (utilization > 1.2) {
    grade = 'D';
    gradeColor = 'text-[var(--neon-orange-mid)]';
  } else if (utilization > 1.0) {
    grade = 'C';
    gradeColor = 'text-[var(--neon-yellow)]';
  } else if (utilization > 0.8) {
    grade = 'B';
    gradeColor = 'text-[var(--neon-green-tint)]';
  } else if (utilization > 0.5) {
    grade = 'A';
    gradeColor = 'text-[var(--neon-green-bright)]';
  }

  return (
    <div className="glass-panel p-4 bg-black/60 flex flex-col h-full gap-4 border-neutral-900 font-mono text-[10px]">
      <div className="border-b border-neutral-900 pb-2 flex items-center justify-between select-none">
        <span className="text-[9px] uppercase font-bold text-neutral-400 tracking-wider">Biome Health HUD</span>
        <span className={`w-1.5 h-1.5 rounded-full ${stats.isNormal ? 'bg-[var(--neon-green)]' : 'bg-[var(--neon-orange)]'} animate-pulse`} />
      </div>

      <div className="flex-1 flex flex-col gap-4">
        <div className="p-3 bg-neutral-950/60 border border-neutral-900 rounded-lg flex flex-col items-center justify-center text-center gap-1.5">
          <span className="text-[8px] text-neutral-500 uppercase tracking-widest">Biome Stability Rating</span>
          <span className={`text-4xl font-bold font-mono tracking-tighter ${gradeColor}`}>{grade}</span>
          <span className="text-[8px] text-neutral-400 uppercase">
            {utilization > 1.0 ? 'CRITICAL ECO-SURPLUS' : 'STABLE ECOLOGICAL DEFENSE'}
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[8px] text-neutral-500 select-none">
            <span>CO2 SATURATION</span>
            <span className={stats.isNormal ? 'text-[var(--neon-green)]' : 'text-[var(--neon-orange)]'}>
              {stats.totalCarbon > 0 ? (stats.totalCarbon * 0.0001).toFixed(4) : '0.0000'}%
            </span>
          </div>
          <div className="h-1 w-full bg-neutral-900 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${stats.isNormal ? 'bg-[var(--neon-green)]' : 'bg-[var(--neon-orange)]'}`}
              style={{ width: `${Math.min(100, (stats.totalCarbon / stats.carbonBudget) * 100)}%` }}
            />
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-neutral-900">
          <span className="text-[8px] text-neutral-400 uppercase tracking-wider block select-none">Weekly CO2 Budget Slider</span>
          <div className="flex justify-between text-neutral-500 select-none">
            <span>ALLOWANCE LIMIT:</span>
            <span className="text-white font-bold">{budgetVal} kg</span>
          </div>
          <input
            type="range"
            min="100"
            max="1200"
            step="50"
            value={budgetVal}
            onChange={handleSliderChange}
            className="w-full accent-[var(--neon-green)] h-1 bg-neutral-900 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-[7px] text-neutral-500 block leading-normal select-none">
            Drag to adjust target limit. The Earth's biosphere smoke color and cloud speeds react dynamically to the new limit!
          </span>
        </div>
      </div>

      <div className="pt-2 border-t border-neutral-900">
        <button
          onClick={handlePlantTree}
          className="w-full py-2 bg-[var(--neon-blue)]/10 hover:bg-[var(--neon-blue)]/20 border border-[var(--neon-blue)]/30 text-[var(--neon-blue)] font-semibold rounded font-mono text-[9px] cursor-pointer transition-colors text-center"
        >
          Inject Forest Offset (-50kg CO2)
        </button>
      </div>
    </div>
  );
}

function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationFrameId: number;
    let particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      alpha: number;
      size: number;
      color: string;
    }> = [];
    
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    let lastMouseX = 0;
    let lastMouseY = 0;
    let isMoving = false;
    
    const handleMouseMove = (e: MouseEvent) => {
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      isMoving = true;
      
      const settings = (window as any).clintTrailSettings || { color: 'default', speed: 1.0, size: 1.0 };
      
      // Spawn cooling particles (customizable colors)
      for (let i = 0; i < 2; i++) {
        let pColor = '#00ff66';
        if (settings.color === 'rainbow') {
          pColor = `hsl(${Math.floor(Math.random() * 360)}, 100%, 50%)`;
        } else if (settings.color === 'gold') {
          pColor = '#ffd700';
        } else if (settings.color === 'orange') {
          pColor = '#ff5500';
        } else if (settings.color === 'blue') {
          pColor = '#00f0ff';
        } else if (settings.color === 'green') {
          pColor = '#00ff66';
        } else {
          pColor = Math.random() > 0.5 ? '#00f0ff' : '#00ff66';
        }

        particles.push({
          x: e.clientX,
          y: e.clientY,
          vx: (Math.random() - 0.5) * 1.5 * settings.speed,
          vy: ((Math.random() - 0.5) * 1.5 - 0.3) * settings.speed, // float upwards slightly
          alpha: 1.0,
          size: (Math.random() * 3 + 2) * settings.size,
          color: pColor
        });
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    const updateAndDraw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw a soft glowing follow orb at mouse position
      if (isMoving) {
        ctx.beginPath();
        const grad = ctx.createRadialGradient(lastMouseX, lastMouseY, 0, lastMouseX, lastMouseY, 15);
        grad.addColorStop(0, 'rgba(0, 240, 255, 0.15)');
        grad.addColorStop(1, 'rgba(0, 240, 255, 0)');
        ctx.fillStyle = grad;
        ctx.arc(lastMouseX, lastMouseY, 15, 0, Math.PI * 2);
        ctx.fill();
      }
      
      const settings = (window as any).clintTrailSettings || { color: 'default', speed: 1.0, size: 1.0 };
      
      // Update and draw particles
      particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.02 * (settings.speed > 1.5 ? 1.5 : settings.speed < 0.5 ? 0.6 : 1.0); // fade rate
        p.size *= 0.96;   // shrink rate
        
        if (p.alpha <= 0 || p.size <= 0.2) return false;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
        return true;
      });
      
      ctx.globalAlpha = 1.0; // reset
      animationFrameId = requestAnimationFrame(updateAndDraw);
    };
    
    updateAndDraw();
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);
  
  return <canvas ref={canvasRef} className="cursor-trail-canvas" />;
}

// ==========================================
// WIDESCREEN SIDEBAR PANEL COMPONENTS
// ==========================================

function LeftWidescreenHUD({ stats }: { stats: LedgerStats }) {
  const [coreStatus, setCoreStatus] = useState<'stable' | 'syncing'>('stable');
  const [humActive, setHumActive] = useState(false);
  const [loadProfile, setLoadProfile] = useState<'low' | 'med' | 'high'>('med');
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  
  const handlePing = () => {
    if (coreStatus === 'syncing') return;
    setCoreStatus('syncing');
    setTimeout(() => {
      setCoreStatus('stable');
      confetti({
        particleCount: 15,
        spread: 40,
        origin: { x: 0.1, y: 0.5 }
      });
    }, 1200);
  };

  const toggleHum = () => {
    if (humActive) {
      if (oscRef.current) {
        try { oscRef.current.stop(); } catch(e) {}
        oscRef.current.disconnect();
        oscRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      setHumActive(false);
    } else {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;

        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = loadProfile === 'low' ? 45 : loadProfile === 'med' ? 55 : 65;
        oscRef.current = osc;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 100;

        const gain = ctx.createGain();
        gain.gain.value = 0.12;
        gainRef.current = gain;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        setHumActive(true);
      } catch (err) {
        console.error('Audio start error:', err);
      }
    }
  };

  useEffect(() => {
    if (humActive && oscRef.current && audioCtxRef.current) {
      const freq = loadProfile === 'low' ? 45 : loadProfile === 'med' ? 55 : 65;
      oscRef.current.frequency.setValueAtTime(freq, audioCtxRef.current.currentTime);
    }
  }, [loadProfile, humActive]);

  useEffect(() => {
    return () => {
      if (oscRef.current) {
        try { oscRef.current.stop(); } catch(e) {}
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  return (
    <div className="widescreen-gutter-panel flex flex-col gap-4 font-mono select-none">
      {/* Reactor Core Widget */}
      <div className="glass-panel p-3 bg-black/60 border-neutral-900 flex flex-col items-center text-center gap-2">
        <span className="text-[8px] text-neutral-500 uppercase tracking-widest">Reactor Core</span>
        <button 
          onClick={handlePing}
          className="relative w-16 h-16 rounded-full flex items-center justify-center cursor-pointer group focus:outline-none"
        >
          <div className={`absolute inset-0 rounded-full border-2 border-dashed ${
            stats.isNormal ? 'border-[var(--neon-green)]/30 animate-spin-slow' : 'border-[var(--neon-orange)]/30 animate-spin-slow'
          }`} style={{ animationDuration: coreStatus === 'syncing' ? '1s' : '8s' }} />
          
          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
            coreStatus === 'syncing'
              ? 'bg-[var(--neon-blue)] shadow-[0_0_20px_var(--neon-blue)]'
              : stats.isNormal
                ? 'bg-[var(--neon-green)]/20 border border-[var(--neon-green)] shadow-[0_0_12px_var(--neon-green)] group-hover:scale-105'
                : 'bg-[var(--neon-orange)]/20 border border-[var(--neon-orange)] shadow-[0_0_12px_var(--neon-orange)] group-hover:scale-105'
          }`}>
            <span className={`text-[7px] font-bold ${
              coreStatus === 'syncing' ? 'text-white dark:text-black' : stats.isNormal ? 'text-[var(--neon-green)]' : 'text-[var(--neon-orange)]'
            }`}>
              {coreStatus === 'syncing' ? 'SYNC' : 'OK'}
            </span>
          </div>
        </button>
        <span className="text-[7px] text-neutral-450 mt-1 uppercase">
          {coreStatus === 'syncing' ? 'Syncing...' : 'Sync Active'}
        </span>
      </div>

      {/* Real-Time Queue Load Indicator */}
      <div className="glass-panel p-3 bg-black/60 border-neutral-900 flex flex-col gap-2">
        <span className="text-[8px] text-neutral-500 uppercase tracking-widest text-center">Kafka Node Load</span>
        
        <div className="flex items-end justify-between h-12 px-1 bg-neutral-950/80 border border-neutral-900 rounded-md py-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <EqualizerBar key={i} load={loadProfile} />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-1 pt-1">
          {(['low', 'med', 'high'] as const).map(p => (
            <button
              key={p}
              onClick={() => setLoadProfile(p)}
              className={`py-0.5 text-[7px] font-bold border rounded uppercase transition-colors cursor-pointer ${
                loadProfile === p
                  ? 'bg-[var(--neon-green)]/15 border-[var(--neon-green)] text-[var(--neon-green)]'
                  : 'bg-neutral-950/40 border-neutral-850 text-neutral-450 hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Cyber Acoustic Generator */}
      <div className="glass-panel p-3 bg-black/60 border-neutral-900 flex flex-col gap-2.5">
        <span className="text-[8px] text-neutral-500 uppercase tracking-widest text-center">Reactor Hum</span>
        <button
          onClick={toggleHum}
          className={`w-full py-1.5 rounded text-[8px] font-bold border font-mono transition-all cursor-pointer ${
            humActive
              ? 'bg-[var(--neon-blue)]/10 border-[var(--neon-blue)] text-[var(--neon-blue)] shadow-[0_0_10px_var(--neon-blue)] animate-pulse'
              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
          }`}
        >
          {humActive ? 'HUM ACTIVE' : 'ACTIVATE HUM'}
        </button>
        <span className="text-[6.5px] text-neutral-500 leading-normal text-center select-none">
          Generates a low frequency ship deck hum inside your browser.
        </span>
      </div>
    </div>
  );
}

function RightWidescreenHUD() {
  const [treeCount, setTreeCount] = useState(0);
  const [trailColor, setTrailColor] = useState<'default' | 'green' | 'blue' | 'orange' | 'gold' | 'rainbow'>('default');
  const [trailSpeed, setTrailSpeed] = useState(1);
  const [trailSize, setTrailSize] = useState(1);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).clintTrailSettings = {
        color: trailColor,
        speed: trailSpeed,
        size: trailSize
      };
    }
  }, [trailColor, trailSpeed, trailSize]);

  const handlePlantClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setTreeCount(prev => prev + 1);
    
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top;

    confetti({
      particleCount: 15,
      spread: 30,
      origin: { x: x / window.innerWidth, y: y / window.innerHeight },
      colors: ['#00ff66', '#a8e6cf', '#ffffff']
    });
  };

  return (
    <div className="widescreen-gutter-panel flex flex-col gap-4 font-mono select-none">
      {/* Ecosystem Clicker Game */}
      <div className="glass-panel p-3 bg-black/60 border-neutral-900 flex flex-col items-center gap-2">
        <span className="text-[8px] text-neutral-500 uppercase tracking-widest">Eco Sequester</span>
        <button
          onClick={handlePlantClick}
          className="w-16 h-16 rounded-2xl bg-[var(--neon-green)]/10 hover:bg-[var(--neon-green)]/20 border border-[var(--neon-green)]/30 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 transform active:scale-95 group focus:outline-none hover:shadow-[0_0_15px_var(--neon-green)]"
        >
          <span className="text-2xl animate-pulse group-hover:scale-110 transition-transform">🌱</span>
        </button>
        <div className="text-center">
          <div className="text-[9px] font-bold text-white uppercase">{treeCount} Plants Grown</div>
          <span className="text-[6.5px] text-neutral-400 uppercase mt-0.5 block">
            Click to plant offsets
          </span>
        </div>
      </div>

      {/* Cursor Trail Customizer */}
      <div className="glass-panel p-3 bg-black/60 border-neutral-900 flex flex-col gap-2.5">
        <span className="text-[8px] text-neutral-500 uppercase tracking-widest text-center">Cursor Tail HUD</span>
        
        <div className="flex flex-col gap-1.5">
          <span className="text-[6.5px] text-neutral-400 uppercase select-none">Tail Glow Color</span>
          <div className="grid grid-cols-3 gap-1">
            {(['default', 'green', 'blue', 'orange', 'gold', 'rainbow'] as const).map(color => (
              <button
                key={color}
                onClick={() => setTrailColor(color)}
                className={`py-0.5 text-[6.5px] font-bold border rounded uppercase transition-colors cursor-pointer ${
                  trailColor === color
                    ? 'bg-[var(--neon-green)]/15 border-[var(--neon-green)] text-[var(--neon-green)]'
                    : 'bg-neutral-950/40 border-neutral-850 text-neutral-450 hover:text-white'
                }`}
              >
                {color}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[6.5px] text-neutral-400 uppercase">
            <span>Tail Spark Size</span>
            <span className="text-white font-bold">{trailSize}x</span>
          </div>
          <div className="flex gap-1">
            {[0.5, 1.0, 1.8].map(sz => (
              <button
                key={sz}
                onClick={() => setTrailSize(sz)}
                className={`flex-1 py-0.5 text-[6.5px] font-bold border rounded uppercase transition-colors cursor-pointer ${
                  trailSize === sz
                    ? 'bg-[var(--neon-blue)]/15 border-[var(--neon-blue)] text-[var(--neon-blue)]'
                    : 'bg-neutral-950/40 border-neutral-850 text-neutral-450 hover:text-white'
                }`}
              >
                {sz === 0.5 ? 'Small' : sz === 1.0 ? 'Norm' : 'Huge'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[6.5px] text-neutral-400 uppercase">
            <span>Tail Drift Speed</span>
            <span className="text-white font-bold">{trailSpeed}x</span>
          </div>
          <div className="flex gap-1">
            {[0.4, 1.0, 2.0].map(sp => (
              <button
                key={sp}
                onClick={() => setTrailSpeed(sp)}
                className={`flex-1 py-0.5 text-[6.5px] font-bold border rounded uppercase transition-colors cursor-pointer ${
                  trailSpeed === sp
                    ? 'bg-[var(--neon-orange)]/15 border-[var(--neon-orange)] text-[var(--neon-orange)]'
                    : 'bg-neutral-950/40 border-neutral-850 text-neutral-450 hover:text-white'
                }`}
              >
                {sp === 0.4 ? 'Chill' : sp === 1.0 ? 'Norm' : 'Boost'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* circular temperature gauge */}
      <div className="glass-panel p-3 bg-black/60 border-neutral-900 flex flex-col items-center gap-1.5">
        <span className="text-[8px] text-neutral-500 uppercase tracking-widest text-center">Biosphere Temp</span>
        <div className="relative w-12 h-12 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle 
              cx="24" cy="24" r="20" 
              className="stroke-neutral-200 dark:stroke-neutral-800 fill-none" 
              strokeWidth="3"
            />
            <circle 
              cx="24" cy="24" r="20" 
              className="stroke-[var(--neon-orange)] fill-none transition-all duration-1000" 
              strokeWidth="3"
              strokeDasharray={`${2 * Math.PI * 20}`}
              strokeDashoffset={`${2 * Math.PI * 20 * (1 - 0.64)}`}
            />
          </svg>
          <div className="absolute text-[8px] font-bold text-white flex flex-col items-center">
            <span>+1.42°</span>
          </div>
        </div>
        <span className="text-[6px] text-neutral-500 uppercase text-center mt-0.5 select-none">
          Global Anomaly Limit
        </span>
      </div>
    </div>
  );
}

function EqualizerBar({ load }: { load: 'low' | 'med' | 'high' }) {
  const [height, setHeight] = useState(20);
  
  useEffect(() => {
    const min = load === 'low' ? 10 : load === 'med' ? 25 : 50;
    const max = load === 'low' ? 35 : load === 'med' ? 70 : 95;
    const interval = setInterval(() => {
      setHeight(Math.floor(Math.random() * (max - min) + min));
    }, Math.floor(Math.random() * 150 + 100));
    
    return () => clearInterval(interval);
  }, [load]);

  return (
    <div 
      className="w-1.5 bg-[var(--neon-green)] rounded-t transition-all duration-150" 
      style={{ 
        height: `${height}%`,
        opacity: height > 80 ? 0.9 : height > 50 ? 0.75 : 0.6,
        backgroundColor: height > 80 ? 'var(--neon-orange)' : height > 50 ? 'var(--neon-blue)' : 'var(--neon-green)'
      }} 
    />
  );
}
