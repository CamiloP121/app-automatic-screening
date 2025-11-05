# App Automatic Screening

Una aplicación de screening automático basada en NLP para la clasificación y etiquetado de artículos científicos.

## 📋 Descripción

Esta aplicación utiliza técnicas de procesamiento de lenguaje natural (NLP) y aprendizaje automático para automatizar el proceso de screening de artículos científicos en revisiones sistemáticas. Permite etiquetar artículos, entrenar modelos de clasificación y gestionar investigaciones de forma eficiente.

## 🚀 Características

- **Gestión de Usuarios**: Autenticación y manejo de permisos
- **Gestión de Investigaciones**: Creación y administración de proyectos de investigación
- **Carga de Datos**: Importación de artículos y datasets
- **Recuperación de Información**: Sistema de retrievers para búsqueda de artículos
- **Etiquetado Automático**: Clasificación automática usando LLMs (GPT-4)
- **Entrenamiento de Modelos ML**: Entrenamiento de clasificadores con Logistic Regression
- **API REST**: Endpoints documentados con FastAPI

## 🛠️ Tecnologías

- **Backend**: FastAPI, Python 3.11
- **Base de Datos**: PostgreSQL con SQLAlchemy
- **ML/NLP**: scikit-learn, spaCy, Hugging Face Transformers
- **LLM**: OpenAI GPT-4, LangChain
- **Containerización**: Docker
- **Otras**: pandas, numpy, matplotlib, seaborn

## 📦 Instalación

### Con Docker (Recomendado)

1. Clona el repositorio:
```bash
git clone https://github.com/CamiloP121/app-automatic-screening.git
cd app-automatic-screening
```

2. Configura las variables de entorno:
```bash
# Crea el archivo .sec_config en la carpeta docker/
cp docker/.sec_config.example docker/.sec_config
# Edita las variables necesarias
```

3. Ejecuta el script de inicio:
```bash
cd docker
chmod +x start.sh
./start.sh
```

### Instalación Local

1. Instala las dependencias:
```bash
pip install -r docker/requirements.txt
python -m spacy download en_core_web_md
```

2. Configura las variables de entorno

3. Ejecuta la aplicación:
```bash
uvicorn app:app --host 0.0.0.0 --port 5010 --reload
```

## 🔧 Configuración

### Variables de Entorno

Crea un archivo `.sec_config` con las siguientes variables:

```env
# Base de datos
DATABASE_URL=postgresql://user:password@localhost/dbname

# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# Configuración de la app
DEBUG=True
```

## 📖 Documentación de la API

Una vez que la aplicación esté ejecutándose, puedes acceder a la documentación interactiva en:

**Swagger UI**: [http://localhost:5010/docs](http://localhost:5010/docs)

## 🏗️ Estructura del Proyecto

```
app-sa/
├── app.py                          # Aplicación principal FastAPI
├── BasePrompt.txt                  # Template de prompts para LLM
├── docker/                         # Configuración Docker
│   ├── dockerfile
│   ├── requirements.txt
│   └── start.sh
├── modules/
│   ├── logger_config.py           # Configuración de logging
│   ├── core/                      # Núcleo de la aplicación
│   │   ├── chat_llm.py           # Interfaz con LLMs
│   │   ├── embedding.py          # Embeddings
│   │   ├── vectorestore_pg.py    # Vector store PostgreSQL
│   │   └── tools/                # Herramientas auxiliares
│   ├── models/                   # Modelos SQLAlchemy
│   │   ├── ai_models/           # Modelos de IA
│   │   ├── research_managment/  # Modelos de investigación
│   │   └── users/               # Modelos de usuarios
│   ├── routes/                  # Endpoints de la API
│   └── Utils/                   # Utilidades
└── tmp_files/                   # Archivos temporales
```

```bash
pytest tests/
```

## 📝 Logging

Los logs se configuran automáticamente y incluyen:
- Información de procesamiento de artículos
- Errores de clasificación
- Métricas de modelos entrenados
- Estado de la aplicación

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver `LICENSE` para más detalles.

## 👨‍💻 Autor

**Camilo P121** - [CamiloP121](https://github.com/CamiloP121)

## 🔗 Enlaces

- **Documentación API**: http://localhost:5010/docs
- **Repositorio**: https://github.com/CamiloP121/app-automatic-screening