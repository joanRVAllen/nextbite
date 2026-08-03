"use client";

import Link from "next/link";
import { DragEvent, useEffect, useState } from "react";
import { LoadingSpinner } from "../components/loading-spinner";

interface RecipeIngredient { name: string; quantity: string }
interface Recipe { id: string; title: string; key_ingredients: string[]; ingredients?: RecipeIngredient[] }
interface MealPlan { meals: Recipe[] }
interface GroceryItem { id: string; name: string; category: string; store: string; checked: boolean }
const planStorageKey = "nextbite.active-meal-plan";
const groceryStorageKey = "nextbite.grocery-items";
const fallbackStores = ["Walmart", "Costco", "Asian Market"];
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function GroceriesPage() {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [mealDetails, setMealDetails] = useState<Recipe[]>([]);
  const [stores, setStores] = useState<string[]>(fallbackStores);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [copyStatus, setCopyStatus] = useState("");

  useEffect(() => {
    const rawPlan = window.localStorage.getItem(planStorageKey);
    if (!rawPlan) { setError("Build a weekly plan before generating groceries."); setIsLoading(false); return; }
    const rawProfile = window.localStorage.getItem("nextbite.food-profile");
    const profile = rawProfile ? JSON.parse(rawProfile) as { stores?: string[] } : {};
    const selectedStores = profile.stores?.filter((store) => store !== "Other") ?? [];
    const availableStores = selectedStores.length > 0 ? selectedStores : fallbackStores;
    setStores(availableStores);
    const plan = JSON.parse(rawPlan) as MealPlan;
    setMealDetails(plan.meals);
    const savedItems = window.localStorage.getItem(groceryStorageKey);
    if (savedItems) { try { setItems(JSON.parse(savedItems) as GroceryItem[]); setIsLoading(false); return; } catch { window.localStorage.removeItem(groceryStorageKey); } }
    const uniqueIngredients = [...new Set(plan.meals.flatMap((meal) => (meal.ingredients?.length ? meal.ingredients.map((ingredient) => ingredient.name) : meal.key_ingredients).map((ingredient) => ingredient.trim()).filter(Boolean)))];
    if (uniqueIngredients.length === 0) { setError("Your selected recipes do not have ingredients to sort yet."); setIsLoading(false); return; }
    void fetch(`${apiUrl}/api/groceries/categorize`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ingredients: uniqueIngredients, stores: availableStores }),
    }).then(async (response) => {
      const data = await response.json() as { assignments?: Array<{ ingredient: string; category: string; store: string }>; detail?: string };
      if (!response.ok || !data.assignments) throw new Error(data.detail ?? "Could not categorize your groceries.");
      const generatedItems = data.assignments.map(({ ingredient, category, store }) => ({ id: ingredient.toLowerCase().replaceAll(" ", "-"), name: ingredient, category, store, checked: false }));
      window.localStorage.setItem(groceryStorageKey, JSON.stringify(generatedItems));
      setItems(generatedItems);
    }).catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : "Could not categorize your groceries.")).finally(() => setIsLoading(false));
  }, []);

  function moveItem(event: DragEvent<HTMLElement>, store: string) {
    event.preventDefault();
    const itemId = event.dataTransfer.getData("text/plain");
    setItems((current) => {
      const next = current.map((item) => item.id === itemId ? { ...item, store } : item);
      window.localStorage.setItem(groceryStorageKey, JSON.stringify(next));
      return next;
    });
  }

  function toggleItem(itemId: string) {
    setItems((current) => {
      const next = current.map((item) => item.id === itemId ? { ...item, checked: !item.checked } : item);
      window.localStorage.setItem(groceryStorageKey, JSON.stringify(next));
      return next;
    });
  }

  async function copyIngredients() {
    const storesWithItems = [...new Set([...stores, ...items.map((item) => item.store)])];
    const list = storesWithItems
      .map((store) => ({ store, items: items.filter((item) => item.store === store) }))
      .filter((group) => group.items.length > 0)
      .map((group) => `${group.store}\n${group.items.map((item) => `- ${item.name}`).join("\n")}`)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(list);
      setCopyStatus(`${items.length} ingredients copied.`);
    } catch {
      setCopyStatus("Could not copy ingredients. Please try again.");
    }
  }

  return <main><Link className="brand" href="/">NextBite</Link><section className="recommendation-header"><p className="eyebrow">Shopping list</p><h1>Groceries, sorted your way.</h1><p className="lede">Review each meal’s quantities, then use the combined list below to shop.</p><button onClick={() => void copyIngredients()} type="button">Copy ingredients</button><p aria-live="polite" className="copy-status">{copyStatus}</p></section>{error ? <section className="error-card"><p>{error}</p><Link className="button" href="/plan">Build a plan</Link></section> : isLoading ? <LoadingSpinner label="Sorting your grocery list…" /> : <><section className="meal-ingredient-list"><h2>Ingredients by meal</h2>{mealDetails.map((meal) => <article className="recipe-card" key={meal.id}><h3>{meal.title}</h3><ul>{(meal.ingredients?.length ? meal.ingredients : meal.key_ingredients.map((name) => ({ name, quantity: "Amount not available" }))).map((ingredient) => <li key={ingredient.name}>{ingredient.quantity} {ingredient.name}</li>)}</ul></article>)}</section><section className="combined-groceries"><h2>Combined grocery list</h2><div className="grocery-board">{stores.map((store) => <section className="store-column" key={store} onDragOver={(event) => event.preventDefault()} onDrop={(event) => moveItem(event, store)}><h2>{store}</h2>{["Produce", "Meat & protein", "Dairy", "Bakery", "Frozen", "Pantry", "Other"].map((category) => { const categoryItems = items.filter((item) => item.store === store && item.category === category); return categoryItems.length > 0 ? <div className="grocery-category" key={category}><h3>{category}</h3>{categoryItems.map((item) => <label className={`grocery-item ${item.checked ? "grocery-item-checked" : ""}`} draggable key={item.id} onDragStart={(event) => event.dataTransfer.setData("text/plain", item.id)}><input checked={item.checked} onChange={() => toggleItem(item.id)} type="checkbox" />{item.name}</label>)}</div> : null; })}</section>)}</div></section></>}</main>;
}
