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
- An [OpenAI API key](https://platform.openai.com/api-keys). The app will not generate recommendations without one.

### Setup

1. Create `apps/web/.env.local` and add your key:

   ```bash
   OPENAI_API_KEY=your_openai_key
   OPENAI_MODEL=gpt-4o
   ```

2. Install dependencies and run the app:

   ```bash
   npm install
   npm run dev:web
   ```

3. Visit `http://localhost:3000`.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | Yes | Generates personalized recipe recommendations. |
| `OPENAI_MODEL` | No | OpenAI model, defaults to `gpt-4o`. |

## Deploy the app

NextBite uses Vercel route handlers for its secure OpenAI calls. There is no separate API service to deploy and no public backend URL to configure.

1. In Vercel → NextBite → **Settings** → **Environment Variables**, add `OPENAI_API_KEY` with your key as its value. Apply it to Production (and Preview too, if you use previews).
2. Optionally add `OPENAI_MODEL` with the value `gpt-4o`.
3. Redeploy the Vercel project.

Never name the key `NEXT_PUBLIC_OPENAI_API_KEY`; variables with the `NEXT_PUBLIC_` prefix are exposed to browsers.

## Checks

Run `npm run lint`, `npm run typecheck`, and `npm test`.

See [PROCESS.md](PROCESS.md) for the project process write-up.
