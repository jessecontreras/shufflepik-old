# Shufflepik

This repository contains the code for **Shufflepik**, a Discord bot and web application.  It is split into a Node/Express backend and an Angular PWA frontend.

### Highlights

- **Discord OAuth integration** – authenticate users and install the bot using Discord's OAuth2 flow.
- **Email verification** – powered by `nodemailer` with Handlebars templates for friendly HTML e‑mails.
- **Optimised image handling** – uploads are processed with `sharp` before being stored.
- **PWA Frontend with caching** – Angular Service Worker caches API calls and assets for speedy page loads.
- **MongoDB persistence** – user accounts, guilds and image pools are stored in MongoDB.
- **PM2 ready** – bot and server can be launched under PM2 for reliability.

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
