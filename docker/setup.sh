#!/bin/sh
set -eu
npm --prefix frontend install
[ -f .env ] || cp .env.example .env
[ -f backend/.env ] || cp backend/.env.example backend/.env
[ -f rankings/.env ] || cp rankings/.env.example rankings/.env
mkdir -p docker/volumes/ssl
mkcert -cert-file docker/volumes/ssl/lp.hub.local.crt -key-file docker/volumes/ssl/lp.hub.local.key lp.hub.local
