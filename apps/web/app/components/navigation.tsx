"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const profileStorageKey = "nextbite.food-profile";

export function Navigation() {
  const pathname = usePathname();
  const [hasProfile, setHasProfile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState<Record<string, unknown>>({});

  useEffect(() => {
    const storedProfile = window.localStorage.getItem(profileStorageKey);
    if (!storedProfile) return;
    try {
      setProfile(JSON.parse(storedProfile) as Record<string, unknown>);
      setHasProfile(true);
    } catch { window.localStorage.removeItem(profileStorageKey); }
  }, []);

  if (!hasProfile || pathname.startsWith("/onboarding")) return null;

  const preferenceRows = [
    ["Diet", listValue(profile.diets)], ["Allergies", textValue(profile.allergies)], ["Rotation", textValue(profile.favoriteMeals)], ["Cuisines", listValue(profile.cuisines)],
    ["Cooking", `${textValue(profile.skill)} · ${textValue(profile.maxPrepMinutes)} min`], ["Weekly plan", `${textValue(profile.mealsPerWeek)} dinners · ${textValue(profile.shoppingFrequency)}`],
    ["Priorities", listValue(profile.planningPriorities)], ["Stores", listValue(profile.stores)], ["Pantry", textValue(profile.pantryStaples)]
  ];

  return <nav aria-label="Main navigation" className="main-navigation">
    <div className="navigation-links"><Link href="/">Home</Link><Link href="/recipes">Recipes</Link><Link href="/groceries">Grocery List</Link></div>
    <button aria-expanded={isOpen} aria-label="Open profile preferences" className="profile-button" onClick={() => setIsOpen((open) => !open)} type="button">◉</button>
    {isOpen && <section aria-label="Profile preferences" className="profile-menu"><button aria-label="Close profile preferences" className="profile-menu-close" onClick={() => setIsOpen(false)} type="button">×</button><p className="eyebrow">Your profile</p><h2>Food preferences</h2><dl>{preferenceRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "Not set"}</dd></div>)}</dl><Link className="button" href="/onboarding" onClick={() => setIsOpen(false)}>Edit preferences</Link></section>}
  </nav>;
}

function textValue(value: unknown) { return typeof value === "string" ? value : ""; }
function listValue(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").join(", ") : ""; }
