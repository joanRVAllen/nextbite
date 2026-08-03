import "server-only";

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export async function openAiJson<T>(instructions: string, input: string): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new ApiError(503, "Recipe features are unavailable. Add OPENAI_API_KEY to Vercel environment variables.");

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o",
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: `${instructions} Return valid JSON only.` }, { role: "user", content: input }],
      }),
    });
  } catch {
    throw new ApiError(502, "OpenAI could not be reached. Please try again.");
  }

  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
  if (!response.ok) throw new ApiError(response.status === 401 ? 503 : 502, payload.error?.message ?? "OpenAI could not complete this request.");
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new ApiError(502, "OpenAI returned an incomplete response. Please try again.");
  try { return JSON.parse(content) as T; } catch { throw new ApiError(502, "OpenAI returned an invalid response. Please try again."); }
}

export function errorResponse(error: unknown) {
  const apiError = error instanceof ApiError ? error : new ApiError(500, "Something went wrong. Please try again.");
  return Response.json({ detail: apiError.message }, { status: apiError.status });
}
