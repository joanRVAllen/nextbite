# NextBite

NextBite is a personalized weeknight meal-planning app. It collects a food profile, uses OpenAI to generate ten recipe ideas, lets people save or reject ideas, and builds a practical weekly plan and grocery list.

## What it does

- Six-step onboarding for dietary needs, food rotation, cuisines, cooking time, weekly dinner count, planning priorities, and preferred stores.
- GPT-4o recommendations tailored to the submitted profile.
- A swipe flow: left means “I want to try it”; right means “Not for me.”
- A dashboard for this week and next week, with favorite, reject, replace, drag, and refresh actions.
- OpenAI-powered recipe search that returns five ideas matching a search term.
- A grocery list grouped by preferred store, with check-off, drag-and-drop, and copy actions.

## Run locally

### Prerequisites

- Node.js 20+
- Python 3.11+
- Docker Desktop (only needed for the included PostgreSQL service)
- An [OpenAI API key](https://platform.openai.com/api-keys). The app will not generate recommendations without one.

### Setup

1. Copy the example environment file: `cp .env.example apps/api/.env`.
2. In `apps/api/.env`, set `OPENAI_API_KEY` to your key. Keep it private; it is used only by the backend.
3. Start PostgreSQL: `docker compose up -d db`.
4. Install frontend dependencies: `npm install`.
5. Create the API virtual environment and install dependencies:

   ```bash
   python3 -m venv apps/api/.venv
   apps/api/.venv/bin/pip install -r apps/api/requirements.txt
   ```

6. In separate terminals, start the web app and API:

   ```bash
   npm run dev:web
   npm run dev:api
   ```

7. Visit `http://localhost:3000`. The API health check is at `http://localhost:8000/api/health`.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | Yes | Generates personalized recipe recommendations. |
| `OPENAI_MODEL` | No | OpenAI model, defaults to `gpt-4o`. |
| `DATABASE_URL` | No | PostgreSQL connection; the local Docker default is supplied. |
| `NEXT_PUBLIC_API_URL` | No | Frontend-to-backend URL, defaults to `http://localhost:8000`. |

## Checks

Run `npm run lint`, `npm run typecheck`, and `npm test`.

See [PROCESS.md](PROCESS.md) for the project process write-up.
