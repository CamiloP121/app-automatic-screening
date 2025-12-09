import os
from langchain_openai import ChatOpenAI, AzureChatOpenAI
#from langchain_groq import ChatGroq
#from langchain_ollama import ChatOllama
import json
# from mille_llm.others.helpers import deepseck_out_think

class ChatLLM:
    """
    A class to handle different types of language models (LLMs).

    The `ChatLLM` class allows users to initialize and manage various language models, 
    such as Ollama, OpenAI, and Groq, depending on the specified LLM type. It supports 
    the configuration of model parameters like API keys, model names, temperatures, and 
    other optional settings.
    ---------------------------------------------------------------------------
    Attributes:
        model (object): The initialized language model based on the specified LLM type.
        name_model (str): Name or type of the language model initialized.

    Methods:
        __init__(llm_type: str = "openai", model: str = None, temperature: int = 0.7, url: str = None, kwargs: dict = {}):
            Initializes the ChatLLM class with the specified language model type and optional parameters.
        
        invoke(text: str):
            Invokes the initialized language model with the given text input.
    """
    def __init__(self, llm_type: str = "openai", model: str = None, temperature: int = 0.7, url: str = None, kwargs = {}) -> None:
        """
        Initializes the ChatLLM class.
        --------------------------------------------------------------------------------------
        Parameters:
            llm_type (str, optional): The type of LLM to use, either "ollama", "openai", or "groq". Default is "openai".
            model (str, optional): The name of the model to use for the LLM. If not provided, a default model 
                                   will be used depending on the LLM type.
            temperature (int, optional): The temperature setting for the LLM, controlling the randomness 
                                         of the model's output. Default is 0.7.
            url (str, optional): The base URL to use for Ollama LLM if `ollama` is selected as the type.
            kwargs (dict, optional): Additional keyword arguments passed to the LLM initialization.
        
        Raises:
            AssertionError: If a required API key is not provided for "openai" or "groq" LLM types.
            AssertionError: If a model name or URL is not provided for the "ollama" LLM type.
            Exception: If an unsupported LLM type is specified.

        Example:
            chat_llm = ChatLLM(llm_type="openai", model="gpt-3.5-turbo", temperature=0.5)
        """
        self.name_model = llm_type

        allowed_types = ["ollama", "openai", "groq", "azure"]

        # Ollama LLM
        """
        if "ollama" in llm_type:
            assert model is not None, "No model name specified"
            assert url is not None, "Missing url_base to use Ollama LLM"
            self.model = ChatOllama(model=model, base_url=url, **kwargs)
        """
        # OpenAI LLM
        if "openai" in llm_type:
            assert os.environ.get("OPENAI_API_KEY", "") != "", "OpenAI API key is required for 'openai' llm type."
            if not model: 
                model = "gpt-3.5-turbo-16k"
            self.model = ChatOpenAI(model_name=model, temperature=temperature, **kwargs)
        elif "azure" in llm_type:
            assert os.environ.get("AZURE_OPENAI_API_KEY", "") != "", "Azure OpenAI API key is required for 'azure' llm type."
            assert os.environ.get("AZURE_ENDPOINT", "") != "", "Azure OpenAI API endpoint is required for 'azure' llm type."
            assert os.environ.get("AZURE_API_VERSION", "") != "", "Azure OpenAI API version is required for 'azure' llm type."
            assert model is not None, "Model name must be specified for 'azure' llm type."
            
            self.model = AzureChatOpenAI(
                azure_endpoint=os.environ.get("AZURE_ENDPOINT"),
                azure_deployment=model, 
                api_version=os.environ.get("AZURE_API_VERSION"),
                temperature=temperature,
                **kwargs
            )
            """
            # Groq LLM
            elif "groq" in llm_type:
                assert os.environ.get("GROQ_API_KEY", "") != "", "GROQ API key is required for 'groq' llm type."
                if not model: 
                    model = "Llama3-8B-8k"
                self.model = ChatGroq(model=model, temperature=temperature, **kwargs)
            """
        else: 
            raise Exception("LLM type must be one of: " + " or ".join(allowed_types))

    def invoke(self, text: str, json_output: bool = False) -> str:
        """
        Invoke the language model with the given text input.

        Parameters:
            text (str): The text input to pass to the language model.
        
        Returns:
            result (str): The result of the model's response to the input text.
        
        Raises:
            Exception: If there is an error during the invocation of the model.
        """
        try:
            result = self.model.invoke(text)
            if json_output:
                try:
                    r = self.parser_json(result.content)
                    result.content = r
                except Exception as e:
                    print(f"Error decoding JSON: {e}. Response: {result.content}")
                    raise Exception("The model did not return a valid JSON response.")
            return result
        except Exception as e:
            print(e)
            raise Exception("Error in applying LLM model.")
        
    async def ainvoke(self, text: str, json_output: bool = False):
        try:
            result = await self.model.ainvoke(text)
            if json_output:
                try:
                    r = self.parser_json(result.content)
                    result.content = r
                except Exception as e:
                    print(f"Error decoding JSON: {e}. Response: {result.content}")
                    raise Exception("The model did not return a valid JSON response.")
            return result
        except Exception as e:
            print(e)
            raise Exception("Error in applying LLM model.")

    def parser_json(self, text):
        try:
            json_response = json.loads(text)
        except Exception as _:
            try:
                json_response = json.loads(text.strip('```json\n').strip('```'))
            except Exception as _:
                try:
                    json_response = json.loads(
                        text.strip('```json\n').strip('```')
                        .replace('False', 'false')
                        .replace('True', 'true')
                    )
                except Exception as e:
                    raise Exception(f"Error in JSON Parser. Error: {e}")

        return json_response