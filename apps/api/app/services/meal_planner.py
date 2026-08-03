from collections.abc import Iterable

from app.schemas.meal_plans import MealPlanRequest, MealPlanResponse, PlanCandidate


class MealPlanner:
    """Builds a week from OpenAI recipes the person chose to try."""

    def generate(self, request: MealPlanRequest) -> MealPlanResponse:
        favorites = self._unique([recipe.model_copy(update={"source": "favorite"}) for recipe in request.favorite_recipes])
        new_recipes = self._unique([recipe.model_copy(update={"source": "new"}) for recipe in request.new_recommendations])
        if not favorites and not new_recipes:
            raise ValueError("Add favorites or swipe left on recipes you want to try before building a meal plan.")

        favorite_count = request.meals_per_week // 2
        new_count = request.meals_per_week - favorite_count
        chosen_favorites = self._choose(favorites, favorite_count, priorities=request.priorities)
        chosen_new = self._choose(new_recipes, new_count, chosen_favorites, request.priorities)
        selected = chosen_favorites + chosen_new
        if len(selected) < request.meals_per_week:
            selected += self._choose([*favorites, *new_recipes], request.meals_per_week - len(selected), selected, request.priorities)

        alternatives = [recipe for recipe in [*favorites, *new_recipes] if recipe.id not in {chosen.id for chosen in selected}]
        return MealPlanResponse(meals=selected, alternatives=self._rank(alternatives, selected, request.priorities))

    @staticmethod
    def _unique(candidates: list[PlanCandidate]) -> list[PlanCandidate]:
        seen: set[str] = set()
        return [recipe for recipe in candidates if not (recipe.id in seen or seen.add(recipe.id))]

    def _choose(self, candidates: Iterable[PlanCandidate], count: int, selected: list[PlanCandidate] | None = None, priorities: list[str] | None = None) -> list[PlanCandidate]:
        picked = list(selected or [])
        chosen: list[PlanCandidate] = []
        for recipe in self._rank(list(candidates), picked, priorities or []):
            if recipe.id in {item.id for item in picked}:
                continue
            chosen.append(recipe)
            picked.append(recipe)
            if len(chosen) == count:
                break
        return chosen

    def _rank(self, candidates: list[PlanCandidate], selected: list[PlanCandidate], priorities: list[str]) -> list[PlanCandidate]:
        existing_ingredients = {ingredient.lower() for recipe in selected for ingredient in recipe.key_ingredients}
        existing_proteins = {self._protein(recipe) for recipe in selected}

        def rank(recipe: PlanCandidate) -> tuple[object, ...]:
            scores = {
                "Fastest cooking": recipe.prep_minutes,
                "Maximum variety": int(self._protein(recipe) in existing_proteins),
                "Grocery waste": -len({item.lower() for item in recipe.key_ingredients} & existing_ingredients),
            }
            order = priorities or ["Fastest cooking", "Maximum variety", "Grocery waste"]
            return (*[scores.get(priority, 0) for priority in order], recipe.title)

        return sorted(candidates, key=rank)

    @staticmethod
    def _protein(recipe: PlanCandidate) -> str:
        text = " ".join([recipe.title, *recipe.key_ingredients]).lower()
        for protein in ("chicken", "pork", "beef", "tofu", "chickpea", "fish", "shrimp"):
            if protein in text:
                return protein
        return "other"
