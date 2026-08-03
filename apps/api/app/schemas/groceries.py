from pydantic import BaseModel, Field


class GroceryCategorizationRequest(BaseModel):
    ingredients: list[str] = Field(min_length=1, max_length=100)
    stores: list[str] = Field(min_length=1, max_length=10)


class GroceryAssignment(BaseModel):
    ingredient: str
    category: str
    store: str


class GroceryCategorizationResponse(BaseModel):
    assignments: list[GroceryAssignment]
