from fastapi import FastAPI, Depends, Request
from fastapi.testclient import TestClient

app = FastAPI()

def my_dep(request: Request, x: int = 5):
    return request.headers.get("host")

@app.get("/")
def read_root(val: str = Depends(my_dep)):
    return {"host": val}

client = TestClient(app)
response = client.get("/")
print(response.status_code, response.json())
