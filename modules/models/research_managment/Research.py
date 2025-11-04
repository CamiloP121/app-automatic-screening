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
    title = Column(String, unique=True, nullable=False) # Título de la investigación
    type_research = Column(String, nullable=False)  # Tipo de investigación
    methodology = Column(String)  # Metodología a utilizar
    criteria_inclusion = Column(String)    # Criterios de inclusión
    created_at = Column(DateTime, default=datetime.now)   # Fecha de creación
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now) # Fecha de actualización
    is_active = Column(Boolean, default=True)  # Estado activo/inactivo
    is_test = Column(Boolean, default=False)  # Research de prueba o real
    step = Column(String)                # Estado actual dentro del pipeline

    # Relación con investigadores
    researcherOwnerId = Column(String, ForeignKey("users.username"))
    researcherOwner = relationship("Users", back_populates="researches")

    datasets = relationship("Datasets", back_populates="datasetOwner")
    ai_labeled = relationship("AiLabeled", back_populates="ResearchOwner")

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
            dict_update["updated_at"] = datetime.now()
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
    def generate_unique_id(cls):
        """Genera un id único no usado en la tabla Dataset."""
        while True:
            new_id = str(uuid.uuid4())
            existing = db.session.query(cls).filter_by(id=new_id).first()
            if not existing:
                return new_id
        
    @classmethod
    def title_exists(cls, title):
        """Verifica si ya existe una investigación con el título dado."""
        return db.session.query(cls).filter_by(title=title).first() is not None

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
                "title": r.title,
                "type_research": r.type_research,
                "methodology": r.methodology,
                "criteria_inclusion": r.criteria_inclusion.split("|&|") if r.criteria_inclusion else [],
                "created_at": r.created_at,
                "updated_at": r.updated_at,
                "is_active": r.is_active,
                "is_test": r.is_test,
                "step": r.step
            })
        return r_dict

    @classmethod
    def get_id(cls, id):
        """Obtiene un Research por su id."""
        return db.session.query(cls).filter_by(id=id).first()

    @classmethod
    def get_all(cls):
        """Devuelve un diccionario {id: title} de todas las investigaciones."""
        resultados = db.session.query(cls).all()
        if not resultados:
            return None
        r_dict = {}
        for r in resultados:
            if r.researcherOwnerId not in r_dict:
                r_dict[r.researcherOwnerId] = []
            r_dict[r.researcherOwnerId].append({
                "id": r.id,
                "title": r.title,
                "type_research": r.type_research,
                "methodology": r.methodology,
                "criteria_inclusion": r.criteria_inclusion.split("|&|") if r.criteria_inclusion else [],
                "created_at": r.created_at,
                "updated_at": r.updated_at,
                "is_active": r.is_active,
                "is_test": r.is_test,
                "step": r.step
            })
        return r_dict