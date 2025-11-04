import os
def saveFAPIFile(file: object, folder_save: str):
    """
    Save the provided file to the specified folder.

    Args:
        file (object): The file object to be saved.
        folder_save (str): The path to the folder where the file will be saved.

    Raises:
        Exception: If an error occurs during the file saving process.

    """
    file_content = file.file.read()
    # Construct the full file path
    file_path = os.path.join(folder_save, file.filename)

    try:
        # Open the file in binary write mode and save its contents
        with open(file_path, "wb+") as buffer:
            buffer.write(file_content)
    except Exception as e:
        # Print the error and raise an exception with the filename
        print(e)
        raise Exception("Error in saving file: ", file.filename)
    
def load_text(path_file: str) -> str:
    """
    Loads the content of a .txt file into a string.
    
    Parameters:
    -----------
    path_file : str
        The path to the .txt file to be loaded.
    
    Raises:
    -------
    AssertionError:
        If the file does not exist or if the file extension is not .txt.
    Exception:
        If the file cannot be read, with an additional message indicating the specific file.
    
    Returns:
    --------
    str:
        The content of the file as a string.
    """
    assert os.path.exists(path_file), "No file exists"
    _, ext = os.path.splitext(path_file)

    assert ext == ".txt", "Extension not allowed. Valid extension is .txt" 

    template = ""
    try:
        with open(path_file, 'r') as f:
            template += str(f.read()) + "\n"
    except Exception as e:
        print(e)
        raise Exception(f"Could not read file {path_file}")
    return template