# Bases de datos
from sqlalchemy import Column, String, Boolean, DateTime, Integer, ForeignKey
from datetime import datetime
from sqlalchemy.orm import relationship
from .. import db

class AiLabeled(db.base):
    __tablename__ = "ai_labeled"

    id_article = Column(String, primary_key=True, nullable=False)
    prompt_input = Column(String)
    prediction = Column(String)
    reasoning = Column(String)
    tokens_input = Column(Integer)
    tokens_output = Column(Integer)
    tokens_total = Column(Integer)
    flag_complete = Column(Boolean, default=False)
    create_at = Column(DateTime, default=datetime.now)
    update_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    ResearchOwnerId = Column(String, ForeignKey("researches.id"))
    ResearchOwner = relationship("Research", back_populates="ai_labeled")


    @classmethod
    def add(cls, dict_new):
        """Agrega un nuevo registro AiLabeled a la base de datos."""
        try:
            new_label = cls(**dict_new)
            db.session.add(new_label)
            # db.session.commit()
            return new_label
        except Exception as e:
            print("Error ", e)
            # db.session.rollback()
            raise Exception("Error adding AiLabeled")

    @classmethod
    def update(cls, id_article, dict_update):
        """Actualiza un registro AiLabeled existente según su id."""
        try:
            label = db.session.query(cls).filter_by(id_article=id_article).first()
            if label is None:
                raise Exception(f"AiLabeled with id_article {id_article} not found.")
            for key, value in dict_update.items():
                if hasattr(label, key):
                    setattr(label, key, value)
                else:
                    print(f"Attribute {key} does not exist on the AiLabeled model.")
            # db.session.commit()
            return label
        except Exception as e:
            print("Error ", e)
            # db.session.rollback()
            raise Exception("Error updating AiLabeled")

    @classmethod
    def delete(cls, id_article):
        """Elimina un registro AiLabeled por su id_article."""
        try:
            label = db.session.query(cls).filter_by(id_article=id_article).first()
            if label is None:
                raise Exception(f"AiLabeled with id_article {id_article} not found.")
            db.session.delete(label)
            # db.session.commit()
        except Exception as e:
            print("Error ", e)
            # db.session.rollback()
            raise Exception("Error deleting AiLabeled")

    @classmethod
    def get_id(cls, id_article):
        """Obtiene un registro AiLabeled por su id_article."""
        return db.session.query(cls).filter_by(id_article=id_article).first()

    @classmethod
    def get_by_article_research(cls, id_article, research_id):
        """Obtiene un registro AiLabeled por id_article e ResearchOwnerId."""
        return db.session.query(cls).filter_by(id_article=id_article, ResearchOwnerId=research_id).first()

    @classmethod
    def get_prediction_reasoning(cls, id_article, research_id):
        """Devuelve prediction y reasoning si existe el registro, sino None."""
        label = cls.get_by_article_research(id_article, research_id)
        if label:
            return {"prediction": label.prediction, "reasoning": label.reasoning}
        return None
    
    @classmethod
    def get_by_research(cls, research_id):
        """Devuelve todos los items etiquetados cuyo ResearchOwnerId coincide con el research_id dado."""
        resultados = db.session.query(cls).filter_by(ResearchOwnerId=research_id).all()
        items = []
        for r in resultados:
            items.append({
                "id_article": r.id_article,
                "prediction": r.prediction,
                "reasoning": r.reasoning,
                "tokens_input": r.tokens_input,
                "tokens_output": r.tokens_output,
                "tokens_total": r.tokens_total,
                "flag_complete": r.flag_complete,
                "create_at": r.create_at,
                "update_at": r.update_at
            })
        return items