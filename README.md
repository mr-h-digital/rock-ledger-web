# Rock Ledger — Frontend

The React/Vite web app for Rock Ledger, an accounting and compliance ledger for Rock Mission Ministries NPC. It provides a focused interface for secure sign-in, day-to-day ledger capture, bank-statement review, and user administration.

[Project overview and deployment guide](../README.md) · [Backend documentation](../backend/README.md)

## What it does

- Signs users in with a password and authenticator-app code (TOTP), including first-login password changes and authenticator enrolment.
- Shows the recent ledger and supports recording income, expenses, transfers, and director loans. Corrections are recorded as reversals rather than edits.
- Imports Capitec PDF statements for review. Imported lines are not added to the ledger until posted.
- Provides administrator tools for creating, resetting, and deactivating users.
- Adapts the available actions to the signed-in user's role: `ADMIN`, `TREASURER`, or `VIEWER`.

## Requirements

- Node.js and npm
- The [Rock Ledger backend](../backend/README.md) and PostgreSQL database for sign-in and application data

## Run locally

From this directory:

```bash
npm install
```

Create a local `.env` file from the example:

```bash
Copy-Item .env.example .env
```

In macOS/Linux shells, use `cp .env.example .env` instead.

Set `VITE_API_URL` in `.env` to the backend origin. The example uses `http://localhost:8080`, which is the default local backend address.

Start the development server:

```bash
npm run dev
```

Vite prints the local URL, usually `http://localhost:5173`. Keep the backend's `ALLOWED_ORIGIN` set to that exact origin so browser requests and the refresh cookie are allowed.

## Configuration

| Variable | Purpose | Default |
|---|---|---|
| `VITE_API_URL` | Base URL of the backend API; set at build time | `http://localhost:8080` |

Do not put secrets in frontend environment variables: Vite embeds `VITE_*` values in client-side assets. The root `.gitignore` excludes local `.env` files while keeping `.env.example` tracked.

## Build and preview

```bash
npm run build
npm run preview
```

The production bundle is generated in `dist/`. The Vite base path is `/`, so deploy the bundle at the domain root. The repository's GitHub Actions workflow builds and deploys the frontend to GitHub Pages; deployment and custom-domain notes are in the [project README](../README.md).

## Security notes

- Access and pending-login tokens are kept in memory, not browser storage.
- The refresh token is an HttpOnly cookie managed by the backend; the frontend cannot read it.
- Requests include credentials and the backend's required `X-Requested-With` header.
- The browser app is not a substitute for server-side authorization. The backend enforces roles and validates all writes.

## Project structure

```text
src/
  Account.jsx      Account details, password change, sign-out
  App.jsx          Session handling, navigation, ledger capture
  BankImport.jsx   Statement upload and bank-line review/posting
  Login.jsx        Password, first-login, and TOTP sign-in flow
  Users.jsx        Administrator user management
  api.js           Authenticated API client
  styles.css       Application styles
```

For accounting rules, API configuration, database migrations, and server-side security, see the [backend README](../backend/README.md).
