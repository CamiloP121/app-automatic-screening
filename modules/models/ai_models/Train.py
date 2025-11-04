from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, Text, Float
from datetime import datetime
from sqlalchemy.orm import relationship
from .. import db

# Generales
import uuid
import pandas as pd

class TrainedModel(db.base):
    __tablename__ = "trained_models"
    id = Column(String, primary_key=True)
    version = Column(Integer, nullable=False)
    description = Column(String)
    accuracy = Column(Float)
    recall = Column(Float)
    f1_score = Column(Float)
    hyperparameters = Column(Text)  # JSON stringified
    time_training = Column(Float)  # En segundos
    model_data = Column(Text)  # Aquí va el base64
    create_at = Column(DateTime, default=datetime.now)
    update_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    ResearchOwnerId = Column(String, ForeignKey("researches.id"))
    ResearchOwner = relationship("Research", back_populates="trained_models")

    ml_classifiers = relationship("MlClassifier", back_populates="ModelOwner")

    # Bases de datos
    classmethod
    def add(cls, dict_new):
        """Agrega un nuevo Research a la base de datos."""
        try:
            version = cls.generate_version(dict_new["ResearchOwnerId"])
            dict_new["version"] = version
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
    def generate_version(cls, research_id):
        """Genera la siguiente versión para un modelo entrenado en una investigación dada."""
        try:
            max_version = db.session.query(db.func.max(cls.version)).filter_by(ResearchOwnerId=research_id).scalar()
            if max_version is None:
                return 1
            return max_version + 1
        except Exception as e:
            print("Error ", e)
            raise Exception("Error generating version for TrainedModel")
        
    @classmethod
    def get_by_research(cls, research_id):
        """Devuelve todos los modelos entrenados asociados a una investigación."""
        resultados = db.session.query(cls).filter_by(ResearchOwnerId=research_id).all()
        models_list = []
        for model in resultados:
            models_list.append({
                "id": model.id,
                "version": model.version,
                "description": model.description,
                "create_at": model.create_at,
                "update_at": model.update_at
            })
        return models_list
    
    @classmethod
    def get_id(cls, id):
        """Obtiene un registro TrainedModel por su id."""
        return db.session.query(cls).filter_by(id=id).first()
    
    @classmethod
    def get_latest_by_research(cls, research_id):
        """Devuelve el modelo entrenado más reciente para una investigación dada."""
        return db.session.query(cls).filter_by(ResearchOwnerId=research_id).order_by(cls.version.desc()).first()
    