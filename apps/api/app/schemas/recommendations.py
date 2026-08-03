from pydantic import BaseModel, Field


class RecommendationRequest(BaseModel):
    diets: list[str] = Field(default_factory=list)
    allergies: str = ""
    favorite_meals: str = ""
    wish_list_meals: str = ""
    cuisines: list[str] = Field(default_factory=list)
    skill: str = "Comfortable"
    max_prep_minutes: str = "30"
    meals_per_week: str = "5"
    shopping_frequency: str = "Once a week"
    excluded_recipes: list[str] = Field(default_factory=list)


class RecipeRecommendation(BaseModel):
    id: str
    title: str
    cuisine: str
    prep_minutes: int = Field(ge=1, le=30)
    difficulty: str
    description: str
    key_ingredients: list[str] = Field(min_length=2, max_length=8)
    why_it_matches: str


class RecommendationResponse(BaseModel):
    recommendations: list[RecipeRecommendation] = Field(min_length=10, max_length=10)
