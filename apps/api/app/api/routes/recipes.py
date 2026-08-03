from fastapi import APIRouter, Query

from app.schemas.recipes import RecipeSearchResponse
from app.services.recipe_search import RecipeSearchService

router = APIRouter(tags=["recipes"])


@router.get("/recipes/search", response_model=RecipeSearchResponse)
def search_recipes(query: str = Query(min_length=2, max_length=100)) -> RecipeSearchResponse:
    return RecipeSearchService().search(query)
