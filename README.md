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

## Key Features & User Experience

### 🌐 Cybernetic Operator (User) Experience
- **Interactive 3D WebGL Digital Twin Biosphere**: Renders a real-time interactive particle galaxy using React Three Fiber. The twin acts as a direct visual feedback loop of the operator's carbon grid:
  - **Stable Biome (Green)**: Flourishing glowing green particles when emissions remain under the target budget.
  - **Decaying Biome (Orange-Grey)**: Smoggy orange particle grid if emissions exceed the allowance.
- **Floating AI Copilot (CLiNt-Saver)**: A personal sustainability agent powered by Gemini AI. It inspects live transaction logs to offer precise calculations, sustainability suggestions, and inline LaTeX mathematical breakdowns ($GHG = Activity \times Coefficient$). Includes an offline semantic rule-engine fallback.
- **Financial-Grade Carbon Ingestion Ledger**: Interactive UI tables categorizing GHG emissions from Plaid category feeds, transit logs, and energy grid variables, complete with carbon offset balance calculations.
- **Interactive Scenario Simulation**: Allows operators to manually trigger mock webhook ingestion packets (Food & Dining, Transit, Household Utilities) or log Carbon Offsets (Reforestation, Agriculture Methane Digester, Wind Infrastructure) to test biome state responses.
- **Regional Grid Intensity Optimizer**: Adapts recommendations dynamically based on regional grid sensors (North America, Europe, or Asia-Pacific).

### 🛡️ Administrator Command Deck
- **Secure Command Deck Console**: A centralized console restricted to the master administrator (`CLiNtech0515@gmail.com`) for managing active operator nodes.
- **Real-Time Alert Broadcaster**: Allows the administrator to broadcast high-visibility security alert banners to all user dashboards.
- **User Registry Controls**: Enables administrators to audit operator accounts and revoke/delete credentials dynamically.
- **Consolidated Server-Side Integration Settings**: Synchronizes Gmail SMTP credentials and Gemini API configurations securely on the server (`settings.json` fallback or MongoDB Atlas), preventing key exposures in client-side code.

---

## Production-Grade Security Hardening

CLiNt Terra is hardened against critical security vulnerabilities using enterprise-grade defense-in-depth principles:

1. **Native Token-Based JWT Authentication**: Uses a custom, zero-dependency token signing and verification engine built on Node's native `crypto` module (preventing supply-chain package vulnerability vectors). Administrative actions and profile updates require a short-lived (2-hour expiry) Bearer JWT.
2. **ReDoS & Backtracking Protection**: Normalizes all email query strings to lowercase and performs exact string equality matching on MongoDB queries (`{ email: email.toLowerCase() }`), completely avoiding dynamic RegExp object compilation.
3. **NoSQL Injection Defenses**: Explicitly type-casts all incoming parameters to string primitives and filters control characters. Checks input structure via strict email format validation.
4. **Input Sanitization & Pastejacking Countermeasures**: Cleans name, email, passphrase, settings, and chat fields on both the client and server sides to strip control characters (ASCII 0-31 and 127) and prevent shell script injections.
5. **Large Payload DoS Mitigation**: Implements strict 20KB body size limits on Express body parsers to prevent Out-of-Memory (OOM) server exhaustion crashes.
6. **XSS & Template Injection (SSTI) Defenses**: Automatically HTML-escapes all dynamic parameters interpolated into welcome, login, and recovery email HTML bodies.
7. **Secure Key and Data Lifecycle**: Generates a runtime-random, cryptographically secure 256-bit signing key on boot (unless overridden by env). Passwords are completely omitted from all API query payloads.
8. **Enforced Input Constraints**: Enforces length boundaries on user profile fields on both frontend and backend (Name: 2-50 characters, Passphrase: 8-128 characters, Email: max 254 characters).

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
