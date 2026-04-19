-- Run this once in your Zeabur PostgreSQL to enable AI analysis storage
-- Connect with: psql $DATABASE_URL

CREATE TABLE IF NOT EXISTS market_analysis (
  player_id    INTEGER      NOT NULL,
  player_name  TEXT,
  analysis     TEXT         NOT NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  -- Only one analysis per player per day
  CONSTRAINT market_analysis_pkey PRIMARY KEY (player_id, created_at::date)
);

-- Index for fast lookups by latest date
CREATE INDEX IF NOT EXISTS market_analysis_created_idx ON market_analysis (created_at DESC);

-- The dashboard query fetches the latest analysis per player
-- SELECT DISTINCT ON (player_id) player_id, analysis, created_at
-- FROM market_analysis ORDER BY player_id, created_at DESC;
