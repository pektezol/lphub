DROP FUNCTION get_rankings_singleplayer();
DROP FUNCTION get_rankings_multiplayer();
DROP FUNCTION get_rankings_mel(INTEGER);
CREATE OR REPLACE FUNCTION get_rankings_singleplayer()
RETURNS TABLE (
    steam_id TEXT,
    user_name TEXT,
    avatar_link TEXT,
    total_min_score_count BIGINT,
    total_time_ticks BIGINT
) AS $$
    WITH ranked_scores AS (
        SELECT
            sp.user_id,
            sp.map_id,
            sp.score_count,
            sp.score_time,
            ROW_NUMBER() OVER (
                PARTITION BY sp.user_id, sp.map_id
                ORDER BY sp.score_count ASC, sp.score_time ASC
            ) AS row_number
        FROM records_sp sp
        JOIN maps m ON m.id = sp.map_id
        WHERE sp.is_deleted = false AND m.game_id = 1
    ), best_scores AS (
        SELECT user_id, map_id, score_count, score_time
        FROM ranked_scores
        WHERE row_number = 1
    )
    SELECT
        u.steam_id,
        u.user_name,
        u.avatar_link,
        SUM(b.score_count)::BIGINT,
        SUM(b.score_time)::BIGINT
    FROM best_scores b
    JOIN users u ON u.steam_id = b.user_id
    GROUP BY u.steam_id, u.user_name, u.avatar_link
    HAVING COUNT(DISTINCT b.map_id) = (
        SELECT COUNT(m.name)
        FROM maps m
        JOIN games g ON m.game_id = g.id
        WHERE g.id = 1 AND m.is_disabled = false
    )
    ORDER BY SUM(b.score_count) ASC;
$$ LANGUAGE sql STABLE;



CREATE OR REPLACE FUNCTION get_rankings_multiplayer()
RETURNS TABLE (
    steam_id TEXT,
    user_name TEXT,
    avatar_link TEXT,
    total_min_score_count BIGINT,
    total_time_ticks BIGINT
) AS $$
    WITH player_scores AS (
        SELECT mp.map_id, mp.host_id AS player_id, mp.score_count, mp.score_time
        FROM records_mp mp
        JOIN maps m ON m.id = mp.map_id
        WHERE mp.is_deleted = false AND m.game_id = 2
        UNION ALL
        SELECT mp.map_id, mp.partner_id AS player_id, mp.score_count, mp.score_time
        FROM records_mp mp
        JOIN maps m ON m.id = mp.map_id
        WHERE mp.is_deleted = false AND m.game_id = 2
    ), ranked_scores AS (
        SELECT
            map_id,
            player_id,
            score_count,
            score_time,
            ROW_NUMBER() OVER (
                PARTITION BY map_id, player_id
                ORDER BY score_count ASC, score_time ASC
            ) AS row_number
        FROM player_scores
    ), best_scores AS (
        SELECT map_id, player_id, score_count, score_time
        FROM ranked_scores
        WHERE row_number = 1
    )
    SELECT
        u.steam_id,
        u.user_name,
        u.avatar_link,
        SUM(b.score_count)::BIGINT,
        SUM(b.score_time)::BIGINT
    FROM best_scores b
    JOIN users u ON u.steam_id = b.player_id
    GROUP BY u.steam_id, u.user_name, u.avatar_link
    HAVING COUNT(DISTINCT b.map_id) = (
        SELECT COUNT(m.name)
        FROM maps m
        JOIN games g ON m.game_id = g.id
        WHERE g.id = 2 AND m.is_disabled = false
    )
    ORDER BY SUM(b.score_count) ASC;
$$ LANGUAGE sql STABLE;



CREATE OR REPLACE FUNCTION get_rankings_mel(mode_id INTEGER)
RETURNS TABLE (
    steam_id TEXT,
    user_name TEXT,
    avatar_link TEXT,
    total_min_score_count BIGINT,
    total_time_ticks BIGINT
) AS $$
    WITH enabled_maps AS (
        SELECT id FROM maps
        WHERE game_id = 3 AND chapter_id = mode_id AND is_disabled = false
    ), ranked_scores AS (
        SELECT
            sp.user_id,
            sp.map_id,
            sp.score_count,
            sp.score_time,
            ROW_NUMBER() OVER (
                PARTITION BY sp.user_id, sp.map_id
                ORDER BY sp.score_count ASC, sp.score_time ASC
            ) AS row_number
        FROM records_sp sp
        JOIN enabled_maps m ON m.id = sp.map_id
        WHERE sp.is_deleted = false
    ), best_scores AS (
        SELECT user_id, map_id, score_count, score_time
        FROM ranked_scores
        WHERE row_number = 1
    )
    SELECT
        u.steam_id,
        u.user_name,
        u.avatar_link,
        SUM(b.score_count)::BIGINT,
        SUM(b.score_time)::BIGINT
    FROM best_scores b
    JOIN users u ON u.steam_id = b.user_id
    GROUP BY u.steam_id, u.user_name, u.avatar_link
    HAVING COUNT(*) = (SELECT COUNT(*) FROM enabled_maps)
    ORDER BY SUM(b.score_count), u.steam_id;
$$ LANGUAGE sql STABLE;



