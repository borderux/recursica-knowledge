#!/usr/bin/env python3
"""Prove a channel's service account can reach its own dataset and nothing else.

Runs the UNFENCED BigQuery toolbox as the channel service account on purpose. The
point is to test the Google IAM layer, not our MCP config — a fence that only
exists in YAML is not a fence. Every probe is a dry run: access is validated,
nothing is written.

  verify-channel-isolation.py --slug acme \
      --key ~/.buzz/.secrets/claire-acme-service-user.json \
      [--also-allowed research_acme]

Exit 0 if isolation holds, 1 if any foreign dataset is reachable.
"""
import argparse
import json
import os
import subprocess
import sys

BUZZ_HOME = os.environ.get("BUZZ_HOME", os.path.expanduser("~/.buzz"))
TOOLBOX = os.path.join(BUZZ_HOME, "bin", "toolbox")

GREEN, RED, YELLOW, BOLD, OFF = "\033[32m", "\033[31m", "\033[33m", "\033[1m", "\033[0m"


def call(key, project, tool, args, timeout=90):
    env = dict(os.environ)
    env["BIGQUERY_PROJECT"] = project
    env["BIGQUERY_MAX_QUERY_RESULT_ROWS"] = "-1"
    env["GOOGLE_APPLICATION_CREDENTIALS"] = key
    p = subprocess.Popen(
        [TOOLBOX, "--prebuilt", "bigquery", "--stdio"],
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
        text=True, env=env, bufsize=1)

    def send(o):
        p.stdin.write(json.dumps(o) + "\n")
        p.stdin.flush()

    send({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {
        "protocolVersion": "2024-11-05", "capabilities": {},
        "clientInfo": {"name": "isolation-probe", "version": "1"}}})
    send({"jsonrpc": "2.0", "method": "notifications/initialized", "params": {}})
    send({"jsonrpc": "2.0", "id": 2, "method": "tools/call",
          "params": {"name": tool, "arguments": args}})
    try:
        out, _ = p.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        p.kill()
        out, _ = p.communicate()
    for line in out.splitlines():
        try:
            m = json.loads(line)
        except Exception:
            continue
        if m.get("id") == 2:
            if "error" in m:
                return False, json.dumps(m["error"])[:300]
            return True, json.dumps(m["result"].get("content"))[:300]
    return False, "no response from toolbox"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--slug", required=True, help="channel slug, e.g. acme")
    ap.add_argument("--key", required=True, help="path to the channel service account JSON key")
    ap.add_argument("--project", default=os.environ.get("BQ_PROJECT", "{{BQ_PROJECT}}"))
    ap.add_argument("--also-allowed", action="append", default=[],
                    help="another dataset this SA is legitimately granted (repeatable)")
    a = ap.parse_args()

    key = os.path.expanduser(a.key)
    if not os.path.isfile(key):
        sys.exit(f"key not found: {key}")

    own = f"research_{a.slug.replace('-', '_')}"
    allowed = {own, *a.also_allowed}

    ok, listing = call(key, a.project, "list_dataset_ids", {"project": a.project})
    reachable = []
    if ok:
        reachable = [json.loads(t["text"]) for t in json.loads(listing)] if listing.startswith("[") else []

    print(f"\n{BOLD}Isolation check — {a.slug} / {own}{OFF}")
    print(f"  identity: {os.path.basename(key)}")
    print(f"  datasets this SA can enumerate: {', '.join(reachable) or '(none)'}\n")

    probes = [
        ("own dataset READ", own, "SELECT 1 FROM `{p}.{d}`.INFORMATION_SCHEMA.TABLES LIMIT 1", True),
        ("own dataset WRITE", own,
         "CREATE TABLE IF NOT EXISTS `{p}.{d}.__probe` (x INT64)", True),
    ]
    for ds in reachable:
        if ds in allowed:
            continue
        probes.append((f"FOREIGN READ {ds}", ds,
                       "SELECT 1 FROM `{p}.{d}`.INFORMATION_SCHEMA.TABLES LIMIT 1", False))

    failures = 0
    for label, ds, sql, should_allow in probes:
        granted, detail = call(key, a.project, "execute_sql",
                               {"sql": sql.format(p=a.project, d=ds), "dry_run": True})
        good = granted == should_allow
        mark = f"{GREEN}✓{OFF}" if good else f"{RED}✗{OFF}"
        state = "ALLOWED" if granted else "DENIED "
        print(f"  {mark} {label:34s} {state}")
        if not good:
            failures += 1
            print(f"      {detail[:200]}")

    # Dataset creation must be denied — a channel SA that can make datasets can
    # make itself a new place to put another client's data.
    granted, detail = call(key, a.project, "execute_sql",
                           {"sql": f"CREATE SCHEMA `{a.project}.probe_should_fail`", "dry_run": True})
    mark = f"{RED}✗{OFF}" if granted else f"{GREEN}✓{OFF}"
    print(f"  {mark} {'CREATE new dataset':34s} {'ALLOWED' if granted else 'DENIED '}")
    if granted:
        failures += 1

    # Default ACLs are invisible in the console, so surface them explicitly.
    print()
    admin_ok, privs = call(key, a.project, "execute_sql", {"sql": f"""
        SELECT grantee FROM `{a.project}`.`region-us`.INFORMATION_SCHEMA.OBJECT_PRIVILEGES
        WHERE object_name = '{own}' AND grantee LIKE 'project%'"""})
    if admin_ok and "projectEditor" in privs:
        print(f"  {YELLOW}!{OFF} {own} still carries BigQuery's default projectEditor/projectViewer")
        print("      grants — any project-level editor reads this client's data.")
        print(f"      Fix: deploy-claire-channel.sh --slug {a.slug} --lock-down")

    if failures:
        print(f"\n{RED}{BOLD}ISOLATION BROKEN{OFF} — {failures} probe(s) went the wrong way.")
        print("  Almost always a project-level BigQuery role on the service account.")
        print("  Console: IAM & Admin → IAM → the SA → leave only 'BigQuery Job User'.\n")
        return 1
    print(f"\n{GREEN}{BOLD}Isolation holds.{OFF} This SA reaches {own} and nothing else.\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
