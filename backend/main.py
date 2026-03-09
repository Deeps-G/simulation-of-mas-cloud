from fastapi import FastAPI
from controller import run_system
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Query

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/run-system")
def run(mode: str = Query(default="ml", pattern="^(ml|rl|heuristic)$")):

    result = run_system(mode=mode)

    return result