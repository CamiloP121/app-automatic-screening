# API
import uuid
from fastapi import APIRouter, Form, UploadFile, File
from fastapi import status, HTTPException
# General
import os
from datetime import datetime
from pathlib import Path
import numpy as np
import time
import json
import base64
import pickle
# Async
import asyncio
# Db
from modules.models import db, Users, Research, Articles, TrainedModel, MlClassifier
# Own
from app import logger
from modules.Utils.load_helpers import saveFAPIFile
from modules.core.vectorizer import Vectorizer
from modules.core.lg_model import LogicticRegretionAdaptative

# Otras
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from datasets import load_dataset

extensions = ['.csv']

SAVE_TMP_FILE = os.getenv("SAVE_TMP_FILE", "app-automatic-screening-volumen/tmp_files")

# Encoder label
label_encoder = LabelEncoder()

# Logistic Regression
model_lg = LogicticRegretionAdaptative(
    class_weight='balanced',
    random_state=42
)

label_encoder = LabelEncoder()
vectorizer_model = Vectorizer(type_model='tfidf',
                            hyper_params={'max_features': 2000, 'ngram_range': (1, 1)})

app_ml = APIRouter()

@app_ml.post(
    "/train",
    summary="Entrenamiento de modelo Logistic Regression", 
    description="Este endpoint permite cargar datos (datasets o artículos) a una investigación específica",
)
async def load_as(username: str = Form(..., description="Nombre de usuario que realiza la carga"),
    research_id: str = Form(..., description="ID de la investigación a la que se cargarán los datos"),
    file: UploadFile = File(..., description="Archivo a cargar (.CSV)")):
    
    # Verificar que el usuario existe y tiene permisos
    user = Users.get_username(username)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Acceso denegado: el usuario no existe.")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El usuario está inactivo.")
    if user.role not in ['admin', 'researcher']:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El usuario no tiene permisos para cargar datos.")
    
    if os.path.splitext(file.filename)[-1] not in extensions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Extensión de archivo no permitida. Extensiones permitidas: {', '.join(extensions)}")
    
    # Verificar que la investigación existe
    research = Research.get_id(research_id)
    if not research:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"La investigación con ID {research_id} no existe")
    if not research.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="La investigación está inactiva. No se pueden cargar datos.")
    try:
        try:
            filename = file.filename
            logger.debug(f"User {username} is uploading file {filename} to research {research_id}")
            Path(SAVE_TMP_FILE).mkdir(parents=True, exist_ok=True)
            saveFAPIFile(file, SAVE_TMP_FILE) # Save in local
            logger.debug("File saved temporarily")

            dataset = load_dataset('csv', data_files=os.path.join(SAVE_TMP_FILE, filename), split='train')
            if dataset is None or len(dataset) == 0:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El archivo está vacío o no se pudo leer.")
            logger.debug(f"File {filename} loaded into Dataset with {len(dataset)} records")
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error al cargar el archivo: {str(e)}")
        
        try:    
            abstracts = dataset['abstract']
            # Vectorizar abstracts
            logger.info("Fitting vectorizer model on abstracts...")
            vectorizer_model.fit(abstracts, flag_lematized=True)
            abstract_tfidf = vectorizer_model.transform(abstracts, flag_lematized=True)
            dataset = dataset.add_column('abstract_vectorized', [arr.toarray().flatten() if hasattr(arr, 'toarray') else np.array(arr).flatten() for arr in abstract_tfidf])
            logger.info("Abstracts vectorized and added to dataset.")
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error al vectorizar los abstracts: {str(e)}")
        
        try:
            # Divide la base en 80% train y 20% test
            X = np.stack(dataset['abstract_vectorized'])
            y = np.array(dataset['label'])

            # y_encoded = label_encoder.fit_transform(y)
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2,
                                                                            stratify= y,
                                                                            random_state=42)
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error al dividir los datos: {str(e)}")
        
        try:
            start = time.time()
            # Entrnar modelo GridSearch
            logger.info("Starting GridSearch for Logistic Regression model...")
            model_lg.search_kfold(X_train, y_train, n_splits=5, scoring='recall_macro')
            logger.info("GridSearch completed.")

            logger.info(f"Mejores hiperparámetros: {model_lg.grid_search.best_params_}")
            model_lg.train(X_train, y_train)
            logger.info("Modelo entrenado.")
            end = time.time()

            y_pred = model_lg.predict(X_test)
            score_all = model_lg.get_scores(y_test, y_pred["labels"])
            logger.info(f"Metrics: {score_all}")

            #temp_results_all = pd.DataFrame([score_all])
            #temp_results_all['hyper_params'] = [str(model_lg.grid_search.best_params_)]
            #temp_results_all['exec_time'] = [round(end - start, 2)]

            # Convertir las métricas a string JSON
            # metrics_json = json.dumps(score_all)  # {'accuracy': 0.938, 'recall': 0.892, 'f1-score': 0.902}
            hyperparams_json = json.dumps(model_lg.grid_search.best_params_)

            # Serializar el modelo
            model_and_vectorizer = {
                'model': model_lg,
                'vectorizer': vectorizer_model
            }

            # Serializar el conjunto
            model_bytes = pickle.dumps(model_and_vectorizer)
            model_base64 = base64.b64encode(model_bytes).decode('utf-8')

            # Crear el diccionario correctamente
            train_record = {
                "id": TrainedModel.generate_unique_id(),
                "description": "Modelo Logistic Regression entrenado para investigación",
                "accuracy": float(score_all["accuracy"]),
                "recall": float(score_all["recall"]),  
                "f1_score": float(score_all["f1-score"]),
                "hyperparameters": hyperparams_json,  # Asegúrate de que sea JSON string
                "time_training": round(float(end - start), 3),
                "model_data": model_base64,
                "create_at": datetime.now(),
                "update_at": datetime.now(),
                "ResearchOwnerId": research.id
            }

            TrainedModel.add(dict_new = train_record)
            db.session.commit()

            return {
                "message": "Modelo entrenado y guardado exitosamente.",
                "train_id": train_record["id"],
                "accuracy": train_record["accuracy"],
                "recall": train_record["recall"],
                "f1_score": train_record["f1_score"]
            }

        except Exception as e:
            logger.error(f"Error al entrenar el modelo: {str(e)}")
            db.session.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error al entrenar el modelo: {str(e)}")

    except Exception as e:
        logger.error(f"Error inesperado: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno del servidor.")
    
@app_ml.get(
    "/trained_models/{research_id}",
    summary="Obtener modelos entrenados por investigación", 
    description="Este endpoint devuelve una lista de modelos entrenados asociados a una investigación específica",
)
def get_trained_models(research_id: str):
    try:
        models = TrainedModel.get_by_research(research_id)
        return {"trained_models": models}
    except Exception as e:
        logger.error(f"Error al obtener modelos entrenados: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno del servidor.")
    
@app_ml.get(
    "/trained_model/{model_id}",
    summary="Obtener un modelo entrenado por ID", 
    description="Este endpoint devuelve los detalles de un modelo entrenado específico dado su ID",
)
def get_trained_model(model_id: str):
    try:
        model = TrainedModel.get_id(model_id)
        if not model:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Modelo entrenado no encontrado.")
        return model
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error al obtener el modelo entrenado: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno del servidor.")
    
@app_ml.get(
    "/latest_trained_model/{research_id}",
    summary="Obtener el modelo entrenado más reciente por investigación", 
    description="Este endpoint devuelve el modelo entrenado más reciente asociado a una investigación específica",
)
def get_latest_trained_model(research_id: str):
    try:
        model = TrainedModel.get_latest_by_research(research_id)
        if not model:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Modelo entrenado no encontrado.")
        return model
    except Exception as e:
        logger.error(f"Error al obtener el modelo entrenado más reciente: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno del servidor.")
    
@app_ml.post(
    "/execute_inference",
    summary="Ejecutar inferencia con un modelo entrenado", 
    description="Este endpoint permite ejecutar inferencias utilizando un modelo entrenado específico dado su ID",
)
def execute_inference(username : str = Form(..., description="Nombre de usuario que realiza la inferencia"),
                    model_id: str = Form(..., description="ID del modelo a utilizar"),
                    article_id: str = Form(..., description="ID de artículos a etiquetar")):
    
    # Verificar que el usuario existe y tiene permisos
    user = Users.get_username(username)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Acceso denegado: el usuario no existe.")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El usuario está inactivo.")
    if user.role not in ['admin', 'researcher']:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El usuario no tiene permisos para cargar datos.")
  
    # Verificar que el modelo existe
    model_details = TrainedModel.get_id(model_id)
    if not model_details:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Modelo entrenado no encontrado.")
    
    # Verificar si ya existe una predicción para este artículo con este modelo
    result_article = MlClassifier.get_by_article_and_model(article_id, model_id)
    if result_article:
        return {
            "message": "Inferencia ejecutada y resultado guardado exitosamente.",
            "article_id": result_article.id_article,
            "prediction": result_article.prediction,
            "probability_excluded": result_article.probability_excluded,
            "probability_included": result_article.probability_included
        }
    
    try:
        try:
            # Cargar Modelo
            # Cargar modelo + vectorizer
            model_data_bytes = base64.b64decode(model_details.model_data)
            model_and_vectorizer = pickle.loads(model_data_bytes)
            
            model = model_and_vectorizer['model']
            vectorizer = model_and_vectorizer['vectorizer']
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error al cargar el modelo: {str(e)}")
        
        # Cargar Artículo
        article = Articles.get_id(article_id)
        if not article:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artículo no encontrado.")
        
        input_data = vectorizer.transform([article.abstract], flag_lematized=True)
        input_data = input_data.toarray()
        flag_complete = False
        try:
            predict_result = model.predict(input_data)
            logger.info(f"Inference result: {predict_result}")
            flag_complete = True
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error al ejecutar la inferencia: {str(e)}")
        

        MlClassifier_record = {
            "id_article": article.id,
            "prediction": predict_result["labels"][0],  # valor string
            "probability_excluded": predict_result["probabilities"][0][0],  # valor float
            "probability_included": predict_result["probabilities"][0][1],  #
            "flag_complete": flag_complete,
            "create_at": datetime.now() ,
            "update_at": datetime.now() ,
            "ModelOwnerId": model_details.id,
        }

        MlClassifier.add(MlClassifier_record)
        db.session.commit()
        return {
            "message": "Inferencia ejecutada y resultado guardado exitosamente.",
            "article_id": article.id,
            "prediction": MlClassifier_record["prediction"],
            "probability_excluded": MlClassifier_record["probability_excluded"],
            "probability_included": MlClassifier_record["probability_included"]
        }
    except Exception as e:
        logger.error(f"Error al ejecutar la inferencia: {str(e)}")
        db.session.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno del servidor.")
@app_ml.post("/batch_inference", summary="Ejecutar inferencia masiva",
              description="Ejecuta inferencia sobre m\u00faltiples art\u00edculos con un modelo ML")
async def batch_inference(username: str = Form(...), 
                          model_id: str = Form(...),
                          article_ids: str = Form(..., description="Lista de IDs de art\u00edculos separados por comas")):
    
    user = Users.get_username(username)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuario no autorizado")
    
    try:
        # Parsear IDs de art\u00edculos
        articles_list = article_ids.split(',')
        
        # Obtener modelo
        model_details = TrainedModel.get_id(model_id)
        if not model_details:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Modelo no encontrado")
        
        # Cargar modelo y vectorizer
        model_data_bytes = base64.b64decode(model_details.model_data)
        model_and_vectorizer = pickle.loads(model_data_bytes)
        model = model_and_vectorizer['model']
        vectorizer = model_and_vectorizer['vectorizer']
        
        predictions = []
        skipped = 0
        
        # Procesar cada art\u00edculo
        for article_id in articles_list:
            article_id = article_id.strip()
            if not article_id:
                continue
                
            try:
                # Verificar si ya existe predicción para este artículo y modelo
                existing_prediction = MlClassifier.get_by_article_and_model(article_id, model_id)
                if existing_prediction:
                    skipped += 1
                    continue
                
                # Obtener artículo de la base de datos
                article = Articles.get_id(article_id)
                if not article or not article.abstract:
                    continue
                
                # Vectorizar
                input_data = vectorizer.transform([article.abstract], flag_lematized=True)
                input_data = input_data.toarray()
                
                # Predecir
                predict_result = model.predict(input_data)
                
                # Guardar en base de datos
                ml_record = {
                    "id_article": article_id,
                    "prediction": predict_result["labels"][0],
                    "probability_excluded": predict_result["probabilities"][0][0],
                    "probability_included": predict_result["probabilities"][0][1],
                    "flag_complete": True,
                    "create_at": datetime.now(),
                    "update_at": datetime.now(),
                    "ModelOwnerId": model_id,
                }
                
                MlClassifier.add(ml_record)
                
                predictions.append({
                    "article_id": article_id,
                    "prediction": predict_result["labels"][0],
                    "confidence": float(max(predict_result["probabilities"][0]))
                })
                
            except Exception as e:
                logger.error(f"Error processing article {article_id}: {e}")
                continue
        
        db.session.commit()
        
        return {
            "message": f"Inferencia masiva completada. {len(predictions)} nuevos, {skipped} omitidos.",
            "total_processed": len(predictions),
            "total_skipped": skipped,
            "predictions": predictions
        }
        
    except Exception as e:
        logger.error(f"Error in batch inference: {e}")
        db.session.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@app_ml.get("/download/{research_id}", summary="Descargar predicciones ML como CSV",
             description="Descarga todas las predicciones ML en formato CSV")
async def download_ml_predictions_csv(research_id: str):
    from fastapi.responses import StreamingResponse
    import io
    import pandas as pd
    
    try:
        # Obtener modelos de la investigaci\u00f3n
        models = TrainedModel.get_by_research(research_id)
        if not models:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No hay modelos para esta investigaci\u00f3n")
        
        model_ids = [m['id'] for m in models]
        
        # Obtener todas las predicciones
        all_predictions = []
        for model_id in model_ids:
            predictions = MlClassifier.get_all_by_model(model_id)
            if predictions:
                all_predictions.extend(predictions)
        
        if not all_predictions:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No hay predicciones para esta investigaci\u00f3n")
        
        # Convertir a DataFrame
        df = pd.DataFrame(all_predictions)
        
        # Crear CSV en memoria
        stream = io.StringIO()
        df.to_csv(stream, index=False, encoding='utf-8')
        stream.seek(0)
        
        return StreamingResponse(
            iter([stream.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=ml_predictions_{research_id}.csv"}
        )
        
    except Exception as e:
        logger.error(f"Error downloading ML predictions CSV for research {research_id}: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error al descargar CSV: {str(e)}")

@app_ml.get("/predictions/{research_id}", summary="Obtener predicciones ML por investigaci\u00f3n",
             description="Obtiene todas las predicciones ML de una investigaci\u00f3n")
async def get_ml_predictions(research_id: str):
    try:
        # Obtener modelos de la investigaci\u00f3n
        models = TrainedModel.get_by_research(research_id)
        if not models:
            return {"predictions": [], "total": 0, "message": "No hay modelos entrenados"}
        
        model_ids = [m['id'] for m in models]
        
        # Obtener todas las predicciones de todos los modelos
        all_predictions = []
        for model_id in model_ids:
            predictions = MlClassifier.get_all_by_model(model_id)
            if predictions:
                all_predictions.extend(predictions)
        
        return {
            "predictions": all_predictions,
            "total": len(all_predictions),
            "message": f"Se encontraron {len(all_predictions)} predicciones"
        }
        
    except Exception as e:
        logger.error(f"Error getting ML predictions for research {research_id}: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error al obtener predicciones: {str(e)}")
