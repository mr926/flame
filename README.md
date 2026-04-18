# flame-claude

A modern, self-hosted homelab dashboard — rebuilt from scratch with a 2026 tech stack. Inspired by Flame, but with cleaner architecture, no weather/search modules, and full Docker single-container deployment.

## Features

- **Apps** — pin, manage, and auto-discover your services
- **Bookmarks** — categorized bookmark management
- **Themes** — 4 built-in themes + custom theme editor
- **Custom CSS** — inject any CSS via the UI
- **Docker auto-discovery** — labels: `flame.name`, `flame.url`, `flame.icon`
- **Kubernetes auto-discovery** — Ingress annotations
- **Single admin** — no registration, Argon2id passwords, httpOnly session cookies
- **Flame importer** — migrate apps, categories, bookmarks, themes, settings

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, TanStack Query, Zustand, react-hook-form, Tailwind CSS v4 |
| Routing | React Router 7 |
| Backend | Fastify 5, TypeScript |
| ORM | Drizzle ORM |
| Database | SQLite (better-sqlite3) |
| Auth | Argon2id + @fastify/session |
| Logging | pino |
| Tests | Vitest + Playwright |
| Package manager | pnpm (monorepo) |

## Project Structure

```
flame-claude/
├── apps/
│   ├── web/               # React frontend (Vite)
│   └── server/            # Fastify backend
│       ├── src/
│       │   ├── db/        # Drizzle schema + client + migrate
│       │   ├── routes/    # One file per resource
│       │   ├── services/  # Business logic
│       │   └── middleware/
│       └── drizzle/       # Generated SQL migrations
├── packages/
│   └── shared/            # Zod schemas + types shared by both apps
├── data/                  # Runtime data (gitignored)
│   ├── flame.db           # SQLite database
│   └── uploads/           # Uploaded icons
├── Dockerfile
└── docker-compose.yml
```

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 9+

### Install dependencies

```bash
pnpm install
```

### Run in development

```bash
pnpm dev
# Web: http://localhost:3000
# API: http://localhost:5005
```

The dev web server proxies `/api` and `/uploads` to the backend automatically.

### Run database migrations

Migrations are applied automatically on server startup. To run manually:

```bash
pnpm db:migrate
```

### Build for production

```bash
pnpm build
```

### Run production build locally

```bash
cd apps/server
NODE_ENV=production node dist/main.js
```

## Docker Deployment

### Quick start

```bash
docker compose up -d
```

Then open `http://localhost:5005` and set your admin password.

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `DATA_DIR` | `/data` | Where the database and uploads are stored |
| `PORT` | `5005` | HTTP port |
| `SESSION_SECRET` | *(insecure default)* | **Change this in production** — 32+ random chars |
| `NODE_ENV` | `production` | Set to `development` for pretty logs |

### Data persistence

The `/data` volume contains:
- `flame.db` — SQLite database
- `uploads/` — uploaded icon files

Mount it to a host path or named volume to persist across container restarts.

### Docker Compose example

```yaml
services:
  flame:
    image: flame-claude:latest
    ports:
      - "5005:5005"
    volumes:
      - ./data:/data
      # For Docker auto-discovery:
      # - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      SESSION_SECRET: "your-random-secret-here"
```

## First Run — Setting the Admin Password

On first visit, you'll be redirected to `/setup` to set your admin password. This page is only available when no admin exists yet.

## Importing from Flame

1. Go to **Settings → About → Import from Flame**
2. Enter the path to your old Flame data directory on the server (e.g. `/old-flame/data`)
3. Click **Start Import**

The importer reads:
- `db.sqlite` — apps, categories, bookmarks
- `themes.json` — custom themes
- `config.json` — settings (customCSS, tab behavior, page title)
- `uploads/` — icon files

Weather and search provider data are ignored (not supported in flame-claude).

## Docker Auto-Discovery

Add labels to your containers:

```yaml
labels:
  flame.name: "Portainer"
  flame.url: "https://portainer.home"
  flame.icon: "server"  # optional MDI icon name
```

Then enable Docker in **Settings → Integrations → Docker**.

Mount the Docker socket:
```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock:ro
```

## Kubernetes Auto-Discovery

Add annotations to your Ingress resources:

```yaml
annotations:
  flame.name: "My App"
  flame.icon: "cloud"
```

The app URL is derived from the first Ingress host rule.

Enable in **Settings → Integrations → Kubernetes**. The server must have access to a valid kubeconfig.

## Running Tests

```bash
# API unit/integration tests
pnpm test

# E2E (requires both dev servers running)
cd apps/web && pnpm test:e2e
```

## Known Simplifications

- No drag-and-drop reorder UI (reorder API exists; UI uses manual sort_order editing)
- No icon file browser (upload via form)
- Kubernetes sync uses in-cluster or default kubeconfig; no per-cluster config UI
- No multi-user support (by design — single admin)

## License

MIT
