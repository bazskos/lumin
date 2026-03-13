from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base

class ChatMessage(Base):
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    note_id = Column(Integer, ForeignKey("note.id"), nullable=False)
    role = Column(String, nullable=False) 
    content = Column(Text, nullable=False)
    is_off_topic = Column(Boolean, default=False) 
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user = relationship("User", back_populates="chat_messages")

