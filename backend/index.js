import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Copilot Chat Route
app.post('/api/chat', async (req, res) => {
  try {
    const { message, stats, ledgerSummary } = req.body;
    
    // Retrieve key from headers or env fallback
    const userApiKey = req.get('x-api-key') || '';
    const apiKey = userApiKey || process.env.GEMINI_API_KEY || '';
    const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

    const systemPrompt = `You are CLiNt-Saver, the dedicated personal sustainability AI copilot for the CLiNt Terra platform.
CLiNt Terra is a passive, zero-input carbon event-sourcing network that converts everyday human activity into an active carbon ledger.
The platform was founded and envisioned by Siddharth Gopal Dubey.

TECHNICAL ARCHITECTURE DETAILS:
1. Ingestion: Exposes secure webhook endpoints for Plaid (financial transactions) and Google Maps (localized transit telemetry), and HomeAssistant (household grid energy consumption webhooks).
2. Processing: Telemetry data packets flow through an Apache Kafka/GCP Pub/Sub queue to buffer ingestion spikes. A stateless Go-based worker pulls transaction packets, uses Redis semantic cache for matching merchant emission coefficients, and falls back to a high-speed Gemini Flash parser to calculate precise GHG impacts.
3. Storage: Final parsed carbon entries are stored in TimescaleDB (time-series) and MongoDB Atlas (user profiles and gamification).

USER RUNTIME STATE INFORMATION:
- Weekly Carbon footprint: ${stats.totalCarbon} kg CO2e
- Target Weekly Budget: ${stats.carbonBudget || 400} kg CO2e
- Budget Delta: ${stats.weeklySavingRate > 0 ? `${stats.weeklySavingRate}% saved (under budget)` : `${Math.abs(stats.weeklySavingRate)}% over budget`}
- Current Twin Biome State: ${stats.isNormal ? 'STABLE BIOME (Green flourishing particle mesh)' : 'DECAYING GRID (Smoky orange-grey grid)'}
- Category Emissions: ${JSON.stringify(stats.carbonByCategory)}

RECENT LEDGER TRANSACTIONS:
${JSON.stringify(ledgerSummary, null, 2)}

INSTRUCTIONS:
1. When asked about who founded, made, or envisioned CLiNt Terra, explicitly attribute it to Siddharth Gopal Dubey.
2. Maintain a highly professional, technically precise, and concise terminal-style conversational tone.
3. Answer questions about carbon calculations using standard science principles and refer to our Go worker/Redis/Gemini pipeline where applicable.
4. Keep answers under 120 words unless a detailed explanation of formulas is requested.`;

    if (!genAI) {
      // Offline fallback processing logic
      const reply = getOfflineReply(message, stats, ledgerSummary);
      return res.json({ reply });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const result = await model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: `System context: ${systemPrompt}\n\nUser query: ${message}` }] }
      ]
    });

    const responseText = result.response.text();
    return res.json({ reply: responseText.trim() });

  } catch (error) {
    console.error('CLiNt-Saver backend chat route failed:', error);
    return res.status(500).json({
      reply: 'System Error: Ingestion stream connection lost. Reverting to local terminal cache.'
    });
  }
});

// Email Dispatch Route
app.post('/api/send-email', async (req, res) => {
  try {
    const { recipient, subject, html, credentials } = req.body;

    if (!recipient) {
      return res.status(400).json({ error: 'Recipient is required' });
    }

    const resendApiKey = credentials?.resendApiKey || process.env.RESEND_API_KEY || '';
    const gmailUser = credentials?.gmailUser || process.env.GMAIL_USER || '';
    const gmailAppPassword = credentials?.gmailAppPassword || process.env.GMAIL_APP_PASSWORD || '';

    // 1. Deliver via Resend if API Key provided
    if (resendApiKey) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'CLiNt Terra <onboarding@resend.dev>',
          to: recipient,
          subject: subject,
          html: html
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Resend API failed: ${errorText}`);
      }

      return res.json({ success: true, method: 'resend' });
    }

    // 2. Deliver via Nodemailer Gmail SMTP if Gmail credentials provided
    if (gmailUser && gmailAppPassword) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailAppPassword
        }
      });

      await transporter.sendMail({
        from: `"CLiNt Terra" <${gmailUser}>`,
        to: recipient,
        subject: subject,
        html: html
      });

      return res.json({ success: true, method: 'gmail_smtp' });
    }

    // 3. Fallback: Return simulated success if no credentials entered
    return res.json({ 
      success: false, 
      warning: 'No SMTP or Resend API credentials provided. Simulated delivery logs generated locally.' 
    });

  } catch (error) {
    console.error('Mail delivery worker failed:', error);
    return res.status(500).json({ error: error.message || 'SMTP Handshake failed' });
  }
});

// Offline fallback helper function
function getOfflineReply(message, stats, ledger) {
  const query = message.toLowerCase();

  if (query.includes('founder') || query.includes('found') || query.includes('siddharth') || query.includes('dubey') || query.includes('who made') || query.includes('creator') || query.includes('owner') || query.includes('envisioned')) {
    return `CLiNt Terra was founded and envisioned by Siddharth Gopal Dubey.
    
Siddharth conceived the platform as a next-generation personal sustainability ecosystem. Instead of relying on manual data entry, the platform acts as a passive, zero-input carbon event-sourcing network, securely ingesting telemetry from user-authorized touchpoints (Plaid, Google Maps, HomeAssistant) and converting it into an immutable carbon ledger.`;
  }

  if (query.includes('architecture') || query.includes('pipeline') || query.includes('kafka') || query.includes('go') || query.includes('worker') || query.includes('redis') || query.includes('timescaledb') || query.includes('mongodb') || query.includes('how does it work') || query.includes('technology') || query.includes('tech stack')) {
    return `CLiNt Terra is built on a high-throughput passive ingestion pipeline:
1. **Ingest Gateway**: Receives webhooks from Plaid (financial), Google Maps (transit), and HomeAssistant (power grid).
2. **Event Broker**: Decoupled Kafka queues buffer transaction packets to handle ingestion spikes.
3. **Go Worker**: A stateless worker pulls packets, uses Redis semantic cache for matching merchant coefficients, and falls back to a high-speed Gemini Flash parser to calculate precise GHG impacts.
4. **Ledger Store**: Immutably commits processed carbon events into a TimescaleDB time-series database.
5. **Frontend UI**: Renders a dark-mode dashboard with a React Three Fiber particle biosphere representing your Digital Carbon Twin.`;
  }

  if (query.includes('budget') || query.includes('saving') || query.includes('limit') || query.includes('status') || query.includes('biome') || query.includes('twin') || query.includes('health') || query.includes('rate') || query.includes('green') || query.includes('orange') || query.includes('grey')) {
    const rateText = stats.weeklySavingRate > 0 
      ? `saving rate is **${stats.weeklySavingRate}% under** your weekly budget`
      : `footprint is **${Math.abs(stats.weeklySavingRate)}% over** your weekly budget limit`;
    return `Your aggregate weekly carbon footprint is **${stats.totalCarbon} kg CO2e**, against a target weekly budget of **${stats.carbonBudget || 400} kg CO2e**.
    
Currently, your ${rateText}.
As a result, your WebGL Digital Carbon Twin has loaded the **${stats.isNormal ? 'STABLE GREEN BIOSPHERE' : 'DECAYING SMOKY ORANGE GRID'}** shader context.`;
  }

  if (query.includes('travel') || query.includes('transit') || query.includes('flight') || query.includes('uber') || query.includes('commute') || query.includes('drive') || query.includes('train') || query.includes('bus') || query.includes('km') || query.includes('spike')) {
    const transitEmissions = stats.carbonByCategory['Transit'] || 0;
    const travelEntries = ledger.filter((e) => e.source === 'maps' || e.title?.toLowerCase().includes('flight') || e.title?.toLowerCase().includes('uber') || e.title?.toLowerCase().includes('commute'));
    
    let highestDetail = '';
    if (travelEntries.length > 0) {
      const highest = [...travelEntries].sort((a, b) => b.carbonFootprint - a.carbonFootprint)[0];
      highestDetail = `\n\nYour highest registered travel event is **${highest.title}** (${highest.carbonFootprint} kg CO2e). ${highest.reasoning || 'Captured from Maps timeline telemetry.'}`;
    }

    return `Your weekly Transit emissions total **${transitEmissions} kg CO2e**. This includes aviation, rideshares, and rail commutes.${highestDetail}
    
*Recommendation*: To lower your travel footprint, consider opting for electric rail transit (which has a low coefficient of 0.035 kg/km) or selecting EV options on rideshares (0.04 kg/km) instead of standard combustion vehicles (0.22 kg/km).`;
  }

  if (query.includes('energy') || query.includes('electricity') || query.includes('utility') || query.includes('solar') || query.includes('power') || query.includes('homeassistant') || query.includes('kwh')) {
    const energyEmissions = stats.carbonByCategory['Energy'] || 0;
    const energyEntries = ledger.filter((e) => e.source === 'homeassistant' || e.title?.toLowerCase().includes('energy') || e.title?.toLowerCase().includes('solar') || e.title?.toLowerCase().includes('grid'));
    
    let highestDetail = '';
    if (energyEntries.length > 0) {
      const highest = [...energyEntries].sort((a, b) => b.carbonFootprint - a.carbonFootprint)[0];
      highestDetail = `\n\nYour highest energy event is **${highest.title}** (${highest.carbonFootprint} kg CO2e). ${highest.reasoning || 'Parsed from HomeAssistant webhook draw.'}`;
    }

    return `Your weekly Energy emissions total **${energyEmissions} kg CO2e**. This telemetry is passively pulled from your HomeAssistant regional grid intensity sensor.${highestDetail}
    
*Recommendation*: Emitting coal grid energy consumes 0.95 kg/kWh, while renewable solar offset drops consumption to 0.03 kg/kWh. Conserving power during peak dirty grid hours will lower emissions.`;
  }

  if (query.includes('dining') || query.includes('food') || query.includes('coffee') || query.includes('starbucks') || query.includes('mcdonald') || query.includes('sweetgreen') || query.includes('groceries') || query.includes('restaurant') || query.includes('eat') || query.includes('meal')) {
    const diningEmissions = (stats.carbonByCategory['Dining'] || 0) + (stats.carbonByCategory['Groceries'] || 0);
    const foodEntries = ledger.filter((e) => e.category === 'Dining' || e.category === 'Groceries' || e.title?.toLowerCase().includes('starbucks') || e.title?.toLowerCase().includes('mcdonald') || e.title?.toLowerCase().includes('salad') || e.title?.toLowerCase().includes('sweetgreen'));
    
    let highestDetail = '';
    if (foodEntries.length > 0) {
      const highest = [...foodEntries].sort((a, b) => b.carbonFootprint - a.carbonFootprint)[0];
      highestDetail = `\n\nYour highest dining/grocery event is **${highest.title}** (${highest.carbonFootprint} kg CO2e). ${highest.reasoning || 'Parsed from Plaid merchant category.'}`;
    }

    return `Your weekly Food and Dining emissions total **${diningEmissions} kg CO2e**. This includes restaurant dining, fast food, and groceries.${highestDetail}
    
*Recommendation*: Fast food supply chains have a higher emission coefficient (2.1 kg per $ spent) due to high meat content and retail packaging, whereas organic/vegan meals (0.45 kg per $) significantly decrease your twin footprint.`;
  }

  if (query.includes('buy') || query.includes('purchase') || query.includes('recent') || query.includes('transactions') || query.includes('history') || query.includes('ledger') || query.includes('list') || query.includes('what did i')) {
    if (!ledger || ledger.length === 0) {
      return `Your active carbon ledger database is currently empty. Simulate telemetry inputs using the Webhook Gateway on your dashboard to populate data!`;
    }
    const list = ledger.map(e => `• **${e.title}**: ${e.carbonFootprint} kg CO2e (${e.source.toUpperCase()})`).join('\n');
    return `Here are your most recent carbon ledger events:
${list}

You can view full details in the Financial-Grade Carbon Ledger table at the bottom of the dashboard.`;
  }

  if (query.includes('calculate') || query.includes('formula') || query.includes('coefficient') || query.includes('how do you') || query.includes('math') || query.includes('co2')) {
    return `Carbon emissions ($GHG$) are calculated using category coefficients:
$$GHG = Activity \\times Coefficient$$
    
Coefficients depend on telemetry source units:
• **Plaid**: kg CO2e per USD ($) spent (e.g. Fast Food = 2.1, Vegan = 0.45, Electronic Shopping = 1.9, SaaS = 0.15)
• **Maps**: kg CO2e per kilometer (KM) traveled (e.g. Flight = 0.25, Combustion Rideshare = 0.22, EV Rideshare = 0.04, Subway = 0.035)
• **HomeAssistant**: kg CO2e per kilowatt-hour (kWh) consumed (e.g. Coal grid = 0.95, Mixed grid = 0.42, Solar = 0.03)

If the merchant is new, the Go parser forwards the transaction string to Gemini Flash to determine the closest matching carbon category.`;
  }

  if (query.includes('hello') || query.includes('hi ') || query.includes('hey') || query.includes('greetings') || query.includes('help')) {
    return `Hello! I am CLiNt-Saver, your personal carbon ledger copilot.
    
I can resolve calculations for your active twin biome:
• Current Footprint: **${stats.totalCarbon} kg CO2e**
• Weekly Allowance: **${stats.carbonBudget} kg CO2e**
    
Ask me details about your travel spikes, food consumption, regional grid power draws, the Kafka pipeline architecture, or corporate origins regarding founder Siddharth Gopal Dubey.`;
  }

  return `Thank you for your question. As CLiNt-Saver, I have parsed your query against your live telemetry state.
  
Here is your summary:
• Weekly aggregate emissions: **${stats.totalCarbon} kg CO2e**
• Biome health status: **${stats.isNormal ? 'Stable Green' : 'Decaying Orange'}**
• Top category source: **${Object.keys(stats.carbonByCategory || {}).reduce((a, b) => stats.carbonByCategory[a] > stats.carbonByCategory[b] ? a : b, 'Transit')}**

To learn more, ask me about your recent transactions, travel spikes, calculations, or founder Siddharth Gopal Dubey.`;
}

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`CLiNt Terra Express backend server running on port ${PORT}`);
});
