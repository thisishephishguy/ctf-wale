-- TRAZ CTF Database Schema v2 — FULL RESET
-- Paste this ENTIRE script into Supabase SQL Editor and click Run.
-- It drops all old tables and recreates everything from scratch.

-- Step 1: Drop existing tables (CASCADE removes foreign key dependencies)
DROP TABLE IF EXISTS stego_fragments CASCADE;
DROP TABLE IF EXISTS defense_alerts CASCADE;
DROP TABLE IF EXISTS layer_progress CASCADE;
DROP TABLE IF EXISTS team_state CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS games CASCADE;

-- Step 2: Publication entries are removed automatically when tables are dropped (CASCADE)

-- ============================================================
-- TABLES
-- ============================================================

-- Games table (each game is one team pairing)
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  status TEXT DEFAULT 'created' CHECK (status IN ('created','deployed','active','finished')),
  created_at TIMESTAMPTZ DEFAULT now(),
  winner_team_id UUID
);

-- Teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  team_code TEXT NOT NULL,
  bridge_code TEXT NOT NULL,
  system_username TEXT NOT NULL,
  system_password TEXT NOT NULL,
  password_category TEXT,
  password_hint TEXT,            -- specific hint for hint 1 (hand-written clue for the word)
  opponent_id UUID,
  instance_url TEXT,
  first_login_done BOOLEAN DEFAULT false,
  forfeited BOOLEAN DEFAULT false,
  forfeit_reason TEXT,
  forfeit_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Team system state (real-time shared state)
CREATE TABLE team_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE UNIQUE,
  firewall_on BOOLEAN DEFAULT true,
  firewall_reinforced BOOLEAN DEFAULT false,
  firewall_reinforce_used BOOLEAN DEFAULT false,
  firewall_locked_until TIMESTAMPTZ,
  apps_locked BOOLEAN DEFAULT true,
  apps_block_used BOOLEAN DEFAULT false,
  apps_relocked BOOLEAN DEFAULT false,
  cracker_cooldown_until TIMESTAMPTZ,
  devices_compromised BOOLEAN DEFAULT false,
  database_locked BOOLEAN DEFAULT false,
  endpoint_password TEXT,
  manage_unlocked BOOLEAN DEFAULT false,
  files_dropped JSONB DEFAULT '[]'::jsonb,
  forfeited BOOLEAN DEFAULT false,
  forfeit_reason TEXT,
  forfeit_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Layer progress tracking
CREATE TABLE layer_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  attacker_team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  layer_number INT NOT NULL CHECK (layer_number BETWEEN 1 AND 5),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INT,
  UNIQUE(game_id, attacker_team_id, layer_number)
);

-- Defense alerts
CREATE TABLE defense_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('firewall','application')),
  triggered_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  responded BOOLEAN DEFAULT false,
  response_action TEXT,
  responded_at TIMESTAMPTZ
);

-- Stego fragments for Layer 4
CREATE TABLE stego_fragments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  image_index INT NOT NULL,       -- 0-5
  word TEXT NOT NULL,
  order_marker INT NOT NULL,
  folder_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- NOTE: no is_real column. The UI must NEVER tell the player which fragments are real.
-- The admin dashboard knows which 3 are real by order_marker 1,2,3 and the endpoint_password.

-- ============================================================
-- REALTIME (enable on ALL tables)
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE teams;
ALTER PUBLICATION supabase_realtime ADD TABLE team_state;
ALTER PUBLICATION supabase_realtime ADD TABLE layer_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE defense_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE stego_fragments;

-- ============================================================
-- ROW LEVEL SECURITY (permissive — app handles its own auth)
-- ============================================================
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE layer_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE defense_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stego_fragments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON games FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON team_state FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON layer_progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON defense_alerts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON stego_fragments FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- GRANTS (required because "auto expose new tables" is OFF)
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
