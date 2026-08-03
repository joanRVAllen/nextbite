"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { RecommendationProfile } from "../onboarding/profile";
import { LoadingSpinner } from "../components/loading-spinner";

interface RecipeIngredient { name: string; quantity: string }
interface Recipe { id: string; title: string; cuisine: string; prep_minutes: number; key_ingredients: string[]; source: string; ingredients?: RecipeIngredient[]; instructions?: string[] }
interface Recommendation extends Omit<Recipe, "source"> { description: string; difficulty: string; why_it_matches: string }
interface MealPlan { meals: Recipe[]; alternatives: Recipe[] }
interface Profile extends RecommendationProfile { favoriteMeals: string; mealsPerWeek: string; planningPriorities?: string[] }
const apiUrl = "";
const planStorageKey = "nextbite.active-meal-plan";
const decisionsStorageKey = "nextbite.recipe-decisions";
const recommendationsStorageKey = "nextbite.recipe-recommendations";

function onboardingFavorites(favoriteMeals: string): Recipe[] {
  return favoriteMeals.split(",").map((meal) => meal.trim()).filter(Boolean).map((title) => ({
    id: `rotation-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    title, cuisine: "Your rotation", prep_minutes: 30, key_ingredients: [], source: "favorite",
  }));
}

export default function PlanPage() {
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const rawProfile = window.localStorage.getItem("nextbite.food-profile");
    if (!rawProfile) { setError("Complete your food profile before building a plan."); return; }
    const profile = JSON.parse(rawProfile) as Profile;
    const storedFavorites = window.localStorage.getItem("nextbite.favorite-recipes");
    const savedFavorites = storedFavorites ? JSON.parse(storedFavorites) as Recipe[] : [];
    const favorites = [...savedFavorites];
    onboardingFavorites(profile.favoriteMeals).forEach((recipe) => {
      if (!favorites.some((favorite) => favorite.title.toLowerCase() === recipe.title.toLowerCase())) favorites.push(recipe);
    });
    const storedRecommendations = window.localStorage.getItem(recommendationsStorageKey);
    const storedDecisions = window.localStorage.getItem(decisionsStorageKey);
    const recommendations = storedRecommendations ? JSON.parse(storedRecommendations) as Recommendation[] : [];
    const decisions = storedDecisions ? JSON.parse(storedDecisions) as Record<string, "try" | "rejected"> : {};
    const approvedRecipes = recommendations.filter((recipe) => decisions[recipe.id] === "try");
    if (favorites.length === 0 && approvedRecipes.length === 0) { setError("Add favorites or swipe left on recipes you want to try before building a plan."); return; }
    void fetch(`${apiUrl}/api/meal-plans/generate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorite_meals: profile.favoriteMeals, meals_per_week: Number(profile.mealsPerWeek), priorities: profile.planningPriorities ?? ["Fastest cooking", "Maximum variety", "Grocery waste"], favorite_recipes: favorites.map(({ id, title, cuisine, prep_minutes, key_ingredients, ingredients, instructions }) => ({ id, title, cuisine, prep_minutes, key_ingredients, ingredients, instructions, source: "favorite" })), new_recommendations: approvedRecipes.map(({ id, title, cuisine, prep_minutes, key_ingredients, ingredients, instructions }) => ({ id, title, cuisine, prep_minutes, key_ingredients, ingredients, instructions, source: "new" })) })
      })
      .then(async (response) => {
        const data = await response.json() as MealPlan | { detail: string };
        if (!response.ok) throw new Error("detail" in data ? data.detail : "Could not build your plan.");
        const generatedPlan = data as MealPlan;
        window.localStorage.setItem(planStorageKey, JSON.stringify(generatedPlan));
        setPlan(generatedPlan);
      }).catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : "Could not build your plan."));
  }, []);

  function replaceMeal(index: number) {
    if (!plan || plan.alternatives.length === 0) return;
    const replacement = plan.alternatives[0];
    const replaced = plan.meals[index];
    const nextPlan = { meals: plan.meals.map((meal, mealIndex) => mealIndex === index ? replacement : meal), alternatives: [...plan.alternatives.slice(1), replaced] };
    window.localStorage.setItem(planStorageKey, JSON.stringify(nextPlan));
    setPlan(nextPlan);
  }

  return <main><Link className="brand" href="/">NextBite</Link><section className="recommendation-header"><p className="eyebrow">Your week</p><h1>Fast, varied, and smarter to shop.</h1><p className="lede">A balanced mix of favorites and OpenAI recipes you chose to try.</p></section>{error ? <section className="error-card"><p>{error}</p><Link className="button" href="/recommendations">Review recommendations</Link></section> : !plan ? <LoadingSpinner label="Building your meal plan…" /> : <><section className="plan-grid">{plan.meals.map((meal, index) => <article className="recipe-card" key={meal.id}><div className="recipe-meta"><span>{meal.source === "favorite" ? "Favorite" : "Recipe to try"}</span><span>{meal.prep_minutes} min</span></div><h2>{meal.title}</h2><p>{meal.cuisine} · {meal.key_ingredients.slice(0, 4).join(" · ")}</p><button className="button-secondary swap-button" disabled={plan.alternatives.length === 0} onClick={() => replaceMeal(index)} type="button">Swap for next best</button></article>)}</section><div className="week-actions"><Link className="button groceries-link" href="/groceries">Get groceries</Link><Link className="button-secondary groceries-link" href="/recommendations?more=1">Generate more recipes</Link></div></>}</main>;
}
