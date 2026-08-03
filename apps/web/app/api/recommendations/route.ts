import { NextRequest, NextResponse } from "next/server";
import { ApiError, errorResponse, openAiJson } from "../_lib/openai";

type Recommendation = { id: string; title: string; cuisine: string; prep_minutes: number; difficulty: string; description: string; key_ingredients: string[]; why_it_matches: string; ingredients: Array<{ name: string; quantity: string }>; instructions: string[] };
type Profile = { diets?: string[]; allergies?: string; favorite_meals?: string; wish_list_meals?: string; cuisines?: string[]; skill?: string; max_prep_minutes?: string; meals_per_week?: string; shopping_frequency?: string; excluded_recipes?: string[] };

export async function POST(request: NextRequest) {
  try {
    const profile = await request.json() as Profile;
    const result = await openAiJson<{ recommendations?: Omit<Recommendation, "id">[] }>(
      "You are NextBite's dinner recommendation assistant. Return an object with a recommendations array containing exactly 10 practical, distinct weeknight dinners. Every item must include title, cuisine, prep_minutes (number, 1-30), difficulty, description, key_ingredients (2-8 strings), why_it_matches, ingredients (objects with name and purchase quantity for 2 servings), and instructions (3-7 cooking steps). Respect allergies and dietary needs. Do not repeat recipes already shown.",
      `Build recommendations for this food profile:\n- Dietary needs: ${(profile.diets ?? []).join(", ") || "No specific diet"}\n- Allergies or ingredients to avoid: ${profile.allergies || "None"}\n- Favorite meals: ${profile.favorite_meals || "None"}\n- Foods to try: ${profile.wish_list_meals || "None"}\n- Cuisines: ${(profile.cuisines ?? []).join(", ") || "No preference"}\n- Cooking confidence: ${profile.skill || "Comfortable"}\n- Maximum prep: ${profile.max_prep_minutes || "30"} minutes\n- Dinners per week: ${profile.meals_per_week || "5"}\n- Shopping rhythm: ${profile.shopping_frequency || "Once a week"}\n- Recipes already shown: ${(profile.excluded_recipes ?? []).join(", ") || "None"}\nFavor variety in cuisine and protein within the prep limit.`,
    );
    if (!result.recommendations || result.recommendations.length !== 10) throw new ApiError(502, "OpenAI returned an incomplete recipe response. Please try again.");
    return NextResponse.json({ recommendations: result.recommendations.map((recipe) => ({ ...recipe, id: `openai-${crypto.randomUUID()}` })) });
  } catch (error) { return errorResponse(error); }
}
