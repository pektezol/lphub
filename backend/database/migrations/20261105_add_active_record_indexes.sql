CREATE INDEX CONCURRENTLY IF NOT EXISTS records_sp_active_map_player_score_idx
ON records_sp (map_id, user_id, score_count, score_time)
WHERE is_deleted = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS records_mp_active_map_team_score_idx
ON records_mp (map_id, host_id, partner_id, score_count, score_time)
WHERE is_deleted = false;
