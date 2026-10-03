import numpy as np
import pytest

from museum_ai.tts import Voice, VoxCPM2Engine


class VoxCPMWithoutSeed:
    """The released VoxCPM API in the failing Colab runtime."""

    def __init__(self):
        self.calls = []

    def generate(self, *, text, cfg_value, inference_timesteps, reference_wav_path=None):
        self.calls.append((text, reference_wav_path))
        return np.array([0.1, -0.1])


@pytest.mark.parametrize("clone", [False, True])
def test_voice_design_and_cloning_support_voxcpm_without_seed(clone):
    engine = object.__new__(VoxCPM2Engine)
    engine.model = VoxCPMWithoutSeed()
    engine.voice_description = "warm voice"
    engine.style = "calm"

    if clone:
        wav = engine.clone("Hello", "en", Voice("reference.wav", "Reference text"))
        assert engine.model.calls == [("(calm)Hello", "reference.wav")]
    else:
        wav = engine.design("Hello", "en")
        assert engine.model.calls == [("(warm voice)Hello", None)]

    assert wav.dtype == np.float32
    np.testing.assert_allclose(wav, [0.1, -0.1])
