# The Last of Guss

A browser-based clicker game built as a fullstack monorepo. Players tap a goose during timed rounds to earn points. Features JWT authentication, role-based access, real-time countdowns and race-condition-safe tap processing.

## Tech Stack

| Layer    | Technology                              |
|----------|-----------------------------------------|
| Backend  | NestJS, Sequelize, PostgreSQL, JWT      |
| Frontend | React 19, Vite, React Router            |
| Shared   | TypeScript contract package (types + utils) |

## Architecture

```
eng-test/
├── contract/   # Shared TypeScript types, score formula, status computation
├── server/     # NestJS REST API (stateless, horizontally scalable)
└── client/     # React SPA (Vite dev server)
```

Key design decisions:

- **Computed round status** — status (`cooldown` | `active` | `finished`) is derived from `start_datetime` / `end_datetime` timestamps at read time, never stored. Single source of truth shared between server and client.
- **Race condition safety** — tap processing uses `SELECT FOR UPDATE` inside a serialized transaction to prevent concurrent score corruption.
- **Score formula** — `1 tap = 1 point`, every 11th tap awards `10 points` instead of 1.
- **Nikita rule** — user `Никита` receives HTTP 200 on taps, but the counter is never incremented (score stays 0).

## Prerequisites

- **Node.js** >= 20
- **Docker** (for PostgreSQL)

## Quick Start

```bash
# 1. Start PostgreSQL
docker compose up -d

# 2. Configure environment
cp server/.env.example server/.env

# 3. Build shared contract
cd contract
npm install
npm run build

# 4. Start backend
cd ../server
npm install
npm run build
npm start

# 5. Start frontend (separate terminal)
cd ../client
npm install
npm run dev
```

The client runs at `http://localhost:5173`, the API at `http://localhost:3000`.

## Environment Variables

Copy `server/.env.example` to `server/.env` and adjust if needed:

| Variable            | Default                                          | Description                        |
|---------------------|--------------------------------------------------|------------------------------------|
| `DB_URI`            | `postgresql://postgres:postgres@localhost:6543/postgres` | PostgreSQL connection string |
| `PORT`              | `3000`                                           | Server listen port                 |
| `JWT_SECRET`        | `guss-secret-key-change-in-production`           | JWT signing secret                 |
| `COOLDOWN_DURATION` | `30`                                             | Seconds before round starts        |
| `ROUND_DURATION`    | `60`                                             | Round duration in seconds          |
| `CLIENT_ORIGIN`     | `http://localhost:5173`                          | Allowed CORS origin                |

## Test Credentials

Any username/password pair auto-registers on first login. Pre-configured roles:

| Username  | Password  | Role     | Notes                                 |
|-----------|-----------|----------|---------------------------------------|
| `admin`   | `admin`   | admin    | Can create new rounds                 |
| `roma`    | `roma`    | user     | Regular player                        |
| `Никита`  | any       | nikita   | Taps accepted but score stays 0       |
| any other | any       | user     | Auto-registered on first login        |

## API Endpoints

All endpoints except `/auth` require `Authorization: Bearer <token>` header.

| Method | Path           | Description                  | Auth     |
|--------|----------------|------------------------------|----------|
| POST   | `/auth`        | Login / register             | No       |
| GET    | `/rounds`      | List active + cooldown rounds| Yes      |
| GET    | `/round/:uuid` | Round details + user score   | Yes      |
| POST   | `/tap`         | Tap the goose                | Yes      |
| POST   | `/round`       | Create a new round           | Admin    |
