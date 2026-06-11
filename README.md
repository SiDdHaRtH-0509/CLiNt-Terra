# 🌍 CLiNt Terra

> **Carbon Intelligence & Sustainability Hub**  
> An immersive, AI-powered carbon ledger and sustainability dashboard featuring interactive 3D visualizations, automated lifecycle communication engines, and an intelligent co-pilot.

---

## ✨ Key Features

- **🚀 Interactive 3D WebGL Galaxy**: A high-density particle star system that shifts dynamically based on the active theme (glowing neon cosmic dust in dark mode; deep watercolor indigo/magenta clouds in light mode).
- **💬 Intelligent AI Copilot (CLiNt)**: Powered by Gemini Pro with an offline heuristic question-and-answer fallback cache. The companion floats smoothly and emits animated, rising semi-transparent thinking bubbles.
- **🗺️ Carbon Twin 3D**: Immersive 3D globe visualization representing earth-moon system emissions telemetry.
- **📊 Interactive Ledger Tables**: Responsive data grids to manage carbon credits, audit trails, and transaction certification histories.
- **🔗 Emissions Pipeline Flow**: Visually engaging flowchart node graph representing carbon processing stages.
- **✉️ Email Lifecycle Center**: Complete automated mail engine to manage, schedule, and send welcome or lifecycle status updates (powered by Express, Nodemailer, and Resend).
- **🧭 Gated Onboarding Walkthrough**: Step-by-step user onboarding tour designed to only prompt new sign-ups, keeping login seamless.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js (React)
- **Styling**: TailwindCSS & Vanilla CSS
- **3D Graphics**: Three.js, React Three Fiber (R3F), `@react-three/drei`
- **Animations**: Keyframe micro-animations, Framer Motion

### Backend
- **Server**: Node.js, Express
- **AI Integration**: Google Generative AI (`@google/generative-ai` / Gemini API)
- **Email Dispatch**: Nodemailer (SMTP) & Resend API
- **Tooling**: ES Modules, dotenv, CORS

---

## 📁 Project Structure

This project is built as a unified monorepo to separate frontend client interface and backend API routes.

```text
CLiNt Terra/
├── frontend/             # Next.js Application (UI & 3D components)
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/              # Node.js/Express Server (Gemini AI & Email API)
│   ├── index.js          # Express entrypoint (runs on port 5000)
│   └── package.json
│
├── package.json          # Root scripts to orchestrate the monorepo
└── .gitignore            # Clean git exclusion rules
```

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org) (v18+ recommended) installed.

### Installation
From the root directory, install dependencies for both the frontend and backend folders simultaneously:
```bash
npm run install:all
```

### Running Locally
To boot up both the Next.js dev server (port 3000) and the Express server (port 5000) concurrently:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. All API calls (such as `/api/chat` and `/api/send-email`) are automatically proxied from the frontend port 3000 to the backend port 5000 behind the scenes.

---

## ⚙️ Environment Variables

Create a `.env` file inside the `backend/` folder to supply API keys:

```env
PORT=5000
GEMINI_API_KEY=your_gemini_api_key_here
RESEND_API_KEY=your_resend_api_key_here
# Optional SMTP configuration
GMAIL_USER=your_gmail_username
GMAIL_APP_PASSWORD=your_gmail_app_password
```

---

## 🤖 Prompted on Antigravity
This project was co-created and optimized using **Antigravity**, a next-generation agentic coding assistant by Google DeepMind.
