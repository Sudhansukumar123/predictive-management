from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.api.deps import get_operator_user
from app.services.chat_agent import get_chat_response

router = APIRouter()

class ChatQuery(BaseModel):
    query: str

@router.post("/", status_code=status.HTTP_200_OK)
def chat_with_agent(
    payload: ChatQuery, 
    db: Session = Depends(get_db), 
    current_user=Depends(get_operator_user)
):
    """
    Routes operational queries regarding machines, telemetry, active alerts,
    and inventory restocking recommendations to the AI chatbot assistant.
    """
    if not payload.query or payload.query.strip() == "":
        raise HTTPException(status_code=400, detail="Query cannot be empty")
        
    try:
        response_text = get_chat_response(payload.query, db)
        return {"response": response_text}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat agent error: {e}"
        )
