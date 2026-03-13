from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.api import deps
from app.models.note import Note
from app.services import ai_generator

router = APIRouter()

@router.post("/generate")
async def generate_quiz(
    payload: dict = Body(...),
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user),
):
    note_id = payload.get("note_id")
    note = db.query(Note).filter(Note.id == note_id, Note.owner_id == current_user.id).first()
    
    if not note:
        raise HTTPException(status_code=404, detail="Jegyzet nem található")

    full_text = f"Title: {note.title}\n\n{note.content}"
    
    questions_json = await ai_generator.generate_from_content("quiz", full_text, note.style)
    
    return {
        "id": 999,
        "title": f"Kvíz: {note.title}",
        "questions_json": questions_json
    }