# CLiNt Terra

CLiNt Terra is a production-grade, event-sourced carbon intelligence platform and sustainability dashboard. By leveraging automated transaction, transit, and smart home telemetry, the system passively maps everyday human activities to precise greenhouse gas (GHG) emission profiles in real-time.

- **Live Website**: [clint-terra.vercel.app](https://clint-terra.vercel.app)
- **API Backend**: [clint-terra.onrender.com](https://clint-terra.onrender.com)
- **LinkedIn Post**: [Project Presentation & Demos](https://www.linkedin.com/posts/siddharth-dubey-cse_clintech-buildwithsidd-virtualpromptwars-ugcPost-7471050817077170176-WYPM/?utm_source=share&utm_medium=member_desktop&rcm=ACoAAGJRzNkBgHqcQz9GwpBaIrNkHTH6AuZu_Y8)

---

## High-Scalability Architecture

CLiNt Terra is built to support high-throughput, low-latency data pipelines:

```text
               [Telemetry Inputs]
     (Plaid Webhooks / Google Maps / IoT Grid Logs)
                       │
                       ▼
         [Message Ingestion Buffer]
       (Apache Kafka / GCP Pub/Sub Stream)
                       │
                       ▼
        [High-Speed Process Workers]
   (Stateless Go Worker + Redis Semantic Cache)
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
  [TimescaleDB]              [MongoDB Atlas]
(Time-Series Logs)          (Profiles & Settings)
```

1. **Ingestion & Buffering**: Telemetry packets from Plaid (financial purchases), Google Maps (localized transit telemetry), and HomeAssistant (household smart grid energy) flow into an Apache Kafka buffer to absorb high-traffic ingestion spikes.
2. **Processing Workers**: A stateless Go processing engine parses incoming transactions. It matches merchant codes against regional emission coefficients via a Redis semantic cache (reducing LLM reliance and lowering latency under 10ms), falling back to Gemini Flash for unstructured logs.
3. **Dual-Database Layer**: Carbon footprint records are committed to a TimescaleDB time-series cluster for rapid aggregate telemetry querying, while user sessions and system settings reside in MongoDB Atlas.

---

## Key Features

### Operator (User) Experience
- **3D WebGL Galaxy Biome**: A responsive particle galaxy that visually represents the active grid's health. The galaxy shifts dynamically from glowing green to dark orange-grey as emissions fluctuate.
- **AI Copilot (CLiNt-Saver)**: A chat assistant powered by Gemini AI that reviews ledger profiles to recommend carbon-saving choices. Features a local heuristic fallback for offline querying.
- **Carbon Offset Simulator**: Allows users to log offset actions (such as tree planting or methane capture) to test and dynamically reduce their weekly carbon totals.
- **Regional Grid Intensity**: Recommends energy-saving behaviors tailored to local grid intensity profiles (North America, Europe, or Asia-Pacific).

### Administrator Center
- **Secure Command Deck**: A centralized administrative console restricted to the master administrator (`CLiNtech0515@gmail.com`).
- **Alert Broadcaster**: Allows the administrator to broadcast glowing security alert banners to the top of all active operator dashboards.
- **User Registry Management**: Provides administrative controls to audit registered operators and revoke/delete credentials dynamically.
- **Consolidated Key Integrations**: Centralizes server-side integrations (Gmail SMTP and Gemini API key management) inside the secure admin panel rather than exposing credentials globally.

---

## Local Setup & Development

### Prerequisites
- Node.js v18 or newer

### Installation
From the root directory, install dependencies for the entire workspace:
```bash
npm run install:all
```

### Running Locally
To launch both the Next.js frontend (port 3000) and backend Express server (port 5000) concurrently:
```bash
npm run dev
```

---

## Environment Variables

Create a `.env` file inside the `backend/` folder:

```env
PORT=5000
GEMINI_API_KEY=your_gemini_api_key
RESEND_API_KEY=your_resend_api_key
GMAIL_USER=your_gmail_username
GMAIL_APP_PASSWORD=your_gmail_app_password
```

---

## Credits & License

- **Conceptual Design & Architecture**: Siddharth Gopal Dubey. The platform branding and ingestion flow are his exclusive intellectual property.
- **Development Partner**: Co-created with Antigravity (Google DeepMind).
- **License**: MIT License
