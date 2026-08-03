import { NextRequest, NextResponse } from "next/server";
import { ApiError, errorResponse, openAiJson } from "../../_lib/openai";

type Recipe = { title: string; cuisine: string; prep_minutes: number; key_ingredients: string[] };

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";
    if (query.length < 2 || query.length > 100) throw new ApiError(400, "Enter a recipe search term between 2 and 100 characters.");
    const result = await openAiJson<{ recipes?: Recipe[] }>(
      "You suggest recipe ideas. Return an object with a recipes array containing exactly 5 practical recipe ideas matching the search term. Every item must include title, cuisine, prep_minutes, and key_ingredients (2-8 strings). Do not claim they come from a recipe database.",
      `Search term: ${query}`,
    );
    if (!result.recipes || result.recipes.length !== 5) throw new ApiError(502, "OpenAI returned an incomplete recipe search. Please try again.");
    return NextResponse.json({ recipes: result.recipes.map((recipe) => ({ ...recipe, id: `openai-search-${crypto.randomUUID()}`, source: "search" })) });
  } catch (error) { return errorResponse(error); }
}
