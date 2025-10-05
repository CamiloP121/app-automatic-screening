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