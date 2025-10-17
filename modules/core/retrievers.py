#from mille_llm.core.vectorestore import VectorStore

#from mille_llm.core.vectorestore_pg import VectorStorePG

from langchain_text_splitters.base import TextSplitter

from langchain.storage import InMemoryStore
from langchain.retrievers import ParentDocumentRetriever
from langchain.docstore.document import Document

class SimpleRetriever:
    """
    This class represents a simple retriever that performs search operations on a vector store using various search methods, 
    such as similarity-based searches. It provides functionality to update the vector store, search parameters, and apply 
    the search on input text.

    Attributes:
    ------------
    vectorstore : VectorStore
        The vector store object that holds the documents for search.
    search_type : str
        The type of search to perform (e.g., 'similarity').
    search_kwargs : dict
        Additional search parameters used for refining search behavior.
    retriever : object
        The retriever object that executes the search queries on the vector store.
    """
    def __init__(self, vectorstore = None, search_type: str = "similarity", search_kwargs: dict = {}) -> None:
        """
        Initializes the `SimpleRetriever` instance with a vector store, search type, and search keyword arguments.
        
        Parameters:
        -----------
        vectorstore : VectorStore
            The vector store instance containing the documents.
        search_type : str, optional
            The type of search to perform (default is "similarity").
        search_kwargs : dict, optional
            Additional search parameters (default is an empty dictionary).

        Raises:
        -------
        AssertionError:
            - If `vectorstore` is not provided or is not an instance of `VectorStore`.
            - If the `vectorstore.db` is not defined (no documents in the vector store).
        """
        assert vectorstore is not None, "vectorstore has not been established"
        #assert isinstance(vectorstore, VectorStore) or isinstance(vectorstore, VectorStorePG), "Object model is not an instance of mille_llm.core.VectorStore or mille_llm.core.vectorestore_pg"
        assert vectorstore.db is not None, "No documents defined in the vectorstore"

        self.vectorstore = vectorstore
        self.search_type = search_type
        self.search_kwargs = search_kwargs

        self.retriever = self.create()

    def create(self):
        """
        Creates the retriever object based on the current vector store and search configuration.
        
        Returns:
        --------
        object
            The retriever object configured for performing searches.

        Raises:
        -------
        Exception:
            If an error occurs during the creation of the retriever object.
        """
        try:
            retriever = self.vectorstore.db.as_retriever(search_type=self.search_type, search_kwargs=self.search_kwargs)
        except Exception as e:
            print(e)
            raise Exception("Error in SimpleRetriever construction")

        return retriever
    
    def update(self, docs: list = None, search_type: str = None, search_kwargs: dict = None, sources: bool = None):
        """
        Updates the retriever by adding new documents, changing the search type, or modifying the search keyword arguments.
        
        Parameters:
        -----------
        docs : list, optional
            A list of new documents to be added to the vector store.
        search_type : str, optional
            A new search type to update the retriever.
        search_kwargs : dict, optional
            New search parameters to update the retriever's behavior.
        sources : bool, optional
            A flag to indicate whether to return document sources (not implemented yet).
        """
        if docs is not None:
            self.vectorstore.add_docs(docs)

        if search_type is not None:
            self.search_type = search_type

        if search_kwargs is not None:
            self.search_kwargs = search_kwargs

        self.retriever = self.create()

    def invoke(self, text: str):
        """
        Applies the search retriever to the input text and returns the search results.
        
        Parameters:
        -----------
        text : str
            The input text to be used for searching the vector store.
        
        Returns:
        --------
        list
            The search results returned by the retriever.
        
        Raises:
        -------
        Exception:
            If an error occurs during the search execution.
        """
        try:
            result = self.retriever.invoke(text)
        except Exception as e:
            print(e)
            raise Exception("Error apply retriever search")
        return result