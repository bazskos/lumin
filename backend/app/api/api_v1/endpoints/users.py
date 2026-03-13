from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.crud import user as crud_user
from app.schemas.user import User, UserCreate

router = APIRouter()

@router.post("/", response_model=User)
def create_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: UserCreate,
) -> Any:
    """Create new user."""
    user = crud_user.get_user_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(status_code=400, detail="The user with this email already exists in the system.")
    
    user_name = crud_user.get_user_by_username(db, username=user_in.username)
    if user_name:
         raise HTTPException(status_code=400, detail="The username is already taken.")

    user = crud_user.create_user(db, user=user_in)
    return user

@router.get("/me", response_model=User)
def read_user_me(current_user: deps.CurrentUser) -> Any:
    """Get current user."""
    return current_user