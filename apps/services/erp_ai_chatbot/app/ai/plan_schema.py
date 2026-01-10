from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional

class PlanStep(BaseModel):
    id: str
    tool: str
    args: Dict[str, Any]
    save_as: Optional[str] = None

class Plan(BaseModel):
    module: str
    intent: str
    needs_clarification: bool = False
    clarifying_question: Optional[str] = None
    steps: List[PlanStep] = Field(default_factory=list)
    final_response_template: Optional[str] = None
