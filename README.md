# Naratama Backend

Development README — how to clone, configure environment variables, and run the development server.

## Prerequisites

- Node.js 18+ (recommended)
- npm
- MongoDB instance (local or remote)

## Clone the repository

```powershell
git clone https://github.com/runsdev/naratama-backend.git
cd naratama-backend
```

## Install dependencies

```powershell
npm install
```

## Environment variables

Create a `.env` file in the project root. You can copy `.env.example` if present.

Required variables:

- `DATABASE_URL` — MongoDB connection string, e.g. `mongodb://localhost:27017/naratama`
- `SESSION_SECRET` — secret string used to sign session cookies
- `PORT` (optional) — port to run the dev server (default: `8080`)

Example `.env`:

```
DATABASE_URL=mongodb://localhost:27017/naratama
SESSION_SECRET=replace-this-with-a-secure-random-string
PORT=8080
```

## Database

This project uses Prisma with MongoDB. To generate the Prisma client and push the schema:

```powershell
# generate client
npm run db:generate

# push schema to database
npm run db:push
```

If you have seed data:

```powershell
npm run seed
```

## Run development server

The project uses `ts-node` with ES module loader. Start the dev server with nodemon:

```powershell
npm run dev
```

Server will be available at `http://localhost:8080` (or `http://localhost:$PORT`).

## Notes

- For frontend requests, enable credentials: `fetch(..., { credentials: 'include' })` or `axios` with `withCredentials: true`.

## Troubleshooting

- If you see Prisma type errors after editing `schema.prisma`, run `npm run db:generate`.
- Ensure `DATABASE_URL` points to a running MongoDB instance.
- After schema changes, run `npm run db:push` to sync the database.

---
