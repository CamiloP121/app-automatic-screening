# API
from fastapi import APIRouter, Form, UploadFile, File
from fastapi import status, HTTPException
# General
import os
from datetime import datetime
from pathlib import Path
import pandas as pd
from typing import List
# Async
import asyncio
# Db
from modules.models import db, Users, Research, Datasets, Articles
# Own
from app import logger
from modules.Utils.load_helpers import saveFAPIFile
from modules.core.tools import load_data, Translator

app_loader = APIRouter()

extensions = ['.csv', '.xlsx']

SAVE_TMP_FILE = os.getenv("SAVE_TMP_FILE", "app-automatic-screening-volumen/tmp_files")

# Traductor
translator = Translator()

@app_loader.post(
    "/load-data",
    summary="Cargar datos a la investigación", 
    description="Este endpoint permite cargar datos (datasets o artículos) a una investigación específica",
)
async def load_as(username: str = Form(..., description="Nombre de usuario que realiza la carga"),
    research_id: str = Form(..., description="ID de la investigación a la que se cargarán los datos"),
    file: UploadFile = File(..., description="Archivo a cargar (ej. CSV, XLSX, JSON, TXT, PDF)")):
    
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
        filename = file.filename
        logger.debug(f"User {username} is uploading file {filename} to research {research_id}")
        Path(SAVE_TMP_FILE).mkdir(parents=True, exist_ok=True)
        saveFAPIFile(file, SAVE_TMP_FILE) # Save in local
        logger.debug("File saved temporarily")

        df = load_data(path_dbs=SAVE_TMP_FILE, filename=filename, flag_test=research.is_test)
        if df is None or df.empty:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El archivo está vacío o no se pudo leer.")
        logger.debug(f"File {filename} loaded into DataFrame with {len(df)} records")

        # Traducor archivos
        vec = []
        df['abstract_original'] = df['abstract']
        for text in df['abstract'].values:
            try:
                lang, confidence, text_tr = await translator.check_en(str(text))
                # lang, confidence, text_tr = 'en', 1.0, str(text)  # Simulating translation for demonstration
                vec.append([lang, confidence, text_tr])
            except Exception as e:
                logger.warning(f"Error translating text: {text} - {e}")
                vec.append([None, None, text])  # Append original text if translation fails

        df[['lang', 'confidence', 'abstract']] = pd.DataFrame(vec, index=df.index)

        # Guardar dataset
        dataset_id = Datasets.generate_unique_id()
        dict_new = {
            "id": dataset_id,
            "filename": filename,
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "number_of_records": len(df),
            "datasetOwnerId": research_id
        }
        Datasets.add(dict_new)
        logger.debug(f"Dataset {filename} registered with ID {dataset_id}")

        # Guardar en DB
        for _, row in df.iterrows():
            article_id = Articles.generate_unique_id()
            dict_new = {
                "id": article_id,
                "title": row.get('title', ''),
                "abstract": row.get('abstract', ''),
                "abstract_original": row.get('abstract_original', ''),
                "year": int(row.get('year')) if pd.notna(row.get('year')) and str(row.get('year')).isdigit() else None,
                "created_at": datetime.now(),
                "updated_at": datetime.now(),
                "is_active": True,
                "articleOwnerId": dataset_id
            }
            if research.is_test:
                dict_new["label"] = row.get('label', None)
            Articles.add(dict_new)
        db.session.commit()
        logger.info(f"User {username} successfully loaded {len(df)} articles to research {research_id}")
        return {"message": f"Successfully loaded {len(df)} articles to research {research_id}"}
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error loading data: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error loading data: {str(e)}")
    finally:
        # Delete temporary file
        try:
            os.remove(os.path.join(SAVE_TMP_FILE, filename))
        except Exception as e:
            logger.warning(f"Could not delete temporary file {filename}: {e}")

@app_loader.post("/list-datasets", summary="Listar datasets de una investigación", 
                description="Este endpoint devuelve una lista de datasets asociados a una investigación específica")
def list_datasets(research_id: str = Form(..., description="ID de la investigación")):
    research = Research.get_id(research_id)
    if not research:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"La investigación con ID {research_id} no existe")
    datasets = db.session.query(Datasets).filter_by(datasetOwnerId=research_id).all()
    result = []
    for dataset in datasets:
        result.append({
            "id": dataset.id,
            "filename": dataset.filename,
            "created_at": dataset.created_at,
            "updated_at": dataset.updated_at,
            "number_of_records": dataset.number_of_records
        })
    return {"research_id": research_id, "datasets": result}

@app_loader.delete("/delete-dataset", summary="Eliminar un dataset",
                    description="Este endpoint elimina un dataset y todos sus artículos asociados")
def delete_dataset(dataset_id: str = Form(..., description="ID del dataset a eliminar")):
    dataset = db.session.query(Datasets).filter_by(id=dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"El dataset con ID {dataset_id} no existe")
    try:
        # Eliminar artículos asociados
        db.session.query(Articles).filter_by(articleOwnerId=dataset_id).delete()
        # Eliminar dataset
        db.session.delete(dataset)
        db.session.commit()
        logger.info(f"Dataset {dataset_id} and its articles deleted successfully")
        return {"message": f"Dataset {dataset_id} and its articles deleted successfully"}
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting dataset {dataset_id}: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error deleting dataset: {str(e)}")
    
@app_loader.delete("/delete-articles", summary="Eliminar todos los artículos de un dataset",
                    description="Este endpoint elimina todos los artículos asociados a un dataset específico")
def delete_articles(dataset_id: str = Form(..., description="ID del dataset cuyos artículos se eliminarán"), 
                    article_ids: List[str] = Form(None, description="IDs de artículos a eliminar")):
    dataset = db.session.query(Datasets).filter_by(id=dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"El dataset con ID {dataset_id} no existe")
    try:
        pass
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting articles from dataset {dataset_id}: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error deleting articles: {str(e)}")

@app_loader.post("/get-articles-by-research", summary="Obtener todos los art\u00edculos de una investigaci\ón",
                  description="Obtiene todos los art\u00edculos de todos los datasets asociados a una investigaci\ón")
async def get_articles_by_research(research_id: str = Form(..., description="ID de la investigaci\ón")):
    try:
        # Verificar que la investigaci\ón existe
        research = Research.get_id(research_id)
        if not research:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"La investigación con ID {research_id} no existe")
        
        # Obtener todos los datasets de la investigación
        df_datasets = Datasets.get_all_by_research(research_id)
        if df_datasets.empty:
            return {"articles": [], "total": 0}
        
        dataset_ids = df_datasets['id'].tolist()
        
        # Obtener todos los IDs de artículos de cada dataset
        all_article_ids = []
        for dataset_id in dataset_ids:
            df_articles = Articles.get_all_by_dataset(dataset_id)
            if not df_articles.empty:
                article_ids = df_articles['id'].tolist()
                all_article_ids.extend(article_ids)
        print(f"Total articles found: {len(all_article_ids)}")
        return {
            "article_ids": all_article_ids,
            "total": len(all_article_ids)
        }
        
    except Exception as e:
        logger.error(f"Error getting articles by research {research_id}: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error al obtener artículos: {str(e)}")
