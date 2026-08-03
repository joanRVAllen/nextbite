import { NextRequest, NextResponse } from "next/server";
import { ApiError, errorResponse, openAiJson } from "../../_lib/openai";

type Assignment = { ingredient: string; category: string; store: string };

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json() as { ingredients?: string[]; stores?: string[] };
    const ingredients = payload.ingredients?.filter(Boolean) ?? [];
    const stores = payload.stores?.filter(Boolean) ?? [];
    if (!ingredients.length || !stores.length) throw new ApiError(400, "Ingredients and at least one preferred store are required.");
    const result = await openAiJson<{ assignments?: Assignment[] }>(
      "You organize grocery lists. Return an object with an assignments array. Assign every supplied ingredient to exactly one supplied store and exactly one category from: Produce, Meat & protein, Dairy, Bakery, Frozen, Pantry, Other. Do not change ingredient names or invent stores.",
      `Preferred stores: ${stores.join(", ")}\nIngredients: ${ingredients.join(", ")}`,
    );
    const assignments = result.assignments ?? [];
    if (assignments.length !== ingredients.length || new Set(assignments.map((item) => item.ingredient)).size !== ingredients.length || assignments.some((item) => !ingredients.includes(item.ingredient) || !stores.includes(item.store))) throw new ApiError(502, "OpenAI returned an incomplete grocery list. Please try again.");
    return NextResponse.json({ assignments });
  } catch (error) { return errorResponse(error); }
}
