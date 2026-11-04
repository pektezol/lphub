#!/bin/sh
set -eu
for file in /schema/init.sql /schema/functions.sql /schema/insert/games.sql /schema/insert/categories.sql /schema/insert/chapters.sql /schema/insert/maps.sql /schema/insert/countries.sql /schema/insert/history.sql; do
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$file"
done
