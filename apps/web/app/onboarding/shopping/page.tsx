"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { storageKey, storeOptions, toggleValue, type ShoppingProfile } from "../profile";

const emptyShoppingProfile: ShoppingProfile = { stores: [], pantryStaples: "" };
const favoritesStorageKey = "nextbite.favorite-recipes";

export default function ShoppingPage() {
  const [profile, setProfile] = useState<ShoppingProfile>(emptyShoppingProfile);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Partial<ShoppingProfile>;
      setProfile({
        stores: Array.isArray(parsed.stores) ? parsed.stores : [],
        pantryStaples: typeof parsed.pantryStaples === "string" ? parsed.pantryStaples : ""
      });
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, []);

  function finish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const current = JSON.parse(window.localStorage.getItem(storageKey) ?? "{}") as Record<string, unknown>;
    window.localStorage.setItem(storageKey, JSON.stringify({ ...current, ...profile }));
    const favoriteMeals = typeof current.favoriteMeals === "string" ? current.favoriteMeals.split(",").map((meal) => meal.trim()).filter(Boolean) : [];
    const storedFavorites = JSON.parse(window.localStorage.getItem(favoritesStorageKey) ?? "[]") as Array<{ id: string; title: string }>;
    const rotationFavorites = favoriteMeals.map((title) => ({ id: `rotation-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, title, cuisine: "Your rotation", prep_minutes: 30, key_ingredients: [], source: "favorite" }));
    const mergedFavorites = [...storedFavorites];
    rotationFavorites.forEach((recipe) => { if (!mergedFavorites.some((favorite) => favorite.title.toLowerCase() === recipe.title.toLowerCase())) mergedFavorites.push(recipe); });
    window.localStorage.setItem(favoritesStorageKey, JSON.stringify(mergedFavorites));
    setIsComplete(true);
  }

  if (isComplete) return <main className="onboarding-shell"><Link className="brand" href="/">NextBite</Link><section className="onboarding-card complete-card"><p className="eyebrow">Profile complete</p><h1>Your kitchen, understood.</h1><p className="lede">Your food profile has been saved on this device. Let’s find your first ten dinner ideas.</p><Link className="button" href="/recommendations">Get recommendations</Link></section></main>;

  return (
    <main className="onboarding-shell">
      <Link className="brand" href="/">NextBite</Link>
      <section className="onboarding-card" aria-labelledby="shopping-title">
        <div className="progress-label"><span>Step 6 of 6</span><span>Shopping routine</span></div>
        <div className="progress-track"><div className="progress-fill" style={{ width: "100%" }} /></div>
        <form onSubmit={finish}>
          <p className="eyebrow">Shopping routine</p>
          <h1 id="shopping-title">Where do you usually shop?</h1>
          <fieldset>
            <legend>Preferred grocery stores</legend>
            <p className="field-help">We’ll organize your future grocery list around these.</p>
            <div className="option-grid">
              {storeOptions.map((store) => <label className={`choice ${profile.stores.includes(store) ? "choice-selected" : ""}`} key={store}><input checked={profile.stores.includes(store)} onChange={() => setProfile((current) => ({ ...current, stores: toggleValue(current.stores, store) }))} type="checkbox" /><span>{store}</span></label>)}
            </div>
          </fieldset>
          <label className="text-field"><span>Pantry staples (optional)</span><textarea onChange={(event) => setProfile((current) => ({ ...current, pantryStaples: event.target.value }))} placeholder="Olive oil, rice, soy sauce, garlic…" rows={3} value={profile.pantryStaples} /></label>
          <div className="form-footer"><Link className="button button-secondary" href="/onboarding?step=5">Back</Link><button type="submit">Finish profile</button></div>
        </form>
      </section>
    </main>
  );
}
