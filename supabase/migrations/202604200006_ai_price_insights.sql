-- Phase 8: AI price insights on projects
-- Stores model-generated estimated project budget range and rationale.

alter table if exists projects
  add column if not exists ai_price_min_cad integer,
  add column if not exists ai_price_max_cad integer,
  add column if not exists ai_price_rationale text,
  add column if not exists ai_price_confidence text,
  add column if not exists ai_price_generated_at timestamptz;
