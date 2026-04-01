"""
Gamifikációs és statisztikai rendszer API végpontjai.
A tanulói aktivitás nyomon követését, a kvízek eredményeinek mentését
és az átlagpontszámok kiszámítását végzi.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.api import deps
from app.models.note import Note
from app.models.task import Task, UserTaskProgress

router = APIRouter()

class SaveGameResultPayload(BaseModel):
    score: int = Field(default=0, ge=0)
    max_score: int = Field(default=0, ge=0)
    type: str = Field(default="Kvíz", min_length=1)

@router.get("")
def get_stats(
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user),
):
    """
    A felhasználó személyes tanulási statisztikáinak lekérése:
    Összes jegyzet száma, megoldott feladatok száma és átlagos teljesítmény (%).
    """
    notes_count = db.query(Note).filter(Note.owner_id == current_user.id).count()
    quizzes_count = db.query(UserTaskProgress).filter(UserTaskProgress.user_id == current_user.id).count()
    progresses = db.query(UserTaskProgress, Task).join(Task).filter(UserTaskProgress.user_id == current_user.id).all()

    if not progresses:
        average_score = 0
    else:
        total_score = sum(p.score for p, t in progresses)
        total_max = sum(t.points for p, t in progresses)
        if total_max > 0:
            average_score = round((total_score / total_max) * 100)
        else:
            average_score = 0

    return {
        "notes_count": notes_count,
        "quizzes_count": quizzes_count,
        "average_score": average_score
    }

@router.post("/save")
def save_game_result(
    payload: SaveGameResultPayload,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user),
):
    """
    Gyakorlás (kvíz, lyukas szöveg) eredményeinek elmentése.
    Intelligens feladatkezelés: csak akkor hoz létre új 'Task' rekordot, 
    ha még nem létezik az adott típushoz és pontszámhoz tartozó (redukálja az adatbázis spamelését).
    """
    score = payload.score
    max_score = payload.max_score
    game_type = payload.type

    task_title = f"{game_type} Gyakorlás"
    task = (
        db.query(Task)
        .filter(Task.title == task_title, Task.points == max_score)
        .first()
    )
    if not task:
        task = Task(
            title=task_title,
            description="AI által generált feladatsor",
            points=max_score,
        )
        db.add(task)
        db.commit()
        db.refresh(task)

    new_progress = UserTaskProgress(
        user_id=current_user.id,
        task_id=task.id,
        completed=True,
        score=score
    )
    db.add(new_progress)
    db.commit()

    return {"message": "Eredmény sikeresen elmentve!"}