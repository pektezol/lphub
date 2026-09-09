CREATE OR REPLACE FUNCTION log_audit() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit (table_name, operation_type, old_data, new_data, changed_by)
    VALUES (
        TG_TABLE_NAME,
        TG_OP,
        CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
        current_setting('app.user_id', true)::TEXT
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_rankings_singleplayer()
RETURNS TABLE (
    steam_id TEXT,
    user_name TEXT,
    avatar_link TEXT,
    total_min_score_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.steam_id, 
        u.user_name, 
        u.avatar_link, 
        (
            SELECT SUM(min_score_count) AS total_min_score_count 
            FROM (
                SELECT sp.user_id, MIN(sp.score_count) AS min_score_count 
                FROM records_sp sp
                INNER JOIN maps m ON m.id = sp.map_id
                WHERE sp.is_deleted = false AND m.game_id = 1
                GROUP BY sp.user_id, sp.map_id
            ) AS subquery 
            WHERE user_id = u.steam_id
        )
    FROM records_sp sp
    INNER JOIN maps m ON m.id = sp.map_id
    JOIN users u ON u.steam_id = sp.user_id 
    WHERE sp.is_deleted = false AND m.game_id = 1
    GROUP BY u.steam_id, u.user_name, u.avatar_link
    HAVING COUNT(DISTINCT sp.map_id) = (
        SELECT COUNT(m.name) 
        FROM maps m 
        INNER JOIN games g ON m.game_id = g.id 
        WHERE g.id = 1 AND m.is_disabled = false
    )
    ORDER BY total_min_score_count ASC;
END;
$$ LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION get_rankings_multiplayer()
RETURNS TABLE (
    steam_id TEXT,
    user_name TEXT,
    avatar_link TEXT,
    total_min_score_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.steam_id, 
        u.user_name, 
        u.avatar_link, 
        (
            SELECT SUM(min_score_count) AS total_min_score_count 
            FROM (
                SELECT DISTINCT ON (map_id, player_id)
                    map_id,
                    player_id,
                    MIN(score_count) AS min_score_count
                FROM (
                    SELECT 
                        mp.map_id, 
                        mp.host_id AS player_id, 
                        mp.score_count
                    FROM records_mp mp
                    INNER JOIN maps m ON m.id = mp.map_id
                    WHERE mp.is_deleted = false AND m.game_id = 2
                    UNION ALL
                    SELECT 
                        mp.map_id, 
                        mp.partner_id AS player_id, 
                        mp.score_count
                    FROM records_mp mp
                    INNER JOIN maps m ON m.id = mp.map_id
                    WHERE mp.is_deleted = false AND m.game_id = 2
                ) AS player_scores
                GROUP BY map_id, player_id
            ) AS subquery
            WHERE player_id = u.steam_id
        )
    FROM records_mp mp
    INNER JOIN maps m ON m.id = mp.map_id
    JOIN users u ON u.steam_id = mp.host_id OR u.steam_id = mp.partner_id
    WHERE mp.is_deleted = false AND m.game_id = 2
    GROUP BY u.steam_id, u.user_name, u.avatar_link
    HAVING COUNT(DISTINCT mp.map_id) = (
        SELECT COUNT(m.name) 
        FROM maps m 
        INNER JOIN games g ON m.game_id = g.id 
        WHERE g.id = 2 AND m.is_disabled = false
    )
    ORDER BY total_min_score_count ASC;
END;
$$ LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION get_placements_singleplayer(player_id TEXT)
RETURNS TABLE (
    map_id SMALLINT, 
    placement BIGINT
) AS $$
BEGIN
	RETURN QUERY
	WITH ranked_scores AS (
    SELECT 
        sp.map_id,
        sp.user_id,
        sp.score_count,
        sp.score_time,
        ROW_NUMBER() OVER (
            PARTITION BY sp.map_id, sp.user_id
            ORDER BY sp.score_count ASC, sp.score_time ASC
        ) AS rank
    FROM records_sp sp
    INNER JOIN maps m ON m.id = sp.map_id
    WHERE sp.is_deleted = false AND m.game_id = 1
    ),
    best_scores AS (
        SELECT 
            rs.map_id,
            rs.user_id,
            rs.score_count,
            rs.score_time
        FROM ranked_scores rs
        WHERE rs.rank = 1
    ),
    ranked_placements AS (
        SELECT 
            bs.map_id,
            bs.user_id,
            RANK() OVER (
                PARTITION BY bs.map_id
                ORDER BY bs.score_count ASC, bs.score_time ASC
            ) AS placement
        FROM best_scores AS bs
    )
    SELECT 
        rp.map_id,
        rp.placement
    FROM ranked_placements rp
    -- Filter after ranking so competitors still determine the placement.
    WHERE rp.user_id = get_placements_singleplayer.player_id
    ORDER BY rp.map_id, rp.placement;
END;
$$ LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION get_placements_multiplayer(player_id TEXT)
RETURNS TABLE (
    map_id SMALLINT, 
    placement BIGINT
) AS $$
BEGIN
	RETURN QUERY
	WITH ranked_scores AS (
    SELECT 
        mp.map_id,
        mp.host_id,
        mp.partner_id,
        mp.score_count,
        mp.score_time,
        ROW_NUMBER() OVER (
            PARTITION BY mp.map_id, mp.host_id, mp.partner_id
            ORDER BY mp.score_count ASC, mp.score_time ASC
        ) AS rank
    FROM records_mp mp
    INNER JOIN maps m ON m.id = mp.map_id
    WHERE mp.is_deleted = false AND m.game_id = 2
    ),
    best_scores AS (
        SELECT 
            rs.map_id,
            rs.host_id,
            rs.partner_id,
            rs.score_count,
            rs.score_time
        FROM ranked_scores rs
        WHERE rs.rank = 1
    ),
    ranked_placements AS (
        SELECT 
            bs.map_id,
            bs.host_id,
            bs.partner_id,
            RANK() OVER (
                PARTITION BY bs.map_id
                ORDER BY bs.score_count ASC, bs.score_time ASC
            ) AS placement
        FROM best_scores AS bs
    )
    SELECT 
        rp.map_id,
        MIN(rp.placement) AS placement
    FROM ranked_placements rp
    -- Rank teams first, then take the player's best placement across both roles.
    WHERE rp.host_id = get_placements_multiplayer.player_id
        OR rp.partner_id = get_placements_multiplayer.player_id
    GROUP BY rp.map_id
    ORDER BY rp.map_id, placement;
END;
$$ LANGUAGE plpgsql;
