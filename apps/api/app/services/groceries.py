from fastapi import HTTPException
from openai import APIError, OpenAI

from app.core.config import Settings, get_settings
from app.schemas.groceries import GroceryCategorizationRequest, GroceryCategorizationResponse


class GroceryCategorizationService:
    """Assigns meal-plan ingredients to the user's stores and grocery aisles."""

    def __init__(self, settings: Settings | None = None, client: OpenAI | None = None) -> None:
        self.settings = settings or get_settings()
        self.client = client

    def categorize(self, request: GroceryCategorizationRequest) -> GroceryCategorizationResponse:
        if not self.settings.openai_api_key:
            raise HTTPException(status_code=503, detail="Grocery categorization is unavailable. Add OPENAI_API_KEY to apps/api/.env and restart the API server.")

        client = self.client or OpenAI(api_key=self.settings.openai_api_key)
        try:
            response = client.responses.parse(
                model=self.settings.openai_model,
                instructions=(
                    "You organize grocery lists. Assign every supplied ingredient to exactly one supplied store and one category. "
                    "Use only these categories: Produce, Meat & protein, Dairy, Bakery, Frozen, Pantry, Other. "
                    "Do not change ingredient names, invent ingredients, or invent stores. When store availability is uncertain, distribute items sensibly across the supplied stores."
                ),
                input=f"Preferred stores: {', '.join(request.stores)}\nIngredients: {', '.join(request.ingredients)}",
                text_format=GroceryCategorizationResponse,
            )
        except APIError as error:
            raise HTTPException(status_code=502, detail="OpenAI could not categorize groceries right now. Please try again.") from error

        result = response.output_parsed
        if result is None or {item.ingredient for item in result.assignments} != set(request.ingredients) or len(result.assignments) != len(request.ingredients):
            raise HTTPException(status_code=502, detail="OpenAI returned an incomplete grocery list. Please try again.")
        if any(item.store not in request.stores for item in result.assignments):
            raise HTTPException(status_code=502, detail="OpenAI returned a grocery store outside your preferences. Please try again.")
        return result
