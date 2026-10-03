import builtins
import gc
import runpy
import sys
import weakref
from pathlib import Path
from types import SimpleNamespace

import pytest


START = runpy.run_path(str(Path(__file__).parents[1] / "scripts/build_notebook.py"))["START"]


@pytest.mark.parametrize("fail_start", [False, True])
def test_notebook_releases_old_models_before_starting_replacement(monkeypatch, fail_start):
    events = []

    class Model:
        pass

    model = Model()
    model.cycle = model
    model_ref = weakref.ref(model)
    worker = SimpleNamespace(
        translator=model,
        _thread=SimpleNamespace(join=lambda: events.append("joined")),
    )
    old = SimpleNamespace(
        stop=lambda: events.append("stopped"),
        worker=worker,
        translator=model,
        narrator=model,
    )
    del worker, model

    class Replacement:
        def __init__(self, settings):
            assert model_ref() is None
            assert events == ["stopped", "joined", "cache cleared"]

        def start(self):
            if fail_start:
                raise RuntimeError("model loading failed")

        def status(self):
            return {"ready": True}

    real_import = builtins.__import__

    def import_module(name, *args, **kwargs):
        if name == "museum_ai.config":
            return SimpleNamespace(Settings=SimpleNamespace(from_env=lambda: None))
        if name == "museum_ai.service":
            return SimpleNamespace(AiService=Replacement)
        return real_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", import_module)
    monkeypatch.setitem(sys.modules, "torch", SimpleNamespace(cuda=SimpleNamespace(
        is_available=lambda: True,
        empty_cache=lambda: events.append("cache cleared"),
    )))
    namespace = {"service": old}
    if fail_start:
        with pytest.raises(RuntimeError, match="model loading failed"):
            exec(START, namespace)
    else:
        exec(START, namespace)
    assert isinstance(namespace["service"], Replacement)
    assert old.worker is None and old.narrator is None and old.translator is None
    gc.collect()
