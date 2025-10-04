# API
from fastapi import APIRouter, Form, Body
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
    
