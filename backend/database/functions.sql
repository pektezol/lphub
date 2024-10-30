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
                WHERE sp.is_deleted = false 
                GROUP BY sp.user_id, sp.map_id
            ) AS subquery 
            WHERE user_id = u.steam_id
        )
    FROM records_sp sp 
    JOIN users u ON u.steam_id = sp.user_id 
    WHERE sp.is_deleted = false 
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
                    WHERE mp.is_deleted = false
                    UNION ALL
                    SELECT 
                        mp.map_id, 
                        mp.partner_id AS player_id, 
                        mp.score_count
                    FROM records_mp mp
                    WHERE mp.is_deleted = false
                ) AS player_scores
                GROUP BY map_id, player_id
            ) AS subquery
            WHERE player_id = u.steam_id
        )
    FROM records_mp mp 
    JOIN users u ON u.steam_id = mp.host_id OR u.steam_id = mp.partner_id
    WHERE mp.is_deleted = false 
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
    WHERE sp.is_deleted = false
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
    min_placements AS (
        SELECT 
            bs.map_id,
            bs.user_id,
            (SELECT COUNT(*) + 1 
            FROM best_scores AS inner_scores 
            WHERE inner_scores.map_id = bs.map_id 
            AND (inner_scores.score_count < bs.score_count 
                    OR (inner_scores.score_count = bs.score_count 
                        AND inner_scores.score_time < bs.score_time)
                )
            ) AS placement
        FROM best_scores AS bs
    )
    SELECT 
        minp.map_id,
        MIN(minp.placement) AS placement
    FROM min_placements minp
    WHERE minp.user_id = get_placements_singleplayer.player_id
    GROUP BY minp.map_id
    ORDER BY minp.map_id, placement;
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
    WHERE mp.is_deleted = false
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
    min_placements AS (
        SELECT 
            bs.map_id,
            bs.host_id,
            bs.partner_id,
            (SELECT COUNT(*) + 1 
            FROM best_scores AS inner_scores 
            WHERE inner_scores.map_id = bs.map_id 
            AND (inner_scores.score_count < bs.score_count 
                    OR (inner_scores.score_count = bs.score_count 
                        AND inner_scores.score_time < bs.score_time)
                )
            ) AS placement
        FROM best_scores AS bs
    ),
    distinct_min_placements AS (
        SELECT unified_placements.map_id, unified_placements.player_id, MIN(unified_placements.placement) AS min_placement
        FROM (
            SELECT minp.map_id, minp.host_id AS player_id, minp.placement FROM min_placements minp
            UNION ALL
            SELECT minp.map_id, minp.partner_id AS player_id, minp.placement FROM min_placements minp
        ) AS unified_placements
        WHERE unified_placements.player_id = get_placements_multiplayer.player_id
        GROUP BY unified_placements.map_id, unified_placements.player_id
    )
    SELECT 
        dminp.map_id,
        dminp.min_placement AS placement
    FROM distinct_min_placements dminp
    ORDER BY dminp.map_id, placement;
END;
$$ LANGUAGE plpgsql;
