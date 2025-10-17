# API
from fastapi import APIRouter, Form
from fastapi import status, HTTPException

# General
import hashlib
from datetime import datetime
# Db
from modules.models import db, Users

app_user = APIRouter()

@app_user.post("/register", summary="Registro de usuario", 
               description="Este endpoint permite a un nuevo usuario registrarse")
def register(username: str = Form(..., description="Nombre de usuario"),
            name: str = Form(..., description="Nombres del usuario"),
            email: str = Form(..., description="Correo electrónico del usuario"),
            password: str = Form(..., description="Contraseña del usuario"),
            role: str = Form(..., description="Rol del usuario. Opciones: 'admin', 'reseracher', 'viwer'"),
            institution: str = Form(..., description="Institución a la que pertenece el usuario")):
    # Verificar si el username ya existe
    if Users.username_exists(username = username):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El usuario ya existe.")

    # Crear hash de la contraseña
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    dict_new = {
        "username": username,
        "name": name,
        "email": email,
        "password_hash": password_hash,
        "role": role,
        "is_active": True,
        "institution": institution
    }
    try:
        Users.add(dict_new)
        db.session.commit() 
        return {"message": "User registered successfully", "username": username, "email": email}
    except Exception as e:
        db.session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error al crear usuario: {str(e)}")


@app_user.post("/login", summary="Login de usuario", 
               description="Este endpoint permite a un usuario iniciar sesión proporcionando su nombre de usuario y contraseña.")
def login(username: str = Form(..., description="Nombre de usuario"),
          password: str = Form(..., description="Contraseña del usuario")):
    user = Users.get_username(username)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Acceso denegado: el usuario no existe.")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El usuario está inactivo.")
    
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    
    if user.password_hash != password_hash:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Acceso denegado: contraseña incorrecta.")
    try:
        # Actualizar last_login
        Users.update(username, {"last_login": datetime.now()})
        db.session.commit()  # Si tienes manejo de sesión
        return {"message": "Login successful", "username": username}
    except Exception as e:
        db.session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error en acceso: {str(e)}")
    
@app_user.put("/update", summary="Actualizar usuario", description="Actualiza los datos de un usuario por username")
def update_user(username: str = Form(..., description="Nombre de usuario"),
            name: str = Form(None, description="Nombres del usuario"),
            email: str = Form(None, description="Correo electrónico del usuario"),
            role: str = Form(None, description="Rol del usuario. Opciones: 'admin', 'reseracher', 'viwer'"),
            institution: str = Form(None, description="Institución a la que pertenece el usuario")):
    user = Users.get_username(username)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El usuario está inactivo.")
    try:
        request_data = {
            "name": name,
            "email": email,
            "role": role,
            "institution": institution
        }
        dict_update = {param: value for param, value in request_data.items() if value is not None and value.strip() != ""}
        Users.update(username, dict_update)
        db.session.commit()  # Si tienes manejo de sesión
        return {"message": "Usuario actualizado", "username": username}
    except Exception as e:
        db.session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error al actualizar usuario: {str(e)}")
    

@app_user.put("/update-password", summary="Actualizar contraseña", 
              description="Actualiza la contraseña de un usuario por username")
def update_password(username: str = Form(..., description="Nombre de usuario"),
                new_password: str = Form(..., description="Nueva contraseña")):
    user = Users.get_username(username)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El usuario está inactivo.")
    try:   
        password_hash = hashlib.sha256(new_password.encode()).hexdigest()
        dict_update = {"password_hash": password_hash}
        Users.update(username, dict_update)
        db.session.commit()  # Si tienes manejo de sesión
        return {"message": "Contraseña actualizada", "username": username}
    except Exception as e:
        db.session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error al actualizar contraseña: {str(e)}")
    
@app_user.post("/get-user", summary="Obtener usuario", 
              description="Obtiene los datos de un usuario por username")
def get_user(username: str = Form(..., description="Nombre de usuario")):
    user = Users.get_username(username)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    try:
        user_dict = {
            "username": user.username,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
            "created_at": user.created_at,
            "updated_at": user.updated_at,
            "last_login": user.last_login,
            "institution": user.institution
        }
        return user_dict
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error al obtener usuario: {str(e)}")
    
@app_user.post("/inactivate", summary="Inactivar usuario", 
               description="Desactiva el usuario")
def inactivate_user(username: str = Form(..., description="Nombre de usuario")):
    user = Users.get_username(username)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    try:
        Users.update(username, {"is_active": False})
        db.session.commit()
        return {"message": "Usuario inactivado", "username": username}
    except Exception as e:
        db.session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error al inactivar usuario: {str(e)}")

# Endpoint para activar usuario
@app_user.post("/activate", summary="Activar usuario", 
               description="Activa el usuario")
def activate_user(username: str = Form(..., description="Nombre de usuario")):
    user = Users.get_username(username)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    try:
        Users.update(username, {"is_active": True})
        db.session.commit()
        return {"message": "Usuario activado", "username": username}
    except Exception as e:
        db.session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error al activar usuario: {str(e)}")
    
@app_user.delete("/delete-user", summary="Eliminar usuario", 
               description="Elimina un usuario si el solicitante es admin")
def delete_user(username: str = Form(..., description="Username del solicitante"),
                username_delete: str = Form(..., description="Username a eliminar")):
    user = Users.get_username(username)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario solicitante no encontrado.")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El usuario está inactivo.")
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo un usuario admin puede eliminar usuarios.")
    user_to_delete = Users.get_username(username_delete)
    if not user_to_delete:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario a eliminar no encontrado.")
    try:
        Users.delete(username_delete)
        db.session.commit()
        return {"message": "Usuario eliminado", "username_deleted": username_delete}
    except Exception as e:
        db.session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error al eliminar usuario: {str(e)}")