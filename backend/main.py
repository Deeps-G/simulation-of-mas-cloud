from fastapi import FastAPI
from controller import run_system
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Query
from fastapi import WebSocket
import asyncio
from controller import run_system

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/health")
def health():
    return {"status": "ok"}
@app.get("/metrics")
def metrics():
    return {
        "instances": 3,
        "cpu": 55,
        "traffic": 120
    }

last_result = None

@app.websocket("/stream")
async def stream_metrics(websocket: WebSocket):
    global last_result
    await websocket.accept()

    while True:
        last_result = run_system("ml")
        await websocket.send_json(last_result)
        await asyncio.sleep(2)
@app.get("/run-system")
def run(mode: str = Query(default="ml", pattern="^(ml|rl|heuristic)$")):

    result = run_system(mode=mode)

    return result