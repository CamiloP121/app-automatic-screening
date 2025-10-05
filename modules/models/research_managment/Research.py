# Bases de datos
from sqlalchemy import Column, String, ForeignKey, Boolean, DateTime
from datetime import datetime
from sqlalchemy.orm import relationship
from ...models import db

# Generales
import uuid
import pandas as pd

class Research(db.base):
    __tablename__ = "researches"

    id = Column(String, primary_key=True)  # Id único de la investigación
    name = Column(String, unique=True, nullable=False)                  # Nombre de la investigación
    description = Column(String)           # Descripción de la investigación
    created_at = Column(DateTime, default=datetime.now)   # Fecha de creación
    methodology = Column(String)           # Metodología a utilizar
    criteria_inclusion = Column(String)    # Criterios de inclusión
    is_active = Column(Boolean, default=True)  # Estado activo/inactivo
    is_test = Column(Boolean, default=False)  # Research de prueba o real
    step = Column(String)                # Estado actual dentro del pipeline

    # Relación con investigadores
    researcherOwnerId = Column(String, ForeignKey("users.username"))
    researcherOwner = relationship("Users", back_populates="researches")

    datasets = relationship("Datasets", back_populates="datasetOwner")

    @classmethod
    def add(cls, dict_new):
        """Agrega un nuevo Research a la base de datos."""
        try:
            new_research = cls(**dict_new)
            db.session.add(new_research)
            # db.session.commit()
            return new_research
        except Exception as e:
            print("Error ", e)
            # db.session.rollback()
            raise Exception("Error adding Research")

    @classmethod
    def update(cls, id, dict_update):
        """Actualiza un Research existente según su id."""
        try:
            research = db.session.query(cls).filter_by(id=id).first()

            if research is None:
                raise Exception(f"Research with id {id} not found.")

            for key, value in dict_update.items():
                if hasattr(research, key):
                    setattr(research, key, value)
                else:
                    print(f"Attribute {key} does not exist on the Research model.")

            # db.session.commit()
            return research
        except Exception as e:
            print("Error ", e)
            # db.session.rollback()
            raise Exception("Error updating Research")

    @classmethod
    def deactivate(cls, id):
        """Desactiva investigación (is_active=False) según su nickname."""
        try:
            user = db.session.query(cls).filter_by(id=id).first()
            if user is None:
                raise Exception(f"User with id {id} not found.")

            user.is_active = False
            # db.session.commit()  # Activa esta línea si quieres que se guarde de inmediato
            return user
        except Exception as e:
            print("Error ", e)
            # db.session.rollback()
            raise Exception("Error deactivating Research")

    @classmethod
    def delete(cls, id):
        """Elimina un Research por su id."""
        try:
            research = db.session.query(cls).filter_by(id=id).first()

            if research is None:
                raise Exception(f"Research with id {id} not found.")

            db.session.delete(research)
            # db.session.commit()
        except Exception as e:
            print("Error ", e)
            # db.session.rollback()
            raise Exception("Error deleting Research")

    @classmethod
    def id_exists(cls, id):
        """Verifica si existe un Research con el id dado."""
        return db.session.query(cls).filter_by(id=id).first() is not None

    @classmethod
    def get_id(cls, id):
        """Obtiene un Research por su id."""
        return db.session.query(cls).filter_by(id=id).first()

    @classmethod
    def generate_unique_id(cls):
        """Genera un id único no usado en la tabla Research."""
        while True:
            new_id = str(uuid.uuid4())
            existing = db.session.query(cls).filter_by(id=new_id).first()
            if not existing:
                return new_id
    
    @classmethod
    def name_exists(cls, name):
        """Verifica si existe un Research con el name dado."""
        return db.session.query(cls).filter_by(name=name).first() is not None

    @classmethod
    def get_by_owner(cls, username):
        """Devuelve todas las investigaciones cuyo researcherOwnerId coincide con el username dado."""
        resultados = db.session.query(cls).filter_by(researcherOwnerId=username).all()
        r_dict = {}
        for r in resultados:
            if r.researcherOwnerId not in r_dict:
                r_dict[r.researcherOwnerId] = []
            r_dict[r.researcherOwnerId].append({
                "id": r.id,
                "name": r.name,
                "description": r.description,
                "created_at": r.created_at,
                "methodology": r.methodology,
                "criteria_inclusion": r.criteria_inclusion.split("|&|") if r.criteria_inclusion else [],
                "is_active": r.is_active,
                "is_test": r.is_test,
                "step": r.step
            })
        return r_dict

    @classmethod
    def get_all(cls):
        """Devuelve un diccionario {id: name} de todas las investigaciones."""
        resultados = db.session.query(cls).all()
        if not resultados:
            return None
        r_dict = {}
        for r in resultados:
            if r.researcherOwnerId not in r_dict:
                r_dict[r.researcherOwnerId] = []
            r_dict[r.researcherOwnerId].append({
                "id": r.id,
                "name": r.name,
                "description": r.description,
                "created_at": r.created_at,
                "methodology": r.methodology,
                "criteria_inclusion": r.criteria_inclusion.split("|&|") if r.criteria_inclusion else [],
                "is_active": r.is_active,
                "is_test": r.is_test,
                "step": r.step
            })
        return r_dict