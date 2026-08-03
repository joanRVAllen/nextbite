"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { storageKey, storeOptions, toggleValue, type ShoppingProfile } from "./profile";

const dietaryOptions = ["No specific diet", "Vegetarian", "Vegan", "Pescatarian", "Gluten-free", "Dairy-free", "Low carb"] as const;
const cuisineOptions = ["Mexican", "Italian", "Thai", "Japanese", "Mediterranean", "Indian", "Korean", "American"] as const;
const priorityOptions = ["Fastest cooking", "Maximum variety", "Grocery waste"] as const;
type DietaryOption = (typeof dietaryOptions)[number];
type CuisineOption = (typeof cuisineOptions)[number];
type PlanningPriority = (typeof priorityOptions)[number];

interface FoodProfile extends ShoppingProfile {
  diets: DietaryOption[];
  allergies: string;
  avoidCrossContact: boolean;
  favoriteMeals: string;
  wishListMeals: string;
  cuisines: CuisineOption[];
  skill: "Beginner" | "Comfortable" | "Confident" | "Advanced";
  maxPrepMinutes: "20" | "30" | "45" | "60+";
  mealsPerWeek: "3" | "4" | "5" | "6" | "7";
  shoppingFrequency: "Once a week" | "Twice a week" | "As needed";
  planningPriorities: PlanningPriority[];
}

const initialProfile: FoodProfile = {
  diets: ["No specific diet"], allergies: "", avoidCrossContact: false, favoriteMeals: "", wishListMeals: "", cuisines: [],
  skill: "Comfortable", maxPrepMinutes: "30", mealsPerWeek: "5", shoppingFrequency: "Once a week", planningPriorities: ["Fastest cooking", "Maximum variety", "Grocery waste"], stores: [], pantryStaples: ""
};
export default function OnboardingPage() {
  const [profile, setProfile] = useState<FoodProfile>(initialProfile);
  const [step, setStep] = useState(1);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      try { setProfile({ ...initialProfile, ...(JSON.parse(saved) as Partial<FoodProfile>) }); } catch { window.localStorage.removeItem(storageKey); }
    }

    const requestedStep = Number(new URLSearchParams(window.location.search).get("step"));
    if (Number.isInteger(requestedStep) && requestedStep >= 1 && requestedStep <= 6) {
      setStep(requestedStep);
    }
  }, []);

  function save(nextStep: number) {
    window.localStorage.setItem(storageKey, JSON.stringify(profile));
    if (nextStep === 6) {
      window.location.assign("/onboarding/shopping");
      return;
    }
    setStep(nextStep);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.localStorage.setItem(storageKey, JSON.stringify(profile));
    setIsComplete(true);
  }

  function selectDiet(diet: DietaryOption) {
    setProfile((current) => ({ ...current, diets: diet === "No specific diet" ? [diet] : (() => {
      const selected = toggleValue(current.diets.filter((item) => item !== "No specific diet"), diet);
      return selected.length > 0 ? selected : ["No specific diet"];
    })() }));
  }

  function updatePriority(position: number, nextPriority: PlanningPriority) {
    setProfile((current) => {
      const priorities = [...current.planningPriorities];
      const existingPosition = priorities.indexOf(nextPriority);
      [priorities[position], priorities[existingPosition]] = [priorities[existingPosition], priorities[position]];
      return { ...current, planningPriorities: priorities };
    });
  }

  const progress = `${Math.round((step / 6) * 100)}%`;
  const stepTitle = ["Dietary needs", "Your favorites", "Discover more", "Cooking style", "Weekly rhythm", "Shopping routine"][step - 1];

  if (isComplete) return (
    <main className="onboarding-shell">
      <Link className="brand" href="/">NextBite</Link>
      <section className="onboarding-card complete-card">
        <p className="eyebrow">Profile complete</p><h1>Your kitchen, understood.</h1>
        <p className="lede">Your food profile has been saved on this device. NextBite is ready to use it for recommendations.</p>
        <Link className="button" href="/">Back to NextBite</Link>
      </section>
    </main>
  );

  return (
    <main className="onboarding-shell">
      <Link className="brand" href="/">NextBite</Link>
      <section className="onboarding-card" aria-labelledby="onboarding-title">
        <div className="progress-label"><span>Step {step} of 6</span><span>{stepTitle}</span></div>
        <div aria-label={`${progress} complete`} className="progress-track"><div className="progress-fill" style={{ width: progress }} /></div>
        <form onSubmit={submit}>
          {step === 1 && <>
            <p className="eyebrow">Your food profile</p><h1 id="onboarding-title">Let’s make every recommendation safe and delicious.</h1><p className="lede">Choose all dietary preferences that apply to you.</p>
            <div className="option-grid">{dietaryOptions.map((diet) => <label className={`choice ${profile.diets.includes(diet) ? "choice-selected" : ""}`} key={diet}><input checked={profile.diets.includes(diet)} onChange={() => selectDiet(diet)} type="checkbox" /><span>{diet}</span></label>)}</div>
            <TextArea label="Allergies or ingredients to avoid" onChange={(allergies) => setProfile((current) => ({ ...current, allergies }))} placeholder="Peanuts, shellfish, cilantro…" value={profile.allergies} />
            <label className="switch-row"><input checked={profile.avoidCrossContact} onChange={(event) => setProfile((current) => ({ ...current, avoidCrossContact: event.target.checked }))} type="checkbox" /><span><strong>Avoid cross-contact</strong><small>Flag recipes that may be prepared near allergens.</small></span></label>
          </>}
          {step === 2 && <><p className="eyebrow">Your favorites</p><h1 id="onboarding-title">What is already in your rotation?</h1><p className="lede">A few familiar meals help us find the right starting point.</p><TextArea label="Favorite meals" onChange={(favoriteMeals) => setProfile((current) => ({ ...current, favoriteMeals }))} placeholder="Tacos, chicken noodle soup, pasta primavera…" value={profile.favoriteMeals} /></>}
          {step === 3 && <><p className="eyebrow">Discover more</p><h1 id="onboarding-title">What sounds exciting right now?</h1><TextArea label="Meals you wish you cooked more often" onChange={(wishListMeals) => setProfile((current) => ({ ...current, wishListMeals }))} placeholder="More seafood, homemade ramen, quick curries…" value={profile.wishListMeals} /><fieldset><legend>Favorite cuisines</legend><p className="field-help">Choose as many as you like.</p><div className="option-grid">{cuisineOptions.map((cuisine) => <label className={`choice ${profile.cuisines.includes(cuisine) ? "choice-selected" : ""}`} key={cuisine}><input checked={profile.cuisines.includes(cuisine)} onChange={() => setProfile((current) => ({ ...current, cuisines: toggleValue(current.cuisines, cuisine) }))} type="checkbox" /><span>{cuisine}</span></label>)}</div></fieldset></>}
          {step === 4 && <><p className="eyebrow">Cooking style</p><h1 id="onboarding-title">How does cooking fit into your day?</h1><ChoiceGroup label="Cooking confidence" onChange={(skill) => setProfile((current) => ({ ...current, skill: skill as FoodProfile["skill"] }))} options={["Beginner", "Comfortable", "Confident", "Advanced"]} value={profile.skill} /><ChoiceGroup label="Maximum preferred prep time" onChange={(maxPrepMinutes) => setProfile((current) => ({ ...current, maxPrepMinutes: maxPrepMinutes as FoodProfile["maxPrepMinutes"] }))} options={["20", "30", "45", "60+"]} suffix=" minutes" value={profile.maxPrepMinutes} /></>}
          {step === 5 && <><p className="eyebrow">Weekly rhythm</p><h1 id="onboarding-title">How much planning would help?</h1><ChoiceGroup label="Dinners to plan per week" onChange={(mealsPerWeek) => setProfile((current) => ({ ...current, mealsPerWeek: mealsPerWeek as FoodProfile["mealsPerWeek"] }))} options={["3", "4", "5", "6", "7"]} suffix=" dinners" value={profile.mealsPerWeek} /><ChoiceGroup label="Shopping frequency" onChange={(shoppingFrequency) => setProfile((current) => ({ ...current, shoppingFrequency: shoppingFrequency as FoodProfile["shoppingFrequency"] }))} options={["Once a week", "Twice a week", "As needed"]} value={profile.shoppingFrequency} /><fieldset className="priority-group"><legend>Rank your planning priorities</legend><p className="field-help">We’ll use this order when choosing meals for your weekly plan.</p>{profile.planningPriorities.map((priority, index) => <label className="priority-row" key={priority}><span>{index + 1}</span><select aria-label={`Priority ${index + 1}`} onChange={(event) => updatePriority(index, event.target.value as PlanningPriority)} value={priority}>{priorityOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>)}</fieldset></>}
          {step === 6 && <><p className="eyebrow">Shopping routine</p><h1 id="onboarding-title">Where do you usually shop?</h1><fieldset><legend>Preferred grocery stores</legend><p className="field-help">We’ll organize your future grocery list around these.</p><div className="option-grid">{storeOptions.map((store) => <label className={`choice ${profile.stores.includes(store) ? "choice-selected" : ""}`} key={store}><input checked={profile.stores.includes(store)} onChange={() => setProfile((current) => ({ ...current, stores: toggleValue(current.stores, store) }))} type="checkbox" /><span>{store}</span></label>)}</div></fieldset><TextArea label="Pantry staples (optional)" onChange={(pantryStaples) => setProfile((current) => ({ ...current, pantryStaples }))} placeholder="Olive oil, rice, soy sauce, garlic…" value={profile.pantryStaples} /></>}
          <div className="form-footer">{step > 1 ? <button className="button-secondary" onClick={() => save(step - 1)} type="button">Back</button> : <span />}{step < 6 ? <button onClick={() => save(step + 1)} type="button">Save and continue</button> : <button type="submit">Finish profile</button>}</div>
        </form>
      </section>
    </main>
  );
}

function TextArea({ label, onChange, placeholder, value }: { label: string; onChange: (value: string) => void; placeholder: string; value: string }) {
  return <label className="text-field"><span>{label}</span><textarea onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={3} value={value} /></label>;
}

function ChoiceGroup({ label, onChange, options, suffix = "", value }: { label: string; onChange: (value: string) => void; options: readonly string[]; suffix?: string; value: string }) {
  return <fieldset className="choice-group"><legend>{label}</legend><div className="option-grid">{options.map((option) => <label className={`choice ${value === option ? "choice-selected" : ""}`} key={option}><input checked={value === option} name={label} onChange={() => onChange(option)} type="radio" /><span>{option}{suffix}</span></label>)}</div></fieldset>;
}
