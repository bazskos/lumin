from fastapi import APIRouter
from app.api.api_v1.endpoints import auth
from app.api.api_v1.endpoints import users
from app.api.api_v1.endpoints import notes
from app.api.api_v1.endpoints import stats
from app.api.api_v1.endpoints import ai_routes
from app.api.api_v1.endpoints import quizzes

api_router = APIRouter()
api_router.include_router(auth.router, tags=["login"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(notes.router, prefix="/notes", tags=["notes"])
api_router.include_router(stats.router, prefix="/stats", tags=["stats"])
api_router.include_router(ai_routes.router, prefix="/ai", tags=["ai"])
api_router.include_router(quizzes.router, prefix="/quizzes", tags=["quizzes"])