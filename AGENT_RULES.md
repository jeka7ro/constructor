# AGENT RULES — Reguli de Bază
> Aceste reguli trebuie respectate ÎNTOTDEAUNA, fără excepție.

---

## 1. PORT LOCAL
- Aplicația pontaj rulează LOCAL **exclusiv pe portul `5678`**
- Nu deschide alt port (nu 6001, nu 5173, nu 8000) fără instrucțiune explicită
- Comanda corectă de pornire backend:
  ```bash
  "/Users/eugeniucazmal/Downloads/dev_office/Client B - pontaje/backend/venv/bin/python" \
    -m uvicorn main:app --host 0.0.0.0 --port 5678
  ```

---

## 2. GIT — REGULI STRICTE
- **NU face niciodată `git push`** fără să primești:
  1. Repo-ul exact (ex: `jeka7ro/constructor`)
  2. Confirmarea explicită de la utilizator
- **NU face `git commit`** fără instrucțiune explicită
- **NU face `git revert` / `git reset`** fără instrucțiune explicită
- Repo-ul corect pentru acest proiect: `https://github.com/jeka7ro/constructor`
- Repo-ul `jeka7ro/pontaj-digital` = GREȘIT pentru push-uri neautorizate

---

## 3. ACȚIUNI DISTRUCTIVE
- Orice acțiune care modifică git, șterge fișiere sau repornește servere = **cere confirmare ÎNAINTE**
- Dacă utilizatorul cere "dă-mi linkul" = înseamnă ARATĂ linkul, NU acționa

---

## 4. DACĂ NU ÎNȚELEGI
- **Întreabă** — nu presupune, nu acționa din proprie inițiativă
- Un singur mesaj de clarificare e mai bun decât o greșeală greu de reparat

---

## 5. PROIECT
- Folder activ: `/Users/eugeniucazmal/Downloads/dev_office/Client B - pontaje`
- UI Rules: vezi `frontend/UI_RULES.md`
- Backend: FastAPI + SQLAlchemy, port local 5678
- Frontend: React + Vite + Tailwind, dist servit de backend

---

## 6. PREVENIREA BUCLELOR ȘI A COSTURILOR API
- Agentul TREBUIE SĂ VERIFICE ÎNTOTDEAUNA existența buclelor infinite (în special dependențele hook-urilor `useEffect`) și posibilele bug-uri DUPĂ ORICE modificare sau adăugare de cod.
- Este OBLIGATORIE evitarea apelurilor automate (în loop) către API-uri cu plată (precum Google Maps Directions/Geocoding) la randarea paginilor.
- Aceste calcule trebuie legate exclusiv de butoane acționate manual de utilizator, pentru a păstra costurile la zero.
