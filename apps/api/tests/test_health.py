from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import app
from app.schemas.recommendations import RecipeRecommendation, RecommendationRequest, RecommendationResponse
from app.services import recommendations
from app.schemas.groceries import GroceryCategorizationRequest, GroceryCategorizationResponse
from app.services.groceries import GroceryCategorizationService
from app.services.recommendations import RecommendationService


def test_health_check_returns_service_status() -> None:
    response = TestClient(app).get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "nextbite-api"}


def test_recommendations_require_an_openai_key(monkeypatch) -> None:
    monkeypatch.setattr(recommendations, "get_settings", lambda: Settings(openai_api_key=""))
    response = TestClient(app).post("/api/recommendations", json={})

    assert response.status_code == 503


def test_recommendations_use_openai_structured_output() -> None:
    recipes = [
        RecipeRecommendation(
            id=f"recipe-{number}", title=f"Recipe {number}", cuisine="Thai", prep_minutes=20,
            difficulty="Comfortable", description="A practical dinner.", key_ingredients=["Tofu", "Rice"],
            why_it_matches="It fits the profile.",
        )
        for number in range(10)
    ]

    class FakeResponses:
        def parse(self, **kwargs):
            assert kwargs["model"] == "gpt-4o"
            assert kwargs["text_format"] is RecommendationResponse
            return type("Response", (), {"output_parsed": RecommendationResponse(recommendations=recipes)})()

    service = RecommendationService(
        settings=Settings(openai_api_key="test-key"),
        client=type("FakeClient", (), {"responses": FakeResponses()})(),
    )

    result = service.generate(RecommendationRequest(favorite_meals="katsu", cuisines=["Japanese"]))

    assert len(result.recommendations) == 10
    assert len({recipe.id for recipe in result.recommendations}) == 10


def test_groceries_use_openai_structured_output() -> None:
    class FakeResponses:
        def parse(self, **kwargs):
            assert kwargs["text_format"] is GroceryCategorizationResponse
            return type("Response", (), {"output_parsed": GroceryCategorizationResponse.model_validate({"assignments": [
                {"ingredient": "Tofu", "category": "Meat & protein", "store": "Asian Market"},
                {"ingredient": "Spinach", "category": "Produce", "store": "Walmart"},
            ]})})()

    service = GroceryCategorizationService(
        settings=Settings(openai_api_key="test-key"),
        client=type("FakeClient", (), {"responses": FakeResponses()})(),
    )
    result = service.categorize(GroceryCategorizationRequest(ingredients=["Tofu", "Spinach"], stores=["Walmart", "Asian Market"]))

    assert [item.store for item in result.assignments] == ["Asian Market", "Walmart"]


def test_meal_plan_balances_favorites_and_openai_recipes_without_spoonacular() -> None:
    response = TestClient(app).post("/api/meal-plans/generate", json={
        "favorite_meals": "",
        "meals_per_week": 5,
        "favorite_recipes": [{"id": f"favorite-{index}", "title": f"Favorite {index}", "cuisine": "Italian", "prep_minutes": 20, "key_ingredients": ["Pasta"], "source": "favorite"} for index in range(3)],
        "new_recommendations": [{"id": f"openai-{index}", "title": f"OpenAI dinner {index}", "cuisine": "Thai", "prep_minutes": 20, "key_ingredients": ["Tofu", "Rice"], "source": "new"} for index in range(4)],
    })

    assert response.status_code == 200
    meals = response.json()["meals"]
    assert len(meals) == 5
    assert sum(meal["source"] == "favorite" for meal in meals) == 2
    assert sum(meal["source"] == "new" for meal in meals) == 3
