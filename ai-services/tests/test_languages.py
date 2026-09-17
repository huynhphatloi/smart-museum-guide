from museum_ai.languages import LANGUAGE_NAMES, supported_languages
from museum_ai.translation import MiLMMTTranslator, MockTranslator, TranslateGemmaTranslator
from museum_ai.tts import MockEngine, Narrator, VoxCPM2Engine


class VoxOnly(MockEngine):
    """Stands in for VoxCPM2 without loading it."""

    model_id = "openbmb/VoxCPM2"

    def supports(self, language):
        return language in VoxCPM2Engine.LANGUAGES


def narrator(tmp_path, fallback_languages, with_fallback=True):
    return Narrator(
        primary=VoxOnly(),
        fallback_model_id="k2-fsa/OmniVoice" if with_fallback else None,
        fallback_loader=MockEngine if with_fallback else None,
        fallback_languages=fallback_languages,
        translator=MockTranslator(),
        voice_dir=tmp_path,
        max_chunk_chars=100,
    )


def test_default_models_offer_every_known_language(tmp_path):
    offered = supported_languages(
        TranslateGemmaTranslator.languages, narrator(tmp_path, ("cs", "uk")).supports
    )
    assert offered == list(LANGUAGE_NAMES)


def test_languages_without_a_narration_model_are_not_offered(tmp_path):
    offered = supported_languages(
        TranslateGemmaTranslator.languages, narrator(tmp_path, ("cs", "uk"), with_fallback=False).supports
    )
    assert "cs" not in offered and "uk" not in offered
    assert {"vi", "km", "lo", "fil", "zh-hant"} <= set(offered)


def test_the_translation_model_limits_the_offer(tmp_path):
    offered = supported_languages(MiLMMTTranslator.languages, narrator(tmp_path, ("cs", "uk")).supports)
    assert "uk" not in offered and "sw" not in offered
    assert "cs" in offered


def test_fallback_narration_only_covers_the_configured_languages(tmp_path):
    only_czech = narrator(tmp_path, ("cs",))
    assert only_czech.supports("cs")
    assert not only_czech.supports("uk")
    assert only_czech.supports("vi")
