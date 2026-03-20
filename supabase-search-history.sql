-- Supabase migration: Create search_history table for SMS search logging
-- Run this in the Supabase SQL Editor or as a migration

CREATE TABLE IF NOT EXISTS search_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone_from TEXT,
  address TEXT NOT NULL,
  result_json JSONB DEFAULT '{}'::jsonb,
  search_type TEXT NOT NULL DEFAULT 'property_lookup',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast user history lookups (ordered by most recent)
CREATE INDEX IF NOT EXISTS idx_search_history_user_created
  ON search_history (user_id, created_at DESC);

-- Index for phone number lookups
CREATE INDEX IF NOT EXISTS idx_search_history_phone
  ON search_history (phone_from);

-- Enable Row Level Security
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- Policy: users can only read their own search history
CREATE POLICY "Users can view own search history"
  ON search_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: service role can insert (server-side only)
CREATE POLICY "Service role can insert search history"
  ON search_history
  FOR INSERT
  WITH CHECK (true);

-- Policy: service role can read all (for admin)
CREATE POLICY "Service role can read all search history"
  ON search_history
  FOR SELECT
  USING (true);
