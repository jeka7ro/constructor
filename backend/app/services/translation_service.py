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


_MONTH_MAP = {
    'ian': 1, 'ianuarie': 1, 'jan': 1, 'janv': 1, 'janvier': 1, 'januari': 1, 'january': 1,
    'feb': 2, 'febr': 2, 'februarie': 2, 'fev': 2, 'fevr': 2, 'fevrier': 2, 'februari': 2, 'february': 2,
    'mar': 3, 'mart': 3, 'martie': 3, 'mars': 3, 'mrt': 3, 'maart': 3, 'march': 3,
    'apr': 4, 'aprilie': 4, 'avr': 4, 'avril': 4, 'april': 4,
    'mai': 5, 'mei': 5, 'may': 5,
    'iun': 6, 'iunie': 6, 'juin': 6, 'jun': 6, 'juni': 6, 'june': 6,
    'iul': 7, 'iulie': 7, 'juil': 7, 'juillet': 7, 'jul': 7, 'juli': 7, 'july': 7,
    'aug': 8, 'august': 8, 'aout': 8, 'augustus': 8,
    'sep': 9, 'sept': 9, 'septembrie': 9, 'septembre': 9, 'september': 9,
    'oct': 10, 'octombrie': 10, 'octobre': 10, 'okt': 10, 'oktober': 10, 'october': 10,
    'nov': 11, 'noi': 11, 'noiembrie': 11, 'novembre': 11, 'november': 11,
    'dec': 12, 'decembrie': 12, 'decembre': 12, 'december': 12,
}


def extract_natural_date(text: str, ref_year: int = None, ref_month: int = None):
    """
    Extracts a natural date from client text supporting:
    - Numeric with dot, slash, or dash: '28.11', '28.11.2026', '28/11', '28/11/26', '28-11-2026', '02.12'
    - Day + month name/abbreviation (FR/NL/EN/RO): '28 nov', '2 dec', '15 ian', '5 janvier', '12 december'
    - Month name + day: 'nov 28', 'dec 2'
    Returns (iso_date_str 'YYYY-MM-DD', display_date_str 'DD/MM/YYYY') or (None, None).
    """
    if not text or not text.strip():
        return None, None

    from datetime import datetime
    import unicodedata

    now = datetime.utcnow()
    base_year = ref_year or now.year
    base_month = ref_month or now.month

    norm = unicodedata.normalize('NFD', text.lower())
    norm = ''.join(c for c in norm if unicodedata.category(c) != 'Mn')

    def _build_valid_date(day_val: int, month_val: int, year_raw: str = None):
        if not (1 <= month_val <= 12 and 1 <= day_val <= 31):
            return None, None
        if year_raw:
            y = int(year_raw)
            if y < 100:
                y += 2000
        else:
            y = base_year
            if base_month >= 10 and month_val <= 3:
                y = base_year + 1
        try:
            dt = datetime(y, month_val, day_val)
            return dt.strftime('%Y-%m-%d'), dt.strftime('%d/%m/%Y')
        except ValueError:
            return None, None

    # 1. Check Day + Month Name (e.g., "28 nov", "2.dec", "15 ian 2027", "1er decembre")
    month_keys_pattern = '|'.join(sorted(_MONTH_MAP.keys(), key=len, reverse=True))
    m1 = re.search(
        rf'\b(\d{{1,2}})\s*(?:er|e|ste|de|th|st|nd|rd)?\s*[\.\-/]?\s*\b({month_keys_pattern})\.?(?:\s*[\.\-/]?\s*(20\d{{2}}|\d{{2}}))?\b',
        norm
    )
    if m1:
        d_val = int(m1.group(1))
        m_val = _MONTH_MAP.get(m1.group(2))
        y_raw = m1.group(3)
        iso_d, disp_d = _build_valid_date(d_val, m_val, y_raw)
        if iso_d:
            return iso_d, disp_d

    # 2. Check Month Name + Day (e.g., "nov 28", "dec 2")
    m2 = re.search(
        rf'\b({month_keys_pattern})\.?\s*(\d{{1,2}})(?:\s*[\.\-,/]?\s*(20\d{{2}}|\d{{2}}))?\b',
        norm
    )
    if m2:
        m_val = _MONTH_MAP.get(m2.group(1))
        d_val = int(m2.group(2))
        y_raw = m2.group(3)
        iso_d, disp_d = _build_valid_date(d_val, m_val, y_raw)
        if iso_d:
            return iso_d, disp_d

    # 3. Check Numeric DD.MM(.YYYY), DD/MM(/YYYY), DD-MM(-YYYY)
    m3 = re.search(r'\b(\d{1,2})[\./\-](\d{1,2})(?:[\./\-](20\d{2}|\d{2}))?\b', norm)
    if m3:
        d_val = int(m3.group(1))
        m_val = int(m3.group(2))
        y_raw = m3.group(3)
        iso_d, disp_d = _build_valid_date(d_val, m_val, y_raw)
        if iso_d:
            return iso_d, disp_d

    return None, None


def parse_client_reminder_reply(text: str, ref_date=None) -> dict:
    """
    Classifies a client's reply to a work order reminder into one of 3 intents:
    - 'confirm': Client confirmed the scheduled date (e.g. 'OK', 'Oui', 'Ja')
    - 'reschedule': Client requested another date (e.g. 'REPORT 28.11', 'VERPLAATSEN 2 dec', '28/11', 'Pas prêt')
    - 'cancel': Client requested cancellation (e.g. 'ANNULER', 'ANNULEREN', 'CANCEL')
    - None: Normal chat message not matching reminder actions
    """
    if not text or not text.strip():
        return {"intent": None, "requested_date": None, "requested_date_display": None}

    raw = text.strip()
    import unicodedata
    norm = unicodedata.normalize('NFD', raw.lower())
    norm = ''.join(c for c in norm if unicodedata.category(c) != 'Mn')

    ref_year = None
    ref_month = None
    if ref_date:
        try:
            parts = str(ref_date).split('T')[0].split('-')
            if len(parts) == 3:
                ref_year = int(parts[0])
                ref_month = int(parts[1])
        except Exception:
            pass

    iso_date, disp_date = extract_natural_date(raw, ref_year=ref_year, ref_month=ref_month)

    # 1. Explicit Cancel intent
    cancel_pattern = r'\b(annul\w*|anulare|anulez|anulam|cancel\w*|storn\w*)\b'
    if re.search(cancel_pattern, norm) and not iso_date:
        return {"intent": "cancel", "requested_date": None, "requested_date_display": None}

    # 2. Explicit Reschedule keyword or a new date provided
    resched_pattern = (
        r'\b(report\w*|verplaats\w*|uitstel\w*|reschedul\w*|reprogram\w*|muta\w*|schimb\w*|'
        r'changer|postpon\w*|autre date|andere datum|other date|pas pret|niet klaar|not ready|nu e gata|nu este gata)\b'
    )
    has_resched_kw = bool(re.search(resched_pattern, norm))

    if has_resched_kw or iso_date:
        # If only a date was written (or REPORT + date), treat as reschedule if it has resched keyword or isn't an explicit "OK for <current_date>"
        ref_iso = str(ref_date).split('T')[0] if ref_date else None
        if has_resched_kw or (iso_date and iso_date != ref_iso):
            return {
                "intent": "reschedule",
                "requested_date": iso_date,
                "requested_date_display": disp_date
            }

    # 3. Confirm intent
    if is_client_confirmation_message(raw):
        return {"intent": "confirm", "requested_date": None, "requested_date_display": None}

    return {"intent": None, "requested_date": None, "requested_date_display": None}


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
        prices_dict.pop("reminder_issue_type", None)
        prices_dict.pop("reminder_requested_date", None)
        prices_dict.pop("reminder_issue_message", None)
        wo.prices = prices_dict
        flag_modified(wo, "prices")

        wo.date_confirmed_at = now_dt
        wo.reschedule_requested = False

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
                from app.services.whatsapp_service import send_admin_date_confirmed_whatsapp, send_chat_text_whatsapp
                send_admin_date_confirmed_whatsapp(
                    wo=wo,
                    confirmation_source=source,
                    client_reply_text=detail
                )
                # Send polite auto-acknowledgement to client on WhatsApp when they confirm via WhatsApp
                client_phone = getattr(wo, "client_phone", None) or (wo.client.phone if getattr(wo, "client", None) else None)
                if source == "whatsapp" and client_phone:
                    c_lang = (getattr(wo, "client_language", None) or "fr").lower().split("-")[0].strip()
                    d_lbl = wo.start_date.strftime('%d/%m/%Y') if hasattr(wo.start_date, 'strftime') and wo.start_date else (str(wo.start_date or '').split('T')[0] or '')
                    if c_lang == "nl":
                        ack_msg = f"✅ Bedankt ! Uw uitvoeringsdatum ({d_lbl}) is goed bevestigd.\n\nMet vriendelijke groet,\nHet Davide Chape Team"
                    elif c_lang == "en":
                        ack_msg = f"✅ Thank you! Your scheduled date ({d_lbl}) is confirmed.\n\nBest regards,\nThe Davide Chape Team"
                    else:
                        ack_msg = f"✅ Merci ! Votre date d'intervention ({d_lbl}) est bien confirmée.\n\nCordialement,\nL'équipe Davide Chape"
                    send_chat_text_whatsapp(client_phone, ack_msg)
            except Exception as wa_err:
                logger.warning(f"Failed to send admin group date confirmed WhatsApp: {wa_err}")

        return True
    except Exception as e:
        logger.error(f"Failed to mark work order reminder confirmed for {getattr(wo, 'id', None)}: {e}")
        return False


def mark_work_order_reminder_issue(
    wo,
    db,
    issue_type: str = "reschedule",
    requested_date_iso: str = None,
    requested_date_display: str = None,
    client_message: str = "",
    source: str = "whatsapp"
) -> bool:
    """
    Handles a client's reschedule ('REPORT 28.11') or cancellation ('ANNULER') reply:
    1. Flags the work order in wo.prices ('reminder_issue_type', 'reminder_requested_date', 'reminder_issue_message')
       and wo.reschedule_requested = True so the Calendar card shows the red/amber warning icon.
    2. Replies automatically to the client on WhatsApp confirming receipt and asking them to wait for team confirmation.
    3. Sends a clear alert to the company WhatsApp group with the client's requested date / cancellation.
    """
    if not wo:
        return False
    try:
        from datetime import datetime
        from sqlalchemy.orm.attributes import flag_modified
        from app.models import WorkOrderMessage

        now_dt = datetime.utcnow()
        now_iso = now_dt.isoformat() + "Z"

        prices_dict = dict(wo.prices or {}) if isinstance(wo.prices, dict) else {}
        prices_dict.pop("reminder_confirmed_at", None)
        prices_dict["reminder_issue_type"] = issue_type
        prices_dict["reminder_issue_at"] = now_iso
        prices_dict["reminder_issue_message"] = (client_message or "").strip()[:200]
        if requested_date_display:
            prices_dict["reminder_requested_date"] = requested_date_display
        elif requested_date_iso:
            prices_dict["reminder_requested_date"] = requested_date_iso
        else:
            prices_dict.pop("reminder_requested_date", None)

        wo.prices = prices_dict
        flag_modified(wo, "prices")

        wo.reschedule_requested = True
        wo.reschedule_reason = (
            f"Data dorită: {requested_date_display} — {client_message}"
            if requested_date_display
            else (client_message or ("Cerere de anulare" if issue_type == "cancel" else "Cerere de reprogramare"))
        )
        if requested_date_iso:
            try:
                wo.reschedule_requested_date = datetime.strptime(requested_date_iso, "%Y-%m-%d").date()
            except Exception:
                pass

        hist = list(wo.date_history) if isinstance(wo.date_history, list) else []
        hist.append({
            "action": "cancel_requested_by_client" if issue_type == "cancel" else "reschedule_requested_by_client",
            "timestamp": now_iso,
            "requested_date": requested_date_display or requested_date_iso,
            "source": source,
            "detail": (client_message or "")[:120]
        })
        wo.date_history = hist
        flag_modified(wo, "date_history")

        if issue_type == "cancel":
            sys_text = f"🚨 Clientul a solicitat ANULAREA lucrării: \"{client_message}\""
        else:
            req_part = f" pentru data de {requested_date_display}" if requested_date_display else ""
            sys_text = f"⚠️ Clientul a solicitat REPROGRAMAREA lucrării{req_part} (în așteptarea confirmării echipei): \"{client_message}\""

        sys_msg = WorkOrderMessage(
            work_order_id=wo.id,
            sender="system",
            message=sys_text,
            is_read_by_admin=False
        )
        db.add(sys_msg)
        db.commit()

        # 1. Send automatic acknowledgement to the client on WhatsApp
        client_phone = getattr(wo, "client_phone", None) or (wo.client.phone if getattr(wo, "client", None) else None)
        if source == "whatsapp" and client_phone:
            try:
                from app.services.whatsapp_service import send_chat_text_whatsapp
                c_lang = (getattr(wo, "client_language", None) or "fr").lower().split("-")[0].strip()
                if issue_type == "cancel":
                    if c_lang == "nl":
                        reply_txt = "❌ Uw annuleringsverzoek is goed ontvangen en doorgestuurd naar ons team. Wij nemen zo snel mogelijk contact met u op.\n\nMet vriendelijke groet,\nHet Davide Chape Team"
                    elif c_lang == "en":
                        reply_txt = "❌ Your cancellation request has been received and forwarded to our team. We will contact you shortly.\n\nBest regards,\nThe Davide Chape Team"
                    else:
                        reply_txt = "❌ Votre demande d'annulation a bien été reçue et transmise à notre équipe. Nous vous recontacterons dans les plus brefs délais.\n\nCordialement,\nL'équipe Davide Chape"
                else:
                    if c_lang == "nl":
                        d_part = f" naar {requested_date_display}" if requested_date_display else ""
                        reply_txt = f"📅 Uw aanvraag tot verplaatsing{d_part} is goed geregistreerd.\n⏳ Gelieve te wachten op de bevestiging van ons team — wij controleren de planning en bevestigen uw nieuwe datum zo snel mogelijk.\n\nMet vriendelijke groet,\nHet Davide Chape Team"
                    elif c_lang == "en":
                        d_part = f" to {requested_date_display}" if requested_date_display else ""
                        reply_txt = f"📅 Your reschedule request{d_part} has been registered.\n⏳ Please wait for our team's confirmation — we are checking the schedule and will confirm your new date shortly.\n\nBest regards,\nThe Davide Chape Team"
                    else:
                        d_part = f" pour le {requested_date_display}" if requested_date_display else ""
                        reply_txt = f"📅 Votre demande de report{d_part} a bien été enregistrée.\n⏳ Veuillez attendre la confirmation de notre équipe — nous vérifions le planning et vous confirmerons la nouvelle date dans les plus brefs délais.\n\nCordialement,\nL'équipe Davide Chape"
                send_chat_text_whatsapp(client_phone, reply_txt)
            except Exception as ack_err:
                logger.warning(f"Failed sending WhatsApp auto-reply for reminder issue: {ack_err}")

        # 2. Send clear alert to the company WhatsApp group
        try:
            from app.services.whatsapp_service import send_admin_reminder_issue_whatsapp
            send_admin_reminder_issue_whatsapp(
                wo=wo,
                issue_type=issue_type,
                requested_date_display=requested_date_display,
                client_reply_text=client_message,
                source=source
            )
        except Exception as grp_err:
            logger.warning(f"Failed sending admin group alert for reminder issue: {grp_err}")

        return True
    except Exception as e:
        logger.error(f"Failed to mark work order reminder issue for {getattr(wo, 'id', None)}: {e}")
        return False
