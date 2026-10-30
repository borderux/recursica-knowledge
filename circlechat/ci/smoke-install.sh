#!/usr/bin/env bash
# Install a whole stack on a fresh Ubuntu machine, then check it: CircleChat, the model gateway,
# the outgoing filter and the security services. CI runs this on each change to circlechat/;
# a person can run it on a spare VM. Needs Docker, Node 22 and passwordless sudo.
set -euo pipefail
KIT="$(cd "$(dirname "$0")/../.." && pwd)"
CC="$HOME/circlechat" WS="$HOME/circlechat-workspace"
fail=0; check() { if eval "$2"; then echo "pass: $1"; else echo "FAIL: $1"; fail=1; fi; }

# CircleChat: Border UX's fork, which carries the agents' network setting. The original repo has no
# such setting, so a failed clone stops the smoke install instead of testing the wrong CircleChat.
git clone --quiet --depth 1 --branch recursica/local-fixes https://github.com/borderux/recursica-circlechat "$CC"
mkdir -p "$WS" && ln -sfn "$KIT" "$WS/recursica-knowledge"

cat > "$CC/site.json" <<JSON
{
  "site": { "public_host": "ci.example.ts.net", "port": 8080, "proxy": "other" },
  "repos": { "knowledge": "https://github.com/borderux/recursica-knowledge", "app": "https://github.com/octocat/Hello-World", "app_dir": "Hello-World", "app_github": "octocat/Hello-World" },
  "nodes": [ { "name": "ci", "os": "linux", "control": true, "address": "host.docker.internal" } ],
  "routes": { "claude-sonnet": ["anthropic/claude-sonnet-5-5"] },
  "notify": { "slack": false }
}
JSON
cp "$CC/.env.example" "$CC/.env"
# An older stack's Claude key in .env: setup-host.sh moves the key to the gateway's secrets file.
KEY="sk-ant-ci-placeholder-$(openssl rand -hex 8)"
echo "ANTHROPIC_API_KEY=$KEY" >> "$CC/.env"

bash "$KIT/circlechat/setup-host.sh"
sudo apt-get install -y -qq tcpdump age python3-venv nftables >/dev/null
bash "$KIT/circlechat/cluster/install-cluster.sh" ci

sleep 20
# shellcheck disable=SC2034  # read inside the check strings below
names="$(docker ps --format '{{.Names}}')"
for c in caddy api worker bridge postgres cc-gateway cc-litellm cc-egress; do check "container $c runs" "grep -q -- '$c' <<<\"\$names\""; done
check "CircleChat answers on the computer" "curl -fsS -o /dev/null http://127.0.0.1:8080/"
check "CircleChat does not answer on other addresses" "! curl -fsS -m 5 -o /dev/null http://\$(hostname -I | awk '{print \$1}'):8080/"
GW="docker exec cc-gateway node -e"
check "the model gateway answers" "$GW 'fetch(\"http://127.0.0.1:4000/health\").then((r) => process.exit(r.ok ? 0 : 1))'"
check "the model gateway refuses a request without a gateway key" "$GW 'fetch(\"http://127.0.0.1:4000/v1/chat/completions\", { method: \"POST\", body: \"{}\" }).then((r) => process.exit(r.status === 401 ? 0 : 1))'"
check "the port for port jobs refuses every request without a task key" "$GW 'fetch(\"http://127.0.0.1:4001/health\").then((r) => process.exit(r.status === 401 ? 0 : 1))'"
check "with the filter on, the gateway publishes no port on the computer" "[ -z \"\$(docker port cc-gateway)\" ]"
check "the router signs in to the database with the read-only role, and docker inspect shows no database password" "sudo grep -q '^postgres://cc_gateway_read:' '$CC/gateway-state/db.url' && ! docker inspect cc-gateway | grep -q 'postgres://'"
check "the router's role can only read the columns it needs" "[ \"\$(cd '$CC' && docker compose exec -T postgres psql -U postgres -d circlechat -Atc \"select (select count(*) from information_schema.table_privileges where grantee = 'cc_gateway_read') || ' ' || (select count(*) from information_schema.column_privileges where grantee = 'cc_gateway_read' and privilege_type <> 'SELECT') || ' ' || (select rolsuper or rolcreaterole or rolcreatedb from pg_roles where rolname = 'cc_gateway_read')\")\" = '0 0 false' ]"
check "the router's role reads CircleChat's tables and writes nothing" "$GW 'const pg = require(\"/app/node_modules/pg\"); const c = new pg.Client(require(\"fs\").readFileSync(\"/state/db.url\", \"utf8\").trim()); c.connect().then(() => c.query(\"select count(*) from agent_runs where status = \x27running\x27\")).then(() => c.query(\"update agents set name = name\")).then(() => process.exit(1), (e) => process.exit(e.code === \"25006\" ? 0 : 1))'"
check "the cloud key left .env" "! grep -q '^ANTHROPIC_API_KEY=' '$CC/.env' && ! grep -q '^LITELLM_MASTER_KEY=' '$CC/.env'"
check "the cloud key is in the gateway's secrets file, which only root reads" "sudo grep -q '^MODEL_KEY_DEFAULT=$KEY\$' '$CC/model-keys.env' && [ \"\$(sudo stat -c '%U %a' '$CC/model-keys.env')\" = 'root 600' ]"
check "no container shows the cloud key in docker inspect" "! docker inspect \$(docker ps -q) | grep -q -- '$KEY'"
check "LiteLLM joins only the gateway's network" "[ \"\$(docker inspect -f '{{range \$k, \$v := .NetworkSettings.Networks}}{{\$k}} {{end}}' cc-litellm)\" = 'circlechat_models ' ]"
check "the key check passes" "(cd '$CC' && docker compose exec -T postgres pg_dump -U postgres circlechat) | sudo \"\$(command -v node)\" '$KIT/circlechat/gateway/key-check.mjs' --secrets '$CC/model-keys.env' --stdin database '$CC/hermes-homes' >/dev/null"
CURL="docker run --rm --network circlechat_agents curlimages/curl:8.10.1"
for svc in api worker bridge; do
  check "CircleChat's $svc container has the agents' network setting" "[ \"\$(cd '$CC' && docker compose exec -T $svc printenv CC_AGENT_NETWORK)\" = circlechat_agents ]"
  check "CircleChat's $svc container has the shared workspace at /workspace, read-only" "(cd '$CC' && docker compose exec -T $svc grep -q ' /workspace [^ ]* ro[, ]' /proc/mounts)"
done
check "an agent container reaches CircleChat's api directly" "[ \"\$($CURL -s -o /dev/null -w '%{http_code}' --noproxy '*' http://api:3000/api/ || true)\" != 000 ]"
check "the filter refuses a site that is not on the list" "[ \"\$($CURL -s -o /dev/null -w '%{http_connect}' -x http://egress:3128 https://example.com || true)\" = 403 ]"
check "the filter refuses a cloud model provider" "[ \"\$($CURL -s -o /dev/null -w '%{http_connect}' -x http://egress:3128 https://api.anthropic.com || true)\" = 403 ]"
check "an agent container reaches the gateway directly" "[ \"\$($CURL -s --noproxy '*' http://cc-gateway:4000/health || true)\" = '{\"ok\":true}' ]"
check "the filter allows GitHub" "[ \"\$($CURL -s -o /dev/null -w '%{http_connect}' -x http://egress:3128 https://api.github.com || true)\" = 200 ]"
check "the closed network has no way out but the filter" "! $CURL -s -m 10 -o /dev/null https://example.com"
check "an agent container cannot look up outside names" "! docker run --rm --network circlechat_agents --dns 127.0.0.1 busybox:1.36 nslookup -timeout=3 example.com >/dev/null 2>&1"
check "an agent container still finds the filter by name" "[ \"\$(docker run --rm --network circlechat_agents --dns 127.0.0.1 curlimages/curl:8.10.1 -s -o /dev/null -w '%{http_connect}' -x http://egress:3128 https://api.github.com || true)\" = 200 ]"
check "images the kit starts are pinned to exact versions" "grep -q '@sha256:' '$CC/images.lock' && docker inspect -f '{{.Config.Image}}' cc-gateway cc-litellm | grep -c '@sha256:' | grep -qx 2"
check "the refusal is in the filter's log" "sudo grep -q 'example.com:443 403 TCP_DENIED' '$CC/egress-logs/access.log'"
check "the file store has CircleChat's bucket" "(cd '$CC' && docker compose run --rm --no-deps -T -e MU=\"\$(sed -n 's/^MINIO_ROOT_USER=//p' .env | tail -1)\" -e MP=\"\$(sed -n 's/^MINIO_ROOT_PASSWORD=//p' .env | tail -1)\" --entrypoint /bin/sh minio-setup -c 'mc alias set local http://minio:9000 \"\$MU\" \"\$MP\" >/dev/null && mc ls local/circlechat >/dev/null')"
check "CircleChat's default secrets are gone" "! grep -qE '^(SESSION_SECRET=change-me|MINIO_ROOT_PASSWORD=minioadmin$)' '$CC/.env'"
check "the approval gate is on" "grep -q '^APPROVE_RISK_AT=high' '$CC/.env'"
check "the firewall rules are loaded" "sudo nft list table inet agentguard >/dev/null"
for u in cluster-agent opencanary; do check "service $u runs" "systemctl is-active --quiet $u"; done
check "the decoy answers" "curl -s -m 5 -o /dev/null http://127.0.0.1:8088/ || nc -z 127.0.0.1 2222"
[ "$fail" = 0 ] && echo "Smoke install passed." || { echo "Smoke install failed."; exit 1; }
