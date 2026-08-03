from fastapi import APIRouter

from app.schemas.groceries import GroceryCategorizationRequest, GroceryCategorizationResponse
from app.services.groceries import GroceryCategorizationService

router = APIRouter(tags=["groceries"])


@router.post("/groceries/categorize", response_model=GroceryCategorizationResponse)
def categorize_groceries(payload: GroceryCategorizationRequest) -> GroceryCategorizationResponse:
    return GroceryCategorizationService().categorize(payload)
