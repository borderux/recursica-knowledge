#!/usr/bin/env bash
# Install a whole stack on a fresh Ubuntu machine, then check it: CircleChat, the model gateway,
# the outgoing filter and the security services. CI runs this on each change to circlechat/;
# a person can run it on a spare VM. Needs Docker, Node 22 and passwordless sudo.
set -euo pipefail
KIT="$(cd "$(dirname "$0")/../.." && pwd)"
CC="$HOME/circlechat" WS="$HOME/circlechat-workspace"
fail=0; check() { if eval "$2"; then echo "pass: $1"; else echo "FAIL: $1"; fail=1; fi; }

# CircleChat: Border UX's fork carries the agents' network setting; the original repo is the fallback.
git clone --quiet --depth 1 --branch border/local-fixes https://github.com/borderux/recursica-circlechat "$CC" 2>/dev/null \
  || git clone --quiet --depth 1 https://github.com/tashfeenahmed/circlechat "$CC"
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
echo "ANTHROPIC_API_KEY=sk-ant-ci-placeholder" >> "$CC/.env"

bash "$KIT/circlechat/setup-host.sh"
sudo apt-get install -y -qq tcpdump age python3-venv nftables >/dev/null
bash "$KIT/circlechat/cluster/install-cluster.sh" ci

sleep 20
# shellcheck disable=SC2034  # read inside the check strings below
names="$(docker ps --format '{{.Names}}')"
for c in caddy api worker bridge postgres cc-gateway cc-egress; do check "container $c runs" "grep -q -- '$c' <<<\"\$names\""; done
check "CircleChat answers on the computer" "curl -fsS -o /dev/null http://127.0.0.1:8080/"
check "CircleChat does not answer on other addresses" "! curl -fsS -m 5 -o /dev/null http://\$(hostname -I | awk '{print \$1}'):8080/"
check "the model gateway answers" "curl -fsS -o /dev/null http://127.0.0.1:4000/health/liveliness"
CURL="docker run --rm --network circlechat_agents curlimages/curl:8.10.1"
for svc in api worker bridge; do
  check "CircleChat's $svc container has the agents' network setting" "[ \"\$(cd '$CC' && docker compose exec -T $svc printenv CC_AGENT_NETWORK)\" = circlechat_agents ]"
done
check "an agent container reaches CircleChat's api directly" "[ \"\$($CURL -s -o /dev/null -w '%{http_code}' --noproxy '*' http://api:3000/api/ || true)\" != 000 ]"
check "the filter refuses a site that is not on the list" "[ \"\$($CURL -s -o /dev/null -w '%{http_connect}' -x http://egress:3128 https://example.com || true)\" = 403 ]"
check "the filter allows GitHub" "[ \"\$($CURL -s -o /dev/null -w '%{http_connect}' -x http://egress:3128 https://api.github.com || true)\" = 200 ]"
check "the closed network has no way out but the filter" "! $CURL -s -m 10 -o /dev/null https://example.com"
check "an agent container cannot look up outside names" "! docker run --rm --network circlechat_agents --dns 127.0.0.1 busybox:1.36 nslookup -timeout=3 example.com >/dev/null 2>&1"
check "an agent container still finds the filter by name" "[ \"\$(docker run --rm --network circlechat_agents --dns 127.0.0.1 curlimages/curl:8.10.1 -s -o /dev/null -w '%{http_connect}' -x http://egress:3128 https://api.github.com || true)\" = 200 ]"
check "images the kit starts are pinned to exact versions" "grep -q '@sha256:' '$CC/images.lock' && docker inspect -f '{{.Config.Image}}' cc-gateway | grep -q '@sha256:'"
check "the refusal is in the filter's log" "sudo grep -q 'example.com:443 403 TCP_DENIED' '$CC/egress-logs/access.log'"
check "the file store has CircleChat's bucket" "(cd '$CC' && docker compose run --rm --no-deps -T -e MU=\"\$(sed -n 's/^MINIO_ROOT_USER=//p' .env | tail -1)\" -e MP=\"\$(sed -n 's/^MINIO_ROOT_PASSWORD=//p' .env | tail -1)\" --entrypoint /bin/sh minio-setup -c 'mc alias set local http://minio:9000 \"\$MU\" \"\$MP\" >/dev/null && mc ls local/circlechat >/dev/null')"
check "CircleChat's default secrets are gone" "! grep -qE '^(SESSION_SECRET=change-me|MINIO_ROOT_PASSWORD=minioadmin$)' '$CC/.env'"
check "the approval gate is on" "grep -q '^APPROVE_RISK_AT=high' '$CC/.env'"
check "the firewall rules are loaded" "sudo nft list table inet agentguard >/dev/null"
for u in cluster-agent opencanary; do check "service $u runs" "systemctl is-active --quiet $u"; done
check "the decoy answers" "curl -s -m 5 -o /dev/null http://127.0.0.1:8088/ || nc -z 127.0.0.1 2222"
[ "$fail" = 0 ] && echo "Smoke install passed." || { echo "Smoke install failed."; exit 1; }
