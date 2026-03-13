from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class Task(Base):
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    points = Column(Integer, default=10)
    user_progress = relationship("UserTaskProgress", back_populates="task")

class UserTaskProgress(Base):
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("task.id"), nullable=False)
    completed = Column(Boolean, default=False)
    score = Column(Integer, default=0)
    user = relationship("User", back_populates="progress")
    task = relationship("Task", back_populates="user_progress")