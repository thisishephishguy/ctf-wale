# TRAZ — Browser-Based Cybersecurity CTF Exercise

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646cff.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38bdf8.svg)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_%2B_Realtime-3ecf8e.svg)](https://supabase.com/)

TRAZ is a lightweight, browser-based, two-team cybersecurity capture-the-flag (CTF) game specifically designed for collegiate classes and workshops without requiring advanced security prerequisites.

The game is **completely simulated** — there is no actual network penetration, packet tampering, or dangerous exploitation tooling. It is safe to deploy publicly across school networks, universities, and serverless hosting environments.

Each team operates a simulated "Web OS" terminal and desktop environment representing their own defense infrastructure while actively breaching their opponent's system across 5 escalating security layers.

---

## 🎯 Game Overview & Layers

Teams compete in pairs (Team A vs. Team B). Attackers attempt to dismantle the opponent's defensive posture layer by layer while defenders monitor activity and trigger countermeasures.

| Layer | Security Domain | Attack Goal | Defense Mechanics |
| :--- | :--- | :--- | :--- |
| **1** | **Physical / Password Security** | Decrypt or crack the opponent's system password using contextual clues and brute-force patterns. | None |
| **2** | **Network Security (Firewall)** | Disable the opponent's network firewall controls via configuration exploits. | 15-second window to trigger **Reinforce** (Single use) |
| **3** | **Application Security** | Launch an automated cracker payload to bypass locked application gates. | Defensive **Block** trigger to re-engage locks (Single use) |
| **4** | **Endpoint Security** | Recover hidden steganography fragments and reconstruct the master keyphrase. | None |
| **5** | **Database / Ransomware** | Deploy ransomware payload to compromise and lock the database cluster. | None |

---

## 🚀 Tech Stack

- **Frontend**: React 18, Vite 5, Tailwind CSS, Lucide Icons (Static Single Page Application).
- **Backend / State Engine**: Supabase (PostgreSQL with real-time replication via WebSocket subscriptions).
- **Hosting**: Vercel or Netlify (Runs completely within free tier limits, no credit card required).
- **Zero Infrastructure**: No Docker containers, no virtual machines, no VPS overhead.

---

## ✨ Features

- **Multi-Pairing Support**: Create, manage, deploy, and monitor multiple concurrent team matches from a single instructor control room.
- **Bi-Directional Real-Time Synchronization**: Instant state propagation between attacking actions and defending consoles via Supabase Realtime.
- **Instructor / Admin Control Room**: Live telemetry dashboard tracking active pairing progress, phase transitions, and completion timestamps.
- **Client-Side Anti-Cheat System**: Integrated DevTools interception (keyboard shortcuts, context menus, viewport heuristics) triggering immediate disqualification upon tampering.
- **Dynamic Session Generation**: Fully randomized passwords, steganographic tokens, bridge access codes, and team credentials generated per pairing.
- **Lifecycle Management**: Clean teardown, pairing reset, and instant regeneration capabilities.

---

## 📋 Prerequisites

Before setting up the project, make sure you have:
- [Node.js](https://nodejs.org/) (version 18 or newer)
- [npm](https://docs.npmjs.com/) (bundled with Node.js)
- A free [Supabase](https://supabase.com/) account
- A free [Vercel](https://vercel.com/) or [Netlify](https://netlify.com/) account (for deployment)

---

## 🛠️ Step-by-Step Setup Guide

### 1. Clone or Download the Repository

```bash
git clone <repository-url>
cd Traz
```

### 2. Create a Free Supabase Project

1. Log into your [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **New Project**.
3. Set your project name to `traz`, select your preferred hosting region, and provide a strong database password.
4. Allow 1–2 minutes for the database instance to provision.

### 3. Initialize the Database Schema

1. Open your project on Supabase and navigate to the **SQL Editor** tab on the left sidebar.
2. Click **New Query**.
3. Open `supabase/schema.sql` from this repository, copy its full contents, and paste them into the query editor.
4. Click **Run** (`Ctrl+Enter` / `Cmd+Enter`). This creates all relational tables, indexes, row-level policies, and configures the Realtime publication channel.

### 4. Obtain Supabase API Credentials

1. In Supabase, navigate to **Project Settings** (gear icon) → **API**.
2. Copy the **Project URL** (format: `https://xxxxxxxxxxxx.supabase.co`).
3. Copy the **anon / public** API Key (format: `eyJhbGciOi...`).

### 5. Configure Environment Variables

Create a local `.env` configuration file:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_ADMIN_USERNAME=admin
VITE_ADMIN_PASSWORD=your-secure-password
```

### 6. Install Dependencies and Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser to access the TRAZ environment.

---

## 🚢 Deployment

### Option A: Deploy to Vercel (Recommended)

1. Push your repository to GitHub / GitLab.
2. Navigate to [Vercel](https://vercel.com/) and click **Add New...** → **Project**.
3. Import your TRAZ repository.
4. Set the **Framework Preset** to `Vite`.
5. Under **Environment Variables**, supply:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ADMIN_USERNAME`
   - `VITE_ADMIN_PASSWORD`
6. Click **Deploy**. Your instance will be live at `https://your-project.vercel.app`.

### Option B: Deploy to Netlify

1. Push your repository to GitHub / GitLab.
2. Log into [Netlify](https://netlify.com/) and click **Add new site** → **Import an existing project**.
3. Choose your repository.
4. Set Build Settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Under **Site configuration** → **Environment variables**, input all four `VITE_*` keys.
6. Click **Deploy site**.

---

## 🕹️ Instructor / Admin Operations Guide

### 1. Accessing the Dashboard
- Navigate to the root homepage.
- Click **Admin Access** in the upper right corner.
- Authenticate with the credentials configured in `VITE_ADMIN_USERNAME` and `VITE_ADMIN_PASSWORD`.

### 2. Creating Pairings
- Click **CREATE NEW PAIRING**.
- The platform automatically calculates and provisions:
  - **Team A & Team B Codes** (for Teams login / Defend view).
  - **Bridge Codes** (for Breach login / Attack view).
  - Randomized dictionary passwords + numbers + special characters.
  - Steganographic image payloads and split secrets.

### 3. Deploying Matches
- Click **DEPLOY** on the pairing module to transition the session from draft to active status.

### 4. Distributing Student Credentials
Distribute keys according to the attack/defense matrix:

- **Team A receives:**
  - `Team A Team Code` (Used at **Team Login** to manage their defense OS).
  - `Team B Bridge Code` (Used at **Breach Login** to mount an assault on Team B).
- **Team B receives:**
  - `Team B Team Code` (Used at **Team Login** to manage their defense OS).
  - `Team A Bridge Code` (Used at **Breach Login** to mount an assault on Team A).

> **Rule of thumb**: A team authenticates into their *own* system using their **Team Code**, and targets their *opponent* using the opponent's **Bridge Code**.

### 5. Live Match Orchestration
- Students view their defense terminals and breach interfaces simultaneously across split screens or separate monitors.
- The Admin Dashboard receives real-time progress events for each layer.
- When an adversary clears Layer 5, the pairing locks, announcing the winning team.

### 6. Reset & Teardown
- Click **DELETE PAIRING** to purge database entries once completed.
- Create fresh pairings for subsequent rounds with newly generated secrets.

---

## 🛡️ Anti-Cheat Subsystem

To maintain competitive integrity without native client software:
- Intercepts key combos including `F12`, `Ctrl+Shift+I`, `Ctrl+Shift+J`, `Ctrl+U`, and mouse secondary clicks (context menus).
- Inspects screen and window dimension differentials to flag open developer consoles.
- Flags and enforces instant forfeiture if inspection attempts are recorded during active gameplay.
- Instructors receive immediate forfeit notices on the dashboard.
- *Note: Anti-cheat guards are disabled on administrative routes.*

---

## 📁 Project Architecture

```
Traz/
├── index.html              # HTML5 entry shell
├── package.json            # Node.js dependencies & scripts
├── vite.config.js          # Vite build pipeline configuration
├── tailwind.config.js      # Tailwind design system tokens & colors
├── .env.example            # Environment variable reference template
├── supabase/
│   └── schema.sql          # PostgreSQL DDL, policies, and realtime publications
├── src/
│   ├── main.jsx            # React root application initialization
│   ├── App.jsx             # Route definitions & state providers
│   ├── index.css           # Global CSS and custom scanline/crt utilities
│   ├── lib/
│   │   └── supabase.js     # Supabase client instantiation
│   ├── contexts/
│   │   └── GameContext.jsx # Global game state, auth sessions, and synchronization
│   ├── components/
│   │   ├── AntiCheat.jsx   # DevTools detection and penalty dispatch
│   │   ├── DevToolsWarning.jsx # Player pre-match advisory notice
│   │   └── WebOS/          # Simulated desktop OS environment
│   │       ├── Desktop.jsx         # Desktop surface & icon grid
│   │       ├── Taskbar.jsx         # Bottom taskbar & status indicators
│   │       ├── Window.jsx          # Draggable / minimizable window frame
│   │       ├── Terminal.jsx        # Command shell interpreter
│   │       ├── FileExplorer.jsx    # File navigation & hints system
│   │       ├── Transmitter.jsx     # Payload transmission utility
│   │       ├── FirewallApp.jsx     # Network rules & status manager
│   │       ├── DefenseConsole.jsx  # Defensive action triggers (Reinforce / Block)
│   │       ├── StegExtract.jsx     # Image steganography decoding utility
│   │       ├── ManageApp.jsx       # Administrative control center
│   │       ├── Toolkit.jsx         # Attack tool suite launcher
│   │       └── CrackerRunner.jsx   # Exploit payload progress simulation
│   └── pages/
│       ├── HomePage.jsx        # Landing page & mode selector
│       ├── AdminLogin.jsx      # Admin authentication page
│       ├── AdminDashboard.jsx  # Instructor control center & telemetry
│       ├── TeamLogin.jsx       # Defense OS team portal
│       ├── BridgeLogin.jsx     # Attack console breach portal
│       ├── TeamOS.jsx          # Defender's Web OS surface
│       ├── BreachOS.jsx        # Attacker's breach interface
│       └── PasswordBreach.jsx  # Layer 1 challenge environment
```

---

## 🔧 Troubleshooting

| Issue | Resolution |
| :--- | :--- |
| **Supabase client errors (Failed to fetch / unauthorized)** | Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`. Ensure the anon key starts with `eyJ...`. |
| **Realtime updates not syncing between windows** | Open Supabase SQL Editor and ensure the query included `ALTER PUBLICATION supabase_realtime ADD TABLE pairings, teams;`. Check browser WebSocket connections in Network tab. |
| **DevTools violation triggered unintentionally** | Inspect zoom levels or browser extensions that emulate responsive devices. Reload the page cleanly. Admin pages do not trigger anti-cheat. |
| **Build failure during `npm run build`** | Verify Node.js is v18 or later with `node -v`. Run `rm -rf node_modules package-lock.json && npm install`. |

---

## 📄 License

This project is open-source software licensed under the [MIT License](LICENSE).
