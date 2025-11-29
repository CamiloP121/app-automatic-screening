# Bases de datos
from sqlalchemy import Column, String, Boolean, DateTime, Float, ForeignKey
from datetime import datetime
from sqlalchemy.orm import relationship
from .. import db, Articles, Datasets

class MlClassifier(db.base):
    __tablename__ = "ml_classifiers"

    id_article = Column(String, ForeignKey("articles.id"), primary_key=True, nullable=False)
    ModelOwnerId = Column(String, ForeignKey("trained_models.id"), primary_key=True, nullable=False)
    prediction = Column(String)
    probability_excluded = Column(Float)
    probability_included = Column(Float)
    flag_complete = Column(Boolean, default=False)
    create_at = Column(DateTime, default=datetime.now)
    update_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    ArticleOwner = relationship("Articles", back_populates="ml_classifiers")
    ModelOwner = relationship("TrainedModel", back_populates="ml_classifiers")


    @classmethod
    def add(cls, dict_new):
        """Agrega un nuevo registro MlClassifier a la base de datos."""
        try:
            new_classifier = cls(**dict_new)
            db.session.add(new_classifier)
            # db.session.commit()
            return new_classifier
        except Exception as e:
            print("Error ", e)
            # db.session.rollback()
            raise Exception("Error adding MlClassifier")

    @classmethod
    def update(cls, id_article, dict_update):
        """Actualiza un registro MlClassifier existente según su id."""
        try:
            classifier = db.session.query(cls).filter_by(id_article=id_article).first()
            if classifier is None:
                raise Exception(f"MlClassifier with id_article {id_article} not found.")
            for key, value in dict_update.items():
                if hasattr(classifier, key):
                    setattr(classifier, key, value)
                else:
                    print(f"Attribute {key} does not exist on the MlClassifier model.")
            # db.session.commit()
            return classifier
        except Exception as e:
            print("Error ", e)
            # db.session.rollback()
            raise Exception("Error updating MlClassifier")

    @classmethod
    def delete(cls, id_article):
        """Elimina un registro MlClassifier por su id_article."""
        try:
            classifier = db.session.query(cls).filter_by(id_article=id_article).first()
            if classifier is None:
                raise Exception(f"MlClassifier with id_article {id_article} not found.")
            db.session.delete(classifier)
            # db.session.commit()
        except Exception as e:
            print("Error ", e)
            # db.session.rollback()
            raise Exception("Error deleting MlClassifier")

    @classmethod
    def get_id(cls, id_article):
        """Obtiene un registro MlClassifier por su id_article."""
        return db.session.query(cls).filter_by(id_article=id_article).first()

    @classmethod
    def get_by_article(cls, id_article):
        """Obtiene un registro MlClassifier por id_article."""
        return db.session.query(cls).filter_by(id_article=id_article).first()

    @classmethod
    def get_by_article_and_model(cls, id_article, model_id):
        """Obtiene un registro MlClassifier por id_article y ModelOwnerId."""
        return db.session.query(cls).filter_by(id_article=id_article, ModelOwnerId=model_id).first()

    @classmethod
    def get_prediction(cls, id_article):
        """Devuelve prediction y probabilidades si existe el registro, sino None."""
        classifier = cls.get_by_article(id_article)
        if classifier:
            return {
                "prediction": classifier.prediction,
                "probability_excluded": classifier.probability_excluded,
                "probability_included": classifier.probability_included
            }
        return None
    
    @classmethod
    def get_by_research(cls, research_id):
        """Devuelve todos los items etiquetados cuyo ResearchOwnerId coincide con el research_id dado."""
        df_datasets = Datasets.get_all_by_research(research_id)
        if df_datasets.empty:
            return []
        dataset_ids = df_datasets['id'].tolist()

        df_articles = [Articles.get_all_by_dataset(dataset_id) for dataset_id in dataset_ids]
        if not df_articles:
            return []
        article_ids = [article['id'] for df in df_articles for article in df]
        resultados = db.session.query(cls).filter(cls.ArticleOwnerId.in_(article_ids)).all()
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
    @classmethod
    def get_all_by_model(cls, model_id):
        # """Devuelve todas las predicciones de un modelo específico con información del artículo."""
        resultados = db.session.query(cls).filter_by(ModelOwnerId=model_id).all()
        items = []
        for r in resultados:
            article = Articles.get_id(r.id_article)
            items.append({
                "id_article": r.id_article,
                "abstract": article.abstract if article else "",
                "prediction": r.prediction,
                "probability_excluded": r.probability_excluded,
                "probability_included": r.probability_included,
                "confidence": max(r.probability_excluded, r.probability_included) if r.probability_excluded and r.probability_included else None,
                "flag_complete": r.flag_complete,
                "created_at": r.create_at,
                "updated_at": r.update_at,
                "model_id": r.ModelOwnerId
            })
        return items
