'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Shield, Lock, Mail, User, Eye, EyeOff, Loader2, Sparkles, CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';

interface AuthGateProps {
  onAuthenticate: (name: string, email: string, isLogin: boolean) => void;
}

export default function AuthGate({ onAuthenticate }: AuthGateProps) {
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

  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [consent, setConsent] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password || (!isLogin && !name)) return;

    if (typeof window === 'undefined') return;

    setLoading(true);
    setLoadingStage('Establishing link to database node...');

    let authUser = null;
    let fallbackToLocal = false;

    // 1. Try backend server auth first
    try {
      const backendUrl = getBackendUrl();
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin 
        ? { email, password } 
        : { name, email, password, region: 'Asia-Pacific (India)', profilePic: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}` };

      const res = await fetch(`${backendUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Backend Auth failed');
      }

      authUser = data.user;
    } catch (e: any) {
      console.warn('Backend Auth failed or unreachable, trying local fallback:', e.message);
      
      // If backend returned a credentials validation error, abort immediately and show error
      if (e.message && (e.message.includes('passphrase') || e.message.includes('already registered') || e.message.includes('not found') || e.message.includes('Email already'))) {
        setError(e.message);
        setLoading(false);
        return;
      }
      
      fallbackToLocal = true;
    }

    // 2. Local fallback if backend is unreachable
    if (fallbackToLocal) {
      const usersStr = localStorage.getItem('clint_terra_users');
      let users = usersStr ? JSON.parse(usersStr) : [];

      const seeds = [
        {
          name: 'CLiNt-Tech Administrator',
          email: 'CLiNtech0515@gmail.com',
          password: 'admin1234567',
          region: 'Asia-Pacific (India)',
          profilePic: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin'
        },
        {
          name: 'Siddharth Gopal Dubey',
          email: 'siddharth@dubey.me',
          password: 'password',
          region: 'Asia-Pacific (India)',
          profilePic: 'https://api.dicebear.com/7.x/bottts/svg?seed=founder'
        }
      ];

      let modified = false;
      if (users.length === 0) {
        users = seeds;
        modified = true;
      } else {
        for (const seed of seeds) {
          const exists = users.some((u: any) => u.email.toLowerCase() === seed.email.toLowerCase());
          if (!exists) {
            users.push(seed);
            modified = true;
          }
        }
      }

      if (modified) {
        localStorage.setItem('clint_terra_users', JSON.stringify(users));
      }

      if (isLogin) {
        const userMatch = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
        if (!userMatch) {
          setError("Account not found. Please switch to the 'Synchronize Biome' tab to create your account first.");
          setLoading(false);
          return;
        }
        if (userMatch.password !== password) {
          setError("Invalid passphrase. Cryptographic handshake rejected.");
          setLoading(false);
          return;
        }
        authUser = userMatch;
      } else {
        const userMatch = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
        if (userMatch) {
          setError("This email is already registered. Please switch to the 'Access Twin Ledger' tab to log in.");
          setLoading(false);
          return;
        }

        const newUser = { 
          name, 
          email, 
          password, 
          region: 'Asia-Pacific (India)', 
          profilePic: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}` 
        };
        users.push(newUser);
        localStorage.setItem('clint_terra_users', JSON.stringify(users));
        authUser = newUser;
      }
    }

    if (!authUser) {
      setError("Cryptographic authentication handshake failed.");
      setLoading(false);
      return;
    }

    // Save active user profile info to localStorage for dashboard retrieval
    localStorage.setItem('clint_terra_active_user', JSON.stringify(authUser));

    // Simulate high-throughput event brokering setup stages
    const stages = isLogin 
      ? [
          'Verifying cryptographic tokens...',
          'Opening TimescaleDB session...',
          'Mounting 3D WebGL twin...'
        ]
      : [
          'Registering Plaid & Maps webhook endpoints...',
          'Provisioning Apache Kafka consumer groups...',
          'Spawning Go carbon-processing workers...',
          'Broadcasting welcome lifecycle payloads...'
        ];

    let currentStage = 0;
    setLoadingStage(stages[0]);

    const interval = setInterval(() => {
      currentStage++;
      if (currentStage < stages.length) {
        setLoadingStage(stages[currentStage]);
      } else {
        clearInterval(interval);
        setLoading(false);

        onAuthenticate(authUser.name, authUser.email, isLogin);
        
        // Celebrate sync!
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#00ff66', '#00f0ff', '#ffffff']
        });
      }
    }, 1000);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!email) return;

    if (typeof window === 'undefined') return;

    const usersStr = localStorage.getItem('clint_terra_users');
    let users = usersStr ? JSON.parse(usersStr) : [];
    
    // Seed default accounts if empty, to allow resetting account password
    const seeds = [
      {
        name: 'CLiNt-Tech Administrator',
        email: 'CLiNtech0515@gmail.com',
        password: 'admin1234567'
      },
      {
        name: 'Siddharth Gopal Dubey',
        email: 'siddharth@dubey.me',
        password: 'password'
      }
    ];

    let modified = false;
    if (users.length === 0) {
      users = seeds;
      modified = true;
    } else {
      for (const seed of seeds) {
        const exists = users.some((u: any) => u.email.toLowerCase() === seed.email.toLowerCase());
        if (!exists) {
          users.push(seed);
          modified = true;
        }
      }
    }

    if (modified) {
      localStorage.setItem('clint_terra_users', JSON.stringify(users));
    }

    const userMatch = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
    if (!userMatch) {
      setError("Email address not registered in the cryptographic twin database.");
      return;
    }

    setLoading(true);
    setLoadingStage("Resolving cryptographic key pairs...");

    const subject = "CLiNt Terra: Cryptographic Passphrase Recovery";
    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; background-color: #f8f9fa; border: 1px solid #dadce0; color: #202124; border-radius: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #dadce0; padding-bottom: 15px; margin-bottom: 20px;">
          <h2 style="color: #202124; margin: 0; font-family: sans-serif; font-weight: bold;">CLiNt Terra</h2>
          <span style="font-size: 10px; color: #5f6368; font-family: monospace;">PASSPHRASE RECOVERY</span>
        </div>
        <h1 style="color: #202124; font-size: 20px; margin-bottom: 10px; font-weight: bold;">Passphrase Recovery Request</h1>
        <p style="color: #5f6368; font-size: 14px; line-height: 1.6;">
          Hello ${userMatch.name},<br/><br/>
          A passphrase recovery request was triggered for your CLiNt Terra carbon account.
        </p>
        <div style="background-color: #ffffff; border: 1px solid #dadce0; padding: 15px; border-radius: 8px; margin: 20px 0; font-family: monospace; font-size: 12px; text-align: center;">
          <span style="color: #5f6368; display: block; margin-bottom: 5px; text-transform: uppercase; font-size: 10px;">Your Registered Passphrase:</span>
          <strong style="color: #d93025; font-size: 18px; letter-spacing: 1px;">${userMatch.password}</strong>
        </div>
        <p style="color: #5f6368; font-size: 13px; line-height: 1.6;">
          You can now return to the login interface, input your email, and enter the passphrase above to re-establish your secure biome session.
        </p>
        <div style="border-top: 1px solid #dadce0; padding-top: 15px; font-size: 10px; color: #70757a; text-align: center; font-family: monospace; margin-top: 30px;">
          CLiNt Terra was founded and envisioned by Siddharth Gopal Dubey.
        </div>
      </div>
    `;

    // Retrieve credentials directly from local storage if any, or backend env fallback
    const savedGmailUser = localStorage.getItem('gmail_user') || '';
    const savedGmailAppPass = localStorage.getItem('gmail_app_password') || '';
    const savedResendKey = localStorage.getItem('resend_api_key') || '';

    try {
      setLoadingStage("Dispatching recovery transmission...");
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/send-email`, {
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

      const data = await res.json();
      setLoading(false);

      if (data.success || data.warning) {
        setSuccess(`Passphrase recovery email dispatched to ${email}. Check your inbox!`);
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#00ff66', '#ffffff']
        });
      } else {
        setError("Failed to dispatch email. Server returned: " + (data.warning || "Unknown failure."));
      }

    } catch (e: any) {
      console.error('SMTP recovery dispatch failed', e);
      setLoading(false);
      setError("Handshake error: Failed to establish link to mail dispatch worker.");
    }
  };

  return (
    <div className="min-h-screen bg-black text-neutral-200 flex items-center justify-center lg:justify-end lg:pr-[12%] p-4 relative scanline">
      {/* 3D Space Background */}
      <div className="absolute inset-0 z-0 w-full h-full pointer-events-none">
        <AuthSpaceBackground />
      </div>

      {/* Main container */}
      <div className="glass-panel w-full max-w-md p-8 bg-black/75 border border-neutral-900 shadow-[0_20px_50px_rgba(0,0,0,0.9)] relative z-10">
        
        {/* Logo and Brand */}
        <div className="flex flex-col items-center mb-8">
          <img 
            src="/logo-terra.jpg" 
            className="w-12 h-12 rounded-xl object-cover border border-neutral-350 dark:border-neutral-850 logo-blend-light dark:logo-blend-dark bg-white p-0.5 mb-3" 
            alt="CLiNt Terra Logo" 
          />
          <h1 className="text-2xl font-bold tracking-wider text-white font-mono">CLiNt Terra</h1>
          <p className="text-[10px] text-neutral-500 font-mono mt-1 text-center uppercase tracking-widest">
            Passive Carbon Event-Sourcing Network
          </p>
        </div>

        {/* Loading overlay screen */}
        {loading ? (
          <div className="py-12 flex flex-col items-center gap-5 justify-center min-h-[300px]">
            <Loader2 className="w-12 h-12 text-[#00ff66] animate-spin" />
            <div className="text-center font-mono">
              <span className="text-xs text-[#00ff66] uppercase tracking-wider block mb-1">SECURE HANDSHAKE ACTIVE</span>
              <p className="text-[11px] text-neutral-400 animate-pulse">{loadingStage}</p>
            </div>
          </div>
        ) : isForgotPassword ? (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div className="border-b border-neutral-900 pb-3">
              <h2 className="text-xs font-mono text-white uppercase tracking-wider">Recover Passphrase</h2>
              <p className="text-[10px] text-neutral-500 font-mono mt-1 leading-normal">
                Enter your registered email address to dispatch your secure passphrase recovery transmission.
              </p>
            </div>

            {/* Error Message Box */}
            {error && (
              <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-500 text-xs font-mono">
                {error}
              </div>
            )}

            {/* Success Message Box */}
            {success && (
              <div className="p-3 rounded-lg border border-green-500/20 bg-green-500/5 text-[#00ff66] text-xs font-mono flex items-start gap-1.5">
                <CheckCircle className="w-4 h-4 text-[#00ff66] shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            {/* Email Input */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-neutral-500 uppercase">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
                <input
                  type="email"
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-9 pr-4 py-2 text-xs font-mono bg-neutral-950/80 border border-neutral-900 focus:border-neutral-800 rounded-lg text-neutral-200 outline-none transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-2.5 text-xs font-mono text-black font-semibold bg-[#00ff66] hover:bg-[#55ff99] rounded-lg transition-all shadow-[0_0_15px_rgba(0,255,102,0.15)] hover:shadow-[0_0_20px_rgba(0,255,102,0.3)] cursor-pointer text-center flex items-center justify-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5" />
              Transmit Recovery Signal
            </button>

            {/* Return Link */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => { setIsForgotPassword(false); setError(''); setSuccess(''); }}
                className="text-[10px] font-mono text-[#00ff66] hover:underline cursor-pointer"
              >
                &larr; Back to Access Twin Ledger
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Toggle */}
            <div className="flex border-b border-neutral-900 pb-1">
              <button
                type="button"
                onClick={() => { setIsLogin(true); setError(''); }}
                className={`flex-1 pb-3 text-xs font-mono border-b-2 transition-all cursor-pointer ${
                  isLogin 
                    ? 'border-[#00ff66] text-white' 
                    : 'border-transparent text-neutral-500 hover:text-neutral-300'
                }`}
              >
                Access Twin Ledger
              </button>
              <button
                type="button"
                onClick={() => { setIsLogin(false); setError(''); }}
                className={`flex-1 pb-3 text-xs font-mono border-b-2 transition-all cursor-pointer ${
                  !isLogin 
                    ? 'border-[#00ff66] text-white' 
                    : 'border-transparent text-neutral-500 hover:text-neutral-300'
                }`}
              >
                Synchronize Biome
              </button>
            </div>

            {/* Error Message Box */}
            {error && (
              <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-500 text-xs font-mono">
                {error}
              </div>
            )}

            {/* Inputs */}
            <div className="space-y-4">
              {/* Name (Signup only) */}
              {!isLogin && (
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-neutral-500 uppercase">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
                    <input
                      type="text"
                      placeholder="e.g. Siddharth Gopal Dubey"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={!isLogin}
                      className="w-full pl-9 pr-4 py-2 text-xs font-mono bg-neutral-950/80 border border-neutral-900 focus:border-neutral-800 rounded-lg text-neutral-200 outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-neutral-500 uppercase">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
                  <input
                    type="email"
                    placeholder="name@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-9 pr-4 py-2 text-xs font-mono bg-neutral-950/80 border border-neutral-900 focus:border-neutral-800 rounded-lg text-neutral-200 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-neutral-500 uppercase">Passphrase</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-9 pr-10 py-2 text-xs font-mono bg-neutral-950/80 border border-neutral-900 focus:border-neutral-800 rounded-lg text-neutral-200 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-neutral-500 hover:text-neutral-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {isLogin && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => { setIsForgotPassword(true); setError(''); setSuccess(''); }}
                      className="text-[10px] font-mono text-neutral-500 hover:text-[var(--neon-green)] transition-colors cursor-pointer"
                    >
                      Forgot passphrase?
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Consent checkbox (Signup only) */}
            {!isLogin && (
              <div className="flex items-start gap-2 pt-2 select-none">
                <input
                  type="checkbox"
                  id="consent"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 accent-[#00ff66] bg-neutral-900 border-neutral-800 text-black cursor-pointer rounded"
                />
                <label htmlFor="consent" className="text-[10px] text-neutral-500 font-mono leading-relaxed cursor-pointer">
                  Authorize CLiNt Terra to securely parse passive telemetry headers from Plaid & Google Maps APIs.
                </label>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isLogin && !consent}
              className="w-full py-2.5 text-xs font-mono text-black font-semibold bg-[#00ff66] hover:bg-[#55ff99] disabled:opacity-40 disabled:hover:bg-[#00ff66] rounded-lg transition-all shadow-[0_0_15px_rgba(0,255,102,0.15)] hover:shadow-[0_0_20px_rgba(0,255,102,0.3)] cursor-pointer text-center flex items-center justify-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5" />
              {isLogin ? 'Establish Handshake' : 'Synchronize Carbon Twin'}
            </button>

            {/* Registered Accounts Tip */}
            <div className="pt-4 border-t border-neutral-900/60 text-[9px] text-neutral-500 text-center font-mono leading-relaxed flex items-start gap-1 justify-center">
              <Sparkles className="w-3.5 h-3.5 text-[#00f0ff] shrink-0 mt-0.5" />
              <span>
                Tip: Create an account under 'Synchronize Biome'. Or use founder credentials: <strong className="text-neutral-400">siddharth@dubey.me</strong> (passphrase: <strong className="text-neutral-400">password</strong>)
              </span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 3D ENCHANTED SPACE BACKGROUND COMPONENTS
// ==========================================

function AuthSpaceBackground() {
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<[number, number, number]>([0, 0, -2]);
  const [isLightTheme, setIsLightTheme] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isLight = document.documentElement.classList.contains('light') || localStorage.getItem('clint_theme') === 'light';
    setIsLightTheme(isLight);

    const handleResize = () => {
      if (window.innerWidth > 1024) {
        setPosition([-1.9, 0.1, -0.2]); // Positioned leftward on desktop to clear shifted card
      } else if (window.innerWidth > 768) {
        setPosition([-1.3, 0.1, -0.6]); // Slightly leftward on tablet
      } else {
        setPosition([0, 1.0, -2.5]);   // Centered background on mobile
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!mounted) return null;

  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 45 }} className="w-full h-full bg-black">
      <ambientLight intensity={isLightTheme ? 0.7 : 0.5} />
      <directionalLight position={[5, 3, 5]} intensity={isLightTheme ? 2.0 : 1.8} />
      
      {/* Background Starfield or Floating Dust depending on theme */}
      {isLightTheme ? (
        <AuthFloatingDust count={70} />
      ) : (
        <Stars radius={100} depth={50} count={3500} factor={4} saturation={0.5} fade speed={1.2} />
      )}
      
      <InteractionGroup>
        <group position={position}>
          <SpaceGalaxy isLightTheme={isLightTheme} />
          
          {/* Active Event-Sourcing Satellites & Gyroscopic Rings */}
          <AuthOrbitRing radius={2.6} speed={0.2} angleX={Math.PI / 6} angleZ={0} color={isLightTheme ? "#1a73e8" : "#00f0ff"} />
          <AuthOrbitRing radius={3.2} speed={-0.12} angleX={-Math.PI / 4} angleZ={Math.PI / 6} color={isLightTheme ? "#137333" : "#00ff66"} />
        </group>
      </InteractionGroup>
    </Canvas>
  );
}

function InteractionGroup({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += (mouse.current.x * 0.18 - groupRef.current.rotation.y) * 0.05;
      groupRef.current.rotation.x += (-mouse.current.y * 0.18 - groupRef.current.rotation.x) * 0.05;
    }
  });

  return <group ref={groupRef}>{children}</group>;
}

function AuthFloatingDust({ count = 70 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const particles = useMemo(() => {
    const temp = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 2.0 + Math.random() * 4.5;
      temp[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      temp[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      temp[i * 3 + 2] = r * Math.cos(phi);
    }
    return temp;
  }, [count]);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.getElapsedTime() * 0.01;
      pointsRef.current.rotation.x = state.clock.getElapsedTime() * 0.005;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[particles, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.065}
        color="#8a2be2" // soft violet dust motes contrasting with white
        transparent
        opacity={0.3}
        depthWrite={false}
      />
    </points>
  );
}

function SpaceGalaxy({ isLightTheme }: { isLightTheme: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  // Generate spiral galaxy particles
  const [positions, colors] = useMemo(() => {
    const count = 16000;
    const radius = 5.2;
    const branches = 3;
    const spin = 1.5;
    const randomnessPower = 4.2;

    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    // Contrasting colors: glowing pastel tones in dark mode, deep rich saturated watercolor tones in light mode
    const colorInside = isLightTheme ? new THREE.Color('#4b0082') : new THREE.Color('#ffe3a0'); // deep indigo vs bright warm core
    const colorMiddle = isLightTheme ? new THREE.Color('#c71585') : new THREE.Color('#ff00aa'); // medium violet-red vs hot pink
    const colorOutside = isLightTheme ? new THREE.Color('#0000cd') : new THREE.Color('#00f0ff'); // deep blue vs glowing cyan

    for (let i = 0; i < count; i++) {
      const r = Math.random() * radius;
      const spinAngle = r * spin;
      const branchAngle = ((i % branches) / branches) * Math.PI * 2;

      // Dispersion
      const randomX = Math.pow(Math.random(), randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * 0.35 * r;
      const randomY = Math.pow(Math.random(), randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * 0.25 * r;
      const randomZ = Math.pow(Math.random(), randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * 0.35 * r;

      pos[i * 3] = Math.cos(branchAngle + spinAngle) * r + randomX;
      pos[i * 3 + 1] = randomY;
      pos[i * 3 + 2] = Math.sin(branchAngle + spinAngle) * r + randomZ;

      // Color interpolation
      let mixedColor = colorInside.clone();
      if (r < radius * 0.25) {
        mixedColor.lerp(colorMiddle, r / (radius * 0.25));
      } else {
        mixedColor = colorMiddle.clone();
        mixedColor.lerp(colorOutside, (r - radius * 0.25) / (radius * 0.75));
      }

      col[i * 3] = mixedColor.r;
      col[i * 3 + 1] = mixedColor.g;
      col[i * 3 + 2] = mixedColor.b;
    }

    return [pos, col];
  }, [isLightTheme]);

  const starTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    if (isLightTheme) {
      // Darker star textures for white background
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
      grad.addColorStop(0.3, 'rgba(0, 0, 0, 0.45)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    } else {
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 16);
    return new THREE.CanvasTexture(canvas);
  }, [isLightTheme]);

  const coreGlowTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    if (isLightTheme) {
      // Rich watercolor nebula center for light mode
      grad.addColorStop(0, 'rgba(138, 43, 226, 0.45)');      // medium orchid core
      grad.addColorStop(0.4, 'rgba(255, 20, 147, 0.2)');     // soft hot pink
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    } else {
      grad.addColorStop(0, 'rgba(255, 235, 180, 1)');      // bright warm star core
      grad.addColorStop(0.25, 'rgba(255, 0, 170, 0.55)');   // glowing magenta nebular dust
      grad.addColorStop(0.6, 'rgba(0, 240, 255, 0.18)');    // cyan outer diffuse halo
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');             // fade out
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }, [isLightTheme]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (pointsRef.current) {
      pointsRef.current.rotation.y = time * 0.05;
    }
    if (coreRef.current) {
      coreRef.current.rotation.y = -time * 0.12;
      const s = 1.0 + Math.sin(time * 2) * 0.06;
      coreRef.current.scale.set(s, s, s);
    }
  });

  return (
    <group rotation={[Math.PI / 3.2, 0, Math.PI / 6.5]}>
      {/* Central Glowing Core Sprite (Nebula core glow) */}
      <sprite scale={[1.8, 1.8, 1.0]}>
        <spriteMaterial
          map={coreGlowTexture}
          transparent
          depthWrite={false}
          blending={isLightTheme ? THREE.NormalBlending : THREE.AdditiveBlending}
          opacity={isLightTheme ? 0.65 : 0.8}
        />
      </sprite>

      {/* Central Glowing Core Sphere (Holographic Event Matrix) */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.32, 16, 16]} />
        <meshBasicMaterial 
          color={isLightTheme ? "#8a2be2" : "#ffe4a0"} 
          transparent 
          opacity={isLightTheme ? 0.3 : 0.35} 
          depthWrite={false} 
        />
      </mesh>
      
      {/* Swirling Galaxy Particles */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[colors, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={isLightTheme ? 0.048 : 0.038} // slightly larger watercolor ink drops on white
          vertexColors
          transparent
          opacity={isLightTheme ? 0.75 : 0.9}
          depthWrite={false}
          blending={isLightTheme ? THREE.NormalBlending : THREE.AdditiveBlending}
          map={starTexture}
        />
      </points>
    </group>
  );
}

function AuthOrbitRing({ radius, speed, angleX, angleZ, color }: {
  radius: number;
  speed: number;
  angleX: number;
  angleZ: number;
  color: string;
}) {
  const ringRef = useRef<THREE.Group>(null);
  const satRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (ringRef.current) {
      ringRef.current.rotation.y = time * speed * 0.12;
    }
    if (satRef.current) {
      const theta = time * speed * 1.5;
      satRef.current.position.set(
        Math.cos(theta) * radius,
        0,
        Math.sin(theta) * radius
      );
    }
  });

  return (
    <group rotation={[angleX, 0, angleZ]} ref={ringRef}>
      <mesh>
        <torusGeometry args={[radius, 0.0015, 4, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.12} />
      </mesh>
      <mesh ref={satRef}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}
