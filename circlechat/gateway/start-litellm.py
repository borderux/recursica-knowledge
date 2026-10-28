"""Start LiteLLM with the stack's cloud keys, read from the gateway's secrets file.

kit/render.mjs writes litellm.yaml with a placeholder for each key, such as
"file:MODEL_KEY_DEFAULT", or "file:MODEL_KEY_X#1" for the first part of a two-part key
("<part 1>:<part 2>"). This script fills each placeholder from the secrets file, writes the
filled config to a private file inside the container, and starts LiteLLM with that file. No key is
ever in an environment variable or on a command line, so `docker inspect` shows none.

LiteLLM refuses to start without a master key. The router (router.mjs) is the only client, and
the master key comes from a file that only the router and LiteLLM read.

    python start-litellm.py <config> <secrets file> <master key file> [litellm arguments...]
"""
import json
import os
import sys
import tempfile


def read_secrets(path):
    out = {}
    try:
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                out[k.strip()] = v.strip()
    except FileNotFoundError:
        pass
    return out


def fill(value, secrets, missing):
    if isinstance(value, dict):
        return {k: fill(v, secrets, missing) for k, v in value.items()}
    if isinstance(value, list):
        return [fill(v, secrets, missing) for v in value]
    if isinstance(value, str) and value.startswith("file:"):
        name, _, part = value[5:].partition("#")
        secret = secrets.get(name, "")
        if part:
            pieces = secret.split(":", 1)
            secret = pieces[int(part) - 1] if len(pieces) == 2 else ""
        if not secret:
            missing.add(name)
        return secret
    return value


def main():
    config_path, secrets_path, master_path, rest = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4:]
    with open(config_path, encoding="utf-8") as f:
        config = json.load(f)
    missing = set()
    secrets = read_secrets(secrets_path)
    models = []
    for m in config.get("model_list", []):
        gaps = set()
        filled = fill(m, secrets, gaps)
        missing |= gaps
        # A key whose secret is missing is left out, so the rest of the gateway still starts.
        if not gaps:
            models.append(filled)
    config["model_list"] = models
    with open(master_path, encoding="utf-8") as f:
        config.setdefault("general_settings", {})["master_key"] = f.read().strip()
    for name in sorted(missing):
        print(f"start-litellm: no {name} in the secrets file; the key that uses it is off", file=sys.stderr)
    fd, path = tempfile.mkstemp(prefix="litellm-", suffix=".yaml")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(config, f)
    os.chmod(path, 0o600)
    os.execvp("litellm", ["litellm", "--config", path, *rest])


if __name__ == "__main__":
    main()
