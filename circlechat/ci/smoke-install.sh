#!/usr/bin/env bash
# Install a whole stack on a fresh Ubuntu machine, then check it: the model gateway, the job runner
# with its outgoing filter, and the security services. CircleChat 1.x is gone, so the stack has no
# chat server of its own. CI runs this on each change to circlechat/; a person can run it on a
# spare VM. Needs Docker, Node 22 and passwordless sudo.
set -euo pipefail
KIT="$(cd "$(dirname "$0")/../.." && pwd)"
CC="$HOME/recursica-stack" WS="$HOME/recursica-workspace"
fail=0; check() { if eval "$2"; then echo "pass: $1"; else echo "FAIL: $1"; fail=1; fi; }

mkdir -p "$CC" "$WS" && ln -sfn "$KIT" "$WS/recursica-knowledge"

cat > "$CC/site.json" <<JSON
{
  "site": { "public_host": "ci.example.ts.net", "port": 8080, "proxy": "other" },
  "repos": { "knowledge": "https://github.com/borderux/recursica-knowledge", "app": "https://github.com/octocat/Hello-World", "app_dir": "Hello-World", "app_github": "octocat/Hello-World" },
  "nodes": [ { "name": "ci", "os": "linux", "control": true, "address": "host.docker.internal", "jobs": { "port": 7400, "slots": 1, "memory_gb": 2 } } ],
  "routes": { "claude-sonnet": ["anthropic/claude-sonnet-5-5"] }
}
JSON
# An older stack's Claude key in .env: setup-host.sh moves the key to the gateway's secrets file.
KEY="sk-ant-ci-placeholder-$(openssl rand -hex 8)"
echo "ANTHROPIC_API_KEY=$KEY" > "$CC/.env"

bash "$KIT/circlechat/setup-host.sh"
# The job runner on the control computer, with the port jobs' filter. JOBD_TOKEN comes from the
# control computer's .env, as on a real stack.
( umask 077; grep '^JOBD_TOKEN=' "$CC/.env" > "$HOME/.recursica-node.env" )
bash "$KIT/circlechat/setup-node.sh" ci
sudo apt-get install -y -qq tcpdump age python3-venv nftables >/dev/null
# An earlier install left the decoy's SSH host keys in /var/tmp, mode 644. install-cluster.sh moves
# the keys into a folder only root reads, so the decoy keeps the same key.
sudo ssh-keygen -q -t rsa -b 2048 -m PEM -N '' -C '' -f /var/tmp/id_rsa
sudo chmod 644 /var/tmp/id_rsa
# shellcheck disable=SC2034  # read inside a check string below
OLD_DECOY_KEY="$(cat /var/tmp/id_rsa.pub)"
bash "$KIT/circlechat/cluster/install-cluster.sh" ci

sleep 20
# shellcheck disable=SC2034  # read inside the check strings below
names="$(docker ps --format '{{.Names}}')"
for c in cc-gateway cc-litellm cc-jobs-egress; do check "container $c runs" "grep -qx -- '$c' <<<\"\$names\""; done
check "no CircleChat 1.x container runs" "! grep -qE '(^|[-_])(caddy|api|worker|bridge|postgres|redis|minio)([-_]|\$)|^cc-(egress|slack-notify|cloud-requests)\$' <<<\"\$names\""
check "the setup makes no CircleChat 1.x network" "! grep -q '^circlechat_' <<<\"\$(docker network ls --format '{{.Name}}')\""
GW="docker exec cc-gateway node -e"
check "the model gateway answers" "$GW 'fetch(\"http://127.0.0.1:4000/health\").then((r) => process.exit(r.ok ? 0 : 1))'"
check "the model gateway refuses a request without a gateway key" "$GW 'fetch(\"http://127.0.0.1:4000/v1/chat/completions\", { method: \"POST\", body: \"{}\" }).then((r) => process.exit(r.status === 401 ? 0 : 1))'"
check "the port for port jobs refuses every request without a task key" "$GW 'fetch(\"http://127.0.0.1:4001/health\").then((r) => process.exit(r.status === 401 ? 0 : 1))'"
check "the gateway publishes no port beyond 127.0.0.1" "[ -z \"\$(docker port cc-gateway | grep -v ' -> 127\.0\.0\.1:')\" ]"
check "the cloud key left .env" "! grep -q '^ANTHROPIC_API_KEY=' '$CC/.env' && ! grep -q '^LITELLM_MASTER_KEY=' '$CC/.env'"
check "the cloud key is in the gateway's secrets file, which only root reads" "sudo grep -q '^MODEL_KEY_DEFAULT=$KEY\$' '$CC/model-keys.env' && [ \"\$(sudo stat -c '%U %a' '$CC/model-keys.env')\" = 'root 600' ]"
check "no container shows the cloud key in docker inspect" "! docker inspect \$(docker ps -q) | grep -- '$KEY' >/dev/null"
check "LiteLLM joins only the gateway's network" "[ \"\$(docker inspect -f '{{range \$k, \$v := .NetworkSettings.Networks}}{{\$k}} {{end}}' cc-litellm)\" = 'gateway-models ' ]"
check "the gateway joins the gateway's network" "grep -qw gateway-models <<<\"\$(docker inspect -f '{{range \$k, \$v := .NetworkSettings.Networks}}{{\$k}} {{end}}' cc-gateway)\""
check "images the kit starts are pinned to exact versions" "grep -q '@sha256:' '$CC/images.lock' && docker inspect -f '{{.Config.Image}}' cc-gateway cc-litellm | grep -c '@sha256:' | grep -x 2 >/dev/null"
check "the job runner runs" "systemctl is-active --quiet jobd"
# On Linux, jobd runs as jobd's own account, and reaches Docker only through jobd's Docker filter.
GATE_SOCK=unix:///run/recursica-jobd-gate/docker.sock
check "jobd runs as recursica-jobd" "[ \"\$(systemctl show -p User --value jobd)\" = recursica-jobd ]"
check "jobd's account is outside the docker group" "[[ \" \$(id -nG recursica-jobd) \" != *' docker '* ]]"
check "jobd's Docker filter runs" "systemctl is-active --quiet jobd-gate"
check "jobd answers on the jobs port" "curl -fsS http://127.0.0.1:7400/health >/dev/null"
check "jobd's account cannot open Docker's own socket" "! sudo -u recursica-jobd docker -H unix:///var/run/docker.sock ps >/dev/null 2>&1"
check "the owner cannot open the filter's socket" "! docker -H $GATE_SOCK ps >/dev/null 2>&1"
check "jobd's Docker filter refuses a list of containers" "grep -q 'refused by jobd.s Docker filter' <<<\"\$(sudo -u recursica-jobd docker -H $GATE_SOCK ps 2>&1)\""
check "jobd's Docker filter refuses privileged mode" "grep -q 'refused by jobd.s Docker filter' <<<\"\$(sudo -u recursica-jobd docker -H $GATE_SOCK create --name job-smoke-aaaaaa --privileged recursica/porter-job 2>&1)\""
check "the filter logs each refusal" "grep -q 'refused GET .*/containers/json' <<<\"\$(sudo journalctl -u jobd-gate --no-pager)\""

# The port jobs' closed network, whose only exit is the filter (setup-node.sh).
CURL="docker run --rm --network jobs-egress curlimages/curl:8.10.1"
check "the filter refuses a site that is not on the list" "[ \"\$($CURL -s -o /dev/null -w '%{http_connect}' -x http://egress:3128 https://example.com || true)\" = 403 ]"
check "the filter refuses a cloud model provider" "[ \"\$($CURL -s -o /dev/null -w '%{http_connect}' -x http://egress:3128 https://api.anthropic.com || true)\" = 403 ]"
check "a job container reaches the gateway directly" "[ \"\$($CURL -s --noproxy '*' http://cc-gateway:4000/health || true)\" = '{\"ok\":true}' ]"
# The filter's answer to a request for api.github.com from a job container. The arguments go to
# docker run, such as --dns 127.0.0.1.
github_via_filter() { docker run --rm --network jobs-egress "$@" curlimages/curl:8.10.1 -s -o /dev/null -w '%{http_connect}' -x http://egress:3128 https://api.github.com || true; }
JOBS_LOG="$HOME/.recursica-jobs-egress/logs/access.log"
# A check that asks for api.github.com through the filter, up to 4 tries, 30 seconds apart. When
# one name lookup fails, Squid keeps the failed lookup for 1 minute (negative_dns_ttl). Both GitHub
# checks then fail together, and a rerun passes. The tries cover 90 seconds, longer than that
# minute. Each failed try prints the filter's answer.
github_check() {
  local name="$1" code try; shift
  for try in 1 2 3 4; do
    code="$(github_via_filter "$@")"
    [ "$code" = 200 ] && { echo "pass: $name"; return 0; }
    echo "  $name: try $try of 4, the filter answered ${code:-nothing}"
    [ "$try" = 4 ] || sleep 30
  done
  sudo grep -F 'api.github.com' "$JOBS_LOG" | tail -n 3 || true
  echo "FAIL: $name"; fail=1
}
github_check "the filter allows GitHub"
check "the closed network has no way out but the filter" "! $CURL -s -m 10 -o /dev/null https://example.com"
check "a job container cannot look up outside names" "! docker run --rm --network jobs-egress --dns 127.0.0.1 busybox:1.36 nslookup -timeout=3 example.com >/dev/null 2>&1"
github_check "a job container still finds the filter by name" --dns 127.0.0.1
check "the refusal is in the filter's log" "sudo grep -q 'example.com:443 403 TCP_DENIED' '$JOBS_LOG'"

check "the firewall rules are loaded" "sudo nft list table inet agentguard >/dev/null"
for u in cluster-agent opencanary; do check "service $u runs" "systemctl is-active --quiet $u"; done
check "the decoy answers" "curl -s -m 5 -o /dev/null http://127.0.0.1:8088/ || nc -z 127.0.0.1 2222"
check "the decoy's SSH keys are in a folder only root reads" "[ \"\$(sudo stat -c '%U %a' /var/lib/opencanary)\" = 'root 700' ]"
check "the decoy's four SSH key files are root's, mode 600" "[ \"\$(sudo find /var/lib/opencanary -maxdepth 1 -name 'id_*' -user root -perm 600 | wc -l)\" = 4 ]"
check "the decoy kept the key an earlier install left in /var/tmp" "[ \"\$(sudo cat /var/lib/opencanary/id_rsa.pub)\" = \"\$OLD_DECOY_KEY\" ]"
check "no decoy key is left in /var/tmp" "[ -z \"\$(ls /var/tmp/id_rsa* /var/tmp/id_dsa* 2>/dev/null)\" ]"
[ "$fail" = 0 ] && echo "Smoke install passed." || { echo "Smoke install failed."; exit 1; }
