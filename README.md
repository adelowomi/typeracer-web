# TypeRacer Web

React + Vite + TypeScript frontend for the TypeRacer game. Talks to the API over SignalR.

## Run locally

```sh
npm install
npm run dev
```

The dev server starts on `http://localhost:5173`. It expects the API at `VITE_API_BASE_URL` (default `http://localhost:5085`).

## Build

```sh
npm run build
```

Outputs to `dist/`.

## Auth

The frontend supports both guest play (nickname only) and authenticated accounts. Logged-in users:

- Get persistent rooms they own
- Contribute to per-room and global leaderboards
- See their race history in `/me/rooms` and `/me/stats`

Auth tokens live in `localStorage` under `typeracer.auth`. The `RaceProvider` automatically passes the token as `accessTokenFactory` to the SignalR hub.

## Deploy to Netlify

The repo includes `netlify.toml` and a SPA `_redirects` file. Connect the repo to Netlify and set the environment variable:

```
VITE_API_BASE_URL=https://your-api.azurewebsites.net
```

Make sure the API's `Cors:AllowedOrigins` includes your Netlify site URL.

## Routes

```
/                         landing (create / join / login link)
/login, /register         auth
/me/rooms                 rooms i own + my stats
/leaderboard              global top WPM
/room/:code               lobby
/room/:code/race          race
/room/:code/results       results
/room/:code/leaderboard   per-room top / stats / recent
```
