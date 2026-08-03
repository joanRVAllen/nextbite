import { NextRequest, NextResponse } from "next/server";
import { ApiError, errorResponse } from "../../_lib/openai";

type Candidate = { id: string; title: string; cuisine: string; prep_minutes: number; key_ingredients: string[]; source: "favorite" | "new"; ingredients?: Array<{ name: string; quantity: string }>; instructions?: string[] };

function protein(recipe: Candidate) { return [recipe.title, ...recipe.key_ingredients].join(" ").toLowerCase().match(/chicken|pork|beef|tofu|chickpea|fish|shrimp/)?.[0] ?? "other"; }
function unique(recipes: Candidate[]) { return recipes.filter((recipe, index) => recipes.findIndex((item) => item.id === recipe.id) === index); }
function rank(candidates: Candidate[], selected: Candidate[], priorities: string[]) {
  const ingredients = new Set(selected.flatMap((recipe) => recipe.key_ingredients.map((item) => item.toLowerCase())));
  const proteins = new Set(selected.map(protein));
  const order = priorities.length ? priorities : ["Fastest cooking", "Maximum variety", "Grocery waste"];
  return [...candidates].sort((a, b) => {
    const score = (recipe: Candidate) => order.map((priority) => priority === "Fastest cooking" ? recipe.prep_minutes : priority === "Maximum variety" ? Number(proteins.has(protein(recipe))) : priority === "Grocery waste" ? -recipe.key_ingredients.filter((item) => ingredients.has(item.toLowerCase())).length : 0);
    const left = score(a), right = score(b);
    for (let index = 0; index < left.length; index += 1) if (left[index] !== right[index]) return left[index] - right[index];
    return a.title.localeCompare(b.title);
  });
}
function choose(candidates: Candidate[], count: number, selected: Candidate[], priorities: string[]) { const picked = [...selected]; return rank(candidates, picked, priorities).filter((recipe) => !picked.some((item) => item.id === recipe.id)).slice(0, count); }

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json() as { meals_per_week?: number; priorities?: string[]; favorite_recipes?: Candidate[]; new_recommendations?: Candidate[] };
    const mealsPerWeek = payload.meals_per_week ?? 0;
    if (!Number.isInteger(mealsPerWeek) || mealsPerWeek < 1 || mealsPerWeek > 7) throw new ApiError(400, "Choose between 1 and 7 meals per week.");
    const favorites = unique((payload.favorite_recipes ?? []).map((recipe) => ({ ...recipe, source: "favorite" as const })));
    const newRecipes = unique((payload.new_recommendations ?? []).map((recipe) => ({ ...recipe, source: "new" as const })));
    if (!favorites.length && !newRecipes.length) throw new ApiError(400, "Add favorites or swipe left on recipes you want to try before building a meal plan.");
    const priorities = payload.priorities ?? [];
    const favoriteCount = Math.floor(mealsPerWeek / 2);
    const chosenFavorites = choose(favorites, favoriteCount, [], priorities);
    const chosenNew = choose(newRecipes, mealsPerWeek - favoriteCount, chosenFavorites, priorities);
    const meals = [...chosenFavorites, ...chosenNew];
    if (meals.length < mealsPerWeek) meals.push(...choose([...favorites, ...newRecipes], mealsPerWeek - meals.length, meals, priorities));
    const alternatives = rank([...favorites, ...newRecipes].filter((recipe) => !meals.some((meal) => meal.id === recipe.id)), meals, priorities);
    return NextResponse.json({ meals, alternatives });
  } catch (error) { return errorResponse(error); }
}
