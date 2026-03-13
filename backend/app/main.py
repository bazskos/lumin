from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from app.api.api_v1.api import api_router
from sqladmin import Admin, ModelView
from sqladmin.authentication import AuthenticationBackend
from starlette.requests import Request
from starlette.middleware.sessions import SessionMiddleware
from app.db.session import engine 
from app.models.chat import ChatMessage
from app.models.user import User
from app.models.note import Note
from app.models.task import Task

app = FastAPI(title="Lumin API")
os.makedirs("uploads", exist_ok=True)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AdminAuth(AuthenticationBackend):
    async def login(self, request: Request) -> bool:
        form = await request.form()
        username = form.get("username")
        password = form.get("password")
        correct_username = os.getenv("ADMIN_USERNAME", "admin")
        correct_password = os.getenv("ADMIN_PASSWORD", "szuper_titkos_alap_jelszo")

        if username == correct_username and password == correct_password:
            request.session.update({"token": "admin-logged-in"})
            return True
        return False

    async def logout(self, request: Request) -> bool:
        request.session.clear()
        return True

    async def authenticate(self, request: Request) -> bool:
        return "token" in request.session

authentication_backend = AdminAuth(secret_key="lumin-admin-auth-secret")
admin = Admin(app, engine, authentication_backend=authentication_backend)

class UserAdmin(ModelView, model=User):
    column_list = [User.id, User.username, User.email, User.is_active]
    icon = "fa-solid fa-users"
    name = "Felhasználó"
    name_plural = "Felhasználók"

class NoteAdmin(ModelView, model=Note):
    column_list = [Note.id, Note.title, Note.style, Note.created_at]
    icon = "fa-solid fa-book"
    name = "Jegyzet"
    name_plural = "Jegyzetek"

class TaskAdmin(ModelView, model=Task):
    column_list = [Task.id, Task.title, Task.points]
    icon = "fa-solid fa-list-check"
    name = "Feladat"
    name_plural = "Feladatok"

admin.add_view(UserAdmin)
admin.add_view(NoteAdmin)
admin.add_view(TaskAdmin)

app.include_router(api_router, prefix="/api/v1")