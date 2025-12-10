import os
from langchain_openai import OpenAIEmbeddings, AzureOpenAIEmbeddings
from langchain_huggingface import HuggingFaceEmbeddings

class Embedding:
    """
    A class to handle different types of text embeddings.

    The `Embedding` class allows users to generate embeddings using multiple 
    models depending on the embedding type specified. The supported embedding 
    types are "spacy", "openai", and "nomic".
    ---------------------------------------------------------------------------
    Attributes:
        model (object): The embedding model used based on the selected embedding type.
        name_model (str): Name of the embedding type.

    Methods:
        __init__(model: str = None, embedding_type: str = "spacy", kwargs: dict = {}):
            Initializes the Embedding class with the specified embedding type 
            and optional model parameters.
    """

    def __init__(self, model: str = None, embedding_type: str = "openai", url: str = None, kwargs: dict = {}) -> None:
        """
        Initializes the Embedding class.
        --------------------------------------------------------------------------------------
        Parameters:
            model (str, optional): The name of the model to use for embeddings. If not provided, 
                                   defaults to a specific model based on the embedding type.
            embedding_type (str, optional): The type of embedding to use, either "spacy", "openai", 
                                            , "nomic", or "huggingface". Default is "spacy".
            kwargs (dict, optional): Additional keyword arguments passed to the embedding model 
                                     initialization.

        Raises:
            AssertionError: If an OpenAI API key is not provided when using "openai" embedding type.
            AssertionError: If an model is not provided when using "huggingface" embedding type
            Exception: If an unsupported embedding type is specified.

        Example:
            emb = Embedding(embedding_type="openai", model="text-embedding-3-large", kwargs={"key": "api_key"})
        """

        allowed_types = ["spacy", "openai", "nomic", "huggingface", "azure"]


        if "openai" in embedding_type:
            assert os.environ.get("OPENAI_API_KEY", "") != "", "OpenAI API key is required for 'openai' embedding type."
            if model is None: 
                model = "text-embedding-3-large"
            self.model = OpenAIEmbeddings(model=model, **kwargs)

        elif "azure" in embedding_type:
            assert os.environ.get("AZURE_OPENAI_API_KEY", "") != "", "Azure OpenAI API key is required for 'azure' llm type."
            assert os.environ.get("AZURE_ENDPOINT", "") != "", "Azure OpenAI API endpoint is required for 'azure' llm type."
            assert os.environ.get("AZURE_API_VERSION", "") != "", "Azure OpenAI API version is required for 'azure' llm type."
            assert model is not None, "Model name must be specified for 'azure' llm type."
            
            self.model = AzureOpenAIEmbeddings(
                azure_endpoint=os.environ.get("AZURE_ENDPOINT"),
                azure_deployment=model, 
                api_version=os.environ.get("AZURE_API_VERSION"),
                **kwargs
            )

        
        elif "bert" in embedding_type:
            if model is None:
                model = "bert-base-nli-mean-tokens"
            self.model = HuggingFaceEmbeddings(model_name="sentence-transformers/"+ model, **kwargs)

        else:
            raise Exception("embedding type must be one of: " + " or ".join(allowed_types))

        self.name_model = embedding_type