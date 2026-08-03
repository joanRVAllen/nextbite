from pydantic import BaseModel, Field


class RecipeCard(BaseModel):
    id: str
    title: str
    cuisine: str
    prep_minutes: int
    key_ingredients: list[str]
    source: str = "search"


class RecipeSearchResponse(BaseModel):
    recipes: list[RecipeCard] = Field(min_length=5, max_length=5)
