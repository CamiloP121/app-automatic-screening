# Bases de datos
from sqlalchemy import Column, String, Boolean, DateTime
from datetime import datetime
from sqlalchemy.orm import relationship
from ...models import db

# Generales
import uuid
import pandas as pd

class Users(db.base):
    __tablename__ = "users"

    username = Column(String, primary_key=True)     # username único
    name = Column(String, nullable=False)           # Nombre del usuario
    email = Column(String, unique=True, nullable=False)  # Email único
    password_hash = Column(String, nullable=False)  # Hash de la contraseña
    role = Column(String, default="user")           # Rol del usuario
    is_active = Column(Boolean, default=True)       # Estado activo/inactivo

    created_at = Column(DateTime, default=datetime.now)   # Fecha de creación
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)  # Última modificación
    last_login = Column(DateTime)                         # Último acceso

    institution = Column(String)                 # Institución a la que pertenece

    # Relación con Research 
    researches = relationship("Research", back_populates="researcherOwner")

    @classmethod
    def add(cls, dict_new):
        """Agrega un nuevo User a la base de datos."""
        try:
            new_user = cls(**dict_new)
            db.session.add(new_user)
            # db.session.commit()
            return new_user
        except Exception as e:
            print("Error ", e)
            # db.session.rollback()
            raise Exception("Error adding User")

    @classmethod
    def update(cls, username, dict_update):
        """Actualiza un User existente según su username."""
        try:
            user = db.session.query(cls).filter_by(username=username).first()

            if user is None:
                raise Exception(f"User with username {username} not found.")

            for key, value in dict_update.items():
                if hasattr(user, key):
                    setattr(user, key, value)
                else:
                    print(f"Attribute {key} does not exist on the User model.")

            # db.session.commit()
            return user
        except Exception as e:
            print("Error ", e)
            # db.session.rollback()
            raise Exception("Error updating User")
        
    @classmethod
    def deactivate(cls, username):
        """Desactiva un usuario (is_active=False) según su username."""
        try:
            user = db.session.query(cls).filter_by(username=username).first()
            if user is None:
                raise Exception(f"User with username {username} not found.")

            user.is_active = False
            # db.session.commit()
            return user
        except Exception as e:
            print("Error ", e)
            # db.session.rollback()
            raise Exception("Error deactivating User")

    @classmethod
    def delete(cls, username):
        """Elimina un User por su username."""
        try:
            user = db.session.query(cls).filter_by(username=username).first()

            if user is None:
                raise Exception(f"User with username {username} not found.")

            db.session.delete(user)
            # db.session.commit()
        except Exception as e:
            print("Error ", e)
            # db.session.rollback()
            raise Exception("Error deleting User")

    @classmethod
    def username_exists(cls, username):
        """Verifica si existe un User con el username dado."""
        return db.session.query(cls).filter_by(username=username).first() is not None

    @classmethod
    def get_username(cls, username):
        """Obtiene un User por su username."""
        return db.session.query(cls).filter_by(username=username).first()

    @classmethod
    def generate_unique_username(cls):
        """Genera un username único no usado en la tabla User."""
        while True:
            new_username = str(uuid.uuid4())
            existing = db.session.query(cls).filter_by(username=new_username).first()
            if not existing:
                return new_username

    @classmethod
    def get_users(cls):
        """Devuelve un diccionario {username: name} de todos los usuarios."""
        resultados = db.session.query(cls).all()
        if not resultados:
            return None

        df = pd.DataFrame([{
            "username": r.username,
            "name": r.name,
            "email": r.email,
            "role": r.role,
            "is_active": r.is_active
        } for r in resultados])

        return {row["username"]: row["name"] for _, row in df.iterrows()}