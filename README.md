# CLiNt Terra

CLiNt Terra is an immersive, passive carbon event-sourcing ledger and sustainability dashboard. It converts daily activity telemetry (utility grid logs, transit routing, and transaction logs) into an interactive carbon footprint profile, visualized using a dynamic 3D WebGL particle galaxy.

---

## Key Features

- **3D WebGL Biome Galaxy**: A particle star system that shifts from glowing green to decaying orange-grey based on carbon footprint health.
- **Intelligent Copilot (CLiNt-Saver)**: A Gemini AI chat assistant that provides real-time ledger analysis and carbon reduction recommendations.
- **Operator Utilities**: An interactive carbon offset simulator and regional grid intensity calculator.
- **Secure Admin Command Deck**: A restricted space (for `CLiNtech0515@gmail.com`) to manage registered operators, broadcast site-wide security alerts, and configure integration keys.

---

## Quick Start

### Installation
Install dependencies for both the frontend and backend applications:
```bash
npm run install:all
```

### Running Locally
Start the development servers for the frontend (port 3000) and backend (port 5000) concurrently:
```bash
npm run dev
```

---

## Configuration

Configure your integration keys by creating a `.env` file in the `backend/` directory:

```env
PORT=5000
GEMINI_API_KEY=your_gemini_api_key_here
RESEND_API_KEY=your_resend_api_key_here
GMAIL_USER=your_gmail_username
GMAIL_APP_PASSWORD=your_gmail_app_password
```

*Note: Credentials can also be managed dynamically via the secure Admin Command Deck.*

---

## Credits & License

- Envisioned and founded by Siddharth Gopal Dubey.
- Developed in collaboration with Antigravity (Google DeepMind).
- Released under the MIT License.
