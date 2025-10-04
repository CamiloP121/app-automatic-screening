# API
from fastapi import APIRouter, Form, Body
from fastapi import status, HTTPException

# General
from typing import List
from datetime import datetime
# Db
from modules.models import db, Users, Research

app_reseharch = APIRouter()

@app_reseharch.post("/create", summary="Registro de investigación", 
    description="Este endpoint permite registrar una nueva investigación en el sistema",
    tags = ["Research Management"])
def create(
    username: str = Form(..., description="Nombre de usuario que crea la investigación"),
    name: str = Form(..., description="Nombre de la investigación"),
    description: str = Form(None, description="Descripción de la investigación"),
    methodology: str = Form('Partial', description="Metodología a utilizar. Opciones: 'Full', 'Partial'"),
    criteria_inclusion: List[str] = Form(..., description="Lista de criterios de inclusión"),
    is_active: bool = Form(True, description="Estado activo o inactivo"),
    is_test: bool = Form(False, description="Indica si es investigación de prueba")
):
    # Verificar user
    user = Users.get_username(username)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Acceso denegado: el usuario no existe.")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El usuario está inactivo.")
    if user.role not in ['admin', 'researcher']:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El usuario no tiene permisos para crear investigaciones.")
    if Research.name_exists(name = name):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El nombre de la investigación ya existe.")
    # Generar un ID único
    research_id = Research.generate_unique_id()  

    dict_new = {
        "id": research_id,
        "name": name,
        "description": description,
        "created_at": datetime.now(),
        "methodology": methodology,
        "criteria_inclusion": "|&|".join(criteria_inclusion),
        "is_active": is_active,
        "is_test": is_test,
        "step": 'Create Research',
        "researcherOwnerId": username
    }

    try:
        Research.add(dict_new)
        db.session.commit()
        return {
            "message": "Research registered successfully", "id": research_id, "name": name}
    except Exception as e:
        db.session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail=f"Error al crear investigación: {str(e)}")