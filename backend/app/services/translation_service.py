import logging
import requests

logger = logging.getLogger(__name__)

def translate_text(text: str, target_lang: str, source_lang: str = 'auto') -> str:
    """
    Translates text to target_lang using direct Google Translate GTX API with deep_translator fallback.
    Case-insensitive: normalizes target_lang ('FR' -> 'fr', 'NL' -> 'nl').
    Returns the translated string, or the original text if all translation backends fail.
    """
    if not text or not text.strip():
        return text

    target = target_lang.lower().strip() if target_lang else 'fr'
    source = source_lang.lower().strip() if source_lang else 'auto'

    # Primary: fast googleapis GTX API
    try:
        url = 'https://translate.googleapis.com/translate_a/single'
        params = {
            'client': 'gtx',
            'sl': source,
            'tl': target,
            'dt': 't',
            'q': text
        }
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        r = requests.get(url, params=params, headers=headers, timeout=6)
        if r.status_code == 200:
            data = r.json()
            if data and isinstance(data, list) and len(data) > 0 and isinstance(data[0], list):
                translated_parts = [part[0] for part in data[0] if part and len(part) > 0 and part[0]]
                translated = ''.join(translated_parts).strip()
                if translated and not any(err in translated for err in ["Error 500", "Server Error", "That's an error"]):
                    return translated
    except Exception as e:
        logger.warning(f"googleapis translate failed for {target}: {e}")

    # Fallback: deep_translator
    try:
        from deep_translator import GoogleTranslator
        translated = GoogleTranslator(source=source, target=target).translate(text)
        if translated and not any(err in translated for err in ["Error 500", "Server Error", "That's an error"]):
            return translated
    except Exception as e:
        logger.warning(f"deep_translator fallback failed for {target}: {e}")

    return text
