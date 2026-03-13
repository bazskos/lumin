import os
import shutil
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Form, UploadFile, File
from sqlalchemy.orm import Session
from app.api import deps
from app.crud import note as crud_note
from app.schemas.note import Note, NoteCreate

router = APIRouter()

@router.get("/", response_model=list[Note])
def read_notes(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user = Depends(deps.get_current_user),
) -> Any:
    """Retrieve notes."""
    notes = crud_note.get_notes(db, user_id=current_user.id, skip=skip, limit=limit)
    return notes

@router.post("/", response_model=Note)
def create_note(
    *,
    db: Session = Depends(deps.get_db),
    title: str = Form(...),
    content: str = Form(None),
    style: str = Form("general"),
    file: UploadFile = File(None),
    current_user = Depends(deps.get_current_user),
) -> Any:
    """Create new note and save file."""
    mime_type = None
    saved_content = content or ""

    if file:
        mime_type = file.content_type
        
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        file_location = f"{upload_dir}/{file.filename}"
        
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
        saved_content = f"[FILE_PATH:{file_location}] {saved_content}"

    note_in = NoteCreate(title=title, content=saved_content, style=style)
    return crud_note.create_note(db=db, note=note_in, user_id=current_user.id, mime_type=mime_type)

@router.delete("/{id}", response_model=Note)
def delete_note(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    current_user = Depends(deps.get_current_user),
) -> Any:
    """Delete an item."""
    note = crud_note.delete_note(db=db, note_id=id, user_id=current_user.id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note