# API
from fastapi import APIRouter, Form
from fastapi import status, HTTPException

# General
from typing import List
from datetime import datetime
# Db
from modules.models import db, Users, Research

app_research = APIRouter()

@app_research.post("/create", summary="Registro de investigación", 
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
    
# Actualizar investigación
@app_research.put("/update", summary="Actualizar investigación", description="Actualiza los datos de una investigación por id")
def update_research(
    username: str = Form(..., description="Nombre de usuario que solicita la actualización"),
    research_id: str = Form(..., description="ID de la investigación"),
    name: str = Form(None, description="Nuevo nombre de la investigación"),
    description: str = Form(None, description="Nueva descripción"),
    methodology: str = Form(None, description="Nueva metodología"),
    criteria_inclusion: List[str] = Form(None, description="Nuevos criterios de inclusión"),
    is_test: bool = Form(None, description="Indica si es investigación de prueba")
):
    user = Users.get_username(username)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El usuario está inactivo.")
    research = Research.get_id(research_id)
    if not research:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigación no encontrada.")
    if user.role not in ['admin', 'researcher'] and research.researcherOwnerId != username:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permisos para actualizar esta investigación.")
    try:
        request_data = {
            "name": name,
            "description": description,
            "methodology": methodology,
            "criteria_inclusion": "|&|".join(criteria_inclusion) if criteria_inclusion else None,
            "is_test": is_test
        }
        dict_update = {param: value for param, value in request_data.items() if value is not None and (not isinstance(value, str) or value.strip() != "")}
        Research.update(research_id, dict_update)
        db.session.commit()
        return {"message": "Investigación actualizada", "id": research_id}
    except Exception as e:
        db.session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error al actualizar investigación: {str(e)}")

# Obtener investigaciones
@app_research.post("/get-research", summary="Obtener investigaciones", description="Obtiene las investigaciones del usuario")
def get_research(username: str = Form(..., description="Nombre de usuario")):
    user = Users.get_username(username)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El usuario está inactivo.")
    try:
        if user.role == "admin":
            researches = Research.get_all()
        else:
            researches = Research.get_by_owner(username)
            
        return {"researches": researches}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error al obtener investigaciones: {str(e)}")

# Inactivar investigación
@app_research.post("/inactivate", summary="Inactivar investigación", description="Desactiva una investigación")
def inactivate_research(username: str = Form(..., description="Nombre de usuario"), 
                        research_id: str = Form(..., description="ID de la investigación")):
    user = Users.get_username(username)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El usuario está inactivo.")
    research = Research.get_id(research_id)
    if not research:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigación no encontrada.")
    try:
        Research.update(research_id, {"is_active": False})
        db.session.commit()
        return {"message": "Investigación inactivada", "id": research_id}
    except Exception as e:
        db.session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error al inactivar investigación: {str(e)}")

# Activar investigación
@app_research.post("/activate", summary="Activar investigación", description="Activa una investigación")
def activate_research(username: str = Form(..., description="Nombre de usuario"), 
                      research_id: str = Form(..., description="ID de la investigación")):
    user = Users.get_username(username)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El usuario está inactivo.")
    research = Research.get_id(research_id)
    if not research:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigación no encontrada.")
    try:
        Research.update(research_id, {"is_active": True})
        db.session.commit()
        return {"message": "Investigación activada", "id": research_id}
    except Exception as e:
        db.session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error al activar investigación: {str(e)}")