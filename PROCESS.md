# NextBite process write-up

I built NextBite around a familiar weeknight problem: deciding what to cook while balancing taste, time, variety, and groceries. The app starts with a six-step food profile, generates ten tailored dinner ideas, lets someone keep or reject them, and turns the choices into a weekly plan and grocery list.

I used Codex as my primary AI coding partner. It helped scaffold the Next.js app, turn product ideas into small flows, troubleshoot hydration and deployment issues, and run linting, type checks, builds, and tests. The key technical decision was to keep OpenAI calls in Next.js route handlers deployed with Vercel. This keeps `OPENAI_API_KEY` private while avoiding a separate backend deployment; the browser calls the app's own `/api` routes, which call OpenAI server-side.

The main trade-off was scope. I explored swiping, favorites, a dashboard, meal swaps, grocery grouping, and search because they make the idea immediately usable. For a take-home, the core remains intentionally focused: an LLM turns a food profile into ten practical dinners, with predictable fields that the UI can render. The model is asked for JSON containing recipe metadata, ingredient quantities for two servings, and cooking steps. I chose this structured response rather than parsing free-form recipe prose, accepting that additional validation and ingredient normalization would be worthwhile before a production launch.

The model was most helpful at translating profile details—favorite meals, cuisines, cooking confidence, time limit, and dinner count—into varied starting points. It was less reliable when requirements were vague or when a response needed an exact shape, so I used explicit prompts, server-side error handling, and local checks. I also kept the swipe meaning explicit: left is “I want to try it,” and right is “Not for me,” because that decision drives which meals enter planning.

Three prompts that mattered most were:

1. “Create exactly ten practical, distinct weeknight dinners. Respect allergies and dietary needs, stay within the stated prep-time limit, and vary cuisine and main protein.”
2. “Include a complete, practical ingredient list with purchase quantities for two servings and three to seven clear cooking steps for every recipe.”
3. “Return valid JSON with the recipe title, cuisine, prep time, key ingredients, match rationale, ingredient quantities, and instructions so the app can render reliable recipe cards.”

If I continued, I would add lightweight evaluation cases for dietary restrictions, stronger rate limiting around the API routes, and better ingredient normalization before using the grocery list in a production setting.
