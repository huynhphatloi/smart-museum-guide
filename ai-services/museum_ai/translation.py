"""Machine translation of exhibit copy.

Default model: google/translategemma-4b-it (Gemma license, gated - accept it on
Hugging Face and set HF_TOKEN). Its training data covers every language in
LANGUAGE_NAMES (TranslateGemma technical report, appendix C: Khmer, Lao, Malay,
Burmese, Filipino, Czech, Ukrainian... are trained from English). The 12b/27b
variants trade speed for quality.

Alternative: xiaomi-research/MiLMMT-46-4B-v1.0 (Gemma license, not gated),
reported stronger than TranslateGemma but without Ukrainian and Swahili.
"""

from __future__ import annotations

import logging
from typing import Dict, FrozenSet, List, Optional, Protocol

from .languages import LANGUAGE_NAMES, language_name
from .schemas import SourceCopy
from .text import split_paragraphs, split_sentences

logger = logging.getLogger(__name__)

#: Both models accept roughly 2K tokens; paragraphs longer than this are split by sentence.
MAX_SEGMENT_CHARS = 1500

#: Limits of the backend webhook DTO (TranslatedCopyDto).
TITLE_MAX = 200
SHORT_DESCRIPTION_MAX = 500


class Translator(Protocol):
    model_id: str
    #: CMS language codes the model can translate between.
    languages: FrozenSet[str]

    def translate(self, text: str, source: str, target: str) -> str: ...


def translate_copy(translator: Translator, source: SourceCopy, target: str) -> Dict[str, Optional[str]]:
    """Translates title, summary and body; the body paragraph by paragraph."""
    src = source.languageCode

    def translate_block(text: Optional[str]) -> Optional[str]:
        if not text or not text.strip():
            return None
        paragraphs = [
            " ".join(translator.translate(segment, src, target) for segment in _segments(paragraph))
            for paragraph in split_paragraphs(text)
        ]
        return "\n\n".join(paragraphs) or None

    title = translate_block(source.title) or source.title
    short_description = translate_block(source.shortDescription)
    return {
        "title": _clip(title, TITLE_MAX),
        "shortDescription": _clip(short_description, SHORT_DESCRIPTION_MAX),
        "description": translate_block(source.description),
    }


def _segments(paragraph: str) -> List[str]:
    if len(paragraph) <= MAX_SEGMENT_CHARS:
        return [paragraph]
    segments: List[str] = []
    current = ""
    for sentence in split_sentences(paragraph):
        if current and len(current) + len(sentence) + 1 > MAX_SEGMENT_CHARS:
            segments.append(current)
            current = sentence
        else:
            current = f"{current} {sentence}".strip()
    if current:
        segments.append(current)
    return segments


def _clip(text: Optional[str], limit: int) -> Optional[str]:
    if text is None or len(text) <= limit:
        return text
    cut = text.rfind(" ", 0, limit - 1)
    return text[: cut if cut > limit // 2 else limit - 1].rstrip() + "…"


class MockTranslator:
    """Prefixes the target code; used with MOCK_MODELS=1."""

    model_id = "mock-translator"
    languages: FrozenSet[str] = frozenset(LANGUAGE_NAMES)

    def translate(self, text: str, source: str, target: str) -> str:
        return f"[{target}] {text}"


class TranslateGemmaTranslator:
    #: CMS codes that TranslateGemma's chat template knows under another name.
    CODES = {"zh": "zh-CN", "zh-hant": "zh-TW", "fil": "fil-PH"}
    languages: FrozenSet[str] = frozenset(LANGUAGE_NAMES)

    def __init__(self, model_id: str, quantization: str = "auto") -> None:
        import torch
        from transformers import AutoModelForImageTextToText, AutoProcessor

        self.model_id = model_id
        self._torch = torch
        self.processor = AutoProcessor.from_pretrained(model_id)
        self.dtype = _float_dtype(torch)
        self.model = AutoModelForImageTextToText.from_pretrained(
            model_id, device_map="auto", **_load_options(torch, quantization, self.dtype)
        )
        self.model.eval()

    def translate(self, text: str, source: str, target: str) -> str:
        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "source_lang_code": self.CODES.get(source, source),
                        "target_lang_code": self.CODES.get(target, target),
                        "text": text,
                    }
                ],
            }
        ]
        inputs = self.processor.apply_chat_template(
            messages,
            tokenize=True,
            add_generation_prompt=True,
            return_dict=True,
            return_tensors="pt",
        ).to(self.model.device, dtype=self.dtype)
        input_length = inputs["input_ids"].shape[-1]
        with self._torch.inference_mode():
            output = self.model.generate(
                **inputs, do_sample=False, max_new_tokens=_max_new_tokens(input_length)
            )
        return self.processor.decode(output[0][input_length:], skip_special_tokens=True).strip()


class MiLMMTTranslator:
    #: Names from the model card; the prompt must use them verbatim.
    NAMES = {
        "zh": "Chinese (Simplified)",
        "zh-hant": "Chinese (Traditional)",
        "fil": "Tagalog",
    }
    #: The 46 model-card languages, minus the CMS languages it lacks.
    languages: FrozenSet[str] = frozenset(LANGUAGE_NAMES) - {"uk", "sw"}

    def __init__(self, model_id: str, quantization: str = "auto") -> None:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer

        self.model_id = model_id
        self._torch = torch
        self.tokenizer = AutoTokenizer.from_pretrained(model_id)
        dtype = _float_dtype(torch)
        self.model = AutoModelForCausalLM.from_pretrained(
            model_id, device_map="auto", **_load_options(torch, quantization, dtype)
        )
        self.model.eval()

    def translate(self, text: str, source: str, target: str) -> str:
        for code in (source, target):
            if code not in self.languages:
                raise ValueError(f"{self.model_id} does not support {language_name(code)}.")
        src = self.NAMES.get(source, language_name(source))
        tgt = self.NAMES.get(target, language_name(target))
        prompt = f"Translate this from {src} to {tgt}:\n{src}: {text}\n{tgt}:"
        inputs = self.tokenizer(prompt, add_special_tokens=False, return_tensors="pt").to(self.model.device)
        input_length = inputs["input_ids"].shape[-1]
        with self._torch.inference_mode():
            output = self.model.generate(
                **inputs, do_sample=False, max_new_tokens=_max_new_tokens(input_length)
            )
        decoded = self.tokenizer.decode(output[0][input_length:], skip_special_tokens=True)
        # Stop at a hallucinated follow-up prompt, if any.
        return decoded.split("\nTranslate this from", 1)[0].strip()


def load_translator(model_id: str, quantization: str, mock: bool) -> Translator:
    if mock:
        return MockTranslator()
    logger.info("Loading translation model %s", model_id)
    if "milmmt" in model_id.lower():
        return MiLMMTTranslator(model_id, quantization)
    return TranslateGemmaTranslator(model_id, quantization)


def _float_dtype(torch):
    if torch.cuda.is_available() and torch.cuda.is_bf16_supported():
        return torch.bfloat16
    return torch.float16 if torch.cuda.is_available() else torch.float32


def _load_options(torch, quantization: str, dtype) -> dict:
    quantize = quantization == "4bit"
    if quantization == "auto" and torch.cuda.is_available():
        total_gb = torch.cuda.get_device_properties(0).total_memory / 1024**3
        quantize = total_gb < 20
    if not quantize:
        return {"dtype": dtype}

    from transformers import BitsAndBytesConfig

    logger.info("Quantising the translation model to 4-bit to leave GPU memory for TTS")
    return {
        "quantization_config": BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=dtype,
        )
    }


def _max_new_tokens(input_length: int) -> int:
    # Translations rarely need more than ~2x the prompt, but CJK <-> Latin can expand.
    return min(2048, max(128, input_length * 3))
