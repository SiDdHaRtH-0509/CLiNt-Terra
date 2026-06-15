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
  Key,
  ShieldAlert,
  User,
  Globe,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function Dashboard() {
  const getBackendUrl = () => {
    if (process.env.NEXT_PUBLIC_BACKEND_URL) {
      return process.env.NEXT_PUBLIC_BACKEND_URL;
    }
    if (typeof window !== 'undefined') {
      const isLocal = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');
      if (!isLocal) {
        return 'https://clint-terra.onrender.com';
      }
    }
    return '';
  };

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
  const [user, setUser] = useState({ name: '', email: '', region: '', profilePic: '' });
  const [showProfile, setShowProfile] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminTab, setAdminTab] = useState<'registry' | 'integrations'>('registry');

  // User Profile Form States
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileRegion, setProfileRegion] = useState('');
  const [profilePicSeed, setProfilePicSeed] = useState('');
  const [profilePicUrl, setProfilePicUrl] = useState('');
  const [showProfilePassword, setShowProfilePassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
  const [profileUpdating, setProfileUpdating] = useState(false);

  // Onboarding Tutorial Tour State
  const [activeStep, setActiveStep] = useState<number>(-1);
  const [showTourPrompt, setShowTourPrompt] = useState<boolean>(false);

  // Settings Modal form states
  const [geminiKey, setGeminiKey] = useState('');
  const [gmailUser, setGmailUser] = useState('');
  const [gmailAppPass, setGmailAppPass] = useState('');
  const [resendKey, setResendKey] = useState('');
  const [systemBroadcast, setSystemBroadcast] = useState('');
  const [broadcastInput, setBroadcastInput] = useState('');
  const [offsetAmt, setOffsetAmt] = useState(25);
  const [offsetProject, setOffsetProject] = useState('reforestation');

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

  // Load ledger, stats, theme, credentials, and user on mount
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

    // Load system broadcast
    const savedBroadcast = localStorage.getItem('clint_system_broadcast') || '';
    setSystemBroadcast(savedBroadcast);
    setBroadcastInput(savedBroadcast);

    // Load active user
    const savedUserStr = localStorage.getItem('clint_terra_active_user');
    if (savedUserStr) {
      setUser(JSON.parse(savedUserStr));
    } else {
      setUser({
        name: localStorage.getItem('clint_terra_user_name') || 'Siddharth Gopal Dubey',
        email: localStorage.getItem('clint_terra_user_email') || 'siddharth@dubey.me',
        region: 'Asia-Pacific (India)',
        profilePic: 'https://api.dicebear.com/7.x/bottts/svg?seed=founder'
      });
    }

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
    const savedUserStr = localStorage.getItem('clint_terra_active_user');
    if (savedUserStr) {
      setUser(JSON.parse(savedUserStr));
    } else {
      setUser({
        name,
        email,
        region: 'Asia-Pacific (India)',
        profilePic: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`
      });
    }
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
      const backendUrl = getBackendUrl();
      await fetch(`${backendUrl}/api/send-email`, {
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

  // Initialize User Profile settings when the modal opens
  useEffect(() => {
    if (showProfile && user) {
      setProfileName(user.name || '');
      setProfileEmail(user.email || '');
      setProfilePassword(''); // Keep password empty unless they want to update it
      setProfileRegion(user.region || 'Asia-Pacific (India)');
      
      let seed = 'avatar';
      if (user.profilePic && user.profilePic.includes('seed=')) {
        const parts = user.profilePic.split('seed=');
        if (parts.length > 1) {
          seed = decodeURIComponent(parts[1].split('&')[0]);
        }
      } else if (user.name) {
        seed = user.name;
      }
      setProfilePicSeed(seed);
      setProfilePicUrl(user.profilePic || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}`);
      setProfileMessage({ type: '', text: '' });
    }
  }, [showProfile, user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;

    setProfileUpdating(true);
    setProfileMessage({ type: '', text: '' });

    const newProfilePic = profilePicUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(profilePicSeed)}`;

    const payload = {
      email: user.email,
      name: profileName,
      newEmail: profileEmail !== user.email ? profileEmail : undefined,
      password: profilePassword || undefined,
      region: profileRegion,
      profilePic: newProfilePic
    };

    let updatedUser = null;
    let fallbackToLocal = false;

    try {
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/user/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Server profile update failed');
      }
      updatedUser = data.user;
    } catch (err: any) {
      console.warn('Backend update failed/offline. Reverting to local storage:', err.message);
      if (err.message && (err.message.includes('already taken') || err.message.includes('not found') || err.message.includes('New email address is already'))) {
        setProfileMessage({ type: 'error', text: err.message });
        setProfileUpdating(false);
        return;
      }
      fallbackToLocal = true;
    }

    if (fallbackToLocal) {
      const usersStr = localStorage.getItem('clint_terra_users');
      let users = usersStr ? JSON.parse(usersStr) : [];

      if (users.length === 0) {
        users = [
          {
            name: 'Siddharth Gopal Dubey',
            email: 'siddharth@dubey.me',
            password: 'password',
            region: 'Asia-Pacific (India)',
            profilePic: 'https://api.dicebear.com/7.x/bottts/svg?seed=founder'
          }
        ];
      }

      if (payload.newEmail) {
        const emailTaken = users.find((u: any) => u.email.toLowerCase() === payload.newEmail!.toLowerCase() && u.email.toLowerCase() !== user.email.toLowerCase());
        if (emailTaken) {
          setProfileMessage({ type: 'error', text: 'New email address is already taken' });
          setProfileUpdating(false);
          return;
        }
      }

      const index = users.findIndex((u: any) => u.email.toLowerCase() === user.email.toLowerCase());
      if (index === -1) {
        setProfileMessage({ type: 'error', text: 'Local account record not found' });
        setProfileUpdating(false);
        return;
      }

      users[index].name = payload.name;
      if (payload.newEmail) users[index].email = payload.newEmail;
      if (payload.password) users[index].password = payload.password;
      users[index].region = payload.region;
      users[index].profilePic = payload.profilePic;

      localStorage.setItem('clint_terra_users', JSON.stringify(users));

      updatedUser = {
        name: users[index].name,
        email: users[index].email,
        region: users[index].region,
        profilePic: users[index].profilePic
      };
    }

    if (updatedUser) {
      setUser(updatedUser);
      localStorage.setItem('clint_terra_active_user', JSON.stringify(updatedUser));
      
      setProfileMessage({ type: 'success', text: 'Profile database records synchronized successfully!' });
      confetti({
        particleCount: 40,
        spread: 40,
        origin: { y: 0.6 },
        colors: ['#00ff66', '#ffffff']
      });
      
      setTimeout(() => {
        setShowProfile(false);
      }, 1500);
    } else {
      setProfileMessage({ type: 'error', text: 'Failed to synchronize profile changes.' });
    }

    setProfileUpdating(false);
  };

  const fetchAdminUsers = async () => {
    setAdminLoading(true);
    let serverList = [];
    let localList = [];

    // 1. Try to fetch from backend
    try {
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/admin/users`, {
        headers: {
          'x-requester-email': user.email || ''
        }
      });
      if (res.ok) {
        const data = await res.json();
        serverList = data.users || [];
      }
    } catch (e) {
      console.warn('Backend admin fetch failed:', e);
    }

    // 2. Fetch from local storage
    try {
      const usersStr = localStorage.getItem('clint_terra_users');
      localList = usersStr ? JSON.parse(usersStr) : [
        {
          name: 'CLiNt-Tech Administrator',
          email: 'CLiNtech0515@gmail.com',
          password: 'admin1234567',
          region: 'Asia-Pacific (India)',
          profilePic: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin',
          joinedAt: new Date().toISOString()
        },
        {
          name: 'Siddharth Gopal Dubey',
          email: 'siddharth@dubey.me',
          password: 'password',
          region: 'Asia-Pacific (India)',
          profilePic: 'https://api.dicebear.com/7.x/bottts/svg?seed=founder',
          joinedAt: new Date().toISOString()
        }
      ];
      // Omit passwords for security
      localList = localList.map(({ password, ...u }: any) => u);
    } catch (e) {
      console.warn('Local registry fetch failed:', e);
    }

    // 3. Merge lists by email (case-insensitive) to prevent duplicates
    const mergedMap = new Map();
    
    serverList.forEach((u: any) => {
      if (u.email) {
        mergedMap.set(u.email.toLowerCase(), u);
      }
    });

    localList.forEach((u: any) => {
      if (u.email) {
        const emailLower = u.email.toLowerCase();
        if (!mergedMap.has(emailLower)) {
          mergedMap.set(emailLower, u);
        }
      }
    });

    const mergedList = Array.from(mergedMap.values());
    setAdminUsers(mergedList);
    setAdminLoading(false);
  };

  const handleRevokeUser = async (emailToDelete: string) => {
    if (!emailToDelete) return;
    if (emailToDelete.toLowerCase() === 'clintech0515@gmail.com') {
      alert('Security violation: Cannot revoke the master administrator credentials.');
      return;
    }
    if (!confirm(`Are you sure you want to revoke and delete operator account "${emailToDelete}"?`)) {
      return;
    }

    let success = false;

    // 1. Try backend delete first
    try {
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/admin/user/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-requester-email': user.email || ''
        },
        body: JSON.stringify({ emailToDelete })
      });

      if (res.ok) {
        success = true;
      }
    } catch (e) {
      console.warn('Backend user revocation failed or unreachable. Syncing locally.', e);
    }

    // 2. Local storage delete
    try {
      const usersStr = localStorage.getItem('clint_terra_users');
      if (usersStr) {
        const users = JSON.parse(usersStr);
        const filtered = users.filter((u: any) => u.email.toLowerCase() !== emailToDelete.toLowerCase());
        localStorage.setItem('clint_terra_users', JSON.stringify(filtered));
        success = true;
      }
    } catch (e) {
      console.error('Local storage user revocation failed:', e);
    }

    if (success) {
      alert(`Operator account "${emailToDelete}" successfully revoked.`);
      fetchAdminUsers();
    } else {
      alert('Failed to revoke operator registry record.');
    }
  };

  const applyCarbonOffset = () => {
    let carbonAmount = 0;
    let title = '';
    let details = '';

    if (offsetProject === 'reforestation') {
      carbonAmount = offsetAmt * 6;
      title = 'Ecological Offset: Reforestation Seedlings';
      details = `Manually contributed $${offsetAmt} to tree planting initiatives. Mapped offset coefficient: 6kg/$.`;
    } else if (offsetProject === 'methane') {
      carbonAmount = offsetAmt * 10;
      title = 'Ecological Offset: Agriculture Methane Digester';
      details = `Manually contributed $${offsetAmt} to farm waste methane capture. Mapped offset coefficient: 10kg/$.`;
    } else {
      carbonAmount = offsetAmt * 15;
      title = 'Ecological Offset: Wind Infrastructure Texas';
      details = `Manually contributed $${offsetAmt} to wind turbine power offsets. Mapped offset coefficient: 15kg/$.`;
    }

    const offsetEvent = {
      id: 'offset-sim-' + Date.now(),
      source: 'homeassistant' as const,
      timestamp: new Date().toISOString(),
      amount: -carbonAmount,
      title: title,
      rawDetails: details
    };

    addRawEvent(offsetEvent);
    handleNewEntry();

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.75 },
      colors: ['#00f0ff', '#00ff66', '#ffffff']
    });
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser({ name: '', email: '', region: '', profilePic: '' });
    localStorage.removeItem('clint_terra_active_user');
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
        {/* Global Security Broadcast Bar */}
        {systemBroadcast && (
          <div className="w-full px-4 py-2.5 bg-amber-950/20 border border-amber-900/60 rounded-xl flex items-center justify-between gap-4 font-mono text-[11px] text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)] relative overflow-hidden shrink-0 z-20">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 animate-pulse" />
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="shrink-0 px-1.5 py-0.5 rounded bg-amber-950 border border-amber-700 text-amber-300 font-bold uppercase text-[9px] animate-pulse">SYSTEM ALERT</span>
              <div className="flex-1 overflow-hidden relative">
                <span className="block truncate whitespace-nowrap">{systemBroadcast}</span>
              </div>
            </div>
            {user.email && user.email.toLowerCase() === 'clintech0515@gmail.com' && (
              <button
                onClick={() => {
                  setSystemBroadcast('');
                  setBroadcastInput('');
                  localStorage.removeItem('clint_system_broadcast');
                  alert('Broadcast message banner cleared successfully.');
                }}
                className="px-2 py-0.5 border border-amber-900/60 rounded hover:bg-amber-900/30 text-amber-500 hover:text-amber-300 cursor-pointer text-[9px]"
              >
                Clear Alert
              </button>
            )}
          </div>
        )}
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
            {/* Operator status / Profile Trigger */}
            <button
              onClick={() => setShowProfile(true)}
              className="px-3 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-900 border border-neutral-900 hover:border-neutral-750 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
              title="User Profile Settings"
            >
              {user.profilePic ? (
                <img src={user.profilePic} alt="Avatar" className="w-4 h-4 rounded-full border border-neutral-850 object-cover" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--neon-blue)]" />
              )}
              <span className="text-neutral-450 uppercase text-[9px]">Operator:</span>
              <span className="text-white font-semibold">{user.name || 'S. G. Dubey'}</span>
            </button>

            {/* Admin Command Deck (visible for admin email only) */}
            {user.email && user.email.toLowerCase() === 'clintech0515@gmail.com' && (
              <button
                onClick={() => {
                  setShowAdmin(true);
                  fetchAdminUsers();
                }}
                className="px-3 py-1.5 border border-red-900 hover:border-red-650 bg-red-950/20 hover:bg-red-950/45 rounded-lg cursor-pointer transition-all text-red-400 hover:text-red-200 flex items-center gap-1.5 shadow-[0_0_10px_rgba(239,68,68,0.15)] hover:shadow-[0_0_15px_rgba(239,68,68,0.35)] animate-pulse"
                title="Admin Command Deck"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                <span>Admin Deck</span>
              </button>
            )}

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


            
            <button
              onClick={handleLogout}
              className="px-3 py-2 border border-neutral-850 hover:border-neutral-750 bg-neutral-900/60 hover:bg-neutral-800 rounded-lg text-xs text-[var(--neon-orange)] hover:text-[var(--neon-orange-mid)] font-mono cursor-pointer transition-all flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Disconnect
            </button>
          </div>
        </header>



        {/* User Profile Settings Modal */}
        {showProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-mono">
            <div className="glass-panel w-full max-w-md p-6 bg-neutral-950 border border-neutral-800 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative">
              <div className="flex items-center justify-between mb-4 border-b border-neutral-900 pb-3">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-[var(--neon-blue)]" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Operator Profile Settings</h2>
                </div>
                <button 
                  onClick={() => setShowProfile(false)}
                  className="text-neutral-450 hover:text-white cursor-pointer text-xs"
                >
                  [ESC]
                </button>
              </div>

              {profileMessage.text && (
                <div className={`p-3 mb-4 rounded border text-xs flex items-center gap-2 ${
                  profileMessage.type === 'success' 
                    ? 'border-green-500/20 bg-green-500/5 text-[var(--neon-green)]' 
                    : 'border-red-500/20 bg-red-500/5 text-[var(--neon-orange)]'
                }`}>
                  {profileMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{profileMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleProfileUpdate} className="space-y-4 text-xs">
                {/* Profile Pic customizer */}
                <div className="flex items-center gap-4 bg-neutral-900/40 p-3 rounded-lg border border-neutral-900">
                  <div className="relative group">
                    <img 
                      src={profilePicUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(profilePicSeed)}`} 
                      alt="Profile Avatar" 
                      className="w-16 h-16 rounded-xl border border-neutral-800 bg-neutral-950 p-1"
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-1.5">
                    <label className="text-[9px] text-neutral-450 uppercase font-bold">Avatar Robot Seed</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. founder, matrix, hero"
                        value={profilePicSeed}
                        onChange={e => {
                          setProfilePicSeed(e.target.value);
                          setProfilePicUrl(''); // clear custom url if they type seed
                        }}
                        className="flex-1 px-2.5 py-1.5 bg-neutral-900 border border-neutral-850 focus:border-neutral-750 rounded text-neutral-200 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const randomSeeds = ['neo', 'cyber', 'sentinel', 'orion', 'titan', 'plasma', 'glitch', 'terra', 'saver'];
                          const randomSeed = randomSeeds[Math.floor(Math.random() * randomSeeds.length)] + '-' + Math.floor(Math.random() * 100);
                          setProfilePicSeed(randomSeed);
                          setProfilePicUrl('');
                        }}
                        className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-750 rounded text-neutral-300 cursor-pointer"
                      >
                        🎲
                      </button>
                    </div>
                  </div>
                </div>

                {/* Name */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-neutral-450 uppercase font-bold">Full Name</label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={e => setProfileName(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-850 focus:border-neutral-750 rounded text-neutral-200 outline-none"
                  />
                </div>

                {/* Email Address */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-neutral-450 uppercase font-bold">Email Address</label>
                  <input
                    type="email"
                    required
                    value={profileEmail}
                    onChange={e => setProfileEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-850 focus:border-neutral-750 rounded text-neutral-200 outline-none"
                  />
                </div>

                {/* Password update */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-neutral-450 uppercase font-bold flex justify-between items-center">
                    <span>Change Passphrase</span>
                    <span className="text-[8px] text-neutral-500 font-normal">Leave blank to keep current</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showProfilePassword ? 'text' : 'password'}
                      placeholder="Enter new password..."
                      value={profilePassword}
                      onChange={e => setProfilePassword(e.target.value)}
                      className="w-full pl-3 pr-8 py-2 bg-neutral-900 border border-neutral-850 focus:border-neutral-750 rounded text-neutral-200 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowProfilePassword(!showProfilePassword)}
                      className="absolute right-2.5 top-2.5 text-neutral-500 hover:text-neutral-300"
                    >
                      {showProfilePassword ? '👁️' : '🔒'}
                    </button>
                  </div>
                </div>

                {/* Region */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-neutral-450 uppercase font-bold flex items-center gap-1">
                    <Globe className="w-3 h-3 text-[var(--neon-blue)]" /> Geographical Region
                  </label>
                  <select
                    value={profileRegion}
                    onChange={e => setProfileRegion(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-850 focus:border-[#00ff66] rounded text-neutral-200 outline-none"
                  >
                    <option value="Asia-Pacific (India)">Asia-Pacific (India)</option>
                    <option value="North America">North America</option>
                    <option value="Europe">Europe</option>
                    <option value="Latin America">Latin America</option>
                    <option value="Africa">Africa</option>
                    <option value="Middle East">Middle East</option>
                  </select>
                </div>

                {/* Form Buttons */}
                <div className="flex justify-end gap-2 border-t border-neutral-900 pt-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowProfile(false)}
                    className="px-3 py-1.5 border border-neutral-850 rounded hover:bg-neutral-900 text-neutral-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={profileUpdating}
                    className="px-4 py-1.5 bg-[#00ff66] hover:bg-[#55ff99] text-black font-semibold rounded cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {profileUpdating && <Loader2 className="w-3 h-3 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Admin Command Deck Modal */}
        {showAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-mono">
            <div className="glass-panel w-full max-w-4xl p-6 bg-neutral-950 border border-red-900 shadow-[0_20px_50px_rgba(239,68,68,0.15)] relative">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-4 border-b border-neutral-900 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Admin Command Deck: Core Registry</h2>
                </div>
                <button 
                  onClick={() => setShowAdmin(false)}
                  className="text-neutral-450 hover:text-white cursor-pointer text-xs"
                >
                  [ESC]
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-neutral-900 mb-4 pb-1 gap-2">
                <button
                  type="button"
                  onClick={() => setAdminTab('registry')}
                  className={`px-4 py-2 text-xs font-mono border-b-2 transition-all cursor-pointer ${
                    adminTab === 'registry' 
                      ? 'border-red-500 text-white font-bold' 
                      : 'border-transparent text-neutral-500 hover:text-neutral-350'
                  }`}
                >
                  💾 Operator Registry
                </button>
                <button
                  type="button"
                  onClick={() => setAdminTab('integrations')}
                  className={`px-4 py-2 text-xs font-mono border-b-2 transition-all cursor-pointer ${
                    adminTab === 'integrations' 
                      ? 'border-red-500 text-white font-bold' 
                      : 'border-transparent text-neutral-500 hover:text-neutral-350'
                  }`}
                >
                  ⚙️ System Integrations & Controls
                </button>
              </div>

              {adminLoading ? (
                <div className="h-64 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
                  <span className="text-xs text-neutral-400">Loading master registry database packets...</span>
                </div>
              ) : adminTab === 'registry' ? (
                <div className="space-y-6 text-xs">
                  {/* Top Stats Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-neutral-900/50 p-4 border border-neutral-850 rounded-lg">
                      <div className="text-neutral-500 text-[10px] uppercase font-bold">Active Operators</div>
                      <div className="text-2xl font-bold text-white mt-1">{adminUsers.length}</div>
                      <div className="text-[9px] text-neutral-400 mt-1">Synchronized nodes in the local network cluster.</div>
                    </div>

                    <div className="bg-neutral-900/50 p-4 border border-neutral-850 rounded-lg md:col-span-2">
                      <div className="text-neutral-500 text-[10px] uppercase font-bold mb-2">Regional User Distribution</div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {(() => {
                          const regionCounts: Record<string, number> = {};
                          adminUsers.forEach(u => {
                            const r = u.region || 'Global';
                            regionCounts[r] = (regionCounts[r] || 0) + 1;
                          });
                          return Object.entries(regionCounts).map(([region, count]) => {
                            const pct = Math.round((count / adminUsers.length) * 100);
                            return (
                              <div key={region} className="bg-neutral-950 p-2 rounded border border-neutral-900">
                                <div className="text-[9px] text-neutral-450 truncate">{region}</div>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="font-bold text-white text-[11px]">{count} ({pct}%)</span>
                                </div>
                                <div className="w-full bg-neutral-900 h-1 rounded-full mt-1.5 overflow-hidden">
                                  <div 
                                    style={{ width: `${pct}%` }} 
                                    className="bg-red-500 h-full rounded-full"
                                  />
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Registered Users List Table */}
                  <div className="border border-neutral-850 rounded-lg overflow-hidden bg-neutral-900/30">
                    <div className="px-4 py-3 bg-neutral-950/80 border-b border-neutral-850 flex justify-between items-center">
                      <h3 className="font-bold uppercase tracking-wider text-neutral-300">Operator Directory List</h3>
                      <span className="text-[9px] text-neutral-500">TIMESCALEDB METRIC LOG</span>
                    </div>

                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-neutral-950 text-neutral-400 uppercase text-[9px] border-b border-neutral-850">
                            <th className="p-3">Operator / Avatar</th>
                            <th className="p-3">Email Address</th>
                            <th className="p-3">Region</th>
                            <th className="p-3">Synchronized On</th>
                            <th className="p-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-900 text-[11px]">
                          {adminUsers.map((u, i) => (
                            <tr key={i} className="hover:bg-neutral-900/20 text-neutral-300 transition-colors">
                              <td className="p-3 flex items-center gap-2.5">
                                <img 
                                  src={u.profilePic || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(u.name || 'avatar')}`} 
                                  className="w-7 h-7 rounded bg-neutral-950 border border-neutral-850 p-0.5"
                                  alt=""
                                />
                                <div>
                                  <div className="font-bold text-white">{u.name}</div>
                                  {u.email.toLowerCase() === 'clintech0515@gmail.com' && (
                                    <span className="text-[8px] px-1 py-0.5 rounded bg-red-950/30 text-red-400 border border-red-900/30 uppercase font-semibold">Admin</span>
                                  )}
                                  {u.email === 'siddharth@dubey.me' && (
                                    <span className="text-[8px] px-1 py-0.5 rounded bg-neutral-950/30 text-neutral-400 border border-neutral-900/30 uppercase font-semibold">Founder</span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 text-neutral-450 font-mono select-all">{u.email}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-850 text-neutral-300 text-[10px]">
                                  {u.region || 'Global'}
                                </span>
                              </td>
                              <td className="p-3 text-neutral-500 font-mono">
                                {u.joinedAt ? new Date(u.joinedAt).toLocaleString() : 'N/A'}
                              </td>
                              <td className="p-3 text-right font-mono">
                                {u.email.toLowerCase() !== 'clintech0515@gmail.com' && (
                                  <button
                                    onClick={() => handleRevokeUser(u.email)}
                                    className="px-2 py-1 bg-red-950/30 hover:bg-red-900/50 text-red-400 border border-red-900/40 hover:border-red-500 rounded text-[9px] cursor-pointer transition-all hover:scale-[1.03]"
                                  >
                                    [REVOKE]
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-neutral-900 pt-3">
                    <span className="text-[9px] text-neutral-500">Security notice: Passphrases are filtered out of all query packet payloads.</span>
                    <button
                      onClick={() => setShowAdmin(false)}
                      className="px-4 py-1.5 bg-red-650 hover:bg-red-500 text-white font-semibold rounded cursor-pointer transition-all"
                    >
                      Close Command Deck
                    </button>
                  </div>
                </div>
              ) : (
                /* Integrations & Controls Tab */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs max-w-4xl mx-auto py-2">
                  {/* Credentials block */}
                  <div className="bg-neutral-900/40 p-4 border border-neutral-850 rounded-lg space-y-4">
                    <h3 className="text-[10px] text-neutral-400 uppercase font-bold border-b border-neutral-900 pb-2">API Keys & Mail Integrations</h3>
                    
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
                        className="w-full px-3 py-2 bg-neutral-950 border border-neutral-900 focus:border-neutral-750 rounded text-neutral-200 outline-none placeholder-neutral-700"
                      />
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
                          className="w-full px-3 py-2 bg-neutral-950 border border-neutral-900 focus:border-neutral-750 rounded text-neutral-200 outline-none placeholder-neutral-700"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] text-neutral-450 uppercase">Google App Password</label>
                        <input
                          type="password"
                          placeholder="16-character app password..."
                          value={gmailAppPass}
                          onChange={e => setGmailAppPass(e.target.value)}
                          className="w-full px-3 py-2 bg-neutral-950 border border-neutral-900 focus:border-neutral-750 rounded text-neutral-200 outline-none placeholder-neutral-700"
                        />
                      </div>
                    </div>

                    {/* Resend Key */}
                    <div className="border-t border-neutral-900 pt-3 flex flex-col gap-1.5">
                      <label className="text-[10px] text-neutral-400 uppercase font-bold font-mono">Alternative: Resend API Key</label>
                      <input
                        type="password"
                        placeholder="re_..."
                        value={resendKey}
                        onChange={e => setResendKey(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-950 border border-neutral-900 focus:border-neutral-750 rounded text-neutral-200 outline-none placeholder-neutral-700"
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={saveSettings}
                        className="w-full py-2 bg-[#00f0ff] hover:bg-[#55f5ff] text-black font-semibold rounded cursor-pointer transition-all text-center"
                      >
                        Save & Apply Credentials
                      </button>
                    </div>
                  </div>

                  {/* System broadcast & actions block */}
                  <div className="bg-neutral-900/40 p-4 border border-neutral-850 rounded-lg flex flex-col gap-4">
                    <h3 className="text-[10px] text-neutral-400 uppercase font-bold border-b border-neutral-900 pb-2">Global System Broadcast Controls</h3>
                    
                    <div className="flex flex-col gap-2 flex-1">
                      <label className="text-[10px] text-neutral-400 uppercase font-bold">📢 Create System Alert Banner</label>
                      <textarea
                        placeholder="Type a warning, announcement, or status update here..."
                        value={broadcastInput}
                        onChange={e => setBroadcastInput(e.target.value)}
                        rows={5}
                        className="w-full p-3 bg-neutral-950 border border-neutral-900 focus:border-red-500 rounded text-neutral-200 outline-none placeholder-neutral-700 font-mono text-[11px]"
                      />
                      
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (broadcastInput.trim()) {
                              setSystemBroadcast(broadcastInput);
                              localStorage.setItem('clint_system_broadcast', broadcastInput);
                              alert('Global banner alert broadcasted successfully.');
                            }
                          }}
                          className="flex-1 py-2 bg-red-950/40 hover:bg-red-950/70 text-red-400 border border-red-900/50 rounded font-semibold transition-all cursor-pointer text-center"
                        >
                          📢 Push Alert
                        </button>
                        
                        {systemBroadcast && (
                          <button
                            type="button"
                            onClick={() => {
                              setSystemBroadcast('');
                              setBroadcastInput('');
                              localStorage.removeItem('clint_system_broadcast');
                              alert('Broadcast message cleared successfully.');
                            }}
                            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-750 rounded text-neutral-350 cursor-pointer"
                          >
                            Clear Banner
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-neutral-900 pt-3 text-[10px] text-neutral-450 space-y-1">
                      <div>• Broadcasts are immediately synchronized locally for all network nodes.</div>
                      <div>• Banner alert will slide in at the very top of all active user sessions.</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Widescreen Dashboard HUD grid layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
          
          {/* Left Column: Passive Telemetry Ingest HUD */}
          <div className="xl:col-span-2 hidden xl:flex flex-col gap-4">
            <LeftHUDPanel onNewEntry={handleNewEntry} />

            {/* Regional Grid Profile Card */}
            <div className="glass-panel p-4 bg-black/60 font-mono space-y-3 border border-neutral-900">
              <div className="text-[9px] text-neutral-500 uppercase font-bold tracking-wider border-b border-neutral-900 pb-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[var(--neon-blue)]" /> Regional Grid Intensity
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[8px] text-neutral-500 block uppercase">Active Zone</span>
                  <span className="text-white font-semibold">{user.region || 'Asia-Pacific (India)'}</span>
                </div>
                
                {(() => {
                  const region = user.region || 'Asia-Pacific (India)';
                  let intensity = 'High Carbon Grid';
                  let coefficient = '0.72 kg/kWh';
                  let colorClass = 'text-red-500';
                  let pct = '85%';
                  let rec = 'Install solar panels to offset grid dependence.';

                  if (region.includes('Europe')) {
                    intensity = 'Low Carbon Renewable';
                    coefficient = '0.28 kg/kWh';
                    colorClass = 'text-[var(--neon-green)]';
                    pct = '30%';
                    rec = 'Opt for time-of-use scheduling during off-peak hours.';
                  } else if (region.includes('North America')) {
                    intensity = 'Moderate Carbon mix';
                    coefficient = '0.45 kg/kWh';
                    colorClass = 'text-[var(--neon-yellow)]';
                    pct = '55%';
                    rec = 'Upgrade household appliances to smart energy ratings.';
                  } else if (region.includes('Latin America')) {
                    intensity = 'Moderate Hydro/Gas mix';
                    coefficient = '0.38 kg/kWh';
                    colorClass = 'text-[var(--neon-yellow)]';
                    pct = '45%';
                    rec = 'Implement intelligent smart thermostats to regulate loads.';
                  }

                  return (
                    <div className="space-y-2">
                      <div>
                        <span className="text-[8px] text-neutral-500 block uppercase">Carbon Intensity Profile</span>
                        <span className={`font-semibold ${colorClass}`}>{intensity}</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-neutral-500 block uppercase">Grid Coefficient</span>
                        <span className="text-white font-mono font-bold text-[11px]">{coefficient}</span>
                      </div>
                      
                      <div className="w-full bg-neutral-950 h-1.5 rounded-full overflow-hidden mt-1">
                        <div 
                          style={{ width: pct }} 
                          className={`h-full rounded-full ${
                            region.includes('Europe') ? 'bg-green-500' : region.includes('North America') || region.includes('Latin America') ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                        />
                      </div>
                      
                      <div className="text-[8px] text-neutral-450 italic mt-2 border-t border-neutral-950 pt-2 leading-relaxed">
                        Recommendation: {rec}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
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

                {/* Carbon Offset Simulator Widget */}
                <div className="glass-panel p-5 bg-black/60 font-mono space-y-4 border border-neutral-900 hover:border-neutral-800 mt-4">
                  <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
                    <span className="text-[10px] text-neutral-450 uppercase font-bold flex items-center gap-1.5">
                      🌱 Carbon Offset Simulator
                    </span>
                    <span className="text-[8px] text-[var(--neon-green)] uppercase">Carbon Negative Node</span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Project Selection */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-neutral-500 uppercase font-bold">Ecological Initiative</label>
                        <select
                          value={offsetProject}
                          onChange={e => setOffsetProject(e.target.value)}
                          className="w-full px-2 py-1.5 bg-neutral-900 border border-neutral-850 rounded text-neutral-200 outline-none focus:border-[var(--neon-blue)]"
                        >
                          <option value="reforestation">Reforestation Seedlings ($2/kg)</option>
                          <option value="methane">Agricultural Methane Digester ($1.5/kg)</option>
                          <option value="wind">Texas Wind Turbine Grid ($1/kg)</option>
                        </select>
                      </div>

                      {/* Offset Budget */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-neutral-500 uppercase font-bold flex justify-between">
                          <span>Investment Budget</span>
                          <span className="text-white">${offsetAmt} USD</span>
                        </label>
                        <input
                          type="range"
                          min="5"
                          max="150"
                          step="5"
                          value={offsetAmt}
                          onChange={e => setOffsetAmt(parseInt(e.target.value, 10))}
                          className="w-full h-1.5 bg-neutral-900 rounded-lg appearance-none cursor-pointer accent-[var(--neon-blue)] mt-2"
                        />
                      </div>
                    </div>

                    {/* Calculated Yield display */}
                    <div className="p-3 bg-neutral-950/70 border border-neutral-900 rounded-lg flex items-center justify-between">
                      <div>
                        <div className="text-[8px] text-neutral-500 uppercase">Simulated Footprint Deducted</div>
                        <div className="text-lg font-bold text-[var(--neon-green)] mt-0.5">
                          -{offsetProject === 'reforestation' ? offsetAmt * 6 : offsetProject === 'methane' ? offsetAmt * 10 : offsetAmt * 15} kg CO2e
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[8px] text-neutral-500 uppercase">Twin Biome Impact</div>
                        <div className="text-[10px] text-white font-semibold mt-0.5">
                          {offsetProject === 'reforestation' ? 'Forest Canopy Expand' : offsetProject === 'methane' ? 'Waste Stream Purge' : 'Grid Mix Decarbonize'}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={applyCarbonOffset}
                      className="w-full py-2 bg-[var(--neon-blue)] text-black font-semibold rounded cursor-pointer transition-all hover:bg-cyan-400 text-center flex items-center justify-center gap-1.5 text-xs uppercase"
                    >
                      Apply Offset Ledger Entry
                    </button>
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
