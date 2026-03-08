# Nitipin — Backend API

REST API backend for **Nitipin**, a peer-to-peer jastip (personal shopper) marketplace that connects travelers with shoppers. Built with [NestJS](https://nestjs.com/) and TypeScript.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 11 |
| Language | TypeScript 5 |
| Database | PostgreSQL 16 |
| ORM | TypeORM |
| Auth | JWT + Passport |
| Queue | BullMQ + Redis |
| Realtime | Socket.IO (WebSockets) |
| Scheduler | @nestjs/schedule |

## Features / Modules

- **Auth** — Register, login, JWT access & refresh tokens
- **User** — Profile management, onboarding
- **Trip** — Travelers create & manage shopping trips
- **Request** — Shoppers post item requests
- **Offer** — Travelers make offers on requests
- **Order** — Order lifecycle management
- **Wallet** — Balance, top-up, withdrawal, transaction history
- **Message** — Real-time chat between users (WebSocket)
- **Notification** — In-app notifications
- **Review** — Post-order ratings & reviews
- **Dispute** — Order dispute resolution
- **Upload** — File/image uploads
- **Health** — Health check endpoint

## Prerequisites

- **Node.js** ≥ 18
- **PostgreSQL** 16+
- **Redis** 7+

Or simply use Docker (see below).

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/nvlhnn/nitipin-be.git
cd nitipin-be
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start infrastructure (PostgreSQL & Redis)

```bash
docker compose up -d
```

This starts:
- **PostgreSQL** on port `5433` (mapped to container `5432`)
- **Redis** on port `6379`

### 4. Configure environment

```bash
cp .env.example .env
```

Edit `.env` as needed. Key variables:

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `8080` |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://postgres:postgres@localhost:5433/nitipin` |
| `JWT_SECRET` | Secret for signing JWTs | `change-me-in-production` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `PLATFORM_FEE_PERCENT` | Platform fee on transactions | `5.0` |

### 5. Run the server

```bash
# Development (watch mode)
npm run start:dev

# Production
npm run build
npm run start:prod
```

The API will be available at `http://localhost:8080`.

## Scripts

| Command | Description |
|---|---|
| `npm run start:dev` | Start in watch mode |
| `npm run start:prod` | Start production build |
| `npm run build` | Compile TypeScript |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run E2E tests |
| `npm run test:cov` | Test coverage report |
| `npm run lint` | Lint & auto-fix |
| `npm run format` | Format with Prettier |
| `npm run migration:generate` | Generate a new migration |
| `npm run migration:run` | Run pending migrations |
| `npm run migration:revert` | Revert last migration |

## Project Structure

```
src/
├── common/          # Guards, decorators, interceptors, pipes
├── database/        # Data source & migration config
├── infrastructure/  # Cross-cutting concerns (Redis, queues, etc.)
├── modules/
│   ├── auth/        # Authentication & authorization
│   ├── user/        # User profiles
│   ├── trip/        # Trip management
│   ├── request/     # Item requests
│   ├── offer/       # Offers on requests
│   ├── order/       # Order lifecycle
│   ├── wallet/      # Wallet & transactions
│   ├── message/     # Real-time messaging
│   ├── notification/# Notifications
│   ├── review/      # Reviews & ratings
│   ├── dispute/     # Dispute handling
│   ├── upload/      # File uploads
│   └── health/      # Health check
├── app.module.ts
└── main.ts
```

## Related

- **Frontend**: [nitipin-fe](https://github.com/nvlhnn/nitipin-fe)
