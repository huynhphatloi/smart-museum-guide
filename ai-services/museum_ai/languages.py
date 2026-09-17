"""Languages this service can offer, using the CMS language codes.

A language is offered only when the loaded translation model AND a narration
model both cover it; the result is reported to the backend with every heartbeat
(see `supported_languages`), and the CMS and visitor apps list exactly those.
Display names (native spellings) live in backend/api/src/languages/language-catalog.ts.
"""

from typing import Callable, Iterable, List

#: English names, as the translation prompts expect them. Order is not significant.
LANGUAGE_NAMES = {
    "vi": "Vietnamese",
    "en": "English",
    "ja": "Japanese",
    "ko": "Korean",
    "zh": "Chinese (Simplified)",
    "zh-hant": "Chinese (Traditional)",
    "th": "Thai",
    "id": "Indonesian",
    "ms": "Malay",
    "km": "Khmer",
    "lo": "Lao",
    "my": "Burmese",
    "fil": "Filipino",
    "hi": "Hindi",
    "ar": "Arabic",
    "he": "Hebrew",
    "tr": "Turkish",
    "fr": "French",
    "de": "German",
    "es": "Spanish",
    "it": "Italian",
    "pt": "Portuguese",
    "nl": "Dutch",
    "ru": "Russian",
    "uk": "Ukrainian",
    "pl": "Polish",
    "cs": "Czech",
    "el": "Greek",
    "sv": "Swedish",
    "da": "Danish",
    "no": "Norwegian",
    "fi": "Finnish",
    "sw": "Swahili",
}

#: Spoken once per language to create that language's reference voice.
VOICE_SAMPLE_SENTENCE = "Welcome to the museum. Let me tell you the story behind this remarkable exhibit."


def language_name(code: str) -> str:
    return LANGUAGE_NAMES.get(code, code)


def supported_languages(translatable: Iterable[str], narratable: Callable[[str], bool]) -> List[str]:
    """Codes both models cover, e.g. `supported_languages(translator.languages, narrator.supports)`."""
    translatable = set(translatable)
    return [code for code in LANGUAGE_NAMES if code in translatable and narratable(code)]
