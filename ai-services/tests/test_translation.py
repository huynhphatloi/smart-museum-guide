from museum_ai.schemas import SourceCopy
from museum_ai.translation import MockTranslator, translate_copy


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
