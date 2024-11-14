# How to contribute

## Requirements

* [Docker Engine]
* [mkcert]
* [Node/npm]
* [Steam API key]
* [Google Service Account]

[Docker Engine]: https://docs.docker.com/engine/install
[mkcert]: https://github.com/FiloSottile/mkcert
[Node/npm]: https://nodejs.org/en/download/package-manager
[Steam API key]: https://steamcommunity.com/dev/apikey
[Google Service Account]: https://console.cloud.google.com

## Setup

* `npm run setup`
* Edit `backend/.env`
* `npm run up`
* `npm run frontend` (2nd terminal)
* Add a host entry `127.0.0.1 lp.hub.local` to `C:\Windows\System32\drivers\etc\hosts` or `/etc/hosts`
* Navigate to `https://lp.hub.local/api/v1/token` to test the backend
* Navigate to `https://lp.hub.local:3000` to test the frontend

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

## Scripts

Execute with `npm run <script>`

|Script|Description|
|---|---|
|setup|Developer setup.|
|frontend|Start frontend.|
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
