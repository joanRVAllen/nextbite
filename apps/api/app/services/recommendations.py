from fastapi import HTTPException
from openai import APIError, OpenAI
from uuid import uuid4

from app.core.config import Settings, get_settings
from app.schemas.recommendations import RecommendationRequest, RecommendationResponse


class RecommendationService:
    """Generates tailored weeknight recipe ideas with OpenAI."""

    def __init__(self, settings: Settings | None = None, client: OpenAI | None = None) -> None:
        self.settings = settings or get_settings()
        self.client = client

    def generate(self, profile: RecommendationRequest) -> RecommendationResponse:
        if not self.settings.openai_api_key:
            raise HTTPException(
                status_code=503,
                detail="Recipe recommendations are unavailable. Add OPENAI_API_KEY to apps/api/.env and restart the API server.",
            )

        client = self.client or OpenAI(api_key=self.settings.openai_api_key)
        try:
            response = client.responses.parse(
                model=self.settings.openai_model,
                instructions=(
                    "You are NextBite's dinner recommendation assistant. Create practical, distinct weeknight dinners. "
                    "Respect allergies and dietary needs. Do not claim recipes are authentic or medically suitable. "
                    "Return exactly ten recipe recommendations that meet the supplied response schema. Include a complete, practical ingredient list with purchase quantities for two servings and 3-7 clear cooking steps for every recipe."
                ),
                input=self._profile_prompt(profile),
                text_format=RecommendationResponse,
            )
        except APIError as error:
            raise HTTPException(status_code=502, detail="OpenAI could not generate recipes right now. Please try again.") from error

        if response.output_parsed is None:
            raise HTTPException(status_code=502, detail="OpenAI returned an incomplete recipe response. Please try again.")
        return RecommendationResponse(
            recommendations=[
                recipe.model_copy(update={"id": f"openai-{uuid4().hex}"})
                for recipe in response.output_parsed.recommendations
            ]
        )

    @staticmethod
    def _profile_prompt(profile: RecommendationRequest) -> str:
        return f"""Build recommendations for this food profile:
- Dietary needs: {', '.join(profile.diets) or 'No specific diet'}
- Allergies or ingredients to avoid: {profile.allergies or 'None provided'}
- Favorite meals / existing rotation: {profile.favorite_meals or 'None provided'}
- Foods they want to try: {profile.wish_list_meals or 'None provided'}
- Favorite cuisines: {', '.join(profile.cuisines) or 'No preference'}
- Cooking confidence: {profile.skill}
- Maximum prep time: {profile.max_prep_minutes} minutes
- Dinners per week: {profile.meals_per_week}
- Shopping rhythm: {profile.shopping_frequency}
- Recipes already shown (do not repeat these): {', '.join(profile.excluded_recipes) or 'None'}

Favor recipes that are varied in cuisine and main protein, feasible within the prep-time limit, and suitable for a practical weeknight meal plan."""
