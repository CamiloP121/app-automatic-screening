# API
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Sistema
from pathlib import Path
from modules.logger_config import logger

print("||||| start configuration ai_app |||||")

# db
from modules.models import db # DB

for folder in ["app-automatic-screening-volumen"]:
   Path(folder).mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title= "app-automatic-screening",
    description="""
    Aplicación screening automático NLP
    """,
    version="0.0.1"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permitir solicitudes desde cualquier origen
    allow_credentials=True,  # Permitir el envío de credenciales (cookies, auth headers, etc.)
    allow_methods=["*"],  # Permitir todos los métodos (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Permitir todos los headers
)

# Database
db.base.metadata.create_all(bind = db.engine)

print("||||| end configuration ai_app |||||")

@app.get("/lvz", summary="Verifica el estado del servidor", 
         description="Este endpoint retorna el estado actual del servidor")
def lvz():
    logger.debug("Server run")
    return {"status_server": "ok"}