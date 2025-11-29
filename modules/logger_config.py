# Sistema
import os
import logging

mode = os.getenv("MODE", "dev")

# Configure logging
logging.getLogger('apscheduler.executors.default').propagate = False
if mode == "dev":
    logging.basicConfig(
        format='"timestamp": %(asctime)s , %(message)s',
        datefmt='"%d-%m-%Y %I:%M:%S %p"',
        level=logging.INFO,
    )
else:
    logging.basicConfig(
        format='"timestamp": %(asctime)s , %(message)s',
        datefmt='"%d-%m-%Y %I:%M:%S %p"',
        level=logging.INFO,
    )

logger = logging.getLogger(__name__)

logger.debug("Modo de ejecución: %s", mode)
logger.info("Inicializando la aplicación...")
