from fastapi import FastAPI, Request
from fastapi.testclient import TestClient

app = FastAPI()

@app.get("/")
def read_root(request: Request):
    return dict(request.headers)

client = TestClient(app)
print(client.get("/").json())
