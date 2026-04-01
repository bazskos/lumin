from fastapi import APIRouter, Depends, HTTPException
from time import monotonic
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy.orm import Session
from app.api import deps
from app.models.note import Note
from app.models.chat import ChatMessage
from app.services import ai_generator

router = APIRouter()

_AI_RATE_LIMIT_SECONDS = 1.0
_ai_last_call: dict[tuple[int, str], float] = {}

def _enforce_ai_rate_limit(user_id: int, key: str) -> None:
    """
    Végpont-szintű sebességkorlátozás (Rate Limiting) az AI API hívásokhoz.
    Védi a rendszert a spameléstől és a túlzott költségektől (Token-menedzsment).
    """
    now = monotonic()
    k = (user_id, key)
    last = _ai_last_call.get(k)
    if last is not None and now - last < _AI_RATE_LIMIT_SECONDS:
        raise HTTPException(status_code=429, detail="Túl sok kérés. Próbáld újra pár másodperc múlva.")
    _ai_last_call[k] = now

class NoteIdPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")
    note_id: int = Field(..., ge=1)

class CompletionCheckPayload(BaseModel):
    user_answer: str = Field(..., min_length=1)
    correct_answer: str = Field(..., min_length=1)

class ChatSendPayload(BaseModel):
    note_id: int = Field(..., ge=1)
    message: str = Field(..., min_length=1)

@router.post("/{type}")
async def generate_ai_content(
    type: str,
    payload: NoteIdPayload,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user),
):
    """
    AI alapú tananyag generálása (kvíz, vázlat, kártyák) egy specifikus jegyzethez.
    
    A metódus adatbázis-szintű gyorsítótárazást (Caching) végez: ha az adott típusú 
    tartalom már egyszer legenerálódott, az eltárolt eredményt adja vissza.
    """
    _enforce_ai_rate_limit(current_user.id, f"gen:{type}")
    note_id = payload.note_id
    note = db.query(Note).filter(Note.id == note_id, Note.owner_id == current_user.id).first()
    
    if not note:
        raise HTTPException(status_code=404, detail="Jegyzet nem található")

    # 1. lépés: Ellenőrzés a gyorsítótárban (Cache)
    if type == "summary" and note.generated_summary:
        return {"result": note.generated_summary}
    elif type == "flashcards" and note.generated_flashcards:
        return {"result": note.generated_flashcards}
    elif type == "completion" and note.generated_completion:
        return {"result": note.generated_completion}
    elif type == "quiz" and note.generated_quiz:
        return {"result": note.generated_quiz}

    full_text = f"Title: {note.title}\n\n{note.content}"
    
    # 2. lépés: Új tartalom generálása az LLM segítségével
    result = await ai_generator.generate_from_content(type, full_text, note.style)
    
    # 3. lépés: Az eredmény mentése a hívási költségek minimalizálása érdekében
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
    payload: NoteIdPayload,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user)
):
    """
    Dedikált végpont a mondatkiegészítős (Lyukas szöveg) feladatok generálására.
    """
    return await generate_ai_content("completion", payload, db, current_user)

@router.post("/completion/check")
async def check_answer(
    payload: CompletionCheckPayload,
    current_user = Depends(deps.get_current_user)
):
    """
    A felhasználó mondatkiegészítésének szemantikai értékelése az AI által.
    """
    _enforce_ai_rate_limit(current_user.id, "completion:check")
    evaluation = await ai_generator.check_completion_answer(payload.user_answer, payload.correct_answer)
    return {"evaluation": evaluation}

"""
-------------------------------------------------------------------------
 RAG (Retrieval-Augmented Generation) és Chat Memória Funkciók
-------------------------------------------------------------------------
"""

@router.post("/chat/send")
async def send_chat_message(
    payload: ChatSendPayload,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user)
):
    """
    Interaktív csevegés (Mentorkodás) a feltöltött tananyag kontextusában.
    A kérés és a válasz elmentésre kerül, biztosítva a chat előzmények megőrzését.
    """
    _enforce_ai_rate_limit(current_user.id, "chat:send")
    note_id = payload.note_id
    user_message = payload.message

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
    """
    Lekérdezi az AI mentorral folytatott korábbi beszélgetéseket egy adott jegyzethez.
    Szükséges az oldal újratöltése után is konzisztens felhasználói élmény 
    biztosításához.
    """
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