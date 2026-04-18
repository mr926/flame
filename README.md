# flame-claude

A modern, self-hosted homelab dashboard — rebuilt from scratch with a 2026 tech stack. Inspired by Flame, but with cleaner architecture, no weather/search modules, and full Docker single-container deployment.

## Features

- **Apps** — pin, manage, and auto-discover your services
- **Bookmarks** — categorized bookmark management with groups and multi-page navigation
- **Pages** — configurable pages, each showing selected bookmark groups and/or apps
- **Themes** — 4 built-in themes + custom theme editor
- **Custom CSS** — inject any CSS via the UI
- **Docker auto-discovery** — labels: `flame.name`, `flame.url`, `flame.icon`
- **Kubernetes auto-discovery** — Ingress annotations
- **Single admin** — no registration, Argon2id passwords, httpOnly session cookies
- **Flame importer** — migrate apps, categories, bookmarks, themes, settings

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, TanStack Query, Zustand, Tailwind CSS v4 |
| Routing | React Router 7 |
| Backend | Fastify 5, TypeScript |
| ORM | Drizzle ORM |
| Database | SQLite (better-sqlite3) |
| Auth | Argon2id + @fastify/session |
| Package manager | pnpm (monorepo) |

## Docker Deployment

### Quick start

```bash
docker compose up -d
```

Then open `http://localhost:5005` and set your admin password.

### docker-compose.yml (full example)

```yaml
services:
  flame:
    image: mr926/flame:latest
    container_name: flame
    restart: unless-stopped

    ports:
      - "5005:5005"       # Host port : container port

    volumes:
      - ./data:/data      # Persist database and uploaded icons
      # Uncomment to enable Docker auto-discovery:
      # - /var/run/docker.sock:/var/run/docker.sock:ro

    environment:
      # ── Required ────────────────────────────────────────────────────────────
      SESSION_SECRET: "change-me-to-a-random-secret-at-least-32-chars"
      # Generate one with: openssl rand -hex 32

      # ── Optional (shown with defaults) ──────────────────────────────────────
      PORT: "5005"          # HTTP port the server listens on inside the container
      DATA_DIR: "/data"     # Directory for flame.db and uploads/
      NODE_ENV: "production" # Set to "development" for pretty-printed logs

    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:5005/api/auth/session"]
      interval: 30s
      timeout: 5s
      retries: 3
```

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `SESSION_SECRET` | *(insecure default)* | **Required in production** — random 32+ char string. Generate with `openssl rand -hex 32` |
| `PORT` | `5005` | HTTP port the server listens on |
| `DATA_DIR` | `/data` | Directory for `flame.db` and `uploads/` |
| `NODE_ENV` | `production` | Set to `development` for pretty-printed pino logs |

### Data persistence

The `/data` volume contains:
- `flame.db` — SQLite database
- `uploads/` — uploaded icon files

Mount it to a host path or named volume to persist across container restarts.

## First Run — Setting the Admin Password

On first visit, you'll be redirected to `/setup` to set your admin password. This page is only available when no admin exists yet.

## Importing from Flame

1. Go to **Settings → About → Import from Flame**
2. Upload your Flame `data.zip` export
3. Optionally check **Clear existing data** to start fresh

The importer reads:
- `db.sqlite` — apps, categories, bookmarks
- `themes.json` — custom themes
- `config.json` — settings (customCSS, tab behavior, page title)
- `uploads/` — icon files (including custom SVGs)

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

## GitHub Actions — Docker Hub

The workflow at `.github/workflows/docker.yml` builds and pushes multi-arch images (`linux/amd64` + `linux/arm64`) to Docker Hub on every push to `main` and on version tags (`v*`).

Required repository secrets:

| Secret | Description |
|---|---|
| `DOCKERHUB_USERNAME` | Your Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token (Settings → Security → Access Tokens) |

Tags produced:
- `latest` — every push to `main`
- `v1.2.3` — on tag `v1.2.3`
- `v1.2` — on tag `v1.2.3`

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
│       └── drizzle/       # SQL migrations
├── packages/
│   └── shared/            # Zod schemas + types shared by both apps
├── .github/workflows/     # CI/CD
├── Dockerfile
└── docker-compose.yml
```

## Development

```bash
# Install dependencies
pnpm install

# Run dev servers (web: 3000, api: 5005)
pnpm dev

# Build for production
pnpm build
```

## License

MIT
