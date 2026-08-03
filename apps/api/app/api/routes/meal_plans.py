from fastapi import APIRouter, HTTPException, status

from app.schemas.meal_plans import MealPlanRequest, MealPlanResponse
from app.services.meal_planner import MealPlanner

router = APIRouter(tags=["meal plans"])


@router.post("/meal-plans/generate", response_model=MealPlanResponse)
def generate_meal_plan(payload: MealPlanRequest) -> MealPlanResponse:
    try:
        return MealPlanner().generate(payload)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error
