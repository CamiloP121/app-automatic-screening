# Bases de datos
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer
from datetime import datetime
from sqlalchemy.orm import relationship
from ...models import db

# Generales
import uuid

class Articles(db.base):
    __tablename__ = "articles"

    id = Column(String, primary_key=True)  # Id único del artículo
    title = Column(String, nullable=False)  # Título del artículo
    abstract = Column(String, nullable=False)  # Resumen
    abstract_original = Column(String, nullable=False)  # Resumen original
    year = Column(Integer, nullable=False)  # Año de publicación
    label = Column(String)  # Etiqueta o clasificación
    created_at = Column(DateTime, default=datetime.now)   # Fecha de creación
    updated_at = Column(DateTime, onupdate=datetime.now)  # Última modificación
    is_active = Column(Boolean, default=True)  # Estado activo/inactivo

    # Relación con Research (si lo mantienes)
    articleOwnerId = Column(String, ForeignKey("researches.id"))
    articleOwner = relationship("Research", back_populates="articles")

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