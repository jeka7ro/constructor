import logging
import requests
import re
import threading

logger = logging.getLogger(__name__)

_translation_cache = {}
_translation_lock = threading.Lock()

def detect_source_lang(text: str) -> str:
    """
    Heuristic source language detection for construction and customer chat messages.
    Supports Romanian, French, Italian, Dutch, German, and English.
    Defaults to Romanian for admin messages.
    """
    if not text:
        return 'ro'
    t = text.lower().strip()

    # Distinct diacritics
    if any(c in t for c in ['ă', 'â', 'î', 'ș', 'ț', 'ş', 'ţ']):
        return 'ro'
    if any(c in t for c in ['é', 'è', 'ê', 'ë', 'ç', 'ù', 'œ', 'à', 'ô']):
        return 'fr'
    if any(c in t for c in ['ä', 'ö', 'ü', 'ß']):
        return 'de'

    words = set(re.findall(r'\b[a-zA-Z]+\b', t))
    if not words:
        return 'ro'

    ro_words = {'buna', 'ziua', 'seara', 'multumesc', 'multumim', 'rog', 'aveti', 'nevoie', 'informatii', 'lucrare', 'sapa', 'izolatie', 'deviz', 'oferta', 'putem', 'venim', 'cand', 'unde', 'cat', 'cum', 'pentru', 'despre', 'acest', 'este', 'sunt', 'daca', 'trimis', 'salut', 'bine', 'ce', 'facem', 'mai', 'tot', 'am', 'ai', 'au', 'vom'}
    fr_words = {'bonjour', 'bonsoir', 'merci', 'devis', 'chape', 'isolation', 'vous', 'nous', 'votre', 'notre', 'avec', 'pour', 'dans', 'sur', 'est', 'sont', 'une', 'des', 'les', 'oui', 'non', 'quand', 'comment', 'combien', 'travaux', 'chantier', 'maison'}
    it_words = {'buongiorno', 'buonasera', 'grazie', 'ciao', 'preventivo', 'lavoro', 'massetto', 'isolamento', 'quando', 'dove', 'quanto', 'anche', 'della', 'delle', 'degli', 'nello', 'nella', 'sono', 'siamo', 'posso', 'possiamo', 'vorrei', 'lei', 'giorno'}
    nl_words = {'hallo', 'goedendag', 'dank', 'offerte', 'chape', 'isolatie', 'wanneer', 'waar', 'hoeveel', 'graag', 'ons', 'jullie', 'kunnen', 'hebben', 'zijn', 'voor', 'met', 'alstublieft', 'bedankt', 'werken'}
    en_words = {'hello', 'hi', 'thanks', 'thank', 'you', 'please', 'quote', 'screed', 'insulation', 'when', 'where', 'how', 'need', 'information', 'about', 'would', 'could', 'work', 'price', 'cost'}

    scores = {
        'ro': len(words & ro_words) * 2,
        'fr': len(words & fr_words) * 2,
        'it': len(words & it_words) * 2,
        'nl': len(words & nl_words) * 2,
        'en': len(words & en_words) * 2
    }

    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else 'ro'

def translate_text(text: str, target_lang: str, source_lang: str = 'auto') -> str:
    """
    Translates text to target_lang using MyMemory API with thread-safe caching and deep_translator fallback.
    Prevents Google Cloud 429 blocks.
    Returns the translated string, or the original text if all backends fail.
    """
    if not text or not text.strip():
        return text

    tgt = target_lang.lower().strip().split('-')[0] if target_lang else 'fr'
    src = source_lang.lower().strip().split('-')[0] if source_lang and source_lang != 'auto' else detect_source_lang(text)

    if src == tgt:
        return text.strip()

    cache_key = f"{src}_{tgt}_{text.strip()}"

    with _translation_lock:
        if cache_key in _translation_cache:
            return _translation_cache[cache_key]

    # Primary: MyMemory API (fast, reliable, free, non-blocked)
    try:
        url = 'https://api.mymemory.translated.net/get'
        params = {
            'q': text.strip(),
            'langpair': f'{src}|{tgt}',
            'de': 'support@davidechape.be'
        }
        headers = {'User-Agent': 'DavideChape/1.0'}
        r = requests.get(url, params=params, headers=headers, timeout=6)
        if r.status_code == 200:
            res_data = r.json().get('responseData', {})
            trans = (res_data.get('translatedText') or '').strip()
            if trans and not any(warn in trans.upper() for warn in ['QUERY LENGTH', 'MYMEMORY WARNING', 'INVALID SOURCE', 'ERROR 500']):
                with _translation_lock:
                    _translation_cache[cache_key] = trans
                return trans
    except Exception as e:
        logger.warning(f"MyMemory translate failed for {src}->{tgt}: {e}")

    # Fallback 1: deep_translator MyMemory
    try:
        from deep_translator import MyMemoryTranslator
        src_tag = f"{src}-{src.upper()}"
        tgt_tag = f"{tgt}-{tgt.upper()}" if tgt != 'en' else 'en-US'
        translated = MyMemoryTranslator(source=src_tag, target=tgt_tag).translate(text.strip())
        if translated and not any(warn in translated.upper() for warn in ['QUERY LENGTH', 'MYMEMORY WARNING', 'INVALID SOURCE', 'ERROR 500']):
            with _translation_lock:
                _translation_cache[cache_key] = translated
            return translated
    except Exception as e:
        logger.warning(f"deep_translator MyMemory fallback failed for {src}->{tgt}: {e}")

    # Fallback 2: googleapis GTX (if unblocked)
    try:
        url = 'https://translate.googleapis.com/translate_a/single'
        params = {'client': 'gtx', 'sl': src, 'tl': tgt, 'dt': 't', 'q': text}
        headers = {'User-Agent': 'Mozilla/5.0'}
        r = requests.get(url, params=params, headers=headers, timeout=4)
        if r.status_code == 200:
            data = r.json()
            if data and isinstance(data, list) and len(data) > 0 and isinstance(data[0], list):
                translated_parts = [part[0] for part in data[0] if part and len(part) > 0 and part[0]]
                translated = ''.join(translated_parts).strip()
                if translated and not any(err in translated for err in ["Error 500", "Server Error", "That's an error"]):
                    with _translation_lock:
                        _translation_cache[cache_key] = translated
                    return translated
    except Exception as e:
        logger.warning(f"googleapis fallback failed: {e}")

    return text
