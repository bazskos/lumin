from pydantic import BaseModel
from datetime import datetime

class NoteBase(BaseModel):
    title: str
    content: str | None = None
    style: str = "general"

class NoteCreate(NoteBase):
    pass

class Note(NoteBase):
    id: int
    created_at: datetime
    owner_id: int
    mime_type: str | None = None

    class Config:
        from_attributes = True