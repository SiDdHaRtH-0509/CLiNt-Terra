'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, X, Play, HelpCircle } from 'lucide-react';

interface TourStep {
  selector?: string;
  title: string;
  description: string;
  placement: 'center' | 'bottom' | 'top' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to CLiNt Terra!",
    description: "This dashboard acts as a passive, zero-input carbon event-sourcing network, securely ingesting telemetry from user-authorized touchpoints and mapping it onto your digital carbon twin.",
    placement: "center"
  },
  {
    selector: "#tour-header",
    title: "Dashboard Operator Toolbar",
    description: "Here you can monitor the active operator status, sync status, toggle between dark/light themes, or update credentials for Gmail SMTP and Gemini API key integrations.",
    placement: "bottom"
  },
  {
    selector: "#tour-globe",
    title: "WebGL Digital Carbon Twin",
    description: "This 3D biosphere represents your real-time carbon health. It shifts color from a stable green to a decaying smoky orange if you exceed your weekly budget. The orbiting moon and active satellites trace your digital orbits.",
    placement: "right"
  },
  {
    selector: "#tour-ingest",
    title: "Passive Ingest HUD & Log",
    description: "This HUD shows real-time system logs as background workers ingest webhook transactions, parsing them for carbon calculations.",
    placement: "right"
  },
  {
    selector: "#tour-metrics",
    title: "Global Saturation Metrics",
    description: "Tracks key global parameters like Atmospheric CO2 levels, Oceanic Acidification Index (pH), and Forest Cover Regeneration, which respond to your ecological offsets.",
    placement: "bottom"
  },
  {
    selector: "#tour-sandbox",
    title: "Carbon Mitigation Sandbox",
    description: "Simulate carbon reductions by toggling ecological commits (EV transition, vegan diet, air travel cancellation). See your projected annual carbon savings live on the dynamic mitigation gauge.",
    placement: "bottom"
  },
  {
    selector: "#tour-audit",
    title: "Immutability & Audit Engine",
    description: "Initiate cryptographic validation over ingestion streams. The audit engine compares hash roots to verify database state integrity and ledger consistency.",
    placement: "top"
  },
  {
    selector: "#tour-email",
    title: "Lifecycle & Email Center",
    description: "Preview weekly automated reports and onboarding emails sent to user mailboxes. You can also send manual email summaries to test credentials.",
    placement: "top"
  },
  {
    selector: "#tour-ledger",
    title: "Financial-Grade Carbon Ledger",
    description: "Search, sort, and filter every carbon event committed. You can clear and reset the local ledger database using the reset controls.",
    placement: "top"
  },
  {
    selector: "#tour-copilot",
    title: "CLiNt-Saver AI Copilot",
    description: "Click here to chat with your personal sustainability AI! It has a local semantic cache to help answer queries offline and switches to live Gemini AI once your API key is configured.",
    placement: "left"
  }
];

interface TutorialTourProps {
  activeStep: number;
  setActiveStep: React.Dispatch<React.SetStateAction<number>>;
  onTourClose: () => void;
  showPrompt: boolean;
  setShowPrompt: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function TutorialTour({ 
  activeStep, 
  setActiveStep, 
  onTourClose,
  showPrompt,
  setShowPrompt
}: TutorialTourProps) {
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({
    opacity: 0,
    transform: 'scale(0.95)',
    pointerEvents: 'none'
  });
  
  const popoverRef = useRef<HTMLDivElement>(null);

  const repositionPopover = () => {
    if (activeStep === -1) return;
    const step = TOUR_STEPS[activeStep];
    
    if (step.selector) {
      const el = document.querySelector(step.selector);
      if (el) {
        const rect = el.getBoundingClientRect();
        const popWidth = 320;
        const popHeight = popoverRef.current ? popoverRef.current.offsetHeight : 180;
        
        let top = 0;
        let left = 0;
        
        if (step.placement === 'bottom') {
          top = rect.bottom + window.scrollY + 12;
          left = rect.left + window.scrollX + (rect.width - popWidth) / 2;
        } else if (step.placement === 'top') {
          top = rect.top + window.scrollY - popHeight - 12;
          left = rect.left + window.scrollX + (rect.width - popWidth) / 2;
        } else if (step.placement === 'left') {
          top = rect.top + window.scrollY + (rect.height - popHeight) / 2;
          left = rect.left + window.scrollX - popWidth - 12;
        } else if (step.placement === 'right') {
          top = rect.top + window.scrollY + (rect.height - popHeight) / 2;
          left = rect.right + window.scrollX + 12;
        } else {
          top = window.innerHeight / 2 - popHeight / 2 + window.scrollY;
          left = window.innerWidth / 2 - popWidth / 2 + window.scrollX;
        }
        
        // viewport bounding margins
        const margin = 16;
        top = Math.max(margin + window.scrollY, Math.min(top, document.documentElement.scrollHeight - popHeight - margin));
        left = Math.max(margin + window.scrollX, Math.min(left, document.documentElement.scrollWidth - popWidth - margin));
        
        setPopoverStyle({
          top: `${top}px`,
          left: `${left}px`,
          opacity: 1,
          transform: 'scale(1)',
          pointerEvents: 'auto'
        });
        return;
      }
    }
    
    // Centered fallback
    const popWidth = 320;
    const popHeight = 180;
    const top = window.innerHeight / 2 - popHeight / 2 + window.scrollY;
    const left = window.innerWidth / 2 - popWidth / 2 + window.scrollX;
    
    setPopoverStyle({
      top: `${top}px`,
      left: `${left}px`,
      opacity: 1,
      transform: 'scale(1)',
      pointerEvents: 'auto'
    });
  };

  // Listen to step transitions
  useEffect(() => {
    if (activeStep === -1) {
      document.querySelectorAll('.tour-highlight').forEach(el => {
        el.classList.remove('tour-highlight');
      });
      setPopoverStyle({
        opacity: 0,
        transform: 'scale(0.95)',
        pointerEvents: 'none'
      });
      return;
    }

    const step = TOUR_STEPS[activeStep];
    
    // Clear previous highlights
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.classList.remove('tour-highlight');
    });

    if (step.selector) {
      const el = document.querySelector(step.selector);
      if (el) {
        el.classList.add('tour-highlight');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        const scrollTimeout = setTimeout(() => {
          repositionPopover();
        }, 300);
        return () => clearTimeout(scrollTimeout);
      }
    }
    
    repositionPopover();
  }, [activeStep]);

  // Recalculate coordinates on window changes
  useEffect(() => {
    if (activeStep === -1) return;
    
    const handleUpdate = () => {
      repositionPopover();
    };
    
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate);
    
    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate);
    };
  }, [activeStep]);

  const handleNext = () => {
    if (activeStep < TOUR_STEPS.length - 1) {
      setActiveStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    setActiveStep(-1);
    localStorage.setItem('clint_tour_completed', 'true');
    onTourClose();
  };

  const handleSkip = () => {
    setActiveStep(-1);
    localStorage.setItem('clint_tour_completed', 'true');
    onTourClose();
  };

  const startTour = () => {
    setShowPrompt(false);
    setActiveStep(0);
  };

  const declineTour = () => {
    setShowPrompt(false);
    localStorage.setItem('clint_tour_completed', 'true');
  };

  return (
    <>
      {/* Choice Prompt Modal for first-time visitors */}
      {showPrompt && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-mono">
          <div className="glass-panel w-full max-w-sm p-6 bg-neutral-950 border border-neutral-900 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col gap-4 text-center">
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full bg-[var(--neon-blue)]/10 border border-[var(--neon-blue)]/30 flex items-center justify-center text-[var(--neon-blue)]">
                <HelpCircle className="w-6 h-6" />
              </div>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider">Welcome to CLiNt Terra!</h3>
              <p className="text-[10px] text-neutral-450 leading-relaxed max-w-xs mx-auto">
                Would you like to take a 2-minute interactive step-by-step walkthrough of your digital carbon twin dashboard?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={declineTour}
                className="py-2 border border-neutral-850 hover:bg-neutral-900 rounded font-mono text-[9px] text-neutral-400 hover:text-white cursor-pointer transition-colors text-center font-bold"
              >
                No, Skip
              </button>
              <button
                onClick={startTour}
                className="py-2 bg-[var(--neon-blue)] text-white dark:text-black hover:opacity-90 rounded font-mono text-[9px] cursor-pointer transition-opacity text-center font-bold flex items-center justify-center gap-1.5"
              >
                <Play className="w-3 h-3 fill-current" />
                Yes, Start!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Walkthrough Card */}
      {activeStep !== -1 && (
        <div 
          ref={popoverRef}
          style={popoverStyle}
          className="tour-popover p-4 border border-neutral-850 select-none rounded-xl"
        >
          {/* Header */}
          <div className="flex justify-between items-center pb-2 border-b border-neutral-900/60 mb-2">
            <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest">
              Tour Step {activeStep + 1} of {TOUR_STEPS.length}
            </span>
            <button 
              onClick={handleSkip}
              className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
              title="Skip Walkthrough"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-2 mb-4">
            <h4 className="text-xs font-bold text-neutral-100 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--neon-blue)] animate-pulse" />
              {TOUR_STEPS[activeStep].title}
            </h4>
            <p className="text-[9.5px] text-neutral-400 leading-relaxed">
              {TOUR_STEPS[activeStep].description}
            </p>
          </div>

          {/* Footer Controls */}
          <div className="flex justify-between items-center border-t border-neutral-900/60 pt-2 font-mono text-[9px]">
            <button
              onClick={handleSkip}
              className="text-neutral-500 hover:text-neutral-300 cursor-pointer"
            >
              Skip
            </button>
            
            <div className="flex gap-2">
              <button
                onClick={handleBack}
                disabled={activeStep === 0}
                className="px-2.5 py-1 border border-neutral-850 hover:bg-neutral-900 disabled:opacity-30 disabled:hover:bg-transparent rounded flex items-center gap-1 cursor-pointer transition-colors text-neutral-400"
              >
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
              <button
                onClick={handleNext}
                className="px-2.5 py-1 bg-[var(--neon-blue)] text-white dark:text-black hover:opacity-90 rounded flex items-center gap-1 cursor-pointer transition-all font-semibold"
              >
                {activeStep === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'} <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
