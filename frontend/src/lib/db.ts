import { LedgerEntry, RawEvent, processRawEvent } from './carbon';

const STORAGE_KEY = 'clint_terra_ledger';
const ONBOARDING_SENT_KEY = 'clint_terra_onboarding_sent';

// Seed initial ledger transactions for first-time use
const BASE_MOCK_EVENTS: RawEvent[] = [
  {
    id: 'seed-1',
    source: 'plaid',
    timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 days ago
    amount: 6.80,
    title: 'Starbucks Coffee',
    rawDetails: 'Plaid: Starbucks Cafe, Seattle WA'
  },
  {
    id: 'seed-2',
    source: 'maps',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    amount: 14.5,
    title: 'Transit Commute',
    rawDetails: 'Google Maps Timeline: NY Subway, Brooklyn to Manhattan (14.5 KM)'
  },
  {
    id: 'seed-3',
    source: 'homeassistant',
    timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
    amount: 22.4,
    title: 'Grid Energy Ingest',
    rawDetails: 'HomeAssistant Webhook: Active usage (22.4 kWh, grid mix)'
  },
  {
    id: 'seed-4',
    source: 'plaid',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    amount: 120.00,
    title: 'AWS Cloud Services',
    rawDetails: 'Plaid: Amazon Web Services EC2/S3'
  },
  {
    id: 'seed-5',
    source: 'plaid',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    amount: 14.20,
    title: 'McDonalds Meal',
    rawDetails: 'Plaid: McDonalds #429, Burger & Fries'
  },
  {
    id: 'seed-6',
    source: 'maps',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    amount: 1800,
    title: 'Business Trip Flight',
    rawDetails: 'Google Maps Timeline: Flight NY to Miami (1800 KM)'
  },
  {
    id: 'seed-7',
    source: 'plaid',
    timestamp: new Date().toISOString(), // Today
    amount: 18.50,
    title: 'Sweetgreen Salad',
    rawDetails: 'Plaid: Sweetgreen Organic/Vegan'
  },
  {
    id: 'seed-8',
    source: 'homeassistant',
    timestamp: new Date().toISOString(), // Today
    amount: 12.0,
    title: 'Solar Energy Ingest',
    rawDetails: 'HomeAssistant Webhook: Solar array generation offset (12.0 kWh, green)'
  }
];

export function getLedger(): LedgerEntry[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    // Seed and return processed base events
    const processed = BASE_MOCK_EVENTS.map(processRawEvent);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(processed));
    return processed;
  }
  try {
    const parsed = JSON.parse(stored) as LedgerEntry[];
    
    // Check if the ledger is corrupted/crazy (e.g. contains extremely large/infinite numbers)
    const isCorrupt = parsed.some(entry => 
      !entry || 
      isNaN(entry.carbonFootprint) || 
      !isFinite(entry.carbonFootprint) || 
      entry.carbonFootprint > 1000000 || 
      entry.amount > 1000000
    );
    
    if (isCorrupt) {
      const processed = BASE_MOCK_EVENTS.map(processRawEvent);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(processed));
      return processed;
    }

    const unique: LedgerEntry[] = [];
    const seen = new Set<string>();
    
    for (const entry of parsed) {
      if (entry && entry.id && !seen.has(entry.id)) {
        seen.add(entry.id);
        unique.push(entry);
      }
    }
    
    if (unique.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
    }
    return unique;
  } catch (e) {
    console.error('Failed to parse ledger from storage', e);
    return [];
  }
}

export function saveLedger(ledger: LedgerEntry[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ledger));
}

export function addRawEvent(raw: RawEvent): LedgerEntry {
  const current = getLedger();
  const exists = current.some(e => e.id === raw.id);
  const processed = processRawEvent(raw);
  
  if (exists) {
    return processed; // prevent strict mode or double-click duplicates
  }
  
  const updated = [processed, ...current];
  saveLedger(updated);
  return processed;
}

export function clearLedger(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function getOnboardingStatus(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(ONBOARDING_SENT_KEY) === 'true';
}

export function setOnboardingStatus(sent: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ONBOARDING_SENT_KEY, sent ? 'true' : 'false');
}

export interface LedgerStats {
  totalCarbon: number; // in kg CO2e
  carbonBySource: Record<string, number>;
  carbonByCategory: Record<string, number>;
  dailyTrend: { date: string; amount: number }[];
  weeklySavingRate: number; // relative to budget
  carbonBudget: number; // 400 kg CO2e per week
  isNormal: boolean; // green vs orange/grey shader flag
}

const BUDGET_KEY = 'clint_terra_budget';

export function getCarbonBudget(): number {
  if (typeof window === 'undefined') return 400;
  const saved = localStorage.getItem(BUDGET_KEY);
  return saved ? parseInt(saved, 10) : 400;
}

export function saveCarbonBudget(budget: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BUDGET_KEY, budget.toString());
}

export function getStats(): LedgerStats {
  const ledger = getLedger();
  const carbonBudget = getCarbonBudget();
  
  let totalCarbon = 0;
  const carbonBySource: Record<string, number> = { plaid: 0, maps: 0, homeassistant: 0 };
  const carbonByCategory: Record<string, number> = {};
  
  // Daily trends calculation for the last 7 days
  const dailyRecord: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    dailyRecord[dateStr] = 0;
  }

  ledger.forEach(entry => {
    totalCarbon += entry.carbonFootprint;
    if (carbonBySource[entry.source] !== undefined) {
      carbonBySource[entry.source] += entry.carbonFootprint;
    }
    
    carbonByCategory[entry.category] = (carbonByCategory[entry.category] || 0) + entry.carbonFootprint;
    
    // Group into dates
    const dateStr = new Date(entry.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (dailyRecord[dateStr] !== undefined) {
      dailyRecord[dateStr] += entry.carbonFootprint;
    }
  });

  const dailyTrend = Object.keys(dailyRecord).map(date => ({
    date,
    amount: Number(dailyRecord[date].toFixed(1))
  }));

  // Clean rounding
  totalCarbon = Number(totalCarbon.toFixed(1));
  Object.keys(carbonBySource).forEach(k => {
    carbonBySource[k] = Number(carbonBySource[k].toFixed(1));
  });
  Object.keys(carbonByCategory).forEach(k => {
    carbonByCategory[k] = Number(carbonByCategory[k].toFixed(1));
  });

  // Saving rate = percentage below budget
  const diff = carbonBudget - totalCarbon;
  const weeklySavingRate = Number(((diff / carbonBudget) * 100).toFixed(1));

  // Determine if ecological footprint is healthy
  const isNormal = totalCarbon <= carbonBudget;

  return {
    totalCarbon,
    carbonBySource,
    carbonByCategory,
    dailyTrend,
    weeklySavingRate,
    carbonBudget,
    isNormal
  };
}
