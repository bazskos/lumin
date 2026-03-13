from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from app.api import deps
from app.models.note import Note
from app.models.task import Task, UserTaskProgress

router = APIRouter()

@router.get("")
def get_stats(
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user),
):
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
    payload: dict = Body(...),
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user),
):
    score = payload.get("score", 0)
    max_score = payload.get("max_score", 0)
    game_type = payload.get("type", "Kvíz") 

    new_task = Task(
        title=f"{game_type} Gyakorlás",
        description="AI által generált feladatsor",
        points=max_score
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    new_progress = UserTaskProgress(
        user_id=current_user.id,
        task_id=new_task.id,
        completed=True,
        score=score
    )
    db.add(new_progress)
    db.commit()

    return {"message": "Eredmény sikeresen elmentve!"}