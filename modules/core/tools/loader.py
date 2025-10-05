import pandas as pd
import numpy as np
from typing import List
import os

def parse_nbib_file(nbib_path: str) -> pd.DataFrame:
    """
    Parsea un archivo .nbib (formato de PubMed) y lo convierte en un DataFrame de pandas.
    
    Args:
        nbib_path (str): Ruta al archivo .nbib a procesar.
    
    Returns:
        pd.DataFrame: Un DataFrame que contiene los campos relevantes del archivo .nbib.
    """
    mapping = {
        'PMID': 'pmid',
        'TI': 'title',
        'AU': 'authors',
        'AB': 'abstract',
        'PY': 'year',
        'JO': 'journal',
        'VL': 'volume',
        'IS': 'issue',
        'SP': 'start_page',
        'EP': 'end_page',
        'DO': 'doi',
        'LID': 'lid',
        'ET': 'editor',
        'PB': 'publisher',
        'AD': 'address',
        'LA': 'language',
        'KW': 'keywords'
    }

    try:
        with open(nbib_path, 'r', encoding='utf-8') as f:
            text = f.read()
    except Exception:
        return pd.DataFrame()

    batches = text.split("PMID- ")[1:]

    errors: List[str] = []
    all_dfs = []

    for batch in batches:
        data = {v: [] for v in mapping.values()}
        content = ""
        lines = batch.split("\n")
        i = 0

        try:
            while i < len(lines):
                line = lines[i]
                if i == 0:
                    data['pmid'].append(line.strip())
                else:
                    if not content:
                        for tag in mapping:
                            if line.startswith(f"{tag}") and "- " in line:
                                content = line.split("- ", 1)[1].strip()
                                current_key = mapping[tag]
                                break
                    else:
                        if not line.startswith(" ") or i == len(lines) - 1:
                            data[current_key].append(content)
                            content = ""
                            i -= 1
                        else:
                            content += " " + line.strip()
                i += 1

            # Normalizar campos
            for key in data:
                if not data[key]:
                    data[key] = np.nan
                else:
                    sep = ", "
                    if key == 'authors':
                        sep = " and "
                    elif key == 'keywords':
                        sep = "; "
                    data[key] = sep.join(data[key])

            all_dfs.append(pd.DataFrame([data]))

        except Exception:
            batch_id = lines[0].strip() if lines else "unknown"
            errors.append(batch_id)
            continue

    return pd.concat(all_dfs, ignore_index=True) if all_dfs else pd.DataFrame()


def load_data(path_dbs: str, filename: str, flag_test: bool = False) -> pd.DataFrame:
    """
    Carga y procesa un archivo de datos (.nbib, .csv, .xlsx).
    
    Args:
        path_dbs (str): Ruta al directorio donde se encuentra el archivo.
        filename (str): Nombre del archivo a cargar.
        flag_test (bool): Si es True, incluye columna 'label' si está disponible.

    Returns:
        pd.DataFrame: DataFrame procesado y limpio. Puede estar vacío si no se encontraron datos válidos.
    """
    file_path = os.path.join(path_dbs, filename)
    df = None

    # Detectar y cargar según el tipo de archivo
    if filename.endswith(".nbib"):
        df = parse_nbib_file(file_path)
    elif filename.endswith(".csv"):
        df = pd.read_csv(file_path)
    elif filename.endswith(".xlsx"):
        df = pd.read_excel(file_path)
    elif filename.endswith(".bib"):
        # Aquí podrías implementar un parser para archivos .bib si es necesario
        return pd.DataFrame()
    else:
        raise ValueError(f"Unsupported file format: {filename}. Only supported: nbib, csv, xlsx, bib")

    # Verificar contenido del DataFrame
    if df is not None and not df.empty:
        if flag_test:
            target_columns = ["title", "authors", "year", "journal", "doi", "abstract", "label"]
        else:
            target_columns = ["title", "authors", "year", "journal", "doi", "abstract"]

        existing_columns = [col for col in target_columns if col in df.columns]

        if existing_columns:
            df = df[existing_columns].dropna(subset=['title', 'abstract'])
        else:
            return pd.DataFrame()
    else:
        df = pd.DataFrame()

    return df