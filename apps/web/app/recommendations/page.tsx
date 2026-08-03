"use client";

import Link from "next/link";
import { PointerEvent, useEffect, useState } from "react";
import { recommendationPayload, type RecommendationProfile } from "../onboarding/profile";
import { LoadingSpinner } from "../components/loading-spinner";

interface Recommendation {
  id: string;
  title: string;
  cuisine: string;
  prep_minutes: number;
  difficulty: string;
  description: string;
  key_ingredients: string[];
  why_it_matches: string;
}

interface ApiResponse { recommendations: Recommendation[] }
type Decision = "try" | "rejected";
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const decisionStorageKey = "nextbite.recipe-decisions";
const recommendationsStorageKey = "nextbite.recipe-recommendations";

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [startX, setStartX] = useState<number | null>(null);

  useEffect(() => {
    const rawProfile = window.localStorage.getItem("nextbite.food-profile");
    const storedDecisions = window.localStorage.getItem(decisionStorageKey);
    const storedFavorites = window.localStorage.getItem("nextbite.favorite-recipes");
    if (storedDecisions) {
      try { setDecisions(JSON.parse(storedDecisions) as Record<string, Decision>); } catch { window.localStorage.removeItem(decisionStorageKey); }
    }
    if (!rawProfile) { setError("Complete your food profile before requesting recommendations."); setIsLoading(false); return; }

    try {
      const profile = JSON.parse(rawProfile) as RecommendationProfile;
      const favoriteTitles = storedFavorites ? (JSON.parse(storedFavorites) as Array<{ title: string }>).map((recipe) => recipe.title) : [];
      const storedRecommendations = window.localStorage.getItem(recommendationsStorageKey);
      const previousRecommendations = storedRecommendations ? JSON.parse(storedRecommendations) as Recommendation[] : [];
      void fetch(`${apiUrl}/api/recommendations`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...recommendationPayload(profile, favoriteTitles), excluded_recipes: previousRecommendations.map((recipe) => recipe.title) })
      }).then(async (response) => {
        const data = await response.json() as ApiResponse | { detail: string };
        if (!response.ok) throw new Error("detail" in data ? data.detail : "Could not load recommendations.");
        const generatedRecommendations = (data as ApiResponse).recommendations;
        const nextRecommendations = [...previousRecommendations, ...generatedRecommendations.filter((recipe) => !previousRecommendations.some((previous) => previous.title.toLowerCase() === recipe.title.toLowerCase()))];
        window.localStorage.setItem(recommendationsStorageKey, JSON.stringify(nextRecommendations));
        setRecommendations(nextRecommendations);
      }).catch((requestError: unknown) => {
        setError(requestError instanceof Error ? requestError.message : "Could not load recommendations.");
      }).finally(() => setIsLoading(false));
    } catch { setError("Your saved profile is unreadable. Please create it again."); setIsLoading(false); }
  }, []);

  function decide(recipe: Recommendation, decision: Decision) {
    setDecisions((current) => {
      const next = { ...current, [recipe.id]: decision };
      window.localStorage.setItem(decisionStorageKey, JSON.stringify(next));
      return next;
    });
  }

  function handlePointerUp(event: PointerEvent<HTMLElement>, recipe: Recommendation) {
    if (startX === null) return;
    const distance = event.clientX - startX;
    if (distance <= -80) decide(recipe, "try");
    if (distance >= 80) decide(recipe, "rejected");
    setStartX(null);
  }

  const currentRecipe = recommendations.find((recipe) => !decisions[recipe.id]);
  const triedCount = Object.values(decisions).filter((decision) => decision === "try").length;

  return <main className="recommendations-page"><Link className="brand" href="/">NextBite</Link><section className="recommendation-header"><p className="eyebrow">For you</p><h1>Your next ten dinners.</h1><p className="lede">{isLoading ? "Finding meals that fit your taste…" : "Swipe left to try it, right to pass."}</p></section>{error ? <section className="error-card"><p>{error}</p><Link className="button" href="/onboarding">Edit food profile</Link></section> : isLoading ? <LoadingSpinner label="Finding recipes for you…" /> : currentRecipe ? <section className="swipe-area" aria-label="Recipe recommendation"><p className="swipe-progress">{`${Object.keys(decisions).length + 1} of ${recommendations.length}`}</p><article className="recipe-card swipe-card" onPointerDown={(event) => setStartX(event.clientX)} onPointerUp={(event) => handlePointerUp(event, currentRecipe)}><div className="recipe-meta"><span>{currentRecipe.cuisine}</span><span>{currentRecipe.prep_minutes} min</span></div><h2>{currentRecipe.title}</h2><p>{currentRecipe.description}</p><p className="match"><strong>Why it fits:</strong> {currentRecipe.why_it_matches}</p><p className="ingredients">{currentRecipe.key_ingredients.join(" · ")}</p></article><div className="swipe-actions"><button className="try-button" onClick={() => decide(currentRecipe, "try")} type="button">← I want to try it</button><button className="pass-button" onClick={() => decide(currentRecipe, "rejected")} type="button">Not for me →</button></div></section> : <section className="onboarding-card complete-card"><p className="eyebrow">Recommendations reviewed</p><h1>{triedCount} meals to try.</h1><p className="lede">Your plan will balance your favorite rotation with new recipes, prioritize faster meals, then variety and ingredient reuse.</p><div className="plan-actions"><Link className="button" href="/plan">Build my weekly plan</Link><button className="button-secondary" onClick={() => { window.localStorage.removeItem(decisionStorageKey); setDecisions({}); }} type="button">Review again</button></div></section>}</main>;
}
