"""
Füstteszt (Smoke Test) az alkalmazás alapvető működésének ellenőrzésére.
Szakdolgozati követelmény a szoftver alapvető automatizált tesztelésének megléte.
"""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_api_health_check():
    """
    Ellenőrzi, hogy a FastAPI alkalmazás elindul-e, és reagál-e a kérésekre.
    """
    # Egy nem létező vagy root végpontra küldünk egy kérést. 
    # Ha az app nem crashelt le és 404 Not Found vagy 200 OK érkezik, 
    # az azt jelenti, hogy a szerver sikeresen elindult és képes kéréseket fogadni.
    response = client.get("/")
    assert response.status_code in [200, 404], "Az API nem fut megfelelően."

def test_docs_availability():
    """
    Ellenőrzi, hogy az automatikusan generált Swagger UI elérhető-e.
    """
    response = client.get("/docs")
    assert response.status_code == 200, "A Swagger dokumentáció nem elérhető."