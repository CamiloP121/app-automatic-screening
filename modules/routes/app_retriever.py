# API
from fastapi import APIRouter, Form
from fastapi import status, HTTPException

# General
import os
from typing import List
from datetime import datetime
import pandas as pd
# Db
from modules.models import Users, Research, Datasets, Articles

# Retriever
from modules.core import Embedding, SimpleRetriever, VectorStorePG
## Craer documentos
from langchain.docstore.document import Document

# Logger
from modules.logger_config import logger

# Embedding
embedding = Embedding(embedding_type="openai", model = "text-embedding-3-small")

assert os.environ.get("db_uri_vs", "") != "", "DATABASE_URL is not set in environment variables"
connection_string = os.environ.get("db_uri_vs", "")

app_retriever = APIRouter()

@app_retriever.post("/create", summary="Crear un nuevo Recuperador semántico",
                    description="Este endpoint permite crear un nuevo Recuperador semántico asociado a una investigación.")
def create_retriever(username: str = Form(..., description="Nombre de usuario"),
                    research_id: str = Form(..., description="ID de la investigación a la que se asocia el recuperador")):
    
    user = Users.get_username(username)
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El usuario está inactivo.")
    
    research = Research.get_id(research_id)
    if not research:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigación no encontrada.")
    if not research.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="La investigación está inactiva.")
    try:
        
        datasets = Datasets.get_all_by_research(research_id)
        
        if datasets.empty:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No hay datasets asociados a la investigación.")
        
        dfs = []
        for dataset_id_found in datasets["id"].values:

            articles = Articles.get_all_by_dataset(dataset_id_found)
            if articles.empty:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No hay artículos asociados al dataset {dataset_id_found}.")

            dfs.append(articles)
        
        df =  pd.concat(dfs, ignore_index=True)
        if df.empty:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No hay artículos asociados a los datasets de la investigación.")
        
        # Crear VectorStorePG
        try:
            vs = VectorStorePG(
                connection_string   = connection_string,
                collection_name     = f"research_{research_id}",
                embedding           = embedding,
                collection_metadata = {
                    "id": research_id,
                    "name_research": username,
                    "author": user.name,
                }
            )
        except Exception as e:
            logger.error(f"Error creating VectorStorePG: {e}")
            vs.engine.dispose()
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno al crear el recuperador.")

        try:
            docs = []
            for _, row in df.iterrows():
                docs.append(Document(
                        page_content=f"{row['title']} \n{row['abstract']}",
                        metadata={"id": row["id"]}
                    ))
                
            logger.info(f"Loading {len(docs)} documents for vector store....")
            # Enviar los documentos en paquetes de 100
            batch_size = 100
            for i in range(0, len(docs), batch_size):
                batch = docs[i:i+batch_size]
                ids_batch = [doc.metadata['id'] for doc in batch]
                vs.add_documents(batch, ids=ids_batch)
                logger.info(f"Sent batch {i//batch_size + 1} with {len(batch)} documents.")
            logger.info("Documents added to VectorStorePG.")
        except Exception as e:
            logger.error(f"Error adding documents to VectorStorePG: {e}")
            vs.engine.dispose()
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno al agregar documentos al recuperador.")

        return {"message": "Retriever created successfully", "research_id": f"research_{research_id}"}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error creating retriever: {str(e)}")
    
@app_retriever.post("/query", summary="Consultar el Recuperador semántico",
                    description="Este endpoint permite consultar el Recuperador semántico asociado a una investigación.")
def query_retriever(username: str = Form(..., description="Nombre de usuario"),
                    research_id: str = Form(..., description="ID de la investigación asociada al recuperador")):
    
    try:
        user = Users.get_username(username)
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El usuario está inactivo.")
        
        research = Research.get_id(research_id)
        if not research:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigación no encontrada.")
        if not research.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="La investigación está inactiva.")
        
        # Cargar VectorStorePG
        try:
            vs = VectorStorePG(
                connection_string   = connection_string,
                collection_name     = f"research_{research_id}",
                embedding           = embedding,
            )
        except Exception as e:
            logger.error(f"Error loading VectorStorePG: {e}")
            vs.engine.dispose()
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno al cargar el recuperador.")
        
        try:
            search_type="similarity"
            search_kwargs={'k': 5, 'score_threshold': 0.65}
            retriever = SimpleRetriever(vectorstore=vs,
                            search_type=search_type,
                            search_kwargs=search_kwargs
                            )
            query = research.title
            print(query)
            results = retriever.invoke(query)
            logger.info(f"Total results found Abstract Retriever: {len(results)}")
            vs.engine.dispose()
            return {"query": query, "results": [doc.metadata['id'] for doc in results]}
        except Exception as e:
            logger.error(f"Error querying VectorStorePG: {e}")
            vs.engine.dispose()
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno al consultar el recuperador.")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error querying retriever: {str(e)}")
    
@app_retriever.delete("/delete", summary="Eliminar el Recuperador semántico",
                    description="Este endpoint permite eliminar el Recuperador semántico asociado a una investigación.")
def delete_retriever(username: str = Form(..., description="Nombre de usuario"),
                    research_id: str = Form(..., description="ID de la investigación asociada al recuperador")):
    
    try:
        user = Users.get_username(username)
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El usuario está inactivo.")
        
        research = Research.get_id(research_id)
        if not research:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigación no encontrada.")
        if not research.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="La investigación está inactiva.")
        
        # Cargar VectorStorePG
        try:
            vs = VectorStorePG(
                connection_string   = connection_string,
                collection_name     = f"research_{research_id}",
                embedding           = embedding,
            )
        except Exception as e:
            logger.error(f"Error loading VectorStorePG: {e}")
            vs.engine.dispose()
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno al cargar el recuperador.")
        
        try:
            vs.delete_collection()
            vs.engine.dispose()
            return {"message": "Retriever deleted successfully", "research_id": f"research_{research_id}"}
        except Exception as e:
            logger.error(f"Error deleting VectorStorePG collection: {e}")
            vs.engine.dispose()
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno al eliminar el recuperador.")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error deleting retriever: {str(e)}")
    
@app_retriever.delete("/delete-articles", summary="Eliminar articulos del Recuperador semántico",
                    description="Este endpoint permite eliminar artículos específicos del Recuperador semántico asociado a una investigación.")
def delete_articles_retriever(username: str = Form(..., description="Nombre de usuario"),
                    research_id: str = Form(..., description="ID de la investigación asociada al recuperador"),
                    article_ids: List[str] = Form(..., description="IDs de los artículos a eliminar")):
    
    try:
        user = Users.get_username(username)
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El usuario está inactivo.")
        
        research = Research.get_id(research_id)
        if not research:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigación no encontrada.")
        if not research.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="La investigación está inactiva.")
        
        # Cargar VectorStorePG
        try:
            vs = VectorStorePG(
                connection_string   = connection_string,
                collection_name     = f"research_{research_id}",
                embedding           = embedding,
            )
        except Exception as e:
            logger.error(f"Error loading VectorStorePG: {e}")
            vs.engine.dispose()
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno al cargar el recuperador.")
        
        try:
            vs.delete_by_ids(ids=article_ids)
            vs.engine.dispose()
            return {"message": "Articles deleted successfully from retriever", "research_id": f"research_{research_id}", "deleted_article_ids": article_ids}
        except Exception as e:
            logger.error(f"Error deleting articles from VectorStorePG: {e}")
            vs.engine.dispose()
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno al eliminar artículos del recuperador.")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error deleting articles from retriever: {str(e)}")
    