"use client";

import { FormEvent, useEffect, useState } from "react";

interface Recipe { id: string; title: string; cuisine: string; prep_minutes: number; key_ingredients: string[]; source: string }
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const favoritesStorageKey = "nextbite.favorite-recipes";
const decisionsStorageKey = "nextbite.recipe-decisions";
const rejectedStorageKey = "nextbite.rejected-recipes";
const recommendationsStorageKey = "nextbite.recipe-recommendations";

function profileRecipes(value: string, prefix: string, label: string): Recipe[] {
  return value.split(",").map((meal) => meal.trim()).filter(Boolean).map((title) => ({
    id: `${prefix}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    title, cuisine: label, prep_minutes: 30, key_ingredients: [], source: "favorite",
  }));
}

export default function RecipesPage() {
  const [newRecipes, setNewRecipes] = useState<Recipe[]>([]);
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Recipe[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showFavoriteEditor, setShowFavoriteEditor] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(favoritesStorageKey);
    const rawProfile = window.localStorage.getItem("nextbite.food-profile");
    let savedFavorites: Recipe[] = [];
    if (stored) { try { savedFavorites = JSON.parse(stored) as Recipe[]; } catch { window.localStorage.removeItem(favoritesStorageKey); } }
    const profileFavorites = rawProfile ? (() => {
      try {
        const profile = JSON.parse(rawProfile) as { favoriteMeals?: string; wishListMeals?: string };
        return [
          ...profileRecipes(profile.favoriteMeals ?? "", "rotation", "Your rotation"),
          ...profileRecipes(profile.wishListMeals ?? "", "wish", "Want to make"),
        ];
      } catch { return []; }
    })() : [];
    const mergedFavorites = [...savedFavorites];
    profileFavorites.forEach((recipe) => { if (!mergedFavorites.some((favorite) => favorite.title.toLowerCase() === recipe.title.toLowerCase())) mergedFavorites.push(recipe); });
    window.localStorage.setItem(favoritesStorageKey, JSON.stringify(mergedFavorites));
    setFavorites(mergedFavorites);
    const storedDecisions = window.localStorage.getItem(decisionsStorageKey);
    const decisions = storedDecisions ? JSON.parse(storedDecisions) as Record<string, "try" | "rejected"> : {};
    const storedRecommendations = window.localStorage.getItem(recommendationsStorageKey);
    const recommendations = storedRecommendations ? JSON.parse(storedRecommendations) as Recipe[] : [];
    setNewRecipes(recommendations.filter((recipe) => decisions[recipe.id] === "try" && !mergedFavorites.some((favorite) => favorite.id === recipe.id || favorite.title.toLowerCase() === recipe.title.toLowerCase())));
  }, []);

  function toggleFavorite(recipe: Recipe) {
    setFavorites((current) => {
      const next = current.some((item) => item.id === recipe.id) ? current.filter((item) => item.id !== recipe.id) : [...current, recipe];
      window.localStorage.setItem(favoritesStorageKey, JSON.stringify(next));
      return next;
    });
  }

  function favoriteNewRecipe(recipe: Recipe) {
    toggleFavorite(recipe);
    setNewRecipes((current) => current.filter((item) => item.id !== recipe.id));
  }

  function rejectNewRecipe(recipe: Recipe) {
    const decisions = JSON.parse(window.localStorage.getItem(decisionsStorageKey) ?? "{}") as Record<string, "try" | "rejected">;
    window.localStorage.setItem(decisionsStorageKey, JSON.stringify({ ...decisions, [recipe.id]: "rejected" }));
    const rejected = JSON.parse(window.localStorage.getItem(rejectedStorageKey) ?? "[]") as Recipe[];
    if (!rejected.some((item) => item.id === recipe.id)) window.localStorage.setItem(rejectedStorageKey, JSON.stringify([...rejected, recipe]));
    setNewRecipes((current) => current.filter((item) => item.id !== recipe.id));
  }

  function toggleSelectedRecipeFavorite() {
    if (!selectedRecipe) return;
    if (newRecipes.some((recipe) => recipe.id === selectedRecipe.id)) {
      favoriteNewRecipe(selectedRecipe);
      return;
    }
    toggleFavorite(selectedRecipe);
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (query.trim().length < 2) return;
    setIsSearching(true);
    setSearchError("");
    void fetch(`${apiUrl}/api/recipes/search?query=${encodeURIComponent(query.trim())}`).then(async (response) => response.ok ? response.json() as Promise<{ recipes: Recipe[] }> : Promise.reject(new Error("Recipe search is unavailable. Restart the API server and try again."))).then((data) => setSearchResults(data.recipes)).catch((requestError: unknown) => { setSearchResults([]); setSearchError(requestError instanceof Error ? requestError.message : "Recipe search is unavailable."); }).finally(() => setIsSearching(false));
  }

  return <main><section className="recipes-heading"><div><p className="eyebrow">Recipes</p><h1>New recipes</h1></div><button onClick={() => setShowSearch(true)} type="button">Search recipes</button></section><RecipeGrid emptyText="Swipe left on a recommendation to add it here." favorites={favorites} onOpen={setSelectedRecipe} onReject={rejectNewRecipe} onToggleFavorite={favoriteNewRecipe} recipes={newRecipes} /><section className="favorites-section"><div className="recipes-heading"><div><p className="eyebrow">Made for you</p><h2>Favorites</h2></div><button className="button-secondary" onClick={() => setShowFavoriteEditor(true)} type="button">Edit favorites</button></div><RecipeGrid emptyText="Favorite a recipe to keep it here." favorites={favorites} onOpen={setSelectedRecipe} onRemove={toggleFavorite} onToggleFavorite={toggleFavorite} recipes={favorites} showFavoriteButton={false} /></section><a className="button recipes-more" href="/recommendations">Find more recipes</a>{showFavoriteEditor && <div className="modal-backdrop" onMouseDown={() => setShowFavoriteEditor(false)} role="presentation"><section aria-modal="true" className="search-modal favorite-editor" onMouseDown={(event) => event.stopPropagation()} role="dialog"><button className="modal-close" onClick={() => setShowFavoriteEditor(false)} type="button">×</button><p className="eyebrow">Your collection</p><h2>Edit favorites</h2>{favorites.length > 0 ? <div className="favorite-editor-list">{favorites.map((recipe) => <div key={recipe.id}><span>{recipe.title}</span><button className="button-secondary" onClick={() => toggleFavorite(recipe)} type="button">Remove</button></div>)}</div> : <p>No favorites yet.</p>}</section></div>}{showSearch && <div className="modal-backdrop" onMouseDown={() => setShowSearch(false)} role="presentation"><section aria-modal="true" className="search-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog"><button className="modal-close" onClick={() => setShowSearch(false)} type="button">×</button><h2>Search recipes with OpenAI</h2><form className="search-form" onSubmit={search}><input autoFocus onChange={(event) => setQuery(event.target.value)} placeholder="Try ramen, chicken curry, pasta…" value={query} /><button type="submit">Search</button></form>{isSearching ? <p>Searching…</p> : searchError ? <p className="search-error">{searchError}</p> : <RecipeGrid favorites={favorites} onOpen={setSelectedRecipe} onToggleFavorite={toggleFavorite} recipes={searchResults} />}</section></div>}{selectedRecipe && <div className="modal-backdrop" onMouseDown={() => setSelectedRecipe(null)} role="presentation"><section aria-modal="true" className="search-modal recipe-detail" onMouseDown={(event) => event.stopPropagation()} role="dialog"><button className="modal-close" onClick={() => setSelectedRecipe(null)} type="button">×</button><p className="eyebrow">{selectedRecipe.cuisine} · {selectedRecipe.prep_minutes} min</p><h2>{selectedRecipe.title}</h2><p>Key ingredients</p><ul>{selectedRecipe.key_ingredients.map((ingredient) => <li key={ingredient}>{ingredient}</li>)}</ul><button onClick={toggleSelectedRecipeFavorite} type="button">{favorites.some((item) => item.id === selectedRecipe.id) ? "Remove favorite" : "Add favorite"}</button></section></div>}</main>;
}

function RecipeGrid({ emptyText = "", favorites, onOpen, onReject, onRemove, onToggleFavorite, recipes, showFavoriteButton = true }: { emptyText?: string; favorites: Recipe[]; onOpen: (recipe: Recipe) => void; onReject?: (recipe: Recipe) => void; onRemove?: (recipe: Recipe) => void; onToggleFavorite: (recipe: Recipe) => void; recipes: Recipe[]; showFavoriteButton?: boolean }) {
  if (recipes.length === 0) return emptyText ? <p className="board-empty">{emptyText}</p> : null;
  return <div className="recipe-grid">{recipes.map((recipe) => <article className="recipe-card clickable-card" key={recipe.id} onClick={() => onOpen(recipe)}><div className="card-actions">{showFavoriteButton && <button aria-label={`Favorite ${recipe.title}`} className="card-heart" onClick={(event) => { event.stopPropagation(); onToggleFavorite(recipe); }} type="button">{favorites.some((item) => item.id === recipe.id) ? "♥" : "♡"}</button>}{onReject && <button aria-label={`Reject ${recipe.title}`} className="card-reject" onClick={(event) => { event.stopPropagation(); onReject(recipe); }} type="button">×</button>}{onRemove && <button aria-label={`Remove ${recipe.title} from favorites`} className="card-reject" onClick={(event) => { event.stopPropagation(); onRemove(recipe); }} type="button">×</button>}</div><div className="recipe-meta"><span>{recipe.cuisine}</span><span>{recipe.prep_minutes} min</span></div><h2>{recipe.title}</h2><p className="ingredients">{recipe.key_ingredients.slice(0, 4).join(" · ")}</p></article>)}</div>;
}
