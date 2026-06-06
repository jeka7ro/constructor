import os
import json
import base64

def encode_image_to_base64(image_path: str) -> str:
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def extract_machine_screen_data(image_path: str = None, image_bytes: bytes = None):
    """
    Extracts 'Zand' (Sand) and 'Cement' values from a Bremat machine screen photo.
    Returns a dict with: sand_kg, cement_kg.
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    
    # MOCK MODE (daca nu exista cheie API configurata)
    if not api_key:
        print("🤖 [OCR] MOCK MODE: Returnam valori simulate pentru ecran Bremat.")
        return {
            "sand_kg": 19562,
            "cement_kg": 2306,
            "status": "mock"
        }
        
    try:
        import requests
        if image_bytes:
            base64_image = base64.b64encode(image_bytes).decode('utf-8')
        else:
            base64_image = encode_image_to_base64(image_path)
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }

        payload = {
            "model": "gpt-4o",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Extrage exact numerele pentru 'Zand' (kg) și 'Cement' (kg) afișate pe acest ecran de mașină Bremat. Răspunde strict cu un JSON valid fără markdown: {\"sand_kg\": 123, \"cement_kg\": 456}."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            "max_tokens": 100
        }

        response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
        data = response.json()
        content = data['choices'][0]['message']['content']
        # remove markdown backticks if any
        if content.startswith("```json"):
            content = content[7:-3]
        elif content.startswith("```"):
            content = content[3:-3]
            
        parsed = json.loads(content.strip())
        parsed["status"] = "success"
        return parsed

    except Exception as e:
        print(f"❌ [OCR] Eroare la OpenAI: {e}")
        return {"sand_kg": None, "cement_kg": None, "status": "error", "error": str(e)}
