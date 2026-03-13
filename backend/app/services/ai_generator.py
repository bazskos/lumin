import os
import re
import json
from fastapi import HTTPException
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

def get_ai_client():
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("Hiba: Nincs GROQ_API_KEY beállítva a .env fájlban!")
    return Groq(api_key=api_key)

async def generate_from_content(prompt_type: str, content: str, style: str = "general"):
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
        
        if prompt_type in ["quiz", "completion", "flashcards"]:
            start_idx = text_response.find('[') if prompt_type != "completion_answer" else text_response.find('{')
            end_idx = text_response.rfind(']') if prompt_type != "completion_answer" else text_response.rfind('}')
            start_bracket = text_response.find('[')
            start_brace = text_response.find('{')
            starts = [i for i in [start_bracket, start_brace] if i != -1]
            start_idx = min(starts) if starts else -1
            
            end_bracket = text_response.rfind(']')
            end_brace = text_response.rfind('}')
            
            ends = [i for i in [end_bracket, end_brace] if i != -1]
            end_idx = max(ends) if ends else -1

            if start_idx != -1 and end_idx != -1:
                text_response = text_response[start_idx : end_idx + 1]
            else:
                print(f"Hiba: Nem található JSON a válaszban. Ezt küldte az AI: {text_response}")
                raise ValueError("Az AI nem megfelelő formátumban válaszolt.")
                
        return text_response

    except Exception as e:
        print(f"AI Generálás Hiba: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI Generálás sikertelen: {str(e)}")


async def check_completion_answer(user_answer: str, correct_answer: str):
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
        
        return chat_completion.choices[0].message.content.strip().replace("```json", "").replace("```", "")
        
    except Exception as e:
        print(f"AI Értékelés Hiba: {str(e)}")
        return '{"is_correct": false, "feedback": "Hiba történt az AI értékelés során."}'

async def chat_with_note(note_title: str, note_content: str, user_message: str):
    """
    RAG (Retrieval-Augmented Generation) alapú chat funkció.
    Háromszintű intelligenciával válaszol a jegyzet címe és tartalma alapján.
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
        clean_json_str = raw_response.replace("```json", "").replace("```", "").strip()
        response_data = json.loads(clean_json_str)
        return response_data

    except Exception as e:
        print(f"AI Chat Hiba: {str(e)}")
        return {
            "response": "Sajnálom, hiba történt az üzenet feldolgozása közben. Kérlek, próbáld újra!",
            "is_off_topic": False
        }