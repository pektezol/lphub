# How to contribute

## Requirements

* [Go]
* [Node/npm]
* [Docker Engine]
* [mkcert]
* [Steam API key]
* [Backblaze Account]

[Go]: https://go.dev/doc/install
[Node/npm]: https://nodejs.org/en/download/package-manager
[Docker Engine]: https://docs.docker.com/engine/install
[mkcert]: https://github.com/FiloSottile/mkcert
[Steam API key]: https://steamcommunity.com/dev/apikey
[Backblaze Account]: https://www.backblaze.com

## Setup

### Local

* `npm run setup`
* Edit `backend/.env`
* `npm run up`
* `npm run frontend` (2nd terminal)
* Add a host entry `127.0.0.1 lp.hub.local` to `C:\Windows\System32\drivers\etc\hosts` or `/etc/hosts`
* Navigate to `https://lp.hub.local/api/v1/` to test the backend
* Navigate to `https://lp.hub.local:3000` to test the frontend

### Using GitHub

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/pektezol/lphub)

* Edit `backend/.env`
* `npm run up`
* Backend development:
  * Navigate to `https://<CODESPACES_ID>-443.app.github.dev/api/v1/`
* Frontend development:
  * Edit "proxy" field in package.json to point to the backend `<CODESPACES_ID>-443.app.github.dev`
  * Add `127.0.0.1 <CODESPACES_ID>-3000.app.github.dev` to `/etc/hosts`
  * Run `HOST_DOMAIN=<CODESPACES_ID>-3000.app.github.dev npm run frontend` (2nd terminal)
  * Open frontend in the browser (VSCode will incorrectly suggest app.github.dev:3000 so remove the port at the end)
  * NOTE: Hot reloading won't work. Use Ctrl+R or F5 instead
  * NOTE: The `token` cookie must be copied manually from the backend domain when trying to login

## Config

Configure `backend/.env` file.

|Config|Description|
|---|---|
|SECRET_KEY|Securely generated random secret for login tokens. Example: `openssl rand -hex 16`|
|API_KEY|Steam API key for fetching profile data.|
|B2_BUCKET_NAME|Bucket name from Backblaze.|
|B2_KEY_ID|Key ID from Backblaze.|
|B2_API_KEY|Application key from Backblaze.|
|B2_DOWNLOAD_URL|Bucket download friendly URL from Backblaze.|

Configure `rankings/.env` file.

|Config|Description|
|---|---|
|API_KEY|Steam API key for fetching profile data.|

## Login

* Navigate to frontend
* Log in with Steam
* Navigate to frontend again (port 3000)

## Demo storage

* Create new public Backblaze bucket
* Create new application key giving access to the bucket
* Modify `backend/.env` and set:
  * `B2_BUCKET_NAME` name of the created bucket
  * `B2_KEY_ID` key ID
  * `B2_API_KEY` application key
  * `B2_DOWNLOAD_URL` download friendly URL of the bucket
    * Get ID from **endpoint** of the bucket e.g. `005` from `s3.us-east-005.backblazeb2.com`
    * Get bucket name e.g. `lphub-demos`
    * Construct the download URL e.g. `https://f005.backblazeb2.com/file/lphub-demos/`

## Build

Use `npm run build:frontend` to create an optimized build which the proxy will serve.

## Generate rankings locally

* Install [air CLI](https://github.com/air-verse/air)
* Run `npm run rankings` to update files in `./rankings/output`

## Update docs locally

* Install [swag CLI](https://github.com/swaggo/swag)
* Run `npm run docs` to update files in `./backend/docs`

## Scripts

Execute with `npm run <script>`

|Script|Description|
|---|---|
|setup|Developer setup.|
|frontend|Start frontend.|
|rankings|Update rankings files locally.|
|docs|Update swagger files locally.|
|up|Start backend.|
|down|Stop backend.|
|build:frontend|Create build that gets served from the backend.|
|build:image|Build backend image.|
|reload|Reload backend.|
|sv:debug|Get server shell.|
|sv:restart|Restart server.|
|sv:stop|Stop server.|
|proxy:debug|Get proxy shell.|
|proxy:restart|Restart proxy.|
|proxy:stop|Stop proxy.|
|db|Connect to database.|
|db:debug|Get database server shell|
|db:restart|Restart database.|
|db:stop|Stop database.|
|db:dump|Dump database backup.|
|db:dump:raw|Dump database without compression.|
