# API
from fastapi import APIRouter, Form, UploadFile, File
from fastapi import status, HTTPException
# General
import os
from datetime import datetime
from pathlib import Path
import pandas as pd
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
    tags=["Data Loading"]
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
