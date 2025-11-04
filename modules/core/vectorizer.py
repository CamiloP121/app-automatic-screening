import spacy
from sklearn.feature_extraction.text import TfidfVectorizer
import re


class Vectorizer:
    def __init__(self, type_model, hyper_params={}):
        self.type_model = type_model
        self.hyper_params = hyper_params
        self.model = self._create_model()
        self.nlp = spacy.load("en_core_web_md")
    
    def _create_model(self):
        if self.type_model == 'tfidf':
            return TfidfVectorizer(**self.hyper_params)
        elif self.type_model == 'count':
            from sklearn.feature_extraction.text import CountVectorizer
            return CountVectorizer(**self.hyper_params)
        elif self.type_model == 'bert':
            from sentence_transformers import SentenceTransformer
            model_name = self.hyper_params.get("model_name", "bert-base-uncased")
            return SentenceTransformer(model_name)
        elif self.type_model == 'word2vec':
            from gensim.models import Word2Vec
            sentences = self.hyper_params.get("sentences", [["example", "sentence"]])
            vector_size = self.hyper_params.get("vector_size", 100)
            window = self.hyper_params.get("window", 5)
            min_count = self.hyper_params.get("min_count", 1)
            return Word2Vec(sentences, vector_size=vector_size, window=window, min_count=min_count)
        else:
            raise ValueError("Modelo no soportado: {}".format(self.type_model))
    
    def lematized_text(self, text):
        # 1. Convertir a minúsculas
        text = text.lower()
        # 2. Quitar puntuaciones
        text = re.sub(r'[^\w\s]', ' ', text)
        # 3. Eliminar números
        text = re.sub(r'\d+', ' ', text)
        # 4. Eliminar URLs
        text = re.sub(r'http\S+|www\S+|https\S+', ' ', text)
        # 5. Eliminar correos electrónicos
        text = re.sub(r'\S+@\S+', ' ', text)
        # 6. Eliminar espacios extra
        text = re.sub(r'\s+', ' ', text).strip()
        # 7. Lemmatizar (en inglés)
        doc = self.nlp(text)
        tokens = [
            token.lemma_
            for token in doc
            if not token.is_stop and token.is_alpha
        ]
        return " ".join(tokens)
    
    def fit(self, documents, flag_lematized=True):
        if flag_lematized:
            documents = [self.lematized_text(doc) for doc in documents]
        if self.type_model in ['tfidf', 'count']:
            self.model.fit(documents)
        elif self.type_model == 'bert':
            #inputs = self.tokenizer(documents, return_tensors='pt', padding=True, truncation=True)
            #self.model(**inputs)
            raise NotImplementedError("BERT model fitting is not implemented. Use transform method instead.")
        elif self.type_model == 'word2vec':
            sentences = [doc.split() for doc in documents]
            self.model.build_vocab(sentences, update=True)
            self.model.train(sentences, total_examples=self.model.corpus_count, epochs=self.model.epochs)

    def transform(self, documents, flag_lematized=True):
        if flag_lematized:
            documents = [self.lematized_text(doc) for doc in documents]
        if self.type_model in ['tfidf', 'count']:
            return self.model.transform(documents)
        elif self.type_model == 'bert':
            documents = [doc for doc in documents]
            return self.model.encode([doc for doc in documents if isinstance(doc, str)], convert_to_numpy=True, show_progress_bar=True)
        elif self.type_model == 'word2vec':
            return [self.model.wv[doc.split()] for doc in documents]
        else:
            raise ValueError("Modelo no soportado: {}".format(self.type_model))
