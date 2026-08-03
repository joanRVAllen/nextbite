# NextBite process write-up

I built NextBite, a small meal-planning app for the recurring question: “What should I cook this week?” I chose it because I care about cooking but dislike repeatedly deciding on dinners, managing variety, and creating a grocery list from scratch. The app starts with a short profile, produces ten tailored recipe ideas, lets the user save or reject them, and turns the result into a weekly plan and grocery list.

I used Codex as my primary AI coding partner. I used it to scaffold the Next.js and FastAPI structure, translate product ideas into small UI flows, troubleshoot runtime and hydration issues, and repeatedly run linting, type checks, builds, and tests. I also used OpenAI’s API documentation to choose the Responses API and structured outputs. That decision was important: the frontend needs predictable recipe-card fields, so the backend asks GPT-4o to return a response that conforms to a Pydantic schema instead of trying to parse free-form prose.

The main trade-off was scope. I initially explored a richer experience—swiping, favorites, a dashboard, swapping meals, grocery grouping, and Spoonacular search—because those interactions make the concept easy to try. For a take-home, the core is deliberately narrow: one meaningful LLM call converts the food profile into ten usable weeknight recommendations. Spoonacular is optional and only enriches search/detail lookup; it is not required for the LLM experience to work. I kept the OpenAI key on the FastAPI server rather than exposing it in browser code.

The model was helpful at turning profile details such as favorite cuisines, comfort level, dinner count, and time limit into varied suggestions. It was less helpful when requirements were vague or when frontend development state became stale, so I used typed schemas, small API boundaries, and local checks rather than relying on a model response alone. I also made “try” and “reject” decisions explicit, since an ambiguous gesture would make downstream planning behavior hard to explain.

Three prompts that mattered most were:

1. “Create exactly ten practical, distinct weeknight dinners. Respect allergies and dietary needs, stay within the stated prep-time limit, and vary cuisine and main protein.”
2. “Use this food profile—dietary needs, rotation meals, cuisines, cooking skill, time limit, and shopping cadence—to explain why each recipe matches.”
3. “Return each recommendation as structured data with an id, title, cuisine, prep time, ingredients, description, and match rationale so it can be rendered as a recipe card.”

If I continued, I would add lightweight evaluation cases for dietary restrictions and better ingredient normalization before using grocery recommendations in a production setting.
