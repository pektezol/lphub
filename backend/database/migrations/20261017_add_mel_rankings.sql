CREATE OR REPLACE FUNCTION get_rankings_mel(mode_id INTEGER)
RETURNS TABLE (
    steam_id TEXT,
    user_name TEXT,
    avatar_link TEXT,
    total_min_score_count BIGINT
) AS $$
    WITH enabled_maps AS (
        SELECT id FROM maps
        WHERE game_id = 3 AND chapter_id = mode_id AND is_disabled = false
    ), best_scores AS (
        SELECT sp.user_id, sp.map_id, MIN(sp.score_count) AS score_count
        FROM records_sp sp
        JOIN enabled_maps m ON m.id = sp.map_id
        WHERE sp.is_deleted = false
        GROUP BY sp.user_id, sp.map_id
    )
    SELECT u.steam_id, u.user_name, u.avatar_link, SUM(b.score_count)::BIGINT
    FROM best_scores b
    JOIN users u ON u.steam_id = b.user_id
    GROUP BY u.steam_id, u.user_name, u.avatar_link
    HAVING COUNT(*) = (SELECT COUNT(*) FROM enabled_maps)
    ORDER BY SUM(b.score_count), u.steam_id;
$$ LANGUAGE sql STABLE;
