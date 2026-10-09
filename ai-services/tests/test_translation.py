from contextlib import nullcontext
from types import SimpleNamespace

import pytest

from museum_ai.schemas import SourceCopy
from museum_ai.translation import MockTranslator, TranslateGemmaTranslator, translate_copy


class RecordingTranslator(MockTranslator):
    def __init__(self):
        self.calls = []

    def translate(self, text, source, target):
        self.calls.append(text)
        return super().translate(text, source, target)


def test_translates_each_field_and_paragraph():
    translator = RecordingTranslator()
    copy = translate_copy(
        translator,
        SourceCopy(
            languageCode="vi",
            title="Trống đồng",
            shortDescription="Hiện vật",
            description="Đoạn một.\n\nĐoạn hai.",
        ),
        "en",
    )
    assert copy == {
        "title": "[en] Trống đồng",
        "shortDescription": "[en] Hiện vật",
        "description": "[en] Đoạn một.\n\n[en] Đoạn hai.",
    }
    assert translator.calls == ["Trống đồng", "Hiện vật", "Đoạn một.", "Đoạn hai."]


def test_keeps_translations_within_the_backend_limits():
    class Wordy(MockTranslator):
        def translate(self, text, source, target):
            return "word " * 200

    copy = translate_copy(Wordy(), SourceCopy(languageCode="vi", title="Tên", shortDescription="Ngắn"), "en")
    assert len(copy["title"]) <= 200
    assert len(copy["shortDescription"]) <= 500
    assert copy["description"] is None


@pytest.mark.parametrize("source,target", [("vi", "zh"), ("zh", "vi")])
def test_simplified_chinese_uses_a_code_accepted_by_the_model_template(source, target):
    # Exercise the processor boundary without downloading GPU models. These are
    # the keys in the loaded TranslateGemma template (zh-CN is absent).
    accepted_codes = {"vi", "zh-Hans"}

    class Inputs(dict):
        def to(self, *args, **kwargs):
            return self

    def apply_template(messages, **kwargs):
        content = messages[0]["content"][0]
        assert content["source_lang_code"] in accepted_codes
        assert content["target_lang_code"] in accepted_codes
        return Inputs(input_ids=SimpleNamespace(shape=(1, 3)))

    translator = TranslateGemmaTranslator.__new__(TranslateGemmaTranslator)
    translator.processor = SimpleNamespace(
        apply_chat_template=apply_template,
        decode=lambda tokens, **kwargs: "translated",
    )
    translator.model = SimpleNamespace(device="cpu", generate=lambda **kwargs: [[0, 0, 0, 1]])
    translator.dtype = "float32"
    translator._torch = SimpleNamespace(inference_mode=nullcontext)
    assert translator.translate("Museum", source, target) == "translated"
