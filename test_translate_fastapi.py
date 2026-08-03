from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.testclient import TestClient

app = FastAPI()

class TranslateRequest(BaseModel):
    text: str
    target_lang: str

@app.post("/translate")
def translate_text(payload: TranslateRequest):
    try:
        from deep_translator import GoogleTranslator
        translated = GoogleTranslator(source='auto', target=payload.target_lang).translate(payload.text)
        return {"translatedText": translated}
    except ImportError:
        return {"translatedText": "[Eroare: modulul deep_translator nu este instalat pe server]"}
    except Exception as e:
        return {"translatedText": f"[Eroare la traducere: {str(e)}]"}

client = TestClient(app)
response = client.post("/translate", json={"text": "hello", "target_lang": "ro"})
print("Status:", response.status_code)
print("Response:", response.text)
