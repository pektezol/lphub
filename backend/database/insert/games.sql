INSERT INTO games(id, name, is_coop, section_kind, section_label) VALUES
(1, 'Portal 2 - Singleplayer', false, 'chapter', 'Chapter'),
(2, 'Portal 2 - Cooperative', true, 'course', 'Course'),
(3, 'Portal Stories: Mel', false, 'mode', 'Mode');

SELECT setval(pg_get_serial_sequence('games', 'id'), (SELECT MAX(id) FROM games));
