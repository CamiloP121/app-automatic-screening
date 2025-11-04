from modules.logger_config import logger

def classify_paper_sync(chat_llm, prompt):
    """
    Clasifica un artículo científico de forma síncrona.
    """
    try:
        response = chat_llm.invoke(prompt, json_output=True)
        prediction = response.content.get("prediction")
        reasoning = response.content.get("reasoning")
        total_tokens = response.usage_metadata.get("total_tokens")
        input_tokens = response.usage_metadata.get("input_tokens")
        output_tokens = response.usage_metadata.get("output_tokens")
    except Exception as e:
        logger.error(f"Error in classifying the article: {e}")
        prediction = "no_classified"
        reasoning = "Error processing the application."
        total_tokens = 0
        input_tokens = 0
        output_tokens = 0

    return prediction, reasoning, total_tokens, input_tokens, output_tokens

async def classify_paper_async(chat_llm, prompt):
    """
    Clasifica un artículo científico de forma asíncrona.
    """
    try:
        response = await chat_llm.ainvoke(prompt, json_output=True)
        prediction = response.content.get("prediction")
        reasoning = response.content.get("reasoning")
        total_tokens = response.usage_metadata.get("total_tokens")
        input_tokens = response.usage_metadata.get("input_tokens")
        output_tokens = response.usage_metadata.get("output_tokens")
    except Exception as e:
        logger.error(f"Error in classifying the article: {e}")
        prediction = "no_classified"
        reasoning = "Error processing the application."
        total_tokens = 0
        input_tokens = 0
        output_tokens = 0

    return prediction, reasoning, total_tokens, input_tokens, output_tokens