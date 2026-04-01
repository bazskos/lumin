"""
A tananyagok (jegyzetek) kezeléséért felelős API végpontok (CRUD műveletek).
Szakdolgozati fókusz: Biztonságos fájlfeltöltés, fájlok memóriakímélő feldolgozása,
és az adatbázis konzisztenciájának fenntartása a fájlrendszerrel.
"""
import re
from pathlib import Path
from uuid import uuid4
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Form, UploadFile, File
from sqlalchemy.orm import Session
from app.api import deps
from app.crud import note as crud_note
from app.core.config import settings
from app.models.note import Note as NoteModel
from app.schemas.note import Note, NoteCreate

router = APIRouter()

FILE_PATH_RE = re.compile(r"\[FILE_PATH:(.*?)\]")
UPLOAD_DIR = Path("uploads")

@router.get("/", response_model=list[Note])
def read_notes(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user = Depends(deps.get_current_user),
) -> Any:
    """
    A bejelentkezett felhasználó saját jegyzeteinek lekérdezése.
    Támogatja a lapozást (pagination - skip, limit).
    """
    notes = crud_note.get_notes(db, user_id=current_user.id, skip=skip, limit=limit)
    return notes

@router.post("/", response_model=Note)
def create_note(
    *,
    db: Session = Depends(deps.get_db),
    title: str = Form(...),
    content: str | None = Form(None),
    style: str = Form("general"),
    file: UploadFile = File(None),
    current_user = Depends(deps.get_current_user),
) -> Any:
    """
    Új jegyzet létrehozása és csatolt fájlok biztonságos feltöltése.
    Biztonsági mechanizmusok:
    - Csak engedélyezett MIME típusok (Kép, PDF) befogadása.
    - UUID alapú egyedi fájlnév-generálás a névütközések (felülírás) ellen.
    - Chunkolt (darabolt, 1MB) fájlírás a szerver memóriájának védelme érdekében.
    - Hard limit (max 10MB) beállítása a túl nagy fájlok visszautasítására.
    """
    mime_type = None
    saved_content = content or ""

    if file:
        mime_type = file.content_type

        allowed_mime_types = {
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
        }
        if mime_type not in allowed_mime_types:
            raise HTTPException(status_code=400, detail="Nem támogatott fájltípus. Csak kép vagy PDF tölthető fel.")

        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        safe_original_name = Path(file.filename).name
        if not safe_original_name:
            raise HTTPException(status_code=400, detail="Hibás fájlnév.")
        stored_name = f"{uuid4().hex}_{safe_original_name}"
        file_location = (UPLOAD_DIR / stored_name).as_posix()

        max_bytes = max(1, settings.BACKEND_MAX_UPLOAD_MB) * 1024 * 1024
        written = 0
        try:
            with open(file_location, "wb") as file_object:
                while True:
                    chunk = file.file.read(1024 * 1024)  # 1MB chunks
                    if not chunk:
                        break
                    written += len(chunk)
                    if written > max_bytes:
                        raise HTTPException(status_code=413, detail=f"A feltöltött fájl túl nagy (max {settings.BACKEND_MAX_UPLOAD_MB} MB).")
                    file_object.write(chunk)
        except HTTPException:
            try:
                Path(file_location).unlink(missing_ok=True)
            except Exception:
                pass
            raise
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
    """
    Jegyzet és a hozzá kapcsolódó fizikai fájl teljes körű törlése.
    - Megkeresi a jegyzetben elrejtett fájlútvonalat (RegEx).
    - Eltávolítja a feltöltött fájlt a szerver háttértáráról (Upload Cleanup).
    - Törli az adatbázis rekordot.
    """
    note = db.query(NoteModel).filter(NoteModel.id == id, NoteModel.owner_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    if note.content:
        match = FILE_PATH_RE.search(note.content)
        if match:
            file_path = match.group(1)
            try:
                path = Path(file_path)
                if path.is_file() and UPLOAD_DIR in path.parents:
                    path.unlink(missing_ok=True)
            except Exception:
                # Don't block note deletion if file cleanup fails
                pass

    deleted = crud_note.delete_note(db=db, note_id=id, user_id=current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Note not found")
    return deleted