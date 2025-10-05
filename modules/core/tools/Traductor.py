from googletrans import Translator as GoogleTranslator

class Translator:
    """
    A wrapper class around Google Translator to provide asynchronous methods 
    for language detection, translation, and ensuring English text output.
    """

    def __init__(self):
        """
        Initialize the Translator instance with a GoogleTranslator object.
        """
        self.translator = GoogleTranslator()

    async def detect_language(self, text):
        """
        Detect the language of the given text.

        Args:
            text (str): The input text whose language should be detected.

        Returns:
            detected (googletrans.models.Detected or None): 
                The detected language object containing `lang` and `confidence`. 
                Returns None if detection fails.
        """
        detected = None
        try:
            detected = await self.translator.detect(text)
        except Exception as e:
            print(f"Error during language detection: {e}")
        return detected

    async def translate(self, text, lang_destiny='en', lang_origin=None):
        """
        Translate the given text into the target language.

        Args:
            text (str): The input text to translate.
            lang_destiny (str, optional): The target language code (default: 'en').
            lang_origin (str, optional): The source language code (default: None).
                                          If None, Google Translate will auto-detect.

        Returns:
            str or None: The translated text, or None if translation fails.
        """
        try:
            if lang_origin:
                translated = await self.translator.translate(
                    text, src=lang_origin, dest=lang_destiny
                )
            else:
                translated = await self.translator.translate(
                    text, dest=lang_destiny
                )
            return translated.text
        except Exception as e:
            print(f"Error during translation: {e}")
            return None

    async def check_en(self, text):
        """
        Ensure the text is in English. 
        If it is not in English or has low detection confidence, 
        translate it to English.

        Args:
            text (str): The input text to verify or translate.

        Returns:
            tuple: (lang, confidence, text_tr)
                - lang (str or None): The detected language code.
                - confidence (float or None): Confidence score of detection.
                - text_tr (str): The text in English (original or translated).
        """
        try:
            detected = await self.detect_language(text)
            lang = detected.lang
            confidence = detected.confidence if detected else None

            # Translate to English if language is not English 
            # or confidence is too low.
            if lang != 'en' or (confidence is not None and confidence < 0.5):
                text_tr = await self.translate(
                    text, lang_destiny='en', lang_origin=lang
                )
            else:
                text_tr = text

            return lang, confidence, text_tr
        except Exception as e:
            print(f"Error in check_en: {e}")
            return None, None, text
