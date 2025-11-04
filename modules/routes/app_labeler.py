# API
from fastapi import APIRouter, Form
from fastapi import status, HTTPException

# General
from datetime import datetime

# Db
from modules.models import db, Users, Research, Articles, AiLabeled

# LLM Model
from modules.core.chat_llm import ChatLLM
from modules.Utils import classify_paper_sync, classify_paper_async
from modules.Utils.load_helpers import load_text

# Logger
from modules.logger_config import logger

# LLM
clasificador_llm = ChatLLM(llm_type="openai", 
                           model="gpt-4o-mini-2024-07-18", 
                           temperature=0.0) 


app_labeler = APIRouter()

base_prompt = load_text("BasePrompt.txt")

@app_labeler.post("/process", summary="Etiquetado de artículos", 
                  description="Este endpoint permite etiquetar artículos para una investigación específica.")
def labeler(username: str = Form(..., description="Nombre de usuario"),
            research_id: str = Form(..., description="ID de la investigación a la que se asocia el recuperador"),
            article_id: str = Form(..., description="ID de artículos a etiquetar"),):
    
    user = Users.get_username(username)
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El usuario está inactivo.")
    
    research = Research.get_id(research_id)
    if not research:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigación no encontrada.")
    if not research.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="La investigación está inactiva.")
    
    try:
        article = Articles.get_id(article_id)
        if not article:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Artículo con ID {article_id} no encontrado.")

        response = AiLabeled.get_prediction_reasoning(article.id, research.id)
        if response:
            logger.info(f"Artículo {article_id} ya etiquetado previamente.")
        
        else:
            _input = {
                "review_type": research.type_research,
                "study_topic": research.title,
                "inclusion_criteria": "\n-".join(research.criteria_inclusion.split('|&|')),
                "title": article.title,
                "abstract": article.abstract
            }
            prompt = base_prompt.format(**_input)
            prediction, reasoning, total_tokens, input_tokens, output_tokens = classify_paper_sync(clasificador_llm, prompt)
            dict_new = {
                    "id_article": article.id,
                    "prompt_input": prompt,
                    "prediction": prediction,
                    "reasoning": reasoning,
                    "ResearchOwnerId": research.id,
                    "tokens_input": input_tokens,
                    "tokens_output": output_tokens,
                    "tokens_total": total_tokens,
                    "flag_complete": True if prediction != 'no_classified' else False,
                    "create_at": datetime.now(),
                    "update_at": datetime.now(),
                }
            AiLabeled.add(dict_new)
            logger.info(f"Artículo {article.id} etiquetado correctamente.")
        db.session.commit()

            # Aquí iría la lógica para etiquetar el artículo
        return {"message": f"Artículo {article_id} etiquetado con éxito"}
    except Exception as e:
        logger.error(f"Error al etiquetar artículo: {e}")
        db.session.rollback()
        if 'quota' in str(e).lower():
            raise HTTPException(status_code=429, detail="Límite de cuota alcanzado para el servicio de LLM")
        raise HTTPException(status_code=500, detail="Error al etiquetar artículo")

@app_labeler.post("/process-async", summary="Etiquetado de artículos", 
                  description="Este endpoint permite etiquetar artículos para una investigación específica.")
async def labeler_async(username: str = Form(..., description="Nombre de usuario"),
            research_id: str = Form(..., description="ID de la investigación a la que se asocia el recuperador"),
            article_id: str = Form(..., description="ID de artículos a etiquetar"),):
    
    user = Users.get_username(username)
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El usuario está inactivo.")
    
    research = Research.get_id(research_id)
    if not research:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigación no encontrada.")
    if not research.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="La investigación está inactiva.")
    
    try:
        article = Articles.get_id(article_id)
        if not article:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Artículo con ID {article_id} no encontrado.")

        response = AiLabeled.get_prediction_reasoning(article.id, research.id)
        if response:
            logger.info(f"Artículo {article_id} ya etiquetado previamente.")
        
        else:
            _input = {
                "review_type": research.type_research,
                "study_topic": research.title,
                "inclusion_criteria": "\n-".join(research.criteria_inclusion.split('|&|')),
                "title": article.title,
                "abstract": article.abstract
            }
            prompt = base_prompt.format(**_input)
            prediction, reasoning, total_tokens, input_tokens, output_tokens = await classify_paper_async(clasificador_llm, prompt)
            dict_new = {
                    "id_article": article.id,
                    "prompt_input": prompt,
                    "prediction": prediction,
                    "reasoning": reasoning,
                    "ResearchOwnerId": research.id,
                    "tokens_input": input_tokens,
                    "tokens_output": output_tokens,
                    "tokens_total": total_tokens,
                    "flag_complete": True if prediction != 'no_classified' else False,
                    "create_at": datetime.now(),
                    "update_at": datetime.now(),
                }
            AiLabeled.add(dict_new)
            logger.info(f"Artículo {article.id} etiquetado correctamente.")
        db.session.commit()

            # Aquí iría la lógica para etiquetar el artículo
        return {"message": f"Artículo {article_id} etiquetado con éxito"}
    except Exception as e:
        logger.error(f"Error al etiquetar artículo: {e}")
        db.session.rollback()
        if 'quota' in str(e).lower():
            raise HTTPException(status_code=429, detail="Límite de cuota alcanzado para el servicio de LLM")
        raise HTTPException(status_code=500, detail="Error al etiquetar artículo")
    


@app_labeler.get("/summary", summary="Resumen de etiquetado de artículos",
                 description="Devuelve un resumen de los artículos etiquetados para una investigación.")
def labeler_summary(research_id: str):
    items = AiLabeled.get_by_research(research_id)
    total_items = len(items)
    complete_true = sum(1 for i in items if i["flag_complete"])
    complete_false = total_items - complete_true
    total_tokens = sum(i["tokens_total"] or 0 for i in items)

    return {
        "total_items": total_items,
        "complete_true": complete_true,
        "complete_false": complete_false,
        "total_tokens": total_tokens,
        "items": items
    }

@app_labeler.post("/reprocess", summary="Reprocesar artículos etiquetados",
                  description="Reprocesa artículos para una investigación según el método indicado: 'all' para todos, 'fails' para solo los incompletos.")
def labeler_reprocess(research_id: str = Form(..., description="ID de la investigación"),
                      method: str = Form('fails', description="Método de reprocesamiento: 'all' o 'fails'")):
    research = Research.get_id(research_id)
    if not research:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigación no encontrada.")
    if not research.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="La investigación está inactiva.")

    items = AiLabeled.get_by_research(research_id)
    if method == "fails":
        items = [i for i in items if not i["flag_complete"]]
    elif method != "all":
        raise HTTPException(status_code=400, detail="Método inválido. Use 'all' o 'fails'.")

    reprocessed = []
    for item in items:
        article = Articles.get_id(item["id_article"])
        if not article:
            continue

        _input = {
            "review_type": research.type_research,
            "study_topic": research.title,
            "inclusion_criteria": "\n-".join(research.criteria_inclusion.split('|&|')),
            "title": article.title,
            "abstract": article.abstract
        }
        prompt = base_prompt.format(**_input)
        prediction, reasoning, total_tokens, input_tokens, output_tokens = classify_paper_sync(clasificador_llm, prompt)
        dict_update = {
            "prompt_input": prompt,
            "prediction": prediction,
            "reasoning": reasoning,
            "tokens_input": input_tokens,
            "tokens_output": output_tokens,
            "tokens_total": total_tokens,
            "flag_complete": True if prediction != 'no_classified' else False,
            "update_at": datetime.now(),
        }
        try:
            AiLabeled.update(item["id_article"], dict_update)
            reprocessed.append(item["id_article"])
        except Exception as e:
            logger.error(f"Error reprocesando artículo {item['id_article']}: {e}")

    db.session.commit()
    return {
        "message": f"Reprocesados {len(reprocessed)} artículos.",
        "reprocessed_ids": reprocessed
    }