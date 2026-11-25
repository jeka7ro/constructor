import logging
import requests
import re
import threading

logger = logging.getLogger(__name__)

_translation_cache = {}
_translation_lock = threading.Lock()
_http_session = requests.Session()
_http_session.headers.update({'User-Agent': 'Mozilla/5.0 (compatible; DavideChape/1.0)'})

def detect_source_lang(text: str, target_lang: str = None) -> str:
    """
    Heuristic source language detection for construction and customer chat messages.
    Supports Romanian, French, Italian, Dutch, German, and English.
    Never falsely returns target_lang when translating client messages to Romanian unless explicit Romanian markers exist.
    """
    if not text:
        return 'ro'
    t = text.lower().strip()

    # Distinct diacritics
    has_ro_diacritics = any(c in t for c in ['ă', 'â', 'î', 'ș', 'ț', 'ş', 'ţ'])
    if has_ro_diacritics:
        return 'ro'
    if any(c in t for c in ['é', 'è', 'ê', 'ë', 'ç', 'ù', 'œ', 'à', 'ô']):
        return 'fr'
    if any(c in t for c in ['ä', 'ö', 'ü', 'ß']):
        return 'de'

    words = set(re.findall(r'\b[a-zA-Z]+\b', t))
    if not words:
        return 'fr' if target_lang == 'ro' else 'ro'

    ro_words = {
        'buna', 'ziua', 'seara', 'dimineata', 'multumesc', 'multumim', 'rog', 'aveti', 'nevoie',
        'informatii', 'lucrare', 'sapa', 'izolatie', 'deviz', 'oferta', 'putem', 'venim', 'cand',
        'unde', 'cat', 'cum', 'pentru', 'despre', 'acest', 'este', 'sunt', 'daca', 'trimis',
        'salut', 'bine', 'ce', 'facem', 'mai', 'tot', 'am', 'ai', 'au', 'vom', 'echipa', 'maine',
        'azi', 'astazi', 'luni', 'marti', 'miercuri', 'joi', 'vineri', 'sambata', 'duminica',
        'ora', 'adresa', 'santier', 'confirm', 'reprogramare', 'factura', 'pret'
    }
    fr_words = {
        'bonjour', 'bonsoir', 'merci', 'devis', 'chape', 'isolation', 'vous', 'nous', 'votre',
        'notre', 'avec', 'pour', 'dans', 'sur', 'est', 'sont', 'une', 'des', 'les', 'oui', 'non',
        'quand', 'comment', 'combien', 'travaux', 'chantier', 'maison', 'parfait', 'mardi',
        'lundi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche', 'demain', 'matin',
        'soir', 'souci', 'pas', 'possible', 'heure', 'semaine', 'prochaine', 'cordialement',
        'bien', 'tout', 'pret', 'jour', 'date', 'adresse', 'facture', 'equipe', 'Bonjour'
    }
    it_words = {
        'buongiorno', 'buonasera', 'grazie', 'ciao', 'preventivo', 'lavoro', 'massetto',
        'isolamento', 'quando', 'dove', 'quanto', 'anche', 'della', 'delle', 'degli', 'nello',
        'nella', 'sono', 'siamo', 'posso', 'possiamo', 'vorrei', 'lei', 'giorno', 'domani'
    }
    nl_words = {
        'hallo', 'goedendag', 'goedemorgen', 'goedemiddag', 'dank', 'offerte', 'chape',
        'isolatie', 'wanneer', 'waar', 'hoeveel', 'graag', 'ons', 'jullie', 'kunnen', 'hebben',
        'zijn', 'voor', 'met', 'alstublieft', 'bedankt', 'werken', 'vloer', 'ligt', 'klaar',
        'volgende', 'week', 'morgen', 'uur', 'tot', 'goed', 'maandag', 'dinsdag', 'woensdag',
        'donderdag', 'vrijdag', 'zaterdag', 'zondag', 'werf', 'adres', 'factuur', 'datum', 'de', 'het', 'een'
    }
    en_words = {
        'hello', 'hi', 'thanks', 'thank', 'you', 'please', 'quote', 'screed', 'insulation',
        'when', 'where', 'how', 'need', 'information', 'about', 'would', 'could', 'work',
        'price', 'cost', 'can', 'we', 'for', 'reschedule', 'tomorrow', 'morning', 'monday',
        'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'ready', 'floor',
        'team', 'next', 'week', 'time', 'date', 'address', 'invoice', 'the', 'is', 'are'
    }

    scores = {
        'ro': len(words & ro_words) * 2,
        'fr': len(words & fr_words) * 2,
        'it': len(words & it_words) * 2,
        'nl': len(words & nl_words) * 2,
        'en': len(words & en_words) * 2
    }

    best = max(scores, key=scores.get)
    if scores[best] > 0:
        # If translating to 'ro' and another language tied with 'ro' without Romanian diacritics, prefer the foreign language
        if target_lang == 'ro' and best == 'ro' and not has_ro_diacritics:
            non_ro = {k: v for k, v in scores.items() if k != 'ro'}
            best_non_ro = max(non_ro, key=non_ro.get)
            if non_ro[best_non_ro] > 0:
                return best_non_ro
        return best

    # No keyword matched: if translating to Romanian, assume French (primary client language) so translation is not skipped
    if target_lang == 'ro':
        return 'fr'
    return 'ro'

def translate_text(text: str, target_lang: str, source_lang: str = 'auto') -> str:
    """
    Translates text to target_lang using Google GTX (with native sl=auto detection)
    and MyMemory API fallback with thread-safe caching.
    Returns the translated string, or the original text if all backends fail.
    """
    if not text or not text.strip():
        return text

    clean_text = text.strip()
    tgt = target_lang.lower().strip().split('-')[0] if target_lang else 'fr'
    explicit_src = source_lang.lower().strip().split('-')[0] if source_lang and source_lang != 'auto' else None
    detected_src = explicit_src or detect_source_lang(clean_text, target_lang=tgt)

    if explicit_src and explicit_src == tgt:
        return clean_text

    # Only skip translation if source is explicitly or unmistakably already in target_lang
    if not explicit_src and detected_src == tgt:
        if tgt == 'ro' and any(c in clean_text.lower() for c in ['ă', 'â', 'î', 'ș', 'ț', 'ş', 'ţ']):
            return clean_text

    cache_key = f"{explicit_src or 'auto'}_{tgt}_{clean_text}"

    with _translation_lock:
        if cache_key in _translation_cache:
            return _translation_cache[cache_key]

    # Primary: Google Translate GTX (supports native sl=auto across 100+ languages)
    try:
        url = 'https://translate.googleapis.com/translate_a/single'
        sl_param = explicit_src if explicit_src else 'auto'
        params = {'client': 'gtx', 'sl': sl_param, 'tl': tgt, 'dt': 't', 'q': clean_text}
        r = _http_session.get(url, params=params, timeout=4)
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
        logger.warning(f"googleapis GTX translate failed for {sl_param}->{tgt}: {e}")

    # Fallback 1: MyMemory API (requires explicit src|tgt pair)
    src = detected_src if detected_src != tgt else ('fr' if tgt == 'ro' else 'ro')
    try:
        url = 'https://api.mymemory.translated.net/get'
        params = {
            'q': clean_text,
            'langpair': f'{src}|{tgt}',
            'de': 'support@davidechape.be'
        }
        r = _http_session.get(url, params=params, timeout=6)
        if r.status_code == 200:
            res_data = r.json().get('responseData', {})
            trans = (res_data.get('translatedText') or '').strip()
            if trans and not any(warn in trans.upper() for warn in ['QUERY LENGTH', 'MYMEMORY WARNING', 'INVALID SOURCE', 'ERROR 500']):
                with _translation_lock:
                    _translation_cache[cache_key] = trans
                return trans
    except Exception as e:
        logger.warning(f"MyMemory translate failed for {src}->{tgt}: {e}")

    # Fallback 2: deep_translator MyMemory
    try:
        from deep_translator import MyMemoryTranslator
        src_tag = f"{src}-{src.upper()}"
        tgt_tag = f"{tgt}-{tgt.upper()}" if tgt != 'en' else 'en-US'
        translated = MyMemoryTranslator(source=src_tag, target=tgt_tag).translate(clean_text)
        if translated and not any(warn in translated.upper() for warn in ['QUERY LENGTH', 'MYMEMORY WARNING', 'INVALID SOURCE', 'ERROR 500']):
            with _translation_lock:
                _translation_cache[cache_key] = translated
            return translated
    except Exception as e:
        logger.warning(f"deep_translator MyMemory fallback failed for {src}->{tgt}: {e}")

    return text


def is_client_confirmation_message(text: str) -> bool:
    """
    Detects if an incoming client message (via WhatsApp or confirmation chat)
    is an affirmative confirmation of the scheduled work date / site readiness.
    Supports French, Dutch, English, and Romanian.
    Carefully excludes questions or messages containing negations / reschedule requests.
    """
    if not text or not text.strip():
        return False

    raw = text.strip()
    if '?' in raw:
        return False

    # Direct affirmative emoji message
    if raw in {'👍', '👍🏻', '👍🏼', '👍🏽', '✅', '☑️', '✔️', '👌', '🙏'}:
        return True

    import unicodedata
    norm = unicodedata.normalize('NFD', raw.lower())
    norm = ''.join(c for c in norm if unicodedata.category(c) != 'Mn')

    # Exclude any message with negation or rescheduling intent
    neg_pattern = (
        r"\b(non|pas|ne|jamais|annul\w*|report\w*|chang\w*|autre|impossible|attend\w*|retard\w*|"
        r"niet|geen|nee|helaas|uitstel\w*|verplaats\w*|ander\w*|onmogelijk|"
        r"not|no|cannot|can't|dont|don't|cancel\w*|reschedul\w*|postpon\w*|later|"
        r"nu|amana\w*|reprogram\w*|schimb\w*|imposibil)\b"
    )
    if re.search(neg_pattern, norm):
        return False

    # Explicit confirmation phrases or short affirmative replies
    confirm_pattern = (
        r"\b(je confirme|nous confirmons|confirme|c'est bon|c est bon|d'accord|d accord|dacord|"
        r"oui|ok|okay|parfait|tres bien|ca marche|entendu|bien recu|chantier est pret|chantier pret|tout est pret|"
        r"ja|in orde|akkoord|ik bevestig|wij bevestigen|bevestigd|bevestig|prima|goed|klopt|werf is klaar|alles is klaar|"
        r"yes|i confirm|we confirm|confirmed|confirm|all good|sounds good|site is ready|ready|"
        r"da|confirm|confirmam|de acord|este gata|santierul este gata)\b"
    )
    if re.search(confirm_pattern, norm):
        return True

    if any(em in raw for em in ('👍', '✅', '☑️', '✔️')):
        return True

    return False


def mark_work_order_reminder_confirmed(wo, db, source: str = "message", detail: str = "") -> bool:
    """
    Marks a work order's scheduled date reminder as confirmed by the client,
    persisting the timestamp in wo.prices['reminder_confirmed_at'], wo.date_history, and wo.date_confirmed_at.
    """
    if not wo:
        return False
    try:
        from datetime import datetime
        from sqlalchemy.orm.attributes import flag_modified
        from app.models import WorkOrderMessage

        now_dt = datetime.utcnow()
        now_iso = now_dt.isoformat() + "Z"

        prices_dict = dict(wo.prices or {})
        already_confirmed = bool(prices_dict.get("reminder_confirmed_at"))
        prices_dict["reminder_confirmed_at"] = now_iso
        wo.prices = prices_dict
        flag_modified(wo, "prices")

        wo.date_confirmed_at = now_dt

        hist = list(wo.date_history) if isinstance(wo.date_history, list) else []
        hist.append({
            "action": "confirmed_by_client_message" if source == "message" else "confirmed_by_client",
            "timestamp": now_iso,
            "source": source,
            "detail": (detail or "")[:120]
        })
        wo.date_history = hist
        flag_modified(wo, "date_history")

        if not already_confirmed:
            date_label = wo.start_date.strftime('%d/%m/%Y') if hasattr(wo.start_date, 'strftime') and wo.start_date else (str(wo.start_date or '').split('T')[0] or '')
            sys_msg = WorkOrderMessage(
                work_order_id=wo.id,
                sender="system",
                message=f"✅ Clientul a confirmat data lucrării ({date_label}) prin {('mesaj' if source in ('message', 'whatsapp') else 'link')}.",
                is_read_by_admin=False
            )
            db.add(sys_msg)

        db.commit()

        if not already_confirmed:
            try:
                from app.services.whatsapp_service import send_admin_date_confirmed_whatsapp
                send_admin_date_confirmed_whatsapp(
                    wo=wo,
                    confirmation_source=source,
                    client_reply_text=detail
                )
            except Exception as wa_err:
                logger.warning(f"Failed to send admin group date confirmed WhatsApp: {wa_err}")

        return True
    except Exception as e:
        logger.error(f"Failed to mark work order reminder confirmed for {getattr(wo, 'id', None)}: {e}")
        return False
