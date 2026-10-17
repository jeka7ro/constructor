import os
import json
import base64
import io
import re
from PIL import Image

def normalize_image_to_jpeg_base64(image_path: str = None, image_bytes: bytes = None, max_dim: int = 1600) -> str:
    """
    Normalizes an image (PNG, HEIC, WebP, JPEG) to JPEG base64 with max dimension constraint.
    Guarantees RGB mode and consistent MIME type for vision APIs.
    """
    if image_bytes is None and image_path:
        with open(image_path, "rb") as f:
            image_bytes = f.read()

    if not image_bytes:
        raise ValueError("No image data provided")

    try:
        img = Image.open(io.BytesIO(image_bytes))
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        elif img.mode == "L":
            img = img.convert("RGB")

        # Downscale if image is overly large (> 1600px)
        w, h = img.size
        if max(w, h) > max_dim:
            ratio = max_dim / float(max(w, h))
            new_size = (int(w * ratio), int(h * ratio))
            img = img.resize(new_size, Image.Resampling.LANCZOS)

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85, optimize=True)
        return base64.b64encode(buf.getvalue()).decode("utf-8")
    except Exception as e:
        # Fallback to raw base64 if PIL fails
        return base64.b64encode(image_bytes).decode("utf-8")

def parse_float_safe(val, is_kg: bool = False):
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, str):
        val_clean = val.strip().lower()
        val_clean = re.sub(r"(kg|m3|m³|t|to|tons?|litri?|l)", "", val_clean)
        match = re.search(r"[-+]?\d+(?:[.,\s]\d+)*", val_clean)
        if not match:
            return None
        token = match.group(0).replace(" ", "")
        if "." in token and "," in token:
            if token.rfind(",") > token.rfind("."):
                token = token.replace(".", "").replace(",", ".")
            else:
                token = token.replace(",", "")
        elif is_kg and re.match(r"^\d{1,3}(?:[.,]\d{3})+$", token):
            # European thousands separator: "18.500" or "18,500" -> 18500
            token = token.replace(".", "").replace(",", "")
        elif "," in token:
            token = token.replace(",", ".")
        try:
            return float(token)
        except ValueError:
            return None
    return None

def extract_machine_screen_data(image_path: str = None, image_bytes: bytes = None):
    """
    Extracts 'Zand' (Sand) and 'Cement' cumulative consumption from a Bremat / screed machine screen.
    Uses Gemini (gemini-1.5-flash) or OpenAI (gpt-4o) with automatic failover.
    """
    openai_key = os.environ.get("OPENAI_API_KEY")
    gemini_key = os.environ.get("GEMINI_API_KEY")

    if not openai_key and not gemini_key:
        print("ℹ️ [OCR] Nicio cheie API (GEMINI_API_KEY / OPENAI_API_KEY) configurată. Skip auto-extragere.")
        return {
            "sand_kg": None,
            "sand_m3": None,
            "cement_kg": None,
            "status": "no_api_key",
            "message": "Nicio cheie API configurată pe server (GEMINI_API_KEY sau OPENAI_API_KEY)."
        }

    try:
        import requests

        base64_image = normalize_image_to_jpeg_base64(image_path=image_path, image_bytes=image_bytes)

        prompt_text = (
            "Ești un expert în citirea ecranelor mașinilor de șapă (utilaje Bremat, Brinkmann, Putzmeister).\n"
            "Analizează această fotografie a ecranului utilajului și extrage cantitățile reale consumate:\n"
            "1. Nisip (termeni posibili: 'Zand', 'Sable', 'Sand') -> totalul în kg (număr) și în m³ dacă apare.\n"
            "2. Ciment (termeni posibili: 'Cement', 'Ciment') -> totalul în kg (număr).\n\n"
            "REGULI CRITICE:\n"
            "- Extrage TOTALUL CUMULAT al lucrării / zilei (coloana 'Totaal', 'Dagtotalen', 'Total', 'Cumul', 'Ist'), "
            "NU cantitatea per șarjă / malaxor (ex: 200-300kg).\n"
            "- Punctul poate fi separator de mii în notația utilajului (ex: 18.500 kg înseamnă 18500).\n"
            "- Dacă o valoare este ilizibilă sau absentă, returnează null.\n\n"
            "Răspunde STRICT cu JSON fără markdown:\n"
            '{"sand_kg": 18500, "sand_m3": 12.5, "cement_kg": 2400}'
        )

        content = None

        # 1. Încearcă Google Gemini dacă există cheie
        if gemini_key:
            # Modelul standard oficial GA este gemini-1.5-flash
            gemini_models = ["gemini-1.5-flash", "gemini-2.0-flash"]
            for model_name in gemini_models:
                try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={gemini_key}"
                    payload = {
                        "contents": [
                            {
                                "parts": [
                                    {"text": prompt_text},
                                    {
                                        "inline_data": {
                                            "mime_type": "image/jpeg",
                                            "data": base64_image
                                        }
                                    }
                                ]
                            }
                        ],
                        "generationConfig": {
                            "temperature": 0.1,
                            "responseMimeType": "application/json"
                        }
                    }
                    resp = requests.post(url, json=payload, timeout=20)
                    resp_data = resp.json()
                    if resp.status_code == 200 and "candidates" in resp_data:
                        content = resp_data["candidates"][0]["content"]["parts"][0]["text"]
                        break
                    else:
                        err_msg = resp_data.get("error", {}).get("message", resp.text)
                        print(f"⚠️ [OCR] Gemini ({model_name}) error: {err_msg}")
                except Exception as e_model:
                    print(f"⚠️ [OCR] Gemini exception with {model_name}: {e_model}")

        # 2. Fallback la OpenAI dacă Gemini nu a returnat conținut sau dacă e configurat OpenAI
        if not content and openai_key:
            try:
                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {openai_key}"
                }
                payload = {
                    "model": "gpt-4o",
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt_text},
                                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                            ]
                        }
                    ],
                    "response_format": {"type": "json_object"},
                    "max_tokens": 150
                }
                resp = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload, timeout=25)
                resp_data = resp.json()
                if "error" in resp_data:
                    raise Exception(resp_data["error"].get("message", str(resp_data)))
                content = resp_data["choices"][0]["message"]["content"]
            except Exception as e_oai:
                print(f"⚠️ [OCR] OpenAI exception: {e_oai}")

        if not content:
            raise Exception("Niciun model AI (Gemini / OpenAI) nu a returnat un răspuns valid.")

        # Extrage sigur blocul JSON
        json_match = re.search(r"\{.*?\}", content, re.DOTALL)
        if json_match:
            raw_parsed = json.loads(json_match.group(0))
        else:
            raw_parsed = json.loads(content.strip())

        sand_kg = parse_float_safe(raw_parsed.get("sand_kg"), is_kg=True)
        sand_m3 = parse_float_safe(raw_parsed.get("sand_m3"), is_kg=False)
        cement_kg = parse_float_safe(raw_parsed.get("cement_kg"), is_kg=True)

        return {
            "sand_kg": sand_kg,
            "sand_m3": sand_m3,
            "cement_kg": cement_kg,
            "status": "success"
        }

    except Exception as e:
        print(f"❌ [OCR] Eroare procesare ecran mașină: {e}")
        return {
            "sand_kg": None,
            "sand_m3": None,
            "cement_kg": None,
            "status": "error",
            "error": str(e)
        }

