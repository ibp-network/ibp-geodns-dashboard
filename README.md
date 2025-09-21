repo: ibp-geodns-dashboard
file: README.md

# IBP GeoDNS Dashboard

A React-based management and analytics UI for the **IBP GeoDNS System v2**. The dashboard visualizes global member health, usage analytics, service catalog, and billing—including PDF generation & download.

---

## Overview

The dashboard consumes the IBP GeoDNS APIs to present:

* Global 3D map of members and service health
* Requests analytics by **country**, **ASN**, **service/domain**, and **member**
* Member-centric drill‑downs with uptime and downtime history
* Service catalog with hierarchy (relay → system → community chains)
* Billing breakdowns (base, credits, billed) and monthly PDF downloads

Built with **React**, **react-router**, **Recharts**, and **globe.gl** on a dark theme optimized for operations.

---

## Features

* **Data Analytics**

  * Aggregate & daily views
  * Multi-filtering with type-ahead for countries, services, members, and networks (ASN)
  * Interactive charts (bar/pie) and sortable/paginated tables

* **Global Earth View**

  * Real-time member markers with health “light bar”
  * Animated inter-member arcs
  * Click-through to Member Detail

* **Member Views**

  * Overview: requests, uptime, services, location
  * Downtime: site vs service-specific, grouped, with durations
  * Usage: top countries, service breakdown
  * Monthly uptime calendar (12 months)

* **Service Catalog**

  * Relay / System / Community tabs with counts
  * Live filter & search
  * Per-service endpoints & copy helpers
  * Members providing the service

* **Billing**

  * Month-to-date member totals and per-service SLA status
  * SLA credits and billed amounts
  * Overview & per-member historical PDFs (download)

* **UX & Infra**

  * SPA routing (`/data`, `/earth`, `/members`, `/services`, `/billing`)
  * Full-screen/page-level loading with progress
  * Responsive layout and consistent CSS variables-based theming
  * Axios interceptor for bearer auth (`ibp_auth_token`)

---

## Architecture

### Views (Routes)

| Route                  | Component      | Purpose                                                                        |
| ---------------------- | -------------- | ------------------------------------------------------------------------------ |
| `/data`                | `DataView`     | Requests analytics by country/ASN/service/member with filters, charts, tables. |
| `/earth`               | `EarthView`    | 3D globe, member health markers, arcs, quick stats.                            |
| `/members`             | `MemberView`   | Grid of members with health status and quick stats.                            |
| `/members/:memberName` | `MemberDetail` | Deep dive: uptime, downtime, usage, and billing for a single member.           |
| `/services`            | `ServiceView`  | Service hierarchy, endpoints, usage examples, and providers.                   |
| `/billing`             | `BillingView`  | Month-to-date billing & historical PDF downloads.                              |

### Shared Components

* **ApiHelper**: Axios instance with base URL & bearer header (`Authorization: Bearer <token>` from `localStorage.ibp_auth_token`).
* **Charts**: Recharts wrappers (bar, line, pie) + custom tooltips.
* **DataTable**: Sortable, paginated, aggregate-aware tables.
* **Loading**: Full-screen or page-level loader with progress.
* **Sidebar/Header/StatusBadge/StatsCard/MemberLogo**: UI scaffolding.

### State & Data Flow

* Each view fetches directly via `ApiHelper` (GET endpoints).
* Date ranges and filters are translated to query params (country, asn, member, domain; CSV when multi-select).
* Service filters resolve to **domains** via `/services` provider RPC URLs (client-side mapping).
* Uptime calculations merge overlapping downtime windows and incorporate site-wide vs service-specific outages.

---

## Configuration

### Environment Variables

Set the API base URL consumed by the dashboard:

```bash
# .env
REACT_APP_API_URL=https://__SET_ME__/api
```

If not set, the app defaults to:

```
https://ibdash.dotters.network:9000/api
```

### Authentication

If your API requires auth, place a bearer token in local storage:

```js
localStorage.setItem('ibp_auth_token', '<YOUR_JWT_OR_TOKEN>');
```

`ApiHelper` attaches it to every request via `Authorization: Bearer …`.

---

## API Endpoints Consumed

> The dashboard is read-only and depends on these backend routes.

### Requests / Usage

* `GET /requests/summary?start=YYYY-MM-DD&end=YYYY-MM-DD`
* `GET /requests/country?start=&end=&country=CC,CC`
* `GET /requests/asn?start=&end=&asn=AS123,AS456`
* `GET /requests/service?start=&end=&domain=host1.com,host2.org`
* `GET /requests/member?start=&end=&member=Alice,Bob`

**Common query params**

* `start`, `end` — inclusive date range (`YYYY-MM-DD`)
* `country`, `asn`, `member`, `domain` — optional comma-separated filters

### Downtime

* `GET /downtime/current`
* `GET /downtime/summary?start=&end=&member=...`
* `GET /downtime/events?start=&end=&member=...`

### Members & Services

* `GET /members`
* `GET /members/stats?name=Member&start=&end=`
* `GET /services`
* `GET /services?hierarchy=true`
* `GET /services/summary` (if available)

### Billing

* `GET /billing/summary`
* `GET /billing/breakdown?member=Name&month=M&year=YYYY&include_downtime=true`
* `GET /billing/pdfs?member=Name` *(or without `member` for overview listing)*
* `GET /billing/pdfs/download?year=YYYY&month=M&type=overview` *(or `member=Name`)*

> The dashboard expects **monthly PDF listings** grouped by `{ year, month, pdfs[] }` with elements that include `file_name`, `file_size`, `modified_time`, `is_overview`, and `member_name` where applicable.

---

## Getting Started

### Prerequisites

* **Node.js 18+** (recommended 20+)
* npm or yarn
* API reachable at `REACT_APP_API_URL` with CORS enabled

### Install & Run (Development)

```bash
# 1) Configure API endpoint
echo "REACT_APP_API_URL=https://api.example.com/api" > .env

# 2) Install deps
npm install
# or: yarn

# 3) Start dev server (http://localhost:3000)
npm start
```

### Build (Production)

```bash
npm run build
# Outputs to: build/
```

---

## Docker

**Multi-stage build** serving static files via Nginx:

```dockerfile
# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* yarn.lock* ./
RUN npm ci || yarn --frozen-lockfile
COPY . .
# Pass API URL at build time or mount .env
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=${REACT_APP_API_URL}
RUN npm run build

# ---- runtime stage ----
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
# SPA fallback for client-side routing
RUN printf 'server {\n  listen 80;\n  server_name _;\n  root /usr/share/nginx/html;\n  include /etc/nginx/mime.types;\n  location / {\n    try_files $uri /index.html;\n  }\n}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 80
```

Build & run:

```bash
docker build -t ibp-geodns-dashboard --build-arg REACT_APP_API_URL=https://api.example.com/api .
docker run -p 8080:80 ibp-geodns-dashboard
```

---

## Deployment Notes

* **SPA routing**: Your web server must fallback `/*` to `index.html`.
* **TLS**: Serve behind HTTPS; the API should also be HTTPS.
* **CORS**: Allow the dashboard origin to call the API.
* **Auth**: If required, provide `ibp_auth_token` via your login flow or pre-provisioning.

---

## Security Considerations

* No secrets in the repo; set runtime config via **environment** or `.env`.
* Bearer token is read from `localStorage` under `ibp_auth_token`; avoid storing long‑lived credentials.
* All API calls go to `REACT_APP_API_URL`; ensure strict TLS and CORS policies.
* The dashboard is read-only; mutations are performed in management backends (if any).

---

## Tech Stack & Dependencies

* **React** 19.x, **react-router-dom** 7.x
* **Axios** (HTTP client with interceptors)
* **Recharts** (analytics charts)
* **globe.gl** (3D Earth visualization)
* **date-fns** (time formatting)
* CSS modules with shared **CSS variables** (`src/index.css`) for theming

Scripts:

```json
{
  "start": "react-scripts start",
  "build": "react-scripts build",
  "test": "react-scripts test",
  "eject": "react-scripts eject"
}
```

---

## Project Structure (high level)

```
src/
  components/
    ApiHelper/           # axios setup & endpoints
    Charts/              # Recharts wrappers
    DataTable/           # sortable/paginated tables
    Loading/             # overlay/page loaders
    Sidebar/, Header/    # layout
    MemberLogo/, StatusBadge/, Cards/
  utils/
    common.js            # uptime, health, helpers
    memberUtils.js
    serviceUtils.js
  DataView/              # /data
  EarthView/             # /earth
  MemberView/            # /members + detail
  ServiceView/           # /services
  BillingView/           # /billing
  App.js, index.js, styles/
```

---

## License

See the main project’s LICENSE file.
