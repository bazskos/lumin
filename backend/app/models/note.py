from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base

class Note(Base):
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    content = Column(Text, nullable=True)
    style = Column(String, default="general")
    mime_type = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    owner_id = Column(Integer, ForeignKey("user.id"))
    generated_quiz = Column(Text, nullable=True)
    generated_flashcards = Column(Text, nullable=True)
    generated_summary = Column(Text, nullable=True)
    generated_completion = Column(Text, nullable=True)
    owner = relationship("User", back_populates="notes")
    chat_messages = relationship("ChatMessage", back_populates="note", cascade="all, delete-orphan")