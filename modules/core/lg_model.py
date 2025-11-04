import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GridSearchCV, StratifiedKFold
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, confusion_matrix, ConfusionMatrixDisplay, accuracy_score, recall_score, f1_score
import matplotlib.pyplot as plt

class LogicticRegretionAdaptative:
    def __init__(self, param_grid=None, class_weight='balanced', random_state=42):
        if param_grid is None:
            self.param_grid = [
                {'solver': ['lbfgs'], 'penalty': ['l2', None], 'max_iter': [500, 1000, 2000], 'C': [0.01, 0.1, 0.5, 1.0, 2.0, 5.0]},
                {'solver': ['liblinear'], 'penalty': ['l1', 'l2'], 'max_iter': [500, 1000, 2000], 'C': [0.01, 0.1, 0.5, 1.0, 2.0, 5.0]},
                {'solver': ['saga'], 'penalty': ['l1', 'l2', None], 'max_iter': [500, 1000, 2000], 'C': [0.01, 0.1, 0.5, 1.0, 2.0, 5.0]}
            ]
        else:
            self.param_grid = param_grid
        self.class_weight = class_weight
        self.random_state = random_state
        self.label_encoder = LabelEncoder()
        self.grid_search = None
        self.best_model = None

    def train(self, X, y):
        """
        Entrena un nuevo modelo con los mejores hiperparámetros encontrados en search_kfold.
        """
        if self.grid_search is None or self.grid_search.best_params_ is None:
            raise ValueError("Primero debe ejecutar search_kfold para obtener los mejores hiperparámetros.")
        y_encoded = self.label_encoder.transform(y)
        self.best_model = LogisticRegression(
            class_weight=self.class_weight,
            random_state=self.random_state,
            **self.grid_search.best_params_
        )
        self.best_model.fit(X, y_encoded)
        return self.best_model

    def search_kfold(self, X, y, n_splits=5, scoring='recall_macro'):
        y_encoded = self.label_encoder.fit_transform(y)
        cv = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=self.random_state)
        logreg = LogisticRegression(class_weight=self.class_weight, random_state=self.random_state)
        self.grid_search = GridSearchCV(
            estimator=logreg,
            param_grid=self.param_grid,
            scoring=scoring,
            cv=cv,
            n_jobs=-1
        )
        self.grid_search.fit(X, y_encoded)
        self.best_model = self.grid_search.best_estimator_
        print("Mejores hiperparámetros:", self.grid_search.best_params_)
        print("Mejor score:", self.grid_search.best_score_)
        return self.grid_search

    def predict(self, X):
        if self.best_model is None:
            raise ValueError("El modelo no ha sido entrenado. Ejecute search_kfold primero.")
        probas = self.best_model.predict_proba(X)
        labels = self.label_encoder.inverse_transform(self.best_model.predict(X))
        return {"probabilities": probas, "labels": labels}

    def plot_classification_report(self, y_true, y_pred):
        print(classification_report(y_true, y_pred, target_names=self.label_encoder.classes_))
        cm = confusion_matrix(y_true, y_pred)
        disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=self.label_encoder.classes_)
        disp.plot(cmap=plt.cm.Blues)
        plt.title("Confusion Matrix")
        plt.show()

    def get_scores(self, y_true, y_pred):
        """
        Retorna un diccionario con accuracy, recall y f1-score macro.
        """
        return {
            'accuracy': round(accuracy_score(y_true, y_pred), 3),
            'recall': round(recall_score(y_true, y_pred, average='macro'), 3),
            'f1-score': round(f1_score(y_true, y_pred, average='macro'), 3)
        }