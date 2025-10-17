# Bases de datos
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from datetime import datetime
from sqlalchemy.orm import relationship
from .. import db

# Generales
import uuid
import pandas as pd

class Datasets(db.base):
    __tablename__ = "datasets"

    id = Column(String, primary_key=True)  # Id único del dataset
    filename = Column(String, nullable=False)  # Nombre del documento
    created_at = Column(DateTime, default=datetime.now)   # Fecha de creación
    updated_at = Column(DateTime, onupdate=datetime.now)  # Última modificación
    methodology = Column(String)           # Metodología a utilizar
    number_of_records = Column(String)     # Número de registros
    is_active = Column(Boolean, default=True)  # Estado activo/inactivo

    # Relación con Research
    datasetOwnerId = Column(String, ForeignKey("researches.id"))
    datasetOwner = relationship("Research", back_populates="datasets")

    articles = relationship("Articles", back_populates="articleOwner")
    

    @classmethod
    def add(cls, dict_new):
        """Agrega un nuevo Dataset a la base de datos."""
        try:
            new_dataset = cls(**dict_new)
            db.session.add(new_dataset)
            # db.session.commit()
            return new_dataset
        except Exception as e:
            print("Error ", e)
            # db.session.rollback()
            raise Exception("Error adding Dataset")

    @classmethod
    def update(cls, id, dict_update):
        """Actualiza un Dataset existente según su id."""
        try:
            dataset = db.session.query(cls).filter_by(id=id).first()

            if dataset is None:
                raise Exception(f"Dataset with id {id} not found.")

            for key, value in dict_update.items():
                if hasattr(dataset, key):
                    setattr(dataset, key, value)
                else:
                    print(f"Attribute {key} does not exist on the Dataset model.")

            # db.session.commit()
            return dataset
        except Exception as e:
            print("Error ", e)
            # db.session.rollback()
            raise Exception("Error updating Dataset")

    @classmethod
    def deactivate(cls, id):
        """Desactiva un dataset (is_active=False) según su id."""
        try:
            dataset = db.session.query(cls).filter_by(id=id).first()
            if dataset is None:
                raise Exception(f"Dataset with id {id} not found.")

            dataset.is_active = False
            # db.session.commit()
            return dataset
        except Exception as e:
            print("Error ", e)
            # db.session.rollback()
            raise Exception("Error deactivating Dataset")

    @classmethod
    def delete(cls, id):
        """Elimina un Dataset por su id."""
        try:
            dataset = db.session.query(cls).filter_by(id=id).first()

            if dataset is None:
                raise Exception(f"Dataset with id {id} not found.")

            db.session.delete(dataset)
            # db.session.commit()
        except Exception as e:
            print("Error ", e)
            # db.session.rollback()
            raise Exception("Error deleting Dataset")

    @classmethod
    def id_exists(cls, id):
        """Verifica si existe un Dataset con el id dado."""
        return db.session.query(cls).filter_by(id=id).first() is not None

    @classmethod
    def get_id(cls, id):
        """Obtiene un Dataset por su id."""
        return db.session.query(cls).filter_by(id=id).first()

    @classmethod
    def generate_unique_id(cls):
        """Genera un id único no usado en la tabla Dataset."""
        while True:
            new_id = str(uuid.uuid4())
            existing = db.session.query(cls).filter_by(id=new_id).first()
            if not existing:
                return new_id

    @classmethod
    def get_datasets(cls):
        """Devuelve un diccionario {id: filename} de todos los datasets."""
        resultados = db.session.query(cls).all()
        if not resultados:
            return None

        df = pd.DataFrame([{
            "id": r.id,
            "filename": r.filename,
            "methodology": r.methodology,
            "number_of_records": r.number_of_records,
            "is_active": r.is_active
        } for r in resultados])

        return {row["id"]: row["filename"] for _, row in df.iterrows()}
    
    @classmethod
    def get_all_by_research(cls, dataset_id):
        """Devuelve todos los datasets cuyo datasetOwnerId coincide con el research_id dado."""
        resultados = db.session.query(cls).filter_by(datasetOwnerId=dataset_id).all()
        if not resultados:
            return pd.DataFrame()
        data = []
        for r in resultados:

            data.append({
                "id": r.id,
                "filename": r.filename,
                "created_at": r.created_at,
                "updated_at": r.updated_at,
                "methodology": r.methodology,
                "number_of_records": r.number_of_records,
                "is_active": r.is_active
            })

        return pd.DataFrame(data)