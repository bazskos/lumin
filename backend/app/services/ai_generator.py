import os
import re
import json
from fastapi import HTTPException
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

JSON_FENCE_RE = re.compile(r"```(?:json)?\s*([\s\S]*?)\s*```", re.IGNORECASE)

def get_ai_client():
    """
    Iniciálja és visszaadja a Groq AI klienst a környezeti változók alapján.
    
    Returns:
        Groq: Egy konfigurált Groq kliens példány.
    Raises:
        HTTPException: Ha a GROQ_API_KEY nincs beállítva (503 Service Unavailable).
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Az AI szolgáltatás nincs konfigurálva (hiányzó GROQ_API_KEY).",
        )
    return Groq(api_key=api_key)

def _strip_code_fences(text: str) -> str:
    match = JSON_FENCE_RE.search(text)
    if match:
        return match.group(1).strip()
    return text.strip()

def _extract_first_json(text: str) -> str:
    """
    Kinyeri az első JSON objektumot vagy tömböt egy nyers szöveges válaszból.
    Kezeli azokat az eseteket is, amikor a nyelvi modell (LLM) extra szöveget
    fűz a JSON formátumú válasz elé vagy mögé (hallucináció vagy bőbeszédűség).
    
    Args:
        text (str): A nyelvi modell nyers válasza.
    Returns:
        str: A megtisztított, szintaktikailag helyesnek tűnő JSON sztring.
    Raises:
        ValueError: Ha nem található érvényes JSON kezdő/záró karakter a válaszban.
    """
    s = _strip_code_fences(text)
    start_candidates = [i for i in (s.find("["), s.find("{")) if i != -1]
    if not start_candidates:
        raise ValueError("Nem található JSON kezdete a válaszban.")
    start = min(start_candidates)

    stack: list[str] = []
    in_string = False
    escape = False

    for idx in range(start, len(s)):
        ch = s[idx]
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
            continue

        if ch == '"':
            in_string = True
            continue

        if ch in "[{":
            stack.append(ch)
        elif ch in "]}":
            if not stack:
                continue
            open_ch = stack.pop()
            if (open_ch == "[" and ch != "]") or (open_ch == "{" and ch != "}"):
                raise ValueError("Hibás JSON zárójelezés a válaszban.")
            if not stack:
                return s[start : idx + 1].strip()

    raise ValueError("Nem sikerült a JSON végét megtalálni a válaszban.")

def _parse_json(text: str):
    return json.loads(_extract_first_json(text))

def _validate_quiz(payload) -> list[dict]:
    """
    Szigorú Pydantic-szerű kézi validáció a generált kvíz adatszerkezetére.
    Biztosítja, hogy a frontendre kerülő adatok ne okozzanak futásidejű hibát.
    
    Args:
        payload (any): A parsze-olt JSON objektum.
    Returns:
        list[dict]: A validált kvízlista.
    """
    if not isinstance(payload, list):
        raise ValueError("A kvíz válasza nem JSON tömb.")
    for i, q in enumerate(payload):
        if not isinstance(q, dict):
            raise ValueError(f"A kvíz {i+1}. eleme nem objektum.")
        if not isinstance(q.get("question"), str) or not q["question"].strip():
            raise ValueError(f"A kvíz {i+1}. kérdése hiányzik.")
        options = q.get("options")
        if not isinstance(options, list) or len(options) < 2 or not all(isinstance(o, str) for o in options):
            raise ValueError(f"A kvíz {i+1}. opciói hibásak.")
        if not isinstance(q.get("correct_answer"), str) or not q["correct_answer"].strip():
            raise ValueError(f"A kvíz {i+1}. helyes válasza hiányzik.")
    return payload

def _validate_completion(payload) -> list[dict]:
    """
    A lyukas szöveg (Sentence Completion) feladatok adatszerkezetének validációja.
    Ellenőrzi a mondatrészek meglétét és helyességét.
    """
    if not isinstance(payload, list):
        raise ValueError("A lyukas feladat válasza nem JSON tömb.")
    for i, ex in enumerate(payload):
        if not isinstance(ex, dict):
            raise ValueError(f"A feladat {i+1}. eleme nem objektum.")
        for key in ("part_before", "hidden_part", "part_after"):
            if not isinstance(ex.get(key), str) or not ex[key].strip():
                raise ValueError(f"A feladat {i+1}. '{key}' hibás vagy hiányzik.")
    return payload

def _validate_flashcards(payload) -> list[dict]:
    """
    Tanulókártyák (Flashcards) adatszerkezetének ellenőrzése (előlap/hátlap megléte).
    """
    if not isinstance(payload, list):
        raise ValueError("A flashcard válasza nem JSON tömb.")
    for i, card in enumerate(payload):
        if not isinstance(card, dict):
            raise ValueError(f"A kártya {i+1}. eleme nem objektum.")
        if not isinstance(card.get("front"), str) or not card["front"].strip():
            raise ValueError(f"A kártya {i+1}. 'front' hibás vagy hiányzik.")
        if not isinstance(card.get("back"), str) or not card["back"].strip():
            raise ValueError(f"A kártya {i+1}. 'back' hibás vagy hiányzik.")
    return payload

async def generate_from_content(prompt_type: str, content: str, style: str = "general"):
    """
    Dinamikus, prompt-alapú tartalomgenerálás az AI szolgáltatás (LLaMA) segítségével.
    
    Args:
        prompt_type (str): A kért feladattípus (pl. quiz, completion, flashcards, summary).
        content (str): A felhasználó által feltöltött jegyzet vagy fájl tartalma/címe.
        style (str): Tantárgyspecifikus oktatói stílus (szerepkör) az LLM számára.
        
    Returns:
        str: Az AI által generált, validált eredmény JSON sztringként, vagy Markdown
             formátumban (vázlat esetén).
    """
    client = get_ai_client()
    model_name = 'llama-3.3-70b-versatile'

    text_content = content
    match = re.search(r"\[FILE_PATH:(.*?)\]", content)
    if match:
        text_content = content.replace(match.group(0), "").strip()
        if not text_content:
            text_content = "A felhasználó egy fájlt töltött fel jegyzetként. Készíts egy általános, összefoglaló anyagot a dokumentum CÍME alapján, mivel a fájl tartalmát vizuálisan most nem tudod elemezni."

    subject_prompts = {
        "history": "Te egy profi történelem tanár vagy. BÁTRAN használd a saját, átfogó tudásodat a megadott téma kiegészítéséhez! Ha vázlatot írsz, MINDIG egy '⏳ Fontos Dátumok és Személyek' listával kezdd, mielőtt belemész a részletes magyarázatba.",
        "math": "Te egy matematika professzor vagy. BÁTRAN használj külső tudást és gyakorlati példákat a megadott témához! Ha vázlatot írsz, MINDIG egy '📐 Képletek és Törvényszerűségek' listával kezdd, majd magyarázd el a logikát lépésről lépésre.",
        "coding": "Te egy senior szoftverfejlesztő mentor vagy. Egészítsd ki a jegyzetet best-practice tippekkel! Ha vázlatot írsz, MINDIG emeld ki a '💻 Kulcsfontosságú Szintaxisokat', és adj rövid, érthető kódpéldákat.",
        "general": "Te egy profi magántanár vagy. Szabadon egészítsd ki a megadott anyagot hasznos, releváns háttérinformációkkal, hogy a diák minél jobban megértse az összefüggéseket."
    }

    persona = subject_prompts.get(style, subject_prompts["general"])
    system_prompt = f"{persona}\n\nFontos: Mindig magyar nyelven válaszolj!"

    user_prompt = f"Itt a tananyag/jegyzet:\n{text_content}\n\n---\nFELADAT:\n"
    
    if prompt_type == "quiz":
        user_prompt += """
        Generate a quiz with 5 multiple-choice questions in Hungarian based on the content.
        The output MUST be a strict JSON array of objects. DO NOT include markdown formatting like ```json.
        Structure:
        [
            {
                "question": "Kérdés szövege?",
                "options": ["Opció A", "Opció B", "Opció C", "Opció D"],
                "correct_answer": "Opció A" 
            }
        ]
        """
    elif prompt_type == "completion":
        user_prompt += """
        Create 5 "sentence completion" exercises in Hungarian based on the key facts.
        The output MUST be a strict JSON array. DO NOT include markdown formatting like ```json.
        Structure:
        [
            {
                "part_before": "Mondat eleje",
                "hidden_part": "hiányzó szó",
                "part_after": "mondat vége."
            }
        ]
        """
    elif prompt_type == "flashcards":
        user_prompt += """
        Create 8 flashcards in Hungarian from the key concepts of this content.
        Output strictly JSON array. DO NOT include markdown formatting like ```json.
        Structure:
        [{"front": "Fogalom", "back": "Magyarázat/Definíció"}]
        """
    elif prompt_type == "summary":
        user_prompt += """
        Készíts egy nagyon jól strukturált, szellős, és vizuálisan vonzó tanulási vázlatot a szövegből magyar nyelven!
        Szigorú formai szabályok (Markdown formátumban):
        1. Használj beszédes főcímeket (##) és alcímeket (###).
        2. A kulcsfontosságú fogalmakat és neveket MINDIG emeld ki vastagon (**fogalom**).
        3. Használj felsorolásokat (bullet points), hogy ne legyenek hosszú bekezdések.
        4. Tegyél egy-egy odaillő emojit a címek elé, hogy vizuálisan feldobd az anyagot.
        5. A vázlat legyen lényegretörő, könnyen áttekinthető egy vizsgára készülve.
        """

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model=model_name,
            temperature=0.3,
        )

        text_response = chat_completion.choices[0].message.content.strip()
        
        if prompt_type == "quiz":
            parsed = _validate_quiz(_parse_json(text_response))
            return json.dumps(parsed, ensure_ascii=False)
        if prompt_type == "completion":
            parsed = _validate_completion(_parse_json(text_response))
            return json.dumps(parsed, ensure_ascii=False)
        if prompt_type == "flashcards":
            parsed = _validate_flashcards(_parse_json(text_response))
            return json.dumps(parsed, ensure_ascii=False)

        # summary: allow markdown/text
        return text_response

    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI Generálás sikertelen: {str(e)}")


async def check_completion_answer(user_answer: str, correct_answer: str):
    """
    Szemantikai válaszértékelő funkció a "Lyukas szöveg" feladathoz.
    Az AI elfogadja a kisebb elírásokat és szinonimákat, növelve a felhasználói élményt.
    
    Args:
        user_answer (str): A tanuló által beírt válasz.
        correct_answer (str): Az eredeti, elvárt válasz.
    Returns:
        str: JSON formátumú értékelés boolean eredménnyel és visszajelzéssel.
    """
    client = get_ai_client()
    model_name = 'llama-3.3-70b-versatile'
    
    prompt = f"""
    Hasonlítsd össze a felhasználó válaszát a helyes válasszal.
    Helyes válasz: "{correct_answer}"
    Felhasználó válasza: "{user_answer}"
    
    Fogadd el, ha jelentésében helyes, vagy csak minimális elírás van benne (pl. ékezet hiánya).
    Válaszod CSAK egy tiszta JSON objektum legyen (markdown ```json nélkül):
    {{
        "is_correct": true/false,
        "feedback": "Rövid visszajelzés magyarul, hogy miért jó vagy rossz."
    }}
    """
    
    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "Te egy szigorú, de igazságos tanár vagy, aki csak JSON formátumban kommunikál."},
                {"role": "user", "content": prompt}
            ],
            model=model_name,
            temperature=0.1,
        )
        
        raw = chat_completion.choices[0].message.content.strip()
        try:
            parsed = _parse_json(raw)
            if not isinstance(parsed, dict):
                raise ValueError("Az értékelés nem JSON objektum.")
            if not isinstance(parsed.get("is_correct"), bool) or not isinstance(parsed.get("feedback"), str):
                raise ValueError("Az értékelés JSON szerkezete hibás.")
            return json.dumps(parsed, ensure_ascii=False)
        except Exception:
            return _strip_code_fences(raw)
        
    except Exception as e:
        return '{"is_correct": false, "feedback": "Hiba történt az AI értékelés során."}'

async def chat_with_note(note_title: str, note_content: str, user_message: str):
    """
    RAG (Retrieval-Augmented Generation) alapú chat funkció.
    Háromszintű intelligenciával válaszol a jegyzet címe és tartalma alapján:
    1. Közvetlen információ kinyerése a jegyzetből.
    2. Általános tudás bevonása, ha releváns a témához.
    3. Off-topic kérdések kiszűrése és megtagadása.
    
    Returns:
        dict: Egy objektum a válasszal ('response') és az esetleges off-topic 
              jelzéssel ('is_off_topic').
    """
    client = get_ai_client()
    model_name = 'llama-3.3-70b-versatile'

    clean_content = note_content
    match = re.search(r"\[FILE_PATH:(.*?)\]", note_content)
    if match:
        clean_content = note_content.replace(match.group(0), "").strip()
        if not clean_content:
            clean_content = "[A jegyzet egy feltöltött fájl, melynek tartalma közvetlenül nem olvasható. Csak a címre hagyatkozz.]"

    system_prompt = f"""Te egy intelligens, magyar nyelven kommunikáló, szigorú tanulmányi mentor vagy.
A jelenlegi tananyag TÉMÁJA: "{note_title}"
A tananyag TARTALMA:
"{clean_content}"

SZIGORÚ SZABÁLYOK A VÁLASZADÁSHOZ:
1. Ha a felhasználó kérdésére a válasz megtalálható a fenti TARTALOMBAN, válaszolj részletesen, és MINDIG ezzel a kifejezéssel kezdd a válaszod: "A jegyzeted alapján..."
2. Ha a kérdés szorosan kapcsolódik a TÉMÁHOZ ("{note_title}"), de NINCS benne a TARTALOMBAN, válaszolj a saját átfogó tudásod alapján, de MINDIG ezzel a kifejezéssel kezdd a válaszod: "Az általános tudásom alapján..."
3. Ha a kérdés (pl. recept, magánélet, más tantárgy) EGYÁLTALÁN NEM kapcsolódik a TÉMÁHOZ, tagadd meg a választ! A válaszod legyen ez: "Ez a kérdés nem kapcsolódik a jelenlegi tananyaghoz, kérlek, a témával kapcsolatban kérdezz." És állítsd az "is_off_topic" értékét true-ra.

A válaszodat KIZÁRÓLAG egy érvényes JSON objektumban add vissza, markdown formázás (```json) NÉLKÜL!
Struktúra:
{{
    "response": "A szabályok alapján megfogalmazott válaszod...",
    "is_off_topic": false
}}
"""

    user_prompt = f"Felhasználó kérdése: {user_message}"

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model=model_name,
            temperature=0.2,
        )

        raw_response = chat_completion.choices[0].message.content.strip()
        try:
            response_data = _parse_json(raw_response)
            if not isinstance(response_data, dict):
                raise ValueError("A chat válasz nem JSON objektum.")
            response = response_data.get("response")
            is_off_topic = response_data.get("is_off_topic")
            if not isinstance(response, str) or not isinstance(is_off_topic, bool):
                raise ValueError("A chat JSON válasz szerkezete hibás.")
            return {"response": response, "is_off_topic": is_off_topic}
        except Exception:
            # fallback: treat as plain text
            return {"response": _strip_code_fences(raw_response), "is_off_topic": False}

    except Exception as e:
        return {
            "response": "Sajnálom, hiba történt az üzenet feldolgozása közben. Kérlek, próbáld újra!",
            "is_off_topic": False
        }