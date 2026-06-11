/**
 * Carbon emission coefficients and parser logic for CLiNt Terra.
 * Calculates GHG impact in kilograms of CO2 equivalent (kg CO2e).
 */

export interface CarbonFactor {
  category: string;
  factor: number; // kg CO2e per unit (per $, per km, or per kWh)
  unit: 'USD' | 'KM' | 'KWH';
  description: string;
}

export const CARBON_FACTORS: Record<string, CarbonFactor> = {
  // Financial Categories (per USD spent)
  'dining.fast_food': { category: 'Dining', factor: 2.1, unit: 'USD', description: 'Fast food meals (high meat content/packaging)' },
  'dining.restaurant': { category: 'Dining', factor: 1.8, unit: 'USD', description: 'Standard restaurant dining' },
  'dining.vegan': { category: 'Dining', factor: 0.45, unit: 'USD', description: 'Plant-based dining' },
  'dining.coffee': { category: 'Dining', factor: 0.6, unit: 'USD', description: 'Cafes and coffee shops' },
  
  'groceries.supermarket': { category: 'Groceries', factor: 1.2, unit: 'USD', description: 'Standard supermarket groceries' },
  'groceries.organic': { category: 'Groceries', factor: 0.6, unit: 'USD', description: 'Local/organic groceries' },
  
  'shopping.electronics': { category: 'Shopping', factor: 1.9, unit: 'USD', description: 'Hardware, devices, and accessories' },
  'shopping.apparel': { category: 'Shopping', factor: 1.1, unit: 'USD', description: 'Clothing and fast-fashion retail' },
  'shopping.general': { category: 'Shopping', factor: 0.8, unit: 'USD', description: 'General retail purchases' },
  
  'services.digital': { category: 'Services', factor: 0.15, unit: 'USD', description: 'SaaS, streaming, cloud services (datacenter footprint)' },
  'services.fitness': { category: 'Services', factor: 0.25, unit: 'USD', description: 'Gyms and wellness classes' },
  
  // Transit categories (per KM traveled)
  'transit.flight_long': { category: 'Transit', factor: 0.18, unit: 'KM', description: 'Long-haul commercial aviation' },
  'transit.flight_short': { category: 'Transit', factor: 0.25, unit: 'KM', description: 'Short-haul flights (higher takeoff impact)' },
  'transit.rideshare_gas': { category: 'Transit', factor: 0.22, unit: 'KM', description: 'Standard combustion ride-hailing (Uber/Lyft)' },
  'transit.rideshare_ev': { category: 'Transit', factor: 0.04, unit: 'KM', description: 'Electric vehicle rideshare' },
  'transit.train': { category: 'Transit', factor: 0.035, unit: 'KM', description: 'Electric railway transit' },
  'transit.bus': { category: 'Transit', factor: 0.08, unit: 'KM', description: 'Municipal bus transit' },

  // Energy/Utilities (per KWH consumed)
  'utility.grid_coal': { category: 'Energy', factor: 0.95, unit: 'KWH', description: 'Coal-heavy regional grid power' },
  'utility.grid_mix': { category: 'Energy', factor: 0.42, unit: 'KWH', description: 'Average regional electricity grid mix' },
  'utility.solar_clean': { category: 'Energy', factor: 0.03, unit: 'KWH', description: 'Solar, wind, or 100% green grid tariff' },
};

/**
 * Interface representing a telemetry raw event payload.
 */
export interface RawEvent {
  id: string;
  source: 'plaid' | 'maps' | 'homeassistant';
  timestamp: string;
  amount: number; // USD, KM, or KWH
  title: string;
  rawDetails: string;
}

/**
 * Processed carbon ledger entry.
 */
export interface LedgerEntry {
  id: string;
  source: 'plaid' | 'maps' | 'homeassistant';
  timestamp: string;
  title: string;
  amount: number;
  unit: 'USD' | 'KM' | 'KWH';
  category: string;
  subcategory: string;
  carbonFactor: number;
  carbonFootprint: number; // total kg CO2e
  reasoning: string;
}

/**
 * Simulates the Go-worker logic with fallback to Gemini Flash parser.
 * It maps a raw event into a structured carbon ledger entry.
 */
export function processRawEvent(event: RawEvent): LedgerEntry {
  let subcategory = 'shopping.general';
  let reasoning = 'Categorized using default general retail coefficients.';
  
  const text = (event.title + ' ' + event.rawDetails).toLowerCase();

  // 1. Plaid Financial transaction parsing
  if (event.source === 'plaid') {
    if (text.includes('starbucks') || text.includes('coffee') || text.includes('dunkin')) {
      subcategory = 'dining.coffee';
      reasoning = 'Plaid Category matching: Merchant is a Cafe/Coffee vendor. Applied standard coffee coefficient.';
    } else if (text.includes('mcdonald') || text.includes('burger') || text.includes('pizza') || text.includes('taco') || text.includes('kfc')) {
      subcategory = 'dining.fast_food';
      reasoning = 'Plaid Category matching: Fast food restaurant. Factored in higher emissions from packaging and beef supply chains.';
    } else if (text.includes('vegan') || text.includes('salad') || text.includes('sweetgreen') || text.includes('whole foods')) {
      subcategory = 'dining.vegan';
      reasoning = 'Gemini Flash AI Parser identified plant-based/organic dining. Lower carbon factor applied.';
    } else if (text.includes('restaurant') || text.includes('grill') || text.includes('sushi') || text.includes('diner')) {
      subcategory = 'dining.restaurant';
      reasoning = 'Plaid Category matching: Dine-in restaurant. Standard food service multiplier applied.';
    } else if (text.includes('apple') || text.includes('best buy') || text.includes('electronics') || text.includes('amazon') || text.includes('computer')) {
      subcategory = 'shopping.electronics';
      reasoning = 'Gemini Flash AI Parser flagged electronic hardware purchase. Factored in manufacturing and silicon mining footprints.';
    } else if (text.includes('zara') || text.includes('h&m') || text.includes('clothing') || text.includes('nike') || text.includes('apparel')) {
      subcategory = 'shopping.apparel';
      reasoning = 'Plaid Category matching: Clothing retail. Standard apparel textile footprint applied.';
    } else if (text.includes('netflix') || text.includes('spotify') || text.includes('aws') || text.includes('google cloud') || text.includes('github')) {
      subcategory = 'services.digital';
      reasoning = 'Redis Cache hit: Digital SaaS. Applied server farm carbon power coefficient.';
    } else if (text.includes('gym') || text.includes('equinox') || text.includes('yoga') || text.includes('fitness')) {
      subcategory = 'services.fitness';
      reasoning = 'Plaid Category matching: Recreational fitness services.';
    } else if (text.includes('uber') || text.includes('lyft') || text.includes('cab') || text.includes('taxi')) {
      // Rideshare can be gas or EV
      if (text.includes('green') || text.includes('ev') || text.includes('electric')) {
        subcategory = 'transit.rideshare_ev';
        reasoning = 'Gemini Flash parser detected EV selection for rideshare. Lower operational emissions calculated.';
      } else {
        subcategory = 'transit.rideshare_gas';
        reasoning = 'Plaid Category matching: Ride-hailing service. Calculated standard combustion vehicle fuel emissions.';
      }
    } else if (text.includes('trader joe') || text.includes('grocery') || text.includes('safeway') || text.includes('kroger')) {
      subcategory = 'groceries.supermarket';
      reasoning = 'Plaid Category matching: Grocery supermarket shopping.';
    }
  }
  
  // 2. Google Maps Transit Parsing
  else if (event.source === 'maps') {
    if (text.includes('flight') || text.includes('airline') || text.includes('airport')) {
      if (event.amount > 1000) {
        subcategory = 'transit.flight_long';
        reasoning = 'Location telemetry logs long-haul aviation trip. Scaled per passenger-kilometer aviation impact.';
      } else {
        subcategory = 'transit.flight_short';
        reasoning = 'Location telemetry logs short-haul domestic flight. Factored high-altitude greenhouse gas emissions.';
      }
    } else if (text.includes('uber') || text.includes('lyft') || text.includes('drive')) {
      if (text.includes('ev') || text.includes('tesla')) {
        subcategory = 'transit.rideshare_ev';
        reasoning = 'Transit tracker logs EV propulsion mileage.';
      } else {
        subcategory = 'transit.rideshare_gas';
        reasoning = 'Transit tracker logs standard internal combustion engine drive distance.';
      }
    } else if (text.includes('subway') || text.includes('train') || text.includes('rail') || text.includes('metro')) {
      subcategory = 'transit.train';
      reasoning = 'Location telemetry logs mass electric transit. Extremely low footprint per traveler-km.';
    } else if (text.includes('bus')) {
      subcategory = 'transit.bus';
      reasoning = 'Location telemetry logs public bus transit.';
    }
  }
  
  // 3. HomeAssistant Grid Energy Integration
  else if (event.source === 'homeassistant') {
    if (text.includes('coal') || text.includes('grid_dirty')) {
      subcategory = 'utility.grid_coal';
      reasoning = 'HomeAssistant Grid integration: Regional grid reports coal-heavy generation mix.';
    } else if (text.includes('solar') || text.includes('clean') || text.includes('wind')) {
      subcategory = 'utility.solar_clean';
      reasoning = 'HomeAssistant telemetry: On-site solar inverter production or 100% renewable grid contract.';
    } else {
      subcategory = 'utility.grid_mix';
      reasoning = 'HomeAssistant telemetry: Default utility grid energy consumption mix.';
    }
  }

  const factorConfig = CARBON_FACTORS[subcategory] || CARBON_FACTORS['shopping.general'];
  const carbonFootprint = Number((event.amount * factorConfig.factor).toFixed(2));

  return {
    id: event.id,
    source: event.source,
    timestamp: event.timestamp,
    title: event.title,
    amount: event.amount,
    unit: factorConfig.unit,
    category: factorConfig.category,
    subcategory: subcategory,
    carbonFactor: factorConfig.factor,
    carbonFootprint: carbonFootprint,
    reasoning: reasoning,
  };
}
