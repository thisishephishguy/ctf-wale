# TRAZ - Cybersecurity CTF Platform Setup & Deployment Guide

This document provides step-by-step instructions for deploying and running TRAZ locally or on cloud providers (Vercel/Netlify) with a free Supabase backend.

---

## Architecture Overview

- **Frontend:** React 18, Vite, Tailwind CSS 3, React Router DOM v6
- **Backend & Database:** Supabase (PostgreSQL with Realtime pub/sub)
- **Deployment:** Vercel or Netlify (static/SPA frontend)

---

## Step 1: Create a Free Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up / sign in (no credit card required).
2. Click **New project** from your dashboard.
3. Fill in the details:
   - **Name:** `traz-ctf` (or your preferred name)
   - **Database Password:** Choose a strong password and save it securely.
   - **Region:** Choose the region closest to your users.
   - **Pricing Plan:** Select **Free Tier**.
4. Click **Create new project** and wait 1–2 minutes for the database provisioning to complete.

---

## Step 2: Run `schema.sql` in Supabase SQL Editor

1. Open your Supabase project dashboard.
2. In the left navigation bar, click on the **SQL Editor** icon (`>_`).
3. Click **New query**.
4. Open the [`supabase/schema.sql`](supabase/schema.sql) file from this repository, copy its entire contents, and paste them into the query editor.
5. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`).
6. Confirm all tables and policies were created successfully:
   - `games`
   - `teams`
   - `team_state`
   - `layer_progress`
   - `defense_alerts`
   - `stego_fragments`
   - Realtime publication added for key tables (`team_state`, `layer_progress`, `defense_alerts`, `teams`).

---

## Step 3: Copy Supabase Credentials to `.env`

1. In your Supabase dashboard, go to **Project Settings** (gear icon) > **API**.
2. Locate the following values:
   - **Project URL** (e.g. `https://xyzcompany.supabase.co`)
   - **Project API Keys** -> `anon` / `public` key
3. In the root directory of this project, create a `.env` file (copying from `.env.example`):
   ```bash
   cp .env.example .env
   ```
4. Populate your `.env` file:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   VITE_ADMIN_USERNAME=admin
   VITE_ADMIN_PASSWORD=traz2024
   ```

---

## Step 4: Set Admin Credentials in `.env`

Configure the game master / controller credentials in `.env`:
- `VITE_ADMIN_USERNAME`: Master dashboard username (default: `admin`)
- `VITE_ADMIN_PASSWORD`: Master dashboard password (default: `traz2024`)

---

## Step 5: Install Dependencies and Build Locally

1. Open a terminal in the project root:
   ```bash
   npm install
   ```
2. Run the local development server:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:3000`.
3. Verify that the production build succeeds without warnings or errors:
   ```bash
   npm run build
   ```

---

## Step 6: Deploy to Vercel or Netlify

### Option A: Vercel (Recommended)

1. **Deploy via CLI:**
   ```bash
   npx vercel
   ```
   Follow the prompts to link the project and deploy.
2. For production deploy:
   ```bash
   npx vercel --prod
   ```

### Option B: Netlify

1. **Deploy via CLI:**
   ```bash
   npx netlify deploy
   ```
2. For production deploy:
   ```bash
   npx netlify deploy --prod --dir=dist
   ```

### SPA Routing Note for Production

- **Vercel:** Create a `vercel.json` if needed for client-side routing fallback:
  ```json
  {
    "rewrites": [
      { "source": "/(.*)", "destination": "/index.html" }
    ]
  }
  ```
- **Netlify:** Ensure a `_redirects` file is in your `public` directory with:
  ```text
  /*    /index.html   200
  ```

---

## Step 7: Set Environment Variables in Hosting Dashboard

Make sure to configure the same environment variables on your cloud provider:

1. **Vercel:**
   - Go to your Project > **Settings** > **Environment Variables**.
   - Add:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
     - `VITE_ADMIN_USERNAME`
     - `VITE_ADMIN_PASSWORD`
   - Trigger a redeployment if needed.

2. **Netlify:**
   - Go to **Site configuration** > **Environment variables**.
   - Add the same 4 variables.
   - Trigger a redeploy from **Deploys**.

---

## Troubleshooting

### 1. Realtime Events Not Triggering
- In Supabase, verify **Database** > **Replication** has the following tables enabled for `supabase_realtime`:
  - `team_state`
  - `layer_progress`
  - `defense_alerts`
  - `teams`
- If missing, re-run the `ALTER PUBLICATION supabase_realtime ADD TABLE ...` commands in the SQL Editor.

### 2. RLS (Row Level Security) Blocking Operations
- Make sure that permissive policies exist for anon users (`CREATE POLICY "Allow all" ON ... FOR ALL USING (true) WITH CHECK (true);`).
- Verify in **Authentication** > **Policies** that each table has the "Allow all" policy active.

### 3. Blank Page on Refresh in Production
- Ensure SPA rewrites are enabled (refer to Step 6) so deep routes (e.g., `/team/abc`, `/admin`) are redirected to `index.html`.

### 4. Missing Environment Variables
- Check browser console for `[TRAZ Warning] Supabase URL or Anon Key is missing`.
- Ensure environment variables in Vite start with `VITE_`.
