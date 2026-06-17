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

## Deploy to Netlify

The repo includes `netlify.toml` and a SPA `_redirects` file. Connect the repo to Netlify and set the environment variable:

```
VITE_API_BASE_URL=https://your-api.azurewebsites.net
```

Make sure the API's `Cors:AllowedOrigins` includes your Netlify site URL.
