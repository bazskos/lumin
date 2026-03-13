from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.api import deps
from app.models.note import Note
from app.models.chat import ChatMessage
from app.services import ai_generator

router = APIRouter()

@router.post("/{type}")
async def generate_ai_content(
    type: str,
    payload: dict = Body(...),
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user),
):
    note_id = payload.get("note_id")
    note = db.query(Note).filter(Note.id == note_id, Note.owner_id == current_user.id).first()
    
    if not note:
        raise HTTPException(status_code=404, detail="Jegyzet nem található")

    # =================================================================
    # CACHING
    # =================================================================
    if type == "summary" and note.generated_summary:
        return {"result": note.generated_summary}
    elif type == "flashcards" and note.generated_flashcards:
        return {"result": note.generated_flashcards}
    elif type == "completion" and note.generated_completion:
        return {"result": note.generated_completion}
    elif type == "quiz" and note.generated_quiz:
        return {"result": note.generated_quiz}

    full_text = f"Title: {note.title}\n\n{note.content}"
    result = await ai_generator.generate_from_content(type, full_text, note.style)
    
    # =================================================================
    # Tokenek megspórolása
    # =================================================================
    if type == "summary":
        note.generated_summary = result
    elif type == "flashcards":
        note.generated_flashcards = result
    elif type == "completion":
        note.generated_completion = result
    elif type == "quiz":
        note.generated_quiz = result
        
    db.commit()
    
    return {"result": result}

@router.post("/completion/generate")
async def generate_completion_route(
    payload: dict = Body(...),
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user)
):
    return await generate_ai_content("completion", payload, db, current_user)

@router.post("/completion/check")
async def check_answer(
    payload: dict = Body(...),
    current_user = Depends(deps.get_current_user)
):
    user_answer = payload.get("user_answer")
    correct_answer = payload.get("correct_answer")
    evaluation = await ai_generator.check_completion_answer(user_answer, correct_answer)
    return {"evaluation": evaluation}

# =====================================================================
# (RAG ÉS MEMÓRIA)
# =====================================================================

@router.post("/chat/send")
async def send_chat_message(
    payload: dict = Body(...),
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user)
):
    note_id = payload.get("note_id")
    user_message = payload.get("message")

    note = db.query(Note).filter(Note.id == note_id, Note.owner_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Jegyzet nem található")

    user_chat = ChatMessage(
        user_id=current_user.id,
        note_id=note.id,
        role="user",
        content=user_message,
        is_off_topic=False
    )
    db.add(user_chat)
    db.commit()

    ai_response_data = await ai_generator.chat_with_note(
        note_title=note.title,
        note_content=note.content,
        user_message=user_message
    )

    ai_chat = ChatMessage(
        user_id=current_user.id,
        note_id=note.id,
        role="ai",
        content=ai_response_data.get("response", "Hiba a válaszadásnál."),
        is_off_topic=ai_response_data.get("is_off_topic", False)
    )
    db.add(ai_chat)
    db.commit()

    return {
        "response": ai_chat.content,
        "is_off_topic": ai_chat.is_off_topic
    }

@router.get("/chat/{note_id}/history")
async def get_chat_history(
    note_id: int,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user)
):
    """Lekéri a korábbi beszélgetést, amikor megnyitod a chatet."""
    note = db.query(Note).filter(Note.id == note_id, Note.owner_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Jegyzet nem található")

    messages = db.query(ChatMessage).filter(
        ChatMessage.note_id == note_id,
        ChatMessage.user_id == current_user.id
    ).order_by(ChatMessage.created_at.asc()).all()

    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "is_off_topic": m.is_off_topic
        }
        for m in messages
    ]