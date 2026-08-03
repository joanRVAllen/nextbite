export const storeOptions = ["Walmart", "Costco", "Asian Market", "Whole Foods", "Trader Joe's", "Other"] as const;

export type StoreOption = (typeof storeOptions)[number];

export interface ShoppingProfile {
  stores: StoreOption[];
  pantryStaples: string;
}

export interface RecommendationProfile {
  diets?: string[];
  allergies?: string;
  favoriteMeals?: string;
  wishListMeals?: string;
  cuisines?: string[];
  skill?: string;
  maxPrepMinutes?: string;
  mealsPerWeek?: string;
  shoppingFrequency?: string;
}

export const storageKey = "nextbite.food-profile";

export function recommendationPayload(profile: RecommendationProfile, favoriteTitles: string[] = []) {
  return {
    diets: profile.diets ?? [],
    allergies: profile.allergies ?? "",
    favorite_meals: [profile.favoriteMeals, ...favoriteTitles].filter(Boolean).join(", "),
    wish_list_meals: profile.wishListMeals ?? "",
    cuisines: profile.cuisines ?? [],
    skill: profile.skill ?? "Comfortable",
    max_prep_minutes: profile.maxPrepMinutes ?? "30",
    meals_per_week: profile.mealsPerWeek ?? "5",
    shopping_frequency: profile.shoppingFrequency ?? "Once a week",
  };
}

export function toggleValue<T extends string>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}
