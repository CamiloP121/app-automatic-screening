from sqlalchemy.orm import declarative_base
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

from ..logger_config import logger

SQLALCHEMY_DATABASE_URL = os.environ.get( "db_uri",'sqlite:///app-automatic-screening-volumen/database.db' )
logger.info('Create or link to DB')
logger.debug(f'URI: {SQLALCHEMY_DATABASE_URL}')

engine = create_engine( SQLALCHEMY_DATABASE_URL)
Session = sessionmaker(autocommit=False, autoflush=False, bind = engine)

class DatabaseManager():
    def __init__(self):
        self.session_maker = Session
        self.session = self.session_maker()
        self.engine = engine
        self.base = declarative_base()

db = DatabaseManager()


logger.info("Complete creating or link DB")

from .users import Users
from .research_managment import Research
from .research_managment import Datasets
from .research_managment import Articles