-- Run this file against an existing production database before deploying the
-- profile-statistics endpoint. Each statement is intentionally concurrent, so
-- execute the file outside an explicit transaction.

CREATE INDEX CONCURRENTLY IF NOT EXISTS records_sp_active_user_map_score_idx
  ON records_sp (user_id, map_id, score_count, score_time, id)
  WHERE is_deleted = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS records_sp_active_map_user_score_idx
  ON records_sp (map_id, user_id, score_count, score_time, id)
  WHERE is_deleted = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS records_mp_active_host_map_score_idx
  ON records_mp (host_id, map_id, score_count, score_time, id)
  WHERE is_deleted = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS records_mp_active_partner_map_score_idx
  ON records_mp (partner_id, map_id, score_count, score_time, id)
  WHERE is_deleted = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS records_mp_active_map_team_score_idx
  ON records_mp (map_id, host_id, partner_id, score_count, score_time, id)
  WHERE is_deleted = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS map_history_least_portals_minimum_idx
  ON map_history (map_id, category_id, score_count)
  WHERE category_id = 1;
