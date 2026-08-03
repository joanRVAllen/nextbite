"use client";

import Link from "next/link";
import { DragEvent, useEffect, useState } from "react";
import { recommendationPayload, type RecommendationProfile } from "./onboarding/profile";

interface Recipe { id: string; title: string; cuisine: string; prep_minutes: number; key_ingredients: string[]; source: string }
interface StoredPlan { meals: Recipe[]; alternatives: Recipe[] }
interface Dashboard { currentWeek: Recipe[]; nextWeek: Recipe[] }
interface Profile extends RecommendationProfile { favoriteMeals: string; mealsPerWeek: string; planningPriorities?: string[] }

const planStorageKey = "nextbite.active-meal-plan";
const dashboardStorageKey = "nextbite.meal-dashboard";
const favoritesStorageKey = "nextbite.favorite-recipes";
const rejectedStorageKey = "nextbite.rejected-recipes";
const groceryStorageKey = "nextbite.grocery-items";
const groceryStaleStorageKey = "nextbite.grocery-list-stale";
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function mealCountFromProfile() {
  const savedProfile = window.localStorage.getItem("nextbite.food-profile");
  if (!savedProfile) return 5;
  try {
    const mealsPerWeek = Number((JSON.parse(savedProfile) as { mealsPerWeek?: string }).mealsPerWeek);
    return Number.isInteger(mealsPerWeek) && mealsPerWeek > 0 ? mealsPerWeek : 5;
  } catch { return 5; }
}

export default function HomePage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const mealCount = mealCountFromProfile();
    const savedDashboard = window.localStorage.getItem(dashboardStorageKey);
    if (savedDashboard) {
      try {
        const parsedDashboard = JSON.parse(savedDashboard) as Dashboard;
        setDashboard({ ...parsedDashboard, nextWeek: parsedDashboard.nextWeek.slice(0, mealCount) });
        return;
      } catch { window.localStorage.removeItem(dashboardStorageKey); }
    }
    const savedPlan = window.localStorage.getItem(planStorageKey);
    if (!savedPlan) return;
    try {
      const plan = JSON.parse(savedPlan) as StoredPlan;
      setDashboard({ currentWeek: plan.meals, nextWeek: plan.alternatives.slice(0, mealCount) });
    } catch { window.localStorage.removeItem(planStorageKey); }
  }, []);

  function persist(nextDashboard: Dashboard, hasRecipeChanges = true) {
    window.localStorage.setItem(dashboardStorageKey, JSON.stringify(nextDashboard));
    window.localStorage.setItem(planStorageKey, JSON.stringify({ meals: nextDashboard.currentWeek, alternatives: nextDashboard.nextWeek }));
    if (hasRecipeChanges) window.localStorage.setItem(groceryStaleStorageKey, "true");
    setDashboard(nextDashboard);
  }

  function openGroceries() {
    if (window.localStorage.getItem(groceryStaleStorageKey) === "true") {
      window.localStorage.removeItem(groceryStorageKey);
      window.localStorage.removeItem(groceryStaleStorageKey);
      window.location.assign("/groceries?refresh=1");
      return;
    }
    window.location.assign("/groceries");
  }

  function recordDecision(recipe: Recipe, action: "favorite" | "rejected") {
    const key = action === "favorite" ? favoritesStorageKey : rejectedStorageKey;
    const existing = JSON.parse(window.localStorage.getItem(key) ?? "[]") as Recipe[];
    if (!existing.some((item) => item.id === recipe.id)) window.localStorage.setItem(key, JSON.stringify([...existing, recipe]));
  }

  function removeFromCurrent(recipe: Recipe, action: "favorite" | "rejected") {
    if (!dashboard) return;
    recordDecision(recipe, action);
    const remaining = dashboard.currentWeek.filter((item) => item.id !== recipe.id);
    if (remaining.length === 0 && dashboard.nextWeek.length > 0) {
      const promotedWeek = dashboard.nextWeek;
      persist({ currentWeek: promotedWeek, nextWeek: [] });
      const rawProfile = window.localStorage.getItem("nextbite.food-profile");
      const profile = rawProfile ? JSON.parse(rawProfile) as RecommendationProfile : {};
      const favoriteTitles = (JSON.parse(window.localStorage.getItem(favoritesStorageKey) ?? "[]") as Array<{ title: string }>).map((item) => item.title);
      void fetch(`${apiUrl}/api/recommendations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(recommendationPayload(profile, favoriteTitles)) })
        .then((response) => response.ok ? response.json() as Promise<{ recommendations: Array<Omit<Recipe, "source">> }> : null)
        .then((data) => {
          if (!data) return;
          const existingIds = new Set(promotedWeek.map((item) => item.id));
          const nextWeek = data.recommendations.filter((item) => !existingIds.has(item.id)).slice(0, promotedWeek.length).map((item) => ({ ...item, source: "new" }));
          persist({ currentWeek: promotedWeek, nextWeek });
        }).catch(() => undefined);
      return;
    }
    persist({ ...dashboard, currentWeek: remaining });
  }

  function removeFromNext(recipe: Recipe) {
    if (!dashboard) return;
    recordDecision(recipe, "rejected");
    persist({ ...dashboard, nextWeek: dashboard.nextWeek.filter((item) => item.id !== recipe.id) });
  }

  function replaceCurrent(recipe: Recipe) {
    if (!dashboard || dashboard.nextWeek.length === 0) return;
    const replacement = dashboard.nextWeek[0];
    persist({ currentWeek: dashboard.currentWeek.map((item) => item.id === recipe.id ? replacement : item), nextWeek: [...dashboard.nextWeek.slice(1), recipe] });
  }

  function replaceNext(recipe: Recipe) {
    if (!dashboard) return;
    const index = dashboard.nextWeek.findIndex((item) => item.id === recipe.id);
    if (index < 0 || dashboard.nextWeek.length < 2) return;
    const nextWeek = [...dashboard.nextWeek];
    const replacementIndex = (index + 1) % nextWeek.length;
    [nextWeek[index], nextWeek[replacementIndex]] = [nextWeek[replacementIndex], nextWeek[index]];
    persist({ ...dashboard, nextWeek });
  }

  function moveRecipe(destination: "currentWeek" | "nextWeek") {
    if (!dashboard || !draggedId) return;
    const origin = dashboard.currentWeek.some((item) => item.id === draggedId) ? "currentWeek" : "nextWeek";
    if (origin === destination) return;
    const recipe = dashboard[origin].find((item) => item.id === draggedId);
    if (!recipe) return;
    persist({ ...dashboard, [origin]: dashboard[origin].filter((item) => item.id !== draggedId), [destination]: [...dashboard[destination], recipe] });
    setDraggedId(null);
  }

  async function refreshPlan() {
    if (!dashboard || isRefreshing) return;
    const rawProfile = window.localStorage.getItem("nextbite.food-profile");
    if (!rawProfile) return;
    let profile: Profile;
    try { profile = JSON.parse(rawProfile) as Profile; } catch { return; }
    const storedFavorites = window.localStorage.getItem(favoritesStorageKey);
    const favoriteTitles = storedFavorites ? (JSON.parse(storedFavorites) as Array<{ title: string }>).map((recipe) => recipe.title) : [];
    setIsRefreshing(true);
    try {
      const recommendationsResponse = await fetch(`${apiUrl}/api/recommendations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(recommendationPayload(profile, favoriteTitles)) });
      if (!recommendationsResponse.ok) return;
      const recommendationData = await recommendationsResponse.json() as { recommendations: Recipe[] };
      const existingIds = new Set(dashboard.currentWeek.map((recipe) => recipe.id));
      const candidates = recommendationData.recommendations.filter((recipe) => !existingIds.has(recipe.id));
      const planResponse = await fetch(`${apiUrl}/api/meal-plans/generate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorite_meals: [profile.favoriteMeals, ...favoriteTitles].filter(Boolean).join(", "), meals_per_week: Number(profile.mealsPerWeek), priorities: profile.planningPriorities ?? ["Fastest cooking", "Maximum variety", "Grocery waste"], new_recommendations: candidates.map((recipe) => ({ id: recipe.id, title: recipe.title, cuisine: recipe.cuisine, prep_minutes: recipe.prep_minutes, key_ingredients: recipe.key_ingredients, source: "new" })) })
      });
      if (!planResponse.ok) return;
      const plan = await planResponse.json() as StoredPlan;
      persist({ currentWeek: plan.meals, nextWeek: plan.alternatives.slice(0, mealCountFromProfile()) });
    } finally { setIsRefreshing(false); }
  }

  if (!dashboard) return <main><section className="hero"><p className="eyebrow">NextBite</p><h1>Your meals, made easier.</h1><p className="lede">Create your food profile and build a weekly plan to see your dashboard.</p><Link className="button" href="/onboarding">Start your food profile</Link></section></main>;

  return <main className="dashboard"><section className="dashboard-heading"><p className="eyebrow">Home · this week</p><h1>Meals for the week.</h1><p className="lede">Hover a card to favorite, reject, or replace it. Drag cards between this week and next week.</p></section><Board heading="Meals for the week" onDrop={() => moveRecipe("currentWeek")} recipes={dashboard.currentWeek} onDragStart={setDraggedId} renderActions={(recipe) => <><button aria-label={`Favorite ${recipe.title}`} onClick={() => removeFromCurrent(recipe, "favorite")} type="button">♥</button><button aria-label={`Reject ${recipe.title}`} onClick={() => removeFromCurrent(recipe, "rejected")} type="button">×</button><button aria-label={`Replace ${recipe.title}`} disabled={dashboard.nextWeek.length === 0} onClick={() => replaceCurrent(recipe)} type="button">↻</button></>} /><button className="groceries-link" onClick={openGroceries} type="button">Get grocery list</button><section className="dashboard-section"><div className="section-heading"><div><p className="eyebrow">Coming up</p><h2>Next week</h2></div><button className="button-secondary" disabled={isRefreshing} onClick={() => void refreshPlan()} type="button">{isRefreshing ? "Generating…" : "Refresh meal plan"}</button></div><Board heading="Next week meals" onDrop={() => moveRecipe("nextWeek")} recipes={dashboard.nextWeek} onDragStart={setDraggedId} renderActions={(recipe) => <><button aria-label={`Favorite ${recipe.title}`} onClick={() => recordDecision(recipe, "favorite")} type="button">♥</button><button aria-label={`Reject ${recipe.title}`} onClick={() => removeFromNext(recipe)} type="button">×</button><button aria-label={`Replace ${recipe.title}`} disabled={dashboard.nextWeek.length < 2} onClick={() => replaceNext(recipe)} type="button">↻</button></>} /></section><section className="dashboard-footer"><p className="eyebrow">Keep discovering</p><h2>Want a few more possibilities?</h2><Link className="button" href="/recommendations">Find more recipes</Link></section></main>;
}

function Board({ heading, onDragStart, onDrop, recipes, renderActions }: { heading: string; onDragStart: (id: string) => void; onDrop: () => void; recipes: Recipe[]; renderActions: (recipe: Recipe) => React.ReactNode }) {
  return <section aria-label={heading} className="meal-board" onDragOver={(event) => event.preventDefault()} onDrop={(event: DragEvent<HTMLElement>) => { event.preventDefault(); onDrop(); }}>{recipes.length > 0 ? recipes.map((recipe) => <article className="dashboard-card" draggable key={recipe.id} onDragStart={() => onDragStart(recipe.id)}><div className="dashboard-card-actions">{renderActions(recipe)}</div><p className="recipe-meta"><span>{recipe.source === "favorite" ? "Your rotation" : "New"}</span><span>{recipe.prep_minutes} min</span></p><h3>{recipe.title}</h3><p>{recipe.cuisine}</p><p className="ingredients">{recipe.key_ingredients.slice(0, 3).join(" · ")}</p></article>) : <div className="board-empty">No meals here yet. Drag a recipe into this section, or build a new plan.</div>}</section>;
}
