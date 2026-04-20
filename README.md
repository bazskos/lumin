# Lumin - AI-Powered Learning Assistant

Lumin is a modern, cloud-native full-stack web application designed to revolutionize how students process study materials. By leveraging Large Language Models (LLMs), Lumin automates the creation of interactive study aids such as quizzes, flashcards, and outlines, allowing students to focus on learning rather than manual data entry.

## 🚀 Key Features

- **Automated Content Generation**: Generate multiple-choice quizzes, flashcards, sentence completion exercises, and structured outlines from raw text or uploaded documents.
- **AI Study Mentor**: An interactive chat interface that uses context-injection (simplified RAG) to answer questions specifically based on your study materials while filtering out off-topic queries.
- **Smart Document Management**: Support for text notes and file uploads (PDFs, Images) with intelligent context-aware processing.
- **Gamified Experience**: Interactive UI with real-time feedback, progress tracking, and visual rewards (confetti, statistics) to keep students motivated.
- **Secure Authentication**: Robust user management with Bcrypt password hashing and JWT-based session handling.

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL (Neon Serverless)
- **ORM**: SQLAlchemy with Alembic for migrations
- **AI Integration**: Groq API (LLaMA 3.1/3.3 models)
- **Security**: Python-jose (JWT), Passlib (Bcrypt)

### Frontend
- **Library**: React.js with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: React Hooks & Axios Interceptors
- **Animations**: Framer Motion / Auto-animate, Canvas Confetti

## ⚙️ Installation & Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- Groq API Key
- Neon PostgreSQL connection string

### Backend Setup
1. Navigate to the backend directory:
   cd backend
2. Create and activate a virtual environment:
  python -m venv venv
  source venv/bin/activate  # On Windows: venv\Scripts\activate
3. Install dependencies:
   pip install -r requirements.txt
4. Configure environment variables:
Create a .env file based on .env.example and fill in your credentials (DATABASE_URL, GROQ_API_KEY, SECRET_KEY).
5. Run database migrations:
   alembic upgrade head
6. Start the server:
   uvicorn app.main:app --reload
### Frontend Setup
1. Navigate to the frontend directory:
   cd frontend
2. Install dependencies:
   npm install
3. Configure environment variables:
   Create a .env file and set VITE_API_URL to your local backend (e.g., http://localhost:8000/api/v1)
4. Start the development server:
   npm run dev

## 🏗️ Architecture
Lumin follows an N-tier Client-Server architecture. The React frontend communicates with the FastAPI backend via a RESTful API. The system uses Database-Driven Context Injection to ensure the AI Mentor remains grounded in the user's specific notes, significantly reducing hallucinations and maintaining academic focus.

### 📜 License & Copyright
This project was developed as a Bachelor's Thesis at the University of Pécs (PTE TTK). **All rights reserved.**
The code and documentation provided in this repository are for viewing and educational purposes only. You may not copy, modify, distribute, or use this work for commercial or non-academic purposes without explicit written permission from the author. 
If you are interested in collaborating, discussing the research, or using this technology, please feel free to reach out to me directly.
