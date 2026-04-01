from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
from app.models.note import Note
from app.schemas.note import NoteCreate

def get_notes(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(Note).filter(Note.owner_id == user_id).offset(skip).limit(limit).all()

def create_note(db: Session, note: NoteCreate, user_id: int, mime_type: str = None):
    db_note = Note(
        title=note.title,
        content=note.content,
        style=note.style,
        owner_id=user_id,
        mime_type=mime_type
    )
    db.add(db_note)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Ezzel a címmel már létezik jegyzeted.")
    db.refresh(db_note)
    return db_note

def delete_note(db: Session, note_id: int, user_id: int):
    note = db.query(Note).filter(Note.id == note_id, Note.owner_id == user_id).first()
    if note:
        db.delete(note)
        db.commit()
    return note