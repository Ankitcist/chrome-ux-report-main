# Chrome UX Report Dashboard (React + Django)

Production-oriented full-stack application for querying the Google Chrome UX (CrUX) Report API for multiple origins and visualizing Core Web Vitals.

## System Design

### Backend (Django + DRF)
- Exposes `POST /api/crux/` endpoint.
- Accepts payload:
  ```json
  {
    "urls": ["https://developer.intuit.com", "web.dev"]
  }
  ```
- URL normalization converts input to origin format (scheme + host) required by CrUX.
- Service layer (`CruxMetricsService`) encapsulates:
  - URL validation
  - External API call via `requests`
  - Metric extraction (p75 for LCP, INP, CLS)
  - Insight/recommendation generation
- Per-URL error handling ensures one bad URL does not fail the entire request.

### Frontend (React + MUI)
- Text area accepts multiple URLs (newline/comma).
- MUI DataGrid displays:
  - URL
  - LCP
  - INP
  - CLS
  - Status
  - Insight
- Sorting is enabled for metric columns.
- Filtering controls allow threshold-based LCP filtering.
- Summary section computes **sum** and **average** for currently visible rows.

### Object-Oriented Design Choices
- `CruxClient`: infrastructure concern (HTTP).
- `CruxMetricsService`: business logic and metric parsing.
- `CruxMetricsView`: transport/API orchestration only.
- Custom exception classes clearly separate validation and data-unavailable conditions.

## File Structure

```text
chrome-ux-report/
  backend/
    .env.example
    requirements.txt
    manage.py
    crux_backend/
      __init__.py
      settings.py
      urls.py
      wsgi.py
      asgi.py
    crux_api/
      __init__.py
      apps.py
      exceptions.py
      services.py
      views.py
      urls.py
  frontend/
    .env.example
    package.json
    vite.config.js
    index.html
    src/
      main.jsx
      App.jsx
      components/
        CruxTable.jsx
      services/
        api.js
  README.md
```

## Local Setup

## 1) Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Update `backend/.env`:
- `CRUX_API_KEY`: your Google API key with CrUX API access.
- `CORS_ALLOWED_ORIGINS`: frontend URL (default: `http://localhost:5173`).

Run migrations and server:

```bash
python manage.py migrate
python manage.py runserver 8000
```

## 2) Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend runs on `http://localhost:5173` and calls backend using `VITE_API_BASE_URL`.

## API Contract

### Request
`POST /api/crux/`

```json
{
  "urls": ["https://developer.intuit.com", "https://web.dev"]
}
```

### Response (example)
```json
{
  "results": [
    {
      "url": "https://developer.intuit.com",
      "lcp": 2820,
      "inp": 210,
      "cls": 0.08,
      "status": "success",
      "recommendation": "Needs Improvement: optimize images and server response."
    },
    {
      "url": "not-a-url",
      "status": "error",
      "error": "URL must include a valid host."
    }
  ]
}
```

## Known Issues / Constraints
- This implementation uses INP as the modern responsiveness metric for Core Web Vitals.
- CrUX provides origin-level data; URL paths are intentionally normalized to origins.
- If API quota is exceeded or Google API is unavailable, rows return graceful per-URL error messages.

## INP Thresholds Used
- Good: `<= 200 ms`
- Needs Improvement: `> 200 ms` and `<= 500 ms`
- Poor: `> 500 ms`

## Deployment Next Steps
- Backend:
  - Use `gunicorn` behind Nginx.
  - Move secrets to deployment-managed env vars (not `.env` files in repo).
  - Enable HTTPS and stricter security headers.
- Frontend:
  - Build static bundle via `npm run build`.
  - Serve via CDN or reverse proxy.
  - Set `VITE_API_BASE_URL` to production backend URL.
- Reliability:
  - Add tests for services and view logic.
  - Add request retries and circuit-breaker behavior for transient CrUX failures.
  - Add rate limiting and caching for repeated origin lookups.
