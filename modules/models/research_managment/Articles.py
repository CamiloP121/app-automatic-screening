# Bases de datos
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer
from datetime import datetime
from sqlalchemy.orm import relationship
from ...models import db
import pandas as pd
# Generales
import uuid

class Articles(db.base):
    __tablename__ = "articles"

    id = Column(String, primary_key=True)  # Id único del artículo
    title = Column(String, nullable=False)  # Título del artículo
    abstract = Column(String, nullable=False)  # Resumen
    abstract_original = Column(String, nullable=False)  # Resumen original
    year = Column(Integer, nullable=True)  # Año de publicación
    label = Column(String)  # Etiqueta o clasificación
    created_at = Column(DateTime, default=datetime.now)   # Fecha de creación
    updated_at = Column(DateTime, onupdate=datetime.now)  # Última modificación
    is_active = Column(Boolean, default=True)  # Estado activo/inactivo
    label = Column(String)  # Etiqueta o clasificación

    # Relación con Research
    articleOwnerId = Column(String, ForeignKey("datasets.id"))
    articleOwner = relationship("Datasets", back_populates="articles")
    # Relacion con predicciones ML y AI
    ai_labelers = relationship("AiLabeler", back_populates="ResearchOwner")
    ml_classifiers = relationship("MlClassifier", back_populates="ResearchOwner")

    @classmethod
    def add(cls, dict_new):
        """Agrega un nuevo Article a la base de datos."""
        try:
            new_article = cls(**dict_new)
            db.session.add(new_article)
            # db.session.commit()
            return new_article
        except Exception as e:
            print("Error ", e)
            # db.session.rollback()
            raise Exception("Error adding Article")

    @classmethod
    def update(cls, id, dict_update):
        """Actualiza un Article existente según su id."""
        try:
            article = db.session.query(cls).filter_by(id=id).first()

            if article is None:
                raise Exception(f"Article with id {id} not found.")

            for key, value in dict_update.items():
                if hasattr(article, key):
                    setattr(article, key, value)
                else:
                    print(f"Attribute {key} does not exist on the Article model.")

            # db.session.commit()
            return article
        except Exception as e:
            print("Error ", e)
            # db.session.rollback()
            raise Exception("Error updating Article")

    @classmethod
    def deactivate(cls, id):
        """Desactiva un artículo (is_active=False) según su id."""
        try:
            article = db.session.query(cls).filter_by(id=id).first()
            if article is None:
                raise Exception(f"Article with id {id} not found.")

            article.is_active = False
            # db.session.commit()
            return article
        except Exception as e:
            print("Error ", e)
            # db.session.rollback()
            raise Exception("Error deactivating Article")

    @classmethod
    def delete(cls, id):
        """Elimina un Article por su id."""
        try:
            article = db.session.query(cls).filter_by(id=id).first()

            if article is None:
                raise Exception(f"Article with id {id} not found.")

            db.session.delete(article)
            # db.session.commit()
        except Exception as e:
            print("Error ", e)
            # db.session.rollback()
            raise Exception("Error deleting Article")

    @classmethod
    def id_exists(cls, id):
        """Verifica si existe un Article con el id dado."""
        return db.session.query(cls).filter_by(id=id).first() is not None

    @classmethod
    def get_id(cls, id):
        """Obtiene un Article por su id."""
        return db.session.query(cls).filter_by(id=id).first()

    @classmethod
    def generate_unique_id(cls):
        """Genera un id único no usado en la tabla Articles."""
        while True:
            new_id = str(uuid.uuid4())
            existing = db.session.query(cls).filter_by(id=new_id).first()
            if not existing:
                return new_id
            
    @classmethod
    def get_all_by_dataset(cls, dataset_id):
        """Obtiene todos los artículos asociados a un dataset específico."""
        articles = db.session.query(cls).filter_by(articleOwnerId=dataset_id).all()
        if not articles:
            return pd.DataFrame()  # Retorna DataFrame vacío si no hay artículos
        articles_list = []
        for article in articles:
            articles_list.append({
                "id": article.id,
                "title": article.title,
                "abstract": article.abstract,
                "abstract_original": article.abstract_original,
                "year": article.year,
                "label": article.label,
                "created_at": article.created_at,
                "updated_at": article.updated_at,
                "is_active": article.is_active,
                "articleOwnerId": article.articleOwnerId
            })
        return pd.DataFrame(articles_list)
        