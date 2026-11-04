# Contributing

Choose the setup that matches what you are working on. Frontend-only work can use the production API without Docker; backend and database changes need a local backend.

## Frontend with the production API

Install Node.js 22.12 or newer (or Node.js 20.19 or newer) and npm. From the repository root, run:

```sh
npm --prefix frontend ci
npm run dev
```

Open http://localhost:3000. Vite reloads frontend changes and proxies `/api` requests to `https://lp.portal2.sr`. **Requests that change data affect the production service.** Use the local backend below when testing submissions or other changes to data. Login and cookies may behave differently on localhost than on the production domain.

## Frontend with a local backend

Run a local backend on port 4000, either using Docker below or with Go and PostgreSQL installed locally. Then start the frontend in a separate terminal:

```sh
npm --prefix frontend ci
npm run frontend
```

Open http://localhost:3000. This uses Vite hot reload and proxies API requests to `http://localhost:4000`. The backend reads `backend/.env`; use a local database and test credentials. See `backend/.env.example` for the available settings. For a non-Docker backend, initialize PostgreSQL using the SQL files in `backend/database` (schema first, then functions and inserts in dependency order), configure its connection in `backend/.env`, and run `go run .` from `backend/`. Run it again after backend changes, or use Air for automatic rebuilding.

## Docker stack and HTTPS

Install Docker Engine with Compose, Node.js and npm, and [mkcert](https://github.com/FiloSottile/mkcert). Steam and Backblaze credentials are needed for features that use those services.

1. Run `mkcert -install` once to trust the local certificate authority.
2. Run `npm run setup` from the repository root. Existing environment files are preserved.
3. Edit `backend/.env`: set a random `SECRET_KEY`, your Steam API key and, if needed, Backblaze credentials. The container overrides the database connection values from the root `.env` file. Keep `PORT=4000` for the supplied proxy.
4. Add `127.0.0.1 lp.hub.local` to your hosts file.
5. Run `npm run build:frontend`, then `npm run up`. Open https://lp.hub.local for the built frontend and HTTPS proxy. The backend is available under `/api/v1/`.
6. For frontend hot reload, run `npm run frontend` in another terminal and open http://localhost:3000 instead. Backend changes are rebuilt by Air inside the container.

The built frontend currently sends record uploads to a production API URL, even when served locally. Do not use it to test uploads; use the local Vite development server instead. Steam login and cookies may require additional configuration and have not been verified in this setup.

The database is initialized from `backend/database` only when its data directory is empty. Existing databases require the relevant migrations to be applied separately. Database data persists under `docker/volumes/postgresql-data`; back it up before removing it. Use `npm run down` to stop the stack and `npm run db` to open a database shell. Run `npm run build:image` after backend dependency changes.

## Checks and other contributions

Before submitting a change, run the checks relevant to it:

```sh
npm --prefix frontend run type-check
npm --prefix frontend run lint
npm --prefix frontend run build
cd backend && go test ./...
```

Review the affected pages or API endpoints manually as well. For database changes, test both fresh initialization and any migration needed for existing installations. Documentation, issue reports, and reproduction steps are also welcome; describe the change and how you verified it in your pull request.

Run `npm run docs` with the swag CLI installed to regenerate API documentation, and `npm run rankings` with Air installed to update rankings data. These tools require Go; check the respective module's `go.mod` for its required version.

## Dev containers and Codespaces

The dev container installs development tools and runs setup on creation. Forward ports 3000 and 4000 for frontend and API development. Codespaces forwarding and Steam login have not been verified; forwarded hostnames and cookies may require additional configuration.
