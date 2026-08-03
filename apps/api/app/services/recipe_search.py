from uuid import uuid4

from fastapi import HTTPException
from openai import APIError, OpenAI

from app.core.config import Settings, get_settings
from app.schemas.recipes import RecipeSearchResponse


class RecipeSearchService:
    """Finds recipe ideas from a search phrase using OpenAI."""

    def __init__(self, settings: Settings | None = None, client: OpenAI | None = None) -> None:
        self.settings = settings or get_settings()
        self.client = client

    def search(self, query: str) -> RecipeSearchResponse:
        if not self.settings.openai_api_key:
            raise HTTPException(status_code=503, detail="Recipe search is unavailable. Add OPENAI_API_KEY to apps/api/.env and restart the API server.")
        client = self.client or OpenAI(api_key=self.settings.openai_api_key)
        try:
            response = client.responses.parse(
                model=self.settings.openai_model,
                instructions=(
                    "You suggest recipe ideas. Return exactly five practical recipe names that closely match the user's search term. "
                    "For each, include a plausible cuisine, weeknight prep time, and 2-8 key ingredients. Do not claim they come from a recipe database."
                ),
                input=f"Search term: {query}",
                text_format=RecipeSearchResponse,
            )
        except APIError as error:
            raise HTTPException(status_code=502, detail="OpenAI could not search recipes right now. Please try again.") from error

        if response.output_parsed is None:
            raise HTTPException(status_code=502, detail="OpenAI returned an incomplete recipe search. Please try again.")
        return RecipeSearchResponse(recipes=[recipe.model_copy(update={"id": f"openai-search-{uuid4().hex}", "source": "search"}) for recipe in response.output_parsed.recipes])
