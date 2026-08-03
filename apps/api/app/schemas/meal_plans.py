from pydantic import BaseModel, Field
from app.schemas.recommendations import RecipeIngredient


class PlanCandidate(BaseModel):
    id: str
    title: str
    cuisine: str
    prep_minutes: int = Field(ge=1)
    key_ingredients: list[str]
    source: str
    ingredients: list[RecipeIngredient] = Field(default_factory=list)
    instructions: list[str] = Field(default_factory=list)


class MealPlanRequest(BaseModel):
    favorite_meals: str
    meals_per_week: int = Field(ge=1, le=7)
    priorities: list[str] = Field(default_factory=lambda: ["Fastest cooking", "Maximum variety", "Grocery waste"])
    favorite_recipes: list[PlanCandidate] = Field(default_factory=list)
    new_recommendations: list[PlanCandidate] = Field(default_factory=list)


class MealPlanResponse(BaseModel):
    meals: list[PlanCandidate]
    alternatives: list[PlanCandidate]
