# Shufflepik

This repository contains the code for the Shufflepik Discord bot backend and Angular PWA frontend.

## Setup

1. Copy the example environment files and provide real values:
   ```bash
   cp backend/bot/.env.example backend/bot/.env
   cp backend/server/.env.example backend/server/.env
   cp frontend/.env.example frontend/.env
   ```
2. Install dependencies if needed and start the services:
   - **Bot**: `node shard.js` inside `backend/bot` or manage with `pm2`.
   - **Server**: `node server.js` inside `backend/server`.
   - **Frontend**: run `npm start` inside `frontend` for local development.

## Testing

Run `npm test` within the `frontend` directory to execute Angular unit tests.

## Notes

The project does not rely on Redis. Angular provides client side caching and the backend uses MongoDB for persistence.
