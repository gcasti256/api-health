# API Health

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?style=flat-square&logo=tailwindcss)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat-square&logo=sqlite)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

Uptime monitoring dashboard for API endpoints. Track status, response times, and incident history in real time.

## Features

- **Live Dashboard** — Grid view of all monitored endpoints with real-time status indicators
- **Status Badges** — Green (< 200ms), Yellow (200-1000ms), Red (> 1000ms or down)
- **Auto-Check** — Background polling checks all endpoints every 30 seconds
- **Response Charts** — Recharts-powered line graphs showing 24-hour response time history
- **Uptime Stats** — 24h, 7d, and 30d uptime percentages per endpoint
- **Incident History** — Chronological log of all downtime events
- **SQLite Persistence** — Zero-config local database with WAL mode
- **Dark Theme** — Minimal dark UI (#0a0a0b) with indigo accents

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Database | SQLite via better-sqlite3 |
| Charts | Recharts |

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
npm start
```

The app runs at [http://localhost:3000](http://localhost:3000). The SQLite database is created automatically on first run with three seed endpoints.

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout with nav
│   ├── page.tsx                # Dashboard page
│   ├── globals.css             # Dark theme styles
│   ├── endpoints/[id]/page.tsx # Endpoint detail view
│   └── api/
│       ├── endpoints/          # CRUD for endpoints
│       └── checks/             # Health check triggers
├── components/
│   ├── DashboardClient.tsx     # Main dashboard with auto-refresh
│   ├── EndpointCard.tsx        # Status card for each endpoint
│   ├── AddEndpointModal.tsx    # Form to add new endpoints
│   ├── StatusBadge.tsx         # Color-coded status indicator
│   └── ResponseChart.tsx       # Recharts line chart
└── lib/
    └── db.ts                   # SQLite schema, seed data, queries
```

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/endpoints` | List all endpoints with latest check |
| `POST` | `/api/endpoints` | Create a new endpoint |
| `GET` | `/api/endpoints/:id` | Get endpoint detail with uptime stats |
| `DELETE` | `/api/endpoints/:id` | Delete an endpoint |
| `POST` | `/api/checks` | Trigger health checks for due endpoints |
| `GET` | `/api/checks/:endpointId` | Get check history for an endpoint |

## Author

**George Castillo** — [github.com/gcasti256](https://github.com/gcasti256)

## License

MIT
