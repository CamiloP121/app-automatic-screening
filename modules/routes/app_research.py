# API
from fastapi import APIRouter, Form, Body
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
def create_research(
    username: str = Form(..., description="Nombre de usuario que crea la investigación"),
    title: str = Form(..., description="Título de la investigación"),
    type_research: str = Form(..., description="Tipo de investigación"),
    methodology: str = Form('Partial', description="Metodología a utilizar. Opciones: 'Full', 'Partial'"),
    criteria_inclusion: List[str] = Body(..., description="Lista de criterios de inclusión"),
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
    if Research.title_exists_by_user(title, username):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El título de la investigación ya existe.")
    # Generar un ID único
    research_id = Research.generate_unique_id()  

    save_criteria_inclusion = "|&|".join(criteria_inclusion[0].split(',')) if criteria_inclusion else None
    
    dict_new = {
        "id": research_id,
        "title": title,
        "type_research": type_research,
        "criteria_inclusion": save_criteria_inclusion,
        "methodology": methodology,
        "is_active": is_active,
        "is_test": is_test,
        "step": 'Create Research',
        "researcherOwnerId": username
    }

    try:
        Research.add(dict_new)
        db.session.commit()
        return {
            "message": "Research registered successfully", "id": research_id, "title": title}
    except Exception as e:
        db.session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail=f"Error al crear investigación: {str(e)}")
    
# Actualizar investigación
@app_research.put("/update", summary="Actualizar investigación", description="Actualiza los datos de una investigación por id")
def update_research(
    username: str = Form(..., description="Nombre de usuario que solicita la actualización"),
    research_id: str = Form(..., description="ID de la investigación"),
    title: str = Form(None, description="Nuevo título de la investigación"),
    type_research: str = Form(None, description="Nuevo tipo de investigación"),
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
            "title": title,
            "type_research": type_research,
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
@app_research.post("/get-research-user", summary="Obtener investigaciones de un usuario", description="Obtiene las investigaciones del usuario")
def get_research_by_user(username: str = Form(..., description="Nombre de usuario")):
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
    
# Obtener investigaciones
@app_research.post("/get-research", summary="Obtener investigación", description="Obtiene las investigaciones del usuario")
def get_research(username: str = Form(..., description="Nombre de usuario"),
                research_id: str = Form(..., description="ID de la investigación")):
    user = Users.get_username(username)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El usuario está inactivo.")
    try:
        
        research = Research.get_id(research_id)
        if not research:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigación no encontrada.")
        
        if not research.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="La investigación está inactiva.")
        
        info_research = {
            "id": research.id,
            "title": research.title,
            "type_research": research.type_research,
            "methodology": 'Automatizada' if research.methodology == 'Full' else 'Semi automatizada',
            "criteria_inclusion": research.criteria_inclusion.split("|&|") if research.criteria_inclusion else [],
            "created_at": research.created_at,
            "updated_at": research.updated_at,
            "is_active": research.is_active,
            "is_test": research.is_test,
            "step": research.step,
            "researcherOwnerId": research.researcherOwnerId
        }

        return {"research": info_research}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error al obtener investigación: {str(e)}")

# Inactivar investigación
@app_research.post("/inactivate", summary="Inactivar investigación", 
                   description="Desactiva una investigación",
                   tags = ["Research Management"])
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
@app_research.post("/activate", summary="Activar investigación", 
                   description="Activa una investigación",
                   tags = ["Research Management"])
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

# Actualizar paso de investigación
@app_research.post("/update-step", summary="Actualizar paso de investigación", 
                   description="Actualiza el paso actual de una investigación",
                   tags = ["Research Management"])
def update_research_step(username: str = Form(..., description="Nombre de usuario"), 
                        research_id: str = Form(..., description="ID de la investigación"),
                        step: str = Form(..., description="Nuevo paso de la investigación")):
    user = Users.get_username(username)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El usuario está inactivo.")
    research = Research.get_id(research_id)
    if not research:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigación no encontrada.")
    try:
        Research.update(research_id, {"step": step})
        db.session.commit()
        return {"message": "Paso actualizado", "id": research_id, "step": step}
    except Exception as e:
        db.session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error al actualizar paso: {str(e)}")