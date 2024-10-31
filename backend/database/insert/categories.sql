INSERT INTO categories(id, name) VALUES
(1, 'CM'),
(2, 'No SLA'),
(3, 'Inbounds SLA'),
(4, 'Any%'),
(5, 'All Courses');

INSERT INTO game_categories(id, game_id, category_id) VALUES
(1, 1, 1),
(2, 1, 2),
(3, 1, 3),
(4, 1, 4),
(5, 2, 1),
(6, 2, 4),
(7, 2, 5);