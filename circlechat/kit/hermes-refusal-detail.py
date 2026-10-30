# The refusal detail for kit/hermes-turn.sh. hermes-turn.sh mounts this file as sitecustomize.py in
# the Hermes image's site-packages, for the test turn only.
#
# When Hermes cannot start a turn, `hermes chat` prints "Hermes couldn't start the model connection:
# invalid_params" and leaves out the field its gateway refused: the refusal's data names the field
# under "fields", and the message reads only "field". This hook prints the refusal's reason and
# data on stderr, as one line that starts with "hermes refusal:". The hook changes nothing else.
# A Hermes version without the hooked function prints no line, and the turn's result stands.
import importlib.abc
import importlib.util
import sys

_MODULE = "hermes_cli.cli_chat_error_copy"
_FUNCTION = "agent_init_failure_message"


class _Finder(importlib.abc.MetaPathFinder):
    def find_spec(self, name, path, target=None):
        if name != _MODULE:
            return None
        sys.meta_path.remove(self)
        spec = importlib.util.find_spec(name)
        if spec is None or spec.loader is None:
            return spec
        load = spec.loader.exec_module

        def exec_module(module):
            load(module)
            original = getattr(module, _FUNCTION, None)
            if original is None:
                return

            def wrapped(error, *args, **kwargs):
                data = getattr(error, "data", None)
                sys.stderr.write("hermes refusal: %s %s\n" % (error, data if isinstance(data, dict) else "(no data)"))
                return original(error, *args, **kwargs)

            setattr(module, _FUNCTION, wrapped)

        spec.loader.exec_module = exec_module
        return spec


sys.meta_path.insert(0, _Finder())
