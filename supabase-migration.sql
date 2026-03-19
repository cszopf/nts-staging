-- Run this in Supabase SQL Editor to create the tables
-- that replace the local SQLite database.

CREATE TABLE IF NOT EXISTS nts_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT,
  email TEXT,
  phone TEXT,
  brokerage TEXT,
  sales_rep TEXT
);

CREATE TABLE IF NOT EXISTS nts_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES nts_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  address_full TEXT,
  unit TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  county TEXT,
  is_ohio BOOLEAN DEFAULT false,
  place_id TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  owner_name TEXT,
  owner_mailing_address TEXT,
  parcel_number TEXT,
  property_type TEXT,
  beds INTEGER,
  baths DOUBLE PRECISION,
  sqft INTEGER,
  tax_year INTEGER,
  annual_taxes DOUBLE PRECISION,
  homestead BOOLEAN DEFAULT false,
  sale_price DOUBLE PRECISION,
  closing_date TEXT,
  commission_type TEXT,
  commission_value DOUBLE PRECISION,
  commission_amount DOUBLE PRECISION,
  seller_credits_total DOUBLE PRECISION,
  mortgage_payoffs JSONB DEFAULT '[]',
  mortgage_payoffs_total DOUBLE PRECISION,
  home_warranty DOUBLE PRECISION DEFAULT 0,
  hoa_monthly DOUBLE PRECISION,
  hoa_transfer_fee DOUBLE PRECISION,
  other_costs JSONB DEFAULT '[]',
  other_costs_total DOUBLE PRECISION,
  estimated_closing_costs_total DOUBLE PRECISION,
  estimated_title_premium DOUBLE PRECISION,
  estimated_transfer_tax DOUBLE PRECISION,
  estimated_tax_proration DOUBLE PRECISION,
  estimated_net_proceeds DOUBLE PRECISION,
  inputs_json JSONB DEFAULT '{}',
  calc_json JSONB DEFAULT '{}',
  share_token TEXT,
  share_count INTEGER DEFAULT 0
);

-- Index for fast lookups by share token
CREATE INDEX IF NOT EXISTS idx_nts_estimates_share_token ON nts_estimates(share_token);

-- Enable RLS (adjust policies to your needs)
ALTER TABLE nts_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE nts_estimates ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (your server uses supabaseAdmin)
-- No additional policies needed since the service role key bypasses RLS.
