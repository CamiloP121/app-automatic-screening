#from mille_llm.core.embedding import Embedding

import sqlalchemy as db
from langchain_postgres import PGVector
from langchain_postgres.vectorstores import Base

import os
import uuid
from datetime import datetime
import pytz

import logging

# Configurar logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VectorStorePG:
    """
    A class for managing a PostgreSQL-based vector database for storing and retrieving embeddings.
    
    Attributes:
        connection_string (str): The connection string for the PostgreSQL database.
        production (bool): Indicates whether the database is in production mode.
        collection_name (str): The name of the collection to be used in the database.
        embedding (Embedding): The embedding model used for vector storage.
        collection_metadata (dict): Metadata associated with the collection.
    """
    
    def __init__(self, 
                connection_string: str = None,
                production: bool = False,
                collection_name: str = "NLP", 
                embedding = None, 
                collection_metadata: dict = {}) -> None:
        """
        Initializes the PostgresVectorDB instance.

        Args:
            connection_string (str, optional): Database connection string. If not provided, it is retrieved from DBSettings.
            production (bool, optional): If True, uses the production schema; otherwise, uses the test schema.
            collection_name (str, optional): Name of the collection to be used.
            embedding (Embedding): The embedding model (must not be None).
            collection_metadata (dict, optional): Metadata for the collection.
        """
        
        assert embedding is not None, "Embedding model is required and cannot be None."
        # assert isinstance(embedding, Embedding), "The embedding object must be an instance of `mille_llm.Embedding`."   
        
        self.connection_string = connection_string
        

        # print(self.connection_string)
        # Test connection and set engine
        self.engine = self._test_connection()
       
       # Set schema based on production flag
        if production:
            self.schema = os.environ.get("vs_schema", "pg_vector")
            #print("DB in production mode!")
            logger.info(f"Using production schema: {self.schema}")
        else:
            self.schema = os.environ.get("vs_schema", "test")
            self._create_vector_extension()
            logger.info(f"Using test schema: {self.schema}")
            #print("DB in test mode!")  
            
        # Set schema for SQLAlchemy metadata
        Base.metadata = db.MetaData(schema=self.schema)

        # Store collection properties
        self.embedding = embedding
        self.collection_name = collection_name
        self.collection_metadata = collection_metadata
        
        # Create or retrieve collection
        try:
            if self._collection_exists():  # Collection exists
                #print("Collection exists :)")
                logger.info(f"Collection '{self.collection_name}' already exists in schema '{self.schema}'.")
                self.db = self._build(metadata=False)
            else:
                #print("Collection does not exist :(")
                logger.info(f"Collection '{self.collection_name}' does not exist in schema '{self.schema}'. Creating new collection.")
                self.db = self._build(metadata=True)
        except Exception as _:
            #print("Creating tables :D")
            logger.info(f"Creating tablaes and collection '{self.collection_name}' in schema '{self.schema}'.")
            self.db = self._build(metadata=True)

    def _test_connection(self):
        """
        Tests the database connection.
        
        Returns:
            engine: The database engine if the connection is successful.
        
        Raises:
            Exception: If the connection fails.
        """
        try:
            engine = db.create_engine(self.connection_string, connect_args={"connect_timeout": 10})
            engine.connect()
            return engine
        except Exception as err:
            raise Exception("Connection failure:", err)
        
    def _create_vector_extension(self):
        """
        Creates the necessary vector extension schema if it does not exist.
        """
        with self.engine.connect() as conn:
            print(f"Creating extension in schema: {self.schema}")
            conn.execute(db.text(f"CREATE SCHEMA IF NOT EXISTS {self.schema};"))
            conn.commit()

    def _collection_exists(self):
        """
        Checks if the specified collection exists in the database.
        
        Returns:
            bool: True if the collection exists, False otherwise.
        """
        if self.engine:
            with self.engine.connect() as connection:
                result = connection.execute(db.text("SELECT 1 FROM {}.langchain_pg_collection WHERE name = '{}' LIMIT 1".format(self.schema, self.collection_name)))
                ids = result.fetchall()
                result.close()
                return len(ids) > 0

    def _check_metadata(self):
        """
        Validates that the required metadata fields are present and adds creation details.
        """
        for meta in ["campaign", "product", "author", "assistant_name"]:
            assert meta in self.collection_metadata.keys(), "Missing parameter: {}".format(meta)

        self.collection_metadata["creation_date"] = datetime.now(pytz.timezone("America/Bogota")).strftime('%Y-%m-%d %H:%M:%S')
        self.collection_metadata["embedding_model"] = self.embedding.name_model

    def _build(self, metadata: bool):
        """
        Builds the PGVector database instance with or without metadata.
        
        Args:
            metadata (bool): Whether to include metadata in the database setup.
        
        Returns:
            PGVector: The initialized vector database.
        """
        if metadata:
            # self._check_metadata()
            db = PGVector(
                    embeddings=self.embedding.model,
                    collection_name=self.collection_name,
                    connection=self.connection_string,
                    use_jsonb=True,
                    collection_metadata=self.collection_metadata 
                )
        else:
            db = PGVector(
                    embeddings=self.embedding.model,
                    collection_name=self.collection_name,
                    connection=self.connection_string,
                    use_jsonb=True
                )
        return db
    
    # Funciones ORM
    def get_total_ids(self):
        """
        Retrieves the total count of distinct IDs in the vector store.
        
        Returns:
            list: A list containing the total count of distinct IDs.
        """
        if self.engine:
            with self.engine.connect() as connection:
                result = connection.execute(db.text("SELECT COUNT(DISTINCT langchain_pg_embedding.id) FROM {}.langchain_pg_embedding".format(self.schema)))
                number_ids = result.scalar()
                result.close()
                return int(number_ids)
            
    def generate_unique_id(self, currents_ids: list):
        """
        Generates a unique UUIDv4 that does not exist in the vector store.

        Returns:
            str: A unique UUID string.
        """
        if self.engine:
            while True:
                new_id = str(uuid.uuid4())
                with self.engine.connect() as connection:
                    result = connection.execute(
                        db.text("SELECT COUNT(*) FROM {}.langchain_pg_embedding WHERE id = :id".format(self.schema)), 
                        {"id": new_id}
                    )
                    exists = result.scalar()
                    result.close()
                    
                    if exists == 0 and new_id not in currents_ids:
                        return new_id

    def add_documents(self, docs: list = None, ids: list = None):
        """
        Adds a list of documents to the vector store.
        
        Parameters:
            docs (list): A list of documents to be added to the vector store. Each document must follow the LangChain `Document` format.

        Raises:
            AssertionError: If no documents are provided.
            Exception: If an error occurs during the insertion process.
        """
        assert docs is not None, "No documents provided"
        try:
            if ids is None:
                ids = []
                for _ in docs:
                    _id = self.generate_unique_id(currents_ids=[ids])
                    ids.append(_id)

            self.db.add_documents(docs, ids=ids)
        except Exception as e:
            print(e)
            raise Exception("Error loading vector store")

    def get_documents(self):
        """
        Retrieves all documents from the vector store.
        
        Returns:
            list: A list containing all stored documents.
        """
        if self.engine:
            with self.engine.connect() as connection:
                result = connection.execute(db.text("""
                    SELECT * FROM {}.langchain_pg_embedding lpe
                    LEFT JOIN {}.langchain_pg_collection lpc ON lpc.uuid = lpe.collection_id
                    WHERE lpc.name = '{}'
                """.format(self.schema, self.schema, self.collection_name)))
                docs = result.fetchall()
                result.close()
                return docs


    # Funciones PGV
    def delete_by_ids(self, ids: list):
        """
        Deletes vectors from the vector store by their IDs.
        
        Parameters:
            ids (list): A list of vector IDs to be deleted from the vector store.

        Raises:
            AssertionError: If no IDs are provided.
            AssertionError: If no documents are defined in the vector store.
        """
        assert ids != [], "No IDs provided"
        assert self.db is not None, "No documents defined in the vector store"
        self.db.delete(ids)

    def delete_collection(self):
        """
        Deletes the entire collection from the vector store.
        """
        self.db.delete_collection()


# --------------------------------------------------------------------------------------------------------------------------------------------------------------- #
from langchain_core.vectorstores import InMemoryVectorStore
# from mille_llm.core.embedding import Embedding

class VectorStore:
    """
    VectorStore class for managing vector databases using FAISS or Chroma.

    This class allows you to initialize a vector store using an embedding model, load documents,
    and perform various operations like adding, deleting, and retrieving vectors.

    Attributes:
        embedding (Embedding): The embedding model used for generating vector representations.
        class_vector (class): The vector store class (FAISS or Chroma) used for storage.
        db (object): The vector store database instance that holds the document vectors.
        _type (str): The type of vector store being used ("faiss" or "chroma").
    """

    def __init__(self, embedding: object = None, vectorstore_type: str = "memory", name_collection:str = "NLP") -> None:
        """
        Initializes the VectorStore class.
        ------------------------------------
        Parameters:
            embedding (Embedding): Embedding model or method to use. Must be an instance of `mille_llm.Embedding`.
            vectorstore_type (str): Type of vector store to use. Options are "faiss" or "chroma". Default is "faiss".
            name_collection (str): Name of the collection to store vectors. Must be at least 3 characters long. Default is "NLP".

        Attributes:
            _type (str): Defines the type of vector store to use.
            embedding (Embedding.model): Embedding model that will be used for vectorizing documents.
            db (None): Initially set to `None`. It will store the vector database after documents are loaded.

        Raises:
            AssertionError: If no embedding is provided or if the provided object is not an instance of `Embedding`.
            AssertionError: If the collection name is less than 3 characters long.
            Exception: If the `vectorstore_type` is not one of the allowed types ("faiss" or "chroma").
        """
        assert embedding is not None, "Embedding has not been established"
        #assert isinstance(embedding, Embedding), "Object model is not an instance of mille_llm.Embedding"
        assert len(name_collection) >= 3, "The collection name must be greater than or equal to 3 characters."

        allowed_types = ["memory"]

        self._type = vectorstore_type
        self.name_collection = name_collection
        self.embedding = embedding.model

        if "memory" in vectorstore_type:
            self.db = InMemoryVectorStore(embedding = self.embedding)
        else:
            raise Exception("vectorstore type must be one of: " + " or ".join(allowed_types))


    def get(self, kwargs: dict = {}):
        """
        Retrieves data from the vector store.
        --------------------------------------
        Parameters:
            kwargs (dict): Arguments passed for retrieving data from the vector store.

        Returns:
            Retrieved data based on the passed arguments.
            AssertionError: If no documents defined in the vectorstore.
        """
        assert self.db is not None, "No documents defined in the vectorstore"
        return self.db.get(**kwargs)
    
    def get_by_ids(self, ids: list = None):
        """
        Retrieves documents from the vector store by their IDs.
        -------------------------------------------------------
        Parameters:
            ids (list): A list of vector IDs to retrieve from the vector store.

        Returns:
            list: A list of documents corresponding to the provided IDs.
            AssertionError: If no IDs are provided.
            AssertionError: If no documents defined in the vectorstore.
        """
        assert ids is not None, "No IDs provided"
        assert self.db is not None, "No documents defined in the vectorstore"
        return self.db.get_by_ids(ids)

    def add_documents(self, docs: list = None, ids: list = None):
        """
        Adds a list of documents to the vector store.
        ----------------------------------------------
        Parameters:
            docs (list): A list of documents to be added into the vector store. Each document must follow the
                                 LangChain `Document` format.

        Raises:
            AssertionError: If no documents are provided.
            AssertionError: If no documents defined in the vectorstore.

        This method adds new documents to the existing vector store.
        """
        assert docs is not None, "No documents provided"
        assert ids is not None, "No IDs provided"
        assert self.db is not None, "No documents defined in the vectorstore"
        self.db.add_documents(docs, ids=ids)

    def delete_by_ids(self, ids: list):
        """
        Deletes vectors from the vector store by their IDs.
        ---------------------------------------------------
        Parameters:
            ids (list): A list of vector IDs to be deleted from the vector store.

        Raises:
            AssertionError: If no IDs are provided.
            AssertionError: If no documents defined in the vectorstore.

        This method removes the specified vectors from the vector store.
        """
        assert ids != [], "No IDs provided"
        assert self.db is not None, "No documents defined in the vectorstore"
        self.db.delete(ids)