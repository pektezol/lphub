# How to contribute

## Requirements

* [Go]
* [Node/npm]
* [Docker Engine]
* [mkcert]
* [Steam API key]
* [Google Service Account]

[Go]: https://go.dev/doc/install
[Node/npm]: https://nodejs.org/en/download/package-manager
[Docker Engine]: https://docs.docker.com/engine/install
[mkcert]: https://github.com/FiloSottile/mkcert
[Steam API key]: https://steamcommunity.com/dev/apikey
[Google Service Account]: https://console.cloud.google.com

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

* Wait for containers to start
* Edit `backend/.env`
* Backend development:
  * Navigate to `https://<CODESPACES_ID>-443.app.github.dev/api/v1/`
* Frontend development:
  * Edit "proxy" field in package.json to point to the backend `<CODESPACES_ID>-443.app.github.dev`
  * Run `HOST_DOMAIN=<CODESPACES_ID>-3000.app.github.dev npm run frontend`
  * Open frontend in the browser (VSCode will incorrectly suggest app.github.dev:3000 so remove the port at the end)
  * NOTE: Hot reloading won't work. Use Ctrl+R or F5 instead

## Config

Configure `backend/.env` file.

|Config|Description|
|---|---|
|SECRET_KEY|Securely generated random secret for login tokens. Example: `openssl rand -hex 16`|
|API_KEY|Steam API key for fetching profile data.|
|GOOGLE_CLIENT_EMAIL|Email of service account.|
|GOOGLE_PRIVATE_KEY_BASE64|Private key of service account.|
|GOOGLE_FOLDER_ID|Folder ID of shared Google Drive folder.|

## Login

* Navigate to frontend
* Log in with Steam
* Navigate to frontend again (port 3000)

## Google Drive

* Create a [Google Service Account](https://console.cloud.google.com/iam-admin/serviceaccounts)
* Create new key in JSON format
* Convert value of `private_key` to base64 
* Create a new folder on Google Drive
* Share the folder with the email from the service account
* Navigate to the folder and copy the folder ID from the URL
* Modify `backend/.env` and set:
  * `GOOGLE_PRIVATE_KEY_BASE64` base64 value of the key
  * `GOOGLE_CLIENT_EMAIL` service account email
  * `GOOGLE_FOLDER_ID` folder ID

```bash
# Example using jq
echo "GOOGLE_PRIVATE_KEY_BASE64=\"$(cat service-account-key.json | jq -j '.private_key' | base64 -w 0)\"" >> backend/.env
```

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
